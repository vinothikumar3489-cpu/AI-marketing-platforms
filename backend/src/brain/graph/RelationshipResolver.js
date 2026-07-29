export class RelationshipResolver {
  constructor(entityStore, relationshipStore) {
    this._entityStore = entityStore;
    this._relStore = relationshipStore;
  }

  async ensureRelationship({ fromType, fromName, toType, toName, relType, reason, sources, chatId, confidence, metadata }) {
    const from = await this._entityStore.findByTypeAndName(fromType, fromName);
    const to = await this._entityStore.findByTypeAndName(toType, toName);

    if (!from || !to) {
      return { success: false, error: `Entities not found: ${!from ? fromName : ''} ${!to ? toName : ''}` };
    }

    if (from.id === to.id) {
      return { success: false, error: 'Cannot create self-referencing relationship' };
    }

    const rel = await this._relStore.upsert({
      fromId: from.id,
      toId: to.id,
      type: relType,
      reason: reason || `Auto-detected: ${fromName} ${relType} ${toName}`,
      sources: sources || ['brain'],
      chatId,
      confidence: confidence || 0.7,
      metadata: metadata || {},
    });

    return { success: true, relationship: rel, from, to };
  }

  async ensureRelationshipsBatch(rels) {
    const results = [];
    for (const r of rels) {
      const result = await this.ensureRelationship(r);
      results.push(result);
    }
    return {
      created: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  async resolveConflicts(entityId) {
    const { outgoing, incoming } = await this._relStore.findByEntity(entityId);
    const conflicts = [];

    const typeGroups = {};
    for (const rel of [...outgoing, ...incoming]) {
      const key = `${rel.type}`;
      if (!typeGroups[key]) typeGroups[key] = [];
      typeGroups[key].push(rel);
    }

    for (const [type, rels] of Object.entries(typeGroups)) {
      if (rels.length > 1) {
        const uniqueTargets = new Set(rels.map(r =>
          r.fromId === entityId ? r.toId : r.fromId
        ));
        if (uniqueTargets.size === 1 && rels.length > 1) {
          conflicts.push({
            type,
            count: rels.length,
            action: 'dedup_needed',
            entityId,
          });
        }
      }
    }

    return { total: rels.length, conflicts };
  }

  async getGraph(entityId, depth = 1) {
    const visited = new Set();
    const nodes = [];
    const edges = [];

    const traverse = async (currentId, currentDepth) => {
      if (visited.has(currentId) || currentDepth > depth) return;
      visited.add(currentId);

      const entity = await this._entityStore.findById(currentId);
      if (entity) nodes.push(entity);

      const { outgoing, incoming } = await this._relStore.findByEntity(currentId);
      for (const rel of [...outgoing, ...incoming]) {
        edges.push(rel);
        const neighborId = rel.fromId === currentId ? rel.toId : rel.fromId;
        await traverse(neighborId, currentDepth + 1);
      }
    };

    await traverse(entityId, 0);
    return { nodes, edges };
  }
}
