import { getAutonomousLayer } from '../autonomous/index.js';

function requireLayer(res) {
  const layer = getAutonomousLayer();
  if (!layer) {
    res.status(503).json({ success: false, error: 'Autonomous intelligence layer not initialized' });
    return null;
  }
  return layer;
}

export const getOverview = async (req, res) => {
  const layer = requireLayer(res);
  if (!layer) return;

  try {
    const moduleStatus = layer.getAllModuleStatus();
    const alerts = layer.getAlerts();
    const insights = layer.getInsights();
    const opportunities = layer.getOpportunities();
    const lastCycle = layer.getLastCycleResults();

    const criticalAlerts = alerts.filter(a => a.priority === 'critical' || a.priority === 'high').length;
    const totalOpportunities = opportunities.length;
    const highValueOpportunities = opportunities.filter(o => (o.score || o.businessImpact || 0) >= 70).length;

    return res.json({
      success: true,
      overview: {
        modules: Object.keys(moduleStatus).length,
        modulesInitialized: Object.values(moduleStatus).filter(m => m.initialized).length,
        activeJobs: layer._modules?.get('scheduler')?.getJobStatus()?.filter(j => j.status === 'running').length || 0,
        totalOpportunities,
        highValueOpportunities,
        totalAlerts: alerts.length,
        criticalAlerts,
        totalInsights: insights.length,
        lastCycleTime: lastCycle?.completedAt || null,
        lastCycleElapsed: lastCycle?.elapsedMs || null,
        lastCycleErrors: lastCycle?.errors?.length || 0,
        moduleStatus,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getMarket = async (req, res) => {
  const layer = requireLayer(res);
  if (!layer) return;

  try {
    const marketMonitor = layer.getModule('marketMonitor');
    if (!marketMonitor) return res.status(503).json({ success: false, error: 'MarketMonitor not available' });

    await marketMonitor.execute({ requestId: `API-${Date.now()}` });

    return res.json({
      success: true,
      market: {
        changes: marketMonitor._lastResults?.marketChanges || [],
        emergingCompetitors: marketMonitor._lastResults?.emergingCompetitors || [],
        industryShifts: marketMonitor._lastResults?.industryShifts || [],
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getCompetitors = async (req, res) => {
  const layer = requireLayer(res);
  if (!layer) return;

  try {
    const monitor = layer.getModule('competitorMonitor');
    if (!monitor) return res.status(503).json({ success: false, error: 'CompetitorMonitor not available' });

    await monitor.execute({ requestId: `API-${Date.now()}` });

    return res.json({
      success: true,
      competitors: {
        new: monitor._lastResults?.newCompetitors || [],
        pricing: monitor._lastResults?.pricingChanges || [],
        features: monitor._lastResults?.featureChanges || [],
        rankings: monitor._lastResults?.rankingChanges || [],
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getSeoOpportunities = async (req, res) => {
  const layer = requireLayer(res);
  if (!layer) return;

  try {
    const engine = layer.getModule('seoOpportunityEngine');
    if (!engine) return res.status(503).json({ success: false, error: 'SeoOpportunityEngine not available' });

    await engine.execute({ requestId: `API-${Date.now()}` });

    return res.json({
      success: true,
      seoOpportunities: engine._getOpportunities(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getContentOpportunities = async (req, res) => {
  const layer = requireLayer(res);
  if (!layer) return;

  try {
    const engine = layer.getModule('contentOpportunityEngine');
    if (!engine) return res.status(503).json({ success: false, error: 'ContentOpportunityEngine not available' });

    await engine.execute({ requestId: `API-${Date.now()}` });

    return res.json({
      success: true,
      contentOpportunities: engine._getOpportunities(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getCampaignInsights = async (req, res) => {
  const layer = requireLayer(res);
  if (!layer) return;

  try {
    const optimizer = layer.getModule('campaignOptimizer');
    if (!optimizer) return res.status(503).json({ success: false, error: 'CampaignOptimizer not available' });

    await optimizer.execute({ requestId: `API-${Date.now()}` });

    return res.json({
      success: true,
      campaign: {
        performance: optimizer._lastResults?.performance || {},
        recommendations: optimizer._lastResults?.recommendations || [],
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getLeadOpportunities = async (req, res) => {
  const layer = requireLayer(res);
  if (!layer) return;

  try {
    const engine = layer.getModule('leadOpportunityEngine');
    if (!engine) return res.status(503).json({ success: false, error: 'LeadOpportunityEngine not available' });

    await engine.execute({ requestId: `API-${Date.now()}` });

    return res.json({
      success: true,
      leadOpportunities: engine._getOpportunities(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getAlerts = async (req, res) => {
  const layer = requireLayer(res);
  if (!layer) return;

  try {
    const alerts = layer.getAlerts();
    const { priority, acknowledged } = req.query;
    let filtered = alerts;

    if (priority && priority !== 'all') {
      filtered = filtered.filter(a => a.priority === priority);
    }
    if (acknowledged === 'true') {
      filtered = filtered.filter(a => a.acknowledged);
    } else if (acknowledged === 'false') {
      filtered = filtered.filter(a => !a.acknowledged);
    }

    return res.json({
      success: true,
      alerts: filtered,
      total: alerts.length,
      unacknowledged: alerts.filter(a => !a.acknowledged).length,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const acknowledgeAlert = async (req, res) => {
  const layer = requireLayer(res);
  if (!layer) return;

  try {
    const alertManager = layer.getModule('alertManager');
    if (!alertManager) return res.status(503).json({ success: false, error: 'AlertManager not available' });

    const { alertId } = req.params;
    const result = alertManager.acknowledgeAlert(alertId);

    return res.json({ success: true, acknowledged: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getTrends = async (req, res) => {
  const layer = requireLayer(res);
  if (!layer) return;

  try {
    const monitor = layer.getModule('trendMonitor');
    if (!monitor) return res.status(503).json({ success: false, error: 'TrendMonitor not available' });

    await monitor.execute({ requestId: `API-${Date.now()}` });

    return res.json({
      success: true,
      trends: {
        industry: monitor._lastResults?.industryTrends || [],
        search: monitor._lastResults?.searchTrends || [],
        competitor: monitor._lastResults?.competitorActivity || [],
        audience: monitor._lastResults?.audienceBehavior || [],
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getInsights = async (req, res) => {
  const layer = requireLayer(res);
  if (!layer) return;

  try {
    const insights = layer.getInsights();

    return res.json({
      success: true,
      insights,
      total: insights.length,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const runCycle = async (req, res) => {
  const layer = requireLayer(res);
  if (!layer) return;

  try {
    const results = await layer.runFullCycle({ requestId: `MANUAL-${Date.now()}` });
    return res.json({ success: true, cycle: results });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const runModule = async (req, res) => {
  const layer = requireLayer(res);
  if (!layer) return;

  try {
    const { name } = req.params;
    const result = await layer.runModule(name);
    return res.json({ success: true, module: name, result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};