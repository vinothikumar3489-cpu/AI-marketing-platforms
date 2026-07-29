import { AgentResult } from './AgentResult.js';

export class BaseAgent {
  constructor(name) {
    this._name = name;
    this._version = '1.0.0';
    this._capabilities = [];
    this._dependencies = [];
    this._initialized = false;
    this._metrics = {
      tasksCompleted: 0,
      tasksFailed: 0,
      totalProcessingTime: 0,
      lastExecution: null,
    };
  }

  get name() { return this._name; }
  get version() { return this._version; }
  get capabilities() { return this._capabilities; }
  get dependencies() { return this._dependencies; }
  get initialized() { return this._initialized; }

  async initialize(context) {
    this._initialized = true;
    return { success: true, agent: this._name };
  }

  async plan(task, context) {
    throw new Error(`${this._name}.plan() must be overridden`);
  }

  async execute(task, context) {
    throw new Error(`${this._name}.execute() must be overridden`);
  }

  async validate(result) {
    const issues = [];
    if (!result.findings || result.findings.length === 0) {
      issues.push('No findings produced');
    }
    if (result.confidence === undefined || result.confidence < 0) {
      issues.push('Invalid confidence value');
    }
    return {
      valid: issues.length === 0,
      issues,
      confidence: result.confidence || 0,
    };
  }

  async summarize(result) {
    const findingCount = result.findings?.length || 0;
    const recCount = result.recommendations?.length || 0;
    return `${this._name}: ${findingCount} findings, ${recCount} recommendations, confidence ${Math.round((result.confidence || 0) * 100)}%`;
  }

  async health() {
    return {
      name: this._name,
      version: this._version,
      status: this._initialized ? 'HEALTHY' : 'NOT_INITIALIZED',
      capabilities: this._capabilities,
      tasksCompleted: this._metrics.tasksCompleted,
      tasksFailed: this._metrics.tasksFailed,
      averageTimeMs: this._metrics.tasksCompleted > 0
        ? Math.round(this._metrics.totalProcessingTime / this._metrics.tasksCompleted)
        : 0,
    };
  }

  _track(durationMs, success) {
    this._metrics.totalProcessingTime += durationMs;
    if (success) {
      this._metrics.tasksCompleted++;
    } else {
      this._metrics.tasksFailed++;
    }
    this._metrics.lastExecution = new Date().toISOString();
  }

  _createResult(data = {}) {
    return new AgentResult({
      taskId: data.taskId || '',
      agentName: this._name,
      success: data.success !== undefined ? data.success : true,
      status: data.status || 'completed',
      confidence: data.confidence || 0,
      processingTime: data.processingTime || 0,
      reasoningSteps: data.reasoningSteps || [],
      evidenceUsed: data.evidenceUsed || [],
      knowledgeUpdated: data.knowledgeUpdated || [],
      learningUpdated: data.learningUpdated || [],
      findings: data.findings || [],
      recommendations: data.recommendations || [],
      errors: data.errors || [],
      summary: data.summary || `${this._name} completed`,
    });
  }

  async _callAgent(agentManager, agentName, subTask, context) {
    if (!agentManager) {
      return { success: false, error: 'AgentManager not available' };
    }
    return agentManager.requestAgent(agentName, subTask, context);
  }
}
