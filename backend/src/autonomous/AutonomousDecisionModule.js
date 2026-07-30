import { BaseAutonomousModule } from './BaseAutonomousModule.js';
import { DecisionEngine } from '../brain/decision/DecisionEngine.js';

export class AutonomousDecisionModule extends BaseAutonomousModule {
  constructor(brainService) {
    super('AutonomousDecisionModule', brainService);
    this._engine = null;
  }

  async initialize(context) {
    this._engine = new DecisionEngine();
    await this._engine.initialize(context);
    await super.initialize(context);
    console.log('[AutonomousDecisionModule] ✓ Decision engine ready for autonomous analysis');
    return { success: true, module: this._name };
  }

  async _run(context) {
    const brain = this._brain;
    const decisionEngine = this._engine;

    const knowledge = brain?.getEngine?.('knowledge');
    const evidence = brain?.getEngine?.('evidence');
    const recommendations = brain?.getEngine?.('recommendations');
    const confidence = brain?.getEngine?.('confidence');

    const knowledgeData = knowledge ? await knowledge.execute({}).catch(() => null) : null;
    const evidenceData = evidence ? await evidence.execute({}).catch(() => null) : null;
    const recData = recommendations ? await recommendations.execute({}).catch(() => null) : null;
    const confidenceData = confidence ? await confidence.execute({}).catch(() => null) : null;

    const companyName = knowledgeData?.company?.name || 'Unknown';
    const productName = knowledgeData?.product?.name || 'Unknown';

    const goals = this._generateAutonomousGoals(knowledgeData, evidenceData, confidenceData);

    const decisions = [];
    for (const goal of goals) {
      try {
        const result = await decisionEngine.evaluate({
          goal: goal.goal,
          constraints: goal.constraints || [],
          budget: goal.budget || null,
          timeframe: goal.timeframe || 'quarter',
          companyName,
          productName,
          estimatedRevenue: knowledgeData?.company?.estimatedRevenue || null,
          industry: knowledgeData?.company?.industry || '',
        });

        if (result.success && result.data?.decision) {
          const decision = result.data.decision;
          decisions.push(decision);

          this._storeOpportunity({
            type: 'strategic_decision',
            id: decision.id,
            title: `Strategic Decision: ${decision.label}`,
            description: decision.description || '',
            goal: goal.goal,
            confidence: decision.confidence || 0,
            expectedRoi: decision.expectedRoi || 0,
            riskLevel: decision.risks?.riskLevel || 'unknown',
            impactScore: decision.impact?.overallScore || 0,
            explanation: decision.selectionRationale || '',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error(`[AutonomousDecisionModule] Goal "${goal.goal}" failed: ${err.message}`);
      }
    }

    return {
      decisions,
      totalGoals: goals.length,
      decisionsGenerated: decisions.length,
      summary: {
        goalsAnalyzed: goals.length,
        decisionsMade: decisions.length,
        topDecision: decisions[0]?.label || null,
        averageConfidence: decisions.length > 0
          ? decisions.reduce((s, d) => s + (d.confidence || 0), 0) / decisions.length
          : 0,
        analyzedAt: new Date().toISOString(),
      },
    };
  }

  _generateAutonomousGoals(knowledge, evidence, confidence) {
    const goals = [];
    const companyName = knowledge?.company?.name || '';

    if (companyName && companyName !== 'Unknown') {
      goals.push({
        goal: `Scale market presence for ${companyName}`,
        constraints: [{ field: 'max_budget', operator: '<=', value: 50000 }],
        budget: 25000,
        timeframe: 'quarter',
      });

      goals.push({
        goal: `Improve marketing ROI for ${companyName}`,
        constraints: [{ field: 'min_roi', operator: '>=', value: 200 }],
        budget: 15000,
        timeframe: 'quarter',
      });
    }

    if (knowledge?.product?.name && knowledge.product.name !== 'Unknown') {
      goals.push({
        goal: `Drive adoption of ${knowledge.product.name}`,
        constraints: [],
        budget: 30000,
        timeframe: 'quarter',
      });
    }

    if (confidence?.weakestSection?.section) {
      goals.push({
        goal: `Strengthen ${confidence.weakestSection.section.replace('_', ' ')} intelligence`,
        constraints: [{ field: 'budget', operator: '<=', value: 10000 }],
        budget: 5000,
        timeframe: 'month',
      });
    }

    return goals;
  }

  async health() {
    return {
      ...(await super.health()),
      decisionEngineReady: !!this._engine,
    };
  }
}
