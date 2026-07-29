export class KnowledgeEvolution {
  constructor(store, history) {
    this._store = store;
    this._history = history;
  }

  async improveEntityConfidence(entityId, entityType) {
    const recent = await this._history.count({ since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) });
    if (recent === 0) return 0;

    const feedback = await this._store.getFeedbacks({
      since: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      limit: 100,
    });
    const positiveCount = feedback.filter(f =>
      ['approved', 'published', 'reused', 'launched'].includes(f.action)
    ).length;
    const totalCount = feedback.length || 1;

    const successRate = positiveCount / totalCount;
    const confidenceBoost = Math.min(successRate * 0.1, 0.05);

    return Math.round(confidenceBoost * 1000) / 1000;
  }

  async reduceStaleRelationshipFreshness(daysSince = 14) {
    const cutoff = new Date(Date.now() - daysSince * 24 * 60 * 60 * 1000);
    const staleRelationships = await this._store.prisma.graphRelationship?.findMany({
      where: { updatedAt: { lt: cutoff } },
      take: 100,
    }) || [];

    let reduced = 0;
    for (const rel of staleRelationships) {
      const newFreshness = Math.max(rel.freshness - 0.1, 0);
      await this._store.prisma.graphRelationship.update({
        where: { id: rel.id },
        data: { freshness: newFreshness },
      });
      reduced++;
    }
    return reduced;
  }

  async boostEntityFromSuccess(entityId, executionRequestId) {
    if (!executionRequestId) return 0;

    const execution = await this._store.prisma.brainExecution?.findUnique({
      where: { requestId: executionRequestId },
    });
    if (!execution || execution.qualityScore === null) return 0;

    const boost = Math.min(execution.qualityScore / 1000, 0.05);
    const entity = await this._store.prisma.graphEntity?.findUnique({
      where: { id: entityId },
    });
    if (!entity) return 0;

    const newConfidence = Math.min(entity.confidence + boost, 1.0);
    await this._store.prisma.graphEntity.update({
      where: { id: entityId },
      data: { confidence: newConfidence },
    });

    return Math.round(boost * 1000) / 1000;
  }

  async getEvolutionMetrics() {
    const totalExecs = await this._history.count();
    const recentExecs = await this._history.count({
      since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });
    const staleReduced = await this.reduceStaleRelationshipFreshness();
    const avgProcessingTime = await this._history.averageProcessingTime(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    return {
      totalExecutions: totalExecs,
      recentExecutions: recentExecs,
      staleRelationshipsReduced: staleReduced,
      averageProcessingTimeMs: avgProcessingTime,
    };
  }
}
