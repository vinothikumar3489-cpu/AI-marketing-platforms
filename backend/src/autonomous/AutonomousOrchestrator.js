import { BaseAutonomousModule } from './BaseAutonomousModule.js';
import { MarketMonitor } from './MarketMonitor.js';
import { CompetitorMonitor } from './CompetitorMonitor.js';
import { SeoOpportunityEngine } from './SeoOpportunityEngine.js';
import { ContentOpportunityEngine } from './ContentOpportunityEngine.js';
import { CampaignOptimizer } from './CampaignOptimizer.js';
import { LeadOpportunityEngine } from './LeadOpportunityEngine.js';
import { TrendMonitor } from './TrendMonitor.js';
import { AlertManager } from './AlertManager.js';
import { InsightGenerator } from './InsightGenerator.js';
import { OpportunityScorer } from './OpportunityScorer.js';
import { AutonomousScheduler } from './AutonomousScheduler.js';
import { AutonomousDecisionModule } from './AutonomousDecisionModule.js';

export class AutonomousOrchestrator extends BaseAutonomousModule {
  constructor(brainService) {
    super('AutonomousOrchestrator', brainService);
    this._modules = new Map();
    this._lastCycleResults = null;
  }

  async initialize(context) {
    const start = Date.now();

    this._registerModule('marketMonitor', new MarketMonitor(this._brain));
    this._registerModule('competitorMonitor', new CompetitorMonitor(this._brain));
    this._registerModule('seoOpportunityEngine', new SeoOpportunityEngine(this._brain));
    this._registerModule('contentOpportunityEngine', new ContentOpportunityEngine(this._brain));
    this._registerModule('campaignOptimizer', new CampaignOptimizer(this._brain));
    this._registerModule('leadOpportunityEngine', new LeadOpportunityEngine(this._brain));
    this._registerModule('trendMonitor', new TrendMonitor(this._brain));
    this._registerModule('alertManager', new AlertManager(this._brain));
    this._registerModule('insightGenerator', new InsightGenerator(this._brain));
    this._registerModule('opportunityScorer', new OpportunityScorer(this._brain));
    this._registerModule('decisionModule', new AutonomousDecisionModule(this._brain));
    this._registerModule('scheduler', new AutonomousScheduler(this._brain));

    for (const [name, module] of this._modules) {
      try {
        await module.initialize({ requestId: 'AUTO_BOOT' });
      } catch (err) {
        console.error(`[AutonomousOrchestrator] Failed to initialize ${name}: ${err.message}`);
      }
    }

    this._initialized = true;
    console.log(`[AutonomousOrchestrator] Initialized ${this._modules.size} autonomous modules`);

    return { success: true, modulesInitialized: this._modules.size };
  }

  _registerModule(name, instance) {
    this._modules.set(name, instance);
  }

  async runFullCycle(context) {
    if (!this._initialized) {
      throw new Error('Orchestrator not initialized. Call initialize() first.');
    }

    const cycleId = `CYCLE-${Date.now()}`;
    const start = Date.now();
    const cycleResults = {
      cycleId,
      startedAt: new Date().toISOString(),
      modules: {},
      errors: [],
    };

    const collectionOrder = [
      'marketMonitor',
      'competitorMonitor',
      'trendMonitor',
      'campaignOptimizer',
      'seoOpportunityEngine',
      'contentOpportunityEngine',
      'leadOpportunityEngine',
    ];

    for (const name of collectionOrder) {
      const module = this._modules.get(name);
      if (!module) continue;

      try {
        const result = await module.execute({ requestId: cycleId, ...context });
        cycleResults.modules[name] = {
          success: true,
          summary: result.summary || {},
          hasData: result !== null,
        };
      } catch (err) {
        cycleResults.modules[name] = { success: false, error: err.message };
        cycleResults.errors.push({ module: name, error: err.message });
      }
    }

    try {
      const allOpportunities = this.getOpportunities();
      const scored = await this._modules.get('opportunityScorer').execute({
        requestId: cycleId,
        opportunities: allOpportunities,
      });
      cycleResults.modules.opportunityScorer = {
        success: true,
        totalScored: scored?.scoredOpportunities?.length || 0,
      };
    } catch (err) {
      cycleResults.modules.opportunityScorer = { success: false, error: err.message };
      cycleResults.errors.push({ module: 'opportunityScorer', error: err.message });
    }

    try {
      const insights = await this._modules.get('insightGenerator').execute({
        requestId: cycleId,
        data: cycleResults,
      });
      cycleResults.modules.insightGenerator = {
        success: true,
        totalInsights: insights?.insights?.length || 0,
      };
    } catch (err) {
      cycleResults.modules.insightGenerator = { success: false, error: err.message };
      cycleResults.errors.push({ module: 'insightGenerator', error: err.message });
    }

    cycleResults.completedAt = new Date().toISOString();
    cycleResults.elapsedMs = Date.now() - start;
    cycleResults.hasErrors = cycleResults.errors.length > 0;

    this._lastCycleResults = cycleResults;

    return cycleResults;
  }

  async runModule(name) {
    const module = this._modules.get(name);
    if (!module) {
      throw new Error(`Module "${name}" not found. Available: ${[...this._modules.keys()].join(', ')}`);
    }
    return module.execute({ requestId: `SINGLE-${name}-${Date.now()}` });
  }

  getModule(name) {
    return this._modules.get(name) || null;
  }

  getAllModuleStatus() {
    const statuses = {};
    for (const [name, module] of this._modules) {
      statuses[name] = {
        name: module.name,
        initialized: module.initialized,
        hasResults: module._lastResults !== null,
        storeSize: module._store.size,
      };
    }
    return statuses;
  }

  getOpportunities() {
    const all = [];
    const opportunityModules = [
      'seoOpportunityEngine',
      'contentOpportunityEngine',
      'leadOpportunityEngine',
      'campaignOptimizer',
    ];

    for (const name of opportunityModules) {
      const module = this._modules.get(name);
      if (module) {
        const opportunities = module._getOpportunities();
        all.push(...opportunities.map(o => ({ ...o, sourceModule: name })));
      }
    }

    return all;
  }

  getAlerts() {
    const alertManager = this._modules.get('alertManager');
    if (!alertManager) return [];
    return alertManager.getAlerts();
  }

  getInsights() {
    const insightGen = this._modules.get('insightGenerator');
    if (!insightGen) return [];
    return [...insightGen._insights];
  }

  getLastCycleResults() {
    return this._lastCycleResults;
  }

  async scheduleDefaultJobs() {
    const scheduler = this._modules.get('scheduler');
    if (!scheduler) return { success: false, error: 'Scheduler not initialized' };

    const oneHour = 3600000;
    const sixHours = 21600000;
    const twelveHours = 43200000;
    const twentyFourHours = 86400000;

    scheduler.registerJob('marketAnalysis', {
      interval: sixHours,
      handler: async () => { await this.runModule('marketMonitor'); },
      immediate: true,
    });

    scheduler.registerJob('competitorAnalysis', {
      interval: sixHours,
      handler: async () => { await this.runModule('competitorMonitor'); },
      immediate: true,
    });

    scheduler.registerJob('trendAnalysis', {
      interval: twelveHours,
      handler: async () => { await this.runModule('trendMonitor'); },
      immediate: false,
    });

    scheduler.registerJob('campaignOptimization', {
      interval: oneHour,
      handler: async () => { await this.runModule('campaignOptimizer'); },
      immediate: true,
    });

    scheduler.registerJob('seoOpportunityScan', {
      interval: twentyFourHours,
      handler: async () => { await this.runModule('seoOpportunityEngine'); },
      immediate: false,
    });

    scheduler.registerJob('contentOpportunityScan', {
      interval: twentyFourHours,
      handler: async () => { await this.runModule('contentOpportunityEngine'); },
      immediate: false,
    });

    scheduler.registerJob('leadOpportunityScan', {
      interval: twelveHours,
      handler: async () => { await this.runModule('leadOpportunityEngine'); },
      immediate: false,
    });

    scheduler.registerJob('fullAnalysisCycle', {
      interval: twentyFourHours,
      handler: async () => { await this.runFullCycle(); },
      immediate: false,
    });

    scheduler.registerJob('strategicDecisionAnalysis', {
      interval: twelveHours,
      handler: async () => { await this.runModule('decisionModule'); },
      immediate: true,
    });

    return scheduler.startAll();
  }

  async health() {
    const moduleHealth = {};
    for (const [name, module] of this._modules) {
      moduleHealth[name] = await module.health();
    }

    return {
      ...(await super.health()),
      modulesInitialized: this._modules.size,
      moduleStatus: moduleHealth,
      lastCycleTime: this._lastCycleResults?.completedAt || null,
      lastCycleElapsed: this._lastCycleResults?.elapsedMs || null,
      lastCycleErrors: this._lastCycleResults?.errors?.length || 0,
    };
  }

  async shutdown() {
    for (const [name, module] of this._modules) {
      try {
        await module.shutdown();
      } catch (err) {
        console.error(`[AutonomousOrchestrator] Error shutting down ${name}: ${err.message}`);
      }
    }
    this._modules.clear();
    this._lastCycleResults = null;
    return super.shutdown();
  }
}
