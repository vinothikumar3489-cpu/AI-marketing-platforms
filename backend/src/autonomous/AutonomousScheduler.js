import { BaseAutonomousModule } from './BaseAutonomousModule.js';

export class AutonomousScheduler extends BaseAutonomousModule {
  constructor(brainService) {
    super('AutonomousScheduler', brainService);
    this._jobs = new Map();
    this._timers = new Map();
    this._running = false;
  }

  async _run(context) {
    return this.getJobStatus();
  }

  registerJob(name, { interval, handler, immediate = false }) {
    if (!name || typeof handler !== 'function') {
      throw new Error('Job must have a name and handler function');
    }

    const job = {
      name,
      interval: interval || 3600000,
      handler,
      lastRun: null,
      status: 'registered',
      runs: 0,
      errors: 0,
      createdAt: new Date().toISOString(),
    };

    this._jobs.set(name, job);

    if (this._running && immediate) {
      this._executeJob(name);
    }

    return job;
  }

  startAll() {
    if (this._running) return { success: true, message: 'Scheduler already running' };

    this._running = true;

    for (const [name, job] of this._jobs) {
      this._scheduleJob(name, job);
    }

    return {
      success: true,
      jobsScheduled: this._jobs.size,
      startedAt: new Date().toISOString(),
    };
  }

  stopAll() {
    this._running = false;

    for (const [name, timer] of this._timers) {
      clearInterval(timer);
    }
    this._timers.clear();

    for (const [, job] of this._jobs) {
      job.status = 'stopped';
    }

    return {
      success: true,
      jobsStopped: this._timers.size,
      stoppedAt: new Date().toISOString(),
    };
  }

  getJobStatus() {
    const jobs = [];
    for (const [name, job] of this._jobs) {
      jobs.push({
        name: job.name,
        interval: job.interval,
        intervalLabel: this._formatInterval(job.interval),
        lastRun: job.lastRun,
        status: job.status,
        runs: job.runs,
        errors: job.errors,
        createdAt: job.createdAt,
      });
    }

    return {
      running: this._running,
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.status === 'running' || j.status === 'registered').length,
      jobs,
      checkedAt: new Date().toISOString(),
    };
  }

  getJob(name) {
    return this._jobs.get(name) || null;
  }

  removeJob(name) {
    if (this._timers.has(name)) {
      clearInterval(this._timers.get(name));
      this._timers.delete(name);
    }
    return this._jobs.delete(name);
  }

  async _executeJob(name) {
    const job = this._jobs.get(name);
    if (!job) return;

    job.status = 'running';
    const start = Date.now();

    try {
      await job.handler();
      job.lastRun = new Date().toISOString();
      job.runs++;
      job.status = 'registered';
    } catch (err) {
      job.errors++;
      job.status = 'error';
      job.lastError = err.message;
      job.lastErrorAt = new Date().toISOString();
    }
  }

  _scheduleJob(name, job) {
    if (this._timers.has(name)) {
      clearInterval(this._timers.get(name));
    }

    const timer = setInterval(() => {
      this._executeJob(name);
    }, job.interval);

    this._timers.set(name, timer);
  }

  _formatInterval(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  async shutdown() {
    this.stopAll();
    return super.shutdown();
  }

  async health() {
    return {
      ...(await super.health()),
      running: this._running,
      totalJobs: this._jobs.size,
      activeTimers: this._timers.size,
    };
  }
}
