import { BaseEngine } from '../engine.js';

export class DecisionSimulator extends BaseEngine {
  constructor() {
    super('DecisionSimulator');
  }

  async execute(context) {
    const { decisionContext, scenario } = context || {};
    if (!scenario) {
      return { success: true, outcomes: null, warnings: ['No scenario provided'] };
    }

    return this.simulate(scenario, decisionContext);
  }

  simulate(scenario, context) {
    const outcomes = this._simulateOutcomes(scenario, context);
    const confidence = this._calculateConfidence(outcomes, context);
    return {
      scenarioId: scenario.id,
      scenarioLabel: scenario.label,
      outcomes,
      confidence,
      summary: this._generateSummary(outcomes, confidence),
    };
  }

  _simulateOutcomes(scenario, context) {
    const params = scenario.parameters || {};
    const action = (scenario.action || '').toLowerCase();
    const budget = context?.budget || params.budget || 0;
    const months = this._estimateMonths(context?.timeframe || '');
    const baseRevenue = context?.businessContext?.estimatedRevenue || 0;

    let leadGrowth, cacChange, revenueChange, seoImpact;
    let crmImpact, contentImpact, roi, pipelineVelocity, competitiveAdvantage;
    let efficiencyGain, brandImpact, customerImpact, riskReduction;

    if (action.includes('ad') || action.includes('spend') || params.budgetChange) {
      const budgetChange = params.budgetChange || (budget > 0 ? 20 : 10);
      const channelEfficiency = params.channelEfficiency || 0.7;
      const marketSaturation = params.marketSaturation || 0.3;

      leadGrowth = budgetChange * channelEfficiency * (1 - marketSaturation) * (0.5 + Math.random() * 0.3);
      cacChange = budgetChange > 30 ? 10 + (budgetChange - 30) * 0.3 : -5 + budgetChange * 0.2;
      revenueChange = leadGrowth * (context?.businessContext?.conversionRate || 0.05) * (context?.businessContext?.averageDealSize || 1000) / (budget || 1) * 0.1;
      if (revenueChange > 100) revenueChange = 50 + Math.sqrt(revenueChange - 50);
      seoImpact = -2 - budgetChange * 0.05;
      contentImpact = 0.3 + budgetChange * 0.005;
      crmImpact = 0.2 + budgetChange * 0.003;
      roi = revenueChange * 1.5 - budgetChange * 0.8;
      pipelineVelocity = params.pipelineAcceleration || 0.1 + budgetChange * 0.005;
      competitiveAdvantage = 0.1 + budgetChange * 0.008;
    } else if (action.includes('content') || action.includes('seo')) {
      leadGrowth = 5 + Math.random() * 10;
      cacChange = -5 - Math.random() * 10;
      revenueChange = 3 + Math.random() * 7;
      seoImpact = 8 + Math.random() * 12;
      contentImpact = 0.7 + Math.random() * 0.2;
      crmImpact = 0.3 + Math.random() * 0.2;
      roi = 50 + Math.random() * 100;
      competitiveAdvantage = 0.3 + Math.random() * 0.3;
      efficiencyGain = 0.2 + Math.random() * 0.2;
    } else if (action.includes('email') || action.includes('campaign')) {
      leadGrowth = 8 + Math.random() * 12;
      cacChange = -3 - Math.random() * 5;
      revenueChange = 5 + Math.random() * 10;
      seoImpact = 0;
      contentImpact = 0.4 + Math.random() * 0.3;
      crmImpact = 0.5 + Math.random() * 0.3;
      roi = 80 + Math.random() * 120;
      competitiveAdvantage = 0.2 + Math.random() * 0.2;
      customerImpact = 0.4 + Math.random() * 0.3;
    } else if (action.includes('product') || action.includes('launch')) {
      leadGrowth = 15 + Math.random() * 20;
      cacChange = 5 + Math.random() * 10;
      revenueChange = 10 + Math.random() * 20;
      seoImpact = 3 + Math.random() * 5;
      contentImpact = 0.5 + Math.random() * 0.3;
      crmImpact = 0.3 + Math.random() * 0.3;
      roi = 30 + Math.random() * 60;
      competitiveAdvantage = 0.4 + Math.random() * 0.4;
      brandImpact = 0.3 + Math.random() * 0.3;
    } else {
      leadGrowth = 3 + Math.random() * 5;
      cacChange = -2 + Math.random() * 4;
      revenueChange = 2 + Math.random() * 5;
      seoImpact = 1 + Math.random() * 3;
      contentImpact = 0.2 + Math.random() * 0.2;
      crmImpact = 0.1 + Math.random() * 0.2;
      roi = 20 + Math.random() * 30;
      competitiveAdvantage = 0.1 + Math.random() * 0.1;
    }

    if (params.aggressiveness) {
      const a = params.aggressiveness;
      leadGrowth = leadGrowth * (1 + a * 0.5);
      cacChange = cacChange * (1 + a * 0.3);
      revenueChange = revenueChange * (1 + a * 0.4);
      seoImpact = seoImpact * (1 - a * 0.2);
    }

    const optimizationLevel = params.optimizationLevel || 0.5;
    const efficiencyFactor = 1 + optimizationLevel * 0.3;
    roi = roi * efficiencyFactor;

    return {
      leadGrowth: Math.round((leadGrowth || 0) * 10) / 10,
      cacChange: Math.round((cacChange || 0) * 10) / 10,
      revenueChange: Math.round((revenueChange || 0) * 10) / 10,
      seoImpact: Math.round((seoImpact || 0) * 10) / 10,
      crmImpact: Math.round((crmImpact || 0) * 10) / 10,
      contentImpact: Math.round((contentImpact || 0) * 10) / 10,
      roi: Math.round((roi || 0) * 10) / 10,
      pipelineVelocity: Math.round((pipelineVelocity || 0) * 100) / 100,
      competitiveAdvantage: Math.round((competitiveAdvantage || 0) * 100) / 100,
      efficiencyGain: Math.round((efficiencyGain || 0) * 100) / 100,
      brandImpact: Math.round((brandImpact || 0) * 100) / 100,
      customerImpact: Math.round((customerImpact || 0) * 100) / 100,
      riskReduction: Math.round((riskReduction || 0) * 100) / 100,
      timeframe: months,
      timeline: this._estimateTimeline(action, months),
    };
  }

  _estimateTimeline(action, months) {
    const phases = [];
    if (action.includes('ad') || action.includes('spend')) {
      phases.push({ phase: 'Setup', durationDays: 3, description: 'Campaign configuration and audience setup' });
      phases.push({ phase: 'Testing', durationDays: 7, description: 'A/B test creative and targeting' });
      phases.push({ phase: 'Optimization', durationDays: 14, description: 'Scale winning variants, optimize bids' });
      phases.push({ phase: 'Full Execution', durationDays: months * 30 - 24, description: 'Full-scale campaign execution' });
    } else if (action.includes('content') || action.includes('seo')) {
      phases.push({ phase: 'Strategy', durationDays: 5, description: 'Content strategy and keyword research' });
      phases.push({ phase: 'Creation', durationDays: 14, description: 'Content creation and optimization' });
      phases.push({ phase: 'Publication', durationDays: 7, description: 'Content publication and promotion' });
      phases.push({ phase: 'Monitoring', durationDays: months * 30 - 26, description: 'Performance monitoring and iteration' });
    } else if (action.includes('email') || action.includes('campaign')) {
      phases.push({ phase: 'Planning', durationDays: 3, description: 'Campaign planning and audience segmentation' });
      phases.push({ phase: 'Creation', durationDays: 7, description: 'Email creative and copy development' });
      phases.push({ phase: 'Execution', durationDays: months * 30 - 10, description: 'Campaign execution and monitoring' });
    } else {
      phases.push({ phase: 'Planning', durationDays: 5, description: 'Strategic planning and resource allocation' });
      phases.push({ phase: 'Execution', durationDays: months * 30 - 5, description: 'Execution and monitoring' });
    }
    const totalDays = phases.reduce((sum, p) => sum + p.durationDays, 0);
    return { phases, totalDays };
  }

  _calculateConfidence(outcomes, context) {
    let base = 0.6;
    if (context?.evidence?.sources?.length > 0) base += Math.min(0.2, context.evidence.sources.length * 0.02);
    if (context?.confidence?.overall) base += (context.confidence.overall - 0.5) * 0.3;
    if (context?.knowledgeGraph?.entityCount > 10) base += 0.05;
    if (outcomes?.roi && outcomes.roi > 100) base += 0.1;
    const variability = outcomes ? Object.values(outcomes).filter(v => typeof v === 'number').reduce((sum, v) => sum + Math.abs(v), 0) / 100 : 0;
    base -= Math.min(0.15, variability * 0.05);
    return Math.round(Math.max(0.1, Math.min(0.95, base)) * 100) / 100;
  }

  _generateSummary(outcomes, confidence) {
    const parts = [];
    if (outcomes.leadGrowth > 0) parts.push(`Lead growth: +${outcomes.leadGrowth.toFixed(1)}%`);
    if (outcomes.revenueChange > 0) parts.push(`Revenue impact: +${outcomes.revenueChange.toFixed(1)}%`);
    if (outcomes.roi != null) parts.push(`Expected ROI: ${outcomes.roi.toFixed(1)}%`);
    if (outcomes.cacChange < 0) parts.push(`CAC reduction: ${Math.abs(outcomes.cacChange).toFixed(1)}%`);
    parts.push(`Confidence: ${(confidence * 100).toFixed(0)}%`);
    return parts.join(' | ');
  }

  _estimateMonths(timeframe) {
    if (!timeframe) return 3;
    const l = timeframe.toLowerCase();
    if (l.includes('week')) {
      const m = l.match(/(\d+)\s*week/);
      return m ? Math.max(1, Math.round(parseInt(m[1]) / 4.33)) : 1;
    }
    if (l.includes('month')) {
      const m = l.match(/(\d+)\s*month/);
      return m ? parseInt(m[1]) : 1;
    }
    if (l.includes('quarter') || l.match(/q[1-4]/)) return 3;
    if (l.includes('half')) return 6;
    if (l.includes('year')) return 12;
    return 3;
  }

  async health() {
    return { name: this._name, status: 'HEALTHY', initialized: this._initialized };
  }
}
