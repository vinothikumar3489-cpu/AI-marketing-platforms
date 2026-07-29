import { BaseEngine } from '../engine.js';
import { EngineStatus, elapsedMs, logEngine } from '../core.js';

export class GraphEngine extends BaseEngine {
  constructor() {
    super('GraphEngine');
    this._graphService = null;
  }

  setGraphService(service) {
    this._graphService = service;
  }

  async execute(context) {
    const rid = context?.requestId || 'NO_RID';
    const start = Date.now();
    logEngine(this._name, rid, 0, EngineStatus.RUNNING);

    if (!this._graphService) {
      logEngine(this._name, rid, elapsedMs(start), EngineStatus.SKIPPED, 'GraphService not available');
      return { success: true, data: { update: 'skipped', reason: 'GraphService not available' } };
    }

    try {
      const updateStats = await this._graphService.updateFromEvidence(context);

      const graphResult = {
        update: 'completed',
        newEntities: updateStats.newEntities,
        updatedEntities: updateStats.updatedEntities,
        relationshipsCreated: updateStats.relationshipsCreated,
        duplicatesMerged: updateStats.duplicatesMerged,
        elapsed: updateStats.elapsed,
        errors: updateStats.errors,
      };

      context.graph = graphResult;

      logEngine(this._name, rid, elapsedMs(start), EngineStatus.COMPLETED,
        `new=${updateStats.newEntities} upd=${updateStats.updatedEntities} rel=${updateStats.relationshipsCreated} dup=${updateStats.duplicatesMerged}`);
      return { success: true, data: graphResult };
    } catch (err) {
      logEngine(this._name, rid, elapsedMs(start), EngineStatus.FAILED, err.message);
      context.graph = { update: 'failed', error: err.message };
      return { success: false, error: err.message };
    }
  }

  async health() {
    if (!this._graphService) {
      return { name: this._name, status: 'HEALTHY', note: 'GraphService not injected, engine idle' };
    }
    try {
      const report = await this._graphService.health();
      return { name: this._name, status: 'HEALTHY', ...report };
    } catch (err) {
      return { name: this._name, status: 'DEGRADED', error: err.message };
    }
  }
}
