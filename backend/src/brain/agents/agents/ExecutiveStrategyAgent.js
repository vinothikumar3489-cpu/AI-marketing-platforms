import { BaseAgent } from '../BaseAgent.js';

export class ExecutiveStrategyAgent extends BaseAgent {
  constructor() {
    super('ExecutiveStrategyAgent');
    this._version = '1.0.0';
    this._capabilities = ['executive_strategy', 'strategic_planning', 'cross_agent_synthesis', 'gap_analysis'];
    this._dependencies = ['SeoAgent', 'CompetitorAgent', 'ContentAgent', 'AudienceAgent', 'CampaignAgent', 'GeoAgent', 'CrmAgent', 'AnalyticsAgent', 'ResearchAgent', 'EmailAgent'];
  }

  async plan(task, context) {
    const steps = [
      'Collecter les résultats de tous les agents',
      'Synthétiser les conclusions',
      'Identifier les conflits',
      'Prioriser les actions',
      'Détecter les lacunes',
      'Générer des recommandations stratégiques',
    ];
    return { success: true, reasoningSteps: steps, plan: steps };
  }

  async execute(task, context) {
    const start = Date.now();
    const result = this._createResult({ taskId: task.taskId });
    const company = context.company || {};

    result.addReasoningStep('Synthèse multi-agents');
    result.addEvidence({ type: 'executive_context', source: 'ExecutiveStrategyAgent', company: company.name });

    const allResults = context.agentResults || {};
    const agentNames = Object.keys(allResults);
    result.addReasoningStep(`${agentNames.length} agents ont contribué`);

    const allFindings = [];
    const allRecommendations = [];

    for (const [agentName, agentResult] of Object.entries(allResults)) {
      if (agentResult.findings) {
        for (const f of agentResult.findings) {
          allFindings.push({ ...f, sourceAgent: agentName });
        }
      }
      if (agentResult.recommendations) {
        for (const r of agentResult.recommendations) {
          allRecommendations.push({ ...r, sourceAgent: agentName });
        }
      }
    }

    result.addFinding({ type: 'cross_agent_synthesis', agentsParticipated: agentNames.length, totalFindings: allFindings.length, totalRecommendations: allRecommendations.length });

    const criticalActions = allRecommendations.filter(r => r.priority === 'critical');
    const highPriority = allRecommendations.filter(r => r.priority === 'high');

    if (criticalActions.length > 0) {
      result.addReasoningStep(`${criticalActions.length} actions critiques identifiées`);
      for (const action of criticalActions) {
        result.addStrategicAction({
          type: 'critical',
          title: action.title,
          action: action.action,
          sourceAgent: action.sourceAgent,
          confidence: action.confidence || 0.8,
        });
      }
    }

    if (highPriority.length > 0) {
      result.addReasoningStep(`${highPriority.length} actions haute priorité`);
      for (const action of highPriority.slice(0, 10)) {
        result.addStrategicAction({
          type: 'high_priority',
          title: action.title,
          action: action.action,
          sourceAgent: action.sourceAgent,
          confidence: action.confidence || 0.7,
        });
      }
    }

    const dataGaps = allFindings.filter(f =>
      f.type?.includes('gap') || f.type?.includes('missing') || f.note?.includes('Aucune')
    );
    if (dataGaps.length > 0) {
      result.addReasoningStep(`${dataGaps.length} lacunes de données détectées`);
      result.addFinding({ type: 'intelligence_gaps', gaps: dataGaps.map(g => ({ note: g.note || g.type, source: g.sourceAgent })) });
      result.addRecommendation({
        type: 'fill_intelligence_gaps',
        title: 'Combler les lacunes de connaissances',
        action: 'collect_missing_intelligence',
        priority: 'high',
        confidence: 0.85,
      });
    }

    const gapAgents = new Set(dataGaps.map(g => g.sourceAgent));
    if (gapAgents.size > 0) {
      result.addRecommendation({
        type: 'agent_data_collection',
        title: `Activer la collecte de données pour: ${Array.from(gapAgents).join(', ')}`,
        action: 'activate_data_collection',
        priority: 'high',
        confidence: 0.8,
      });
    }

    const allConfs = agentNames.map(n => allResults[n]?.confidence || 0).filter(c => c > 0);
    const avgConfidence = allConfs.length > 0
      ? Math.round(allConfs.reduce((s, c) => s + c, 0) / allConfs.length * 1000) / 1000
      : 0;

    result.addFinding({ type: 'overall_confidence', averageConfidence: avgConfidence, agentsEvaluated: allConfs.length });
    result.addStrategicAction({
      type: 'strategic_recommendation',
      title: 'Synthèse exécutive',
      summary: `Analyse multi-agents terminée: ${allFindings.length} observations, ${allRecommendations.length} recommandations, ${dataGaps.length} lacunes`,
      confidence: avgConfidence || 0.6,
    });

    result.knowledgeUpdated = ['strategic_insights', 'cross_agent_findings'];
    result.learningUpdated = ['strategic_patterns', 'multi_agent_effectiveness'];
    result.confidence = avgConfidence || 0.6;
    result.processingTime = Date.now() - start;
    result.summary = `Stratégie exécutive: ${agentNames.length} agents, ${allFindings.length} observations, ${allRecommendations.length} recommandations`;

    return result;
  }

  async validate(result) {
    const issues = [];
    if (!result.findings || result.findings.length === 0) issues.push('Aucune synthèse produite');
    if (!result.strategicActions || result.strategicActions.length === 0) issues.push('Aucune action stratégique');
    return { valid: issues.length === 0, issues, confidence: result.confidence };
  }

  async summarize(result) {
    const agents = result.findings?.filter(f => f.type === 'cross_agent_synthesis')?.[0];
    const gaps = result.findings?.filter(f => f.type === 'intelligence_gaps')?.[0];
    let msg = `Agent Stratégie: ${agents?.agentsParticipated || 0} agents`;
    if (gaps) msg += `, ${gaps.gaps?.length || 0} lacunes`;
    msg += `, confiance ${Math.round((result.confidence || 0) * 100)}%`;
    return msg;
  }
}
