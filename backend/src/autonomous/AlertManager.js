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
    return result;
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
