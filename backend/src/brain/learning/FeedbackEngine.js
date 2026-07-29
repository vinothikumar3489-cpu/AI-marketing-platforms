export class FeedbackEngine {
  constructor(store, executionHistory, ruleOptimizer, knowledgeEvolution) {
    this._store = store;
    this._history = executionHistory;
    this._ruleOptimizer = ruleOptimizer;
    this._knowledgeEvolution = knowledgeEvolution;
  }

  async recordExplicit({ executionId, requestId, action, module, targetType, targetId, targetValue, userId, chatId, metadata }) {
    return this._store.saveFeedback({
      executionId: executionId || null,
      requestId: requestId || null,
      feedbackType: 'explicit',
      action,
      module: module || null,
      targetType: targetType || null,
      targetId: targetId || null,
      targetValue: targetValue || null,
      userId: userId || null,
      chatId: chatId || null,
      metadata: metadata || {},
    });
  }

  async recordImplicit({ executionId, requestId, action, module, targetType, targetId, targetValue, userId, chatId, metadata }) {
    return this._store.saveFeedback({
      executionId: executionId || null,
      requestId: requestId || null,
      feedbackType: 'implicit',
      action,
      module: module || null,
      targetType: targetType || null,
      targetId: targetId || null,
      targetValue: targetValue || null,
      userId: userId || null,
      chatId: chatId || null,
      metadata: metadata || {},
    });
  }

  async processRecommendationFeedback(execution, recommendations, acceptedIds, rejectedIds) {
    if (!execution) return;

    if (acceptedIds?.length > 0) {
      for (const id of acceptedIds) {
        await this.recordExplicit({
          executionId: execution.id,
          requestId: execution.requestId,
          action: 'approved',
          module: execution.module,
          targetType: 'recommendation',
          targetId: id,
        });
      }

      if (this._ruleOptimizer) {
        for (const rec of (recommendations || [])) {
          if (acceptedIds.includes(rec.id || rec.source)) {
            await this._ruleOptimizer.recordUseful(rec.source);
          }
          if (rejectedIds?.includes(rec.id || rec.source)) {
            await this._ruleOptimizer.recordFalsePositive(rec.source);
          }
        }
      }
    }

    if (rejectedIds?.length > 0) {
      for (const id of rejectedIds) {
        await this.recordExplicit({
          executionId: execution.id,
          requestId: execution.requestId,
          action: 'rejected',
          module: execution.module,
          targetType: 'recommendation',
          targetId: id,
        });
      }
    }
  }

  async processUserEdit(requestId, module, targetType, targetId, metadata) {
    const feedback = await this.recordExplicit({
      requestId,
      action: 'edited',
      module,
      targetType,
      targetId,
      metadata,
    });

    if (this._ruleOptimizer && targetType === 'recommendation') {
      await this._ruleOptimizer.recordFalsePositive(targetId);
    }

    return feedback;
  }

  async processPublish(requestId, module, targetType, targetId) {
    return this.recordExplicit({
      requestId,
      action: 'published',
      module,
      targetType,
      targetId,
    });
  }

  async processContentReuse(requestId, module, targetId) {
    return this.recordImplicit({
      requestId,
      action: 'reused',
      module,
      targetType: 'content',
      targetId,
    });
  }

  async processCampaignLaunch(requestId, module, campaignId) {
    return this.recordImplicit({
      requestId,
      action: 'launched',
      module,
      targetType: 'campaign',
      targetId: campaignId,
    });
  }

  async processSeoRerun(requestId, chatId) {
    return this.recordImplicit({
      requestId,
      action: 'rerun',
      module: 'seo',
      targetType: 'analysis',
      targetId: chatId,
      chatId,
    });
  }

  async getRecentFeedbacks(limit = 50) {
    return this._store.getFeedbacks({ limit });
  }

  async acceptanceRate(module, since) {
    const total = await this._store.countFeedbacks({ module, since });
    if (total === 0) return 0;
    const positive = await this._store.countPositiveFeedbacks(since);
    return Math.round((positive / total) * 10000) / 100;
  }
}
