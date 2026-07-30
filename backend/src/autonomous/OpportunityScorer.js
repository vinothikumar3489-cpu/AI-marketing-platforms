import { BaseAutonomousModule } from './BaseAutonomousModule.js';

export class OpportunityScorer extends BaseAutonomousModule {
  constructor(brainService) {
    super('OpportunityScorer', brainService);
  }

  async _run(context) {
    const opportunities = context?.opportunities || [];
    const scored = this.score(opportunities);

    return {
      scoredOpportunities: scored,
      summary: {
        totalScored: scored.length,
        averageScore: scored.length ? scored.reduce((s, o) => s + o.score, 0) / scored.length : 0,
        topOpportunity: scored.length ? scored.reduce((best, o) => o.score > best.score ? o : best, scored[0]) : null,
        scoredAt: new Date().toISOString(),
      },
    };
  }

  score(opportunities) {
    if (!Array.isArray(opportunities)) return [];

    return opportunities.map((opp, index) => {
      const scores = {
        businessImpact: this._scoreDimension(opp.businessImpact || opp.business_impact || 50, 'business_impact'),
        confidence: this._scoreDimension(opp.confidence || opp.confidence_estimate || 50, 'confidence'),
        urgency: this._scoreDimension(opp.urgency || opp.urgency_level || 50, 'urgency'),
        difficulty: this._scoreDimension(opp.difficulty || 50, 'difficulty'),
        expectedRoi: this._scoreDimension(opp.expectedRoi || opp.expected_roi || 50, 'expected_roi'),
      };

      const weights = {
        businessImpact: 0.30,
        confidence: 0.20,
        urgency: 0.20,
        difficulty: 0.15,
        expectedRoi: 0.15,
      };

      const rawScore = (
        scores.businessImpact * weights.businessImpact +
        scores.confidence * weights.confidence +
        scores.urgency * weights.urgency +
        (100 - scores.difficulty) * weights.difficulty +
        scores.expectedRoi * weights.expectedRoi
      );

      const weightedScore = Math.round(Math.max(0, Math.min(100, rawScore)));

      return {
        ...opp,
        score: weightedScore,
        scoreComponents: scores,
        scoreWeights: weights,
        scoreCategory: this._categorizeScore(weightedScore),
        scoredAt: new Date().toISOString(),
      };
    });
  }

  scoreOpportunity(opportunity) {
    const scored = this.score([opportunity]);
    return scored.length ? scored[0] : null;
  }

  _scoreDimension(value, dimensionName) {
    if (typeof value === 'number') {
      return Math.max(0, Math.min(100, value));
    }

    const dimensionMap = {
      business_impact: { very_low: 10, low: 25, medium: 50, high: 75, very_high: 90, critical: 100 },
      confidence: { very_low: 10, low: 30, medium: 50, high: 70, very_high: 85, confirmed: 100 },
      urgency: { none: 0, low: 20, medium: 50, high: 75, critical: 95, immediate: 100 },
      difficulty: { trivial: 10, very_easy: 20, easy: 35, medium: 50, hard: 70, very_hard: 85, extreme: 100 },
      expected_roi: { negative: 10, low: 25, medium: 50, high: 75, very_high: 90, exceptional: 100 },
    };

    const mapping = dimensionMap[dimensionName] || {};
    const normalized = String(value).toLowerCase().replace(/[\s_-]+/g, '_');

    let numValue = 50;
    if (!isNaN(Number(value))) {
      numValue = Number(value);
    } else if (mapping[normalized] !== undefined) {
      numValue = mapping[normalized];
    } else {
      for (const [key, val] of Object.entries(mapping)) {
        if (normalized.includes(key)) {
          numValue = val;
          break;
        }
      }
    }

    return Math.max(0, Math.min(100, numValue));
  }

  _categorizeScore(score) {
    if (score >= 85) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 45) return 'medium';
    if (score >= 20) return 'low';
    return 'negligible';
  }

  async health() {
    return {
      ...(await super.health()),
    };
  }
}
