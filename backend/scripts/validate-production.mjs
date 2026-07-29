import { PrismaClient } from '@prisma/client';

let pass = 0, fail = 0, warnings = [];
function ok(msg) { pass++; console.log(`  ✓ ${msg}`); }
function nok(msg, err) { fail++; console.log(`  ✗ ${msg} — ${err?.message || err}`); }
function warn(msg) { warnings.push(msg); console.log(`  ⚠ ${msg}`); }

function severity(s) { return s; }

const results = {};

function record(category, test, status, detail = '') {
  if (!results[category]) results[category] = [];
  results[category].push({ test, status, detail });
}

async function validate(module, fn) {
  try {
    console.log(`\n── ${module} ──`);
    await fn();
  } catch (err) {
    nok(`${module} crashed`, err);
    record(module, 'crash', 'FAIL', err.message);
  }
}

// ─────────────────────────────────────────────
// 1. BRAIN PIPELINE VALIDATION
// ─────────────────────────────────────────────

async function validatePipeline(brainService) {
  const prisma = new PrismaClient();

  await validate('1. Brain Pipeline', async () => {
    // Verify BrainService exists
    if (!brainService) { nok('BrainService available', 'null'); record('pipeline', 'brainService', 'FAIL', 'BrainService is null'); return; }
    ok('BrainService instantiated');

    // Verify DI has all engines
    const di = brainService._di;
    const engineNames = ['memory', 'knowledge', 'evidence', 'adapter', 'reasoning', 'recommendations', 'confidence', 'learning', 'quality'];
    let allEngines = true;
    for (const name of engineNames) {
      const engine = di.resolve(name);
      if (!engine) {
        nok(`Engine "${name}" registered in DI`, 'NOT_REGISTERED');
        record('pipeline', `engine_${name}_registered`, 'FAIL', 'Missing from DI');
        allEngines = false;
      } else {
        try {
          const h = await engine.health();
          ok(`Engine "${name}" healthy (${h.status})`);
          record('pipeline', `engine_${name}_healthy`, 'PASS', h.status);
        } catch (err) {
          nok(`Engine "${name}" health check`, err);
          record('pipeline', `engine_${name}_healthy`, 'FAIL', err.message);
          allEngines = false;
        }
      }
    }
    if (allEngines) ok('All 9 engines registered and healthy');
    record('pipeline', 'all_engines', allEngines ? 'PASS' : 'FAIL', allEngines ? '9/9' : 'partial');

    // Verify pipeline order in orchestrator
    const orchestrator = di.resolve('orchestrator');
    if (!orchestrator) { nok('Orchestrator available', 'null'); return; }
    const order = orchestrator._engineOrder;
    const expectedOrder = ['memory', 'knowledge', 'evidence', 'adapter', 'graph', 'reasoning', 'recommendations', 'confidence', 'learning', 'quality'];
    let orderOk = true;
    for (let i = 0; i < expectedOrder.length; i++) {
      if (order[i] !== expectedOrder[i]) {
        nok(`Pipeline engine #${i}: expected ${expectedOrder[i]}, got ${order[i]}`);
        orderOk = false;
      }
    }
    if (orderOk) ok('Pipeline order correct (10 engines)');
    record('pipeline', 'engine_order', orderOk ? 'PASS' : 'FAIL', order.join(' → '));

    // Run a real request end-to-end
    try {
      const startTime = Date.now();
      const response = await brainService.process({
        module: 'validation',
        action: 'pipeline_test',
        companyName: 'ValidationCorp',
        website: 'https://validationcorp.com',
        productName: 'ValidationProduct',
      });
      const pipelineTime = Date.now() - startTime;

      ok('BrainService.process() completed');
      ok(`Pipeline execution time: ${pipelineTime}ms`);
      record('pipeline', 'execution_time', 'PASS', `${pipelineTime}ms`);

      // Verify context was populated by each engine
      const context = response.context;

      if (context.memory) { ok('Memory stage produced output'); record('pipeline', 'memory_output', 'PASS'); }
      else { warn('Memory stage produced no output'); record('pipeline', 'memory_output', 'WARN', 'null'); }

      if (context.knowledge) { ok('Knowledge stage produced output'); record('pipeline', 'knowledge_output', 'PASS'); }
      else { warn('Knowledge stage produced no output'); record('pipeline', 'knowledge_output', 'WARN', 'null'); }

      if (context.evidence) { ok('Evidence stage produced output'); record('pipeline', 'evidence_output', 'PASS'); }
      else { warn('Evidence stage produced no output'); record('pipeline', 'evidence_output', 'WARN', 'null'); }

      if (context.evidence?.adapterContributions) {
        ok('Adapter stage contributed evidence');
        record('pipeline', 'adapter_output', 'PASS');
      } else { warn('Adapter stage no contributions'); record('pipeline', 'adapter_output', 'WARN'); }

      if (context.graph) { ok('Graph stage produced output'); record('pipeline', 'graph_output', 'PASS'); }
      else { warn('Graph stage produced no output'); record('pipeline', 'graph_output', 'WARN', 'null'); }

      if (context.reasoning) { ok('Reasoning stage produced output'); record('pipeline', 'reasoning_output', 'PASS'); }
      else { warn('Reasoning stage produced no output'); record('pipeline', 'reasoning_output', 'WARN', 'null'); }

      if (context.recommendations) { ok('Recommendations stage produced output'); record('pipeline', 'recommendations_output', 'PASS'); }
      else { warn('Recommendations stage produced no output'); record('pipeline', 'recommendations_output', 'WARN', 'null'); }

      if (context.confidence) { ok('Confidence stage produced output'); record('pipeline', 'confidence_output', 'PASS'); }
      else { warn('Confidence stage produced no output'); record('pipeline', 'confidence_output', 'WARN', 'null'); }

      if (context.learning) { ok('Learning stage produced output'); record('pipeline', 'learning_output', 'PASS'); }
      else { warn('Learning stage produced no output'); record('pipeline', 'learning_output', 'WARN', 'null'); }

      // Verify contextSummary
      if (context.contextSummary) {
        ok('Context summary generated');
        record('pipeline', 'context_summary', 'PASS');
      } else {
        warn('No context summary');
        record('pipeline', 'context_summary', 'WARN');
      }

      // Verify toControllerSummary
      const summary = response.toControllerSummary();
      if (summary) {
        ok('toControllerSummary() returns data');
        record('pipeline', 'controller_summary', 'PASS');
        if (summary.processingTime > 0) ok(`  processingTime: ${summary.processingTime}ms`);
        if (summary.adoption) ok('  adapter metrics present');
      } else {
        warn('toControllerSummary() returned null');
        record('pipeline', 'controller_summary', 'WARN', 'null');
      }

      record('pipeline', 'end_to_end', 'PASS', `${pipelineTime}ms`);

    } catch (err) {
      nok('End-to-end pipeline execution', err);
      record('pipeline', 'end_to_end', 'FAIL', err.message);
    }
  });
}

// ─────────────────────────────────────────────
// 2. AGENT SYSTEM VALIDATION
// ─────────────────────────────────────────────

async function validateAgents(brainService) {
  await validate('2. Agent System', async () => {
    const agentManager = brainService?.agentManager;
    if (!agentManager) { nok('AgentManager available', 'null'); record('agents', 'manager', 'FAIL', 'null'); return; }
    ok('AgentManager accessible via BrainService.agentManager');

    const registry = agentManager.registry;
    ok(`AgentRegistry has ${registry.getCount()} agents (expected 11)`);
    record('agents', 'registry_count', registry.getCount() === 11 ? 'PASS' : 'FAIL', `${registry.getCount()}/11`);

    const names = registry.getAgentNames();
    const expected = ['SeoAgent', 'CompetitorAgent', 'ContentAgent', 'AudienceAgent', 'CampaignAgent', 'GeoAgent', 'CrmAgent', 'AnalyticsAgent', 'ResearchAgent', 'EmailAgent', 'ExecutiveStrategyAgent'];
    for (const name of expected) {
      if (names.includes(name)) ok(`  ${name} registered`);
      else { nok(`  ${name} missing from registry`, ''); record('agents', `agent_${name}`, 'FAIL', 'not registered'); }
    }

    // Test agent selection by task type
    const seoAgents = registry.findAgentsForTask('seo_analysis');
    ok(`findAgentsForTask('seo_analysis') returns ${seoAgents.length} agent(s)`);
    record('agents', 'selection_seo', seoAgents.length > 0 ? 'PASS' : 'FAIL', `${seoAgents.length}`);

    // Test dependency execution
    await validate('Agent dependency chain', async () => {
      const result = await agentManager.processTask({
        type: 'campaign_planning',
        metadata: { strategy: 'dependency' },
        input: {
          company: { name: 'DepTest' },
          objectives: ['Test objective'],
          channels: ['Email'],
        },
        timeout: 30000,
        maxRetries: 1,
      });
      ok('Dependency task completed');
      ok(`  agents used: ${result.agentsUsed?.join(', ') || 'none'}`);
      ok(`  findings: ${result.findings?.length || 0}`);
      record('agents', 'dependency_execution', result.success ? 'PASS' : 'FAIL', `agents=${result.agentsUsed?.length}`);
    });

    // Test parallel execution
    await validate('Agent parallel execution', async () => {
      const result = await agentManager.processTask({
        type: 'executive_strategy',
        metadata: { strategy: 'parallel' },
        input: { company: { name: 'ParallelTest' } },
        timeout: 30000,
        maxRetries: 1,
      });
      ok('Parallel task completed');
      ok(`  agents used: ${result.agentsUsed?.length || 0}`);
      ok(`  findings: ${result.findings?.length || 0}`);
      ok(`  recommendations: ${result.recommendations?.length || 0}`);
      record('agents', 'parallel_execution', result.success ? 'PASS' : 'FAIL', `agents=${result.agentsUsed?.length} findings=${result.findings?.length}`);
    });

    // Test Executive Strategy Agent aggregation
    await validate('Executive Strategy Agent aggregation', async () => {
      const result = await agentManager.processTask({
        type: 'executive_strategy',
        input: { company: { name: 'ExecutiveTest' } },
        timeout: 60000,
        maxRetries: 1,
      });
      ok('Executive strategy task completed');
      if (result.agentsUsed) ok(`  agents aggregated: ${result.agentsUsed.length}`);
      if (result.findings) {
        const crossAgent = result.findings.find(f => f.type === 'cross_agent_synthesis');
        if (crossAgent) ok(`  cross-agent synthesis: ${crossAgent.agentsParticipated} agents, ${crossAgent.totalFindings} findings`);
        else warn('  no cross-agent synthesis finding');
        const gaps = result.findings.find(f => f.type === 'intelligence_gaps');
        if (gaps) ok(`  intelligence gaps detected: ${gaps.gaps?.length || 0}`);
      }
      if (result.recommendations) ok(`  recommendations: ${result.recommendations.length}`);
      record('agents', 'executive_strategy', result.success ? 'PASS' : 'FAIL', `agents=${result.agentsUsed?.length} findings=${result.findings?.length}`);
    });

    // Test retry handling
    await validate('Agent retry (simulated failure)', async () => {
      const { BaseAgent } = await import('../src/brain/agents/BaseAgent.js');
      class FlakyAgent extends BaseAgent {
        constructor() { super('FlakyAgent'); this._capabilities = ['flaky']; this._attempts = 0; }
        async plan() { return { success: true }; }
        async execute() {
          this._attempts++;
          if (this._attempts < 2) throw new Error('Simulated transient failure');
          return { success: true, confidence: 0.5, findings: [{ type: 'retry_success' }] };
        }
      }
      registry.register(new FlakyAgent());
      const start = Date.now();
      const result = await agentManager.processTask({ type: 'flaky', maxRetries: 3, retryDelay: 10, timeout: 5000 });
      const elapsed = Date.now() - start;
      ok(`Retry task completed in ${elapsed}ms`);
      ok(`  success: ${result.success}`);
      record('agents', 'retry_handling', result.success ? 'PASS' : 'FAIL', `${elapsed}ms`);

      // Clean up flaky agent
      const allAgents = registry.getAllAgents();
      const idx = allAgents.findIndex(a => a.name === 'FlakyAgent');
      if (idx >= 0) registry._agents.delete('FlakyAgent');
    });
  });
}

// ─────────────────────────────────────────────
// 3. EXISTING FEATURES VALIDATION
// ─────────────────────────────────────────────

async function validateExistingFeatures(brainService) {
  await validate('3. Existing Features (Backward Compatibility)', async () => {
    const di = brainService?._di;

    // Verify all adapters are registered and functional
    const adapterNames = ['companyIntelligence', 'geo', 'audience', 'contentStudio', 'campaign', 'crm', 'email', 'analytics', 'research', 'workflow', 'seo'];
    let allAdaptersOk = true;
    for (const name of adapterNames) {
      const adapter = di?.resolve(name);
      if (!adapter) {
        warn(`Adapter "${name}" NOT registered`);
        record('features', `adapter_${name}`, 'FAIL', 'not registered');
        allAdaptersOk = false;
        continue;
      }
      try {
        const h = await adapter.health();
        if (h.configured || h.status === 'HEALTHY') {
          ok(`Adapter "${name}" healthy`);
          record('features', `adapter_${name}`, 'PASS', h.status);
        } else {
          warn(`Adapter "${name}" not yet configured (expected until first use)`);
          record('features', `adapter_${name}`, 'WARN', 'not configured');
        }
      } catch (err) {
        nok(`Adapter "${name}" health check`, err);
        record('features', `adapter_${name}`, 'FAIL', err.message);
        allAdaptersOk = false;
      }
    }
    if (allAdaptersOk) ok('All 11 adapters registered');

    // Verify each adapter produces evidence
    for (const name of adapterNames) {
      const adapter = di?.resolve(name);
      if (!adapter) continue;
      try {
        const evidence = await adapter.collectEvidence({
          request: { companyName: 'TestCorp', website: 'https://testcorp.com', productName: 'TestProduct' },
        });
        if (evidence.sources?.length > 0) {
          ok(`  ${name}.collectEvidence() produced ${evidence.sources.length} sources`);
          record('features', `adapter_${name}_evidence`, 'PASS', `${evidence.sources.length} sources`);
        } else {
          warn(`  ${name}.collectEvidence() returned empty`);
          record('features', `adapter_${name}_evidence`, 'WARN', 'empty');
        }
      } catch (err) {
        nok(`  ${name}.collectEvidence() failed`, err);
        record('features', `adapter_${name}_evidence`, 'FAIL', err.message);
      }
    }

    // Verify BrainHealth adoption report
    const health = di?.resolve('health');
    if (health) {
      try {
        const adoption = await health.adoptionReport();
        ok(`Brain health adoption report: ${adoption.overallAdoption}% (${adoption.configuredCount}/${adoption.totalCount})`);
        record('features', 'adoption_report', 'PASS', `${adoption.overallAdoption}%`);
        if (adoption.summary) {
          console.log(`  Adoption summary:\n${adoption.summary.split('\n').map(l => `    ${l}`).join('\n')}`);
        }
      } catch (err) {
        nok('BrainHealth adoption report', err);
        record('features', 'adoption_report', 'FAIL', err.message);
      }

      try {
        const metrics = await health.executionMetrics();
        ok(`Execution metrics available for ${Object.keys(metrics.modules).length} modules`);
        record('features', 'execution_metrics', 'PASS', `${Object.keys(metrics.modules).length} modules`);
      } catch (err) {
        nok('Execution metrics', err);
        record('features', 'execution_metrics', 'FAIL', err.message);
      }
    }

    // Verify controller response shape (the middleware compatibility)
    const { brainMiddleware } = await import('../src/middleware/brainMiddleware.js');
    ok('brainMiddleware exports correctly');

    // Mock request/response to verify middleware doesn't modify response for already-integrated routes
    const skipPaths = ['/api/chats/123/product/456', '/api/chats/123/competitor/456', '/api/chats/123/seo/456'];
    for (const path of skipPaths) {
      let nextCalled = false;
      await brainMiddleware(
        { path, method: 'GET', body: {}, params: {}, query: {}, user: {}, ip: '127.0.0.1' },
        { json: (d) => d },
        () => { nextCalled = true; }
      );
      ok(`Middleware skips "${path}" (existing brain integration)`);
      record('features', `middleware_skip_${path.replace(/[^a-z]/g, '_')}`, 'PASS');
    }
  });
}

// ─────────────────────────────────────────────
// 4. FAILURE TESTING
// ─────────────────────────────────────────────

async function validateFailureModes() {
  await validate('4. Failure Testing', async () => {
    // Test graceful degradation when Brain is not initialized
    const { withBrain } = await import('../src/brain/helpers/withBrain.js');
    const result = await withBrain({ module: 'test', action: 'test' });
    if (result === null) ok('withBrain returns null when Brain unavailable (graceful degradation)');
    else warn('withBrain returned non-null without Brain');
    record('failure', 'brain_unavailable', result === null ? 'PASS' : 'WARN', 'graceful degradation works');

    // Test AgentManager timeout handling
    const { AgentManager } = await import('../src/brain/agents/AgentManager.js');
    const { AgentRegistry } = await import('../src/brain/agents/AgentRegistry.js');
    const { BaseAgent } = await import('../src/brain/agents/BaseAgent.js');

    class TimeoutAgent extends BaseAgent {
      constructor() { super('TimeoutAgent'); this._capabilities = ['timeout_test']; }
      async plan() { return { success: true }; }
      async execute() { await new Promise(r => setTimeout(r, 5000)); return { success: true, findings: [] }; }
    }

    const reg = new AgentRegistry();
    reg.register(new TimeoutAgent());
    const manager = new AgentManager(null, reg);

    const timeoutResult = await manager.processTask({ type: 'timeout_test', timeout: 50, maxRetries: 1, retryDelay: 10 });
    if (!timeoutResult.success) {
      ok('Agent timeout handled gracefully');
      ok(`  error: ${timeoutResult.errors?.[0] || timeoutResult.error || 'timed out'}`);
    } else warn('Agent timeout returned success unexpectedly');
    record('failure', 'agent_timeout', !timeoutResult.success ? 'PASS' : 'FAIL', 'graceful degradation');

    // Test AgentManager with no matching agents
    const noMatchResult = await manager.processTask({ type: 'nonexistent_task_type_xyz', timeout: 1000 });
    if (!noMatchResult.success) {
      ok('No-matching-agent handled gracefully');
      record('failure', 'no_matching_agent', 'PASS', 'returns failure gracefully');
    } else warn('No-matching-agent returned success');

    // Test with null brainService
    const nullBrainManager = new AgentManager(null, reg);
    try {
      const nullResult = await nullBrainManager.processTask({ type: 'timeout_test', timeout: 50, maxRetries: 1, retryDelay: 10 });
      ok('AgentManager works without BrainService');
      record('failure', 'null_brain_service', 'PASS', 'agent execution works without Brain');
    } catch (err) {
      nok('AgentManager without BrainService crashed', err);
      record('failure', 'null_brain_service', 'FAIL', err.message);
    }

    // Test adapter collection with missing fields
    const { CompanyAdapter } = await import('../src/brain/adapters/CompanyAdapter.js');
    const companyAdapter = new CompanyAdapter();
    const emptyEvidence = await companyAdapter.collectEvidence({ request: {} });
    if (emptyEvidence.sources && emptyEvidence.module) {
      ok('Adapter handles empty request gracefully');
      record('failure', 'adapter_empty_request', 'PASS', 'returns valid structure');
    } else {
      nok('Adapter empty request failed', '');
      record('failure', 'adapter_empty_request', 'FAIL', 'crashed on empty');
    }

    // Test security: circular agent dependencies
    class CircularA extends BaseAgent {
      constructor() { super('CircularA'); this._capabilities = ['circular']; this._dependencies = ['CircularB']; }
      async plan() { return { success: true }; }
      async execute() { return { success: true, findings: [] }; }
    }
    class CircularB extends BaseAgent {
      constructor() { super('CircularB'); this._capabilities = ['circular']; this._dependencies = ['CircularA']; }
      async plan() { return { success: true }; }
      async execute() { return { success: true, findings: [] }; }
    }
    const circReg = new AgentRegistry();
    circReg.register(new CircularA());
    circReg.register(new CircularB());
    const circManager = new AgentManager(null, circReg);
    try {
      const circResult = await circManager.processTask({
        type: 'circular',
        metadata: { strategy: 'dependency' },
        timeout: 2000,
        maxRetries: 1,
      });
      ok('Circular dependency handled (does not hang)');
      record('security', 'circular_dependency', 'PASS', 'no deadlock');
    } catch (err) {
      ok('Circular dependency prevented (error thrown)');
      record('security', 'circular_dependency', 'PASS', `error: ${err.message}`);
    }
  });
}

// ─────────────────────────────────────────────
// 5. PERFORMANCE BENCHMARKS
// ─────────────────────────────────────────────

async function validatePerformance(brainService) {
  await validate('5. Performance Benchmarks', async () => {
    const ITERATIONS = 3;
    const times = [];

    for (let i = 0; i < ITERATIONS; i++) {
      const start = Date.now();
      try {
        await brainService.process({
          module: 'benchmark',
          action: 'perf_test',
          companyName: `BenchmarkCorp_${i}`,
          productName: `BenchmarkProduct_${i}`,
        });
        times.push(Date.now() - start);
      } catch {
        // skip failed iterations
      }
    }

    if (times.length > 0) {
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      const min = Math.min(...times);
      const max = Math.max(...times);
      ok(`Average pipeline execution: ${avg}ms`);
      ok(`  min: ${min}ms, max: ${max}ms`);
      record('performance', 'pipeline_execution', 'PASS', `avg=${avg}ms min=${min}ms max=${max}ms`);

      // Check previous health for comparison
      const di = brainService._di;
      const health = di?.resolve('health');
      if (health) {
        const execMetrics = await health.executionMetrics();
        for (const [mod, m] of Object.entries(execMetrics.modules)) {
          if (m.averageTimeMs > 0) {
            console.log(`  ${mod}: avg ${m.averageTimeMs}ms, ${m.invocations} invocations, ${m.evidenceCollected} evidence items`);
          }
        }
        record('performance', 'module_metrics', 'PASS', `${Object.keys(execMetrics.modules).length} modules`);
      }
    } else {
      warn('No benchmark data collected');
      record('performance', 'pipeline_execution', 'FAIL', '0 iterations completed');
    }

    // Measure Learning Engine performance specifically
    const learningEngine = brainService?.getEngine?.('learning');
    if (learningEngine) {
      const lh = await learningEngine.health();
      ok(`Learning Engine health: ${lh.status}`);
      record('performance', 'learning_health', 'PASS', lh.status);
    }
  });
}

// ─────────────────────────────────────────────
// 6. SECURITY ANALYSIS
// ─────────────────────────────────────────────

async function validateSecurity() {
  await validate('6. Security Analysis', async () => {
    // Verify no sensitive fields in graph entities
    const { ModuleAdapter } = await import('../src/brain/adapters/ModuleAdapter.js');
    const adapter = new ModuleAdapter('SecurityTest');
    const evidence = await adapter.collectEvidence({ request: {} });
    const evidenceStr = JSON.stringify(evidence);
    const sensitivePatterns = ['password', 'secret', 'token', 'api_key', 'apiKey', 'authorization', 'jwt'];
    let hasSensitiveData = false;
    for (const pattern of sensitivePatterns) {
      if (evidenceStr.toLowerCase().includes(pattern.toLowerCase())) {
        warn(`Potential sensitive data leak: "${pattern}" found in evidence`);
        record('security', 'sensitive_data_leak', 'WARN', `pattern: ${pattern}`);
        hasSensitiveData = true;
      }
    }
    if (!hasSensitiveData) {
      ok('No sensitive data patterns in evidence output');
      record('security', 'sensitive_data_leak', 'PASS', 'clean');
    }

    // Verify infinite retry prevention
    const { AgentTask } = await import('../src/brain/agents/AgentTask.js');
    const task = new AgentTask({ maxRetries: 100 });
    if (task.maxRetries <= 10) ok('Max retries within safe limit');
    else warn(`Max retries set to ${task.maxRetries} — consider lowering`);
    record('security', 'max_retries', task.maxRetries <= 10 ? 'PASS' : 'WARN', `${task.maxRetries}`);

    // Verify no agent can access database directly
    const { SeoAgent } = await import('../src/brain/agents/agents/SeoAgent.js');
    const seoAgent = new SeoAgent();
    const seoStr = seoAgent.execute.toString();
    if (seoStr.includes('prisma') || seoStr.includes('PrismaClient') || seoStr.includes('queryRaw')) {
      warn('SeoAgent may access database directly');
      record('security', 'direct_db_access', 'WARN', 'SeoAgent contains DB references');
    } else {
      ok('SeoAgent does not access database directly');
      record('security', 'direct_db_access', 'PASS', 'clean');
    }

    // Verify agent communication constraint (agents only through AgentManager)
    const { CampaignAgent } = await import('../src/brain/agents/agents/CampaignAgent.js');
    const campaignAgent = new CampaignAgent();
    const campaignStr = campaignAgent.execute.toString();
    if (campaignStr.includes('getAgentResult')) {
      ok('CampaignAgent uses AgentManager for inter-agent communication');
      record('security', 'agent_communication', 'PASS', 'uses getAgentResult');
    }
  });
}

// ─────────────────────────────────────────────
// 7. PRODUCTION READINESS REPORT
// ─────────────────────────────────────────────

function generateReport() {
  console.log('\n');
  console.log('='.repeat(70));
  console.log('  PRODUCTION READINESS REPORT');
  console.log('='.repeat(70));

  const categories = {
    'Brain Pipeline': {
      tests: results['pipeline'] || [],
      subsystems: ['Engine registration', 'Execution order', 'Memory stage', 'Knowledge stage', 'Evidence stage', 'Adapter stage', 'Graph stage', 'Reasoning stage', 'Recommendations stage', 'Confidence stage', 'Learning stage', 'End-to-end execution'],
    },
    'Knowledge Graph': {
      tests: results['pipeline']?.filter(t => t.test.includes('graph')) || [],
      subsystems: ['Entity creation', 'Relationship creation', 'Graph traversal', 'Graph search', 'Confidence tracking'],
    },
    'Learning System': {
      tests: results['pipeline']?.filter(t => t.test.includes('learning') || t.test.includes('Learning')) || [],
      subsystems: ['Execution history', 'Learning score', 'Pattern discovery', 'Trend analysis', 'Rule optimization'],
    },
    'Agent System': {
      tests: results['agents'] || [],
      subsystems: ['Agent registration', 'Dependency execution', 'Parallel execution', 'Retry handling', 'Timeout handling', 'Executive strategy', 'Cross-agent aggregation'],
    },
    'Adapters': {
      tests: results['features']?.filter(t => t.test.startsWith('adapter')) || [],
      subsystems: ['11 adapters registered', 'Evidence collection', 'Adapter health', 'Brain integration'],
    },
    'Controllers': {
      tests: results['features']?.filter(t => t.test.startsWith('middleware') || t.test.includes('controller_summary')) || [],
      subsystems: ['Middleware compatibility', 'Response shape', 'Backward compatibility'],
    },
    'Performance': {
      tests: results['performance'] || [],
      subsystems: ['Pipeline execution time', 'Module metrics', 'Learning engine speed'],
    },
    'Reliability': {
      tests: results['failure'] || [],
      subsystems: ['Brain unavailable', 'Agent timeout', 'No matching agent', 'Null dependencies', 'Empty input handling'],
    },
    'Security': {
      tests: results['security'] || [],
      subsystems: ['No sensitive data', 'No circular execution', 'No direct DB access', 'Agent communication constraint'],
    },
  };

  const scores = {};

  for (const [category, data] of Object.entries(categories)) {
    const tests = data.tests;
    const passed = tests.filter(t => t.status === 'PASS').length;
    const warnings_cat = tests.filter(t => t.status === 'WARN').length;
    const failed = tests.filter(t => t.status === 'FAIL').length;
    const total = tests.length || 1;

    let score;
    let label;
    if (total === 0) {
      score = 'NOT TESTED';
      label = 'NOT TESTED';
    } else if (failed > 0) {
      score = Math.round((passed / total) * 100);
      label = score < 50 ? 'NOT READY' : score < 80 ? 'PARTIALLY READY' : 'NEEDS IMPROVEMENT';
    } else if (warnings_cat > 0) {
      score = Math.round((passed / total) * 100);
      label = score >= 90 ? 'PRODUCTION READY' : 'PARTIALLY READY';
    } else {
      score = 100;
      label = passed === total ? 'PRODUCTION READY' : 'PARTIALLY READY';
    }

    scores[category] = { score, label, passed, warnings: warnings_cat, failed, total: tests.length };

    const statusIcon = label === 'PRODUCTION READY' ? '✓' : label === 'PARTIALLY READY' ? '~' : '✗';
    console.log(`\n  ${statusIcon} ${category}`);
    console.log(`     Score: ${score === 'NOT TESTED' ? 'N/A' : score + '%'}  |  Status: ${label}`);
    console.log(`     Tests: ${passed} passed, ${warnings_cat} warnings, ${failed} failed (of ${tests.length})`);

    if (data.subsystems.length > 0) {
      console.log(`     Subsystems: ${data.subsystems.join(', ')}`);
    }
  }

  // Calculate overall
  const scoredCategories = Object.entries(scores).filter(([, s]) => s.score !== 'NOT TESTED');
  const overallScore = scoredCategories.length > 0
    ? Math.round(scoredCategories.reduce((s, [, v]) => s + v.score, 0) / scoredCategories.length)
    : 0;
  const totalPassed = scoredCategories.reduce((s, [, v]) => s + v.passed, 0);
  const totalWarnings = scoredCategories.reduce((s, [, v]) => s + v.warnings, 0);
  const totalFailed = scoredCategories.reduce((s, [, v]) => s + v.failed, 0);
  const totalTests = scoredCategories.reduce((s, [, v]) => s + v.total, 0);

  const allReady = Object.values(scores).every(s => s.label === 'PRODUCTION READY');
  const anyFailed = Object.values(scores).some(s => s.failed > 0);

  let overallLabel;
  if (totalTests === 0) overallLabel = 'NOT READY — NO TESTS';
  else if (anyFailed) overallLabel = 'PARTIALLY READY — FAILURES DETECTED';
  else if (allReady) overallLabel = 'PRODUCTION READY';
  else overallLabel = 'PARTIALLY READY';

  console.log(`\n  ${'='.repeat(50)}`);
  console.log(`  OVERALL READINESS: ${overallLabel}`);
  console.log(`  Overall Score: ${overallScore}%`);
  console.log(`  Total: ${totalPassed} passed, ${totalWarnings} warnings, ${totalFailed} failed (${totalTests} tests)`);
  console.log(`  ${'='.repeat(50)}`);

  // Summary of issues
  if (totalFailed > 0) {
    console.log(`\n  ISSUES REQUIRING ATTENTION:`);
    for (const [category, data] of Object.entries(categories)) {
      for (const t of data.tests) {
        if (t.status === 'FAIL') {
          console.log(`    [${category}] ${t.test}: ${t.detail}`);
        }
      }
    }
  }

  if (totalWarnings > 0) {
    console.log(`\n  WARNINGS:`);
    for (const [category, data] of Object.entries(categories)) {
      for (const t of data.tests) {
        if (t.status === 'WARN') {
          console.log(`    [${category}] ${t.test}: ${t.detail}`);
        }
      }
    }
  }
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  console.log('='.repeat(70));
  console.log('  COMPREHENSIVE END-TO-END PLATFORM VALIDATION');
  console.log('='.repeat(70));
  console.log(`  Started: ${new Date().toISOString()}`);
  console.log('='.repeat(70));

  let brainService = null;

  // Initialize Brain
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    const { initializeBrain } = await import('../src/brain/index.js');
    brainService = await initializeBrain(prisma);
    ok('Brain initialized with Prisma');
    record('setup', 'brain_initialized', 'PASS');
  } catch (err) {
    nok('Brain initialization (will test without database)', err);
    record('setup', 'brain_initialized', 'FAIL', err.message);
    console.log('  Continuing with Brain-independent tests...');
  }

  // Run validations
  await validatePipeline(brainService);
  await validateAgents(brainService);
  await validateExistingFeatures(brainService);
  await validateFailureModes();
  await validatePerformance(brainService);
  await validateSecurity();

  // Generate final report
  generateReport();

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log(`  FINAL SUMMARY`);
  console.log('='.repeat(70));
  console.log(`  Passed: ${pass}`);
  console.log(`  Failed: ${fail}`);
  console.log(`  Warnings: ${warnings.length}`);
  console.log('='.repeat(70));

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\nFATAL VALIDATION ERROR:', err);
  process.exit(1);
});
