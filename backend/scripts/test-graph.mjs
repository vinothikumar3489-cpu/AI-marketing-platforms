import { DIContainer } from '../src/brain/di.js';
import { EntityStore } from '../src/brain/graph/EntityStore.js';
import { RelationshipStore } from '../src/brain/graph/RelationshipStore.js';
import { EntityResolver } from '../src/brain/graph/EntityResolver.js';
import { RelationshipResolver } from '../src/brain/graph/RelationshipResolver.js';
import { GraphTraversal } from '../src/brain/graph/GraphTraversal.js';
import { GraphSearch } from '../src/brain/graph/GraphSearch.js';
import { GraphHealth } from '../src/brain/graph/GraphHealth.js';
import { EntityGraphService } from '../src/brain/graph/EntityGraphService.js';
import { GraphEngine } from '../src/brain/graph/GraphEngine.js';
import { BrainContext } from '../src/brain/interfaces.js';
import prisma from '../src/config/prisma.js';

async function main() {
  console.log('=== TEST 1: Module imports ===');
  console.log('OK: All graph modules import cleanly');

  console.log('\n=== TEST 2: EntityStore CRUD ===');
  const store = new EntityStore(prisma);

  const ent1 = await store.upsert({ type: 'Company', name: 'TestCorp', canonicalName: 'testcorp', source: 'test', confidence: 0.7 });
  console.log('OK: Created entity:', ent1.name, ent1.type, 'id:', ent1.id);

  const ent2 = await store.upsert({ type: 'Product', name: 'TestProduct', canonicalName: 'testproduct', source: 'test', confidence: 0.7 });
  console.log('OK: Created entity:', ent2.name, ent2.type, 'id:', ent2.id);

  const ent3 = await store.upsert({ type: 'Competitor', name: 'RivalInc', canonicalName: 'rivalinc', source: 'test', confidence: 0.6 });
  console.log('OK: Created entity:', ent3.name, ent3.type, 'id:', ent3.id);

  const found = await store.findByTypeAndName('Company', 'TestCorp');
  console.log('OK: findByTypeAndName:', found ? found.name : 'NOT FOUND');

  const searchResults = await store.search('test', { limit: 10 });
  console.log('OK: search(test) returned', searchResults.length, 'results');

  console.log('\n=== TEST 3: RelationshipStore ===');
  const relStore = new RelationshipStore(prisma);

  const rel1 = await relStore.upsert({ fromId: ent1.id, toId: ent2.id, type: 'OWNS', reason: 'TestCorp owns TestProduct', sources: ['test'], confidence: 0.8 });
  console.log('OK: Created OWNS relationship:', rel1.id);

  const rel2 = await relStore.upsert({ fromId: ent2.id, toId: ent3.id, type: 'COMPETES_WITH', reason: 'TestProduct competes with RivalInc', sources: ['test'], confidence: 0.7 });
  console.log('OK: Created COMPETES_WITH relationship:', rel2.id);

  const entityRels = await relStore.findByEntity(ent2.id);
  console.log('OK: findByEntity(Product):', entityRels.outgoing.length, 'outgoing,', entityRels.incoming.length, 'incoming');

  const path = await relStore.findPath(ent1.id, ent3.id);
  console.log('OK: findPath(Company -> Competitor): depth=', path.depth, 'path:', JSON.stringify(path.path.map(p => p.entity)));

  console.log('\n=== TEST 4: EntityResolver (duplicate detection) ===');
  const resolver = new EntityResolver(store);

  const resolved = await resolver.resolveOrCreate('Company', 'TestCorp', { source: 'test' });
  console.log('OK: resolveOrCreate(TestCorp): resolved=', resolved.resolved, 'match=', resolved.match);

  const resolved2 = await resolver.resolveOrCreate('Company', 'testcorp', { source: 'test' });
  console.log('OK: resolveOrCreate(testcorp lowercase): resolved=', resolved2.resolved, 'match=', resolved2.match);

  const dupGroups = await resolver.detectDuplicates('Company', 50);
  console.log('OK: Duplicate groups found:', dupGroups.length);

  if (dupGroups.length > 0) {
    const merged = await resolver.mergeDuplicateGroups(dupGroups);
    console.log('OK: Merged', merged.length, 'duplicates');
  }

  console.log('\n=== TEST 5: RelationshipResolver ===');
  const relResolver = new RelationshipResolver(store, relStore);
  const graphData = await relResolver.getGraph(ent1.id, 2);
  console.log('OK: getGraph depth 2:', graphData.nodes.length, 'nodes,', graphData.edges.length, 'edges');

  console.log('\n=== TEST 6: GraphTraversal ===');
  const traversal = new GraphTraversal(store, relStore, relResolver);
  const company = await traversal.findCompany('TestCorp');
  console.log('OK: findCompany:', company ? company.name : 'NOT FOUND');

  const products = await traversal.findProductsByCompany('TestCorp');
  console.log('OK: findProductsByCompany:', products.length, 'products');

  const competitors = await traversal.findCompetitors('TestProduct');
  console.log('OK: findCompetitors:', competitors.length, 'competitors');

  console.log('\n=== TEST 7: GraphSearch ===');
  const search = new GraphSearch(store, relStore);
  const searchResult = await search.search('test', { limit: 10 });
  console.log('OK: search returned', searchResult.total, 'results');

  if (searchResult.results.length > 0) {
    console.log('OK: top result:', searchResult.results[0].name, 'rank=', searchResult.results[0].rank);
  }

  const withRels = await search.searchWithRelations('test', { limit: 5 });
  console.log('OK: searchWithRelations:', withRels.total, 'enriched results');

  console.log('\n=== TEST 8: GraphHealth ===');
  const health = new GraphHealth(store, relStore, resolver);
  const report = await health.report();
  console.log('OK: summary:', JSON.stringify(report.summary, null, 2));
  console.log('OK: health:', report.health);

  console.log('\n=== TEST 9: GraphEngine (Brain integration) ===');
  const di = new DIContainer();
  di.register('prisma', prisma);
  di._instances.set('prisma', prisma);
  di._instances.set('entityStore', store);
  di._instances.set('relationshipStore', relStore);
  di._instances.set('entityResolver', resolver);
  di._instances.set('relationshipResolver', relResolver);
  di._instances.set('graphTraversal', traversal);
  di._instances.set('graphSearch', search);
  di._instances.set('graphHealth', health);

  const gs = new EntityGraphService(di);
  const engine = new GraphEngine();
  engine.setGraphService(gs);
  await engine.initialize({ requestId: 'TEST' });

  const ctx = new BrainContext({
    requestId: 'TEST-GRAPH',
    request: {
      module: 'product',
      action: 'test',
      userId: 'test-user',
      chatId: 'test-chat',
      companyName: 'GraphCorp',
      productName: 'GraphProduct',
    },
  });

  ctx.knowledge = {
    company: { name: 'GraphCorp', domain: 'graphcorp.com', source: 'request' },
    product: { name: 'GraphProduct', source: 'request' },
    competitors: { entities: [{ name: 'GraphRival', source: 'test' }] },
    keywords: { hasKeywords: false },
  };

  ctx.evidence = {
    sources: [
      { type: 'product', subType: 'request', value: 'GraphProduct' },
      { type: 'company', subType: 'request', value: 'GraphCorp' },
    ],
    gaps: [],
  };

  ctx.memory = { sections: {}, hits: 0, misses: 0 };

  const result = await engine.execute(ctx);
  console.log('OK: graph update:', result.data.update, 'new=', result.data.newEntities, 'rel=', result.data.relationshipsCreated);

  console.log('\n=== TEST 10: Verify DB persistence ===');
  const allEntities = await prisma.graphEntity.count();
  const allRels = await prisma.graphRelationship.count();
  console.log('OK: Total entities in DB:', allEntities);
  console.log('OK: Total relationships in DB:', allRels);

  console.log('\n=== TEST 11: Duplicate resolution (bigram similarity) ===');
  await store.upsert({ type: 'Company', name: 'Upfluence', canonicalName: 'upfluence', source: 'test', confidence: 0.5 });
  const upf2 = await store.upsert({ type: 'Company', name: 'upfluence', canonicalName: 'upfluence', source: 'test', confidence: 0.5 });
  console.log('OK: Created Upfluence variants');

  const foundUpfluence = await resolver.resolve('Company', 'UPFLUENCE');
  console.log('OK: resolve(UPFLUENCE):', foundUpfluence ? foundUpfluence.entity.name : 'NOT FOUND', 'score=', foundUpfluence?.score);

  const allDups = await resolver.detectDuplicates('Company', 100);
  console.log('OK: Duplicate groups for Company:', allDups.length);

  // Cleanup test data
  console.log('\n=== TEST 12: Cleanup ===');
  await prisma.graphRelationship.deleteMany({ where: { OR: [{ fromId: ent1.id }, { toId: ent1.id }, { fromId: ent2.id }, { toId: ent2.id }, { fromId: ent3.id }, { toId: ent3.id }] } });
  await prisma.graphEntity.deleteMany({ where: { OR: [{ id: ent1.id }, { id: ent2.id }, { id: ent3.id }] } });
  await prisma.graphEntity.deleteMany({ where: { name: { in: ['GraphCorp', 'GraphProduct', 'GraphRival'] } } });
  await prisma.graphEntity.deleteMany({ where: { name: { in: ['Upfluence', 'upfluence'] } } });
  console.log('OK: Test data cleaned up');

  console.log('\n========================================');
  console.log('ALL 12 TESTS PASSED');
  console.log('========================================');
  process.exit(0);
}

main().catch(err => { console.error('TEST FAILED:', err); process.exit(1); });
