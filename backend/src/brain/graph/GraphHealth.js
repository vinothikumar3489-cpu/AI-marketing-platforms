export class GraphHealth {
  constructor(entityStore, relationshipStore, entityResolver) {
    this._store = entityStore;
    this._relStore = relationshipStore;
    this._resolver = entityResolver;
  }

  async report() {
    const start = Date.now();

    const [totalEntities, totalRelationships, entityTypeBreakdown, relTypeBreakdown, staleEntities, dupGroups] = await Promise.all([
      this._store.count(),
      this._relStore.count(),
      this._store.groupByType(),
      this._relStore.groupByType(),
      this._store.count({ where: { freshness: 'stale' } }),
      this._detectAllDuplicates(),
    ]);

    const totalDups = dupGroups.reduce((sum, g) => sum + g.length - 1, 0);
    const duplicateRate = totalEntities > 0 ? Math.round((totalDups / totalEntities) * 10000) / 100 : 0;
    const avgConfidence = this._avgConfidence(entityTypeBreakdown);

    const elapsed = Date.now() - start;

    return {
      summary: {
        totalEntities,
        totalRelationships,
        duplicateRate,
        avgConfidence,
        staleEntities,
        traversalSpeed: `${elapsed}ms`,
        memoryUsage: this._estimateMemory(totalEntities, totalRelationships),
      },
      entityTypes: entityTypeBreakdown,
      relationshipTypes: relTypeBreakdown,
      duplicates: {
        groups: dupGroups.length,
        totalDuplicates: totalDups,
        rate: duplicateRate,
      },
      freshness: {
        fresh: totalEntities - staleEntities,
        stale: staleEntities,
        unknown: 0,
      },
      health: duplicateRate < 5 ? 'HEALTHY' : duplicateRate < 15 ? 'DEGRADED' : 'UNHEALTHY',
    };
  }

  async _detectAllDuplicates() {
    const types = ['Company', 'Product', 'Competitor', 'Keyword', 'Audience', 'Industry'];
    const groups = await Promise.all(
      types.map(type => this._resolver.detectDuplicates(type, 100))
    );
    return groups.flat();
  }

  _avgConfidence(typeBreakdown) {
    const entries = Object.values(typeBreakdown);
    if (entries.length === 0) return 0;
    const sum = entries.reduce((a, b) => a + (b.avgConfidence || 0), 0);
    return Math.round((sum / entries.length) * 100) / 100;
  }

  _estimateMemory(entities, relationships) {
    const entityBytes = entities * 1024;
    const relBytes = relationships * 256;
    const totalKB = Math.round((entityBytes + relBytes) / 1024);
    if (totalKB < 1024) return `${totalKB}KB`;
    return `${(totalKB / 1024).toFixed(1)}MB`;
  }
}
