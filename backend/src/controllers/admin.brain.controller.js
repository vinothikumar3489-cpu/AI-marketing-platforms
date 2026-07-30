import { getBrain } from '../brain/index.js';

export const getDashboard = async (req, res) => {
  const brain = getBrain();
  if (!brain) return res.status(503).json({ success: false, error: 'Brain not available' });

  try {
    const healthReport = await brain.healthCheck();
    const agentManager = brain.agentManager;
    const agentStatus = agentManager ? await agentManager.getStatus() : null;
    const learningEngine = brain.getEngine('learning');
    const learningHealth = brain.getEngine('learningHealth');
    const graphEngine = brain.getEngine('graph');
    const graphService = graphEngine?._graphService;
    const entityStore = graphService?.getEntityStore ? graphService.getEntityStore() : null;
    const relStore = graphService?.getRelationshipStore ? graphService.getRelationshipStore() : null;

    const entityCount = entityStore ? await entityStore.count() : 0;
    const relCount = relStore ? await relStore.count() : 0;
    const learningScore = learningHealth ? await learningHealth.getHealthSummary() : null;
    const executionCount = learningEngine?._store ? await learningEngine._store.countExecutions() : 0;

    const dashboard = {
      status: healthReport?.overall === 'HEALTHY' ? 'online' : 'degraded',
      version: '1.0.0',
      brainIQ: learningScore?.brainIQ || 0,
      learningScore: learningScore?.brainIQ || 0,
      knowledgeCoverage: learningScore?.knowledgeCompleteness || 0,
      entityCount,
      relationshipCount: relCount,
      recommendationAccuracy: learningScore?.recommendationUsefulness || 0,
      averageConfidence: healthReport?.averageConfidence || 0,
      executionCount,
      averageProcessingTime: healthReport?.averageProcessingTime || 0,
      activeAgents: agentStatus?.registeredAgents || 0,
      overallHealth: healthReport?.overall || 'UNKNOWN',
    };

    return res.json({ success: true, dashboard });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getHealth = async (req, res) => {
  const brain = getBrain();
  if (!brain) return res.status(503).json({ success: false, error: 'Brain not available' });

  try {
    const healthReport = await brain.healthCheck();
    const engines = healthReport?.engines || {};
    const engineNames = ['memory', 'knowledge', 'evidence', 'adapter', 'graph', 'reasoning', 'recommendations', 'confidence', 'learning', 'quality', 'scheduler'];
    const engineStatuses = {};
    for (const name of engineNames) {
      const engine = brain.getEngine(name);
      engineStatuses[name] = engine ? await engine.health() : { name, status: 'NOT_FOUND' };
    }

    return res.json({
      success: true,
      health: {
        engines: engineStatuses,
        database: 'connected',
        redis: process.env.REDIS_URL ? 'connected' : 'disabled',
        llmProviders: 'available',
        overall: healthReport?.overall || 'UNKNOWN',
        lastChecked: new Date().toISOString(),
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getLearning = async (req, res) => {
  const brain = getBrain();
  if (!brain) return res.status(503).json({ success: false, error: 'Brain not available' });

  try {
    const learningHealth = brain.getEngine('learningHealth');
    const trendAnalyzer = brain.getEngine('trendAnalyzer');
    const ruleOptimizer = brain.getEngine('ruleOptimizer');
    const learningEngine = brain.getEngine('learning');

    const score = learningHealth ? await learningHealth.generateLearningScore() : null;
    const summary = learningHealth ? await learningHealth.getHealthSummary() : null;
    const trends = trendAnalyzer ? await trendAnalyzer.allTrends() : null;
    const rulePerformance = ruleOptimizer ? await ruleOptimizer.getPerformanceReport() : null;

    return res.json({
      success: true,
      learning: {
        score,
        summary,
        trends,
        rulePerformance,
        engine: learningEngine ? await learningEngine.health() : null,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getGraph = async (req, res) => {
  const brain = getBrain();
  if (!brain) return res.status(503).json({ success: false, error: 'Brain not available' });

  try {
    const graphEngine = brain.getEngine('graph');
    const graphService = graphEngine?._graphService;
    const entityStore = graphService?.getEntityStore ? graphService.getEntityStore() : null;
    const relStore = graphService?.getRelationshipStore ? graphService.getRelationshipStore() : null;
    const healthService = graphService?.getGraphHealth ? graphService.getGraphHealth() : null;

    const health = healthService ? await healthService.report() : null;
    const entityCount = entityStore ? await entityStore.count() : 0;
    const relCount = relStore ? await relStore.count() : 0;
    const entityTypes = entityStore ? await entityStore.groupByType() : {};
    const relTypes = relStore ? await relStore.groupByType() : {};

    const newestEntities = entityStore
      ? await entityStore._prisma.graphEntity.findMany({ orderBy: { createdAt: 'desc' }, take: 10 })
      : [];

    return res.json({
      success: true,
      graph: {
        entityCount,
        relationshipCount: relCount,
        duplicateRate: health?.summary?.duplicateRate || 0,
        averageConfidence: health?.summary?.avgConfidence || 0,
        entityTypes,
        relationshipTypes: relTypes,
        newestEntities,
        health: health?.summary || {},
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getAgents = async (req, res) => {
  const brain = getBrain();
  if (!brain) return res.status(503).json({ success: false, error: 'Brain not available' });

  try {
    const manager = brain.agentManager;
    if (!manager) return res.status(503).json({ success: false, error: 'AgentManager not available' });

    const status = await manager.getStatus();
    const health = await manager.health();
    const allAgents = manager.registry.getAllAgents();

    const agents = allAgents.map(agent => ({
      name: agent.name,
      status: agent._healthy !== false ? 'HEALTHY' : 'DEGRADED',
      capabilities: agent.capabilities || [],
      dependencies: agent.dependencies || [],
      metrics: agent._metrics || { invocations: 0, avgTime: 0, failures: 0 },
      lastExecution: agent._lastExecution || null,
    }));

    return res.json({ success: true, agents, status, health });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getMemory = async (req, res) => {
  const brain = getBrain();
  if (!brain) return res.status(503).json({ success: false, error: 'Brain not available' });

  try {
    const memoryEngine = brain.getEngine('memory');
    const health = memoryEngine ? await memoryEngine.health() : null;

    return res.json({
      success: true,
      memory: {
        engine: health,
        sections: ['workspace', 'company', 'product', 'campaign', 'conversation'],
        timestamp: new Date().toISOString(),
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getRecommendations = async (req, res) => {
  const brain = getBrain();
  if (!brain) return res.status(503).json({ success: false, error: 'Brain not available' });

  try {
    const recEngine = brain.getEngine('recommendations');

    return res.json({
      success: true,
      recommendations: {
        engine: recEngine ? await recEngine.health() : null,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getPerformance = async (req, res) => {
  const brain = getBrain();
  if (!brain) return res.status(503).json({ success: false, error: 'Brain not available' });

  try {
    const healthReport = await brain.healthCheck();
    const executionMetrics = healthReport?.executionMetrics || {};
    const adoptionReport = healthReport?.adoptionReport ? await healthReport.adoptionReport() : null;

    return res.json({
      success: true,
      performance: {
        averageExecutionTime: healthReport?.averageProcessingTime || 0,
        engineMetrics: executionMetrics,
        adoption: adoptionReport,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getDiagnostics = async (req, res) => {
  const brain = getBrain();
  if (!brain) return res.status(503).json({ success: false, error: 'Brain not available' });

  try {
    const healthReport = await brain.healthCheck();
    const engineTimings = {};
    const engineNames = ['memory', 'knowledge', 'evidence', 'adapter', 'graph', 'reasoning', 'recommendations', 'confidence', 'learning', 'quality'];
    for (const name of engineNames) {
      const engine = brain.getEngine(name);
      if (engine) {
        try {
          const h = await engine.health();
          engineTimings[name] = { status: h.status, latency: h.latency || h.processingTime || null };
        } catch {
          engineTimings[name] = { status: 'ERROR', latency: null };
        }
      }
    }

    const errors = healthReport?.errors || [];
    const warnings = healthReport?.warnings || [];

    return res.json({
      success: true,
      diagnostics: {
        pipeline: healthReport?.pipeline || 'idle',
        currentRequest: healthReport?.currentRequest || null,
        engineTimings,
        errors: errors.slice(0, 20),
        warnings: warnings.slice(0, 20),
        databaseLatency: healthReport?.databaseLatency || null,
        memoryUsage: process.memoryUsage ? {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        } : null,
        graphLatency: engineTimings.graph?.latency || null,
        learningLatency: engineTimings.learning?.latency || null,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getDecisionDashboard = async (req, res) => {
  const brain = getBrain();
  if (!brain) return res.status(503).json({ success: false, error: 'Brain not available' });

  try {
    const engine = brain.decisionEngine;
    const memory = brain.decisionMemory;
    const health = engine?.healthService;

    const engineHealth = engine ? await engine.health() : null;
    const memoryHealth = memory ? await memory.health() : null;
    const healthReport = health ? await health.generateReport({ decisionEngine: engine, decisionMemory: memory }) : null;
    const learningSummary = memory ? await memory.getLearningSummary() : null;
    const recentDecisions = memory ? await memory.getDecisions({ limit: 20 }) : [];

    return res.json({
      success: true,
      dashboard: {
        engine: engineHealth,
        memory: memoryHealth,
        health: healthReport,
        learning: learningSummary,
        recentDecisions: recentDecisions.map(d => ({
          id: d.id,
          goal: d.goal,
          selectedStrategy: d.selectedScenario?.label || 'N/A',
          confidence: d.selectedScenario?.confidence || 0,
          expectedRoi: d.selectedScenario?.expectedRoi || 0,
          riskLevel: d.selectedScenario?.risks?.riskLevel || 'unknown',
          status: d.status,
          outcomeRecorded: !!d.outcomeRecordedAt,
          success: d.success,
          createdAt: d.createdAt,
        })),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getDecisionQueue = async (req, res) => {
  const brain = getBrain();
  if (!brain) return res.status(503).json({ success: false, error: 'Brain not available' });

  try {
    const memory = brain.decisionMemory;
    const pending = memory
      ? (await memory.getDecisions({ status: 'active' })).filter(d => !d.outcomeRecordedAt)
      : [];

    return res.json({
      success: true,
      decisions: pending.map(d => ({
        id: d.id,
        goal: d.goal,
        selectedStrategy: d.selectedScenario?.label || 'N/A',
        confidence: d.selectedScenario?.confidence || 0,
        createdAt: d.createdAt,
      })),
      count: pending.length,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getDecisionHealth = async (req, res) => {
  const brain = getBrain();
  if (!brain) return res.status(503).json({ success: false, error: 'Brain not available' });

  try {
    const health = brain.getEngine('decisionHealth');
    const report = health ? await health.generateReport({
      decisionEngine: brain.decisionEngine,
      decisionMemory: brain.decisionMemory,
    }) : null;

    return res.json({ success: true, health: report });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getDecisionLearning = async (req, res) => {
  const brain = getBrain();
  if (!brain) return res.status(503).json({ success: false, error: 'Brain not available' });

  try {
    const memory = brain.decisionMemory;
    const learningSummary = memory ? await memory.getLearningSummary() : null;
    const similarDecisions = memory ? await memory.getSimilarDecisions(req.query.goal || '') : [];

    return res.json({
      success: true,
      learning: learningSummary,
      similarDecisions,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getExecutions = async (req, res) => {
  const brain = getBrain();
  if (!brain) return res.status(503).json({ success: false, error: 'Brain not available' });

  try {
    const learningEngine = brain.getEngine('learning');
    const store = learningEngine?._store;
    const executions = store ? await store.getExecutions({ limit: 50, since: new Date(0) }) : [];

    return res.json({
      success: true,
      executions: executions.map(e => ({
        id: e.id,
        module: e.module || 'unknown',
        company: e.companyName || '',
        product: e.productName || '',
        agentsUsed: e.agentsUsed || [],
        processingTime: e.processingTime || 0,
        brainIQ: e.brainIQ || 0,
        confidence: e.confidenceAfter || 0,
        status: e.status || 'completed',
        timestamp: e.createdAt,
      }))
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
