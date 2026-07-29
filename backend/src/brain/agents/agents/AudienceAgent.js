import { BaseAgent } from '../BaseAgent.js';

export class AudienceAgent extends BaseAgent {
  constructor() {
    super('AudienceAgent');
    this._version = '1.0.0';
    this._capabilities = ['audience_analysis', 'segmentation', 'demographic_analysis', 'persona_development'];
    this._dependencies = [];
  }

  async plan(task, context) {
    const steps = ['Analyser les segments d\'audience', 'Évaluer les personas existants', 'Identifier les opportunités de ciblage', 'Recommander des stratégies d\'engagement'];
    return { success: true, reasoningSteps: steps, plan: steps };
  }

  async execute(task, context) {
    const start = Date.now();
    const result = this._createResult({ taskId: task.taskId });
    const product = context.product || {};

    result.addReasoningStep('Analyse des segments d\'audience');
    result.addEvidence({ type: 'audience_context', source: 'AudienceAgent' });

    const memory = context.memory || {};
    const audienceMemory = memory?.productProfile?.data?.audience || {};
    const segments = audienceMemory.segments || task.input.segments || [];
    const personas = audienceMemory.personas || task.input.personas || [];

    if (segments.length > 0) {
      result.addReasoningStep(`${segments.length} segments d'audience trouvés`);
      for (const seg of segments.slice(0, 10)) {
        result.addFinding({ type: 'audience_segment', name: seg.name || seg, confidence: seg.confidence || 0.7 });
      }
    } else {
      result.addFinding({ type: 'segment_gap', note: 'Aucun segment d\'audience défini' });
    }

    if (personas.length > 0) {
      result.addReasoningStep(`${personas.length} personas identifiés`);
      result.addFinding({ type: 'personas', count: personas.length, personas: personas.slice(0, 5) });
    }

    if (product.name) {
      result.addFinding({ type: 'product_audience_fit', product: product.name, confidence: 0.7 });
      result.addRecommendation({
        type: 'audience_research',
        title: 'Approfondir la recherche d\'audience',
        action: 'research_audience',
        priority: 'medium',
        confidence: 0.7,
      });
    }

    result.knowledgeUpdated = ['audience_segments', 'demographics'];
    result.learningUpdated = ['audience_patterns', 'segmentation_trends'];
    result.confidence = segments.length > 0 ? 0.75 : 0.4;
    result.processingTime = Date.now() - start;
    result.summary = `Analyse d'audience: ${segments.length} segments, ${personas.length} personas`;

    return result;
  }

  async validate(result) {
    const issues = [];
    if (!result.findings || result.findings.length === 0) issues.push('Aucune donnée d\'audience');
    return { valid: issues.length === 0, issues, confidence: result.confidence };
  }

  async summarize(result) {
    const segs = result.findings?.filter(f => f.type === 'audience_segment')?.length || 0;
    return `Agent Audience: ${segs} segments analysés, confiance ${Math.round((result.confidence || 0) * 100)}%`;
  }
}
