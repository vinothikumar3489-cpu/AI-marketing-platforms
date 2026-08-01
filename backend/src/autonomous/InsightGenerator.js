import { BaseAutonomousModule } from './BaseAutonomousModule.js';

/**
 * Generates insights ONLY from verified cycle data (module summaries,
 * scored opportunities, alerts, and errors). Never fabricates trends,
 * market facts, or statistics that are not present in the cycle data.
 */
export class InsightGenerator extends BaseAutonomousModule {
  constructor(brainService) {
    super('InsightGenerator', brainService);
    this._insights = [];
  }

  async _run(context) {
    const insights = await this.generateInsights(context?.data || {});
    return {
      insights,
      totalInsights: insights.length,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateInsights(data = {}) {
    const insights = [];
    const modules = data.modules || {};
    const errors = Array.isArray(data.errors) ? data.errors : [];
    const scored = modules.opportunityScorer?.scoredOpportunities
      || data.opportunityScorer?.scoredOpportunities
      || [];

    const addInsight = (category, severity, title, description, evidence, sourceModule = 'insightGenerator', actionable = true) => {
      insights.push({
        id: `insight-${insights.length + 1}-${Date.now().toString(36)}`,
        category,
        severity,
        title,
        description,
        confidence: Math.max(0, Math.min(100, Math.round(evidence.reduce((sum, e) => sum + (e.confidence ?? 50), 0) / evidence.length))),
        evidence,
        sourceModule,
        actionable,
        generatedAt: new Date().toISOString(),
      });
    };

    // 1. Top scored opportunities (evidence = the scored opportunity itself).
    const topOpportunities = [...scored]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);

    for (const opp of topOpportunities) {
      if (!opp || !opp.title || !opp.score) continue;
      addInsight(
        opp.category || opp.sourceModule || 'opportunity',
        opp.scoreCategory === 'critical' ? 'critical' : opp.scoreCategory === 'high' ? 'high' : opp.scoreCategory === 'medium' ? 'medium' : 'low',
        `${opp.title} (score ${opp.score}/100)`,
        (opp.description || opp.snippet || '').slice(0, 400) || `Scored opportunity from ${opp.sourceModule || 'unknown module'}.`,
        [{
          type: 'opportunity_score',
          value: `Score ${opp.score}/100 (${opp.scoreCategory || 'unrated'}) from ${opp.sourceModule || 'opportunity scoring'}`,
          source: opp.sourceModule || 'opportunityScorer',
          confidence: opp.confidence ?? 50,
        }],
        opp.sourceModule || 'opportunityScorer',
        true
      );
    }

    // 2. Module summary insights (data availability / collection state).
    for (const [name, result] of Object.entries(modules)) {
      if (!result || result.success === false) continue;
      const summary = result.summary;
      if (!summary || typeof summary !== 'object') continue;

      const countKeys = ['count', 'totalCount', 'newCount', 'detectedCount', 'monitoredCount', 'itemsFound', 'opportunitiesFound', 'totalScored'];
      const counts = countKeys
        .map((k) => (typeof summary[k] === 'number' && Number.isFinite(summary[k]) ? { key: k, value: summary[k] } : null))
        .filter(Boolean);

      if (counts.length > 0) {
        const detail = counts.map((c) => `${c.key}: ${c.value}`).join(', ');
        addInsight(
          'cycle_summary',
          counts.some((c) => c.value > 0) ? 'info' : 'low',
          `${name} collected ${counts.map((c) => c.value).join(' + ')} items`,
          `Cycle summary for ${name}: ${detail}.`,
          [{ type: 'module_summary', value: detail, source: name, confidence: 80 }],
          name,
          false
        );
      }
    }

    // 3. Alerts carried in the cycle data.
    const alerts = Array.isArray(data.alerts) ? data.alerts : [];
    for (const alert of alerts.slice(0, 5)) {
      if (!alert || (!alert.title && !alert.message)) continue;
      addInsight(
        'alert',
        alert.severity || 'medium',
        alert.title || alert.message,
        alert.message || alert.title || '',
        [{ type: 'alert', value: alert.message || alert.title, source: alert.source || alert.module || 'alertManager', confidence: alert.confidence ?? 60 }],
        alert.source || alert.module || 'alertManager',
        true
      );
    }

    // 4. Cycle errors (insights about what failed — honest signals).
    for (const error of errors.slice(0, 5)) {
      if (!error || !error.message) continue;
      addInsight(
        'cycle_error',
        'high',
        `${error.module || 'module'} failed during cycle`,
        error.message.slice(0, 400),
        [{ type: 'error', value: error.message, source: error.module || 'cycle', confidence: 100 }],
        error.module || 'cycle',
        true
      );
    }

    // 5. Summary signals when no module data exists at all.
    if (insights.length === 0) {
      const moduleNames = Object.keys(modules);
      addInsight(
        'cycle_empty',
        'info',
        'Cycle completed with no detected signals',
        moduleNames.length
          ? `The cycle ran but produced no scored opportunities, alerts, or summary data from: ${moduleNames.join(', ')}.`
          : 'The cycle completed without any module data to analyze.',
        [{ type: 'cycle', value: 'No signals detected', source: 'insightGenerator', confidence: 100 }],
        'insightGenerator',
        false
      );
    }

    this._insights = insights;
    return insights;
  }

  async health() {
    return {
      ...(await super.health()),
      totalInsights: this._insights.length,
    };
  }

  async shutdown() {
    this._insights = [];
    return super.shutdown();
  }
}
