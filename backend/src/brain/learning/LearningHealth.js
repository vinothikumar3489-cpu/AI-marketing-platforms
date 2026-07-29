export class LearningHealth {
  constructor(store, trendAnalyzer, ruleOptimizer, knowledgeEvolution) {
    this._store = store;
    this._trendAnalyzer = trendAnalyzer;
    this._ruleOptimizer = ruleOptimizer;
    this._knowledgeEvolution = knowledgeEvolution;
  }

  async generateLearningScore() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dimensions = await Promise.all([
      this._computeKnowledgeCompleteness(thirtyDaysAgo),
      this._computeRecommendationUsefulness(thirtyDaysAgo),
      this._computeConfidenceCalibration(thirtyDaysAgo),
      this._computeEvidenceReliability(thirtyDaysAgo),
      this._computeMemoryReuse(thirtyDaysAgo),
      this._computeGraphQuality(sevenDaysAgo),
      this._computeRuleEffectiveness(),
    ]);

    const score = Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);
    const brainIQ = Math.min(100, Math.max(0, score));

    const latest = await this._store.getLatestScore('daily');
    const delta = latest ? brainIQ - (latest.brainIQ || 0) : 0;

    const record = await this._store.saveLearningScore({
      period: 'daily',
      periodStart: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      periodEnd: now,
      brainIQ,
      knowledgeCompleteness: dimensions[0].score,
      recommendationUsefulness: dimensions[1].score,
      confidenceCalibration: dimensions[2].score,
      evidenceReliability: dimensions[3].score,
      memoryReuse: dimensions[4].score,
      graphQuality: dimensions[5].score,
      ruleEffectiveness: dimensions[6].score,
      totalExecutions: await this._store.countExecutions({ since: thirtyDaysAgo }),
      totalPatterns: await this._store.countPatterns(thirtyDaysAgo),
      totalFeedbacks: await this._store.countFeedbacks({ since: thirtyDaysAgo }),
    });

    return { ...record, delta };
  }

  async _computeKnowledgeCompleteness(since) {
    const entityTypes = ['Company', 'Product', 'Audience', 'Keyword', 'Feature', 'Campaign', 'ContentAsset', 'MarketingChannel', 'Competitor', 'Industry'];
    let filledTypes = 0;
    for (const type of entityTypes) {
      const count = await this._store.prisma.graphEntity?.count({ where: { type } }) || 0;
      if (count > 0) filledTypes++;
    }

    const totalTypes = entityTypes.length;
    const typeCoverage = filledTypes / totalTypes;

    const totalEntities = await this._store.prisma.graphEntity?.count() || 0;
    const entityScore = Math.min(totalEntities / 100, 1);

    const totalRelationships = await this._store.prisma.graphRelationship?.count() || 0;
    const relScore = totalRelationships > 0 ? Math.min(totalRelationships / (totalEntities * 2), 1) : 0;

    const score = Math.round(((typeCoverage * 0.4) + (entityScore * 0.3) + (relScore * 0.3)) * 100);
    return { name: 'knowledgeCompleteness', score: Math.min(100, score), typeCoverage, totalEntities, totalRelationships };
  }

  async _computeRecommendationUsefulness(since) {
    const positive = await this._store.countPositiveFeedbacks(since);
    const negative = await this._store.countNegativeFeedbacks(since);
    const total = positive + negative;

    if (total === 0) return { name: 'recommendationUsefulness', score: 50, total: 0, acceptanceRate: 0 };

    const acceptanceRate = positive / total;
    const score = Math.round(acceptanceRate * 100);
    return { name: 'recommendationUsefulness', score, total, acceptanceRate: Math.round(acceptanceRate * 10000) / 100 };
  }

  async _computeConfidenceCalibration(since) {
    const execs = await this._store.getExecutions({ since, limit: 500 });
    if (execs.length === 0) return { name: 'confidenceCalibration', score: 50, averageConfidence: 0 };

    const confidences = execs.map(e => e.confidenceAfter).filter(c => c !== null && c !== undefined);
    if (confidences.length === 0) return { name: 'confidenceCalibration', score: 50, averageConfidence: 0 };

    const avg = confidences.reduce((s, c) => s + c, 0) / confidences.length;
    const variance = confidences.reduce((s, c) => s + (c - avg) ** 2, 0) / confidences.length;
    const stdDev = Math.sqrt(variance);

    const score = Math.round(Math.max(0, Math.min(100, (1 - stdDev) * 100)));
    return { name: 'confidenceCalibration', score, averageConfidence: Math.round(avg * 1000) / 1000, stdDev: Math.round(stdDev * 1000) / 1000 };
  }

  async _computeEvidenceReliability(since) {
    const execs = await this._store.getExecutions({ since, limit: 500 });
    if (execs.length === 0) return { name: 'evidenceReliability', score: 50, averageEvidenceCount: 0 };

    const withEvidence = execs.filter(e => e.evidenceCount > 0);
    const ratio = withEvidence.length / execs.length;
    const avgEvidence = execs.reduce((s, e) => s + (e.evidenceCount || 0), 0) / execs.length;
    const score = Math.round(((ratio * 0.6) + (Math.min(avgEvidence / 5, 1) * 0.4)) * 100);

    return { name: 'evidenceReliability', score, evidenceRatio: Math.round(ratio * 10000) / 100, averageEvidenceCount: Math.round(avgEvidence * 100) / 100 };
  }

  async _computeMemoryReuse(since) {
    const execs = await this._store.getExecutions({ since, limit: 500 });
    if (execs.length === 0) return { name: 'memoryReuse', score: 50, hitRate: 0 };

    const totalMemoryOps = execs.reduce((s, e) => s + (e.memoryHits || 0) + (e.memoryMisses || 0), 0);
    const totalHits = execs.reduce((s, e) => s + (e.memoryHits || 0), 0);
    const hitRate = totalMemoryOps > 0 ? totalHits / totalMemoryOps : 0;

    const score = Math.round(Math.min(hitRate / 0.5, 1) * 100);
    return { name: 'memoryReuse', score, hitRate: Math.round(hitRate * 10000) / 100, totalHits, totalOps: totalMemoryOps };
  }

  async _computeGraphQuality(since) {
    const totalEntities = await this._store.prisma.graphEntity?.count() || 0;
    const totalRelationships = await this._store.prisma.graphRelationship?.count() || 0;
    const avgConfidence = await this._store.prisma.graphEntity?.aggregate({ _avg: { confidence: true } }) || { _avg: { confidence: 0 } };

    const hasRelationships = totalEntities > 0;
    const relationshipDensity = totalEntities > 0 ? totalRelationships / totalEntities : 0;
    const densityScore = Math.min(relationshipDensity / 3, 1);

    const confidenceScore = avgConfidence._avg.confidence || 0;

    const score = Math.round((
      (hasRelationships ? 0.3 : 0) +
      (densityScore * 0.3) +
      (confidenceScore * 0.4)
    ) * 100);

    return { name: 'graphQuality', score, totalEntities, totalRelationships, avgConfidence: Math.round((avgConfidence._avg.confidence || 0) * 1000) / 1000 };
  }

  async _computeRuleEffectiveness() {
    const report = await this._ruleOptimizer.getPerformanceReport();
    const score = Math.round(report.averageEffectiveness * 100);
    return { name: 'ruleEffectiveness', score, ...report };
  }

  async getHealthSummary() {
    const latest = await this._store.getLatestScore('daily');
    return {
      brainIQ: latest?.brainIQ || 0,
      lastUpdated: latest?.createdAt || null,
      knowledgeCompleteness: latest?.knowledgeCompleteness || 0,
      recommendationUsefulness: latest?.recommendationUsefulness || 0,
      confidenceCalibration: latest?.confidenceCalibration || 0,
      evidenceReliability: latest?.evidenceReliability || 0,
      memoryReuse: latest?.memoryReuse || 0,
      graphQuality: latest?.graphQuality || 0,
      ruleEffectiveness: latest?.ruleEffectiveness || 0,
      totalExecutions: latest?.totalExecutions || 0,
      totalPatterns: latest?.totalPatterns || 0,
      totalFeedbacks: latest?.totalFeedbacks || 0,
    };
  }
}
