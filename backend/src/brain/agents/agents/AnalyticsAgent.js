import { BaseAgent } from '../BaseAgent.js';

export class AnalyticsAgent extends BaseAgent {
  constructor() {
    super('AnalyticsAgent');
    this._version = '1.0.0';
    this._capabilities = ['analytics_analysis', 'performance_metrics', 'roi_analysis', 'trend_detection'];
    this._dependencies = [];
  }

  async plan(task, context) {
    const steps = ['Collecter les métriques de performance', 'Analyser les tendances', 'Calculer le ROI', 'Identifier les opportunités d\'optimisation'];
    return { success: true, reasoningSteps: steps, plan: steps };
  }

  async execute(task, context) {
    const start = Date.now();
    const result = this._createResult({ taskId: task.taskId });
    const company = context.company || {};

    result.addReasoningStep('Analyse des métriques de performance');
    result.addEvidence({ type: 'analytics_context', source: 'AnalyticsAgent', company: company.name });

    const memory = context.memory || {};
    const analyticsMemory = memory?.analyticsData?.data || {};

    const traffic = analyticsMemory.traffic || task.input.traffic || {};
    const conversions = analyticsMemory.conversions || task.input.conversions || {};
    const roi = analyticsMemory.roi || task.input.roi || {};
    const campaignMetrics = analyticsMemory.campaignMetrics || task.input.campaignMetrics || {};

    if (Object.keys(traffic).length > 0) {
      result.addFinding({ type: 'traffic_analysis', data: traffic, confidence: 0.8 });
      result.addRecommendation({
        type: 'traffic_optimization',
        title: 'Optimiser les sources de trafic',
        action: 'improve_traffic',
        priority: 'high',
        confidence: 0.75,
      });
    }

    if (Object.keys(conversions).length > 0) {
      result.addFinding({ type: 'conversion_analysis', data: conversions, confidence: 0.8 });
    }

    if (Object.keys(roi).length > 0) {
      result.addFinding({ type: 'roi_analysis', data: roi, confidence: 0.85 });
    }

    if (Object.keys(campaignMetrics).length > 0) {
      result.addReasoningStep('Métriques de campagne disponibles');
      result.addFinding({ type: 'campaign_performance', metrics: campaignMetrics, confidence: 0.75 });
    }

    if (Object.keys(traffic).length === 0 && Object.keys(conversions).length === 0) {
      result.addFinding({ type: 'analytics_data_gap', note: 'Aucune donnée analytique disponible' });
      result.addRecommendation({
        type: 'analytics_setup',
        title: 'Configurer le suivi analytique',
        action: 'setup_analytics',
        priority: 'critical',
        confidence: 0.95,
      });
    }

    result.knowledgeUpdated = ['campaign_metrics', 'conversions', 'traffic', 'roi'];
    result.learningUpdated = ['performance_trends', 'roi_patterns'];
    result.confidence = Object.keys(traffic).length > 0 ? 0.8 : 0.3;
    result.processingTime = Date.now() - start;
    result.summary = `Analyse de performance: trafic disponible=${Object.keys(traffic).length > 0}, conversions=${Object.keys(conversions).length > 0}`;

    return result;
  }

  async validate(result) {
    const issues = [];
    if (!result.findings || result.findings.length === 0) issues.push('Aucune métrique analytique');
    return { valid: issues.length === 0, issues, confidence: result.confidence };
  }

  async summarize(result) {
    return `Agent Analytics: confiance ${Math.round((result.confidence || 0) * 100)}%`;
  }
}
