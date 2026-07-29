import { ModuleAdapter } from './ModuleAdapter.js';

export class ResearchAdapter extends ModuleAdapter {
  constructor() {
    super('ResearchAdapter');
  }

  async collectEvidence(context) {
    const start = Date.now();
    const request = context?.request || {};
    const memory = context?.memory?.sections || {};

    const sources = [];
    const companyName = request.companyName || '';
    const website = request.website || '';
    const researchTopic = request.topic || request.payload?.topic || '';

    if (website) {
      sources.push({
        type: 'research_website',
        value: { url: website },
        confidence: 0.7,
        source: 'ResearchAdapter',
      });
    }

    if (researchTopic) {
      sources.push({
        type: 'research_topic',
        value: { topic: researchTopic },
        confidence: 0.6,
        source: 'ResearchAdapter',
      });
    }

    if (memory.researchData?.exists) {
      const research = memory.researchData.data || {};
      sources.push({
        type: 'research_history',
        value: { lastAnalysis: research.lastAnalysis, findings: research.findings },
        confidence: 0.8,
        source: 'ResearchAdapter.memory',
      });
    }

    this._configured = true;
    this._track(Date.now() - start, sources.length);
    return { sources, module: this._name, companyName, website, researchTopic };
  }

  async updateKnowledge(context) {
    return { updates: ['research_findings', 'ai_insights'], module: this._name };
  }

  async updateMemory(context) {
    return { memories: ['research_data'], module: this._name };
  }

  async updateLearning(context) {
    return { insights: ['research_patterns', 'insight_trends'], module: this._name };
  }
}
