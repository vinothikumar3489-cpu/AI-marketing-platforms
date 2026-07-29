export class ExecutionHistory {
  constructor(store) {
    this._store = store;
  }

  async record(context, brainResponse) {
    if (!context?.requestId) return null;

    const request = context?.request || {};
    const confidence = context?.confidence || {};
    const recommendations = context?.recommendations || {};
    const reasoning = context?.reasoning || {};
    const memory = context?.memory || {};
    const evidence = context?.evidence || {};
    const graph = context?.graph || {};
    const quality = context?.quality || {};
    const errors = context?.errors || [];

    const execution = await this._store.saveExecution({
      requestId: context.requestId,
      requestType: request?.requestType || request?.action || '',
      module: request?.module || '',
      company: request?.companyName || context?.knowledge?.company?.name || '',
      product: request?.productName || context?.knowledge?.product?.name || '',
      chatId: request?.chatId || '',
      userId: request?.userId || '',
      processingTime: context?.timings?.total || 0,
      enginesExecuted: Object.keys(brainResponse?.engineResults || {}),
      confidenceBefore: null,
      confidenceAfter: confidence?.overall || null,
      memoryHits: memory?.hits || 0,
      memoryMisses: memory?.misses || 0,
      evidenceCount: evidence?.sources?.length || 0,
      reasoningRulesTriggered: reasoning?.conclusions?.map(c => ({ rule: c.rule, severity: c.severity })) || [],
      recommendationsGenerated: recommendations?.count || recommendations?.items?.length || 0,
      graphNewEntities: graph?.newEntities || 0,
      graphRelationships: graph?.relationshipsCreated || 0,
      graphDuplicatesMerged: graph?.duplicatesMerged || 0,
      qualityScore: quality?.score || null,
      errors: errors.length > 0 ? errors : null,
    });

    return execution;
  }

  async getForModule(module, limit = 50) {
    return this._store.getExecutions({ module, limit });
  }

  async getForChat(chatId, limit = 20) {
    return this._store.getExecutions({ chatId, limit });
  }

  async getRecent(limit = 100) {
    return this._store.getExecutions({ limit });
  }

  async count(opts = {}) {
    return this._store.countExecutions(opts);
  }

  async averageProcessingTime(since) {
    const execs = await this._store.getExecutions({ since, limit: 1000 });
    if (execs.length === 0) return 0;
    const total = execs.reduce((sum, e) => sum + e.processingTime, 0);
    return Math.round(total / execs.length);
  }

  async recommendationAcceptanceRate(since) {
    const total = await this._store.countExecutions({ since });
    if (total === 0) return 0;
    const positive = await this._store.countPositiveFeedbacks(since);
    return Math.round((positive / total) * 10000) / 100;
  }

  async mostActiveModules(since, limit = 10) {
    const execs = await this._store.getExecutions({ since, limit: 5000 });
    const counts = {};
    for (const e of execs) {
      const mod = e.module || 'unknown';
      counts[mod] = (counts[mod] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([module, count]) => ({ module, count }));
  }
}
