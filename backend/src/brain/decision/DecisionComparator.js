import { BaseEngine } from '../engine.js';

export class DecisionComparator extends BaseEngine {
  constructor() {
    super('DecisionComparator');
  }

  async execute(context) {
    const scenarios = context?.scenarios || [];
    if (scenarios.length < 2) {
      return { success: true, rankings: [], warnings: ['Need at least 2 scenarios to compare'] };
    }

    return this.compare(scenarios);
  }

  compare(scenarios) {
    const scored = scenarios.map(s => {
      const roi = s.expectedRoi || 0;
      const confidence = s.confidence || 0;
      const risk = s.risks?.overallRiskScore || 0.5;
      const impact = s.impact?.overallScore || 0;
      const cost = s.cost?.total || 0;

      const score = roi * 0.3 + confidence * 0.2 + impact * 0.2 + (1 - risk) * 0.15 + (cost > 0 ? Math.min(1, 1 / cost * 10000) * 0.15 : 0.15);

      return {
        scenarioId: s.id,
        scenarioLabel: s.label,
        score: Math.round(score * 1000) / 1000,
        metrics: { roi, confidence, risk, impact, cost },
      };
    });

    const rankings = scored.sort((a, b) => b.score - a.score).map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));

    return {
      success: true,
      rankings,
      winner: rankings[0] || null,
      runnerUp: rankings[1] || null,
    };
  }

  async health() {
    return { name: this._name, status: 'HEALTHY', initialized: this._initialized };
  }
}
