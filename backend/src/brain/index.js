import { DIContainer } from './di.js';
import { BrainOrchestrator } from './orchestrator/BrainOrchestrator.js';
import { BrainHealth } from './health/BrainHealth.js';
import { BrainScheduler } from './scheduler/BrainScheduler.js';
import { BrainService } from './services/BrainService.js';
import { MemoryEngine } from './memory/MemoryEngine.js';
import { KnowledgeEngine } from './knowledge/KnowledgeEngine.js';
import { EvidenceEngine } from './evidence/EvidenceEngine.js';
import { ReasoningEngine } from './reasoning/ReasoningEngine.js';
import { RecommendationEngine } from './recommendations/RecommendationEngine.js';
import { ConfidenceEngine } from './confidence/ConfidenceEngine.js';
import { LearningEngine } from './learning/LearningEngine.js';
import { QualityEngine } from './quality/QualityEngine.js';
import { ContentStudioAdapter } from './adapters/ContentStudioAdapter.js';
import { SeoAdapter } from './adapters/SeoAdapter.js';
import { CampaignAdapter } from './adapters/CampaignAdapter.js';
import { CrmAdapter } from './adapters/CrmAdapter.js';
import { EmailAdapter } from './adapters/EmailAdapter.js';
import { CompanyAdapter } from './adapters/CompanyAdapter.js';
import { GeoAdapter } from './adapters/GeoAdapter.js';
import { AudienceAdapter } from './adapters/AudienceAdapter.js';
import { AnalyticsAdapter } from './adapters/AnalyticsAdapter.js';
import { ResearchAdapter } from './adapters/ResearchAdapter.js';
import { WorkflowAdapter } from './adapters/WorkflowAdapter.js';
import { AdapterEngine } from './adapters/AdapterEngine.js';

// Decision Intelligence Engine
import { DecisionEngine } from './decision/DecisionEngine.js';
import { DecisionMemory } from './decision/DecisionMemory.js';
import { DecisionHealth } from './decision/DecisionHealth.js';

// Agent system
import { AgentManager } from './agents/AgentManager.js';
import { AgentRegistry } from './agents/AgentRegistry.js';
import { SeoAgent } from './agents/agents/SeoAgent.js';
import { CompetitorAgent } from './agents/agents/CompetitorAgent.js';
import { ContentAgent } from './agents/agents/ContentAgent.js';
import { AudienceAgent } from './agents/agents/AudienceAgent.js';
import { CampaignAgent } from './agents/agents/CampaignAgent.js';
import { GeoAgent } from './agents/agents/GeoAgent.js';
import { CrmAgent } from './agents/agents/CrmAgent.js';
import { AnalyticsAgent } from './agents/agents/AnalyticsAgent.js';
import { ResearchAgent } from './agents/agents/ResearchAgent.js';
import { EmailAgent } from './agents/agents/EmailAgent.js';
import { ExecutiveStrategyAgent } from './agents/agents/ExecutiveStrategyAgent.js';
import { DecisionAgent } from './agents/agents/DecisionAgent.js';

// Graph module
import { EntityStore } from './graph/EntityStore.js';
import { RelationshipStore } from './graph/RelationshipStore.js';
import { EntityResolver } from './graph/EntityResolver.js';
import { RelationshipResolver } from './graph/RelationshipResolver.js';
import { GraphTraversal } from './graph/GraphTraversal.js';
import { GraphSearch } from './graph/GraphSearch.js';
import { GraphHealth } from './graph/GraphHealth.js';
import { EntityGraphService } from './graph/EntityGraphService.js';
import { GraphEngine } from './graph/GraphEngine.js';

// Learning module
import { LearningStore } from './learning/LearningStore.js';
import { ExecutionHistory } from './learning/ExecutionHistory.js';
import { FeedbackEngine } from './learning/FeedbackEngine.js';
import { PatternDiscovery } from './learning/PatternDiscovery.js';
import { TrendAnalyzer } from './learning/TrendAnalyzer.js';
import { KnowledgeEvolution } from './learning/KnowledgeEvolution.js';
import { RuleOptimizer } from './learning/RuleOptimizer.js';
import { LearningHealth } from './learning/LearningHealth.js';

let _brainService = null;

export function createBrain(prisma) {
  const di = new DIContainer();

  if (prisma) di.register('prisma', prisma);

  di.register('memory', MemoryEngine);
  di.register('knowledge', KnowledgeEngine);
  di.register('evidence', EvidenceEngine);
  di.register('adapter', AdapterEngine);
  // graph: resolved manually by _resolveGraphDependencies
  di.register('reasoning', ReasoningEngine);
  di.register('recommendations', RecommendationEngine);
  di.register('confidence', ConfidenceEngine);
  di.register('learning', LearningEngine);
  di.register('quality', QualityEngine);
  di.register('decision', DecisionEngine);
  di.register('decisionMemory', DecisionMemory);
  di.register('decisionHealth', DecisionHealth);
  di.register('scheduler', BrainScheduler);
  di.register('health', BrainHealth);
  di.register('orchestrator', BrainOrchestrator);

  // Adapter registrations (auto-resolved by DI + AdapterEngine)
  di.register('companyIntelligence', CompanyAdapter);
  di.register('geo', GeoAdapter);
  di.register('audience', AudienceAdapter);
  di.register('contentStudio', ContentStudioAdapter);
  di.register('campaign', CampaignAdapter);
  di.register('crm', CrmAdapter);
  di.register('email', EmailAdapter);
  di.register('analytics', AnalyticsAdapter);
  di.register('research', ResearchAdapter);
  di.register('workflow', WorkflowAdapter);
  di.register('seo', SeoAdapter);

  di.register('entityStore', new EntityStore(prisma));
  di.register('relationshipStore', new RelationshipStore(prisma));
  di.register('entityResolver', null);
  di.register('relationshipResolver', null);
  di.register('graphTraversal', null);
  di.register('graphSearch', null);
  di.register('graphHealth', null);
  di.register('entityGraphService', null);
  di.register('graph', null);

  const service = new BrainService(di);
  _brainService = service;

  return service;
}

export function getBrain() {
  return _brainService;
}

function _resolveGraphDependencies(di) {
  const entityStore = di.resolve('entityStore');
  const relStore = di.resolve('relationshipStore');

  if (!entityStore) return;

  const entityResolver = new EntityResolver(entityStore);
  di._instances.set('entityResolver', entityResolver);

  const relResolver = new RelationshipResolver(entityStore, relStore, entityResolver);
  di._instances.set('relationshipResolver', relResolver);

  const graphTraversal = new GraphTraversal(entityStore, relStore, relResolver);
  di._instances.set('graphTraversal', graphTraversal);

  const graphSearch = new GraphSearch(entityStore, relStore);
  di._instances.set('graphSearch', graphSearch);

  const graphHealth = new GraphHealth(entityStore, relStore, entityResolver);
  di._instances.set('graphHealth', graphHealth);

  const entityGraphService = new EntityGraphService(di);
  di._instances.set('entityGraphService', entityGraphService);

  const graphEngine = new GraphEngine();
  graphEngine.setGraphService(entityGraphService);
  di._instances.set('graph', graphEngine);
}

function _resolveLearningDependencies(di) {
  const prisma = di.resolve('prisma');
  if (!prisma) return;

  const store = new LearningStore(prisma);
  di._instances.set('learningStore', store);

  const history = new ExecutionHistory(store);
  di._instances.set('executionHistory', history);

  const optimizer = new RuleOptimizer(store);
  di._instances.set('ruleOptimizer', optimizer);

  const evolution = new KnowledgeEvolution(store, history);
  di._instances.set('knowledgeEvolution', evolution);

  const feedback = new FeedbackEngine(store, history, optimizer, evolution);
  di._instances.set('feedbackEngine', feedback);

  const patterns = new PatternDiscovery(store, history);
  di._instances.set('patternDiscovery', patterns);

  const trends = new TrendAnalyzer(store);
  di._instances.set('trendAnalyzer', trends);

  const health = new LearningHealth(store, trends, optimizer, evolution);
  di._instances.set('learningHealth', health);

  const engine = di.resolve('learning');
  if (engine) {
    engine.setDependencies({ store, history, feedback, patterns, trends, evolution, optimizer, health });
  }
}

function _resolveDecisionDependencies(di) {
  const decisionEngine = di.resolve('decision');
  const decisionMemory = di.resolve('decisionMemory');
  const decisionHealth = di.resolve('decisionHealth');

  if (decisionEngine) {
    const prisma = di.resolve('prisma');
    if (prisma && decisionMemory && typeof decisionMemory.setPrisma === 'function') {
      decisionMemory.setPrisma(prisma);
    }
    decisionEngine.setDependencies({ decisionMemory, decisionHealth });
  }
}

function _initializeAgentSystem(di, service) {
  const registry = new AgentRegistry();

  const decisionAgent = new DecisionAgent();
  const decisionEngine = di.resolve('decision');
  if (decisionEngine) {
    decisionAgent.setEngine(decisionEngine);
  }

  const agents = [
    new SeoAgent(),
    new CompetitorAgent(),
    new ContentAgent(),
    new AudienceAgent(),
    new CampaignAgent(),
    new GeoAgent(),
    new CrmAgent(),
    new AnalyticsAgent(),
    new ResearchAgent(),
    new EmailAgent(),
    new ExecutiveStrategyAgent(),
    decisionAgent,
  ];

  for (const agent of agents) {
    registry.register(agent);
  }

  const manager = new AgentManager(service, registry);
  di._instances.set('agentManager', manager);

  console.log(`[Brain]  ✓ Agent system initialized: ${agents.length} agents registered`);
  return manager;
}

export async function initializeBrain(prisma) {
  const service = createBrain(prisma);
  const di = service._di;

  _resolveGraphDependencies(di);
  _resolveLearningDependencies(di);
  _resolveDecisionDependencies(di);

  const engineNames = [
    'memory', 'knowledge', 'evidence', 'adapter', 'graph', 'reasoning',
    'recommendations', 'confidence', 'learning', 'quality',
    'decision', 'decisionMemory', 'decisionHealth',
    'scheduler', 'health',
  ];

  console.log('[Brain] ===============================');
  console.log('[Brain] Initializing Intelligence Core');
  console.log('[Brain] ===============================');

  for (const name of engineNames) {
    const engine = di.resolve(name);
    if (engine) {
      if (prisma && typeof engine.setPrisma === 'function') {
        engine.setPrisma(prisma);
      }
      try {
        await engine.initialize({ requestId: 'BOOT' });
        console.log(`[Brain]  ✓ ${name} initialized`);
      } catch (err) {
        console.error(`[Brain]  ✗ ${name} failed to initialize: ${err.message}`);
      }
    } else {
      console.warn(`[Brain]  - ${name} not registered`);
    }
  }

  const allAdapterNames = [
    'companyIntelligence', 'geo', 'audience', 'contentStudio',
    'campaign', 'crm', 'email', 'analytics', 'research', 'workflow', 'seo',
  ];
  for (const name of allAdapterNames) {
    const adapter = di.resolve(name);
    if (adapter) {
      if (prisma && typeof adapter.setPrisma === 'function') {
        adapter.setPrisma(prisma);
      }
      try {
        await adapter.initialize({ requestId: 'BOOT' });
        console.log(`[Brain]  ✓ ${name} adapter initialized`);
      } catch (err) {
        console.error(`[Brain]  ✗ ${name} adapter failed: ${err.message}`);
      }
    }
  }

  try {
    const { collectCompanyIntelligence } = await import('../services/intelligence/company-intelligence.service.js');
    const { injectCompanyIntelligence } = await import('./evidence/EvidenceEngine.js');
    injectCompanyIntelligence(collectCompanyIntelligence);
    console.log('[Brain]  ✓ companyIntelligence service injected into EvidenceEngine');
  } catch (err) {
    console.warn('[Brain]  - companyIntelligence injection skipped:', err.message);
  }

  const healthReport = await di.resolve('health').generateReport();
  console.log('[Brain]  ✓ Health report generated — overall:', healthReport.overall);

  _initializeAgentSystem(di, service);

  console.log('[Brain] ===============================');
  console.log('[Brain] Brain Core ready');
  console.log('[Brain] ===============================');

  return service;
}

export { DIContainer, BrainOrchestrator, BrainHealth, BrainScheduler, BrainService };
export { BrainRequest, BrainContext, BrainResponse } from './interfaces.js';
export { BaseEngine } from './engine.js';
export { generateBrainId, elapsedMs, EngineStatus, HealthStatus, logEngine } from './core.js';

// Decision Intelligence exports
export { DecisionEngine } from './decision/DecisionEngine.js';
export { DecisionContext } from './decision/DecisionContext.js';
export { DecisionScenario } from './decision/DecisionScenario.js';
export { DecisionComparator } from './decision/DecisionComparator.js';
export { DecisionSimulator } from './decision/DecisionSimulator.js';
export { TradeoffAnalyzer } from './decision/TradeoffAnalyzer.js';
export { RiskAnalyzer } from './decision/RiskAnalyzer.js';
export { ImpactAnalyzer } from './decision/ImpactAnalyzer.js';
export { ConstraintEngine } from './decision/ConstraintEngine.js';
export { DecisionExplainer } from './decision/DecisionExplainer.js';
export { DecisionMemory } from './decision/DecisionMemory.js';
export { DecisionHealth } from './decision/DecisionHealth.js';

// Graph exports
export { EntityStore } from './graph/EntityStore.js';
export { RelationshipStore } from './graph/RelationshipStore.js';
export { EntityResolver } from './graph/EntityResolver.js';
export { RelationshipResolver } from './graph/RelationshipResolver.js';
export { GraphTraversal } from './graph/GraphTraversal.js';
export { GraphSearch } from './graph/GraphSearch.js';
export { GraphHealth } from './graph/GraphHealth.js';
export { EntityGraphService } from './graph/EntityGraphService.js';
export { GraphEngine } from './graph/GraphEngine.js';

// Agent exports
export { AgentManager } from './agents/AgentManager.js';
export { AgentRegistry } from './agents/AgentRegistry.js';
export { BaseAgent } from './agents/BaseAgent.js';
export { AgentTask } from './agents/AgentTask.js';
export { AgentContext } from './agents/AgentContext.js';
export { AgentResult } from './agents/AgentResult.js';
