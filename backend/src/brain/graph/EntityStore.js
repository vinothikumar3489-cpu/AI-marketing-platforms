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

    const ent = await this._prisma.graphEntity.upsert({
      where: { type_canonicalName: { type, canonicalName: canonicalName || this._canonicalize(name) } },
      create: {
        type,
        name,
        canonicalName: canonicalName || this._canonicalize(name),
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
      update: {
        name,
        aliases: this._mergeAliases(null, name),
        chatId: chatId || undefined,
        userId: userId || undefined,
        source: source || undefined,
        sourceId: sourceId || undefined,
        confidence: { increment: 0.05 },
        sourceCount: { increment: 1 },
        lastSeen: new Date(),
        freshness: 'fresh',
        metadata: metadata || undefined,
      },
    });

    return ent;
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
      for (const rel of dupRels) {
        const newFromId = rel.fromId === duplicateId ? primaryId : rel.fromId;
        const newToId = rel.toId === duplicateId ? primaryId : rel.toId;
        const existing = await tx.graphRelationship.findFirst({
          where: { fromId: newFromId, toId: newToId, type: rel.type },
        });
        if (existing) {
          await tx.graphRelationship.delete({ where: { id: rel.id } });
        }
      }
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

  _mergeAliases(existing, newName) {
    const arr = Array.isArray(existing) ? [...existing] : [];
    if (newName && !arr.includes(newName)) arr.push(newName);
    return arr;
  }
}

export { ENTITY_TYPES };
