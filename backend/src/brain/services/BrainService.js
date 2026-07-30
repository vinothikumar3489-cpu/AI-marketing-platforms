import { BrainRequest } from '../interfaces.js';
import { generateBrainId } from '../core.js';

export class BrainService {
  constructor(di) {
    this._di = di;
  }

  get orchestrator() {
    return this._di.resolve('orchestrator');
  }

  get health() {
    return this._di.resolve('health');
  }

  get scheduler() {
    return this._di.resolve('scheduler');
  }

  get agentManager() {
    return this._di.resolve('agentManager');
  }

  get decisionEngine() {
    return this._di.resolve('decision');
  }

  get decisionMemory() {
    return this._di.resolve('decisionMemory');
  }

  async process(data) {
    const request = data instanceof BrainRequest ? data : new BrainRequest(data);
    if (!request.requestId) request.requestId = generateBrainId();
    return this.orchestrator.process(request);
  }

  async healthCheck() {
    return this.health.generateReport();
  }

  getEngine(name) {
    return this._di.resolve(name);
  }
}
