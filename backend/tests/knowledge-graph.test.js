import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { EntityStore } from '../src/brain/graph/EntityStore.js';
import { RelationshipStore } from '../src/brain/graph/RelationshipStore.js';
import { EntityResolver } from '../src/brain/graph/EntityResolver.js';
import { RelationshipResolver } from '../src/brain/graph/RelationshipResolver.js';
import { GraphHealth } from '../src/brain/graph/GraphHealth.js';
import { EntityGraphService } from '../src/brain/graph/EntityGraphService.js';
import { GraphEngine } from '../src/brain/graph/GraphEngine.js';

// ---------------------------------------------------------------------------
// Minimal in-memory Prisma stand-in covering only the graph tables.
// ---------------------------------------------------------------------------
class FakeModel {
  constructor(name, db) {
    this.name = name;
    this.db = db;
    this.rows = [];
    this._id = 0;
  }

  _nextId() { return `${this.name}_${++this._id}`; }

  _match(row, where) {
    if (!where) return true;
    for (const [key, value] of Object.entries(where)) {
      if (key === 'OR') {
        if (!value.some(cond => this._match(row, cond))) return false;
        continue;
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if ('contains' in value) {
          const hay = String(row[key] ?? '').toLowerCase();
          if (!hay.includes(String(value.contains).toLowerCase())) return false;
          continue;
        }
        if ('gte' in value) { if ((row[key] ?? -Infinity) < value.gte) return false; continue; }
        if ('lte' in value) { if ((row[key] ?? Infinity) > value.lte) return false; continue; }
        if ('lt' in value) { if ((row[key] ?? Infinity) >= value.lt) return false; continue; }
      }
      if (row[key] !== value) return false;
    }
    return true;
  }

  _sort(rows, orderBy) {
    const [field, dir] = Object.entries(orderBy)[0];
    const sign = dir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => sign * ((a[field] ?? 0) > (b[field] ?? 0) ? 1 : -1));
  }

  _applyData(row, data) {
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && !Array.isArray(value) && ('increment' in value)) {
        row[key] = (row[key] ?? 0) + value.increment;
      } else if (value !== undefined) {
        row[key] = value;
      }
    }
    row.updatedAt = new Date();
    return row;
  }

  async create({ data }) {
    const row = { ...data, id: this._nextId(), createdAt: new Date(), updatedAt: new Date() };
    this.rows.push(row);
    return row;
  }

  async findUnique({ where }) {
    if (where.id) return this.rows.find(r => r.id === where.id) || null;
    if (where.type_canonicalName) {
      const { type, canonicalName } = where.type_canonicalName;
      return this.rows.find(r => r.type === type && r.canonicalName === canonicalName) || null;
    }
    if (where.fromId_toId_type) {
      const { fromId, toId, type } = where.fromId_toId_type;
      return this.rows.find(r => r.fromId === fromId && r.toId === toId && r.type === type) || null;
    }
    return null;
  }

  async findFirst({ where, orderBy }) {
    let rs = this.rows.filter(r => this._match(r, where || {}));
    if (orderBy) rs = this._sort(rs, orderBy);
    return rs[0] || null;
  }

  async findMany({ where, orderBy, take, include }) {
    let rs = this.rows.filter(r => this._match(r, where || {}));
    if (orderBy) rs = this._sort(rs, orderBy);
    if (include) {
      rs = rs.map(r => ({
        ...r,
        ...(include.to ? { to: this.db.graphEntity.rows.find(e => e.id === r.toId) || null } : {}),
        ...(include.from ? { from: this.db.graphEntity.rows.find(e => e.id === r.fromId) || null } : {}),
      }));
    }
    if (take) rs = rs.slice(0, take);
    return rs;
  }

  async update({ where, data }) {
    const row = this.rows.find(r => r.id === where.id);
    if (!row) throw new Error(`update: row not found ${where.id}`);
    return this._applyData(row, data);
  }

  async updateMany({ where, data }) {
    const targets = this.rows.filter(r => this._match(r, where || {}));
    for (const row of targets) this._applyData(row, data);
    return { count: targets.length };
  }

  async delete({ where }) {
    const idx = this.rows.findIndex(r => r.id === where.id);
    if (idx === -1) throw new Error(`delete: row not found ${where.id}`);
    this.rows.splice(idx, 1);
    return {};
  }

  async count({ where } = {}) {
    return this.rows.filter(r => this._match(r, where || {})).length;
  }

  async groupBy({ by, _count, _avg }) {
    const groups = new Map();
    for (const row of this.rows) {
      const key = by.map(f => row[f]).join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const out = [];
    for (const [key, rows] of groups) {
      const item = { _count: {}, _avg: {} };
      by.forEach((f, i) => { item[f] = key.split('|')[i]; });
      if (_count) for (const [f] of Object.entries(_count)) item._count[f] = rows.length;
      if (_avg) for (const [f] of Object.entries(_avg)) item._avg[f] = rows.reduce((s, r) => s + (r[f] ?? 0), 0) / rows.length;
      out.push(item);
    }
    return out;
  }
}

class FakePrisma {
  constructor() {
    this.graphEntity = new FakeModel('GraphEntity', this);
    this.graphRelationship = new FakeModel('GraphRelationship', this);
  }

  async $transaction(fn) {
    return fn(this);
  }
}

function makeDi(fake, overrides = {}) {
  const store = overrides.store || new EntityStore(fake);
  const relStore = overrides.relStore || new RelationshipStore(fake);
  const resolver = overrides.resolver || new EntityResolver(store);
  const relResolver = new RelationshipResolver(store, relStore, resolver);
  const graphHealth = new GraphHealth(store, relStore, resolver);
  const deps = {
    prisma: fake, entityStore: store, relationshipStore: relStore,
    entityResolver: resolver, relationshipResolver: relResolver, graphHealth,
  };
  return {
    store, relStore, resolver, relResolver, graphHealth,
    di: { resolve: key => deps[key] },
  };
}

describe('Knowledge Graph — EntityStore', () => {
  let fake;
  before(() => { fake = new FakePrisma(); });

  test('upsert merges aliases and metadata instead of overwriting', async () => {
    const { EntityStore } = await import('../src/brain/graph/EntityStore.js');
    const store = new EntityStore(fake);

    const e1 = await store.upsert({ type: 'Company', name: 'Acme', canonicalName: 'acme', metadata: { domain: 'acme.com' }, confidence: 0.7 });
    const e2 = await store.upsert({ type: 'Company', name: 'Acme Inc', canonicalName: 'acme', metadata: { industry: 'SaaS' }, confidence: 0.8 });

    assert.equal(e2.id, e1.id, 'same canonical name must reuse the entity');
    assert.deepEqual(e2.aliases, ['Acme', 'Acme Inc'], 'aliases must accumulate');
    assert.equal(e2.metadata.domain, 'acme.com', 'previous metadata must survive');
    assert.equal(e2.metadata.industry, 'SaaS');
    assert.equal(e2.sourceCount, 2);
    assert.equal(e2.confidence, 0.75, 'confidence bumps by +0.05 per sighting');
  });

  test('confidence never exceeds 1.0', async () => {
    const { EntityStore } = await import('../src/brain/graph/EntityStore.js');
    const store = new EntityStore(fake);
    await store.upsert({ type: 'Product', name: 'Widget', canonicalName: 'widget', confidence: 0.98 });
    const bumped = await store.upsert({ type: 'Product', name: 'Widget', canonicalName: 'widget', confidence: 0.99 });
    assert.equal(bumped.confidence, 1.0);
  });

  test('mergeDuplicates merges relationship evidence instead of dropping it', async () => {
    const { EntityStore } = await import('../src/brain/graph/EntityStore.js');
    const store = new EntityStore(fake);

    const company = await store.upsert({ type: 'Company', name: 'Acme', canonicalName: 'acme', confidence: 0.8 });
    const primary = await store.upsert({ type: 'Product', name: 'Widget', canonicalName: 'widget', confidence: 0.9 });
    const dup = await store.upsert({ type: 'Product', name: 'Widget Pro', canonicalName: 'widgetpro', confidence: 0.7 });

    await fake.graphRelationship.create({ data: { fromId: company.id, toId: primary.id, type: 'OWNS', sources: ['s1'], confidence: 0.7, evidenceCount: 1 } });
    await fake.graphRelationship.create({ data: { fromId: company.id, toId: dup.id, type: 'OWNS', sources: ['s2'], confidence: 0.9, evidenceCount: 3 } });

    const merged = await store.mergeDuplicates(primary.id, dup.id);

    assert.equal(merged.id, primary.id);
    assert.equal(merged.aliases.includes('Widget Pro'), true, 'duplicate name joins primary aliases');
    assert.ok(!fake.graphEntity.rows.find(e => e.id === dup.id), 'duplicate entity deleted');

    const rels = fake.graphRelationship.rows.filter(r => r.type === 'OWNS');
    assert.equal(rels.length, 1, 'relationships must collapse to a single edge');
    assert.equal(rels[0].evidenceCount, 4, 'evidence counts must merge (1 + 3)');
    assert.deepEqual(rels[0].sources, ['s1', 's2'], 'sources must union');
    assert.equal(rels[0].confidence, 0.95, 'max(0.9, 0.7) + 0.05 = 0.95, within float precision');
    assert.ok(Math.abs(rels[0].confidence - 0.95) < 1e-9);
    assert.equal(rels[0].toId, primary.id, 'edge must point at the primary');
  });

  test('decayConfidence fades stale knowledge', async () => {
    const { EntityStore } = await import('../src/brain/graph/EntityStore.js');
    const store = new EntityStore(fake);
    const stale = await fake.graphEntity.create({
      data: {
        type: 'Company', name: 'Old Co', canonicalName: 'oldco', aliases: ['Old Co'],
        confidence: 0.8, sourceCount: 1, lastSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    });
    const fresh = await fake.graphEntity.create({
      data: {
        type: 'Company', name: 'New Co', canonicalName: 'newco', aliases: ['New Co'],
        confidence: 0.8, sourceCount: 1, lastSeen: new Date(),
      },
    });

    const updated = await store.decayConfidence({ thresholdDays: 14, factor: 0.5 });
    assert.equal(updated, 1, 'only the stale entity decays');
    assert.equal((await store.findById(stale.id)).confidence, 0.4);
    assert.equal((await store.findById(fresh.id)).confidence, 0.8);
  });
});

describe('Knowledge Graph — RelationshipStore', () => {
  test('sources union on repeated sightings', async () => {
    const { EntityStore } = await import('../src/brain/graph/EntityStore.js');
    const { RelationshipStore } = await import('../src/brain/graph/RelationshipStore.js');
    const fake = new FakePrisma();
    const store = new EntityStore(fake);
    const relStore = new RelationshipStore(fake);

    const a = await store.upsert({ type: 'Company', name: 'A', canonicalName: 'a' });
    const b = await store.upsert({ type: 'Product', name: 'B', canonicalName: 'b' });

    const r1 = await relStore.upsert({ fromId: a.id, toId: b.id, type: 'OWNS', sources: ['evidence'] });
    const r2 = await relStore.upsert({ fromId: a.id, toId: b.id, type: 'OWNS', sources: ['productProfile'] });

    assert.equal(r2.id, r1.id);
    assert.deepEqual(r2.sources, ['evidence', 'productProfile'], 'provenance must never be lost');
    assert.equal(r2.evidenceCount, 2);
  });
});

describe('Knowledge Graph — RelationshipResolver', () => {
  test('ensureRelationship resolves variant spellings (fuzzy linking)', async () => {
    const { EntityStore } = await import('../src/brain/graph/EntityStore.js');
    const { RelationshipStore } = await import('../src/brain/graph/RelationshipStore.js');
    const { EntityResolver } = await import('../src/brain/graph/EntityResolver.js');
    const { RelationshipResolver } = await import('../src/brain/graph/RelationshipResolver.js');
    const fake = new FakePrisma();
    const store = new EntityStore(fake);
    const relStore = new RelationshipStore(fake);
    const resolver = new EntityResolver(store);
    const relResolver = new RelationshipResolver(store, relStore, resolver);

    const company = await store.upsert({ type: 'Company', name: 'Acme Inc', canonicalName: 'acmeinc' });
    await store.upsert({ type: 'Product', name: 'Widget', canonicalName: 'widget' });

    const res = await relResolver.ensureRelationship({
      fromType: 'Company', fromName: 'Acme', toType: 'Product', toName: 'Widget', relType: 'OWNS',
    });

    assert.equal(res.success, true, 'relationship must link to the fuzzy-matched entity');
    assert.equal(res.from.id, company.id);
    assert.equal(res.relationship.fromId, company.id);
  });

  test('resolveConflicts no longer throws and reports totals', async () => {
    const { EntityStore } = await import('../src/brain/graph/EntityStore.js');
    const { RelationshipStore } = await import('../src/brain/graph/RelationshipStore.js');
    const { RelationshipResolver } = await import('../src/brain/graph/RelationshipResolver.js');
    const fake = new FakePrisma();
    const store = new EntityStore(fake);
    const relStore = new RelationshipStore(fake);
    const relResolver = new RelationshipResolver(store, relStore);

    const a = await store.upsert({ type: 'Company', name: 'A', canonicalName: 'a' });
    const b = await store.upsert({ type: 'Company', name: 'B', canonicalName: 'b' });
    const c = await store.upsert({ type: 'Product', name: 'C', canonicalName: 'c' });

    await relStore.upsert({ fromId: a.id, toId: c.id, type: 'OWNS' });
    await relStore.upsert({ fromId: b.id, toId: c.id, type: 'OWNS' });

    const result = await relResolver.resolveConflicts(c.id);
    assert.equal(result.total, 2, 'must count all incident edges without throwing');
    assert.ok(Array.isArray(result.conflicts));

    // Duplicate edges of the same type to the same target are a real conflict
    // (unique constraints prevent them, but a legacy/imported row would trigger).
    const d = await store.upsert({ type: 'Product', name: 'D', canonicalName: 'd' });
    await fake.graphRelationship.create({ data: { fromId: a.id, toId: d.id, type: 'OWNS', sources: ['legacy'] } });
    await fake.graphRelationship.create({ data: { fromId: a.id, toId: d.id, type: 'OWNS', sources: ['legacy2'] } });
    const conflictResult = await relResolver.resolveConflicts(d.id);
    assert.equal(conflictResult.total, 2);
    assert.ok(conflictResult.conflicts.some(x => x.type === 'OWNS' && x.action === 'dedup_needed'));
  });
});

describe('Knowledge Graph — duplicate detection', () => {
  test('detectDuplicates matches via aliases and website metadata', async () => {
    const { EntityStore } = await import('../src/brain/graph/EntityStore.js');
    const { EntityResolver } = await import('../src/brain/graph/EntityResolver.js');
    const fake = new FakePrisma();
    const store = new EntityStore(fake);
    const resolver = new EntityResolver(store);

    const a = await store.upsert({ type: 'Competitor', name: 'Rival', canonicalName: 'rival', metadata: { website: 'https://rival.com' } });
    const b = await store.upsert({ type: 'Competitor', name: 'Rival Inc', canonicalName: 'rivalinc', metadata: { website: 'https://rival.com' } });

    const groups = await resolver.detectDuplicates('Competitor', 50);
    assert.equal(groups.length, 1, 'shared website must flag a duplicate group');
    assert.ok(groups[0].some(e => e.id === a.id) && groups[0].some(e => e.id === b.id));

    const c = await store.upsert({ type: 'Company', name: 'AlphaCorp', canonicalName: 'alphacorp' });
    const d = await store.upsert({ type: 'Company', name: 'BetaCorp', canonicalName: 'betacorp' });
    await store.addAlias(d.id, 'AlphaCorp');
    const companyGroups = await resolver.detectDuplicates('Company', 50);
    assert.ok(
      companyGroups.some(g => g.some(e => e.id === c.id) && g.some(e => e.id === d.id)),
      'aliases must group duplicates even when canonical names differ'
    );
  });
});

describe('Knowledge Graph — EntityGraphService extraction pipeline', () => {
  function buildContext(overrides = {}) {
    return {
      request: { chatId: 'chat1', userId: 'user1', companyName: 'Acme', productName: 'Widget' },
      knowledge: {
        company: { name: 'Acme', domain: 'acme.com', industry: 'SaaS', source: 'request' },
        product: { name: 'Widget', source: 'request', existsInMemory: true, inSeoMemory: false },
        competitors: {
          count: 1,
          entities: [{ type: 'competitor', name: 'Rival Co', website: 'https://rival.com', source: 'competitorIntelligence' }],
          sources: ['competitorIntelligence'],
        },
        keywords: {
          count: 1,
          hasKeywords: true,
          source: 'seoIntelligence',
          entities: [{ type: 'keyword', value: 'saas automation', source: 'seoIntelligence', category: 'primary' }],
        },
        audience: { present: true, source: 'productIntelligence' },
      },
      memory: {
        sections: {
          product: {
            data: {
              productName: 'Widget',
              productAnalysis: { features: ['Sync', 'Reports'], benefits: ['Speed'] },
              audienceIntelligence: { primaryAudience: 'CTO', buyerPersonas: [{ name: 'Ops Lead' }], painPoints: ['slow onboarding'] },
            },
          },
        },
      },
      evidence: {
        product: { name: 'Widget', hasAnalysis: true },
        sources: [{ type: 'product', subType: 'memory', value: 'Widget' }],
        gaps: [],
      },
      ...overrides,
    };
  }

  test('extracts features, keywords, pain points, audience and links them', async () => {
    const fake = new FakePrisma();
    const { EntityGraphService } = await import('../src/brain/graph/EntityGraphService.js');
    const built = makeDi(fake);
    const service = new EntityGraphService(built.di);

    const stats = await service.updateFromEvidence(buildContext());

    assert.deepEqual(stats.errors, [], 'no step may fail');
    assert.ok(stats.newEntities >= 5);

    const features = fake.graphEntity.rows.filter(e => e.type === 'Feature');
    assert.ok(features.length >= 2, `expected >=2 features, got ${features.length}`);
    assert.ok(fake.graphEntity.rows.find(e => e.type === 'Keyword' && e.canonicalName === 'saasautomation'), 'keyword extracted');
    assert.ok(fake.graphEntity.rows.find(e => e.type === 'PainPoint'), 'pain point extracted');
    assert.ok(fake.graphEntity.rows.find(e => e.type === 'Audience'), 'audience extracted');

    const relTypes = new Set(fake.graphRelationship.rows.map(r => r.type));
    assert.ok(relTypes.has('OWNS'), 'company owns product');
    assert.ok(relTypes.has('COMPETES_WITH'));
    assert.ok(relTypes.has('BELONGS_TO'), 'competitor website linked');
    assert.ok(relTypes.has('HAS_FEATURE'));
    assert.ok(relTypes.has('CONNECTS_TO'), 'keyword linked to product');
    assert.ok(relTypes.has('SOLVED_BY'), 'pain point linked to product');
    assert.ok(relTypes.has('TARGETS'), 'audience linked to product');

    const comp = fake.graphEntity.rows.find(e => e.type === 'Competitor');
    assert.equal(comp.chatId, 'chat1', 'competitors must be chat-scoped');
    assert.equal(comp.metadata.website, 'https://rival.com');
  });

  test('a failing step does not abort the rest of the pipeline', async () => {
    const fake = new FakePrisma();
    const built = makeDi(fake);
    const { EntityResolver } = await import('../src/brain/graph/EntityResolver.js');

    class FeatureThrower extends EntityResolver {
      async resolveOrCreate(type, name, opts) {
        if (type === 'Feature') throw new Error('boom');
        return super.resolveOrCreate(type, name, opts);
      }
    }
    const throwing = new FeatureThrower(built.store);
    const rebuilt = makeDi(fake, { store: built.store, relStore: built.relStore, resolver: throwing });

    const service = new EntityGraphService(rebuilt.di);

    const stats = await service.updateFromEvidence(buildContext());

    assert.ok(stats.errors.some(e => e.step === 'features' && e.error === 'boom'), 'feature failure recorded');
    assert.ok(fake.graphEntity.rows.find(e => e.type === 'Company'), 'company still extracted');
    assert.ok(fake.graphRelationship.rows.some(r => r.type === 'OWNS'), 'relationships still created');
    assert.ok(fake.graphEntity.rows.find(e => e.type === 'Keyword'), 'keywords still extracted');
  });

  test('orphan products from evidence sources get linked to the company', async () => {
    const fake = new FakePrisma();
    const built = makeDi(fake);
    const { EntityGraphService } = await import('../src/brain/graph/EntityGraphService.js');
    const service = new EntityGraphService(built.di);

    const context = buildContext({
      evidence: {
        sources: [{ type: 'product', subType: 'memory', value: 'SideProduct' }],
      },
    });
    await service.updateFromEvidence(context);

    const side = fake.graphEntity.rows.find(e => e.type === 'Product' && e.canonicalName === 'sideproduct');
    assert.ok(side, 'evidence-sourced product extracted');
    assert.ok(fake.graphRelationship.rows.some(r => r.type === 'OWNS' && r.toId === side.id), 'orphan linked via OWNS');
  });
});

describe('Knowledge Graph — health and engine integration', () => {
  test('GraphEngine.health works once the service exposes health()', async () => {
    const fake = new FakePrisma();
    const built = makeDi(fake);
    const { EntityGraphService } = await import('../src/brain/graph/EntityGraphService.js');
    const { GraphEngine } = await import('../src/brain/graph/GraphEngine.js');

    const service = new EntityGraphService(built.di);
    const engine = new GraphEngine();
    engine.setGraphService(service);

    const report = await engine.health();
    assert.equal(report.status, 'HEALTHY');
    assert.ok(report.summary && typeof report.summary.totalEntities === 'number');
  });

  test('GraphEngine.execute persists graph state and reports stats', async () => {
    const fake = new FakePrisma();
    const built = makeDi(fake);
    const { EntityGraphService } = await import('../src/brain/graph/EntityGraphService.js');
    const { GraphEngine } = await import('../src/brain/graph/GraphEngine.js');

    const service = new EntityGraphService(built.di);
    const engine = new GraphEngine();
    engine.setGraphService(service);

    const context = {
      requestId: 'test-1',
      request: { chatId: 'c1', userId: 'u1', companyName: 'Acme', productName: 'Widget' },
      knowledge: { company: { name: 'Acme' }, product: { name: 'Widget' } },
      memory: { sections: {} },
      evidence: {},
    };
    const res = await engine.execute(context);

    assert.equal(res.success, true);
    assert.equal(context.graph.update, 'completed');
    assert.ok(context.graph.newEntities >= 2);
  });
});

describe('Knowledge Graph — duplicate implementations', () => {
  test('content-evidence-graph.service delegates to the single implementation', async () => {
    const [{ buildEvidenceGraph: a }, { buildEvidenceGraph: b }] = await Promise.all([
      import('../src/services/normalizers/evidence-graph.js'),
      import('../src/services/execution/content-evidence-graph.service.js'),
    ]);
    assert.equal(b, a, 'both modules must expose the same function');
  });
});
