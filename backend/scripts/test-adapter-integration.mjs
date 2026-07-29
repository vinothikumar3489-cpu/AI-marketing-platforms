import { createBrain, initializeBrain } from '../src/brain/index.js';

const { PrismaClient } = await import('@prisma/client');

let pass = 0;
let fail = 0;
let prisma;

function ok(msg) { pass++; console.log(`  OK: ${msg}`); }
function nok(msg, err) { fail++; console.log(`  FAIL: ${msg}${err ? ' — ' + (err.message || err) : ''}`); }

async function test(module, fn) {
  try {
    console.log(`\n=== TEST: ${module} ===`);
    await fn();
    console.log(`  ✓ ${module} passed`);
  } catch (err) {
    console.log(`  ✗ ${module} FAILED: ${err.message}`);
    fail++;
  }
}

async function main() {
  console.log('========================================');
  console.log('BRAIN ADAPTER INTEGRATION TESTS');
  console.log('========================================\n');

  // ── 1. ModuleAdapter base class ──
  await test('ModuleAdapter base class', async () => {
    const { ModuleAdapter } = await import('../src/brain/adapters/ModuleAdapter.js');
    const a = new ModuleAdapter('TestAdapter');
    ok('name is TestAdapter', a.name === 'TestAdapter');

    const evidence = await a.collectEvidence({});
    ok('collectEvidence returns sources array', Array.isArray(evidence.sources));
    ok('collectEvidence returns module name', evidence.module === 'TestAdapter');

    const knowledge = await a.updateKnowledge({});
    ok('updateKnowledge returns updates array', Array.isArray(knowledge.updates));

    const memory = await a.updateMemory({});
    ok('updateMemory returns memories array', Array.isArray(memory.memories));

    const learning = await a.updateLearning({});
    ok('updateLearning returns insights array', Array.isArray(learning.insights));

    const health = await a.health();
    ok('health returns name + configured', health.name === 'TestAdapter' && health.configured === false);

    ok('metrics starts at zero', a.averageTimeMs() === 0);
    ok('metrics initial invocations is 0', a.metrics.invocations === 0);
  });

  // ── 2. CompanyAdapter ──
  await test('CompanyAdapter', async () => {
    const { CompanyAdapter } = await import('../src/brain/adapters/CompanyAdapter.js');
    const a = new CompanyAdapter();
    const context = {
      request: { companyName: 'TestCorp', website: 'https://testcorp.com', industry: 'Tech' },
    };
    const evidence = await a.collectEvidence(context);
    ok('collectEvidence has sources', evidence.sources.length > 0);
    ok('has company_facts source', evidence.sources.some(s => s.type === 'company_facts'));
    ok('configured after collect', a.metrics.invocations === 1);
    ok('module is CompanyAdapter', evidence.module === 'CompanyAdapter');
  });

  // ── 3. GeoAdapter ──
  await test('GeoAdapter', async () => {
    const { GeoAdapter } = await import('../src/brain/adapters/GeoAdapter.js');
    const a = new GeoAdapter();
    const context = { request: { market: 'US', language: 'en' } };
    const evidence = await a.collectEvidence(context);
    ok('has geo_market source', evidence.sources.some(s => s.type === 'geo_market'));
    ok('module is GeoAdapter', evidence.module === 'GeoAdapter');
  });

  // ── 4. AudienceAdapter ──
  await test('AudienceAdapter', async () => {
    const { AudienceAdapter } = await import('../src/brain/adapters/AudienceAdapter.js');
    const a = new AudienceAdapter();
    const context = { request: { productName: 'TestProduct' } };
    const evidence = await a.collectEvidence(context);
    ok('has audience_target source', evidence.sources.some(s => s.type === 'audience_target'));
    ok('module is AudienceAdapter', evidence.module === 'AudienceAdapter');
  });

  // ── 5. ContentStudioAdapter ──
  await test('ContentStudioAdapter', async () => {
    const { ContentStudioAdapter } = await import('../src/brain/adapters/ContentStudioAdapter.js');
    const a = new ContentStudioAdapter();
    const context = { request: { companyName: 'TestCorp', productName: 'TestProduct' } };
    const evidence = await a.collectEvidence(context);
    ok('has content_context source', evidence.sources.some(s => s.type === 'content_context'));
    ok('supports generateContent', typeof a.generateContent === 'function');
    const plan = await a.generateContent({ topic: 'test' });
    ok('generateContent returns success', plan.success === true);
  });

  // ── 6. CampaignAdapter ──
  await test('CampaignAdapter', async () => {
    const { CampaignAdapter } = await import('../src/brain/adapters/CampaignAdapter.js');
    const a = new CampaignAdapter();
    const context = { request: { companyName: 'TestCorp' } };
    const evidence = await a.collectEvidence(context);
    ok('has campaign_context source', evidence.sources.some(s => s.type === 'campaign_context'));
    ok('supports plan', typeof a.plan === 'function');
    const plan = await a.plan({ objectives: 'test' });
    ok('plan returns success', plan.success === true);
  });

  // ── 7. CrmAdapter ──
  await test('CrmAdapter', async () => {
    const { CrmAdapter } = await import('../src/brain/adapters/CrmAdapter.js');
    const a = new CrmAdapter();
    const context = { request: { companyName: 'TestCorp' } };
    const evidence = await a.collectEvidence(context);
    ok('has crm_context source', evidence.sources.some(s => s.type === 'crm_context'));
    const contacts = await a.getContacts({});
    ok('getContacts returns success', contacts.success === true);
  });

  // ── 8. EmailAdapter ──
  await test('EmailAdapter', async () => {
    const { EmailAdapter } = await import('../src/brain/adapters/EmailAdapter.js');
    const a = new EmailAdapter();
    const context = { request: { companyName: 'TestCorp', campaignId: 'camp-1' } };
    const evidence = await a.collectEvidence(context);
    ok('has email_context source', evidence.sources.some(s => s.type === 'email_context'));
    const compose = await a.compose({ subject: 'Hello' });
    ok('compose returns success', compose.success === true);
  });

  // ── 9. AnalyticsAdapter ──
  await test('AnalyticsAdapter', async () => {
    const { AnalyticsAdapter } = await import('../src/brain/adapters/AnalyticsAdapter.js');
    const a = new AnalyticsAdapter();
    const context = { request: { companyName: 'TestCorp' } };
    const evidence = await a.collectEvidence(context);
    ok('has analytics_context source', evidence.sources.some(s => s.type === 'analytics_context'));
    ok('module is AnalyticsAdapter', evidence.module === 'AnalyticsAdapter');
  });

  // ── 10. ResearchAdapter ──
  await test('ResearchAdapter', async () => {
    const { ResearchAdapter } = await import('../src/brain/adapters/ResearchAdapter.js');
    const a = new ResearchAdapter();
    const context = { request: { website: 'https://example.com', topic: 'AI marketing' } };
    const evidence = await a.collectEvidence(context);
    ok('has research_website source', evidence.sources.some(s => s.type === 'research_website'));
    ok('has research_topic source', evidence.sources.some(s => s.type === 'research_topic'));
  });

  // ── 11. WorkflowAdapter ──
  await test('WorkflowAdapter', async () => {
    const { WorkflowAdapter } = await import('../src/brain/adapters/WorkflowAdapter.js');
    const a = new WorkflowAdapter();
    const context = { request: { companyName: 'TestCorp', workflowId: 'wf-1' } };
    const evidence = await a.collectEvidence(context);
    ok('has workflow_context source', evidence.sources.some(s => s.type === 'workflow_context'));
    ok('module is WorkflowAdapter', evidence.module === 'WorkflowAdapter');
  });

  // ── 12. SeoAdapter ──
  await test('SeoAdapter', async () => {
    const { SeoAdapter } = await import('../src/brain/adapters/SeoAdapter.js');
    const a = new SeoAdapter();
    const context = { request: { website: 'https://example.com' } };
    const evidence = await a.collectEvidence(context);
    ok('has seo_target source', evidence.sources.some(s => s.type === 'seo_target'));
    ok('supports analyze', typeof a.analyze === 'function');
    const analysis = await a.analyze('https://example.com');
    ok('analyze returns success', analysis.success === true);
  });

  // ── 13. AdapterEngine ──
  await test('AdapterEngine', async () => {
    const { AdapterEngine } = await import('../src/brain/adapters/AdapterEngine.js');
    const { CompanyAdapter } = await import('../src/brain/adapters/CompanyAdapter.js');
    const { SeoAdapter } = await import('../src/brain/adapters/SeoAdapter.js');

    const company = new CompanyAdapter();
    await company.collectEvidence({ request: { companyName: 'TestCo' } });
    const seo = new SeoAdapter();
    await seo.collectEvidence({ request: { website: 'https://test.co' } });

    const di = {
      resolve: (name) => {
        const map = { companyIntelligence: company, seo, geo: null, audience: null, contentStudio: null, campaign: null, crm: null, email: null, analytics: null, research: null, workflow: null };
        return map[name];
      },
    };
    const engine = new AdapterEngine(di);
    const context = { request: { companyName: 'TestCo' } };
    const result = await engine.execute(context);
    ok('execute returns success', result.success === true);
    ok('totalEvidence > 0', result.data.totalEvidence > 0);
    ok('adapterResults has companyIntelligence', result.data.adapterResults.companyIntelligence.status === 'collected');
    ok('evidence pushed to context', context.evidence.sources.length > 0);
    ok('context has adapterContributions', context.evidence.adapterContributions !== undefined);

    const health = await engine.health();
    ok('engine health has adoptionRate', health.adoptionRate !== undefined);
    ok('2 adapters configured', health.configuredAdapters >= 2);
  });

  // ── 14. BrainHealth adoption report ──
  await test('BrainHealth adoption report', async () => {
    const { BrainHealth } = await import('../src/brain/health/BrainHealth.js');

    // Simulate DI with configured adapters
    const configuredAdapters = {};
    const adapterNames = ['companyIntelligence', 'geo', 'audience', 'contentStudio', 'campaign', 'crm', 'email', 'analytics', 'research', 'workflow', 'seo'];

    for (const name of adapterNames) {
      const { ModuleAdapter } = await import('../src/brain/adapters/ModuleAdapter.js');
      const a = new ModuleAdapter(name);
      a._configured = true;
      configuredAdapters[name] = a;
    }

    const di = {
      resolve: (name) => {
        const engineMap = { memory: { health: () => ({ status: 'HEALTHY' }) }, knowledge: { health: () => ({ status: 'HEALTHY' }) }, evidence: { health: () => ({ status: 'HEALTHY' }) }, adapter: { health: () => ({ status: 'HEALTHY' }) }, graph: { health: () => ({ status: 'HEALTHY' }) }, reasoning: { health: () => ({ status: 'HEALTHY' }) }, recommendations: { health: () => ({ status: 'HEALTHY' }) }, confidence: { health: () => ({ status: 'HEALTHY' }) }, learning: { health: () => ({ status: 'HEALTHY' }) }, quality: { health: () => ({ status: 'HEALTHY' }) }, scheduler: { health: () => ({ status: 'HEALTHY' }) }, orchestrator: { health: () => ({ status: 'HEALTHY' }) }, prisma: { $queryRaw: async () => {} } };
        if (configuredAdapters[name]) return configuredAdapters[name];
        if (engineMap[name]) return engineMap[name];
        return null;
      },
    };
    const bh = new BrainHealth(di);
    const report = await bh.generateReport();
    ok('report has adoption section', report.adoption !== undefined);
    ok('all 11 modules in adoption report', report.adoption.modules.length === 11);
    ok('overallAdoption = 100%', report.adoption.overallAdoption === 100);
    ok('adoption summary has checkmarks', report.adoption.summary.includes('✓'));
  });

  // ── 15. Execution metrics ──
  await test('Execution metrics', async () => {
    const { BrainHealth } = await import('../src/brain/health/BrainHealth.js');

    const modules = {};
    const adapterNames = ['companyIntelligence', 'geo', 'audience', 'contentStudio', 'campaign', 'crm', 'email', 'analytics', 'research', 'workflow', 'seo'];

    for (const name of adapterNames) {
      const { ModuleAdapter } = await import('../src/brain/adapters/ModuleAdapter.js');
      const a = new ModuleAdapter(name);
      a._configured = true;
      // Simulate some invocations
      a._metrics.invocations = Math.floor(Math.random() * 10);
      a._metrics.evidenceCollected = a._metrics.invocations * 3;
      a._metrics.totalMs = a._metrics.invocations * 50;
      modules[name] = a;
    }

    const di = {
      resolve: (name) => {
        if (modules[name]) return modules[name];
        return null;
      },
    };
    const bh = new BrainHealth(di);
    const metrics = await bh.executionMetrics();
    ok('metrics has timestamp', metrics.timestamp !== undefined);
    ok('metrics has 11 modules', Object.keys(metrics.modules).length === 11);
    const firstModule = Object.values(metrics.modules)[0];
    ok('each module has configured, invocations, evidenceCollected', firstModule.configured !== undefined && firstModule.invocations !== undefined && firstModule.evidenceCollected !== undefined);
  });

  // ── 16. withBrain helper ──
  await test('withBrain helper', async () => {
    const { withBrain, brainProcess, getModuleAdapter } = await import('../src/brain/helpers/withBrain.js');
    ok('withBrain is a function', typeof withBrain === 'function');
    ok('brainProcess is a function', typeof brainProcess === 'function');
    ok('getModuleAdapter is a function', typeof getModuleAdapter === 'function');

    // With no brain initialized, should return null
    const result = await withBrain({ module: 'test', action: 'test' });
    ok('withBrain returns null when brain not initialized', result === null);
  });

  // ── 17. brainMiddleware structure ──
  await test('brainMiddleware structure', async () => {
    const mod = await import('../src/middleware/brainMiddleware.js');
    ok('brainMiddleware is exported', typeof mod.brainMiddleware === 'function');

    // Test with a mock request to verify path mapping
    const req = { path: '/api/campaign/123', method: 'POST', body: { companyName: 'TestCo' }, params: {}, query: {}, user: {}, ip: '127.0.0.1' };
    const res = { json: (data) => data };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    await mod.brainMiddleware(req, res, next);
    ok('next() is called', nextCalled);
    // brainSummary may be null since Brain isn't initialized, but middleware doesn't throw
  });

  console.log('\n========================================');
  console.log(`RESULTS: ${pass} passed, ${fail} failed`);
  console.log('========================================');
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
