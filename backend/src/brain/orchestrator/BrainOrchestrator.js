import { BaseEngine } from '../engine.js';
import { BrainContext } from '../interfaces.js';
import { BrainResponse } from '../interfaces.js';
import { EngineStatus, generateBrainId, elapsedMs, logEngine } from '../core.js';

export class BrainOrchestrator extends BaseEngine {
  constructor(di) {
    super('BrainOrchestrator');
    this._di = di;
    this._engineOrder = [
      'memory',
      'knowledge',
      'evidence',
      'adapter',
      'graph',
      'reasoning',
      'recommendations',
      'confidence',
      'learning',
      'quality',
      'decision',
    ];
  }

  async execute(context) {
    const rid = context?.requestId || generateBrainId();
    const orchestrationStart = Date.now();
    logEngine(this._name, rid, 0, EngineStatus.RUNNING);

    const results = {};
    const timings = {};
    const errors = [];
    const warnings = [];

    for (const engineName of this._engineOrder) {
      const engine = this._di.resolve(engineName);
      if (!engine) {
        warnings.push(`Engine "${engineName}" not registered in DI`);
        continue;
      }
      const engineStart = Date.now();
      try {
        logEngine(engineName, rid, 0, EngineStatus.RUNNING);
        const result = await engine.execute(context);
        timings[engineName] = elapsedMs(engineStart);
        results[engineName] = result;
        if (result?.success) {
          logEngine(engineName, rid, timings[engineName], EngineStatus.COMPLETED);
        } else {
          const msg = result?.error || `${engineName} returned unsuccessful`;
          errors.push({ engine: engineName, error: msg });
          logEngine(engineName, rid, timings[engineName], EngineStatus.FAILED, msg);
        }
      } catch (err) {
        timings[engineName] = elapsedMs(engineStart);
        errors.push({ engine: engineName, error: err.message });
        logEngine(engineName, rid, timings[engineName], EngineStatus.FAILED, err.message);
      }
    }

    const totalElapsed = elapsedMs(orchestrationStart);
    context.timings = { ...context.timings, ...timings, total: totalElapsed };
    context.errors = errors;

    const memorySections = context?.memory?.sections || {};
    const memoryHits = Object.values(memorySections).filter(s => s?.exists).length;
    const totalSections = Object.keys(memorySections).length;

    const graphUpdate = context?.graph || {};

    context.contextSummary = {
      memoryHits,
      totalSections,
      evidenceSources: context?.evidence?.sources?.length || 0,
      memoryComplete: totalSections > 0 ? memoryHits >= totalSections : false,
      companyKnown: !!(context?.knowledge?.company?.name && context.knowledge.company.name !== 'Unknown'),
      productKnown: !!(context?.knowledge?.product?.name && context.knowledge.product.name !== 'Unknown'),
      hasCompetitors: (context?.knowledge?.competitors?.count || 0) > 0,
      hasSeoData: context?.knowledge?.keywords?.hasKeywords || false,
      weakestConfidence: context?.confidence?.weakestSection?.section || null,
      reasoningApplied: (context?.reasoning?.conclusions?.length || 0) > 0,
      recommendationsCount: context?.recommendations?.count || 0,
      graphUpdated: graphUpdate.update === 'completed',
      graphEntitiesCreated: graphUpdate.newEntities || 0,
      graphRelationshipsCreated: graphUpdate.relationshipsCreated || 0,
      graphDuplicatesMerged: graphUpdate.duplicatesMerged || 0,
    };

    logEngine(this._name, rid, totalElapsed, errors.length ? EngineStatus.FAILED : EngineStatus.COMPLETED);

    const decisionResult = results.decision;
    return new BrainResponse({
      requestId: rid,
      success: errors.length === 0,
      status: errors.length ? 'PARTIAL_FAILURE' : 'COMPLETED',
      context,
      decisions: decisionResult?.data?.decisions || [],
      decisionId: decisionResult?.data?.decisionId || null,
      recommendations: context?.recommendations?.items || [],
      confidence: context?.confidence || null,
      insights: [],
      warnings,
      errors,
      timings: context.timings,
      engineResults: results,
    });
  }

  async process(request) {
    const rid = request?.requestId || generateBrainId();
    const start = Date.now();
    console.log(`[${rid}] [BrainOrchestrator] ENTER: process request — module=${request?.module}, action=${request?.action}`);

    const context = new BrainContext({
      requestId: rid,
      request,
      metadata: request?.metadata || {},
    });

    const response = await this.execute(context);
    response.requestId = rid;

    console.log(`[${rid}] [BrainOrchestrator] EXIT: success=${response.success}, elapsed=${elapsedMs(start)}ms, errors=${response.errors.length}`);
    return response;
  }

  async health() {
    const engineHealth = {};
    for (const engineName of this._engineOrder) {
      const engine = this._di.resolve(engineName);
      if (engine) {
        try {
          engineHealth[engineName] = await engine.health();
        } catch (err) {
          engineHealth[engineName] = { name: engineName, status: 'UNHEALTHY', error: err.message };
        }
      } else {
        engineHealth[engineName] = { name: engineName, status: 'NOT_REGISTERED' };
      }
    }
    return {
      name: this._name,
      status: Object.values(engineHealth).every(h => h.status === 'HEALTHY') ? 'HEALTHY' : 'DEGRADED',
      engines: engineHealth,
    };
  }
}
