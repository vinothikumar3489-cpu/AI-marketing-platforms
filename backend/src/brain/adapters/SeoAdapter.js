import { ModuleAdapter } from './ModuleAdapter.js';

export class SeoAdapter extends ModuleAdapter {
  constructor() {
    super('SeoAdapter');
  }

  async collectEvidence(context) {
    const start = Date.now();
    const request = context?.request || {};
    const memory = context?.memory?.sections || {};

    const sources = [];
    const companyName = request.companyName || '';
    const website = request.website || '';

    if (website) {
      sources.push({
        type: 'seo_target',
        value: { url: website },
        confidence: 0.7,
        source: 'SeoAdapter',
      });
    }

    if (memory.seoIntelligence?.exists) {
      const seo = memory.seoIntelligence.data || {};
      sources.push({
        type: 'seo_analysis',
        value: {
          keywords: seo.keywords,
          rankings: seo.rankings,
          technicalScore: seo.technicalScore,
          gaps: seo.gaps,
        },
        confidence: 0.85,
        source: 'SeoAdapter.memory',
      });
    }

    this._configured = true;
    this._track(Date.now() - start, sources.length);
    return { sources, module: this._name, companyName, website };
  }

  async updateKnowledge(context) {
    return { updates: ['seo_keywords', 'rankings', 'technical_seo'], module: this._name };
  }

  async updateMemory(context) {
    return { memories: ['seo_intelligence'], module: this._name };
  }

  async updateLearning(context) {
    return { insights: ['seo_trends', 'keyword_performance'], module: this._name };
  }

  async analyze(url) {
    return { success: true, data: { note: 'SEO analysis via Brain', url, module: 'seo' } };
  }
}
