import { EngineStatus, logEngine } from './core.js';

export class BaseEngine {
  constructor(name) {
    this._name = name;
    this._initialized = false;
  }

  get name() {
    return this._name;
  }

  get initialized() {
    return this._initialized;
  }

  async initialize(context) {
    const start = Date.now();
    this._initialized = true;
    logEngine(this._name, context?.requestId || 'SYSTEM', Date.now() - start, EngineStatus.INITIALIZED);
    return { success: true };
  }

  async execute(context) {
    throw new Error(`${this._name}.execute() must be overridden by subclass`);
  }

  async health() {
    return {
      name: this._name,
      status: this._initialized ? 'HEALTHY' : 'NOT_INITIALIZED',
      initialized: this._initialized,
    };
  }

  async shutdown() {
    const start = Date.now();
    this._initialized = false;
    logEngine(this._name, 'SYSTEM', Date.now() - start, EngineStatus.SHUTDOWN);
    return { success: true };
  }
}
