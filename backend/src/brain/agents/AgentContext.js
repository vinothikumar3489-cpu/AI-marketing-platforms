export class AgentContext {
  constructor(data = {}) {
    this.requestId = data.requestId || '';
    this.brainContext = data.brainContext || null;
    this.knowledge = data.knowledge || null;
    this.memory = data.memory || null;
    this.learning = data.learning || null;
    this.confidence = data.confidence || null;
    this.evidence = data.evidence || null;
    this.recommendations = data.recommendations || null;
    this.graph = data.graph || null;
    this.module = data.module || '';
    this.workspace = data.workspace || '';
    this.company = data.company || null;
    this.product = data.product || null;
    this.campaign = data.campaign || null;
    this.taskId = data.taskId || '';
    this.agentResults = data.agentResults || {};
  }

  getAgentResult(agentName) {
    return this.agentResults[agentName] || null;
  }

  setAgentResult(agentName, result) {
    this.agentResults[agentName] = result;
  }

  mergeResults(results) {
    for (const result of results) {
      this.agentResults[result.agentName] = result;
    }
  }

  toBrainRequest() {
    const bc = this.brainContext || {};
    const req = bc.request || {};
    const company = this.company || bc.company || {};
    const product = this.product || bc.product || {};

    return {
      requestId: this.requestId,
      module: this.module || req.module || '',
      action: 'agent_execution',
      companyName: company.name || req.companyName || '',
      productName: product.name || req.productName || '',
      website: company.website || req.website || '',
      industry: company.industry || req.industry || '',
      userId: req.userId || '',
      chatId: req.chatId || '',
      payload: {
        taskId: this.taskId,
        module: this.module,
        agentResults: this.agentResults,
        ...req.payload,
      },
      metadata: {
        agentExecution: true,
        ...req.metadata,
      },
    };
  }
}
