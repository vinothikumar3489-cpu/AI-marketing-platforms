export class AgentTask {
  constructor(data = {}) {
    this.taskId = data.taskId || `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.type = data.type || 'generic';
    this.priority = data.priority || 'medium';
    this.status = data.status || 'pending';
    this.input = data.input || {};
    this.context = data.context || null;
    this.dependencies = data.dependencies || [];
    this.timeout = data.timeout || 60000;
    this.maxRetries = Math.min(data.maxRetries || 3, 10);
    this.retryDelay = data.retryDelay || 1000;
    this.agentPreferences = data.agentPreferences || [];
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  get isComplete() { return this.status === 'completed'; }
  get isFailed() { return this.status === 'failed'; }
  get isRunning() { return this.status === 'running'; }
  get isPending() { return this.status === 'pending'; }

  markRunning() {
    this.status = 'running';
    this.updatedAt = new Date().toISOString();
  }

  markComplete(result) {
    this.status = 'completed';
    this.result = result;
    this.updatedAt = new Date().toISOString();
  }

  markFailed(error) {
    this.status = 'failed';
    this.error = error;
    this.updatedAt = new Date().toISOString();
  }

  hasDependency(taskId) {
    return this.dependencies.includes(taskId);
  }

  dependsOn(completedTaskIds) {
    return this.dependencies.every(id => completedTaskIds.includes(id));
  }
}
