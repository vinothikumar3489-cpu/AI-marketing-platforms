import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { DecisionEngine } from '../src/brain/decision/DecisionEngine.js';
import { DecisionContext } from '../src/brain/decision/DecisionContext.js';
import { DecisionScenario } from '../src/brain/decision/DecisionScenario.js';
import { DecisionSimulator } from '../src/brain/decision/DecisionSimulator.js';
import { RiskAnalyzer } from '../src/brain/decision/RiskAnalyzer.js';
import { ImpactAnalyzer } from '../src/brain/decision/ImpactAnalyzer.js';
import { ConstraintEngine } from '../src/brain/decision/ConstraintEngine.js';
import { TradeoffAnalyzer } from '../src/brain/decision/TradeoffAnalyzer.js';
import { DecisionExplainer } from '../src/brain/decision/DecisionExplainer.js';
import { DecisionMemory } from '../src/brain/decision/DecisionMemory.js';
import { DecisionHealth } from '../src/brain/decision/DecisionHealth.js';
import { DecisionComparator } from '../src/brain/decision/DecisionComparator.js';

describe('DecisionEngine', async () => {
  it('initializes successfully', async () => {
    const engine = new DecisionEngine();
    const result = await engine.initialize({ requestId: 'TEST' });
    assert.equal(result.success, true);
    assert.equal(engine.initialized, true);
  });

  it('evaluate generates decisions for a goal', async () => {
    const engine = new DecisionEngine();
    await engine.initialize({ requestId: 'TEST' });
    const result = await engine.evaluate({
      goal: 'Increase Q3 revenue by 25%',
      budget: 50000,
      timeframe: 'quarter',
      companyName: 'TestCorp',
      industry: 'SaaS',
    });
    assert.equal(result.success, true);
    assert.ok(result.data);
    assert.ok(result.data.scenarios);
    assert.ok(result.data.scenarios.length > 0);
    assert.ok(result.data.decision);
    assert.ok(result.data.decision.label);
  });

  it('evaluate handles empty goal gracefully', async () => {
    const engine = new DecisionEngine();
    await engine.initialize({ requestId: 'TEST' });
    const result = await engine.evaluate({});
    assert.equal(result.success, true);
    assert.ok(result.data.scenarios.length > 0);
  });

  it('simulate produces outcomes for a scenario', async () => {
    const engine = new DecisionEngine();
    await engine.initialize({ requestId: 'TEST' });
    const result = await engine.simulate({
      label: 'Increase Ad Spend',
      action: 'Increase ad spend and optimize campaign targeting',
      parameters: { budgetChange: 30, optimizationLevel: 0.7, aggressiveness: 0.5 },
      budget: 30000,
      timeframe: 'quarter',
    });
    assert.equal(result.success, true);
    assert.ok(result.data.simulation);
    assert.ok(result.data.simulation.outcomes);
    assert.ok(result.data.simulation.outcomes.roi != null);
    assert.ok(result.data.simulation.outcomes.leadGrowth != null);
    assert.ok(result.data.simulation.outcomes.revenueChange != null);
  });

  it('compare ranks multiple scenarios', async () => {
    const engine = new DecisionEngine();
    await engine.initialize({ requestId: 'TEST' });
    const scenarios = [
      { label: 'Increase Ad Spend', action: 'Increase ad spend', parameters: { budgetChange: 25 } },
      { label: 'Content Marketing', action: 'Content marketing and SEO', parameters: { budgetChange: 15 } },
      { label: 'Email Campaign', action: 'Email nurture campaign', parameters: { budgetChange: 10 } },
    ];
    const result = await engine.compare(scenarios, { goal: 'Grow revenue' });
    assert.equal(result.success, true);
    assert.ok(result.data.comparison.rankings);
    assert.equal(result.data.comparison.rankings.length, 3);
    assert.equal(result.data.comparison.rankings[0].rank, 1);
  });
});

describe('DecisionContext', async () => {
  it('creates context with default values', () => {
    const ctx = new DecisionContext();
    assert.equal(ctx.goal, '');
    assert.deepEqual(ctx.constraints, []);
    assert.equal(ctx.budget, null);
    assert.equal(ctx.timeframe, '');
  });

  it('creates context with provided values', () => {
    const ctx = new DecisionContext({
      goal: 'Test goal',
      constraints: [{ field: 'budget', operator: '<=', value: 10000 }],
      budget: 5000,
      timeframe: 'Q3 2026',
    });
    assert.equal(ctx.goal, 'Test goal');
    assert.equal(ctx.constraints.length, 1);
    assert.equal(ctx.budget, 5000);
    assert.equal(ctx.timeframe, 'Q3 2026');
  });

  it('validate returns errors for missing goal', () => {
    const ctx = new DecisionContext({ goal: '' });
    const validation = ctx.validate();
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.length > 0);
  });

  it('hasConstraint checks for constraint existence', () => {
    const ctx = new DecisionContext({
      constraints: [{ field: 'budget', operator: '<=', value: 10000 }],
    });
    assert.equal(ctx.hasConstraint('budget'), true);
    assert.equal(ctx.hasConstraint('timeframe'), false);
  });
});

describe('DecisionScenario', async () => {
  it('creates scenario with generated id', () => {
    const s = new DecisionScenario({ label: 'Test' });
    assert.ok(s.id.startsWith('SCENARIO-'));
    assert.equal(s.label, 'Test');
  });

  it('toJSON returns serializable object', () => {
    const s = new DecisionScenario({ label: 'Test', description: 'A test scenario' });
    const json = s.toJSON();
    assert.equal(json.label, 'Test');
    assert.equal(json.description, 'A test scenario');
    assert.ok(json.id);
  });
});

describe('DecisionSimulator', async () => {
  it('simulates ad spend scenario', async () => {
    const simulator = new DecisionSimulator();
    const scenario = new DecisionScenario({ label: 'Ad Spend', action: 'Increase ad spend', parameters: { budgetChange: 25 } });
    const context = new DecisionContext({ goal: 'Grow revenue', budget: 50000, timeframe: 'quarter' });
    const result = await simulator.execute({ scenario, decisionContext: context });
    assert.ok(result.outcomes);
    assert.ok(result.outcomes.roi != null);
    assert.ok(result.outcomes.leadGrowth != null);
    assert.ok(result.confidence > 0);
    assert.ok(result.confidence <= 1);
  });

  it('simulates content marketing scenario', async () => {
    const simulator = new DecisionSimulator();
    const scenario = new DecisionScenario({ label: 'Content', action: 'Content marketing and SEO optimization', parameters: {} });
    const context = new DecisionContext({ goal: 'Organic growth', timeframe: '6 months' });
    const result = await simulator.execute({ scenario, decisionContext: context });
    assert.ok(result.outcomes.seoImpact != null);
    assert.ok(result.outcomes.roi > 0);
  });

  it('simulates with no context gracefully', async () => {
    const simulator = new DecisionSimulator();
    const result = await simulator.execute({});
    assert.ok(result.warnings);
  });
});

describe('RiskAnalyzer', async () => {
  it('identifies risks for a scenario', async () => {
    const analyzer = new RiskAnalyzer();
    const scenario = new DecisionScenario({ label: 'Ad Spend', action: 'Increase ad spend', parameters: { budgetChange: 50, aggressiveness: 0.8 } });
    const context = new DecisionContext({ goal: 'Growth', budget: 100000 });
    const result = await analyzer.execute({ scenario, decisionContext: context });
    assert.ok(result.risks);
    assert.ok(result.risks.length > 0);
    assert.ok(result.overallRiskScore != null);
  });

  it('risk scores are between 0 and 1', async () => {
    const analyzer = new RiskAnalyzer();
    const scenario = new DecisionScenario({ label: 'Test', action: 'Generic action', parameters: {} });
    const result = await analyzer.execute({ scenario });
    for (const risk of result.risks) {
      assert.ok(risk.score >= 0);
      assert.ok(risk.score <= 1);
      assert.ok(['low', 'medium', 'high', 'critical'].includes(risk.level));
    }
  });
});

describe('ImpactAnalyzer', async () => {
  it('analyzes impact dimensions', async () => {
    const analyzer = new ImpactAnalyzer();
    const scenario = new DecisionScenario({ label: 'Ad Spend', action: 'Increase ad spend', parameters: { budgetChange: 25 } });
    const result = await analyzer.execute({ scenario });
    assert.ok(result.dimensions);
    assert.ok(result.dimensions.revenue);
    assert.ok(result.dimensions.growth);
    assert.ok(result.overallScore != null);
  });

  it('overall score is between -1 and 1', async () => {
    const analyzer = new ImpactAnalyzer();
    const scenario = new DecisionScenario({ label: 'Test', action: 'General initiative', parameters: {} });
    const result = await analyzer.execute({ scenario });
    assert.ok(result.overallScore >= -1);
    assert.ok(result.overallScore <= 1);
  });
});

describe('ConstraintEngine', async () => {
  it('validates budget constraint', async () => {
    const engine = new ConstraintEngine();
    const context = new DecisionContext({
      goal: 'Test',
      constraints: [{ field: 'max_budget', operator: '<=', value: 50000 }],
      budget: 25000,
      timeframe: 'quarter',
    });
    const result = await engine.execute({ decisionContext: context });
    assert.equal(result.valid, true);
  });

  it('detects budget constraint violation', async () => {
    const engine = new ConstraintEngine();
    const context = new DecisionContext({
      goal: 'Test',
      constraints: [{ field: 'max_budget', operator: '<=', value: 10000 }],
      budget: 25000,
      timeframe: 'quarter',
    });
    const result = await engine.execute({ decisionContext: context });
    assert.equal(result.valid, false);
    assert.ok(result.violations.length > 0);
  });
});

describe('TradeoffAnalyzer', async () => {
  it('compares and ranks scenarios', async () => {
    const analyzer = new TradeoffAnalyzer();
    const scenarios = [
      new DecisionScenario({ id: 's1', label: 'A', expectedRoi: 150, confidence: 0.8, simulatedOutcomes: { leadGrowth: 20, revenueChange: 15, cacChange: -5 } }),
      new DecisionScenario({ id: 's2', label: 'B', expectedRoi: 100, confidence: 0.6, simulatedOutcomes: { leadGrowth: 10, revenueChange: 5, cacChange: 2 } }),
    ];
    const result = await analyzer.execute({ scenarios });
    assert.ok(result.rankings);
    assert.equal(result.rankings.length, 2);
    assert.ok(result.winner);
  });

  it('needs at least 2 scenarios', async () => {
    const analyzer = new TradeoffAnalyzer();
    const result = await analyzer.execute({ scenarios: [new DecisionScenario({ label: 'Only' })] });
    assert.ok(result.warnings.length > 0);
  });
});

describe('DecisionExplainer', async () => {
  it('generates explanation for selected scenario', async () => {
    const explainer = new DecisionExplainer();
    const scenario = new DecisionScenario({
      id: 's1', label: 'Increase Ad Spend', confidence: 0.75, expectedRoi: 180, rank: 1,
      risks: { risks: [{ label: 'Budget Risk', level: 'medium', mitigation: 'Set budgets' }], riskLevel: 'medium' },
      impact: { overallScore: 0.6 },
      selectionRationale: 'Best ROI based on simulation',
    });
    const comparison = {
      rankings: [
        { scenarioId: 's1', scenarioLabel: 'Increase Ad Spend', totalScore: 0.85, rank: 1 },
        { scenarioId: 's2', scenarioLabel: 'Content Marketing', totalScore: 0.62, rank: 2 },
      ],
    };
    const result = await explainer.explainDecision(scenario, comparison, { goal: 'Grow revenue' });
    assert.ok(result.explanation);
    assert.ok(result.explanation.length > 0);
    assert.ok(result.sections.executiveSummary);
    assert.ok(result.sections.rationale);
  });

  it('explains single scenario', async () => {
    const explainer = new DecisionExplainer();
    const scenario = new DecisionScenario({ label: 'Test', description: 'A test', confidence: 0.5, expectedRoi: 50 });
    const result = await explainer.explainScenario(scenario, {}, {});
    assert.ok(result.explanation);
    assert.ok(result.sections.overview);
  });
});

describe('DecisionMemory', async () => {
  it('stores and retrieves decisions', async () => {
    const memory = new DecisionMemory();
    await memory.initialize({ requestId: 'TEST' });
    const storeResult = await memory.storeDecision({
      goal: 'Test goal',
      context: { budget: 10000 },
      scenarios: [{ label: 'Option A' }],
      selectedScenario: { label: 'Option A', confidence: 0.8 },
      confidence: 0.8,
    });
    assert.equal(storeResult.success, true);
    assert.ok(storeResult.id);
    const retrieved = await memory.getDecision(storeResult.id);
    assert.ok(retrieved);
    assert.equal(retrieved.goal, 'Test goal');
  });

  it('records outcome for a decision', async () => {
    const memory = new DecisionMemory();
    await memory.initialize({ requestId: 'TEST' });
    const storeResult = await memory.storeDecision({ goal: 'Test', scenarios: [] });
    const outcome = await memory.recordOutcome(storeResult.id, {
      success: true, result: 'Goal achieved', actualRoi: 150,
      lessonsLearned: ['Start earlier', 'Allocate more budget'],
    });
    assert.equal(outcome.success, true);
    const updated = await memory.getDecision(storeResult.id);
    assert.equal(updated.success, true);
    assert.equal(updated.actualOutcome.actualRoi, 150);
    assert.equal(updated.lessonsLearned.length, 2);
  });

  it('getLearningSummary returns stats', async () => {
    const memory = new DecisionMemory();
    await memory.initialize({ requestId: 'TEST' });
    await memory.storeDecision({ goal: 'Goal 1', scenarios: [] });
    await memory.storeDecision({ goal: 'Goal 2', scenarios: [] });
    const summary = await memory.getLearningSummary();
    assert.equal(summary.totalDecisions, 2);
  });
});

describe('DecisionHealth', async () => {
  it('generates health report', async () => {
    const health = new DecisionHealth();
    const report = await health.generateReport({});
    assert.ok(report.overall);
    assert.ok(report.metrics);
  });
});

describe('DecisionComparator', async () => {
  it('scores and ranks scenarios', () => {
    const comparator = new DecisionComparator();
    const scenarios = [
      new DecisionScenario({ id: 'a', label: 'A', expectedRoi: 200, confidence: 0.9 }),
      new DecisionScenario({ id: 'b', label: 'B', expectedRoi: 100, confidence: 0.5 }),
      new DecisionScenario({ id: 'c', label: 'C', expectedRoi: 150, confidence: 0.7 }),
    ];
    const result = comparator.compare(scenarios);
    assert.equal(result.rankings[0].scenarioId, 'a');
    assert.equal(result.rankings[2].scenarioId, 'b');
  });
});
