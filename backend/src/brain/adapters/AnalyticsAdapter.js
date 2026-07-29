import { ModuleAdapter } from './ModuleAdapter.js';

export class AnalyticsAdapter extends ModuleAdapter {
  constructor() {
    super('AnalyticsAdapter');
  }

  async collectEvidence(context) {
    const start = Date.now();
    const request = context?.request || {};
    const memory = context?.memory?.sections || {};

    const sources = [];
    const companyName = request.companyName || '';
    const reportType = request.reportType || request.payload?.type || '';

    if (companyName) {
      sources.push({
        type: 'analytics_context',
        value: { company: companyName, reportType },
        confidence: 0.6,
        source: 'AnalyticsAdapter',
      });
    }

    if (memory.analyticsData?.exists) {
      const analytics = memory.analyticsData.data || {};
      sources.push({
        type: 'analytics_metrics',
        value: {
          traffic: analytics.traffic,
          conversions: analytics.conversions,
          roi: analytics.roi,
          campaignMetrics: analytics.campaignMetrics,
        },
        confidence: 0.85,
        source: 'AnalyticsAdapter.memory',
      });
    }

    this._configured = true;
    this._track(Date.now() - start, sources.length);
    return { sources, module: this._name, companyName, reportType };
  }

  async updateKnowledge(context) {
    return { updates: ['campaign_metrics', 'conversions', 'traffic', 'roi'], module: this._name };
  }

  async updateMemory(context) {
    return { memories: ['analytics_data'], module: this._name };
  }

  async updateLearning(context) {
    return { insights: ['performance_trends', 'roi_patterns', 'conversion_insights'], module: this._name };
  }
}
