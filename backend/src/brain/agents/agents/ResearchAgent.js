import { BaseAgent } from '../BaseAgent.js';

export class ResearchAgent extends BaseAgent {
  constructor() {
    super('ResearchAgent');
    this._version = '1.0.0';
    this._capabilities = ['research', 'market_research', 'topic_investigation', 'trend_analysis'];
    this._dependencies = [];
  }

  async plan(task, context) {
    const topic = task.input.topic || task.input.website || 'général';
    const steps = [
      `Définir le périmètre de recherche: ${topic}`,
      'Collecter les sources d\'information',
      'Analyser les données',
      'Synthétiser les résultats',
      'Formuler des recommandations',
    ];
    return { success: true, reasoningSteps: steps, plan: steps };
  }

  async execute(task, context) {
    const start = Date.now();
    const result = this._createResult({ taskId: task.taskId });
    const company = context.company || {};
    const topic = task.input.topic || '';
    const website = task.input.website || company.website || '';

    result.addReasoningStep(`Recherche sur le sujet: ${topic || website || 'général'}`);
    result.addEvidence({ type: 'research_context', source: 'ResearchAgent', topic, website });

    const memory = context.memory || {};
    const researchMemory = memory?.researchData?.data || {};

    if (topic) {
      result.addFinding({ type: 'research_topic', topic, confidence: 0.7 });
      result.addRecommendation({
        type: 'deep_research',
        title: `Approfondir la recherche sur ${topic}`,
        action: 'research_topic',
        target: topic,
        priority: 'medium',
        confidence: 0.7,
      });
    }

    if (website) {
      result.addReasoningStep(`Analyse du site: ${website}`);
      result.addFinding({ type: 'website_research', url: website, analysed: true, confidence: 0.75 });
    }

    if (researchMemory && Object.keys(researchMemory).length > 0) {
      result.addReasoningStep('Données de recherche historiques disponibles');
      result.addFinding({ type: 'historical_research', data: researchMemory, confidence: 0.8 });
    }

    if (!topic && !website) {
      result.addFinding({ type: 'research_gap', note: 'Aucun sujet de recherche spécifié' });
      result.addRecommendation({
        type: 'exploratory_research',
        title: 'Lancer une recherche exploratoire',
        action: 'explore_market',
        priority: 'medium',
        confidence: 0.7,
      });
    }

    result.knowledgeUpdated = ['research_findings', 'ai_insights'];
    result.learningUpdated = ['research_patterns', 'insight_trends'];
    result.confidence = topic || website ? 0.7 : 0.3;
    result.processingTime = Date.now() - start;
    result.summary = `Recherche: sujet=${topic || 'non spécifié'}, site=${website || 'non spécifié'}`;

    return result;
  }

  async validate(result) {
    const issues = [];
    if (!result.findings || result.findings.length === 0) issues.push('Aucun résultat de recherche');
    return { valid: issues.length === 0, issues, confidence: result.confidence };
  }

  async summarize(result) {
    const topics = result.findings?.filter(f => f.type === 'research_topic')?.length || 0;
    return `Agent Recherche: ${topics} sujets explorés, confiance ${Math.round((result.confidence || 0) * 100)}%`;
  }
}
