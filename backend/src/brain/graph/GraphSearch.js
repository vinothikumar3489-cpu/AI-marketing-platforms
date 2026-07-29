export class GraphSearch {
  constructor(entityStore, relationshipStore) {
    this._store = entityStore;
    this._relStore = relationshipStore;
  }

  async search(query, opts = {}) {
    const entities = await this._store.search(query, opts);
    const ranked = entities.map(e => ({
      ...e,
      rank: this._rank(e, query),
    }));

    ranked.sort((a, b) => b.rank - a.rank);

    return { total: ranked.length, results: ranked.slice(0, opts.limit || 20) };
  }

  async searchByType(query, type, opts = {}) {
    return this.search(query, { ...opts, type });
  }

  async findSimilar(entityId, opts = {}) {
    const entity = await this._store.findById(entityId);
    if (!entity) return { total: 0, results: [] };

    const limit = opts.limit || 10;
    const candidates = await this._store.findByType(entity.type, { limit: 50 });

    const scored = candidates
      .filter(e => e.id !== entityId)
      .map(e => ({
        ...e,
        similarity: this._typeSimilarity(entity, e),
      }))
      .filter(e => e.similarity > (opts.minSimilarity || 0.3));

    scored.sort((a, b) => b.similarity - a.similarity);
    return { total: scored.length, results: scored.slice(0, limit) };
  }

  async searchWithRelations(query, opts = {}) {
    const entities = await this._store.search(query, { ...opts, limit: opts.limit || 10 });
    const enriched = [];

    for (const entity of entities) {
      const { outgoing, incoming } = await this._relStore.findByEntity(entity.id, { limit: 5 });
      enriched.push({
        entity,
        outgoing: outgoing.map(r => ({ type: r.type, target: r.to.name, targetType: r.to.type, confidence: r.confidence })),
        incoming: incoming.map(r => ({ type: r.type, source: r.from.name, sourceType: r.from.type, confidence: r.confidence })),
        relationCount: outgoing.length + incoming.length,
      });
    }

    enriched.sort((a, b) => b.relationCount - a.relationCount);
    return { total: enriched.length, results: enriched };
  }

  async searchByRelationship(targetType, relType, opts = {}) {
    const rels = await this._relStore.findByType(relType, opts);
    const results = rels
      .filter(r => r.from.type === targetType || r.to.type === targetType)
      .map(r => ({
        relationship: r,
        source: r.from,
        target: r.to,
        confidence: r.confidence,
      }));

    results.sort((a, b) => b.confidence - a.confidence);
    return { total: results.length, results: results.slice(0, opts.limit || 20) };
  }

  _rank(entity, query) {
    const q = query.toLowerCase().trim();
    const name = (entity.name || '').toLowerCase();
    const canonical = (entity.canonicalName || '').toLowerCase();
    let score = 0;

    if (name === q || canonical === q) score += 1.0;
    else if (name.startsWith(q) || canonical.startsWith(q)) score += 0.8;
    else if (name.includes(q) || canonical.includes(q)) score += 0.6;

    score += entity.confidence * 0.3;

    if (entity.freshness === 'fresh') score += 0.1;
    if (entity.sourceCount > 1) score += 0.05 * Math.min(entity.sourceCount, 5);

    return Math.round(score * 100) / 100;
  }

  _typeSimilarity(a, b) {
    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    const aCanon = (a.canonicalName || '').toLowerCase();
    const bCanon = (b.canonicalName || '').toLowerCase();

    if (aCanon === bCanon) return 1.0;
    if (aCanon.includes(bCanon) || bCanon.includes(aCanon)) return 0.85;

    const aWords = aName.split(/\s+/);
    const bWords = bName.split(/\s+/);
    const common = aWords.filter(w => bWords.includes(w));
    if (common.length > 0) return 0.5 * (common.length / Math.max(aWords.length, bWords.length));

    return 0;
  }
}
