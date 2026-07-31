import { getBrain } from '../brain/index.js';

export const evaluateDecision = async (req, res) => {
  const brain = getBrain();
  if (!brain) {
    return res.status(503).json({ success: false, error: 'Processing service unavailable' });
  }

  try {
    const engine = brain.decisionEngine;
    if (!engine) {
      return res.status(503).json({ success: false, error: 'Decision engine not available' });
    }

    const result = await engine.evaluate({
      goal: req.body.goal,
      constraints: req.body.constraints || [],
      budget: req.body.budget || null,
      timeframe: req.body.timeframe || '',
      estimatedRevenue: req.body.estimatedRevenue || null,
      conversionRate: req.body.conversionRate || null,
      averageDealSize: req.body.averageDealSize || null,
      companyName: req.body.companyName || '',
      industry: req.body.industry || '',
      productName: req.body.productName || '',
      scenarios: req.body.scenarios || null,
      userId: req.user?.id || '',
      chatId: req.body.chatId || '',
    });

    const statusCode = result.success ? 200 : 500;
    return res.status(statusCode).json({
      success: result.success,
      data: result.data || null,
      error: result.error || null,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const simulateDecision = async (req, res) => {
  const brain = getBrain();
  if (!brain) {
    return res.status(503).json({ success: false, error: 'Processing service unavailable' });
  }

  try {
    const engine = brain.decisionEngine;
    if (!engine) {
      return res.status(503).json({ success: false, error: 'Decision engine not available' });
    }

    const result = await engine.simulate({
      goal: req.body.goal || '',
      label: req.body.label || 'Custom Scenario',
      description: req.body.description || '',
      action: req.body.action || '',
      parameters: req.body.parameters || {},
      budget: req.body.budget || null,
      timeframe: req.body.timeframe || '',
      businessContext: req.body.businessContext || {},
    });

    return res.status(result.success ? 200 : 500).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const compareDecisions = async (req, res) => {
  const brain = getBrain();
  if (!brain) {
    return res.status(503).json({ success: false, error: 'Processing service unavailable' });
  }

  try {
    const engine = brain.decisionEngine;
    if (!engine) {
      return res.status(503).json({ success: false, error: 'Decision engine not available' });
    }

    const { scenarios, context } = req.body;
    if (!scenarios || !Array.isArray(scenarios) || scenarios.length < 2) {
      return res.status(400).json({ success: false, error: 'At least 2 scenarios required' });
    }

    const result = await engine.compare(scenarios, context);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getDecisionHistory = async (req, res) => {
  const brain = getBrain();
  if (!brain) {
    return res.status(503).json({ success: false, error: 'Processing service unavailable' });
  }

  try {
    const engine = brain.decisionEngine;
    if (!engine) {
      return res.status(503).json({ success: false, error: 'Decision engine not available' });
    }

    const filters = {
      userId: req.user?.id,
      limit: parseInt(req.query.limit) || 50,
      companyName: req.query.company || '',
    };

    const result = await engine.queryHistory(filters);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getDecisionById = async (req, res) => {
  const brain = getBrain();
  if (!brain) {
    return res.status(503).json({ success: false, error: 'Processing service unavailable' });
  }

  try {
    const engine = brain.decisionEngine;
    if (!engine) {
      return res.status(503).json({ success: false, error: 'Decision engine not available' });
    }

    const result = await engine.getDecisionById(req.params.id);
    const statusCode = result.success ? 200 : 404;
    return res.status(statusCode).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const recordDecisionOutcome = async (req, res) => {
  const brain = getBrain();
  if (!brain) {
    return res.status(503).json({ success: false, error: 'Processing service unavailable' });
  }

  try {
    const engine = brain.decisionEngine;
    if (!engine) {
      return res.status(503).json({ success: false, error: 'Decision engine not available' });
    }

    const result = await engine.recordOutcome(req.params.id, {
      result: req.body.result || '',
      metrics: req.body.metrics || {},
      actualRoi: req.body.actualRoi || null,
      actualRevenue: req.body.actualRevenue || null,
      actualLeadGrowth: req.body.actualLeadGrowth || null,
      success: req.body.success,
      lessonsLearned: req.body.lessonsLearned || [],
    });

    return res.status(result.success ? 200 : 500).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

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

    const hasData = !!(result.findings?.length || result.recommendations?.length || result.summary || result.confidence);
    const statusCode = result.success ? 200 : hasData ? 200 : 500;
    return res.status(statusCode).json({
      success: result.success,
      status: result.status || (result.success ? 'completed' : 'failed'),
      output: result.output || result.result || result.summary || null,
      findings: result.findings || [],
      recommendations: result.recommendations || [],
      confidence: result.confidence ?? null,
      evidenceUsed: result.evidenceUsed || [],
      knowledgeUpdated: result.knowledgeUpdated || [],
      learningUpdated: result.learningUpdated || [],
      errors: result.errors || [],
      error: result.error || null,
      agentsUsed: result.agentsUsed || [],
      taskId: result.taskId || null,
      processingTime: result.processingTime || null,
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
