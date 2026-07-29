import { BaseEngine } from '../engine.js';

export class ModuleAdapter extends BaseEngine {
  constructor(name) {
    super(name);
    this._prisma = null;
    this._configured = false;
    this._metrics = { invocations: 0, totalMs: 0, evidenceCollected: 0, lastInvocation: null };
  }

  setPrisma(prisma) { this._prisma = prisma; }

  get configured() { return this._configured; }
  get metrics() { return { ...this._metrics }; }

  async collectEvidence(context) { return { sources: [], module: this._name }; }
  async updateKnowledge(context) { return { updates: [], module: this._name }; }
  async updateMemory(context) { return { memories: [], module: this._name }; }
  async updateLearning(context) { return { insights: [], module: this._name }; }

  _track(durationMs, evidenceCount) {
    this._metrics.invocations++;
    this._metrics.totalMs += durationMs;
    this._metrics.evidenceCollected += evidenceCount;
    this._metrics.lastInvocation = new Date().toISOString();
  }

  averageTimeMs() {
    return this._metrics.invocations > 0
      ? Math.round(this._metrics.totalMs / this._metrics.invocations)
      : 0;
  }

  async health() {
    const avg = this.averageTimeMs();
    return {
      name: this._name,
      status: this._configured ? 'HEALTHY' : 'DEGRADED',
      configured: this._configured,
      invocations: this._metrics.invocations,
      averageTimeMs: avg,
      evidenceCollected: this._metrics.evidenceCollected,
      lastInvocation: this._metrics.lastInvocation,
    };
  }
}
