import { BaseEngine } from '../engine.js';

export class TradeoffAnalyzer extends BaseEngine {
  constructor() {
    super('TradeoffAnalyzer');
  }

  async execute(context) {
    const scenarios = context?.scenarios || [];
    if (scenarios.length < 2) {
      return { success: true, tradeoffMatrix: [], rankings: [], warnings: ['Need at least 2 scenarios for comparison'] };
    }

    return this.compare(scenarios, context?.decisionContext);
  }

  compare(scenarios, context) {
    const criteria = this._buildCriteria(context);
    const matrix = this._buildMatrix(scenarios, criteria);
    const normalized = this._normalizeScores(matrix, criteria);
    const rankings = this._rankScenarios(normalized, criteria);

    return {
      tradeoffMatrix: normalized,
      rankings,
      criteria,
      winner: rankings[0] || null,
      runnerUp: rankings[1] || null,
      summary: this._generateSummary(rankings, scenarios),
    };
  }

  _buildCriteria(context) {
    const criteria = [
      { id: 'roi', label: 'Expected ROI', weight: 1.0, higherIsBetter: true, source: 'scenario.expectedRoi' },
      { id: 'confidence', label: 'Confidence', weight: 0.8, higherIsBetter: true, source: 'scenario.confidence' },
      { id: 'risk', label: 'Risk Score (inverse)', weight: 0.7, higherIsBetter: false, source: 'scenario.risks.overallRiskScore' },
      { id: 'impact', label: 'Impact Score', weight: 0.8, higherIsBetter: true, source: 'scenario.impact.overallScore' },
      { id: 'leadGrowth', label: 'Lead Growth', weight: 0.6, higherIsBetter: true, source: 'scenario.simulatedOutcomes.leadGrowth' },
      { id: 'revenueChange', label: 'Revenue Impact', weight: 0.9, higherIsBetter: true, source: 'scenario.simulatedOutcomes.revenueChange' },
      { id: 'cacImpact', label: 'CAC Reduction (inverse)', weight: 0.5, higherIsBetter: false, source: 'scenario.simulatedOutcomes.cacChange' },
    ];

    if (context?.constraints) {
      for (const constraint of context.constraints) {
        if (constraint.field === 'min_roi') {
          criteria[0].threshold = constraint.value;
        }
      }
    }

    return criteria;
  }

  _buildMatrix(scenarios, criteria) {
    return scenarios.map(scenario => {
      const scores = {};
      for (const criterion of criteria) {
        scores[criterion.id] = this._extractValue(scenario, criterion.source);
      }
      return {
        scenarioId: scenario.id,
        scenarioLabel: scenario.label,
        scores,
      };
    });
  }

  _extractValue(scenario, path) {
    const parts = path.replace('scenario.', '').split('.');
    let value = scenario;
    for (const part of parts) {
      if (value == null) return 0;
      if (typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return 0;
      }
    }
    return typeof value === 'number' ? value : 0;
  }

  _normalizeScores(matrix, criteria) {
    return matrix.map(row => {
      const normalized = {};
      for (const criterion of criteria) {
        const values = matrix.map(r => r.scores[criterion.id]);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const raw = row.scores[criterion.id];
        normalized[criterion.id] = {
          raw,
          normalized: max === min ? 0.5 : criterion.higherIsBetter
            ? (raw - min) / (max - min)
            : (max - raw) / (max - min),
        };
      }
      return { ...row, normalized };
    });
  }

  _rankScenarios(matrix, criteria) {
    const weighted = matrix.map(row => {
      let totalScore = 0;
      let totalWeight = 0;
      const details = {};
      for (const criterion of criteria) {
        const n = row.normalized[criterion.id]?.normalized || 0;
        const w = criterion.weight;
        details[criterion.id] = {
          raw: row.normalized[criterion.id]?.raw || 0,
          normalized: n,
          weightedScore: n * w,
        };
        totalScore += n * w;
        totalWeight += w;
      }
      return {
        scenarioId: row.scenarioId,
        scenarioLabel: row.scenarioLabel,
        totalScore: totalWeight > 0 ? Math.round((totalScore / totalWeight) * 1000) / 1000 : 0,
        details,
      };
    });

    return weighted.sort((a, b) => b.totalScore - a.totalScore).map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }

  _generateSummary(rankings, scenarios) {
    if (rankings.length === 0) return 'No scenarios to compare';
    const winner = rankings[0];
    const runnerUp = rankings[1];
    const gap = winner && runnerUp ? ((winner.totalScore - runnerUp.totalScore) / runnerUp.totalScore * 100).toFixed(1) : 0;
    return `${winner.scenarioLabel} ranks #1 with score ${(winner.totalScore * 100).toFixed(1)}%. ${gap > 0 ? `Leads #2 by ${gap}%.` : ''} Based on weighted analysis of ROI, confidence, risk, impact, and growth metrics.`;
  }

  async health() {
    return { name: this._name, status: 'HEALTHY', initialized: this._initialized };
  }
}
