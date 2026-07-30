import { BaseAgent } from '../BaseAgent.js';
import { DecisionEngine } from '../../decision/DecisionEngine.js';

export class DecisionAgent extends BaseAgent {
  constructor() {
    super('DecisionAgent');
    this._version = '1.0.0';
    this._capabilities = ['decision_analysis', 'scenario_simulation', 'tradeoff_analysis', 'risk_assessment', 'strategy_selection', 'outcome_prediction'];
    this._dependencies = ['ExecutiveStrategyAgent'];
    this._engine = null;
  }

  setEngine(engine) {
    this._engine = engine;
  }

  async plan(task, context) {
    const steps = [
      'Understand business goal and constraints',
      'Generate possible decision scenarios',
      'Simulate outcomes for each scenario',
      'Analyze risks and tradeoffs',
      'Compare and rank options',
      'Select optimal strategy',
      'Generate explanation',
    ];
    return { success: true, reasoningSteps: steps, plan: steps };
  }

  async execute(task, context) {
    const start = Date.now();
    const result = this._createResult({ taskId: task.taskId });

    result.addReasoningStep('Initializing decision analysis');

    const decisionEngine = this._engine || new DecisionEngine();
    if (!decisionEngine._initialized) {
      await decisionEngine.initialize({ requestId: task.taskId });
    }

    const payload = {
      goal: task.input.goal || context?.company?.goal || '',
      constraints: task.input.constraints || [],
      budget: task.input.budget || null,
      timeframe: task.input.timeframe || '',
      estimatedRevenue: task.input.estimatedRevenue || null,
      conversionRate: task.input.conversionRate || null,
      averageDealSize: task.input.averageDealSize || null,
      companyName: context?.company?.name || '',
      industry: context?.company?.industry || '',
      productName: context?.company?.product || '',
      scenarios: task.input.scenarios || null,
      userId: context?.request?.userId || '',
      chatId: context?.request?.chatId || '',
    };

    result.addReasoningStep(`Analyzing goal: ${payload.goal}`);

    const decisionResult = await decisionEngine.evaluate(payload);

    if (!decisionResult.success) {
      result.addReasoningStep(`Decision analysis failed: ${decisionResult.error}`);
      result.success = false;
      result.status = 'failed';
      result.errors.push(decisionResult.error);
      result.processingTime = Date.now() - start;
      return result;
    }

    const data = decisionResult.data;

    result.addReasoningStep(`Generated ${data.scenarios?.length || 0} decision scenarios`);

    if (data.decision) {
      result.addFinding({
        type: 'decision',
        goal: payload.goal,
        selectedStrategy: data.decision.label,
        confidence: data.decision.confidence,
        expectedRoi: data.decision.expectedRoi,
        riskLevel: data.decision.risks?.riskLevel || 'unknown',
        impactScore: data.decision.impact?.overallScore || 0,
      });
    }

    if (data.comparison?.rankings) {
      for (const ranking of data.comparison.rankings) {
        result.addReasoningStep(`#${ranking.rank} ${ranking.scenarioLabel}: Score ${(ranking.totalScore * 100).toFixed(1)}%`);
      }
    }

    if (data.decision?.risks?.risks) {
      for (const risk of data.decision.risks.risks) {
        result.addEvidence({ type: 'risk', label: risk.label, level: risk.level, mitigation: risk.mitigation });
      }
    }

    result.addRecommendation({
      type: 'strategic_decision',
      title: data.decision?.label || 'No decision selected',
      action: data.decision?.action || '',
      confidence: data.decision?.confidence || 0,
      expectedRoi: data.decision?.expectedRoi || 0,
      priority: 'high',
      decisionId: data.decisionId,
    });

    result.knowledgeUpdated = ['decision_analysis', 'scenario_outcomes'];
    result.learningUpdated = ['decision_patterns', 'strategy_effectiveness'];

    const scenarioCount = data.scenarios?.length || 0;
    result.confidence = data.decision?.confidence || 0.5;
    result.processingTime = Date.now() - start;
    result.summary = `Decision analysis: ${scenarioCount} scenarios, selected "${data.decision?.label || 'N/A'}" with ${((result.confidence || 0) * 100).toFixed(0)}% confidence`;

    return result;
  }

  async validate(result) {
    const issues = [];
    if (!result.findings || result.findings.length === 0) issues.push('No decision findings produced');
    if (!result.recommendations || result.recommendations.length === 0) issues.push('No decision recommendations');
    return { valid: issues.length === 0, issues, confidence: result.confidence };
  }

  async summarize(result) {
    const decision = result.findings?.find(f => f.type === 'decision');
    let msg = `DecisionAgent: ${decision?.selectedStrategy || 'No selection'}`;
    if (decision) msg += `, confidence ${Math.round((decision.confidence || 0) * 100)}%`;
    msg += `, ${result.reasoningSteps.length} reasoning steps`;
    return msg;
  }
}
