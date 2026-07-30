import { getBrain } from '../brain/index.js';

export const dispatchAgentTask = async (req, res) => {
  const brain = getBrain();
  if (!brain) {
    return res.status(503).json({ success: false, error: 'Processing service unavailable' });
  }

  try {
    const { type, input, strategy, timeout, maxRetries, agentPreferences, metadata } = req.body;
    if (!type) {
      return res.status(400).json({ success: false, error: 'Task type is required' });
    }

    const manager = brain.agentManager;
    if (!manager) {
      return res.status(503).json({ success: false, error: 'Processing service unavailable' });
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
    return res.status(statusCode).json({
      success: result.success,
      output: result.output || result.result || null,
      error: result.error || null,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getAgentStatus = async (req, res) => {
  const brain = getBrain();
  if (!brain) {
    return res.status(503).json({ success: false, error: 'Processing service unavailable' });
  }

  try {
    const manager = brain.agentManager;
    if (!manager) {
      return res.status(503).json({ success: false, error: 'Processing service unavailable' });
    }

    const status = await manager.getStatus();
    return res.json({
      success: true,
      agents: status.registeredAgents || 0,
      active: status.activeTasks || 0,
      completed: status.completedTasks || 0,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getLearningDashboard = async (req, res) => {
  const brain = getBrain();
  if (!brain) {
    return res.status(503).json({ success: false, error: 'Processing service unavailable' });
  }

  try {
    const healthService = brain.getEngine('learningHealth');
    const score = healthService ? await healthService.generateLearningScore() : null;

    return res.json({
      success: true,
      score: score?.brainIQ || 0,
      coverage: score?.knowledgeCompleteness || 0,
      accuracy: score?.recommendationUsefulness || 0,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
