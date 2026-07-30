import { BaseEngine } from '../engine.js';

const RISK_CATEGORIES = {
  FINANCIAL: 'financial',
  OPERATIONAL: 'operational',
  MARKET: 'market',
  TECHNICAL: 'technical',
  COMPETITIVE: 'competitive',
  REPUTATIONAL: 'reputational',
  REGULATORY: 'regulatory',
  TIMING: 'timing',
  RESOURCE: 'resource',
  EXECUTION: 'execution',
};

const DEFAULT_RISK_TEMPLATES = [
  {
    category: RISK_CATEGORIES.FINANCIAL,
    label: 'Budget Overrun',
    description: 'Actual costs exceed allocated budget',
    probability: 0.3,
    impact: 0.7,
    mitigation: 'Establish contingency fund (10-15% of budget), implement weekly spend reviews',
  },
  {
    category: RISK_CATEGORIES.MARKET,
    label: 'Market Response Below Expectations',
    description: 'Campaign or initiative fails to generate expected market response',
    probability: 0.4,
    impact: 0.6,
    mitigation: 'Run A/B tests on small segment before full rollout, set progressive KPIs',
  },
  {
    category: RISK_CATEGORIES.COMPETITIVE,
    label: 'Competitive Response',
    description: 'Competitors react with counter-measures reducing effectiveness',
    probability: 0.35,
    impact: 0.5,
    mitigation: 'Monitor competitor activity, build speed advantage into execution',
  },
  {
    category: RISK_CATEGORIES.EXECUTION,
    label: 'Execution Delay',
    description: 'Implementation takes longer than planned',
    probability: 0.4,
    impact: 0.4,
    mitigation: 'Build buffer into timeline, identify critical path items',
  },
  {
    category: RISK_CATEGORIES.RESOURCE,
    label: 'Resource Constraints',
    description: 'Insufficient team capacity or skills to execute',
    probability: 0.3,
    impact: 0.6,
    mitigation: 'Cross-train team members, identify external support options',
  },
  {
    category: RISK_CATEGORIES.TECHNICAL,
    label: 'Technical Integration Issues',
    description: 'Platform or tool integration problems delay execution',
    probability: 0.25,
    impact: 0.5,
    mitigation: 'Conduct technical feasibility assessment before commitment',
  },
  {
    category: RISK_CATEGORIES.REPUTATIONAL,
    label: 'Brand Reputation Risk',
    description: 'Initiative could negatively impact brand perception',
    probability: 0.15,
    impact: 0.8,
    mitigation: 'Review messaging with brand team, prepare crisis communication plan',
  },
];

export class RiskAnalyzer extends BaseEngine {
  constructor() {
    super('RiskAnalyzer');
  }

  async execute(context) {
    const { decisionContext, scenario } = context || {};
    if (!scenario) {
      return { success: true, risks: [], warnings: ['No scenario provided for risk analysis'] };
    }

    return this.analyzeRisks(scenario, decisionContext);
  }

  analyzeRisks(scenario, context) {
    const risks = this._identifyRisks(scenario, context);
    const scoredRisks = this._scoreRisks(risks, context);
    const overallRiskScore = this._calculateOverallRisk(scoredRisks);
    const keyMitigations = scoredRisks.filter(r => r.score > 0.4).map(r => r.mitigation);

    return {
      risks: scoredRisks,
      overallRiskScore,
      riskLevel: this._levelFromScore(overallRiskScore),
      keyMitigations,
      highRiskCount: scoredRisks.filter(r => r.level === 'high' || r.level === 'critical').length,
      mediumRiskCount: scoredRisks.filter(r => r.level === 'medium').length,
      lowRiskCount: scoredRisks.filter(r => r.level === 'low').length,
      summary: `Overall risk score: ${(overallRiskScore * 100).toFixed(0)}/100 (${this._levelFromScore(overallRiskScore)}). ${scoredRisks.filter(r => r.level === 'high' || r.level === 'critical').length} high/critical risks identified.`,
    };
  }

  _identifyRisks(scenario, context) {
    const risks = DEFAULT_RISK_TEMPLATES.map(t => ({ ...t }));

    const action = (scenario.action || '').toLowerCase();
    if (action.includes('ad spend') || action.includes('ads') || action.includes('ppc')) {
      risks.push({
        category: RISK_CATEGORIES.FINANCIAL,
        label: 'Ad Spend Waste',
        description: 'Paid media spend may not yield expected ROAS due to market saturation',
        probability: 0.35,
        impact: 0.6,
        mitigation: 'Set daily budgets, use negative keywords, monitor CPA closely',
      });
      risks.push({
        category: RISK_CATEGORIES.MARKET,
        label: 'Ad Fatigue',
        description: 'Target audience experiences ad fatigue reducing CTR over time',
        probability: 0.3,
        impact: 0.4,
        mitigation: 'Rotate creative assets every 2 weeks, refresh audience segments',
      });
    }

    if (action.includes('content') || action.includes('seo')) {
      risks.push({
        category: RISK_CATEGORIES.TIMING,
        label: 'SEO Timeline Mismatch',
        description: 'SEO improvements take longer than campaign timeframe to materialize',
        probability: 0.5,
        impact: 0.5,
        mitigation: 'Combine SEO with short-term tactics (paid, email) for immediate impact',
      });
    }

    if (action.includes('email') || action.includes('campaign')) {
      risks.push({
        category: RISK_CATEGORIES.OPERATIONAL,
        label: 'Deliverability Issues',
        description: 'Email deliverability may be lower than expected affecting campaign reach',
        probability: 0.25,
        impact: 0.5,
        mitigation: 'Warm up sending domains, validate email lists, monitor bounce rates',
      });
    }

    if (action.includes('new') || action.includes('launch') || action.includes('product')) {
      risks.push({
        category: RISK_CATEGORIES.MARKET,
        label: 'Product-Market Fit Gap',
        description: 'New offering may not resonate with target audience as expected',
        probability: 0.4,
        impact: 0.7,
        mitigation: 'Conduct pre-launch validation with focus group or beta program',
      });
    }

    return risks;
  }

  _scoreRisks(risks, context) {
    return risks.map(risk => {
      let probability = risk.probability;
      let impact = risk.impact;

      if (context?.confidence) {
        const overallConf = context.confidence.overall || context.confidence.score || 0.5;
        const confidenceFactor = 1 - overallConf;
        probability = Math.min(1, probability + confidenceFactor * 0.15);
      }

      if (context?.evidence?.sources?.length > 0) {
        const evidenceFactor = Math.min(1, context.evidence.sources.length / 20);
        probability = Math.max(0.05, probability - evidenceFactor * 0.1);
      }

      const score = probability * impact;

      return {
        category: risk.category,
        label: risk.label,
        description: risk.description,
        probability: Math.round(probability * 100) / 100,
        impact: Math.round(impact * 100) / 100,
        score: Math.round(score * 100) / 100,
        level: score >= 0.5 ? 'critical' : score >= 0.3 ? 'high' : score >= 0.15 ? 'medium' : 'low',
        mitigation: risk.mitigation,
      };
    }).sort((a, b) => b.score - a.score);
  }

  _calculateOverallRisk(scoredRisks) {
    if (scoredRisks.length === 0) return 0;
    const totalScore = scoredRisks.reduce((sum, r) => sum + r.score, 0);
    return Math.round((totalScore / scoredRisks.length) * 100) / 100;
  }

  _levelFromScore(score) {
    if (score >= 0.5) return 'critical';
    if (score >= 0.3) return 'high';
    if (score >= 0.15) return 'medium';
    return 'low';
  }

  async health() {
    return { name: this._name, status: 'HEALTHY', initialized: this._initialized };
  }
}
