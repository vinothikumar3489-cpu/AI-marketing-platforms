import { BaseAgent } from '../BaseAgent.js';

export class ContentAgent extends BaseAgent {
  constructor() {
    super('ContentAgent');
    this._version = '1.0.0';
    this._capabilities = ['content_generation', 'content_strategy', 'content_analysis'];
    this._dependencies = [];
  }

  async plan(task, context) {
    const steps = ['Analyser les besoins en contenu', 'Évaluer le contenu existant', 'Planifier la stratégie éditoriale', 'Formuler des recommandations'];
    return { success: true, reasoningSteps: steps, plan: steps };
  }

  async execute(task, context) {
    const start = Date.now();
    const result = this._createResult({ taskId: task.taskId });
    const company = context.company || {};
    const product = context.product || {};

    result.addReasoningStep('Analyse du contexte de contenu');
    result.addEvidence({ type: 'content_context', source: 'ContentAgent', company: company.name, product: product.name });

    const memory = context.memory || {};
    const contentMemory = memory?.generatedContent?.data || {};

    const existingCount = contentMemory.count || 0;
    const topics = task.input.topics || [];

    if (existingCount > 0) {
      result.addReasoningStep(`${existingCount} contenus existants trouvés`);
      result.addFinding({ type: 'existing_content', count: existingCount, quality: contentMemory.quality || 'unknown' });
    }

    if (topics.length > 0) {
      result.addReasoningStep(`Planification pour ${topics.length} sujets`);
      for (const topic of topics.slice(0, 10)) {
        result.addFinding({ type: 'content_opportunity', topic, confidence: 0.7 });
      }
    }

    if (company.name || product.name) {
      result.addFinding({ type: 'content_readiness', company: company.name, product: product.name, ready: true });
      result.addRecommendation({
        type: 'content_plan',
        title: 'Générer du contenu optimisé SEO',
        action: 'generate_content',
        priority: 'high',
        confidence: 0.8,
      });
    }

    result.knowledgeUpdated = ['content_library', 'content_quality'];
    result.learningUpdated = ['content_performance', 'engagement_patterns'];
    result.confidence = existingCount > 0 || topics.length > 0 ? 0.7 : 0.5;
    result.processingTime = Date.now() - start;
    result.summary = `Analyse de contenu: ${existingCount} existants, ${topics.length} nouveaux sujets`;

    return result;
  }

  async validate(result) {
    const issues = [];
    if (!result.findings || result.findings.length === 0) issues.push('Aucune recommandation de contenu');
    return { valid: issues.length === 0, issues, confidence: result.confidence };
  }

  async summarize(result) {
    const topics = result.findings?.filter(f => f.type === 'content_opportunity')?.length || 0;
    return `Agent Contenu: ${topics} sujets identifiés, confiance ${Math.round((result.confidence || 0) * 100)}%`;
  }
}
