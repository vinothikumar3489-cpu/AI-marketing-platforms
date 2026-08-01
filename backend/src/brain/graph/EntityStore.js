const ENTITY_TYPES = [
  'Company', 'Product', 'Competitor', 'Industry', 'Audience', 'Persona',
  'Keyword', 'Feature', 'Benefit', 'PainPoint', 'UseCase', 'Campaign',
  'MarketingChannel', 'Website', 'SocialPlatform', 'Country', 'Region',
  'Language', 'Technology', 'Integration', 'Pricing', 'Review', 'ContentAsset',
];

export class EntityStore {
  constructor(prisma) {
    this._prisma = prisma;
  }

  async upsert({ type, name, canonicalName, chatId, userId, source, sourceId, confidence, metadata }) {
    if (!ENTITY_TYPES.includes(type)) throw new Error(`Invalid entity type: ${type}`);
    if (!name && !canonicalName) throw new Error('Entity requires name or canonicalName');

    const canonical = canonicalName || this._canonicalize(name);
    const existing = await this._prisma.graphEntity.findUnique({
      where: { type_canonicalName: { type, canonicalName: canonical } },
    });

    if (!existing) {
      return this._prisma.graphEntity.create({
        data: {
          type,
          name,
          canonicalName: canonical,
          aliases: [name],
          chatId: chatId || null,
          userId: userId || null,
          source: source || 'brain',
          sourceId: sourceId || null,
          confidence: Math.min(confidence || 0.5, 1.0),
          sourceCount: 1,
          lastSeen: new Date(),
          freshness: 'fresh',
          metadata: metadata || {},
        },
      });
    }

    // Update path: never destroy accumulated aliases/metadata. Merge instead.
    return this._prisma.graphEntity.update({
      where: { id: existing.id },
      data: {
        name: name || existing.name,
        aliases: this._mergeAliases(existing.aliases, name),
        chatId: chatId || existing.chatId,
        userId: userId || existing.userId,
        source: source || existing.source,
        sourceId: sourceId || existing.sourceId,
        confidence: this._round(Math.min((existing.confidence || 0.5) + 0.05, 1.0)),
        sourceCount: (existing.sourceCount || 0) + 1,
        lastSeen: new Date(),
        freshness: 'fresh',
        metadata: this._mergeMetadata(existing.metadata, metadata),
      },
    });
  }

  async addAlias(id, alias) {
    if (!id || !alias) return null;
    const existing = await this.findById(id);
    if (!existing) return null;
    const aliases = this._mergeAliases(existing.aliases, alias);
    return this._prisma.graphEntity.update({ where: { id }, data: { aliases } });
  }

  async findById(id) {
    return this._prisma.graphEntity.findUnique({ where: { id } });
  }

  async findByTypeAndName(type, name) {
    const canonical = this._canonicalize(name);
    return this._prisma.graphEntity.findUnique({ where: { type_canonicalName: { type, canonicalName: canonical } } });
  }

  async findByType(type, opts = {}) {
    const where = { type };
    if (opts.chatId) where.chatId = opts.chatId;
    if (opts.minConfidence) where.confidence = { gte: opts.minConfidence };
    return this._prisma.graphEntity.findMany({
      where,
      orderBy: { confidence: 'desc' },
      take: opts.limit || 50,
    });
  }

  async search(query, opts = {}) {
    const where = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { canonicalName: { contains: this._canonicalize(query), mode: 'insensitive' } },
      ],
    };
    if (opts.type) where.type = opts.type;
    if (opts.chatId) where.chatId = opts.chatId;
    return this._prisma.graphEntity.findMany({
      where,
      orderBy: { confidence: 'desc' },
      take: opts.limit || 20,
    });
  }

  async updateConfidence(id, adjustment) {
    return this._prisma.graphEntity.update({
      where: { id },
      data: {
        confidence: { increment: adjustment },
        sourceCount: { increment: 1 },
        lastSeen: new Date(),
      },
    });
  }

  async updateFreshness() {
    const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this._prisma.graphEntity.updateMany({
      where: { lastSeen: { lt: threshold } },
      data: { freshness: 'stale' },
    });
  }

  /**
   * Decay confidence of stale entities so unrepeated knowledge fades.
   * factor is applied multiplicatively (e.g. 0.5 halves stale confidence).
   */
  async decayConfidence({ thresholdDays = 14, factor = 0.5, minConfidence = 0.1 } = {}) {
    const threshold = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
    const stale = await this._prisma.graphEntity.findMany({
      where: { lastSeen: { lt: threshold } },
      take: 500,
    });
    if (stale.length === 0) return 0;

    let updated = 0;
    for (const entity of stale) {
      const next = Math.max((entity.confidence || 0.5) * factor, minConfidence);
      await this._prisma.graphEntity.update({
        where: { id: entity.id },
        data: { confidence: next },
      });
      updated++;
    }
    return updated;
  }

  async count(opts = {}) {
    return this._prisma.graphEntity.count({ where: opts.where || {} });
  }

  async groupByType() {
    const entities = await this._prisma.graphEntity.groupBy({
      by: ['type'],
      _count: { id: true },
      _avg: { confidence: true },
    });
    const map = {};
    for (const e of entities) {
      map[e.type] = { count: e._count.id, avgConfidence: Math.round(e._avg.confidence * 100) / 100 };
    }
    return map;
  }

  async mergeDuplicates(primaryId, duplicateId) {
    const primary = await this.findById(primaryId);
    const dup = await this.findById(duplicateId);
    if (!primary || !dup) return null;

    const merged = await this._prisma.$transaction(async (tx) => {
      const dupRels = await tx.graphRelationship.findMany({
        where: { OR: [{ fromId: duplicateId }, { toId: duplicateId }] },
      });

      // First: merge relationships that point at BOTH entities into a single edge,
      // carrying evidenceCount/confidence/sources forward instead of dropping them.
      for (const rel of dupRels) {
        const newFromId = rel.fromId === duplicateId ? primaryId : rel.fromId;
        const newToId = rel.toId === duplicateId ? primaryId : rel.toId;

        // Merging the entity into itself (both ends pointed at dup) → drop the loop.
        if (newFromId === newToId) {
          await tx.graphRelationship.delete({ where: { id: rel.id } });
          continue;
        }

        const existing = await tx.graphRelationship.findFirst({
          where: { fromId: newFromId, toId: newToId, type: rel.type },
        });

        if (existing) {
          await tx.graphRelationship.update({
            where: { id: existing.id },
            data: {
              evidenceCount: (existing.evidenceCount || 1) + (rel.evidenceCount || 1),
              confidence: this._round(Math.min(Math.max(existing.confidence || 0.7, rel.confidence || 0.7) + 0.05, 1.0)),
              sources: this._mergeSources(existing.sources, rel.sources),
              reason: existing.reason || rel.reason,
            },
          });
          await tx.graphRelationship.delete({ where: { id: rel.id } });
        }
      }

      // Re-point remaining relationships from the duplicate onto the primary.
      await tx.graphRelationship.updateMany({ where: { fromId: duplicateId }, data: { fromId: primaryId } });
      await tx.graphRelationship.updateMany({ where: { toId: duplicateId }, data: { toId: primaryId } });
      await tx.graphEntity.delete({ where: { id: duplicateId } });

      return tx.graphEntity.update({
        where: { id: primaryId },
        data: {
          confidence: Math.min((primary.confidence + dup.confidence) / 2 + 0.1, 1.0),
          sourceCount: primary.sourceCount + dup.sourceCount,
          aliases: this._mergeAliases(primary.aliases, dup.name),
          lastSeen: new Date(),
        },
      });
    });

    return merged;
  }

  async delete(id) {
    return this._prisma.graphEntity.delete({ where: { id } });
  }

  _canonicalize(name) {
    if (!name) return '';
    return name.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[^a-z0-9]/g, '').trim();
  }

  _round(value) {
    return Math.round((value || 0) * 10000) / 10000;
  }

  _mergeAliases(existing, newName) {
    const arr = Array.isArray(existing) ? [...existing] : [];
    if (newName && !arr.includes(newName)) arr.push(newName);
    return arr;
  }

  _mergeMetadata(existing, incoming) {
    if (!incoming || typeof incoming !== 'object') return existing || {};
    return { ...(existing || {}), ...incoming };
  }

  _mergeSources(existing, newSources) {
    const set = new Set(Array.isArray(existing) ? existing : []);
    for (const s of (Array.isArray(newSources) ? newSources : [newSources])) {
      if (s) set.add(s);
    }
    return Array.from(set);
  }
}

export { ENTITY_TYPES };
