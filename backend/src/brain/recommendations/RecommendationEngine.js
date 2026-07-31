import { BaseEngine } from '../engine.js';
import { EngineStatus, elapsedMs, logEngine } from '../core.js';

export class RecommendationEngine extends BaseEngine {
  constructor() {
    super('RecommendationEngine');
  }

  async execute(context) {
    const rid = context?.requestId || 'NO_RID';
    const start = Date.now();
    logEngine(this._name, rid, 0, EngineStatus.RUNNING);

    try {
      const errors = context?.errors || [];
      const reasoning = context?.reasoning?.conclusions || [];
      const memory = context?.memory?.sections || {};
      const confidence = context?.confidence || {};

      const recommendations = [];

      this._recommendByReasoning(reasoning, recommendations);
      this._recommendByConfidence(confidence, recommendations);
      this._recommendByMemoryGaps(memory, recommendations);
      this._recommendByEvidenceSources(context?.evidence, recommendations);
      this._recommendGeneral(memory, recommendations);

      const sorted = this._prioritize(recommendations);

      const recommendationsResult = {
        items: sorted,
        priority: sorted.filter(r => r.priority === 'high'),
        count: sorted.length,
        summary: `Generated ${sorted.length} internal recommendations (${sorted.filter(r => r.priority === 'high').length} high priority)`,
      };

      context.recommendations = recommendationsResult;

      logEngine(this._name, rid, elapsedMs(start), EngineStatus.COMPLETED, `items=${sorted.length}`);
      return { success: true, data: recommendationsResult };
    } catch (err) {
      logEngine(this._name, rid, elapsedMs(start), EngineStatus.FAILED, err.message);
      context.recommendations = { ...(context.recommendations || { items: [], priority: [] }), error: err.message };
      return { success: false, error: err.message };
    }
  }

  _recommendByReasoning(conclusions, recommendations) {
    const reasoningMap = {
      'product_without_keywords': { message: 'Need keyword expansion — product exists without SEO keywords', category: 'keyword_expansion', priority: 'high' },
      'competitor_without_seo_refresh': { message: 'Need competitor refresh — competitor data without SEO competitor analysis', category: 'competitor_refresh', priority: 'high' },
      'no_competitors': { message: 'Need competitor discovery — no competitor data found', category: 'competitor_discovery', priority: 'high' },
      'company_without_website': { message: 'Need website URL — cannot collect evidence without a target URL', category: 'evidence_collection', priority: 'medium' },
      'seo_without_technical_audit': { message: 'Need technical audit — SEO analysis missing technical detail', category: 'technical_audit', priority: 'medium' },
      'audience_without_product': { message: 'Need product analysis — audience data without product context', category: 'product_analysis', priority: 'medium' },
      'product_without_evidence': { message: 'Need more product evidence — run website evidence collection', category: 'evidence_collection', priority: 'medium' },
      'insufficient_competitors': { message: 'Need competitor expansion — fewer than 2 competitor sources', category: 'competitor_discovery', priority: 'medium' },
      'stale_intelligence_data': { message: 'Need data refresh — intelligence data older than 7 days', category: 'data_refresh', priority: 'high' },
    };

    for (const c of conclusions) {
      const mapped = reasoningMap[c.rule];
      if (mapped) {
        recommendations.push({
          type: 'internal',
          category: mapped.category,
          message: mapped.message,
          priority: mapped.priority,
          source: `reasoning:${c.rule}`,
        });
      }
    }
  }

  _recommendByConfidence(confidence, recommendations) {
    if (!confidence?.sections) return;

    for (const [section, score] of Object.entries(confidence.sections)) {
      if (score.confidence < 0.3) {
        recommendations.push({
          type: 'internal',
          category: 'confidence_gap',
          message: `Need ${section} intelligence — confidence is ${Math.round(score.confidence * 100)}%`,
          priority: 'high',
          source: `confidence:${section}`,
        });
      } else if (score.confidence < 0.7) {
        recommendations.push({
          type: 'internal',
          category: 'confidence_gap',
          message: `Improve ${section} intelligence — confidence is ${Math.round(score.confidence * 100)}%`,
          priority: 'medium',
          source: `confidence:${section}`,
        });
      }
    }
  }

  _recommendByMemoryGaps(memory, recommendations) {
    const required = ['product', 'competitor', 'seo', 'evidence'];
    for (const section of required) {
      if (!memory[section]?.exists) {
        const alreadyRecommends = recommendations.some(r => r.message.includes(section));
        if (!alreadyRecommends) {
          recommendations.push({
            type: 'internal',
            category: 'missing_intelligence',
            message: `Need ${section} intelligence — section not found in memory`,
            priority: 'high',
            source: `memory_gap:${section}`,
          });
        }
      }
    }
  }

  _recommendByEvidenceSources(evidence, recommendations) {
    if (!evidence?.sources) return;

    const sourceTypes = new Set(evidence.sources.map(s => s.type));
    if (!sourceTypes.has('seo') && !evidence?.seo?.exists) {
      recommendations.push({
        type: 'internal',
        category: 'keyword_expansion',
        message: 'Need keyword expansion — no SEO evidence sources',
        priority: 'medium',
        source: 'evidence_gap:seo',
      });
    }

    const companySources = evidence.sources.filter(s => s.type === 'company');
    if (companySources.length === 0) {
      recommendations.push({
        type: 'internal',
        category: 'evidence_collection',
        message: 'Need website evidence — no company evidence sources',
        priority: 'medium',
        source: 'evidence_gap:company',
      });
    }
  }

  _recommendGeneral(memory, recommendations) {
    if (!memory?.seo?.exists) {
      const alreadyHas = recommendations.some(r => r.source === 'memory_gap:seo');
      if (!alreadyHas) {
        recommendations.push({
          type: 'internal',
          category: 'seo_analysis',
          message: 'Need SEO analysis — no SEO intelligence exists',
          priority: 'high',
          source: 'general:seo',
        });
      }
    }
  }

  _prioritize(items) {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...items].sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 2;
      const pb = priorityOrder[b.priority] ?? 2;
      return pa - pb;
    });
  }
}
