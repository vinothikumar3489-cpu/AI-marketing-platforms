import { ModuleAdapter } from './ModuleAdapter.js';

export class CampaignAdapter extends ModuleAdapter {
  constructor() {
    super('CampaignAdapter');
  }

  async collectEvidence(context) {
    const start = Date.now();
    const request = context?.request || {};
    const memory = context?.memory?.sections || {};

    const sources = [];
    const companyName = request.companyName || '';
    const campaignId = request.campaignId || request.payload?.campaignId || '';

    if (companyName) {
      sources.push({
        type: 'campaign_context',
        value: { company: companyName, campaignId },
        confidence: 0.6,
        source: 'CampaignAdapter',
      });
    }

    if (memory.campaignIntelligence?.exists) {
      const data = memory.campaignIntelligence.data || {};
      sources.push({
        type: 'campaign_history',
        value: { objectives: data.objectives, channels: data.channels },
        confidence: 0.8,
        source: 'CampaignAdapter.memory',
      });
    }

    this._configured = true;
    this._track(Date.now() - start, sources.length);
    return { sources, module: this._name, companyName, campaignId };
  }

  async updateKnowledge(context) {
    return { updates: ['campaign_plans', 'channel_strategy'], module: this._name };
  }

  async updateMemory(context) {
    return { memories: ['campaign_intelligence'], module: this._name };
  }

  async updateLearning(context) {
    return { insights: ['campaign_performance', 'channel_effectiveness'], module: this._name };
  }

  async plan(brief) {
    return { success: true, data: { note: 'Campaign planning via Brain', brief, module: 'campaign' } };
  }
}
