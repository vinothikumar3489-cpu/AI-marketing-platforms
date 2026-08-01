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

    // Each step is isolated: one failing extractor must not abort the rest.
    const steps = [
      ['company', () => this._updateCompany(request, knowledge, memory, stats)],
      ['product', () => this._updateProduct(request, knowledge, memory, stats)],
      ['competitors', () => this._updateCompetitors(request, knowledge, memory, stats)],
      ['profile', () => this._updateFromProfile(memory, stats)],
      ['evidenceSources', () => this._updateFromEvidenceSources(evidence, request, knowledge, stats)],
      ['features', () => this._updateFeatures(memory, knowledge, request, stats)],
      ['keywords', () => this._updateKeywords(knowledge, request, stats)],
      ['painPoints', () => this._updatePainPoints(memory, request, stats)],
      ['audience', () => this._updateAudience(memory, request, stats)],
    ];

    for (const [name, fn] of steps) {
      try {
        await fn();
      } catch (err) {
        stats.errors.push({ step: name, error: err.message });
      }
    }

    try {
      const dupGroups = [
        ...(await this.resolver.detectDuplicates('Company', 50)),
        ...(await this.resolver.detectDuplicates('Product', 50)),
        ...(await this.resolver.detectDuplicates('Competitor', 50)),
      ];

      if (dupGroups.length > 0) {
        const merged = await this.resolver.mergeDuplicateGroups(dupGroups);
        stats.duplicatesMerged = merged.length;
      }
    } catch (err) {
      stats.errors.push({ step: 'dedupe', error: err.message });
    }

    try {
      await this.store.updateFreshness();
    } catch (err) {
      stats.errors.push({ step: 'freshness', error: err.message });
    }
    try {
      await this.store.decayConfidence({ thresholdDays: 14 });
    } catch (err) {
      stats.errors.push({ step: 'decay', error: err.message });
    }

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

  async _updateCompetitors(request, knowledge, memory, stats) {
    const productName = knowledge?.product?.name || memory?.product?.data?.productName || '';
    const competitors = knowledge?.competitors?.entities || [];

    for (const comp of competitors) {
      const compName = comp.name || comp.value || '';
      if (!compName || compName === 'Unknown') continue;

      const result = await this.resolver.resolveOrCreate('Competitor', compName, {
        chatId: request?.chatId,
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
          chatId: request?.chatId,
        });
        if (rel.success) stats.relationshipsCreated++;
      }

      // Link the competitor's website as its own node so competitor dedupe
      // can use domain evidence and retrieval can resolve websites.
      if (comp.website) {
        const wsResult = await this.resolver.resolveOrCreate('Website', comp.website, {
          chatId: request?.chatId,
          source: comp.source || 'evidence',
          confidence: 0.7,
          metadata: { url: comp.website },
        });
        if (!wsResult.resolved) stats.newEntities++;

        const wsRel = await this.relationshipResolver.ensureRelationship({
          fromType: 'Competitor',
          fromName: compName,
          toType: 'Website',
          toName: comp.website,
          relType: 'BELONGS_TO',
          reason: `Website ${comp.website} belongs to competitor ${compName}`,
          sources: [comp.source || 'evidence'],
          chatId: request?.chatId,
        });
        if (wsRel.success) stats.relationshipsCreated++;
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

  async _updateFromEvidenceSources(evidence, request, knowledge, stats) {
    const sources = evidence?.sources || [];
    const companyName = knowledge?.company?.name || request?.companyName || '';

    for (const source of sources) {
      if (source.type === 'product' && source.value && source.value !== 'Unknown') {
        const result = await this.resolver.resolveOrCreate('Product', source.value, {
          source: source.subType || 'evidence',
          confidence: source.confidence || 0.5,
        });
        if (!result.resolved) stats.newEntities++;

        // Never leave an extracted product as an orphan node: link it to the
        // owning company when one is known.
        if (companyName && companyName !== 'Unknown') {
          const rel = await this.relationshipResolver.ensureRelationship({
            fromType: 'Company',
            fromName: companyName,
            toType: 'Product',
            toName: source.value,
            relType: 'OWNS',
            reason: `Company ${companyName} owns product ${source.value}`,
            sources: [source.subType || 'evidence'],
            chatId: request?.chatId,
          });
          if (rel.success) stats.relationshipsCreated++;
        }
      }
    }
  }

  async _updateFeatures(memory, knowledge, request, stats) {
    const productData = memory?.product?.data || {};
    const productAnalysis = productData.productAnalysis || {};
    const productName = knowledge?.product?.name || productData.productName || request?.productName || '';
    if (!productName || productName === 'Unknown') return;

    const featureItems = Array.isArray(productAnalysis.features)
      ? productAnalysis.features
      : Array.isArray(productAnalysis.keyFeatures)
        ? productAnalysis.keyFeatures
        : [];
    const benefitItems = Array.isArray(productAnalysis.benefits) ? productAnalysis.benefits : [];

    const seen = new Set();
    for (const item of [...featureItems, ...benefitItems]) {
      const name = (typeof item === 'string' ? item : (item.name || item.title || item.value || '')).trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());

      const result = await this.resolver.resolveOrCreate('Feature', name, {
        source: 'productIntelligence',
        confidence: 0.7,
      });
      if (!result.resolved) stats.newEntities++;

      const rel = await this.relationshipResolver.ensureRelationship({
        fromType: 'Product',
        fromName: productName,
        toType: 'Feature',
        toName: name,
        relType: 'HAS_FEATURE',
        reason: `Product ${productName} has feature ${name}`,
        sources: ['productIntelligence'],
        chatId: request?.chatId,
      });
      if (rel.success) stats.relationshipsCreated++;
    }
  }

  async _updateKeywords(knowledge, request, stats) {
    const productName = knowledge?.product?.name || request?.productName || '';
    const keywords = knowledge?.keywords?.entities || [];

    const seen = new Set();
    for (const kw of keywords) {
      const text = (kw.value || kw.name || '').trim();
      if (!text || text === 'Unknown' || seen.has(text.toLowerCase())) continue;
      seen.add(text.toLowerCase());

      const result = await this.resolver.resolveOrCreate('Keyword', text, {
        source: kw.source || 'seoIntelligence',
        confidence: 0.6,
      });
      if (!result.resolved) stats.newEntities++;

      if (productName && productName !== 'Unknown') {
        const rel = await this.relationshipResolver.ensureRelationship({
          fromType: 'Product',
          fromName: productName,
          toType: 'Keyword',
          toName: text,
          relType: 'CONNECTS_TO',
          reason: `Product ${productName} connects to keyword ${text}`,
          sources: [kw.source || 'seoIntelligence'],
          chatId: request?.chatId,
        });
        if (rel.success) stats.relationshipsCreated++;
      }
    }
  }

  async _updatePainPoints(memory, request, stats) {
    const productData = memory?.product?.data || {};
    const audience = productData.audienceIntelligence || {};
    const productAnalysis = productData.productAnalysis || {};
    const productName = productData.productName || request?.productName || '';
    if (!productName || productName === 'Unknown') return;

    const items = Array.isArray(audience.painPoints)
      ? audience.painPoints
      : Array.isArray(productAnalysis.painPoints)
        ? productAnalysis.painPoints
        : [];

    const seen = new Set();
    for (const item of items) {
      const text = (typeof item === 'string' ? item : (item.painPoint || item.name || item.title || '')).trim();
      if (!text || seen.has(text.toLowerCase())) continue;
      seen.add(text.toLowerCase());

      const result = await this.resolver.resolveOrCreate('PainPoint', text, {
        source: 'productIntelligence',
        confidence: 0.6,
      });
      if (!result.resolved) stats.newEntities++;

      const rel = await this.relationshipResolver.ensureRelationship({
        fromType: 'PainPoint',
        fromName: text,
        toType: 'Product',
        toName: productName,
        relType: 'SOLVED_BY',
        reason: `Pain point ${text} is solved by product ${productName}`,
        sources: ['productIntelligence'],
        chatId: request?.chatId,
      });
      if (rel.success) stats.relationshipsCreated++;
    }
  }

  async _updateAudience(memory, request, stats) {
    const productData = memory?.product?.data || {};
    const audience = productData.audienceIntelligence || {};
    const productName = productData.productName || request?.productName || '';
    if (!productName || productName === 'Unknown') return;

    const names = [
      audience.primaryAudience,
      ...(Array.isArray(audience.buyerPersonas) ? audience.buyerPersonas.map(p => p.name || p.title) : []),
    ].filter(Boolean).map(n => String(n).trim()).filter(n => n && n !== 'Unknown');

    const seen = new Set();
    for (const name of names) {
      if (seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());

      const result = await this.resolver.resolveOrCreate('Audience', name, {
        source: 'productIntelligence',
        confidence: 0.6,
      });
      if (!result.resolved) stats.newEntities++;

      const rel = await this.relationshipResolver.ensureRelationship({
        fromType: 'Product',
        fromName: productName,
        toType: 'Audience',
        toName: name,
        relType: 'TARGETS',
        reason: `Product ${productName} targets audience ${name}`,
        sources: ['productIntelligence'],
        chatId: request?.chatId,
      });
      if (rel.success) stats.relationshipsCreated++;
    }
  }

  async getHealthReport() {
    return this.graphHealth.report();
  }

  // GraphEngine.health() calls service.health() — keep both names working.
  async health() {
    return this.getHealthReport();
  }

  getEntityStore() { return this.store; }
  getRelationshipStore() { return this.relationshipStore; }
  getResolver() { return this.resolver; }
  getRelationshipResolver() { return this.relationshipResolver; }
  getTraversal() { return this.traversal; }
  getSearch() { return this.search; }
  getGraphHealth() { return this.graphHealth; }
}
