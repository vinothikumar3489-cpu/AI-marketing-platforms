export class GraphTraversal {
  constructor(entityStore, relationshipStore, relationshipResolver) {
    this._store = entityStore;
    this._relStore = relationshipStore;
    this._relResolver = relationshipResolver;
  }

  async findCompany(name, opts = {}) {
    return this._store.findByTypeAndName('Company', name);
  }

  async findProduct(name, opts = {}) {
    return this._store.findByTypeAndName('Product', name);
  }

  async findCompetitors(productName, opts = {}) {
    const product = await this._store.findByTypeAndName('Product', productName);
    if (!product) return [];

    const { outgoing, incoming } = await this._relStore.findByEntity(product.id, { type: 'COMPETES_WITH' });
    const competitors = [];
    for (const rel of outgoing) competitors.push(rel.to);
    for (const rel of incoming) competitors.push(rel.from);
    return competitors;
  }

  async findAudience(productName, opts = {}) {
    const product = await this._store.findByTypeAndName('Product', productName);
    if (!product) return [];

    const { outgoing } = await this._relStore.findByEntity(product.id, { type: 'TARGETS', direction: 'outgoing' });
    return outgoing.map(r => r.to);
  }

  async findKeywords(productName, opts = {}) {
    const product = await this._store.findByTypeAndName('Product', productName);
    if (!product) return [];

    const { incoming } = await this._relStore.findByEntity(product.id);
    const keywords = incoming
      .filter(r => r.from.type === 'Keyword')
      .map(r => r.from);
    return keywords;
  }

  async findFeatures(productName, opts = {}) {
    const product = await this._store.findByTypeAndName('Product', productName);
    if (!product) return [];

    const { outgoing } = await this._relStore.findByEntity(product.id, { type: 'HAS_FEATURE', direction: 'outgoing' });
    return outgoing.map(r => r.to);
  }

  async findCampaigns(productName, opts = {}) {
    const product = await this._store.findByTypeAndName('Product', productName);
    if (!product) return [];

    const { incoming } = await this._relStore.findByEntity(product.id, { type: 'PROMOTES' });
    return incoming.map(r => r.from);
  }

  async findRelatedEntities(entityId, opts = {}) {
    const { outgoing, incoming } = await this._relStore.findByEntity(entityId, opts);
    const related = [];

    for (const rel of outgoing) {
      related.push({ entity: rel.to, relationship: rel.type, direction: 'outgoing', confidence: rel.confidence });
    }
    for (const rel of incoming) {
      related.push({ entity: rel.from, relationship: rel.type, direction: 'incoming', confidence: rel.confidence });
    }

    related.sort((a, b) => b.confidence - a.confidence);
    return related;
  }

  async shortestPath(fromId, toId, maxDepth = 5) {
    return this._relStore.findPath(fromId, toId, maxDepth);
  }

  async subgraph(entityId, depth = 2, opts = {}) {
    return this._relResolver.getGraph(entityId, depth);
  }

  async findCompanyByProduct(productName) {
    const product = await this._store.findByTypeAndName('Product', productName);
    if (!product) return null;

    const { incoming } = await this._relStore.findByEntity(product.id, { type: 'OWNS', direction: 'incoming' });
    return incoming.length > 0 ? incoming[0].from : null;
  }

  async findProductsByCompany(companyName) {
    const company = await this._store.findByTypeAndName('Company', companyName);
    if (!company) return [];

    const { outgoing } = await this._relStore.findByEntity(company.id, { type: 'OWNS', direction: 'outgoing' });
    return outgoing.map(r => r.to);
  }

  async traverse(query, opts = {}) {
    const results = {};

    const company = await this.findCompany(query, opts);
    if (company) {
      results.company = company;
      results.products = await this.findProductsByCompany(company.name);
      results.competitors = await this.findCompetitors(company.name);
    }

    const product = await this.findProduct(query, opts);
    if (product) {
      results.product = product;
      results.competitors = results.competitors || (await this.findCompetitors(product.name));
      results.audience = await this.findAudience(product.name);
      results.features = await this.findFeatures(product.name);
      results.campaigns = await this.findCampaigns(product.name);
    }

    return results;
  }
}
