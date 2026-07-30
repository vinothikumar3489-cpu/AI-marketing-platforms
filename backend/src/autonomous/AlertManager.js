import { BaseAutonomousModule } from './BaseAutonomousModule.js';

export class AlertManager extends BaseAutonomousModule {
  constructor(brainService) {
    super('AlertManager', brainService);
    this._alerts = [];
  }

  async _run(context) {
    return {
      alerts: this._alerts,
      totalAlerts: this._alerts.length,
      unacknowledged: this._alerts.filter(a => !a.acknowledged).length,
      byPriority: {
        critical: this._alerts.filter(a => a.priority === 'critical').length,
        high: this._alerts.filter(a => a.priority === 'high').length,
        medium: this._alerts.filter(a => a.priority === 'medium').length,
        low: this._alerts.filter(a => a.priority === 'low').length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  createAlert({ type, title, message, priority, source, metadata }) {
    const alert = {
      id: `ALERT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      type: type || 'info',
      title: title || 'Untitled Alert',
      message: message || '',
      priority: priority || 'medium',
      source: source || 'system',
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      acknowledged: false,
      acknowledgedAt: null,
      acknowledgedBy: null,
    };

    const validPriorities = ['critical', 'high', 'medium', 'low'];
    if (!validPriorities.includes(alert.priority)) {
      alert.priority = 'medium';
    }

    this._alerts.unshift(alert);
    this._storeAlert(alert);

    return alert;
  }

  getAlerts({ priority, acknowledged, limit, source } = {}) {
    let filtered = [...this._alerts];

    if (priority) {
      filtered = filtered.filter(a => a.priority === priority);
    }
    if (acknowledged !== undefined) {
      filtered = filtered.filter(a => a.acknowledged === acknowledged);
    }
    if (source) {
      filtered = filtered.filter(a => a.source === source);
    }

    filtered.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const diff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (diff !== 0) return diff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }

  acknowledgeAlert(alertId, userId) {
    const alert = this._alerts.find(a => a.id === alertId);
    if (!alert) {
      return { success: false, error: `Alert ${alertId} not found` };
    }

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = userId || 'unknown';
    this._store.set(`alert_${alert.id}`, alert);

    return { success: true, alert };
  }

  async initialize(context) {
    const result = await super.initialize(context);
    this._seedSampleAlerts();
    return result;
  }

  _seedSampleAlerts() {
    const now = Date.now();

    this.createAlert({
      type: 'competitor',
      title: 'NeuroCampaign AI launched Agent Studio feature',
      message: 'New no-code AI agent builder poses competitive threat. Our Agent Studio is 6 weeks from launch.',
      priority: 'critical',
      source: 'CompetitorMonitor',
      metadata: { competitor: 'NeuroCampaign AI', feature: 'Agent Studio', impact: 'high' },
    });

    this.createAlert({
      type: 'performance',
      title: 'LinkedIn Ads ROAS dropped below 2.0',
      message: 'LinkedIn Ads ROAS is 1.99, down 5.2% from last month. Budget reallocation recommended.',
      priority: 'high',
      source: 'CampaignOptimizer',
      metadata: { channel: 'linkedin_ads', currentRoas: 1.99, previousRoas: 2.10 },
    });

    this.createAlert({
      type: 'opportunity',
      title: 'High-value prospect visiting pricing page repeatedly',
      message: 'ScaleCommerce (est. $24K-$48K deal) has visited pricing page 7 times in 48 hours.',
      priority: 'critical',
      source: 'LeadOpportunityEngine',
      metadata: { company: 'ScaleCommerce', intentScore: 94, estimatedDealSize: '$24,000 - $48,000 ARR' },
    });

    this.createAlert({
      type: 'seo',
      title: 'Ranking dropped for "AI marketing platform" (4 → 6)',
      message: 'Losing ground on high-volume keyword (24,500/mo). Estimated 3,400 visits lost monthly.',
      priority: 'high',
      source: 'CompetitorMonitor',
      metadata: { keyword: 'AI marketing platform', previousRank: 4, currentRank: 6, trafficLost: 3400 },
    });

    this.createAlert({
      type: 'trend',
      title: 'Explosive growth: "agentic AI marketing" search volume up 890%',
      message: 'New keyword opportunity with low competition. Estimated window of 2-3 months before competition increases.',
      priority: 'high',
      source: 'TrendMonitor',
      metadata: { keyword: 'agentic AI marketing', volumeIncrease: '+890%', opportunityWindow: '2-3 months' },
    });

    this.createAlert({
      type: 'content',
      title: 'Content gap: zero-party data guide has high demand',
      message: 'Search for "zero-party data strategies" up 340% with low competition. Opportunity for pillar page.',
      priority: 'medium',
      source: 'ContentOpportunityEngine',
      metadata: { keyword: 'zero-party data strategies', searchVolume: 4800, difficulty: 28 },
    });

    this.createAlert({
      type: 'opportunity',
      title: 'ExpansionMark Inc. ready for enterprise upgrade',
      message: 'Usage has grown 240% in 6 months. API volume at 78% of plan limit. $1,500/mo expansion potential.',
      priority: 'medium',
      source: 'LeadOpportunityEngine',
      metadata: { account: 'ExpansionMark Inc.', expansionPotential: '$1,500/mo increase', urgency: '30-45 days' },
    });

    this.createAlert({
      type: 'market',
      title: 'Downward pricing pressure in SMB analytics segment',
      message: 'Three competitors reduced pricing 15-20% in 30 days. Price war emerging in SMB segment.',
      priority: 'medium',
      source: 'MarketMonitor',
      metadata: { segment: 'SMB Analytics', avgPriceDrop: '18%', competitorCount: 3 },
    });

    this.createAlert({
      type: 'performance',
      title: 'Meta Ads outperforming all channels',
      message: 'Meta Ads achieving 5.98 ROAS with 3.01% CTR. Consider increasing budget allocation.',
      priority: 'low',
      source: 'CampaignOptimizer',
      metadata: { channel: 'meta_ads', roas: 5.98, ctr: 3.01, trend: '+8.3%' },
    });

    this.createAlert({
      type: 'compliance',
      title: 'New EU data privacy regulation proposed',
      message: 'Proposed GDPR amendments restrict behavioral targeting for users under 21. Potential 12-15% performance impact.',
      priority: 'medium',
      source: 'MarketMonitor',
      metadata: { regulation: 'GDPR Amendment', impact: '12-15% performance reduction', effectiveDate: '2026-Q3' },
    });
  }

  async health() {
    return {
      ...(await super.health()),
      totalAlerts: this._alerts.length,
      unacknowledgedAlerts: this._alerts.filter(a => !a.acknowledged).length,
    };
  }

  async shutdown() {
    this._alerts = [];
    return super.shutdown();
  }
}
