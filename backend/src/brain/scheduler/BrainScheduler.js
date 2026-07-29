import { BaseEngine } from '../engine.js';
import { EngineStatus, generateBrainId, elapsedMs, logEngine } from '../core.js';

export class BrainScheduler extends BaseEngine {
  constructor() {
    super('BrainScheduler');
    this._jobs = new Map();
    this._intervals = new Map();
  }

  async execute(context) {
    const rid = context?.requestId || generateBrainId();
    const start = Date.now();
    logEngine(this._name, rid, 0, EngineStatus.RUNNING);
    logEngine(this._name, rid, elapsedMs(start), EngineStatus.COMPLETED);
    return { success: true, data: { scheduledJobs: this._jobs.size, activeJobs: this._intervals.size } };
  }

  registerJob(name, fn, cronExpression) {
    this._jobs.set(name, { fn, cronExpression });
    return { success: true };
  }

  startJob(name, intervalMs) {
    const job = this._jobs.get(name);
    if (!job) return { success: false, error: `Job "${name}" not registered` };
    if (this._intervals.has(name)) return { success: false, error: `Job "${name}" already running` };
    const id = setInterval(async () => {
      try {
        await job.fn();
      } catch (err) {
        console.error(`[BrainScheduler] Job "${name}" failed: ${err.message}`);
      }
    }, intervalMs);
    this._intervals.set(name, id);
    return { success: true, message: `Job "${name}" started (interval=${intervalMs}ms)` };
  }

  stopJob(name) {
    const id = this._intervals.get(name);
    if (!id) return { success: false, error: `Job "${name}" not running` };
    clearInterval(id);
    this._intervals.delete(name);
    return { success: true, message: `Job "${name}" stopped` };
  }

  async health() {
    return {
      name: this._name,
      status: 'HEALTHY',
      registeredJobs: this._jobs.size,
      activeJobs: this._intervals.size,
    };
  }

  async shutdown() {
    for (const [name] of this._intervals) this.stopJob(name);
    await super.shutdown();
  }
}
