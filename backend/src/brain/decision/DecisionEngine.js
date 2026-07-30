import { BaseEngine } from '../engine.js';
import { DecisionContext } from './DecisionContext.js';
import { DecisionScenario } from './DecisionScenario.js';
import { DecisionSimulator } from './DecisionSimulator.js';
import { RiskAnalyzer } from './RiskAnalyzer.js';
import { ImpactAnalyzer } from './ImpactAnalyzer.js';
import { ConstraintEngine } from './ConstraintEngine.js';
import { TradeoffAnalyzer } from './TradeoffAnalyzer.js';
import { DecisionExplainer } from './DecisionExplainer.js';
import { DecisionMemory } from './DecisionMemory.js';
import { DecisionHealth } from './DecisionHealth.js';
import { generateBrainId, elapsedMs, logEngine, EngineStatus } from '../core.js';

const STRATEGY_TEMPLATES = [
  {
    id: 'increase_ad_spend',
    label: 'Increase Ad Spend',
    description: 'Scale paid advertising across high-performing channels',
    action: 'Increase ad spend and optimize campaign targeting',
    defaultParams: { budgetChange: 25, channelEfficiency: 0.7, marketSaturation: 0.3, aggressiveness: 0.4, optimizationLevel: 0.6 },
    pros: ['Quick traffic and lead generation', 'Scalable and measurable', 'Precise targeting capabilities'],
    cons: ['Can become expensive at scale', 'Requires continuous optimization', 'Ad fatigue over time'],
  },
  {
    id: 'content_marketing',
    label: 'Content Marketing & SEO',
    description: 'Invest in content creation and search engine optimization for organic growth',
    action: 'Develop and distribute high-quality content with SEO optimization',
    defaultParams: { budgetChange: 15, optimizationLevel: 0.7, aggressiveness: 0.3 },
    pros: ['Compounding organic returns', 'Builds long-term authority', 'Cost-effective over time'],
    cons: ['Slow to show results (3-6 months)', 'Requires consistent effort', 'Difficult to measure directly'],
  },
  {
    id: 'email_campaign',
    label: 'Email Marketing Campaign',
    description: 'Launch targeted email campaigns to nurture leads and drive conversions',
    action: 'Design and execute multi-channel email nurture campaign',
    defaultParams: { budgetChange: 10, optimizationLevel: 0.8, channelEfficiency: 0.8, aggressiveness: 0.3 },
    pros: ['High ROI potential', 'Direct audience reach', 'Personalization capabilities'],
    cons: ['List quality dependency', 'Deliverability challenges', 'Requires quality content'],
  },
  {
    id: 'product_launch',
    label: 'Product/Feature Launch',
    description: 'Introduce new product or feature to capture market attention',
    action: 'Plan and execute product launch with integrated marketing campaign',
    defaultParams: { budgetChange: 30, aggressiveness: 0.6, innovationLevel: 0.8, optimizationLevel: 0.5 },
    pros: ['Market differentiation', 'PR and media opportunities', 'Customer excitement generation'],
    cons: ['High investment required', 'Execution risk', 'Market acceptance uncertainty'],
  },
  {
    id: 'retention_program',
    label: 'Customer Retention Program',
    description: 'Implement programs to improve customer retention and reduce churn',
    action: 'Launch customer retention initiatives including loyalty programs and engagement campaigns',
    defaultParams: { budgetChange: 15, optimizationLevel: 0.7, channelEfficiency: 0.6, aggressiveness: 0.2 },
    pros: ['Improves LTV', 'Lower cost than acquisition', 'Builds brand advocates'],
    cons: ['Results take time', 'Requires customer insights', 'Ongoing engagement needed'],
  },
  {
    id: 'integrated_strategy',
    label: 'Integrated Multi-Channel Strategy',
    description: 'Combine paid, organic, email, and retention for maximum impact',
    action: 'Execute coordinated multi-channel marketing strategy across all channels',
    defaultParams: { budgetChange: 40, channelEfficiency: 0.8, marketSaturation: 0.4, aggressiveness: 0.5, optimizationLevel: 0.7 },
    pros: ['Maximum reach and impact', 'Channel synergies', 'Balanced risk distribution'],
    cons: ['Complex coordination', 'Highest resource requirement', 'Difficult attribution'],
  },
];

export class DecisionEngine extends BaseEngine {
  constructor() {
    super('DecisionEngine');
    this._simulator = new DecisionSimulator();
    this._riskAnalyzer = new RiskAnalyzer();
    this._impactAnalyzer = new ImpactAnalyzer();
    this._constraintEngine = new ConstraintEngine();
    this._tradeoffAnalyzer = new TradeoffAnalyzer();
    this._explainer = new DecisionExplainer();
    this._memory = null;
    this._health = null;
  }

  setDependencies(deps = {}) {
    if (deps.decisionMemory) this._memory = deps.decisionMemory;
    if (deps.decisionHealth) this._health = deps.decisionHealth;
  }

  async initialize(context) {
    if (!this._memory) {
      this._memory = new DecisionMemory();
      await this._memory.initialize(context);
    }
    if (!this._health) {
      this._health = new DecisionHealth();
      await this._health.initialize(context);
    }
    await this._simulator.initialize(context);
    await this._riskAnalyzer.initialize(context);
    await this._impactAnalyzer.initialize(context);
    await this._constraintEngine.initialize(context);
    await this._tradeoffAnalyzer.initialize(context);
    await this._explainer.initialize(context);
    return super.initialize(context);
  }

  async execute(context) {
    const rid = context?.requestId || generateBrainId();
    const start = Date.now();
    logEngine(this._name, rid, 0, EngineStatus.RUNNING);

    try {
      const payload = context?.request?.payload || context?.payload || {};
      let decisionContext;

      if (payload.goal) {
        decisionContext = new DecisionContext({
          goal: payload.goal,
          constraints: payload.constraints || [],
          budget: payload.budget || null,
          timeframe: payload.timeframe || '',
          businessContext: {
            estimatedRevenue: payload.estimatedRevenue || null,
            conversionRate: payload.conversionRate || null,
            averageDealSize: payload.averageDealSize || null,
            ...(context?.knowledge || {}),
            ...(context?.evidence?.data || {}),
          },
          evidence: context.evidence || null,
          knowledgeGraph: context.graph || null,
          learningHistory: context.learning || null,
          recommendations: context.recommendations?.items || [],
          confidence: context.confidence || null,
          requestId: rid,
          userId: context.request?.userId || payload.userId || '',
          companyName: context.knowledge?.company?.name || payload.companyName || '',
          industry: context.knowledge?.company?.industry || payload.industry || '',
          productName: context.knowledge?.product?.name || payload.productName || '',
          chatId: context.request?.chatId || payload.chatId || '',
        });
      } else {
        decisionContext = DecisionContext.fromBrainContext
          ? DecisionContext.fromBrainContext(context)
          : new DecisionContext(context);
      }

    if (decisionContext.constraints?.length > 0) {
      await this._constraintEngine.execute({ decisionContext });
    }

    const scenarios = payload.scenarios
        ? payload.scenarios.map(s => new DecisionScenario(s))
        : await this._generateScenarios(decisionContext);

      if (scenarios.length === 0) {
        return { success: false, error: 'No scenarios could be generated', data: null };
      }

      for (const scenario of scenarios) {
        const simulation = await this._simulator.execute({ decisionContext, scenario });
        scenario.setSimulatedOutcomes(simulation.outcomes);
        scenario.confidence = simulation.confidence;

        const riskResult = await this._riskAnalyzer.execute({ decisionContext, scenario });
        scenario.setRisks(riskResult);

        const impactResult = await this._impactAnalyzer.execute({ decisionContext, scenario });
        scenario.setImpact(impactResult);
      }

      const comparison = scenarios.length >= 2
        ? await this._tradeoffAnalyzer.execute({ decisionContext, scenarios })
        : null;

      let selectedScenario = null;
      if (comparison?.rankings?.length > 0) {
        const winnerId = comparison.rankings[0].scenarioId;
        selectedScenario = scenarios.find(s => s.id === winnerId);
        if (selectedScenario) {
          selectedScenario.selected = true;
          selectedScenario.rank = 1;
          for (let i = 0; i < scenarios.length; i++) {
            scenarios[i].rank = comparison.rankings.find(r => r.scenarioId === scenarios[i].id)?.rank || 0;
          }
        }
      } else if (scenarios.length === 1) {
        selectedScenario = scenarios[0];
        selectedScenario.selected = true;
        selectedScenario.rank = 1;
      }

      if (selectedScenario) {
        const explanationResult = await this._explainer.execute({
          decisionContext,
          scenario: selectedScenario,
          comparison,
          riskAnalysis: selectedScenario.risks,
          impactAnalysis: selectedScenario.impact,
        });
        selectedScenario.selectionRationale = explanationResult.explanation || '';
      }

      let memResult = null;
      if (this._memory) {
        memResult = await this._memory.storeDecision({
          goal: decisionContext.goal,
          context: decisionContext.toJSON(),
          scenarios: scenarios.map(s => s.toJSON()),
          selectedScenario: selectedScenario?.toJSON() || null,
          comparison,
          explanation: selectedScenario?.selectionRationale || null,
          confidence: selectedScenario?.confidence || 0,
          userId: decisionContext.userId,
          chatId: decisionContext.chatId,
          companyName: decisionContext.companyName,
          productName: decisionContext.productName,
        });
      }

      logEngine(this._name, rid, elapsedMs(start), EngineStatus.COMPLETED);

      return {
        success: true,
        data: {
          decision: selectedScenario?.toJSON() || null,
          scenarios: scenarios.map(s => s.toJSON()),
          comparison: comparison || null,
          explanation: selectedScenario?.selectionRationale || null,
          decisionId: selectedScenario?.id || null,
          memory: memResult || null,
        },
        decisions: [selectedScenario?.toJSON()].filter(Boolean),
        decisionId: selectedScenario?.id || null,
      };
    } catch (err) {
      logEngine(this._name, rid, elapsedMs(start), EngineStatus.FAILED, err.message);
      return { success: false, error: err.message, data: null };
    }
  }

  async evaluate(payload) {
    const mockContext = { requestId: generateBrainId(), payload };
    return this.execute(mockContext);
  }

  async simulate(payload) {
    const scenario = new DecisionScenario({
      label: payload.label || 'Custom Scenario',
      description: payload.description || '',
      action: payload.action || '',
      parameters: payload.parameters || {},
    });

    const decisionContext = new DecisionContext({
      goal: payload.goal || '',
      budget: payload.budget || null,
      timeframe: payload.timeframe || '',
      businessContext: payload.businessContext || {},
    });

    const simulation = await this._simulator.execute({ decisionContext, scenario });
    scenario.setSimulatedOutcomes(simulation.outcomes);

    const riskResult = await this._riskAnalyzer.execute({ decisionContext, scenario });
    scenario.setRisks(riskResult);

    const impactResult = await this._impactAnalyzer.execute({ decisionContext, scenario });
    scenario.setImpact(impactResult);

    return {
      success: true,
      data: {
        scenario: scenario.toJSON(),
        simulation,
        risks: riskResult,
        impact: impactResult,
      },
    };
  }

  async compare(scenariosData, contextData) {
    const scenarios = scenariosData.map(s => new DecisionScenario(s));
    const decisionContext = new DecisionContext(contextData || {});

    for (const scenario of scenarios) {
      const simulation = await this._simulator.execute({ decisionContext, scenario });
      scenario.setSimulatedOutcomes(simulation.outcomes);
      scenario.confidence = simulation.confidence;

      const riskResult = await this._riskAnalyzer.execute({ decisionContext, scenario });
      scenario.setRisks(riskResult);

      const impactResult = await this._impactAnalyzer.execute({ decisionContext, scenario });
      scenario.setImpact(impactResult);
    }

    const comparison = await this._tradeoffAnalyzer.execute({ decisionContext, scenarios });

    return {
      success: true,
      data: {
        scenarios: scenarios.map(s => s.toJSON()),
        comparison,
      },
    };
  }

  async _generateScenarios(context) {
    const budget = context.budget || 0;
    let templates = [...STRATEGY_TEMPLATES];

    if (budget < 10000) {
      templates = templates.filter(t => !['integrated_strategy', 'product_launch'].includes(t.id));
    }

    if (context.recommendations?.length > 0) {
      const recLabels = context.recommendations.map(r => (r.label || r.type || '').toLowerCase());
      templates = templates.filter(t => {
        const matches = recLabels.some(r => t.description.toLowerCase().includes(r) || r.includes(t.id.replace(/_/g, ' ')));
        return matches || templates.indexOf(t) < 3;
      });
    }

    const industry = (context.businessContext?.industry || context.industry || '').toLowerCase();
    if (industry.includes('saas') || industry.includes('software') || industry.includes('tech')) {
      const saasTemplate = {
        id: 'freemium_trial',
        label: 'Freemium/Trial Optimization',
        description: 'Optimize free trial and freemium conversion funnel',
        action: 'Implement trial optimization with email nurture and in-app guidance',
        defaultParams: { budgetChange: 20, optimizationLevel: 0.8, channelEfficiency: 0.6, aggressiveness: 0.4 },
        pros: ['Direct conversion improvement', 'Data-driven optimization', 'Scalable across user base'],
        cons: ['Requires product integration', 'Results depend on product experience', 'Trial period management'],
      };
      templates.push(saasTemplate);
    }

    const scenarios = templates.map((t, idx) => {
      const params = { ...t.defaultParams };
      if (budget > 0) {
        const actualBudget = budget * (params.budgetChange / 100);
        params.budget = Math.round(actualBudget);
      }
      return new DecisionScenario({
        label: t.label,
        description: t.description,
        action: t.action,
        parameters: params,
        pros: t.pros,
        cons: t.cons,
        priority: idx + 1,
      });
    });

    return scenarios;
  }

  async queryHistory(filters = {}) {
    if (!this._memory) return { success: true, data: [] };
    const decisions = await this._memory.getDecisions(filters);
    return { success: true, data: decisions };
  }

  async getDecisionById(decisionId) {
    if (!this._memory) return { success: false, error: 'Decision memory not available' };
    const decision = await this._memory.getDecision(decisionId);
    if (!decision) return { success: false, error: 'Decision not found' };
    return { success: true, data: decision };
  }

  async recordOutcome(decisionId, outcome) {
    if (!this._memory) return { success: false, error: 'Decision memory not available' };
    return this._memory.recordOutcome(decisionId, outcome);
  }

  async health() {
    return {
      name: this._name,
      status: 'HEALTHY',
      initialized: this._initialized,
      subEngines: {
        simulator: (await this._simulator.health()).status,
        riskAnalyzer: (await this._riskAnalyzer.health()).status,
        impactAnalyzer: (await this._impactAnalyzer.health()).status,
        constraintEngine: (await this._constraintEngine.health()).status,
        tradeoffAnalyzer: (await this._tradeoffAnalyzer.health()).status,
        explainer: (await this._explainer.health()).status,
      },
      memoryAvailable: !!this._memory,
    };
  }

  get memory() { return this._memory; }
  get healthService() { return this._health; }
  get simulator() { return this._simulator; }
  get riskAnalyzer() { return this._riskAnalyzer; }
  get impactAnalyzer() { return this._impactAnalyzer; }
  get constraintEngine() { return this._constraintEngine; }
  get tradeoffAnalyzer() { return this._tradeoffAnalyzer; }
  get explainer() { return this._explainer; }
}
