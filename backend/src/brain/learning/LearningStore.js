export class LearningStore {
  constructor(prisma) {
    this._prisma = prisma;
  }

  get prisma() { return this._prisma; }

  // ── Execution History ──

  async saveExecution(data) {
    return this._prisma.brainExecution.upsert({
      where: { requestId: data.requestId },
      create: {
        requestId: data.requestId,
        requestType: data.requestType || null,
        module: data.module || null,
        company: data.company || null,
        product: data.product || null,
        chatId: data.chatId || null,
        userId: data.userId || null,
        processingTime: data.processingTime || 0,
        enginesExecuted: data.enginesExecuted || [],
        confidenceBefore: data.confidenceBefore || null,
        confidenceAfter: data.confidenceAfter || null,
        memoryHits: data.memoryHits || 0,
        memoryMisses: data.memoryMisses || 0,
        evidenceCount: data.evidenceCount || 0,
        reasoningRulesTriggered: data.reasoningRulesTriggered || [],
        recommendationsGenerated: data.recommendationsGenerated || 0,
        graphNewEntities: data.graphNewEntities || 0,
        graphRelationships: data.graphRelationships || 0,
        graphDuplicatesMerged: data.graphDuplicatesMerged || 0,
        qualityScore: data.qualityScore || null,
        errors: data.errors || null,
      },
      update: {
        processingTime: data.processingTime,
        confidenceAfter: data.confidenceAfter,
        qualityScore: data.qualityScore,
      },
    });
  }

  async getExecutions(opts = {}) {
    const where = {};
    if (opts.module) where.module = opts.module;
    if (opts.chatId) where.chatId = opts.chatId;
    if (opts.company) where.company = opts.company;
    if (opts.product) where.product = opts.product;
    if (opts.since) where.createdAt = { gte: opts.since };

    return this._prisma.brainExecution.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.limit || 100,
    });
  }

  async countExecutions(opts = {}) {
    const where = {};
    if (opts.since) where.createdAt = { gte: opts.since };
    if (opts.module) where.module = opts.module;
    return this._prisma.brainExecution.count({ where });
  }

  // ── Feedback ──

  async saveFeedback(data) {
    return this._prisma.brainFeedback.create({ data });
  }

  async getFeedbacks(opts = {}) {
    const where = {};
    if (opts.executionId) where.executionId = opts.executionId;
    if (opts.feedbackType) where.feedbackType = opts.feedbackType;
    if (opts.action) where.action = opts.action;
    if (opts.module) where.module = opts.module;
    if (opts.since) where.createdAt = { gte: opts.since };
    return this._prisma.brainFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.limit || 100,
    });
  }

  async countFeedbacks(opts = {}) {
    const where = {};
    if (opts.since) where.createdAt = { gte: opts.since };
    if (opts.action) where.action = opts.action;
    return this._prisma.brainFeedback.count({ where });
  }

  async countPositiveFeedbacks(since) {
    const positive = ['approved', 'published', 'reused', 'launched'];
    const where = { action: { in: positive } };
    if (since) where.createdAt = { gte: since };
    return this._prisma.brainFeedback.count({ where });
  }

  async countNegativeFeedbacks(since) {
    const negative = ['rejected', 'edited'];
    const where = { action: { in: negative } };
    if (since) where.createdAt = { gte: since };
    return this._prisma.brainFeedback.count({ where });
  }

  // ── Patterns ──

  async upsertPattern(data) {
    return this._prisma.brainPattern.upsert({
      where: { type_name: { type: data.type, name: data.name } },
      create: {
        type: data.type,
        name: data.name,
        description: data.description || null,
        entities: data.entities || [],
        frequency: 1,
        confidence: data.confidence || 0.5,
        sourceExecutions: data.sourceExecutions || [],
        lastSeen: new Date(),
      },
      update: {
        frequency: { increment: 1 },
        confidence: data.confidence || undefined,
        entities: data.entities || undefined,
        lastSeen: new Date(),
      },
    });
  }

  async getPatterns(type, opts = {}) {
    const where = {};
    if (type) where.type = type;
    return this._prisma.brainPattern.findMany({
      where,
      orderBy: { frequency: 'desc' },
      take: opts.limit || 50,
    });
  }

  async countPatterns(since) {
    const where = {};
    if (since) where.lastSeen = { gte: since };
    return this._prisma.brainPattern.count({ where });
  }

  // ── Rule Performance ──

  async upsertRulePerformance(ruleName, data) {
    return this._prisma.brainRulePerformance.upsert({
      where: { ruleName },
      create: {
        ruleName,
        timesTriggered: data.timesTriggered ?? 1,
        timesUseful: data.timesUseful ?? 0,
        falsePositives: data.falsePositives ?? 0,
        falseNegatives: data.falseNegatives ?? 0,
        averageConfidence: data.averageConfidence ?? 0.5,
        priority: data.priority ?? 'medium',
        effectiveness: data.effectiveness ?? 0.5,
        lastTriggeredAt: new Date(),
      },
      update: {
        timesTriggered: data.timesTriggered ? { increment: data.timesTriggered } : { increment: 1 },
        timesUseful: data.timesUseful ? { increment: data.timesUseful } : undefined,
        falsePositives: data.falsePositives ? { increment: data.falsePositives } : undefined,
        falseNegatives: data.falseNegatives ? { increment: data.falseNegatives } : undefined,
        averageConfidence: data.averageConfidence || undefined,
        priority: data.priority || undefined,
        effectiveness: data.effectiveness || undefined,
        lastTriggeredAt: new Date(),
      },
    });
  }

  async getRulePerformances(opts = {}) {
    const where = {};
    if (opts.priority) where.priority = opts.priority;
    if (opts.minEffectiveness) where.effectiveness = { gte: opts.minEffectiveness };
    return this._prisma.brainRulePerformance.findMany({
      where,
      orderBy: { effectiveness: 'asc' },
      take: opts.limit || 50,
    });
  }

  async countRules() {
    return this._prisma.brainRulePerformance.count();
  }

  // ── Learning Scores ──

  async saveLearningScore(data) {
    const period = data.period || 'daily';
    const periodStart = data.periodStart || new Date();
    return this._prisma.brainLearningScore.upsert({
      where: { period_periodStart: { period, periodStart } },
      create: data,
      update: data,
    });
  }

  async getLatestScores(period, limit = 10) {
    return this._prisma.brainLearningScore.findMany({
      where: { period },
      orderBy: { periodStart: 'desc' },
      take: limit,
    });
  }

  async getLatestScore(period) {
    return this._prisma.brainLearningScore.findFirst({
      where: { period },
      orderBy: { periodStart: 'desc' },
    });
  }

  async countScores(period) {
    return this._prisma.brainLearningScore.count({ where: { period } });
  }
}
