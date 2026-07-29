export class TrendAnalyzer {
  constructor(store) {
    this._store = store;
  }

  async confidenceTrend(since) {
    const execs = await this._store.getExecutions({ since, limit: 500 });
    const daily = {};
    for (const e of execs) {
      if (e.confidenceAfter === null || e.confidenceAfter === undefined) continue;
      const day = e.createdAt.toISOString().slice(0, 10);
      if (!daily[day]) daily[day] = { sum: 0, count: 0 };
      daily[day].sum += e.confidenceAfter;
      daily[day].count++;
    }
    return Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        averageConfidence: Math.round((data.sum / data.count) * 1000) / 1000,
        sampleSize: data.count,
      }));
  }

  async graphGrowthTrend(since) {
    const execs = await this._store.getExecutions({ since, limit: 500 });
    let cumulativeEntities = 0;
    let cumulativeRelationships = 0;
    const daily = {};
    for (const e of execs) {
      const day = e.createdAt.toISOString().slice(0, 10);
      if (!daily[day]) {
        daily[day] = { entities: 0, relationships: 0, executions: 0 };
      }
      daily[day].entities += e.graphNewEntities || 0;
      daily[day].relationships += e.graphRelationships || 0;
      daily[day].executions++;
    }
    return Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        cumulativeEntities += data.entities;
        cumulativeRelationships += data.relationships;
        return {
          date,
          newEntities: data.entities,
          newRelationships: data.relationships,
          cumulativeEntities,
          cumulativeRelationships,
          executions: data.executions,
        };
      });
  }

  async recommendationAccuracyTrend(since) {
    const positive = await this._store.countPositiveFeedbacks(since);
    const negative = await this._store.countNegativeFeedbacks(since);
    const total = positive + negative;
    return {
      totalFeedback: total,
      positive,
      negative,
      accuracyRate: total > 0 ? Math.round((positive / total) * 10000) / 100 : 0,
      period: since?.toISOString() || 'all_time',
    };
  }

  async evidenceQualityTrend(since) {
    const execs = await this._store.getExecutions({ since, limit: 500 });
    const daily = {};
    for (const e of execs) {
      const day = e.createdAt.toISOString().slice(0, 10);
      if (!daily[day]) daily[day] = { totalEvidence: 0, count: 0 };
      daily[day].totalEvidence += e.evidenceCount || 0;
      daily[day].count++;
    }
    return Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        averageEvidenceCount: data.count > 0 ? Math.round((data.totalEvidence / data.count) * 100) / 100 : 0,
        executions: data.count,
      }));
  }

  async entityFreshnessTrend(since) {
    if (!this._store.prisma?.graphEntity) return [];
    const entities = await this._store.prisma.graphEntity.findMany({
      where: { updatedAt: { gte: since || new Date(0) } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    const daily = {};
    for (const e of entities) {
      const day = e.updatedAt.toISOString().slice(0, 10);
      if (!daily[day]) daily[day] = { updated: 0 };
      daily[day].updated++;
    }
    return Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, entitiesUpdated: data.updated }));
  }

  async knowledgeCoverageTrend(since) {
    const entityTypes = ['Company', 'Product', 'Audience', 'Keyword', 'Feature', 'Campaign', 'ContentAsset', 'MarketingChannel', 'Competitor', 'Industry'];
    const coverage = {};
    for (const type of entityTypes) {
      const count = await this._store.prisma.graphEntity?.count({ where: { type } }) || 0;
      coverage[type] = count;
    }
    const total = Object.values(coverage).reduce((a, b) => a + b, 0);
    return {
      byType: coverage,
      totalEntities: total,
      typeDiversity: Object.keys(coverage).filter(k => coverage[k] > 0).length,
      period: since?.toISOString() || 'current',
    };
  }

  async moduleUsageTrend(since) {
    const execs = await this._store.getExecutions({ since, limit: 500 });
    const moduleCounts = {};
    for (const e of execs) {
      const mod = e.module || 'unknown';
      if (!moduleCounts[mod]) moduleCounts[mod] = 0;
      moduleCounts[mod]++;
    }
    return Object.entries(moduleCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([module, count]) => ({ module, count }));
  }

  async allTrends(since) {
    const sinceDate = since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return {
      confidence: await this.confidenceTrend(sinceDate),
      graphGrowth: await this.graphGrowthTrend(sinceDate),
      recommendationAccuracy: await this.recommendationAccuracyTrend(sinceDate),
      evidenceQuality: await this.evidenceQualityTrend(sinceDate),
      entityFreshness: await this.entityFreshnessTrend(sinceDate),
      knowledgeCoverage: await this.knowledgeCoverageTrend(sinceDate),
      moduleUsage: await this.moduleUsageTrend(sinceDate),
    };
  }
}
