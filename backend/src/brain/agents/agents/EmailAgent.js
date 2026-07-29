import { BaseAgent } from '../BaseAgent.js';

export class EmailAgent extends BaseAgent {
  constructor() {
    super('EmailAgent');
    this._version = '1.0.0';
    this._capabilities = ['email_strategy', 'email_campaign_planning', 'email_automation'];
    this._dependencies = ['AudienceAgent', 'ContentAgent'];
  }

  async plan(task, context) {
    const steps = ['Analyser la stratégie email', 'Segmenter la liste d\'envoi', 'Planifier les campagnes', 'Optimiser la délivrabilité', 'Définir les KPI'];
    return { success: true, reasoningSteps: steps, plan: steps };
  }

  async execute(task, context) {
    const start = Date.now();
    const result = this._createResult({ taskId: task.taskId });
    const company = context.company || {};

    result.addReasoningStep('Analyse de la stratégie email');
    result.addEvidence({ type: 'email_context', source: 'EmailAgent', company: company.name });

    const memory = context.memory || {};
    const emailMemory = memory?.emailIntelligence?.data || {};

    const sent = emailMemory.sent || task.input.sent || 0;
    const opens = emailMemory.opens || task.input.opens || 0;
    const clicks = emailMemory.clicks || task.input.clicks || 0;
    const deliveries = emailMemory.deliveries || task.input.deliveries || 0;

    if (sent > 0) {
      result.addReasoningStep(`${sent} emails envoyés, ${deliveries} délivrés`);
      const openRate = sent > 0 ? Math.round((opens / sent) * 100) : 0;
      const clickRate = sent > 0 ? Math.round((clicks / sent) * 100) : 0;

      result.addFinding({ type: 'email_performance', sent, opens, clicks, deliveries, openRate, clickRate, confidence: 0.85 });

      if (openRate < 20) {
        result.addRecommendation({
          type: 'improve_open_rate',
          title: 'Améliorer le taux d\'ouverture des emails',
          action: 'optimize_subject_lines',
          priority: 'high',
          confidence: 0.8,
        });
      }
    }

    const audienceResult = context.getAgentResult('AudienceAgent');
    if (audienceResult) {
      result.addReasoningStep('Segmentation d\'audience récupérée');
    }

    if (!sent && !deliveries) {
      result.addFinding({ type: 'email_data_gap', note: 'Aucune campagne email existante' });
      result.addRecommendation({
        type: 'email_setup',
        title: 'Mettre en place une stratégie email',
        action: 'setup_email_strategy',
        priority: 'high',
        confidence: 0.85,
      });
    }

    result.knowledgeUpdated = ['email_campaigns', 'delivery_metrics'];
    result.learningUpdated = ['email_performance_patterns', 'engagement_trends'];
    result.confidence = sent > 0 ? 0.75 : 0.4;
    result.processingTime = Date.now() - start;
    result.summary = `Analyse email: ${sent} envoyés, ${opens} ouverts, ${clicks} clics`;

    return result;
  }

  async validate(result) {
    const issues = [];
    if (!result.findings || result.findings.length === 0) issues.push('Aucune donnée email');
    return { valid: issues.length === 0, issues, confidence: result.confidence };
  }

  async summarize(result) {
    const perf = result.findings?.filter(f => f.type === 'email_performance')?.[0];
    if (perf) return `Agent Email: ${perf.sent} envoyés, taux d'ouverture ${perf.openRate}%`;
    return `Agent Email: confiance ${Math.round((result.confidence || 0) * 100)}%`;
  }
}
