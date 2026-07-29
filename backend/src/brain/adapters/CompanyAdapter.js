import { ModuleAdapter } from './ModuleAdapter.js';

export class CompanyAdapter extends ModuleAdapter {
  constructor() {
    super('CompanyAdapter');
  }

  async collectEvidence(context) {
    const start = Date.now();
    const request = context?.request || {};
    const memory = context?.memory?.sections || {};
    const knowledge = context?.knowledge || {};

    const sources = [];
    const companyName = request.companyName || knowledge?.company?.name || '';
    const website = request.website || knowledge?.company?.website || '';
    const industry = request.industry || knowledge?.company?.industry || '';

    if (companyName) {
      sources.push({
        type: 'company_facts',
        value: { name: companyName, website, industry },
        confidence: website ? 0.8 : 0.5,
        source: 'CompanyAdapter',
      });
    }

    if (memory.companyIntelligence?.exists && memory.companyIntelligence?.data) {
      sources.push({
        type: 'company_intelligence',
        value: memory.companyIntelligence.data,
        confidence: 0.9,
        source: 'CompanyAdapter.memory',
      });
    }

    this._configured = true;
    this._track(Date.now() - start, sources.length);
    return { sources, module: this._name, companyName, website, industry };
  }

  async updateKnowledge(context) {
    const evidence = context?.evidence?.company || {};
    return {
      updates: Object.keys(evidence).length > 0 ? ['company_facts', 'industry', 'products'] : [],
      module: this._name,
    };
  }

  async updateMemory(context) {
    return { memories: ['company_intelligence'], module: this._name };
  }

  async updateLearning(context) {
    return { insights: ['company_patterns', 'industry_trends'], module: this._name };
  }
}
