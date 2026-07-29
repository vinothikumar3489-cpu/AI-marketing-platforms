import { BaseEngine } from '../engine.js';
import { EngineStatus, elapsedMs, logEngine } from '../core.js';

export class ReasoningEngine extends BaseEngine {
  constructor() {
    super('ReasoningEngine');
  }

  async execute(context) {
    const rid = context?.requestId || 'NO_RID';
    const start = Date.now();
    logEngine(this._name, rid, 0, EngineStatus.RUNNING);

    try {
      const evidence = context?.evidence || {};
      const knowledge = context?.knowledge || {};
      const memory = context?.memory?.sections || {};

      const rules = [
        this._ruleProductWithoutKeywords(evidence, knowledge, memory),
        this._ruleCompetitorWithoutRefresh(evidence, memory),
        this._ruleCompanyWithoutWebsite(evidence, memory),
        this._ruleSeoWithoutTechnical(evidence, memory),
        this._ruleAudienceWithoutProduct(evidence, memory),
        this._ruleProductWithoutEvidence(evidence, memory),
        this._ruleStaleData(memory),
        this._ruleMissingCompetitors(evidence, memory),
      ];

      const conclusions = rules.filter(r => r !== null);
      const strategy = this._selectStrategy(context);

      const reasoningResult = {
        strategy,
        steps: conclusions.map(c => ({
          rule: c.rule,
          premise: c.premise,
          conclusion: c.conclusion,
          severity: c.severity,
        })),
        conclusions,
        confidence: conclusions.length > 0
          ? Math.round((conclusions.filter(c => c.severity === 'info').length / conclusions.length) * 100) / 100
          : 1.0,
        summary: conclusions.length > 0
          ? `Applied ${conclusions.length} deterministic rules: ${conclusions.map(c => c.rule).join(', ')}`
          : 'No gaps detected. All intelligence sections have coverage.',
      };

      context.reasoning = reasoningResult;

      logEngine(this._name, rid, elapsedMs(start), EngineStatus.COMPLETED, `rules=${conclusions.length}`);
      return { success: true, data: reasoningResult };
    } catch (err) {
      logEngine(this._name, rid, elapsedMs(start), EngineStatus.FAILED, err.message);
      context.reasoning = { steps: [], conclusions: [], error: err.message };
      return { success: false, error: err.message };
    }
  }

  _ruleProductWithoutKeywords(evidence, knowledge, memory) {
    const hasProduct = memory?.product?.exists;
    const hasSeoKeywords = evidence?.seo?.exists && (
      memory?.seo?.data?.keywordOpportunities || memory?.seo?.data?.keywordIntelligence
    );

    if (hasProduct && !hasSeoKeywords) {
      return {
        rule: 'product_without_keywords',
        premise: 'Product intelligence exists but no SEO keywords found',
        conclusion: 'Recommend SEO keyword extraction for product pages',
        severity: 'medium',
      };
    }
    return null;
  }

  _ruleCompetitorWithoutRefresh(evidence, memory) {
    const hasCompetitors = memory?.competitor?.exists;
    const hasSeoCompetitors = memory?.seo?.competitorSeo;

    if (hasCompetitors && !hasSeoCompetitors) {
      return {
        rule: 'competitor_without_seo_refresh',
        premise: 'Competitor intelligence exists but no SEO competitor data',
        conclusion: 'Need competitor SEO refresh — run SEO competitor analysis',
        severity: 'medium',
      };
    }

    if (!hasCompetitors && !hasSeoCompetitors) {
      return {
        rule: 'no_competitors',
        premise: 'No competitor intelligence found',
        conclusion: 'Need competitor discovery — provide competitor URLs or run automated discovery',
        severity: 'high',
      };
    }
    return null;
  }

  _ruleCompanyWithoutWebsite(evidence, memory) {
    const profile = memory?.profile?.data;
    const hasName = profile?.companyName || evidence?.company?.name;
    const hasWebsite = profile?.websiteUrl || evidence?.company?.domain;

    if (hasName && !hasWebsite) {
      return {
        rule: 'company_without_website',
        premise: 'Company name known but no website URL',
        conclusion: 'Need website URL for comprehensive evidence collection',
        severity: 'low',
      };
    }
    return null;
  }

  _ruleSeoWithoutTechnical(evidence, memory) {
    const seoExists = memory?.seo?.exists;
    const hasTechAudit = memory?.seo?.data?.technicalAudit || memory?.seo?.data?.technicalAuditDetail;

    if (seoExists && !hasTechAudit) {
      return {
        rule: 'seo_without_technical_audit',
        premise: 'SEO intelligence exists but no technical audit detail',
        conclusion: 'Need technical SEO audit for complete analysis',
        severity: 'low',
      };
    }
    return null;
  }

  _ruleAudienceWithoutProduct(evidence, memory) {
    const hasAudience = memory?.product?.audience;
    const hasProduct = memory?.product?.exists;

    if (hasAudience && !hasProduct) {
      return {
        rule: 'audience_without_product',
        premise: 'Audience intelligence exists but no product analysis',
        conclusion: 'Need product analysis to provide context for audience data',
        severity: 'medium',
      };
    }
    return null;
  }

  _ruleProductWithoutEvidence(evidence, memory) {
    const hasProduct = memory?.product?.exists;
    const hasEvidenceSnapshots = memory?.evidence?.exists;

    if (hasProduct && !hasEvidenceSnapshots) {
      return {
        rule: 'product_without_evidence',
        premise: 'Product intelligence exists but no website evidence collected',
        conclusion: 'Need website evidence collection — run evidence collection',
        severity: 'low',
      };
    }
    return null;
  }

  _ruleStaleData(memory) {
    const stale = [];
    const now = Date.now();
    const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

    for (const [section, data] of Object.entries(memory)) {
      if (data?.exists && data?.updatedAt) {
        const age = now - new Date(data.updatedAt).getTime();
        if (age > STALE_THRESHOLD_MS) {
          stale.push(section);
        }
      }
    }

    if (stale.length > 0) {
      return {
        rule: 'stale_intelligence_data',
        premise: `Intelligence data older than 7 days: ${stale.join(', ')}`,
        conclusion: `Need to refresh stale sections: ${stale.join(', ')}`,
        severity: 'medium',
      };
    }
    return null;
  }

  _ruleMissingCompetitors(evidence, memory) {
    const competitorCount = evidence?.competitor?.competitors?.length || 0;
    const seoCompetitorCount = evidence?.competitor?.seoMemory ? 1 : 0;

    if (competitorCount + seoCompetitorCount < 2) {
      return {
        rule: 'insufficient_competitors',
        premise: `Only ${competitorCount + seoCompetitorCount} competitor sources found`,
        conclusion: 'Need more competitor data — expand competitor discovery',
        severity: 'medium',
      };
    }
    return null;
  }

  _selectStrategy(context) {
    const action = context?.request?.action || '';
    if (action.includes('compare')) return 'analogical';
    if (action.includes('compete')) return 'analogical';
    if (action.includes('audit')) return 'deductive';
    if (action.includes('keyword')) return 'inductive';
    if (action.includes('product') || action.includes('analyze')) return 'inductive';
    return 'deductive';
  }
}
