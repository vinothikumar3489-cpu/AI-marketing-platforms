import { BaseEngine } from '../engine.js';

export class ImpactAnalyzer extends BaseEngine {
  constructor() {
    super('ImpactAnalyzer');
  }

  async execute(context) {
    const { decisionContext, scenario } = context || {};
    if (!scenario) {
      return { success: true, impact: null, warnings: ['No scenario provided'] };
    }

    return this.analyzeImpact(scenario, decisionContext);
  }

  analyzeImpact(scenario, context) {
    const action = (scenario.action || '').toLowerCase();
    const params = scenario.parameters || {};
    const outcomes = scenario.simulatedOutcomes || {};

    const revenueImpact = this._scoreRevenueImpact(outcomes, params, action);
    const growthImpact = this._scoreGrowthImpact(outcomes, params, action);
    const efficiencyImpact = this._scoreEfficiencyImpact(outcomes, params, action);
    const brandImpact = this._scoreBrandImpact(outcomes, params, action);
    const competitiveImpact = this._scoreCompetitiveImpact(outcomes, params, action);
    const customerImpact = this._scoreCustomerImpact(outcomes, params, action);
    const operationalImpact = this._scoreOperationalImpact(outcomes, params, action);

    const dimensions = {
      revenue: revenueImpact,
      growth: growthImpact,
      efficiency: efficiencyImpact,
      brand: brandImpact,
      competitive: competitiveImpact,
      customer: customerImpact,
      operational: operationalImpact,
    };

    const overallScore = this._calculateOverallImpact(dimensions);

    return {
      dimensions,
      overallScore,
      overallLevel: this._levelFromScore(overallScore),
      positiveDimensions: Object.entries(dimensions).filter(([_, d]) => d.score > 0.2).length,
      negativeDimensions: Object.entries(dimensions).filter(([_, d]) => d.score < -0.2).length,
      summary: this._generateSummary(dimensions, outcomes),
    };
  }

  _scoreRevenueImpact(outcomes, params, action) {
    const revenueGrowth = outcomes.revenueChange || 0;
    const roi = outcomes.roi || 0;
    let score = revenueGrowth > 0 ? Math.min(1, revenueGrowth / 50) : Math.max(-1, revenueGrowth / 30);
    if (roi > 0) score = Math.min(1, score + roi / 200);
    return { score: Math.round(score * 100) / 100, description: revenueGrowth > 0 ? `Revenue projected to grow by ~${revenueGrowth.toFixed(1)}%` : `Revenue impact likely minimal or negative (${revenueGrowth.toFixed(1)}%)` };
  }

  _scoreGrowthImpact(outcomes, params, action) {
    const leadGrowth = outcomes.leadGrowth || 0;
    const pipelineVelocity = outcomes.pipelineVelocity || 0;
    let score = leadGrowth > 0 ? Math.min(1, leadGrowth / 100) : 0;
    if (pipelineVelocity > 0) score = Math.min(1, score + pipelineVelocity / 2);
    return { score: Math.round(score * 100) / 100, description: leadGrowth > 0 ? `Lead generation projected to increase by ~${leadGrowth.toFixed(1)}%` : 'Growth impact uncertain, lead generation change not significant' };
  }

  _scoreEfficiencyImpact(outcomes, params, action) {
    const cacChange = outcomes.cacChange || 0;
    let score = cacChange < 0 ? Math.min(1, Math.abs(cacChange) / 30) : Math.max(-0.5, -cacChange / 50);
    if (params.automationLevel && params.automationLevel > 0.5) score += 0.15;
    return { score: Math.round(Math.min(1, score) * 100) / 100, description: cacChange < 0 ? `CAC projected to decrease by ${Math.abs(cacChange).toFixed(1)}%, improving efficiency` : cacChange > 0 ? `CAC may increase by ${cacChange.toFixed(1)}%` : 'Efficiency impact neutral' };
  }

  _scoreBrandImpact(outcomes, params, action) {
    if (action.includes('brand') || action.includes('content')) return { score: 0.4, description: 'Brand visibility likely to improve through consistent messaging' };
    if (action.includes('email') || action.includes('spam')) return { score: -0.2, description: 'Potential brand fatigue if email frequency is not managed' };
    return { score: 0.1, description: 'Brand impact likely neutral to slightly positive' };
  }

  _scoreCompetitiveImpact(outcomes, params, action) {
    const compAdvantage = outcomes.competitiveAdvantage || 0;
    if (compAdvantage !== 0) return { score: Math.round(Math.max(-1, Math.min(1, compAdvantage)) * 100) / 100, description: compAdvantage > 0 ? `Competitive position expected to improve (score: ${compAdvantage.toFixed(2)})` : 'Competitive position may weaken slightly' };
    if (action.includes('seo')) return { score: 0.3, description: 'SEO improvements strengthen competitive positioning in search results' };
    if (action.includes('ad')) return { score: 0.2, description: 'Increased ad presence can improve share of voice' };
    return { score: 0.1, description: 'Limited direct competitive impact expected' };
  }

  _scoreCustomerImpact(outcomes, params, action) {
    if (action.includes('email') || action.includes('retention')) return { score: 0.5, description: 'Customer engagement and retention likely to improve' };
    if (action.includes('content')) return { score: 0.4, description: 'Valuable content improves customer experience and education' };
    if (action.includes('ad') || action.includes('aggressive')) return { score: -0.1, description: 'Aggressive advertising may cause customer fatigue' };
    return { score: 0.1, description: 'Minimal direct customer impact' };
  }

  _scoreOperationalImpact(outcomes, params, action) {
    if (params.automationLevel && params.automationLevel > 0.5) return { score: 0.5, description: 'Automation reduces manual effort and improves scalability' };
    if (action.includes('workflow') || action.includes('tool')) return { score: 0.3, description: 'New tools and workflows improve operational efficiency' };
    return { score: 0, description: 'No significant operational impact' };
  }

  _calculateOverallImpact(dimensions) {
    const weights = { revenue: 1.0, growth: 0.85, efficiency: 0.6, brand: 0.4, competitive: 0.6, customer: 0.7, operational: 0.5 };
    let weightedSum = 0, totalWeight = 0;
    for (const [key, dim] of Object.entries(dimensions)) {
      const w = weights[key] || 0.5;
      weightedSum += (dim.score || 0) * w;
      totalWeight += w;
    }
    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
  }

  _levelFromScore(score) {
    if (score >= 0.6) return 'very_positive';
    if (score >= 0.2) return 'positive';
    if (score >= -0.2) return 'neutral';
    if (score >= -0.6) return 'negative';
    return 'very_negative';
  }

  _generateSummary(dimensions, outcomes) {
    const positive = Object.entries(dimensions).filter(([_, d]) => (d.score || 0) > 0.2).map(([k]) => k);
    const negative = Object.entries(dimensions).filter(([_, d]) => (d.score || 0) < -0.2).map(([k]) => k);
    const parts = [];
    if (positive.length > 0) parts.push(`Positive impact expected on: ${positive.join(', ')}`);
    if (negative.length > 0) parts.push(`Negative impact expected on: ${negative.join(', ')}`);
    if (parts.length === 0) parts.push('Overall impact expected to be neutral across all dimensions');
    return parts.join('. ') + '.';
  }

  async health() {
    return { name: this._name, status: 'HEALTHY', initialized: this._initialized };
  }
}
