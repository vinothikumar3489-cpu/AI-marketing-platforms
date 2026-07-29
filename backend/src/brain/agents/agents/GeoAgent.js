import { BaseAgent } from '../BaseAgent.js';

export class GeoAgent extends BaseAgent {
  constructor() {
    super('GeoAgent');
    this._version = '1.0.0';
    this._capabilities = ['geo_analysis', 'market_intelligence', 'regional_strategy', 'localization'];
    this._dependencies = [];
  }

  async plan(task, context) {
    const steps = ['Analyser les marchés géographiques', 'Évaluer le potentiel régional', 'Identifier les opportunités de localisation', 'Recommander une stratégie géographique'];
    return { success: true, reasoningSteps: steps, plan: steps };
  }

  async execute(task, context) {
    const start = Date.now();
    const result = this._createResult({ taskId: task.taskId });
    const company = context.company || {};
    const market = task.input.market || context.brainContext?.request?.market || '';
    const language = task.input.language || context.brainContext?.request?.language || '';

    result.addReasoningStep('Analyse géographique');
    result.addEvidence({ type: 'geo_context', source: 'GeoAgent', market, language });

    const memory = context.memory || {};
    const geoMemory = memory?.seoIntelligence?.data?.geoData || {};

    if (market) {
      result.addFinding({ type: 'target_market', market, language, confidence: 0.7 });
      result.addRecommendation({
        type: 'market_expansion',
        title: `Développer la présence sur le marché ${market}`,
        action: 'expand_market',
        target: market,
        priority: 'medium',
        confidence: 0.7,
      });
    }

    if (language) {
      result.addFinding({ type: 'language_target', language, confidence: 0.8 });
      result.addRecommendation({
        type: 'localization',
        title: `Adapter le contenu pour ${language}`,
        action: 'localize_content',
        target: language,
        priority: 'medium',
        confidence: 0.75,
      });
    }

    if (geoMemory && Object.keys(geoMemory).length > 0) {
      result.addReasoningStep('Données géographiques disponibles en mémoire');
      result.addFinding({ type: 'geo_intelligence', data: geoMemory, confidence: 0.85 });
    }

    if (!market && !language) {
      result.addFinding({ type: 'geo_data_gap', note: 'Aucune information géographique disponible' });
    }

    result.knowledgeUpdated = ['geo_market', 'regional_data'];
    result.learningUpdated = ['geo_patterns', 'market_trends'];
    result.confidence = market || language ? 0.7 : 0.3;
    result.processingTime = Date.now() - start;
    result.summary = `Analyse géographique: marché=${market || 'non spécifié'}, langue=${language || 'non spécifiée'}`;

    return result;
  }

  async validate(result) {
    const issues = [];
    if (!result.findings || result.findings.length === 0) issues.push('Aucune donnée géographique');
    return { valid: issues.length === 0, issues, confidence: result.confidence };
  }

  async summarize(result) {
    const markets = result.findings?.filter(f => f.type === 'target_market')?.length || 0;
    return `Agent GEO: ${markets} marchés ciblés, confiance ${Math.round((result.confidence || 0) * 100)}%`;
  }
}
