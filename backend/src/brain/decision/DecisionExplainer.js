import { BaseEngine } from '../engine.js';

export class DecisionExplainer extends BaseEngine {
  constructor() {
    super('DecisionExplainer');
  }

  async execute(context) {
    const { decisionContext, scenario, comparison, riskAnalysis, impactAnalysis } = context || {};

    if (!scenario && !comparison) {
      return { success: true, explanation: null, warnings: ['No scenario or comparison provided'] };
    }

    if (comparison?.winner) {
      return this.explainDecision(comparison.winner, comparison, decisionContext);
    }

    if (scenario) {
      return this.explainScenario(scenario, { riskAnalysis, impactAnalysis }, decisionContext);
    }

    return { success: true, explanation: 'Nothing to explain', warnings: ['Insufficient data'] };
  }

  explainDecision(selectedScenario, comparison, context) {
    const sections = [];

    sections.push(this._generateExecutiveSummary(selectedScenario, context));

    sections.push(this._generateRationale(selectedScenario, comparison));

    sections.push(this._generateTradeoffExplanation(selectedScenario, comparison));

    if (selectedScenario.risks?.risks?.length > 0) {
      sections.push(this._generateRiskExplanation(selectedScenario.risks));
    }

    sections.push(this._generateOutcomeExplanation(selectedScenario, context));

    sections.push(this._generateConfidenceStatement(selectedScenario));

    const explanation = sections.filter(Boolean).join('\n\n');

    return {
      success: true,
      explanation,
      sections: {
        executiveSummary: sections[0] || '',
        rationale: sections[1] || '',
        tradeoffs: sections[2] || '',
        risks: sections[3] || '',
        outcomes: sections[4] || '',
        confidence: sections[5] || '',
      },
      summary: sections[0] || '',
      selectedLabel: selectedScenario.scenarioLabel || 'Selected option',
      reasoning: sections[1] || '',
    };
  }

  explainScenario(scenario, analyses, context) {
    const sections = [];

    sections.push(`**Scenario: ${scenario.label}**\n${scenario.description || ''}`);

    if (analyses.impactAnalysis?.summary) {
      sections.push(`**Expected Impact:** ${analyses.impactAnalysis.summary}`);
    }

    if (analyses.riskAnalysis?.summary) {
      sections.push(`**Risk Assessment:** ${analyses.riskAnalysis.summary}`);
    }

    if (scenario.simulatedOutcomes?.roi != null) {
      sections.push(`**Expected ROI:** ${scenario.simulatedOutcomes.roi.toFixed(1)}%`);
    }

    if (scenario.pros?.length > 0 && scenario.cons?.length > 0) {
      sections.push(`**Pros:** ${scenario.pros.join(', ')}`);
      sections.push(`**Cons:** ${scenario.cons.join(', ')}`);
    }

    const explanation = sections.filter(Boolean).join('\n\n');

    return {
      success: true,
      explanation,
      sections: {
        overview: sections[0] || '',
        impact: sections[1] || '',
        risks: sections[2] || '',
        returns: sections[3] || '',
        tradeoffs: sections[4] || '',
      },
      summary: sections[0] || '',
    };
  }

  _generateExecutiveSummary(scenario, context) {
    const goal = context?.goal || 'the stated goal';
    const label = scenario.scenarioLabel || 'This option';
    const roi = scenario.expectedRoi != null ? `expected ROI of ${scenario.expectedRoi.toFixed(1)}%` : 'favorable returns';
    const priority = scenario.priority ? ` (priority ${scenario.priority})` : '';
    return `${label} is the recommended strategy to achieve ${goal}. It offers ${roi} with a confidence score of ${((scenario.confidence || 0) * 100).toFixed(0)}%${priority}.`;
  }

  _generateRationale(scenario, comparison) {
    const parts = [];
    parts.push(`This decision was selected because it ranks #${scenario.rank || 1} among all considered options.`);

    if (comparison?.rankings?.length > 1) {
      const runnerUp = comparison.rankings[1];
      if (runnerUp) {
        const gap = ((scenario.totalScore - runnerUp.totalScore) / runnerUp.totalScore * 100).toFixed(1);
        parts.push(`It scores ${(scenario.totalScore * 100).toFixed(1)}% on the weighted evaluation, ${gap}% higher than the next best option (${runnerUp.scenarioLabel}).`);
      }
    }

    if (scenario.selectionRationale) {
      parts.push(scenario.selectionRationale);
    }

    return parts.join(' ');
  }

  _generateTradeoffExplanation(scenario, comparison) {
    if (!comparison?.rankings || comparison.rankings.length < 2) return '';
    const parts = ['**Trade-off Analysis:**'];
    const top3 = comparison.rankings.slice(0, 3);
    for (const ranked of top3) {
      const isSelected = ranked.scenarioId === scenario.id;
      parts.push(`- ${isSelected ? '✓' : ' '} #${ranked.rank} ${ranked.scenarioLabel}: Score ${(ranked.totalScore * 100).toFixed(1)}%`);
    }

    if (scenario.pros?.length > 0) {
      parts.push(`**Advantages:** ${scenario.pros.join(', ')}`);
    }
    if (scenario.cons?.length > 0) {
      parts.push(`**Trade-offs:** ${scenario.cons.join(', ')}`);
    }

    return parts.join('\n');
  }

  _generateRiskExplanation(riskAnalysis) {
    if (!riskAnalysis?.risks || riskAnalysis.risks.length === 0) return '';
    const parts = ['**Risk Considerations:**'];
    const topRisks = riskAnalysis.risks.slice(0, 3);
    for (const risk of topRisks) {
      parts.push(`- ${risk.label} (${risk.level}): ${risk.mitigation}`);
    }
    parts.push(`Overall risk level: ${riskAnalysis.riskLevel}`);
    return parts.join('\n');
  }

  _generateOutcomeExplanation(scenario, context) {
    const outcomes = scenario.simulatedOutcomes;
    if (!outcomes) return 'Outcome projections were not simulated for this scenario.';
    const parts = ['**Projected Outcomes:**'];
    if (outcomes.leadGrowth) parts.push(`- Lead generation: +${outcomes.leadGrowth.toFixed(1)}%`);
    if (outcomes.revenueChange) parts.push(`- Revenue impact: ${outcomes.revenueChange > 0 ? '+' : ''}${outcomes.revenueChange.toFixed(1)}%`);
    if (outcomes.roi != null) parts.push(`- Expected ROI: ${outcomes.roi.toFixed(1)}%`);
    if (outcomes.cacChange) parts.push(`- CAC change: ${outcomes.cacChange > 0 ? '+' : ''}${outcomes.cacChange.toFixed(1)}%`);
    if (outcomes.seoImpact) parts.push(`- SEO impact: ${outcomes.seoImpact.toFixed(1)}`);
    if (outcomes.timeline?.totalDays) parts.push(`- Timeline: ~${outcomes.timeline.totalDays} days`);
    return parts.join('\n');
  }

  _generateConfidenceStatement(scenario) {
    const confidence = scenario.confidence || 0;
    const level = confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'moderate' : confidence >= 0.4 ? 'moderate-low' : 'low';
    return `**Confidence Level:** ${(confidence * 100).toFixed(0)}% (${level}) — based on ${level === 'high' ? 'strong evidence and historical patterns' : level === 'moderate' ? 'available data with some uncertainty' : 'limited data with significant uncertainty'}.`;
  }

  async health() {
    return { name: this._name, status: 'HEALTHY', initialized: this._initialized };
  }
}
