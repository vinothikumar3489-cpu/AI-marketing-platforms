import { BaseEngine } from '../engine.js';

export class DecisionMemory extends BaseEngine {
  constructor() {
    super('DecisionMemory');
    this._decisions = [];
  }

  setPrisma(prisma) {
    this._prisma = prisma;
  }

  async execute(context) {
    return {
      success: true,
      data: {
        decisions: this._decisions,
        count: this._decisions.length,
      },
    };
  }

  async storeDecision(data) {
    const record = {
      id: data.id || `DECISION-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      goal: data.goal || '',
      context: data.context || {},
      scenarios: data.scenarios || [],
      selectedScenario: data.selectedScenario || null,
      comparison: data.comparison || null,
      explanation: data.explanation || null,
      confidence: data.confidence || 0,
      userId: data.userId || '',
      chatId: data.chatId || '',
      companyName: data.companyName || '',
      productName: data.productName || '',
      status: 'active',
      createdAt: data.createdAt || new Date().toISOString(),
      actualOutcome: null,
      outcomeRecordedAt: null,
      success: null,
      lessonsLearned: null,
    };

    this._decisions.push(record);

    if (this._prisma) {
      try {
        await this._prisma.brainExecution.upsert({
          where: { requestId: record.id },
          create: {
            requestId: record.id,
            requestType: 'decision',
            module: 'DecisionEngine',
            company: record.companyName,
            product: record.productName,
            chatId: record.chatId,
            userId: record.userId,
            processingTime: 0,
            enginesExecuted: ['decision'],
            confidenceAfter: record.confidence,
            errors: null,
          },
          update: {},
        });
      } catch (err) {
        console.warn(`[DecisionMemory] Failed to persist decision to DB: ${err.message}`);
      }
    }

    return { success: true, id: record.id };
  }

  async recordOutcome(decisionId, outcome) {
    const record = this._decisions.find(d => d.id === decisionId);
    if (!record) return { success: false, error: `Decision ${decisionId} not found` };

    record.actualOutcome = {
      result: outcome.result || '',
      metrics: outcome.metrics || {},
      actualRoi: outcome.actualRoi || null,
      actualRevenue: outcome.actualRevenue || null,
      actualLeadGrowth: outcome.actualLeadGrowth || null,
    };
    record.outcomeRecordedAt = new Date().toISOString();
    record.success = outcome.success;
    record.lessonsLearned = outcome.lessonsLearned || [];

    if (this._prisma) {
      try {
        await this._prisma.brainExecution.update({
          where: { requestId: decisionId },
          data: { errors: JSON.stringify({ actualOutcome: record.actualOutcome, success: record.success }) },
        });
      } catch (err) {
        console.warn(`[DecisionMemory] Failed to update decision outcome: ${err.message}`);
      }
    }

    return { success: true };
  }

  async getDecision(decisionId) {
    return this._decisions.find(d => d.id === decisionId) || null;
  }

  async getDecisions(filters = {}) {
    let results = [...this._decisions];
    if (filters.userId) results = results.filter(d => d.userId === filters.userId);
    if (filters.chatId) results = results.filter(d => d.chatId === filters.chatId);
    if (filters.companyName) results = results.filter(d => d.companyName === filters.companyName);
    if (filters.status) results = results.filter(d => d.status === filters.status);
    if (filters.limit) results = results.slice(0, filters.limit);
    return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getSimilarDecisions(goal, limit = 5) {
    const scored = this._decisions
      .map(d => {
        const similarity = this._calculateSimilarity(goal, d.goal);
        return { decision: d, similarity };
      })
      .filter(s => s.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return scored;
  }

  _calculateSimilarity(goal1, goal2) {
    if (!goal1 || !goal2) return 0;
    const g1 = goal1.toLowerCase();
    const g2 = goal2.toLowerCase();
    const words1 = g1.split(/\s+/);
    const words2 = g2.split(/\s+/);
    const intersection = words1.filter(w => words2.includes(w));
    const union = new Set([...words1, ...words2]);
    return union.size > 0 ? intersection.length / union.size : 0;
  }

  async getLearningSummary() {
    const completed = this._decisions.filter(d => d.outcomeRecordedAt != null);
    const successful = completed.filter(d => d.success === true);
    const failed = completed.filter(d => d.success === false);
    const pendingOutcome = this._decisions.filter(d => d.outcomeRecordedAt == null);

    const lessons = completed.flatMap(d => (d.lessonsLearned || []));

    return {
      totalDecisions: this._decisions.length,
      completedDecisions: completed.length,
      successfulDecisions: successful.length,
      failedDecisions: failed.length,
      pendingOutcome,
      successRate: completed.length > 0 ? Math.round((successful.length / completed.length) * 100) : 0,
      totalLessons: lessons.length,
      recentLessons: lessons.slice(-10),
    };
  }

  async health() {
    return {
      name: this._name,
      status: 'HEALTHY',
      initialized: this._initialized,
      storedDecisions: this._decisions.length,
      completedDecisions: this._decisions.filter(d => d.outcomeRecordedAt).length,
      persistenceActive: !!this._prisma,
    };
  }
}
