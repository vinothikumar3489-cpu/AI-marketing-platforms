import { BaseEngine } from '../engine.js';

export class DecisionHealth extends BaseEngine {
  constructor() {
    super('DecisionHealth');
  }

  async execute(context) {
    return this.generateReport(context);
  }

  async generateReport(context) {
    const decisionMemory = context?.decisionMemory;
    const decisionEngine = context?.decisionEngine;
    const memoryHealth = decisionMemory ? await decisionMemory.health() : null;
    const engineHealth = decisionEngine ? await decisionEngine.health() : null;

    const memoryStatus = memoryHealth?.status || 'NOT_CONFIGURED';
    const engineStatus = engineHealth?.status || 'NOT_CONFIGURED';

    const allHealthy = memoryStatus === 'HEALTHY' && engineStatus === 'HEALTHY';

    const summary = {
      overall: allHealthy ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      decisionEngine: engineHealth || { status: 'NOT_CONFIGURED' },
      decisionMemory: memoryHealth || { status: 'NOT_CONFIGURED' },
      metrics: {
        totalDecisions: memoryHealth?.storedDecisions || 0,
        confidenceTrend: 0,
        averageRoi: 0,
        decisionAccuracy: 0,
        learningEfficiency: 0,
      },
    };

    const completedDecisions = memoryHealth?.completedDecisions || 0;
    if (completedDecisions > 0 && decisionMemory) {
      const learning = await decisionMemory.getLearningSummary().catch(() => null);
      if (learning) {
        summary.metrics.decisionAccuracy = learning.successRate || 0;
        summary.metrics.totalLessons = learning.totalLessons || 0;
      }
    }

    return summary;
  }

  async health() {
    return {
      name: this._name,
      status: 'HEALTHY',
      initialized: this._initialized,
    };
  }
}
