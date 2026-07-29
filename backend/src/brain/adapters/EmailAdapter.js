import { ModuleAdapter } from './ModuleAdapter.js';

export class EmailAdapter extends ModuleAdapter {
  constructor() {
    super('EmailAdapter');
  }

  async collectEvidence(context) {
    const start = Date.now();
    const request = context?.request || {};
    const memory = context?.memory?.sections || {};

    const sources = [];
    const companyName = request.companyName || '';
    const campaignId = request.campaignId || request.payload?.campaignId || '';

    if (companyName || campaignId) {
      sources.push({
        type: 'email_context',
        value: { company: companyName, campaignId },
        confidence: 0.6,
        source: 'EmailAdapter',
      });
    }

    if (memory.emailIntelligence?.exists) {
      const email = memory.emailIntelligence.data || {};
      sources.push({
        type: 'email_performance',
        value: { sent: email.sent, opens: email.opens, clicks: email.clicks, deliveries: email.deliveries },
        confidence: 0.85,
        source: 'EmailAdapter.memory',
      });
    }

    this._configured = true;
    this._track(Date.now() - start, sources.length);
    return { sources, module: this._name, companyName, campaignId };
  }

  async updateKnowledge(context) {
    return { updates: ['email_campaigns', 'delivery_metrics'], module: this._name };
  }

  async updateMemory(context) {
    return { memories: ['email_intelligence'], module: this._name };
  }

  async updateLearning(context) {
    return { insights: ['email_performance_patterns', 'engagement_trends'], module: this._name };
  }

  async compose(params) {
    return { success: true, data: { note: 'AI-powered email composition via Brain', params, module: 'email' } };
  }
}
