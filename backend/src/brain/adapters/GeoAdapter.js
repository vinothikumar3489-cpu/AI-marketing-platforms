import { ModuleAdapter } from './ModuleAdapter.js';

export class GeoAdapter extends ModuleAdapter {
  constructor() {
    super('GeoAdapter');
  }

  async collectEvidence(context) {
    const start = Date.now();
    const request = context?.request || {};
    const memory = context?.memory?.sections || {};
    const knowledge = context?.knowledge || {};

    const sources = [];
    let market = request.market || knowledge?.company?.market || '';
    let language = request.language || knowledge?.company?.language || '';

    if (!market && memory?.geoIntelligence?.data?.market) {
      market = memory.geoIntelligence.data.market;
    }
    if (!language && memory?.geoIntelligence?.data?.language) {
      language = memory.geoIntelligence.data.language;
    }

    if (market) {
      sources.push({
        type: 'geo_market',
        value: { market, language },
        confidence: 0.7,
        source: 'GeoAdapter',
      });
    }

    if (memory.seoIntelligence?.exists && memory.seoIntelligence?.data?.geoData) {
      sources.push({
        type: 'geo_intelligence',
        value: memory.seoIntelligence.data.geoData,
        confidence: 0.85,
        source: 'GeoAdapter.memory',
      });
    }

    this._configured = true;
    this._track(Date.now() - start, sources.length);
    return { sources, module: this._name, market, language };
  }

  async updateKnowledge(context) {
    return { updates: ['geo_market', 'regional_data'], module: this._name };
  }

  async updateMemory(context) {
    return { memories: ['geo_intelligence'], module: this._name };
  }

  async updateLearning(context) {
    return { insights: ['geo_patterns', 'market_trends'], module: this._name };
  }
}
