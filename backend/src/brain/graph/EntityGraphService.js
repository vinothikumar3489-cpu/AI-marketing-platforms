export class EntityGraphService {
  constructor(di) {
    this._di = di;
    this._prisma = di.resolve('prisma');
  }

  get store() {
    if (!this._store) this._store = this._di.resolve('entityStore');
    return this._store;
  }

  get relationshipStore() {
    if (!this._relStore) this._relStore = this._di.resolve('relationshipStore');
    return this._relStore;
  }

  get resolver() {
    if (!this._resolver) this._resolver = this._di.resolve('entityResolver');
    return this._resolver;
  }

  get relationshipResolver() {
    if (!this._relResolver) this._relResolver = this._di.resolve('relationshipResolver');
    return this._relResolver;
  }

  get traversal() {
    if (!this._traversal) this._traversal = this._di.resolve('graphTraversal');
    return this._traversal;
  }

  get search() {
    if (!this._search) this._search = this._di.resolve('graphSearch');
    return this._search;
  }

  get graphHealth() {
    if (!this._health) this._health = this._di.resolve('graphHealth');
    return this._health;
  }

  async updateFromEvidence(context) {
    const start = Date.now();
    const evidence = context?.evidence || {};
    const knowledge = context?.knowledge || {};
    const memory = context?.memory?.sections || {};
    const request = context?.request || {};

    const stats = { newEntities: 0, updatedEntities: 0, relationshipsCreated: 0, duplicatesMerged: 0, errors: [] };

    await this._updateCompany(request, knowledge, memory, stats);
    await this._updateProduct(request, knowledge, memory, stats);
    await this._updateCompetitors(knowledge, memory, stats);
    await this._updateFromProfile(memory, stats);
    await this._updateFromEvidenceSources(evidence, stats);

    const dupGroups = await this.resolver.detectDuplicates('Company', 50);
    const moreGroups = await this.resolver.detectDuplicates('Product', 50);
    const allGroups = [...dupGroups, ...moreGroups];

    if (allGroups.length > 0) {
      const merged = await this.resolver.mergeDuplicateGroups(allGroups);
      stats.duplicatesMerged = merged.length;
    }

    await this.store.updateFreshness();

    stats.elapsed = Date.now() - start;
    return stats;
  }

  async _updateCompany(request, knowledge, memory, stats) {
    const name = knowledge?.company?.name || request?.companyName || '';
    if (!name || name === 'Unknown') return;

    const result = await this.resolver.resolveOrCreate('Company', name, {
      chatId: request?.chatId,
      userId: request?.userId,
      source: 'evidence',
      confidence: 0.7,
      metadata: {
        domain: knowledge?.company?.domain || '',
        industry: knowledge?.company?.industry || '',
        source: knowledge?.company?.source || '',
      },
    });

    if (result.resolved) stats.updatedEntities++;
    else stats.newEntities++;
  }

  async _updateProduct(request, knowledge, memory, stats) {
    const name = knowledge?.product?.name || request?.productName || '';
    if (!name || name === 'Unknown') return;

    const result = await this.resolver.resolveOrCreate('Product', name, {
      chatId: request?.chatId,
      userId: request?.userId,
      source: 'evidence',
      confidence: 0.7,
      metadata: {
        existsInMemory: !!memory?.product?.exists,
        source: knowledge?.product?.source || '',
      },
    });

    if (result.resolved) stats.updatedEntities++;
    else stats.newEntities++;

    const companyName = knowledge?.company?.name || request?.companyName || '';
    if (companyName && companyName !== 'Unknown') {
      const rel = await this.relationshipResolver.ensureRelationship({
        fromType: 'Company',
        fromName: companyName,
        toType: 'Product',
        toName: name,
        relType: 'OWNS',
        reason: `Company ${companyName} owns product ${name}`,
        sources: ['brain:evidence'],
        chatId: request?.chatId,
      });
      if (rel.success) stats.relationshipsCreated++;
    }
  }

  async _updateCompetitors(knowledge, memory, stats) {
    const productName = knowledge?.product?.name || memory?.product?.data?.productName || '';
    const competitors = knowledge?.competitors?.entities || [];

    for (const comp of competitors) {
      const compName = comp.name || comp.value || '';
      if (!compName || compName === 'Unknown') continue;

      const result = await this.resolver.resolveOrCreate('Competitor', compName, {
        chatId: null,
        source: comp.source || 'evidence',
        confidence: 0.6,
        metadata: { website: comp.website || '' },
      });

      if (result.resolved) stats.updatedEntities++;
      else stats.newEntities++;

      if (productName && productName !== 'Unknown') {
        const rel = await this.relationshipResolver.ensureRelationship({
          fromType: 'Product',
          fromName: productName,
          toType: 'Competitor',
          toName: compName,
          relType: 'COMPETES_WITH',
          reason: `Product ${productName} competes with ${compName}`,
          sources: [comp.source || 'evidence'],
          chatId: null,
        });
        if (rel.success) stats.relationshipsCreated++;
      }
    }
  }

  async _updateFromProfile(memory, stats) {
    const profile = memory?.profile?.data;
    if (!profile?.companyName) return;

    const companyResult = await this.resolver.resolveOrCreate('Company', profile.companyName, {
      source: 'productProfile',
      confidence: 0.8,
      metadata: { websiteUrl: profile.websiteUrl || '' },
    });

    if (companyResult.resolved) stats.updatedEntities++;
    else stats.newEntities++;

    if (profile.websiteUrl) {
      const wsResult = await this.resolver.resolveOrCreate('Website', profile.websiteUrl, {
        source: 'productProfile',
        confidence: 0.9,
        metadata: { url: profile.websiteUrl },
      });
      if (wsResult.resolved) stats.updatedEntities++;
      else stats.newEntities++;

      const rel = await this.relationshipResolver.ensureRelationship({
        fromType: 'Website',
        fromName: profile.websiteUrl,
        toType: 'Company',
        toName: profile.companyName,
        relType: 'BELONGS_TO',
        reason: `Website ${profile.websiteUrl} belongs to ${profile.companyName}`,
        sources: ['productProfile'],
        chatId: null,
      });
      if (rel.success) stats.relationshipsCreated++;
    }
  }

  async _updateFromEvidenceSources(evidence, stats) {
    const sources = evidence?.sources || [];
    for (const source of sources) {
      if (source.type === 'product' && source.value) {
        const result = await this.resolver.resolveOrCreate('Product', source.value, {
          source: source.subType || 'evidence',
          confidence: source.confidence || 0.5,
        });
        if (!result.resolved) stats.newEntities++;
      }
    }
  }

  async getHealthReport() {
    return this.graphHealth.report();
  }

  getEntityStore() { return this.store; }
  getRelationshipStore() { return this.relationshipStore; }
  getResolver() { return this.resolver; }
  getRelationshipResolver() { return this.relationshipResolver; }
  getTraversal() { return this.traversal; }
  getSearch() { return this.search; }
  getGraphHealth() { return this.graphHealth; }
}
