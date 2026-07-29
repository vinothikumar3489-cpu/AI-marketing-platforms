import { getBrain } from '../brain/index.js';

export const dispatchAgentTask = async (req, res) => {
  const brain = getBrain();
  if (!brain) {
    return res.status(503).json({ success: false, error: 'Brain not available' });
  }

  try {
    const { type, input, strategy, timeout, maxRetries, agentPreferences, metadata } = req.body;
    if (!type) {
      return res.status(400).json({ success: false, error: 'Task type is required' });
    }

    const manager = brain.agentManager;
    if (!manager) {
      return res.status(503).json({ success: false, error: 'AgentManager not available' });
    }

    const result = await manager.processTask({
      type,
      input: input || {},
      metadata: { ...metadata, strategy },
      timeout: timeout || 60000,
      maxRetries: maxRetries || 3,
      agentPreferences: agentPreferences || [],
    });

    const statusCode = result.success ? 200 : 500;
    return res.status(statusCode).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getAgentStatus = async (req, res) => {
  const brain = getBrain();
  if (!brain) {
    return res.status(503).json({ success: false, error: 'Brain not available' });
  }

  try {
    const manager = brain.agentManager;
    if (!manager) {
      return res.status(503).json({ success: false, error: 'AgentManager not available' });
    }

    const status = await manager.getStatus();
    const health = await manager.health();
    return res.json({ success: true, status, health });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getLearningDashboard = async (req, res) => {
  const brain = getBrain();
  if (!brain) {
    return res.status(503).json({ success: false, error: 'Brain not available' });
  }

  try {
    const learningEngine = brain.getEngine('learning');
    const healthService = brain.getEngine('learningHealth');
    const trendAnalyzer = brain.getEngine('trendAnalyzer');
    const ruleOptimizer = brain.getEngine('ruleOptimizer');

    const dashboard = {
      health: healthService ? await healthService.getHealthSummary() : null,
      score: healthService ? await healthService.generateLearningScore() : null,
      trends: trendAnalyzer ? await trendAnalyzer.allTrends() : null,
      rulePerformance: ruleOptimizer ? await ruleOptimizer.getPerformanceReport() : null,
      learningEngine: learningEngine ? await learningEngine.health() : null,
    };

    return res.json({ success: true, dashboard });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
