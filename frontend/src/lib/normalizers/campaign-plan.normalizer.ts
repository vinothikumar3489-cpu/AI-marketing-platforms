/**
 * Campaign Plan Schema Normalizer
 * 
 * Normalizes backend campaign plan data before rendering in React components.
 * Ensures consistent data structure and prevents object rendering errors.
 */

export interface NormalizedCampaignPlan {
  executiveSummary?: {
    campaignName?: string;
    campaignGoal?: string;
    recommendedDuration?: string;
    campaignTheme?: string;
    primaryAudience?: string;
    primaryChannels?: Array<{ channel: string; value?: string; goal?: string }>;
    nextActions?: Array<{
      action: string;
      owner?: string;
      priority?: string;
    }>;
  };
  businessGoal?: {
    goal: string;
    confidence?: string;
    reason?: string;
    evidence?: string;
    timeframe?: string;
    numericTarget?: string;
  };
  campaignObjective?: {
    primary?: string;
    secondary?: string;
    successDefinition?: string;
    targetAudience?: string;
    timeline?: string;
    priority?: string;
    dependencies?: Array<{ dependency: string; reason?: string }>;
  };
  audienceSelection?: {
    primaryAudience?: string;
    secondaryAudience?: string;
    buyingStage?: string;
    painPoints?: Array<string>;
    decisionDrivers?: Array<string>;
    objections?: Array<string>;
    contentPreferences?: Array<string>;
  };
  channelRecommendations?: Array<{
    channel: string;
    fit: string;
    priority: string;
    organicOrPaid?: string;
    reason?: string;
    recommendedContent?: string;
    recommendedCTA?: string;
    evidence?: string;
  }>;
  timeline?: Record<string, Array<{
    title: string;
    description?: string;
    dependency?: string;
    ownerRole?: string;
    evidence?: string;
  }>>;
  marketingFunnel?: Record<string, {
    objective?: string;
    channels?: string[];
    content?: string;
    cta?: string;
    measurement?: string;
  }>;
  kpiFramework?: Array<{
    kpi: string;
    howToMeasure: string;
    tool: string;
    frequency: string;
    status: string;
  }>;
  riskAssessment?: Array<{
    risk: string;
    severity: string;
    cause?: string;
    evidence?: string;
    mitigation?: string;
  }>;
  opportunityAssessment?: Array<{
    opportunity: string;
    reason?: string;
    evidence?: string;
    effort?: string;
    priority?: string;
    expectedBusinessImpact?: string;
  }>;
  _metadata?: {
    provider?: string;
    fallbackUsed?: boolean;
    generatedAt?: string;
  };
}

/**
 * Extract primitive value from nested object
 * Handles objects with value, goal, or direct primitive values
 */
function extractPrimitive(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    return value.value || value.goal || value.text || value.name || value.title || value.description || JSON.stringify(value);
  }
  return String(value);
}

/**
 * Normalize a single field that might be an object or primitive
 */
function normalizeField(field: any): string {
  return extractPrimitive(field);
}

/**
 * Normalize an array of fields that might contain objects
 */
function normalizeArrayField(arr: any[]): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => normalizeField(item)).filter(Boolean);
}

/**
 * Normalize an array of objects with specific properties
 */
function normalizeObjectArray<T extends Record<string, any>>(
  arr: any[],
  keyExtractor: (item: any) => string
): T[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    const normalized: any = {};
    Object.keys(item).forEach(key => {
      if (typeof item[key] === 'object' && item[key] !== null && !Array.isArray(item[key])) {
        normalized[key] = extractPrimitive(item[key]);
      } else if (Array.isArray(item[key])) {
        normalized[key] = item[key].map((subItem: any) => extractPrimitive(subItem));
      } else {
        normalized[key] = item[key];
      }
    });
    return normalized;
  });
}

/**
 * Normalize campaign plan data
 */
export function normalizeCampaignPlan(plan: any): NormalizedCampaignPlan {
  if (!plan || typeof plan !== 'object') {
    console.warn('[CampaignPlanNormalizer] Invalid plan data:', plan);
    return {};
  }

  const normalized: NormalizedCampaignPlan = {};

  // Executive Summary
  if (plan.executiveSummary) {
    normalized.executiveSummary = {
      campaignName: normalizeField(plan.executiveSummary.campaignName),
      campaignGoal: normalizeField(plan.executiveSummary.campaignGoal),
      recommendedDuration: normalizeField(plan.executiveSummary.recommendedDuration),
      campaignTheme: normalizeField(plan.executiveSummary.campaignTheme),
      primaryAudience: normalizeField(plan.executiveSummary.primaryAudience),
      primaryChannels: plan.executiveSummary.primaryChannels?.map((ch: any) => ({
        channel: normalizeField(ch.channel || ch),
        value: ch.value,
        goal: ch.goal,
      })) || [],
      nextActions: plan.executiveSummary.nextActions?.map((a: any) => ({
        action: normalizeField(a.action),
        owner: normalizeField(a.owner),
        priority: normalizeField(a.priority),
      })) || [],
    };
  }

  // Business Goal
  if (plan.businessGoal) {
    normalized.businessGoal = {
      goal: normalizeField(plan.businessGoal.goal || plan.businessGoal.value || plan.businessGoal),
      confidence: normalizeField(plan.businessGoal.confidence),
      reason: normalizeField(plan.businessGoal.reason),
      evidence: normalizeField(plan.businessGoal.evidence),
      timeframe: normalizeField(plan.businessGoal.timeframe),
      numericTarget: normalizeField(plan.businessGoal.numericTarget),
    };
  }

  // Campaign Objective
  if (plan.campaignObjective) {
    normalized.campaignObjective = {
      primary: normalizeField(plan.campaignObjective.primary?.value || plan.campaignObjective.primary?.goal || plan.campaignObjective.primary),
      secondary: normalizeField(plan.campaignObjective.secondary?.value || plan.campaignObjective.secondary?.goal || plan.campaignObjective.secondary),
      successDefinition: normalizeField(plan.campaignObjective.successDefinition?.value || plan.campaignObjective.successDefinition?.goal || plan.campaignObjective.successDefinition),
      targetAudience: normalizeField(plan.campaignObjective.targetAudience?.value || plan.campaignObjective.targetAudience?.goal || plan.campaignObjective.targetAudience),
      timeline: normalizeField(plan.campaignObjective.timeline?.value || plan.campaignObjective.timeline?.goal || plan.campaignObjective.timeline),
      priority: normalizeField(plan.campaignObjective.priority),
      dependencies: plan.campaignObjective.dependencies?.map((d: any) => ({
        dependency: normalizeField(d.dependency || d),
        reason: normalizeField(d.reason),
      })) || [],
    };
  }

  // Audience Selection
  if (plan.audienceSelection) {
    normalized.audienceSelection = {
      primaryAudience: normalizeField(plan.audienceSelection.primaryAudience?.value || plan.audienceSelection.primaryAudience?.goal || plan.audienceSelection.primaryAudience),
      secondaryAudience: normalizeField(plan.audienceSelection.secondaryAudience?.value || plan.audienceSelection.secondaryAudience?.goal || plan.audienceSelection.secondaryAudience),
      buyingStage: normalizeField(plan.audienceSelection.buyingStage?.value || plan.audienceSelection.buyingStage?.goal || plan.audienceSelection.buyingStage),
      painPoints: normalizeArrayField(plan.audienceSelection.painPoints),
      decisionDrivers: normalizeArrayField(plan.audienceSelection.decisionDrivers),
      objections: normalizeArrayField(plan.audienceSelection.objections),
      contentPreferences: normalizeArrayField(plan.audienceSelection.contentPreferences),
    };
  }

  // Channel Recommendations
  if (plan.channelRecommendations) {
    normalized.channelRecommendations = plan.channelRecommendations.map((ch: any) => ({
      channel: normalizeField(ch.channel),
      fit: normalizeField(ch.fit),
      priority: normalizeField(ch.priority),
      organicOrPaid: normalizeField(ch.organicOrPaid),
      reason: normalizeField(ch.reason),
      recommendedContent: normalizeField(ch.recommendedContent),
      recommendedCTA: normalizeField(ch.recommendedCTA),
      evidence: normalizeField(ch.evidence),
    }));
  }

  // Timeline
  if (plan.timeline) {
    normalized.timeline = {};
    Object.entries(plan.timeline).forEach(([period, tasks]: [string, any]) => {
      if (Array.isArray(tasks)) {
        normalized.timeline![period] = tasks.map((task: any) => ({
          title: normalizeField(task.title || task),
          description: normalizeField(task.description),
          dependency: normalizeField(task.dependency),
          ownerRole: normalizeField(task.ownerRole),
          evidence: normalizeField(task.evidence),
        }));
      }
    });
  }

  // Marketing Funnel
  if (plan.marketingFunnel) {
    normalized.marketingFunnel = {};
    Object.entries(plan.marketingFunnel).forEach(([stage, data]: [string, any]) => {
      if (data && typeof data === 'object') {
        normalized.marketingFunnel![stage] = {
          objective: normalizeField(data.objective),
          channels: Array.isArray(data.channels) ? data.channels.map(ch => normalizeField(ch)) : [],
          content: normalizeField(data.content),
          cta: normalizeField(data.cta),
          measurement: normalizeField(data.measurement),
        };
      }
    });
  }

  // KPI Framework
  if (plan.kpiFramework) {
    normalized.kpiFramework = plan.kpiFramework.map((kpi: any) => ({
      kpi: normalizeField(kpi.kpi || kpi.name),
      howToMeasure: normalizeField(kpi.howToMeasure),
      tool: normalizeField(kpi.tool),
      frequency: normalizeField(kpi.frequency),
      status: normalizeField(kpi.status),
    }));
  }

  // Risk Assessment
  if (plan.riskAssessment) {
    normalized.riskAssessment = plan.riskAssessment.map((r: any) => ({
      risk: normalizeField(r.risk),
      severity: normalizeField(r.severity),
      cause: normalizeField(r.cause),
      evidence: normalizeField(r.evidence),
      mitigation: normalizeField(r.mitigation),
    }));
  }

  // Opportunity Assessment
  if (plan.opportunityAssessment) {
    normalized.opportunityAssessment = plan.opportunityAssessment.map((o: any) => ({
      opportunity: normalizeField(o.opportunity),
      reason: normalizeField(o.reason),
      evidence: normalizeField(o.evidence),
      effort: normalizeField(o.effort),
      priority: normalizeField(o.priority),
      expectedBusinessImpact: normalizeField(o.expectedBusinessImpact),
    }));
  }

  // Metadata
  if (plan._metadata) {
    normalized._metadata = {
      provider: normalizeField(plan._metadata.provider),
      fallbackUsed: plan._metadata.fallbackUsed,
      generatedAt: normalizeField(plan._metadata.generatedAt),
    };
  }

  console.log('[CampaignPlanNormalizer] Normalized plan:', {
    hasExecutiveSummary: !!normalized.executiveSummary,
    hasBusinessGoal: !!normalized.businessGoal,
    hasCampaignObjective: !!normalized.campaignObjective,
    hasAudienceSelection: !!normalized.audienceSelection,
    hasChannelRecommendations: !!normalized.channelRecommendations,
    hasKPIFramework: !!normalized.kpiFramework,
  });

  return normalized;
}
