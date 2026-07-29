import { BaseEngine } from '../engine.js';
import { EngineStatus, elapsedMs, logEngine, HealthStatus } from '../core.js';

const ADAPTER_NAMES = [
  'companyIntelligence', 'geo', 'audience', 'contentStudio', 'campaign',
  'crm', 'email', 'analytics', 'research', 'workflow', 'seo',
];

const ADAPTER_LABELS = {
  companyIntelligence: 'Company Intelligence',
  product: 'Product Intelligence',
  competitor: 'Competitor Intelligence',
  geo: 'GEO Intelligence',
  audience: 'Audience Intelligence',
  contentStudio: 'Content Studio',
  campaign: 'Campaign Planning',
  crm: 'CRM',
  email: 'Email Automation',
  analytics: 'Analytics',
  research: 'AI Research',
  workflow: 'Workflow Automation',
  seo: 'SEO Intelligence',
};

export class BrainHealth extends BaseEngine {
  constructor(di) {
    super('BrainHealth');
    this._di = di;
  }

  async execute(context) {
    const rid = context?.requestId || 'HEALTH';
    const start = Date.now();
    logEngine(this._name, rid, 0, EngineStatus.RUNNING);
    const report = await this._buildReport();
    logEngine(this._name, rid, elapsedMs(start), EngineStatus.COMPLETED);
    return { success: true, data: report };
  }

  async _buildReport() {
    const engineNames = [
      'memory', 'knowledge', 'evidence', 'adapter', 'graph', 'reasoning',
      'recommendations', 'confidence', 'learning', 'quality',
      'scheduler',
    ];

    const engines = {};
    let allHealthy = true;

    for (const name of engineNames) {
      const engine = this._di.resolve(name);
      if (engine) {
        try {
          const h = await engine.health();
          engines[name] = h;
          if (h.status !== 'HEALTHY') allHealthy = false;
        } catch (err) {
          engines[name] = { name, status: 'UNHEALTHY', error: err.message };
          allHealthy = false;
        }
      } else {
        engines[name] = { name, status: 'NOT_REGISTERED' };
        allHealthy = false;
      }
    }

    const adapters = {};
    for (const name of ADAPTER_NAMES) {
      const adapter = this._di.resolve(name);
      if (adapter) {
        try {
          const h = await adapter.health();
          adapters[name] = h;
          if (h.status !== 'HEALTHY') allHealthy = false;
        } catch (err) {
          adapters[name] = { name, status: 'UNHEALTHY', error: err.message };
          allHealthy = false;
        }
      } else {
        adapters[name] = { name, status: 'NOT_CONFIGURED', configured: false };
      }
    }

    const adoptionReport = await this._buildAdoptionReport(adapters);

    const orchestrator = this._di.resolve('orchestrator');
    const orchestratorHealth = orchestrator ? await orchestrator.health() : { status: 'NOT_REGISTERED' };

    return {
      timestamp: new Date().toISOString(),
      overall: allHealthy ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
      database: await this._checkDatabase(),
      orchestrator: orchestratorHealth,
      engines,
      adapters,
      adoption: adoptionReport,
    };
  }

  async _buildAdoptionReport(adapters) {
    const list = ADAPTER_NAMES.map(name => {
      const info = adapters[name] || {};
      const label = ADAPTER_LABELS[name] || name;
      const configured = info.configured === true;
      return { module: name, name: label, configured, status: info.status || 'UNKNOWN' };
    });

    const configuredCount = list.filter(a => a.configured).length;
    const totalCount = list.length;
    const overallAdoption = totalCount > 0 ? Math.round((configuredCount / totalCount) * 10000) / 100 : 0;

    return {
      overallAdoption,
      configuredCount,
      totalCount,
      modules: list,
      summary: list.map(a => `${a.name} ${a.configured ? '✓' : '✗'}`).join('\n'),
    };
  }

  async _checkDatabase() {
    try {
      const prisma = this._di.resolve('prisma');
      if (prisma?.$queryRaw) {
        await prisma.$queryRaw`SELECT 1`;
        return { status: HealthStatus.HEALTHY };
      }
      return { status: HealthStatus.NOT_CONFIGURED };
    } catch (err) {
      return { status: HealthStatus.UNHEALTHY, error: err.message };
    }
  }

  async health() {
    const report = await this._buildReport();
    return {
      name: this._name,
      status: report.overall === HealthStatus.HEALTHY ? 'HEALTHY' : 'DEGRADED',
      ...report,
    };
  }

  async generateReport() {
    return this._buildReport();
  }

  async adoptionReport() {
    const report = await this._buildReport();
    return report.adoption;
  }

  async executionMetrics() {
    const metrics = {};
    for (const name of ADAPTER_NAMES) {
      const adapter = this._di.resolve(name);
      if (adapter) {
        try {
          const h = await adapter.health();
          metrics[name] = {
            configured: h.configured,
            invocations: h.invocations || 0,
            averageTimeMs: h.averageTimeMs || 0,
            evidenceCollected: h.evidenceCollected || 0,
            status: h.status,
          };
        } catch {
          metrics[name] = { configured: false, status: 'ERROR' };
        }
      } else {
        metrics[name] = { configured: false, status: 'NOT_REGISTERED' };
      }
    }
    return {
      timestamp: new Date().toISOString(),
      modules: metrics,
    };
  }
}
