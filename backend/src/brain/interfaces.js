export class BrainRequest {
  constructor(data = {}) {
    this.requestId = data.requestId || '';
    this.module = data.module || '';
    this.action = data.action || '';
    this.payload = data.payload || {};
    this.userId = data.userId || '';
    this.workspaceId = data.workspaceId || '';
    this.chatId = data.chatId || '';
    this.companyName = data.companyName || '';
    this.website = data.website || '';
    this.industry = data.industry || '';
    this.productName = data.productName || '';
    this.market = data.market || '';
    this.language = data.language || '';
    this.requestType = data.requestType || '';
    this.metadata = data.metadata || {};
  }
}

export class BrainContext {
  constructor(data = {}) {
    this.requestId = data.requestId || '';
    this.request = data.request || {};
    this.user = data.user || {};
    this.workspace = data.workspace || {};
    this.company = data.company || {};
    this.product = data.product || {};
    this.campaign = data.campaign || {};
    this.chat = data.chat || {};
    this.content = data.content || {};
    this.metadata = data.metadata || {};
    this.memory = data.memory || null;
    this.knowledge = data.knowledge || null;
    this.evidence = data.evidence || null;
    this.reasoning = data.reasoning || null;
    this.recommendations = data.recommendations || null;
    this.confidence = data.confidence || null;
    this.learning = data.learning || null;
    this.quality = data.quality || null;
    this.graph = data.graph || null;
    this.errors = data.errors || [];
    this.timings = data.timings || {};
    this.contextSummary = data.contextSummary || {};
  }
}

export class BrainResponse {
  constructor(data = {}) {
    this.requestId = data.requestId || '';
    this.success = data.success !== undefined ? data.success : true;
    this.status = data.status || 'COMPLETED';
    this.data = data.data || null;
    this.context = data.context || null;
    this.decisions = data.decisions || [];
    this.decisionId = data.decisionId || null;
    this.recommendations = data.recommendations || [];
    this.confidence = data.confidence || null;
    this.insights = data.insights || [];
    this.warnings = data.warnings || [];
    this.errors = data.errors || [];
    this.timings = data.timings || {};
    this.engineResults = data.engineResults || {};
  }

  toControllerSummary() {
    const c = this.context || {};
    const g = c.graph || {};
    const adapterMetrics = c.adapterMetrics || {};
    const learning = c.learning || {};
    return {
      success: this.success,
      status: this.status,
      requestId: this.requestId,
      decisions: this.decisions,
      decisionId: this.decisionId,
      insights: this.insights,
      errors: this.errors,
      warnings: this.warnings,
      contextSummary: c.contextSummary || null,
      confidence: this.confidence,
      recommendations: this.recommendations,
      processingTime: this.timings?.total || 0,
      memoryHits: c.memory?.hits || 0,
      evidenceCount: c.evidence?.sources?.length || 0,
      graph: g.update === 'completed' ? {
        newEntities: g.newEntities || 0,
        updatedEntities: g.updatedEntities || 0,
        relationshipsCreated: g.relationshipsCreated || 0,
        duplicatesMerged: g.duplicatesMerged || 0,
      } : null,
      learning: learning.learningScore ? {
        score: learning.learningScore,
        brainIQ: learning.brainIQ,
        executionsTracked: learning.executionsTracked,
        patternsFound: learning.patternsFound,
      } : null,
      adoption: adapterMetrics,
    };
  }
}
