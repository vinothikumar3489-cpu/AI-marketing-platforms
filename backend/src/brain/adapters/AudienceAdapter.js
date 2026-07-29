import { ModuleAdapter } from './ModuleAdapter.js';

export class AudienceAdapter extends ModuleAdapter {
  constructor() {
    super('AudienceAdapter');
  }

  async collectEvidence(context) {
    const start = Date.now();
    const request = context?.request || {};
    const memory = context?.memory?.sections || {};
    const knowledge = context?.knowledge || {};

    const sources = [];
    const productName = request.productName || knowledge?.product?.name || '';

    if (productName) {
      sources.push({
        type: 'audience_target',
        value: { product: productName },
        confidence: 0.6,
        source: 'AudienceAdapter',
      });
    }

    if (memory.productProfile?.exists && memory.productProfile?.data?.audience) {
      sources.push({
        type: 'audience_profile',
        value: memory.productProfile.data.audience,
        confidence: 0.85,
        source: 'AudienceAdapter.memory',
      });
    }

    this._configured = true;
    this._track(Date.now() - start, sources.length);
    return { sources, module: this._name, productName };
  }

  async updateKnowledge(context) {
    return { updates: ['audience_segments', 'demographics'], module: this._name };
  }

  async updateMemory(context) {
    return { memories: ['audience_intelligence'], module: this._name };
  }

  async updateLearning(context) {
    return { insights: ['audience_patterns', 'segmentation_trends'], module: this._name };
  }
}
