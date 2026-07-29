import { AgentTask } from './AgentTask.js';
import { AgentContext } from './AgentContext.js';
import { AgentResult } from './AgentResult.js';
import { AgentRegistry } from './AgentRegistry.js';

const DEFAULT_TIMEOUT = 60000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

export class AgentManager {
  constructor(brainService, registry) {
    this._brain = brainService;
    this._registry = registry || new AgentRegistry();
    this._activeTasks = new Map();
    this._completedTasks = new Map();
    this._taskHistory = [];
  }

  get brain() { return this._brain; }
  get registry() { return this._registry; }

  async processTask(taskData) {
    const task = taskData instanceof AgentTask ? taskData : new AgentTask(taskData);
    const startTime = Date.now();
    task.markRunning();

    try {
      const context = await this._buildContext(task);
      const agents = this._selectAgents(task);

      if (agents.length === 0) {
        task.markFailed('No agents available for task type: ' + task.type);
        return { success: false, error: task.error, taskId: task.taskId };
      }

      const strategy = this._determineStrategy(task, agents);
      const results = await this._executeAgents(agents, task, context, strategy);

      const merged = this._mergeResults(results);
      const deduplicated = this._deduplicateFindings(merged);

      await this._updateBrain(context, deduplicated);

      const finalResult = {
        taskId: task.taskId,
        taskType: task.type,
        success: deduplicated.success,
        status: deduplicated.success ? 'completed' : 'partial_failure',
        confidence: deduplicated.confidence,
        processingTime: Date.now() - startTime,
        agentsUsed: agents.map(a => a.name),
        findings: deduplicated.findings,
        recommendations: deduplicated.recommendations,
        reasoningSteps: deduplicated.reasoningSteps,
        evidenceUsed: deduplicated.evidenceUsed,
        knowledgeUpdated: deduplicated.knowledgeUpdated,
        learningUpdated: deduplicated.learningUpdated,
        errors: deduplicated.errors,
        summary: deduplicated.summary || `${agents.length} agent(s) completed task ${task.type}`,
      };

      task.markComplete(finalResult);
      this._completedTasks.set(task.taskId, task);
      this._taskHistory.push({ taskId: task.taskId, type: task.type, status: 'completed', time: Date.now() - startTime });

      return finalResult;
    } catch (err) {
      task.markFailed(err.message);
      this._taskHistory.push({ taskId: task.taskId, type: task.type, status: 'failed', error: err.message });
      return { success: false, error: err.message, taskId: task.taskId };
    } finally {
      this._activeTasks.delete(task.taskId);
    }
  }

  async requestAgent(agentName, subTaskData, context) {
    const agent = this._registry.getAgent(agentName);
    if (!agent) {
      return { success: false, error: `Agent ${agentName} not found` };
    }

    const subTask = new AgentTask({
      type: subTaskData.type || 'sub_task',
      input: subTaskData.input || subTaskData,
      context,
      priority: 'high',
      maxRetries: 1,
      timeout: 30000,
      metadata: { parentTask: context?.taskId, requestedBy: agentName },
    });

    return this._executeSingleAgent(agent, subTask, context);
  }

  async getStatus() {
    return {
      activeTasks: this._activeTasks.size,
      completedTasks: this._completedTasks.size,
      totalHistory: this._taskHistory.length,
      registeredAgents: this._registry.getCount(),
      agentNames: this._registry.getAgentNames(),
      recentHistory: this._taskHistory.slice(-20),
    };
  }

  async health() {
    const registryHealth = await this._registry.health();
    return {
      name: 'AgentManager',
      status: registryHealth.allHealthy ? 'HEALTHY' : 'DEGRADED',
      activeTasks: this._activeTasks.size,
      completedTasks: this._completedTasks.size,
      registry: registryHealth,
    };
  }

  async _buildContext(task) {
    const brainContext = task.context || {};

    let brainResponse = null;
    if (this._brain && !brainContext.knowledge) {
      try {
        brainResponse = await this._brain.process({
          module: task.type,
          action: 'agent_context',
          ...task.input,
        });
      } catch {
        // Brain unavailable, use what we have
      }
    }

    const bc = brainResponse?.context || brainContext;

    return new AgentContext({
      requestId: task.taskId,
      brainContext: bc,
      knowledge: bc.knowledge || task.input.knowledge || null,
      memory: bc.memory || task.input.memory || null,
      learning: bc.learning || task.input.learning || null,
      confidence: bc.confidence || task.input.confidence || null,
      evidence: bc.evidence || task.input.evidence || null,
      recommendations: bc.recommendations || task.input.recommendations || null,
      graph: bc.graph || task.input.graph || null,
      module: task.type,
      company: task.input.company || bc.company || null,
      product: task.input.product || bc.product || null,
      campaign: task.input.campaign || bc.campaign || null,
      workspace: task.input.workspace || bc.workspace || '',
      taskId: task.taskId,
    });
  }

  _selectAgents(task) {
    const candidates = this._registry.findAgentsForTask(task.type);

    // Expand to include agents listed as dependencies of selected agents
    const expanded = new Set(candidates.map(a => a.name));
    const allAgents = this._registry.getAllAgents();
    let changed = true;
    while (changed) {
      changed = false;
      for (const agent of allAgents) {
        if (expanded.has(agent.name)) continue;
        if (agent.dependencies?.some(d => expanded.has(d)) || candidates.some(c => c.dependencies?.includes(agent.name))) {
          expanded.add(agent.name);
          candidates.push(agent);
          changed = true;
        }
      }
    }

    if (candidates.length === 0) {
      if (task.agentPreferences.length > 0) {
        return task.agentPreferences
          .map(name => this._registry.getAgent(name))
          .filter(Boolean);
      }
      const executive = allAgents.find(a => a.name === 'ExecutiveStrategyAgent');
      return executive ? [executive] : allAgents.slice(0, 1);
    }

    if (task.agentPreferences.length > 0) {
      const preferred = task.agentPreferences
        .map(name => candidates.find(a => a.name === name))
        .filter(Boolean);
      if (preferred.length > 0) return preferred;
    }

    return candidates;
  }

  _determineStrategy(task, agents) {
    if (task.metadata?.strategy === 'sequential') return 'sequential';
    if (task.metadata?.strategy === 'parallel') return 'parallel';
    if (agents.some(a => a.dependencies && a.dependencies.length > 0)) return 'dependency';
    if (agents.length <= 3) return 'parallel';
    return 'sequential';
  }

  async _executeAgents(agents, task, context, strategy) {
    switch (strategy) {
      case 'sequential':
        return this._executeSequential(agents, task, context);
      case 'dependency':
        return this._executeWithDependencies(agents, task, context);
      case 'parallel':
      default:
        return this._executeParallel(agents, task, context);
    }
  }

  async _executeSequential(agents, task, context) {
    const results = [];
    for (const agent of agents) {
      const result = await this._executeSingleAgent(agent, task, context);
      results.push(result);
      context.setAgentResult(agent.name, result);
    }
    return results;
  }

  async _executeParallel(agents, task, context) {
    const promises = agents.map(agent => this._executeSingleAgent(agent, task, context));
    const results = await Promise.allSettled(promises);
    return results.map((r, i) => {
      if (r.status === 'fulfilled') {
        context.setAgentResult(agents[i].name, r.value);
        return r.value;
      }
      return { agentName: agents[i].name, success: false, errors: [r.reason?.message || 'Unknown error'] };
    });
  }

  async _executeWithDependencies(agents, task, context) {
    const results = [];
    const completed = new Set();
    const agentMap = new Map(agents.map(a => [a.name, a]));
    const remaining = new Set(agents.map(a => a.name));

    let timeout = Date.now() + (task.timeout || DEFAULT_TIMEOUT);

    while (remaining.size > 0 && Date.now() < timeout) {
      let progressed = false;
      for (const name of remaining) {
        const agent = agentMap.get(name);
        if (!agent) continue;

        const deps = agent.dependencies || [];
        const depsMet = deps.every(d => completed.has(d));
        if (!depsMet) continue;

        const result = await this._executeSingleAgent(agent, task, context);
        results.push(result);
        context.setAgentResult(name, result);
        completed.add(name);
        remaining.delete(name);
        progressed = true;
      }
      if (!progressed) {
        for (const name of remaining) {
          results.push({
            agentName: name,
            success: false,
            errors: [`Dependencies not met for ${name}`],
          });
        }
        break;
      }
    }

    return results;
  }

  async _executeSingleAgent(agent, task, context) {
    const maxRetries = task.maxRetries || DEFAULT_MAX_RETRIES;
    const retryDelay = task.retryDelay || DEFAULT_RETRY_DELAY;
    const timeout = task.timeout || DEFAULT_TIMEOUT;

    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      try {
        const executionPromise = this._runAgent(agent, task, context);
        const result = await this._withTimeout(executionPromise, timeout);

        const duration = Date.now() - startTime;
        agent._track(duration, result.success);

        return result;
      } catch (err) {
        lastError = err.message || 'Unknown error';
        if (attempt < maxRetries) {
          await this._sleep(retryDelay * attempt);
        }
      }
    }

    return {
      agentName: agent.name,
      success: false,
      status: 'failed',
      confidence: 0,
      processingTime: 0,
      findings: [],
      recommendations: [],
      errors: [lastError],
      summary: `${agent.name} failed after ${maxRetries} retries: ${lastError}`,
    };
  }

  async _runAgent(agent, task, context) {
    const planResult = await agent.plan(task, context);
    if (!planResult.success) {
      return {
        agentName: agent.name,
        success: false,
        errors: [planResult.error || 'Planning failed'],
        findings: [],
        recommendations: [],
      };
    }

    const executeResult = await agent.execute(task, context);

    const validation = await agent.validate(executeResult);

    const summary = await agent.summarize(executeResult);

    return {
      taskId: task.taskId,
      agentName: agent.name,
      success: executeResult.success !== false,
      status: validation.valid ? 'completed' : 'completed_with_issues',
      confidence: executeResult.confidence || validation.confidence || 0.5,
      processingTime: executeResult.processingTime || 0,
      reasoningSteps: executeResult.reasoningSteps || planResult.reasoningSteps || [],
      evidenceUsed: executeResult.evidenceUsed || [],
      knowledgeUpdated: executeResult.knowledgeUpdated || [],
      learningUpdated: executeResult.learningUpdated || [],
      findings: executeResult.findings || [],
      recommendations: executeResult.recommendations || [],
      strategicActions: executeResult.strategicActions || [],
      errors: executeResult.errors || validation.issues || [],
      summary: executeResult.summary || summary,
    };
  }

  _mergeResults(results) {
    const merged = {
      success: results.every(r => r.success !== false),
      confidence: 0,
      findings: [],
      recommendations: [],
      reasoningSteps: [],
      evidenceUsed: [],
      knowledgeUpdated: [],
      learningUpdated: [],
      errors: [],
      summary: '',
    };

    if (results.length === 0) return merged;

    for (const r of results) {
      if (r.findings) merged.findings.push(...r.findings);
      if (r.recommendations) merged.recommendations.push(...r.recommendations);
      if (r.reasoningSteps) merged.reasoningSteps.push(...r.reasoningSteps);
      if (r.evidenceUsed) merged.evidenceUsed.push(...r.evidenceUsed);
      if (r.knowledgeUpdated) merged.knowledgeUpdated.push(...r.knowledgeUpdated);
      if (r.learningUpdated) merged.learningUpdated.push(...r.learningUpdated);
      if (r.errors) merged.errors.push(...r.errors);
    }

    merged.confidence = Math.round(
      results.reduce((s, r) => s + (r.confidence || 0), 0) / results.length * 1000
    ) / 1000;

    return merged;
  }

  _deduplicateFindings(merged) {
    const seen = new Set();
    merged.findings = merged.findings.filter(f => {
      const key = typeof f === 'string' ? f : JSON.stringify(f);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const recSeen = new Set();
    merged.recommendations = merged.recommendations.filter(r => {
      const key = typeof r === 'string' ? r : (r.title || r.action || JSON.stringify(r));
      if (recSeen.has(key)) return false;
      recSeen.add(key);
      return true;
    });

    return merged;
  }

  async _updateBrain(context, mergedResult) {
    if (!this._brain) return;

    try {
      const brainRequest = context.toBrainRequest();
      brainRequest.payload = {
        ...brainRequest.payload,
        agentResults: mergedResult,
        findings: mergedResult.findings,
        recommendations: mergedResult.recommendations,
      };

      await this._brain.process(brainRequest);
    } catch {
      // Brain update is best-effort
    }
  }

  _withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Agent timed out after ${ms}ms`)), ms)
      ),
    ]);
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
