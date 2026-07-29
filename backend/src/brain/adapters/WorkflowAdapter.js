import { ModuleAdapter } from './ModuleAdapter.js';

export class WorkflowAdapter extends ModuleAdapter {
  constructor() {
    super('WorkflowAdapter');
  }

  async collectEvidence(context) {
    const start = Date.now();
    const request = context?.request || {};
    const memory = context?.memory?.sections || {};

    const sources = [];
    const companyName = request.companyName || '';
    const workflowId = request.workflowId || request.payload?.workflowId || '';

    if (companyName || workflowId) {
      sources.push({
        type: 'workflow_context',
        value: { company: companyName, workflowId },
        confidence: 0.6,
        source: 'WorkflowAdapter',
      });
    }

    if (memory.workflowData?.exists) {
      const wf = memory.workflowData.data || {};
      sources.push({
        type: 'workflow_history',
        value: { executions: wf.executionCount, successCount: wf.successCount, failures: wf.failureCount },
        confidence: 0.85,
        source: 'WorkflowAdapter.memory',
      });
    }

    this._configured = true;
    this._track(Date.now() - start, sources.length);
    return { sources, module: this._name, companyName, workflowId };
  }

  async updateKnowledge(context) {
    return { updates: ['automation_rules', 'workflow_definitions'], module: this._name };
  }

  async updateMemory(context) {
    return { memories: ['workflow_history'], module: this._name };
  }

  async updateLearning(context) {
    return { insights: ['automation_patterns', 'workflow_optimization'], module: this._name };
  }
}
