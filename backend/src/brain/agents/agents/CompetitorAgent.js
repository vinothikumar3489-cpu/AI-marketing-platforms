import { BaseAgent } from '../BaseAgent.js';

export class CompetitorAgent extends BaseAgent {
  constructor() {
    super('CompetitorAgent');
    this._version = '1.0.0';
    this._capabilities = ['competitor_analysis', 'competitive_intelligence', 'market_positioning'];
    this._dependencies = [];
  }

  async plan(task, context) {
    const steps = ['Identifier les concurrents', 'Analyser le positionnement', 'Comparer les stratégies', 'Détecter les menaces et opportunités'];
    return { success: true, reasoningSteps: steps, plan: steps };
  }

  async execute(task, context) {
    const start = Date.now();
    const result = this._createResult({ taskId: task.taskId });
    const company = context.company || {};
    const product = context.product || {};

    result.addReasoningStep('Analyse du paysage concurrentiel');
    result.addEvidence({ type: 'competitor_context', source: 'CompetitorAgent', company: company.name });

    const knowledge = context.knowledge || {};
    const competitors = knowledge.competitors || task.input.competitors || [];

    if (competitors.length > 0) {
      result.addReasoningStep(`Analyse de ${competitors.length} concurrents`);
      for (const comp of competitors.slice(0, 10)) {
        result.addFinding({
          type: 'competitor_profile',
          name: comp.name || comp,
          confidence: 0.7,
          source: 'CompetitorAgent',
        });
      }
      result.addRecommendation({
        type: 'competitive_strategy',
        title: 'Développer une stratégie de différenciation',
        action: 'create_positioning',
        confidence: 0.75,
        priority: 'high',
      });
    } else {
      result.addReasoningStep('Aucun concurrent trouvé dans le contexte');
      result.addFinding({ type: 'no_competitors', note: 'Aucune donnée concurrentielle disponible' });
      result.addRecommendation({
        type: 'competitor_research',
        title: 'Lancer une analyse concurrentielle',
        action: 'run_competitor_analysis',
        priority: 'high',
        confidence: 0.9,
      });
    }

    result.knowledgeUpdated = ['competitors', 'market_positioning'];
    result.learningUpdated = ['competitor_patterns', 'market_trends'];
    result.confidence = competitors.length > 0 ? 0.7 : 0.4;
    result.processingTime = Date.now() - start;
    result.summary = `Analyse concurrentielle: ${competitors.length} concurrents évalués`;

    return result;
  }

  async validate(result) {
    const issues = [];
    const findings = result.findings || [];
    if (findings.length === 0) issues.push('Aucun concurrent identifié');
    return { valid: issues.length === 0, issues, confidence: result.confidence };
  }

  async summarize(result) {
    const count = result.findings?.filter(f => f.type === 'competitor_profile')?.length || 0;
    return `Agent Concurrentiel: ${count} concurrents analysés, confiance ${Math.round((result.confidence || 0) * 100)}%`;
  }
}
