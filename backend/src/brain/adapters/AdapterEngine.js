import { BaseEngine } from '../engine.js';
import { EngineStatus, elapsedMs, logEngine } from '../core.js';

const ADAPTER_NAMES = [
  'companyIntelligence', 'geo', 'audience', 'contentStudio', 'campaign',
  'crm', 'email', 'analytics', 'research', 'workflow', 'seo',
];

export class AdapterEngine extends BaseEngine {
  constructor(di) {
    super('AdapterEngine');
    this._di = di;
  }

  async execute(context) {
    const rid = context?.requestId || 'NO_RID';
    const start = Date.now();
    logEngine(this._name, rid, 0, EngineStatus.RUNNING);

    try {
      const results = {};
      const allSources = [];
      let totalEvidence = 0;

      for (const name of ADAPTER_NAMES) {
        const adapter = this._di.resolve(name);
        if (!adapter || typeof adapter.collectEvidence !== 'function') {
          results[name] = { status: 'not_found', evidenceCount: 0 };
          continue;
        }

        try {
          const evidence = await adapter.collectEvidence(context);
          const count = evidence?.sources?.length || 0;
          totalEvidence += count;
          allSources.push(...(evidence?.sources || []));
          results[name] = { status: 'collected', evidenceCount: count, module: evidence?.module || name };
        } catch (err) {
          results[name] = { status: 'error', error: err.message, evidenceCount: 0 };
        }
      }

      if (!context.evidence) context.evidence = {};
      if (!context.evidence.sources) context.evidence.sources = [];
      context.evidence.sources.push(...allSources);
      context.evidence.adapterContributions = results;
      context.evidence.totalAdapterSources = totalEvidence;

      const adapterMetrics = {};
      for (const [name, result] of Object.entries(results)) {
        adapterMetrics[name] = {
          evidenceCount: result.evidenceCount,
          status: result.status,
        };
      }
      context.adapterMetrics = adapterMetrics;

      logEngine(this._name, rid, elapsedMs(start), EngineStatus.COMPLETED,
        `adapters=${Object.keys(results).length} sources=${totalEvidence}`);
      return { success: true, data: { adapterResults: results, totalEvidence } };
    } catch (err) {
      logEngine(this._name, rid, elapsedMs(start), EngineStatus.FAILED, err.message);
      return { success: false, error: err.message };
    }
  }

  async health() {
    const results = {};
    let configured = 0;
    let total = 0;

    for (const name of ADAPTER_NAMES) {
      const adapter = this._di.resolve(name);
      total++;
      if (adapter && typeof adapter.health === 'function') {
        try {
          const h = await adapter.health();
          results[name] = h;
          if (h.configured) configured++;
        } catch {
          results[name] = { name, status: 'ERROR', configured: false };
        }
      } else {
        results[name] = { name, status: 'NOT_REGISTERED', configured: false };
      }
    }

    const adoptionRate = total > 0 ? Math.round((configured / total) * 10000) / 100 : 0;

    return {
      name: this._name,
      status: adoptionRate === 100 ? 'HEALTHY' : 'DEGRADED',
      adapters: results,
      adoptionRate,
      configuredAdapters: configured,
      totalAdapters: total,
    };
  }

  async adoptionReport() {
    const health = await this.health();
    return {
      timestamp: new Date().toISOString(),
      overallAdoption: health.adoptionRate,
      configuredCount: health.configuredAdapters,
      totalCount: health.totalAdapters,
      adapters: Object.entries(health.adapters).map(([name, info]) => ({
        name,
        configured: info.configured,
        status: info.status,
        invocations: info.invocations || 0,
        averageTimeMs: info.averageTimeMs || 0,
        evidenceCollected: info.evidenceCollected || 0,
      })),
    };
  }
}
