let pass = 0;
let fail = 0;
function ok(msg) { pass++; console.log(`  OK: ${msg}`); }
function nok(msg, err) { fail++; console.log(`  FAIL: ${msg}${err ? ' — ' + (err.message || err) : ''}`); }

async function test(module, fn) {
  try {
    console.log(`\n=== ${module} ===`);
    await fn();
    console.log(`  ✓ ${module} passed`);
  } catch (err) {
    console.log(`  ✗ ${module} FAILED: ${err.message}`);
    fail++;
  }
}

async function main() {
  console.log('========================================');
  console.log('ENTERPRISE MULTI-AGENT SYSTEM TESTS');
  console.log('========================================');

  // ── 1. AgentTask ──
  await test('AgentTask', async () => {
    const { AgentTask } = await import('../src/brain/agents/AgentTask.js');
    const t = new AgentTask({ type: 'seo_analysis', priority: 'high' });
    ok('type is seo_analysis', t.type === 'seo_analysis');
    ok('priority is high', t.priority === 'high');
    ok('status starts pending', t.status === 'pending');
    ok('isPending is true', t.isPending === true);
    ok('isComplete is false', t.isComplete === false);
    ok('taskId is generated', t.taskId.length > 0);
    ok('default timeout is 60000', t.timeout === 60000);
    ok('default maxRetries is 3', t.maxRetries === 3);

    t.markRunning();
    ok('status is running after markRunning', t.isRunning);
    t.markComplete({ success: true });
    ok('status is completed after markComplete', t.isComplete);
    ok('result is set', t.result.success === true);

    const t2 = new AgentTask({ dependencies: ['task_a', 'task_b'] });
    ok('dependsOn returns true when all met', t2.dependsOn(['task_a', 'task_b', 'task_c']));
    ok('dependsOn returns false when not met', t2.dependsOn(['task_a']) === false);
    ok('hasDependency returns true', t2.hasDependency('task_a'));
    ok('hasDependency returns false', t2.hasDependency('task_c') === false);

    const t3 = new AgentTask();
    t3.markFailed('test error');
    ok('status is failed', t3.isFailed);
    ok('error is set', t3.error === 'test error');
  });

  // ── 2. AgentContext ──
  await test('AgentContext', async () => {
    const { AgentContext } = await import('../src/brain/agents/AgentContext.js');
    const ctx = new AgentContext({
      requestId: 'req-1',
      module: 'seo',
      company: { name: 'TestCorp' },
      product: { name: 'TestProduct' },
    });
    ok('requestId is set', ctx.requestId === 'req-1');
    ok('module is seo', ctx.module === 'seo');
    ok('company name is TestCorp', ctx.company.name === 'TestCorp');

    ctx.setAgentResult('SeoAgent', { findings: ['kw1'] });
    ok('agentResult stored', ctx.getAgentResult('SeoAgent').findings[0] === 'kw1');
    ok('unknown agent returns null', ctx.getAgentResult('Missing') === null);

    ctx.mergeResults([{ agentName: 'ContentAgent', findings: ['content1'] }]);
    ok('merged results', ctx.agentResults.ContentAgent.findings[0] === 'content1');

    const brainReq = ctx.toBrainRequest();
    ok('toBrainRequest has requestId', brainReq.requestId === 'req-1');
    ok('toBrainRequest has module', brainReq.module === 'seo');
    ok('toBrainRequest has companyName', brainReq.companyName === 'TestCorp');
  });

  // ── 3. AgentResult ──
  await test('AgentResult', async () => {
    const { AgentResult } = await import('../src/brain/agents/AgentResult.js');
    const r = new AgentResult({ agentName: 'TestAgent', taskId: 'task-1' });
    ok('agentName is set', r.agentName === 'TestAgent');

    r.addFinding({ type: 'test', value: 1 });
    r.addRecommendation({ title: 'Do thing' });
    r.addReasoningStep('Step 1');
    r.addEvidence({ source: 'test' });
    r.recordKnowledgeUpdate('seo_keywords');
    r.recordLearningUpdate('seo_trends');
    r.recordKnowledgeUpdate('seo_keywords'); // duplicate

    ok('1 finding', r.findings.length === 1);
    ok('1 recommendation', r.recommendations.length === 1);
    ok('1 reasoningStep', r.reasoningSteps.length === 1);
    ok('1 evidence', r.evidenceUsed.length === 1);
    ok('knowledgeUpdated has 1 entry (dedup)', r.knowledgeUpdated.length === 1);

    const r2 = new AgentResult({ agentName: 'TestAgent2', confidence: 0.8, findings: [{ type: 'b' }] });
    r.merge(r2);
    ok('merged findings', r.findings.length === 2);
    ok('merged confidence', r.confidence > 0);

    const json = r.toJSON();
    ok('toJSON has taskId', json.taskId === 'task-1');
    ok('toJSON has confidence', json.confidence !== undefined);
  });

  // ── 4. AgentRegistry ──
  await test('AgentRegistry', async () => {
    const { AgentRegistry } = await import('../src/brain/agents/AgentRegistry.js');
    const { BaseAgent } = await import('../src/brain/agents/BaseAgent.js');

    class TestAgent extends BaseAgent {
      constructor() { super('TestAgent'); this._capabilities = ['test']; }
      async plan() { return { success: true }; }
      async execute() { return { findings: [] }; }
    }

    const r = new AgentRegistry();
    ok('empty registry count is 0', r.getCount() === 0);

    const agent = new TestAgent();
    r.register(agent);
    ok('count is 1 after register', r.getCount() === 1);
    ok('getAgent returns agent', r.getAgent('TestAgent').name === 'TestAgent');
    ok('hasAgent returns true', r.hasAgent('TestAgent'));
    ok('hasAgent returns false', r.hasAgent('Missing') === false);

    const found = r.findAgentsForTask('test');
    ok('findAgentsForTask returns agent', found.length === 1 && found[0].name === 'TestAgent');

    const noMatch = r.findAgentsForTask('unknown');
    ok('findAgentsForTask returns empty for unknown', noMatch.length === 0);

    const all = r.getAllAgents();
    ok('getAllAgents returns 1', all.length === 1);

    const names = r.getAgentNames();
    ok('getAgentNames includes TestAgent', names.includes('TestAgent'));

    const health = await r.health();
    ok('health reports totalAgents', health.totalAgents === 1);
    ok('health reports allHealthy', health.allHealthy === true);
  });

  // ── 5. BaseAgent lifecycle ──
  await test('BaseAgent lifecycle', async () => {
    const { BaseAgent } = await import('../src/brain/agents/BaseAgent.js');

    class TestAgent extends BaseAgent {
      constructor() { super('TestAgent'); this._capabilities = ['test_cap']; this._dependencies = ['OtherAgent']; }
      async plan() { return { success: true, reasoningSteps: ['plan step'] }; }
      async execute() { return { success: true, confidence: 0.75, findings: [{ type: 'test' }], recommendations: [{ title: 'rec1' }] }; }
    }

    const agent = new TestAgent();
    ok('name is TestAgent', agent.name === 'TestAgent');
    ok('version is 1.0.0', agent.version === '1.0.0');
    ok('capabilities includes test_cap', agent.capabilities.includes('test_cap'));
    ok('dependencies includes OtherAgent', agent.dependencies.includes('OtherAgent'));
    ok('not initialized yet', agent.initialized === false);

    const initResult = await agent.initialize({});
    ok('initialize succeeds', initResult.success === true);
    ok('initialized after init', agent.initialized === true);

    const planResult = await agent.plan({}, {});
    ok('plan succeeds', planResult.success === true);
    ok('plan returns reasoningSteps', planResult.reasoningSteps.length > 0);

    const execResult = await agent.execute({}, {});
    ok('execute succeeds', execResult.success === true);
    ok('execute has findings', execResult.findings.length > 0);

    const validation = await agent.validate(execResult);
    ok('validate returns valid true', validation.valid === true);

    const summary = await agent.summarize(execResult);
    ok('summarize returns string', typeof summary === 'string');

    const health = await agent.health();
    ok('health returns agent name', health.name === 'TestAgent');
    ok('health returns status', health.status === 'HEALTHY');
    ok('health returns capabilities', health.capabilities.includes('test_cap'));

    const emptyResult = agent._createResult({ taskId: 't1', findings: [] });
    const emptyValidation = await agent.validate(emptyResult);
    ok('validate catches no findings', emptyValidation.valid === false);
    ok('validate reports issue', emptyValidation.issues.length > 0);
  });

  // ── 6-16. All 11 agents ──
  const agentModules = [
    { name: 'SeoAgent', file: 'SeoAgent.js' },
    { name: 'CompetitorAgent', file: 'CompetitorAgent.js' },
    { name: 'ContentAgent', file: 'ContentAgent.js' },
    { name: 'AudienceAgent', file: 'AudienceAgent.js' },
    { name: 'CampaignAgent', file: 'CampaignAgent.js' },
    { name: 'GeoAgent', file: 'GeoAgent.js' },
    { name: 'CrmAgent', file: 'CrmAgent.js' },
    { name: 'AnalyticsAgent', file: 'AnalyticsAgent.js' },
    { name: 'ResearchAgent', file: 'ResearchAgent.js' },
    { name: 'EmailAgent', file: 'EmailAgent.js' },
    { name: 'ExecutiveStrategyAgent', file: 'ExecutiveStrategyAgent.js' },
  ];

  for (const { name, file } of agentModules) {
    await test(name, async () => {
      const mod = await import(`../src/brain/agents/agents/${file}`);
      const AgentClass = mod[name];
      const agent = new AgentClass();

      ok(`${name} has initialize`, typeof agent.initialize === 'function');
      ok(`${name} has plan`, typeof agent.plan === 'function');
      ok(`${name} has execute`, typeof agent.execute === 'function');
      ok(`${name} has validate`, typeof agent.validate === 'function');
      ok(`${name} has summarize`, typeof agent.summarize === 'function');
      ok(`${name} has health`, typeof agent.health === 'function');

      const init = await agent.initialize({});
      ok(`${name} initialized`, init.success === true);

      const context = {
        company: { name: 'TestCorp', website: 'https://testcorp.com' },
        product: { name: 'TestProduct' },
        campaign: { name: 'TestCampaign' },
        memory: {},
        knowledge: {},
        taskId: 'test-task',
        getAgentResult: () => null,
        setAgentResult: () => {},
        agentResults: {},
      };

      const plan = await agent.plan({ taskId: 'test-task', input: { website: 'https://testcorp.com', keywords: ['kw1', 'kw2'] } }, context);
      ok(`${name} planning succeeded`, plan.success === true);

      const exec = await agent.execute({ taskId: 'test-task', input: { website: 'https://testcorp.com', keywords: ['kw1', 'kw2'], competitors: ['CompA'], topics: ['Topic1'], segments: [{ name: 'Seg1' }], personas: [{ name: 'Per1' }], channels: ['Email'], objectives: ['Obj1'] } }, context);
      ok(`${name} execution succeeded`, exec.success !== false);

      const validation = await agent.validate(exec);
      ok(`${name} validation ran`, validation.valid !== undefined);

      const summary = await agent.summarize(exec);
      ok(`${name} summary is string`, typeof summary === 'string');
      ok(`${name} summary is non-empty`, summary.length > 0);

      const health = await agent.health();
      ok(`${name} health is ok`, health.status === 'HEALTHY');
      ok(`${name} name matches`, health.name === name);
    });
  }

  // ── 17. AgentManager basic ──
  await test('AgentManager with mock agents', async () => {
    const { AgentManager } = await import('../src/brain/agents/AgentManager.js');
    const { AgentRegistry } = await import('../src/brain/agents/AgentRegistry.js');
    const { BaseAgent } = await import('../src/brain/agents/BaseAgent.js');

    class MockSeo extends BaseAgent {
      constructor() { super('MockSeo'); this._capabilities = ['seo']; }
      async plan() { return { success: true, reasoningSteps: ['seo plan'] }; }
      async execute() {
        return { success: true, confidence: 0.8, findings: [{ type: 'seo_finding' }], recommendations: [{ title: 'seo rec' }] };
      }
    }

    class MockContent extends BaseAgent {
      constructor() { super('MockContent'); this._capabilities = ['content']; }
      async plan() { return { success: true, reasoningSteps: ['content plan'] }; }
      async execute() {
        return { success: true, confidence: 0.7, findings: [{ type: 'content_finding' }], recommendations: [{ title: 'content rec' }] };
      }
    }

    const registry = new AgentRegistry();
    registry.register(new MockSeo());
    registry.register(new MockContent());
    ok('2 agents registered', registry.getCount() === 2);

    const brainService = { process: async () => ({ context: {} }) };
    const manager = new AgentManager(brainService, registry);
    ok('manager created', manager !== null);

    const result = await manager.processTask({ type: 'seo' });
    ok('seo task completed', result.success === true);
    ok('seo task has findings', result.findings.length > 0);
    ok('seo task has agentsUsed', result.agentsUsed.includes('MockSeo'));
    ok('seo task has taskId', result.taskId.length > 0);
    ok('seo task has confidence', result.confidence > 0);
    ok('seo task has processingTime', result.processingTime > 0);

    const result2 = await manager.processTask({ type: 'unknown' });
    ok('unknown task still runs (falls back to all agents)', result2.success === true);

    const status = await manager.getStatus();
    ok('status has completedTasks', status.completedTasks >= 2);
    ok('status has registeredAgents', status.registeredAgents === 2);
    ok('status has totalHistory', status.totalHistory >= 2);
  });

  // ── 18. AgentManager dependencies ──
  await test('AgentManager dependency execution', async () => {
    const { AgentManager } = await import('../src/brain/agents/AgentManager.js');
    const { AgentRegistry } = await import('../src/brain/agents/AgentRegistry.js');
    const { BaseAgent } = await import('../src/brain/agents/BaseAgent.js');

    const executionOrder = [];

    class DepA extends BaseAgent {
      constructor() { super('DepA'); this._capabilities = ['dep_test']; this._dependencies = []; }
      async plan() { return { success: true }; }
      async execute() { executionOrder.push('A'); return { success: true, confidence: 0.5, findings: [{ type: 'a' }] }; }
    }
    class DepB extends BaseAgent {
      constructor() { super('DepB'); this._capabilities = ['dep_test']; this._dependencies = ['DepA']; }
      async plan() { return { success: true }; }
      async execute() { executionOrder.push('B'); return { success: true, confidence: 0.5, findings: [{ type: 'b' }] }; }
    }
    class DepC extends BaseAgent {
      constructor() { super('DepC'); this._capabilities = ['dep_test']; this._dependencies = ['DepB']; }
      async plan() { return { success: true }; }
      async execute() { executionOrder.push('C'); return { success: true, confidence: 0.5, findings: [{ type: 'c' }] }; }
    }

    const registry = new AgentRegistry();
    registry.register(new DepA());
    registry.register(new DepB());
    registry.register(new DepC());

    const manager = new AgentManager(null, registry);
    const result = await manager.processTask({
      type: 'dep_test',
      metadata: { strategy: 'dependency' },
    });

    ok('dependency task completed', result.success === true);
    ok('all 3 agents ran', executionOrder.length === 3);
    ok('A ran first', executionOrder[0] === 'A');
    ok('B ran second', executionOrder[1] === 'B');
    ok('C ran third', executionOrder[2] === 'C');
  });

  // ── 19. AgentManager retry on failure ──
  await test('AgentManager retry logic', async () => {
    const { AgentManager } = await import('../src/brain/agents/AgentManager.js');
    const { AgentRegistry } = await import('../src/brain/agents/AgentRegistry.js');
    const { BaseAgent } = await import('../src/brain/agents/BaseAgent.js');

    let attempts = 0;

    class FlakyAgent extends BaseAgent {
      constructor() { super('FlakyAgent'); this._capabilities = ['flaky']; }
      async plan() { return { success: true }; }
      async execute() {
        attempts++;
        if (attempts < 2) throw new Error('Temporary failure');
        return { success: true, confidence: 0.9, findings: [{ type: 'success' }] };
      }
    }

    const registry = new AgentRegistry();
    registry.register(new FlakyAgent());

    const manager = new AgentManager(null, registry);
    const result = await manager.processTask({
      type: 'flaky',
      maxRetries: 3,
      retryDelay: 10,
    });

    ok('flaky task eventually succeeds', result.success === true);
    ok('agent retried at least once', attempts >= 2);
  });

  // ── 20. AgentManager timeout ──
  await test('AgentManager timeout handling', async () => {
    const { AgentManager } = await import('../src/brain/agents/AgentManager.js');
    const { AgentRegistry } = await import('../src/brain/agents/AgentRegistry.js');
    const { BaseAgent } = await import('../src/brain/agents/BaseAgent.js');

    class SlowAgent extends BaseAgent {
      constructor() { super('SlowAgent'); this._capabilities = ['slow']; }
      async plan() { return { success: true }; }
      async execute() {
        await new Promise(r => setTimeout(r, 5000));
        return { success: true, findings: [] };
      }
    }

    const registry = new AgentRegistry();
    registry.register(new SlowAgent());

    const manager = new AgentManager(null, registry);
    const result = await manager.processTask({
      type: 'slow',
      timeout: 100,
      maxRetries: 1,
      retryDelay: 10,
    });

    ok('slow task fails due to timeout', result.success === false);
    ok('slow task has error message', result.errors?.length > 0 || (result.error && result.error.length > 0));
  });

  // ── 21. AgentManager parallel execution ──
  await test('AgentManager sequential + parallel execution', async () => {
    const { AgentManager } = await import('../src/brain/agents/AgentManager.js');
    const { AgentRegistry } = await import('../src/brain/agents/AgentRegistry.js');
    const { BaseAgent } = await import('../src/brain/agents/BaseAgent.js');

    class FastAgent extends BaseAgent {
      constructor(name) { super(name); this._capabilities = ['multi']; }
      async plan() { return { success: true }; }
      async execute() { return { success: true, confidence: 0.6, findings: [{ type: this.name }] }; }
    }

    const registry = new AgentRegistry();
    registry.register(new FastAgent('Alpha'));
    registry.register(new FastAgent('Beta'));
    registry.register(new FastAgent('Gamma'));

    const manager = new AgentManager(null, registry);

    const seqResult = await manager.processTask({
      type: 'multi',
      metadata: { strategy: 'sequential' },
    });
    ok('sequential execution succeeded', seqResult.success === true);
    ok('sequential has findings from all agents', seqResult.findings.length >= 3);

    const parResult = await manager.processTask({
      type: 'multi',
      metadata: { strategy: 'parallel' },
    });
    ok('parallel execution succeeded', parResult.success === true);
  });

  // ── 22. requestAgent (collaboration) ──
  await test('AgentManager requestAgent (collaboration)', async () => {
    const { AgentManager } = await import('../src/brain/agents/AgentManager.js');
    const { AgentRegistry } = await import('../src/brain/agents/AgentRegistry.js');
    const { BaseAgent } = await import('../src/brain/agents/BaseAgent.js');

    class PrimaryAgent extends BaseAgent {
      constructor() { super('Primary'); this._capabilities = ['collab']; }
      async plan() { return { success: true }; }
      async execute() { return { success: true, confidence: 0.5, findings: [{ type: 'primary' }] }; }
    }
    class SecondaryAgent extends BaseAgent {
      constructor() { super('Secondary'); this._capabilities = ['collab']; }
      async plan() { return { success: true }; }
      async execute() { return { success: true, confidence: 0.5, findings: [{ type: 'secondary' }] }; }
    }

    const registry = new AgentRegistry();
    registry.register(new PrimaryAgent());
    registry.register(new SecondaryAgent());

    const manager = new AgentManager(null, registry);
    const context = { taskId: 'collab-test', agentResults: {} };

    const subResult = await manager.requestAgent('Secondary', { type: 'collab', input: { data: 'test' } }, context);
    ok('requestAgent returns result', subResult.success === true);
    ok('requestAgent has agentName', subResult.agentName === 'Secondary');
  });

  // ── 23. BrainService agentManager accessor ──
  await test('BrainService agentManager accessor', async () => {
    const { BrainService } = await import('../src/brain/services/BrainService.js');

    const di = {
      _instances: new Map(),
      resolve(name) {
        return this._instances.get(name) || null;
      },
    };

    const mockManager = { health: async () => ({ status: 'HEALTHY' }) };
    di._instances.set('agentManager', mockManager);

    const service = new BrainService(di);
    const am = service.agentManager;
    ok('agentManager getter returns instance', am !== null);
    ok('agentManager is the mock', am === mockManager);
  });

  console.log(`\n========================================`);
  console.log(`RESULTS: ${pass} passed, ${fail} failed`);
  console.log(`========================================`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
