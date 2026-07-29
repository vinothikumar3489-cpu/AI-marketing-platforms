import { ModuleAdapter } from './ModuleAdapter.js';

export class ContentStudioAdapter extends ModuleAdapter {
  constructor() {
    super('ContentStudioAdapter');
  }

  async collectEvidence(context) {
    const start = Date.now();
    const request = context?.request || {};
    const memory = context?.memory?.sections || {};

    const sources = [];
    const companyName = request.companyName || '';
    const productName = request.productName || '';

    if (companyName || productName) {
      sources.push({
        type: 'content_context',
        value: { company: companyName, product: productName },
        confidence: 0.6,
        source: 'ContentStudioAdapter',
      });
    }

    if (memory.generatedContent?.exists) {
      const content = memory.generatedContent.data || {};
      sources.push({
        type: 'content_history',
        value: { count: content.count || 1, lastGenerated: content.lastGenerated },
        confidence: 0.8,
        source: 'ContentStudioAdapter.memory',
      });
    }

    this._configured = true;
    this._track(Date.now() - start, sources.length);
    return { sources, module: this._name, companyName, productName };
  }

  async updateKnowledge(context) {
    return { updates: ['content_library', 'content_quality'], module: this._name };
  }

  async updateMemory(context) {
    return { memories: ['generated_content'], module: this._name };
  }

  async updateLearning(context) {
    return { insights: ['content_performance', 'engagement_patterns'], module: this._name };
  }

  async generateContent(brief) {
    return { success: true, data: { note: 'Content generation via Brain', brief, module: 'contentStudio' } };
  }
}
