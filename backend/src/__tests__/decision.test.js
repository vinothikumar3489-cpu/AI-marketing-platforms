import { describe, test, expect, beforeEach } from '@jest/globals';
import { DecisionEngine } from '../brain/decision/DecisionEngine.js';
import { DecisionContext } from '../brain/decision/DecisionContext.js';
import { DecisionScenario } from '../brain/decision/DecisionScenario.js';
import { DecisionSimulator } from '../brain/decision/DecisionSimulator.js';
import { RiskAnalyzer } from '../brain/decision/RiskAnalyzer.js';
import { ImpactAnalyzer } from '../brain/decision/ImpactAnalyzer.js';
import { ConstraintEngine } from '../brain/decision/ConstraintEngine.js';
import { TradeoffAnalyzer } from '../brain/decision/TradeoffAnalyzer.js';
import { DecisionExplainer } from '../brain/decision/DecisionExplainer.js';
import { DecisionMemory } from '../brain/decision/DecisionMemory.js';
import { DecisionHealth } from '../brain/decision/DecisionHealth.js';
import { DecisionComparator } from '../brain/decision/DecisionComparator.js';

describe('DecisionEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new DecisionEngine();
  });

  test('initializes successfully', async () => {
    const result = await engine.initialize({ requestId: 'TEST' });
    expect(result.success).toBe(true);
    expect(engine.initialized).toBe(true);
  });

  test('evaluate generates decisions for a goal', async () => {
    await engine.initialize({ requestId: 'TEST' });
    const result = await engine.evaluate({
      goal: 'Increase Q3 revenue by 25%',
      budget: 50000,
      timeframe: 'quarter',
      companyName: 'TestCorp',
      industry: 'SaaS',
    });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.scenarios).toBeDefined();
    expect(result.data.scenarios.length).toBeGreaterThan(0);
    expect(result.data.decision).toBeDefined();
    expect(result.data.decision.label).toBeDefined();
  });

  test('evaluate handles empty goal gracefully', async () => {
    await engine.initialize({ requestId: 'TEST' });
    const result = await engine.evaluate({});
    expect(result.success).toBe(true);
    expect(result.data.scenarios.length).toBeGreaterThan(0);
  });

  test('simulate produces outcomes for a scenario', async () => {
    await engine.initialize({ requestId: 'TEST' });
    const result = await engine.simulate({
      label: 'Increase Ad Spend',
      action: 'Increase ad spend and optimize campaign targeting',
      parameters: { budgetChange: 30, optimizationLevel: 0.7, aggressiveness: 0.5 },
      budget: 30000,
      timeframe: 'quarter',
    });
    expect(result.success).toBe(true);
    expect(result.data.simulation).toBeDefined();
    expect(result.data.simulation.outcomes).toBeDefined();
    expect(result.data.simulation.outcomes.roi).toBeDefined();
    expect(result.data.simulation.outcomes.leadGrowth).toBeDefined();
    expect(result.data.simulation.outcomes.revenueChange).toBeDefined();
  });

  test('compare ranks multiple scenarios', async () => {
    await engine.initialize({ requestId: 'TEST' });
    const scenarios = [
      { label: 'Increase Ad Spend', action: 'Increase ad spend', parameters: { budgetChange: 25 } },
      { label: 'Content Marketing', action: 'Content marketing and SEO', parameters: { budgetChange: 15 } },
      { label: 'Email Campaign', action: 'Email nurture campaign', parameters: { budgetChange: 10 } },
    ];
    const result = await engine.compare(scenarios, { goal: 'Grow revenue' });
    expect(result.success).toBe(true);
    expect(result.data.comparison.rankings).toBeDefined();
    expect(result.data.comparison.rankings.length).toBe(3);
    expect(result.data.comparison.rankings[0].rank).toBe(1);
  });
});

describe('DecisionContext', () => {
  test('creates context with default values', () => {
    const ctx = new DecisionContext();
    expect(ctx.goal).toBe('');
    expect(ctx.constraints).toEqual([]);
    expect(ctx.budget).toBeNull();
    expect(ctx.timeframe).toBe('');
  });

  test('creates context with provided values', () => {
    const ctx = new DecisionContext({
      goal: 'Test goal',
      constraints: [{ field: 'budget', operator: '<=', value: 10000 }],
      budget: 5000,
      timeframe: 'Q3 2026',
    });
    expect(ctx.goal).toBe('Test goal');
    expect(ctx.constraints.length).toBe(1);
    expect(ctx.budget).toBe(5000);
    expect(ctx.timeframe).toBe('Q3 2026');
  });

  test('validate returns errors for missing goal', () => {
    const ctx = new DecisionContext({ goal: '' });
    const validation = ctx.validate();
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  test('hasConstraint checks for constraint existence', () => {
    const ctx = new DecisionContext({
      constraints: [{ field: 'budget', operator: '<=', value: 10000 }],
    });
    expect(ctx.hasConstraint('budget')).toBe(true);
    expect(ctx.hasConstraint('timeframe')).toBe(false);
  });
});

describe('DecisionScenario', () => {
  test('creates scenario with generated id', () => {
    const s = new DecisionScenario({ label: 'Test' });
    expect(s.id).toMatch(/^SCENARIO-/);
    expect(s.label).toBe('Test');
  });

  test('toJSON returns serializable object', () => {
    const s = new DecisionScenario({ label: 'Test', description: 'A test scenario' });
    const json = s.toJSON();
    expect(json.label).toBe('Test');
    expect(json.description).toBe('A test scenario');
    expect(json.id).toBeDefined();
  });
});

describe('DecisionSimulator', () => {
  let simulator;

  beforeEach(() => {
    simulator = new DecisionSimulator();
  });

  test('simulates ad spend scenario', async () => {
    const scenario = new DecisionScenario({ label: 'Ad Spend', action: 'Increase ad spend', parameters: { budgetChange: 25 } });
    const context = new DecisionContext({ goal: 'Grow revenue', budget: 50000, timeframe: 'quarter' });
    const result = await simulator.execute({ scenario, decisionContext: context });
    expect(result.outcomes).toBeDefined();
    expect(result.outcomes.roi).toBeGreaterThan(0);
    expect(result.outcomes.leadGrowth).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  test('simulates content marketing scenario', async () => {
    const scenario = new DecisionScenario({ label: 'Content', action: 'Content marketing and SEO optimization', parameters: {} });
    const context = new DecisionContext({ goal: 'Organic growth', timeframe: '6 months' });
    const result = await simulator.execute({ scenario, decisionContext: context });
    expect(result.outcomes.seoImpact).toBeDefined();
    expect(result.outcomes.roi).toBeGreaterThan(0);
  });

  test('simulates with no context', async () => {
    const result = await simulator.execute({});
    expect(result.warnings).toBeDefined();
  });
});

describe('RiskAnalyzer', () => {
  let riskAnalyzer;

  beforeEach(() => {
    riskAnalyzer = new RiskAnalyzer();
  });

  test('identifies risks for a scenario', async () => {
    const scenario = new DecisionScenario({ label: 'Ad Spend', action: 'Increase ad spend', parameters: { budgetChange: 50, aggressiveness: 0.8 } });
    const context = new DecisionContext({ goal: 'Growth', budget: 100000 });
    const result = await riskAnalyzer.execute({ scenario, decisionContext: context });
    expect(result.risks).toBeDefined();
    expect(result.risks.length).toBeGreaterThan(0);
    expect(result.overallRiskScore).toBeDefined();
  });

  test('risk scores are between 0 and 1', async () => {
    const scenario = new DecisionScenario({ label: 'Test', action: 'Generic action', parameters: {} });
    const result = await riskAnalyzer.execute({ scenario });
    for (const risk of result.risks) {
      expect(risk.score).toBeGreaterThanOrEqual(0);
      expect(risk.score).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high', 'critical']).toContain(risk.level);
    }
  });

  test('handles missing scenario gracefully', async () => {
    const result = await riskAnalyzer.execute({});
    expect(result.warnings).toBeDefined();
    expect(result.risks).toEqual([]);
  });
});

describe('ImpactAnalyzer', () => {
  let impactAnalyzer;

  beforeEach(() => {
    impactAnalyzer = new ImpactAnalyzer();
  });

  test('analyzes impact dimensions', async () => {
    const scenario = new DecisionScenario({ label: 'Ad Spend', action: 'Increase ad spend', parameters: { budgetChange: 25 } });
    const result = await impactAnalyzer.execute({ scenario });
    expect(result.dimensions).toBeDefined();
    expect(result.dimensions.revenue).toBeDefined();
    expect(result.dimensions.growth).toBeDefined();
    expect(result.overallScore).toBeDefined();
  });

  test('overall score is between -1 and 1', async () => {
    const scenario = new DecisionScenario({ label: 'Test', action: 'General initiative', parameters: {} });
    const result = await impactAnalyzer.execute({ scenario });
    expect(result.overallScore).toBeGreaterThanOrEqual(-1);
    expect(result.overallScore).toBeLessThanOrEqual(1);
  });
});

describe('ConstraintEngine', () => {
  let constraintEngine;

  beforeEach(() => {
    constraintEngine = new ConstraintEngine();
  });

  test('validates budget constraint', async () => {
    const context = new DecisionContext({
      goal: 'Test',
      constraints: [{ field: 'max_budget', operator: '<=', value: 50000 }],
      budget: 25000,
      timeframe: 'quarter',
    });
    const result = await constraintEngine.execute({ decisionContext: context });
    expect(result.valid).toBe(true);
  });

  test('detects budget constraint violation', async () => {
    const context = new DecisionContext({
      goal: 'Test',
      constraints: [{ field: 'max_budget', operator: '<=', value: 10000 }],
      budget: 25000,
      timeframe: 'quarter',
    });
    const result = await constraintEngine.execute({ decisionContext: context });
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  test('handles no constraints', async () => {
    const context = new DecisionContext({ goal: 'Test', constraints: [] });
    const result = await constraintEngine.execute({ decisionContext: context });
    expect(result.valid).toBe(true);
  });
});

describe('TradeoffAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new TradeoffAnalyzer();
  });

  test('compares and ranks scenarios', async () => {
    const scenarios = [
      new DecisionScenario({ id: 's1', label: 'A', expectedRoi: 150, confidence: 0.8, simulatedOutcomes: { leadGrowth: 20, revenueChange: 15, cacChange: -5 } }),
      new DecisionScenario({ id: 's2', label: 'B', expectedRoi: 100, confidence: 0.6, simulatedOutcomes: { leadGrowth: 10, revenueChange: 5, cacChange: 2 } }),
    ];
    const result = await analyzer.execute({ scenarios });
    expect(result.rankings).toBeDefined();
    expect(result.rankings.length).toBe(2);
    expect(result.winner).toBeDefined();
  });

  test('needs at least 2 scenarios', async () => {
    const result = await analyzer.execute({ scenarios: [new DecisionScenario({ label: 'Only' })] });
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('DecisionExplainer', () => {
  let explainer;

  beforeEach(() => {
    explainer = new DecisionExplainer();
  });

  test('generates explanation for selected scenario', async () => {
    const scenario = new DecisionScenario({
      id: 's1',
      label: 'Increase Ad Spend',
      confidence: 0.75,
      expectedRoi: 180,
      rank: 1,
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
    expect(result.explanation).toBeDefined();
    expect(result.explanation.length).toBeGreaterThan(0);
    expect(result.sections.executiveSummary).toBeDefined();
    expect(result.sections.rationale).toBeDefined();
  });

  test('explains single scenario', async () => {
    const scenario = new DecisionScenario({ label: 'Test', description: 'A test', confidence: 0.5, expectedRoi: 50 });
    const result = await explainer.explainScenario(scenario, {}, {});
    expect(result.explanation).toBeDefined();
    expect(result.sections.overview).toBeDefined();
  });
});

describe('DecisionMemory', () => {
  let memory;

  beforeEach(async () => {
    memory = new DecisionMemory();
    await memory.initialize({ requestId: 'TEST' });
  });

  test('stores and retrieves decisions', async () => {
    const storeResult = await memory.storeDecision({
      goal: 'Test goal',
      context: { budget: 10000 },
      scenarios: [{ label: 'Option A' }],
      selectedScenario: { label: 'Option A', confidence: 0.8 },
      confidence: 0.8,
    });
    expect(storeResult.success).toBe(true);
    expect(storeResult.id).toBeDefined();

    const retrieved = await memory.getDecision(storeResult.id);
    expect(retrieved).toBeDefined();
    expect(retrieved.goal).toBe('Test goal');
  });

  test('records outcome for a decision', async () => {
    const storeResult = await memory.storeDecision({ goal: 'Test', scenarios: [] });
    const outcome = await memory.recordOutcome(storeResult.id, {
      success: true,
      result: 'Goal achieved',
      actualRoi: 150,
      lessonsLearned: ['Start earlier', 'Allocate more budget'],
    });
    expect(outcome.success).toBe(true);

    const updated = await memory.getDecision(storeResult.id);
    expect(updated.success).toBe(true);
    expect(updated.actualOutcome.actualRoi).toBe(150);
    expect(updated.lessonsLearned.length).toBe(2);
  });

  test('getLearningSummary returns stats', async () => {
    await memory.storeDecision({ goal: 'Goal 1', scenarios: [] });
    await memory.storeDecision({ goal: 'Goal 2', scenarios: [] });
    const summary = await memory.getLearningSummary();
    expect(summary.totalDecisions).toBe(2);
  });
});

describe('DecisionHealth', () => {
  let health;

  beforeEach(() => {
    health = new DecisionHealth();
  });

  test('generates health report', async () => {
    const report = await health.generateReport({});
    expect(report.overall).toBeDefined();
    expect(report.metrics).toBeDefined();
  });
});

describe('DecisionComparator', () => {
  let comparator;

  beforeEach(() => {
    comparator = new DecisionComparator();
  });

  test('scores and ranks scenarios', () => {
    const scenarios = [
      new DecisionScenario({ id: 'a', label: 'A', expectedRoi: 200, confidence: 0.9 }),
      new DecisionScenario({ id: 'b', label: 'B', expectedRoi: 100, confidence: 0.5 }),
      new DecisionScenario({ id: 'c', label: 'C', expectedRoi: 150, confidence: 0.7 }),
    ];
    const result = comparator.compare(scenarios);
    expect(result.rankings[0].scenarioId).toBe('a');
    expect(result.rankings[2].scenarioId).toBe('b');
  });
});
