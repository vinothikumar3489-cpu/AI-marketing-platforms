import { BaseAgent } from '../BaseAgent.js';

export class CampaignAgent extends BaseAgent {
  constructor() {
    super('CampaignAgent');
    this._version = '1.0.0';
    this._capabilities = ['campaign_planning', 'campaign_strategy', 'channel_planning', 'budget_planning'];
    this._dependencies = ['AudienceAgent', 'ContentAgent'];
  }

  async plan(task, context) {
    const steps = ['Définir les objectifs de campagne', 'Sélectionner les canaux', 'Planifier le budget', 'Programmer le calendrier', 'Établir les KPI'];
    const plan = [];

    if (!context.getAgentResult('AudienceAgent')) {
      plan.push({ dependsOn: 'AudienceAgent', reason: 'Nécessite les segments d\'audience' });
    }
    if (!context.getAgentResult('ContentAgent')) {
      plan.push({ dependsOn: 'ContentAgent', reason: 'Nécessite la stratégie de contenu' });
    }
    plan.push(...steps);

    return { success: true, reasoningSteps: steps, plan };
  }

  async execute(task, context) {
    const start = Date.now();
    const result = this._createResult({ taskId: task.taskId });
    const company = context.company || {};
    const campaign = context.campaign || {};

    result.addReasoningStep('Analyse du contexte campagne');
    result.addEvidence({ type: 'campaign_context', source: 'CampaignAgent' });

    const audienceResult = context.getAgentResult('AudienceAgent');
    const contentResult = context.getAgentResult('ContentAgent');

    if (audienceResult) {
      result.addReasoningStep('Utilisation des résultats AudienceAgent');
      result.addFinding({ type: 'audience_integrated', segments: audienceResult.findings?.filter(f => f.type === 'audience_segment') });
    }
    if (contentResult) {
      result.addReasoningStep('Utilisation des résultats ContentAgent');
    }

    const objectives = task.input.objectives || campaign.objectives || [];
    const channels = task.input.channels || campaign.channels || [];
    const budget = task.input.budget || campaign.budget || {};

    if (objectives.length > 0) {
      result.addFinding({ type: 'campaign_objectives', objectives, count: objectives.length });
    } else {
      result.addFinding({ type: 'objective_gap', note: 'Aucun objectif défini' });
      result.addRecommendation({
        type: 'define_objectives',
        title: 'Définir des objectifs de campagne SMART',
        action: 'set_campaign_goals',
        priority: 'critical',
        confidence: 0.9,
      });
    }

    if (channels.length > 0) {
      result.addFinding({ type: 'campaign_channels', channels, count: channels.length });
    } else {
      result.addRecommendation({
        type: 'channel_selection',
        title: 'Sélectionner les canaux de diffusion',
        action: 'select_channels',
        priority: 'high',
        confidence: 0.85,
      });
    }

    result.addFinding({ type: 'campaign_readiness', company: company.name, ready: objectives.length > 0 && channels.length > 0 });
    result.knowledgeUpdated = ['campaign_plans', 'channel_strategy'];
    result.learningUpdated = ['campaign_performance', 'channel_effectiveness'];
    result.confidence = objectives.length > 0 ? 0.7 : 0.4;
    result.processingTime = Date.now() - start;
    result.summary = `Plan campagne: ${objectives.length} objectifs, ${channels.length} canaux`;

    return result;
  }

  async validate(result) {
    const issues = [];
    if (!result.findings || result.findings.length === 0) issues.push('Aucun plan de campagne');
    return { valid: issues.length === 0, issues, confidence: result.confidence };
  }

  async summarize(result) {
    const objs = result.findings?.filter(f => f.type === 'campaign_objectives')?.length || 0;
    return `Agent Campagne: ${objs} objectifs, confiance ${Math.round((result.confidence || 0) * 100)}%`;
  }
}
