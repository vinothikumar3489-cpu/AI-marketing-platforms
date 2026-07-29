import { BaseAgent } from '../BaseAgent.js';

export class CrmAgent extends BaseAgent {
  constructor() {
    super('CrmAgent');
    this._version = '1.0.0';
    this._capabilities = ['crm_analysis', 'customer_insights', 'lead_scoring', 'engagement_analysis'];
    this._dependencies = [];
  }

  async plan(task, context) {
    const steps = ['Analyser les données CRM', 'Évaluer l\'engagement client', 'Identifier les opportunités de vente', 'Recommander des actions'];
    return { success: true, reasoningSteps: steps, plan: steps };
  }

  async execute(task, context) {
    const start = Date.now();
    const result = this._createResult({ taskId: task.taskId });
    const company = context.company || {};

    result.addReasoningStep('Analyse des données CRM');
    result.addEvidence({ type: 'crm_context', source: 'CrmAgent', company: company.name });

    const memory = context.memory || {};
    const crmMemory = memory?.crmData?.data || {};

    const contactCount = crmMemory.contactCount || task.input.contactCount || 0;
    const dealCount = crmMemory.dealCount || task.input.dealCount || 0;
    const leadCount = crmMemory.leadCount || task.input.leadCount || 0;
    const engagement = crmMemory.engagement || task.input.engagement || {};

    if (contactCount > 0) {
      result.addReasoningStep(`${contactCount} contacts CRM disponibles`);
      result.addFinding({ type: 'crm_contacts', count: contactCount, confidence: 0.8 });
    }

    if (dealCount > 0) {
      result.addReasoningStep(`${dealCount} affaires en cours`);
      result.addFinding({ type: 'crm_deals', count: dealCount, confidence: 0.8 });
    }

    if (leadCount > 0) {
      result.addFinding({ type: 'crm_leads', count: leadCount, confidence: 0.7 });
    }

    if (engagement && Object.keys(engagement).length > 0) {
      result.addFinding({ type: 'crm_engagement', metrics: engagement, confidence: 0.75 });
      result.addRecommendation({
        type: 'engagement_optimization',
        title: 'Optimiser l\'engagement client',
        action: 'improve_engagement',
        priority: 'high',
        confidence: 0.75,
      });
    }

    if (contactCount === 0 && dealCount === 0) {
      result.addFinding({ type: 'crm_data_gap', note: 'Aucune donnée CRM disponible' });
      result.addRecommendation({
        type: 'crm_integration',
        title: 'Intégrer les données CRM',
        action: 'connect_crm',
        priority: 'high',
        confidence: 0.9,
      });
    }

    result.knowledgeUpdated = ['customer_profiles', 'lead_status', 'engagement'];
    result.learningUpdated = ['crm_patterns', 'lead_conversion_trends'];
    result.confidence = contactCount > 0 ? 0.75 : 0.3;
    result.processingTime = Date.now() - start;
    result.summary = `Analyse CRM: ${contactCount} contacts, ${dealCount} affaires, ${leadCount} leads`;

    return result;
  }

  async validate(result) {
    const issues = [];
    if (!result.findings || result.findings.length === 0) issues.push('Aucune donnée CRM');
    return { valid: issues.length === 0, issues, confidence: result.confidence };
  }

  async summarize(result) {
    const contacts = result.findings?.filter(f => f.type === 'crm_contacts')?.[0]?.count || 0;
    return `Agent CRM: ${contacts} contacts, confiance ${Math.round((result.confidence || 0) * 100)}%`;
  }
}
