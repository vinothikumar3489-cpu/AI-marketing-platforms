import { BaseAgent } from '../BaseAgent.js';

export class SeoAgent extends BaseAgent {
  constructor() {
    super('SeoAgent');
    this._version = '1.0.0';
    this._capabilities = ['seo_analysis', 'keyword_research', 'technical_seo', 'seo_strategy'];
    this._dependencies = [];
  }

  async plan(task, context) {
    const steps = [];
    const company = context.company || {};
    const website = company.website || task.input.website || '';

    if (website) steps.push('Analyse website SEO');
    steps.push('Recherche de mots-clés');
    steps.push('Analyse concurrentielle SEO');
    steps.push('Recommandations techniques');
    steps.push('Stratégie de contenu SEO');

    return { success: true, reasoningSteps: steps, plan: steps };
  }

  async execute(task, context) {
    const start = Date.now();
    const result = this._createResult({ taskId: task.taskId });
    const company = context.company || {};
    const website = company.website || task.input.website || '';

    result.addReasoningStep('Analyse des données SEO disponibles');
    result.addEvidence({ type: 'seo_context', source: 'SeoAgent', website });

    const memory = context.memory || {};
    const seoMemory = memory?.seoIntelligence?.data || {};

    const keywords = seoMemory.keywords || task.input.keywords || [];
    const gaps = seoMemory.gaps || [];

    if (keywords.length > 0) {
      result.addReasoningStep(`Analyse de ${keywords.length} mots-clés existants`);
      result.addFinding({ type: 'keyword_analysis', keywords: keywords.slice(0, 10), count: keywords.length });
    }

    if (gaps.length > 0) {
      result.addReasoningStep(`Identification de ${gaps.length} lacunes SEO`);
      result.addFinding({ type: 'seo_gaps', gaps: gaps.slice(0, 10), count: gaps.length });
    }

    if (website) {
      result.addFinding({ type: 'seo_target', website, analysed: true });
      result.addRecommendation({
        type: 'seo_audit',
        title: 'Effectuer un audit SEO complet',
        action: 'run_seo_audit',
        target: website,
        priority: 'high',
        confidence: 0.8,
      });
      result.addRecommendation({
        type: 'keyword_opportunity',
        title: 'Développer la stratégie de mots-clés',
        action: 'research_keywords',
        priority: 'high',
        confidence: 0.75,
      });
    }

    result.knowledgeUpdated = ['seo_keywords', 'rankings', 'technical_seo'];
    result.learningUpdated = ['seo_trends', 'keyword_performance'];
    result.confidence = keywords.length > 0 ? 0.75 : 0.5;
    result.processingTime = Date.now() - start;
    result.summary = `Analyse SEO terminée: ${keywords.length} mots-clés, ${gaps.length} lacunes identifiées`;

    return result;
  }

  async validate(result) {
    const issues = [];
    if (!result.findings || result.findings.length === 0) issues.push('Aucune donnée SEO trouvée');
    return { valid: issues.length === 0, issues, confidence: result.confidence };
  }

  async summarize(result) {
    const findings = result.findings?.length || 0;
    const recs = result.recommendations?.length || 0;
    return `Agent SEO: ${findings} observations, ${recs} recommandations, confiance ${Math.round((result.confidence || 0) * 100)}%`;
  }
}
