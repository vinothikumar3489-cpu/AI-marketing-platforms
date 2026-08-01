export class RelationshipStore {
  constructor(prisma) {
    this._prisma = prisma;
  }

  async upsert({ fromId, toId, type, reason, sources, chatId, confidence, metadata }) {
    const existing = await this._prisma.graphRelationship.findUnique({
      where: { fromId_toId_type: { fromId, toId, type } },
    });

    if (!existing) {
      return this._prisma.graphRelationship.create({
        data: {
          fromId, toId, type,
          reason: reason || null,
          sources: sources || [],
          chatId: chatId || null,
          confidence: Math.min(confidence || 0.7, 1.0),
          evidenceCount: 1,
          metadata: metadata || {},
        },
      });
    }

    // Update path: UNION sources so evidence provenance is never lost.
    return this._prisma.graphRelationship.update({
      where: { id: existing.id },
      data: {
        reason: reason || existing.reason,
        sources: this._mergeSources(existing.sources, sources),
        chatId: chatId || existing.chatId,
        confidence: this._round(Math.min((existing.confidence || 0.7) + 0.1, 1.0)),
        evidenceCount: (existing.evidenceCount || 1) + 1,
        metadata: this._mergeMetadata(existing.metadata, metadata),
      },
    });
  }

  async updateConfidence(id, adjustment) {
    return this._prisma.graphRelationship.update({
      where: { id },
      data: { confidence: { increment: adjustment } },
    });
  }

  async findByEntity(entityId, opts = {}) {
    const outgoing = opts.direction !== 'incoming'
      ? await this._prisma.graphRelationship.findMany({
          where: { fromId: entityId, ...(opts.type ? { type: opts.type } : {}) },
          include: { to: true },
          orderBy: { confidence: 'desc' },
        })
      : [];

    const incoming = opts.direction !== 'outgoing'
      ? await this._prisma.graphRelationship.findMany({
          where: { toId: entityId, ...(opts.type ? { type: opts.type } : {}) },
          include: { from: true },
          orderBy: { confidence: 'desc' },
        })
      : [];

    return { outgoing, incoming };
  }

  async findPath(fromId, toId, maxDepth = 3) {
    if (fromId === toId) return { path: [], depth: 0 };

    const visited = new Set();
    const queue = [[fromId, []]];

    while (queue.length > 0) {
      const [currentId, path] = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const rels = await this._prisma.graphRelationship.findMany({
        where: { OR: [{ fromId: currentId }, { toId: currentId }] },
        include: { from: true, to: true },
      });

      for (const rel of rels) {
        const nextId = rel.fromId === currentId ? rel.toId : rel.fromId;
        const nextNode = rel.fromId === currentId ? rel.to : rel.from;
        const newPath = [...path, { relationship: rel.type, entity: nextNode.name, entityId: nextId }];

        if (nextId === toId) return { path: newPath, depth: newPath.length };
        if (newPath.length < maxDepth) queue.push([nextId, newPath]);
      }
    }

    return { path: [], depth: -1 };
  }

  async findByType(type, opts = {}) {
    const where = { type };
    if (opts.minConfidence) where.confidence = { gte: opts.minConfidence };
    if (opts.chatId) where.chatId = opts.chatId;
    return this._prisma.graphRelationship.findMany({
      where,
      include: { from: true, to: true },
      orderBy: { confidence: 'desc' },
      take: opts.limit || 50,
    });
  }

  async count(opts = {}) {
    return this._prisma.graphRelationship.count({ where: opts.where || {} });
  }

  async groupByType() {
    const rels = await this._prisma.graphRelationship.groupBy({
      by: ['type'],
      _count: { id: true },
      _avg: { confidence: true },
    });
    const map = {};
    for (const r of rels) {
      map[r.type] = { count: r._count.id, avgConfidence: Math.round(r._avg.confidence * 100) / 100 };
    }
    return map;
  }

  _mergeSources(existing, newSources) {
    const set = new Set(Array.isArray(existing) ? existing : []);
    for (const s of (Array.isArray(newSources) ? newSources : [newSources])) {
      if (s) set.add(s);
    }
    return Array.from(set);
  }

  _round(value) {
    return Math.round((value || 0) * 10000) / 10000;
  }

  _mergeMetadata(existing, incoming) {
    if (!incoming || typeof incoming !== 'object') return existing || {};
    return { ...(existing || {}), ...incoming };
  }
}
