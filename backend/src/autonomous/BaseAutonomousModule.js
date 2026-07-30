import { BaseEngine } from '../brain/engine.js';
import { EngineStatus, logEngine } from '../brain/core.js';

export class BaseAutonomousModule extends BaseEngine {
  constructor(name, brainService) {
    super(name);
    this._brain = brainService;
    this._store = new Map();
    this._lastResults = null;
  }

  async initialize(context) {
    const start = Date.now();
    this._initialized = true;
    logEngine(this._name, context?.requestId || 'AUTO', Date.now() - start, EngineStatus.INITIALIZED);
    return { success: true, module: this._name };
  }

  async execute(context) {
    const start = Date.now();
    this._lastResults = await this._run(context);
    logEngine(this._name, context?.requestId || 'AUTO', Date.now() - start, EngineStatus.COMPLETED);
    return this._lastResults;
  }

  async _run(context) {
    throw new Error(`${this._name}._run() must be overridden`);
  }

  async health() {
    return {
      name: this._name,
      status: this._initialized ? 'HEALTHY' : 'NOT_INITIALIZED',
      initialized: this._initialized,
      storeSize: this._store.size,
      hasResults: this._lastResults !== null,
    };
  }

  async shutdown() {
    const start = Date.now();
    this._initialized = false;
    this._store.clear();
    this._lastResults = null;
    logEngine(this._name, 'SYSTEM', Date.now() - start, EngineStatus.SHUTDOWN);
    return { success: true };
  }

  _storeOpportunity(opportunity) {
    const key = `${opportunity.type}_${opportunity.id || Date.now()}`;
    opportunity.timestamp = opportunity.timestamp || new Date().toISOString();
    opportunity.id = opportunity.id || key;
    this._store.set(`opp_${key}`, opportunity);
    return opportunity;
  }

  _getOpportunities(type) {
    const all = [];
    for (const [key, value] of this._store) {
      if (key.startsWith('opp_') && (!type || value.type === type)) {
        all.push(value);
      }
    }
    return all;
  }

  _storeAlert(alert) {
    const key = `alert_${alert.id || Date.now()}`;
    alert.id = alert.id || key;
    alert.timestamp = alert.timestamp || new Date().toISOString();
    alert.acknowledged = alert.acknowledged || false;
    this._store.set(key, alert);
    return alert;
  }

  _getAlerts(priority) {
    const all = [];
    for (const [key, value] of this._store) {
      if (key.startsWith('alert_') && (!priority || value.priority === priority)) {
        all.push(value);
      }
    }
    return all;
  }

  _getEngine(name) {
    return this._brain ? this._brain.getEngine(name) : null;
  }

  _getAgentManager() {
    return this._brain ? this._brain.agentManager : null;
  }

  _clearResults() {
    this._lastResults = null;
  }
}
