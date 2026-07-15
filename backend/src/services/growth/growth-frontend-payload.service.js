/**
 * Canonical Growth Frontend Payload Service
 * 
 * Builds a unified, canonical Growth Workspace payload from persisted database records.
 * This is the single source of truth for Growth data consumed by frontend and reports.
 */

import { resolveProductIdentity } from '../resolvers/product-identity.resolver.js';

const GENERIC_LABELS = [
  'New & Featured',
  'Featured',
  'New Analysis',
  'New Growth Analysis',
  'Home',
  'Courses',
  'Unknown Product',
  'Untitled',
  'New Product Analysis'
];

function isGenericLabel(label) {
  if (!label || typeof label !== 'string') return false;
  const normalized = label.trim().toLowerCase();
  return GENERIC_LABELS.some(generic => normalized === generic.toLowerCase());
}

function normalizeScore(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n >= 0 && n <= 1) return Math.round(n * 100);
  return Math.round(n);
}

function extractArray(data, ...possiblePaths) {
  for (const path of possiblePaths) {
    const parts = path.split('.');
    let current = data;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        current = null;
        break;
      }
    }
    if (Array.isArray(current) && current.length > 0) {
      return current;
    }
  }
  return [];
}

function extractObject(data, ...possiblePaths) {
  for (const path of possiblePaths) {
    const parts = path.split('.');
    let current = data;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        current = null;
        break;
      }
    }
    if (current && typeof current === 'object' && Object.keys(current).length > 0) {
      return current;
    }
  }
  return null;
}

function extractString(data, ...possiblePaths) {
  for (const path of possiblePaths) {
    const parts = path.split('.');
    let current = data;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        current = null;
        break;
      }
    }
    if (current && typeof current === 'string' && current.trim().length > 0) {
      return current.trim();
    }
  }
  return null;
}

function buildProductIdentity(productIntelligence, chat, website) {
  const resolved = resolveProductIdentity({
    chat,
    productIntelligence,
    evidenceSnapshot: productIntelligence?.inputJson || {},
    website: website || { url: chat?.websiteUrl }
  });

  // Reject generic labels
  if (isGenericLabel(resolved.productName)) {
    resolved.productName = resolved.brandName || resolved.companyName || null;
  }
  if (isGenericLabel(resolved.brandName)) {
    resolved.brandName = resolved.companyName || resolved.productName || null;
  }
  if (isGenericLabel(resolved.companyName)) {
    resolved.companyName = resolved.brandName || resolved.productName || null;
  }

  return {
    productName: resolved.productName || chat?.title || null,
    brandName: resolved.brandName || null,
    companyName: resolved.companyName || null,
    domain: resolved.domain || null,
    websiteUrl: chat?.websiteUrl || productIntelligence?.inputJson?.websiteUrl || null
  };
}

function buildProductDNA(productAnalysis) {
  if (!productAnalysis) return null;

  return {
    usp: extractString(productAnalysis, 'usp', 'uniqueSellingProposition', 'valueProposition'),
    features: extractArray(productAnalysis, 'features', 'productFeatures', 'keyFeatures'),
    benefits: extractArray(productAnalysis, 'benefits', 'productBenefits', 'keyBenefits'),
    painPoints: extractArray(productAnalysis, 'painPoints', 'customerPainPoints', 'challenges'),
    targetUsers: extractArray(productAnalysis, 'targetUsers', 'targetAudience', 'idealCustomers'),
    category: extractString(productAnalysis, 'category', 'productCategory', 'industry'),
    confidenceScore: normalizeScore(productAnalysis.confidenceScore),
    dataSourcesUsed: extractArray(productAnalysis, 'dataSourcesUsed', 'sources'),
    marketingAngles: extractArray(productAnalysis, 'marketingAngles', 'angles'),
    recommendedModules: extractArray(productAnalysis, 'recommendedModules', 'modules')
  };
}

function buildAudienceIntelligence(productIntelligence) {
  const audienceData = productIntelligence?.audienceIntelligence || {};
  const productAnalysis = productIntelligence?.productAnalysis || {};

  const personas = extractArray(
    audienceData,
    'personas',
    'buyerPersonas',
    'primaryPersonas',
    'audiencePersonas'
  ) || extractArray(
    productAnalysis,
    'buyerPersonas',
    'personas'
  );

  const painPoints = extractArray(
    audienceData,
    'painPoints',
    'customerPainPoints'
  ) || extractArray(productAnalysis, 'painPoints');

  const targetUsers = extractArray(
    audienceData,
    'targetUsers',
    'targetAudience'
  ) || extractArray(productAnalysis, 'targetUsers');

  return {
    personas: personas.map(p => ({
      name: p.name || p.role || p.title || 'Unknown',
      role: p.role || p.title || p.jobTitle || null,
      description: p.description || p.summary || null,
      painPoints: Array.isArray(p.painPoints) ? p.painPoints : [],
      goals: Array.isArray(p.goals) ? p.goals : (Array.isArray(p.objectives) ? p.objectives : []),
      decisionDrivers: Array.isArray(p.decisionDrivers) ? p.decisionDrivers : [],
      objections: Array.isArray(p.objections) ? p.objections : [],
      demographics: p.demographics || null,
      psychographics: p.psychographics || null,
      evidence: p.evidence || 'product_intelligence'
    })),
    painPoints: painPoints,
    targetUsers: targetUsers,
    targetAudience: extractString(audienceData, 'targetAudience') || extractString(productAnalysis, 'targetAudience'),
    decisionMakers: extractArray(audienceData, 'decisionMakers')
  };
}

function buildCompetitorIntelligence(competitorIntelligence) {
  if (!competitorIntelligence) return null;

  const competitorAnalysis = competitorIntelligence.competitorAnalysis || {};
  const positioningEngine = competitorIntelligence.positioningEngine || {};
  const intentPrediction = competitorIntelligence.intentPrediction || {};

  const competitors = extractArray(
    competitorAnalysis,
    'competitors',
    'validatedCompetitors',
    'directCompetitors',
    'competitorProfiles',
    'marketCompetitors'
  );

  return {
    competitors: competitors.map(c => ({
      name: c.name || c.company || c.competitorName || 'Unknown',
      url: c.url || c.website || c.domain || null,
      marketShare: c.marketShare || null,
      strengths: Array.isArray(c.strengths) ? c.strengths : [],
      weaknesses: Array.isArray(c.weaknesses) ? c.weaknesses : [],
      pricing: c.pricing || null,
      positioning: c.positioning || null,
      evidence: c.evidence || 'competitor_intelligence'
    })),
    marketGaps: extractArray(competitorAnalysis, 'marketGaps', 'opportunities'),
    marketMaturity: extractString(competitorAnalysis, 'marketMaturity'),
    competitorTypes: extractArray(competitorAnalysis, 'competitorTypes'),
    pricingPosition: extractString(competitorAnalysis, 'pricingPosition'),
    competitorWeaknesses: extractArray(competitorAnalysis, 'competitorWeaknesses'),
    differentiationOpportunities: extractArray(competitorAnalysis, 'differentiationOpportunities'),
    positioning: {
      positioningStatement: extractString(positioningEngine, 'positioningStatement'),
      differentiation: extractString(positioningEngine, 'differentiation'),
      messagingPillars: extractArray(positioningEngine, 'messagingPillars'),
      confidenceScore: normalizeScore(positioningEngine.confidenceScore)
    },
    intentPrediction: {
      hotSegments: extractArray(intentPrediction, 'hotSegments'),
      buyingSignals: extractArray(intentPrediction, 'buyingSignals'),
      intentClusters: extractArray(intentPrediction, 'intentClusters'),
      confidenceScore: normalizeScore(intentPrediction.confidenceScore)
    }
  };
}

function buildCampaignIntelligence(campaignIntelligence) {
  if (!campaignIntelligence) return null;

  const campaignGenerator = campaignIntelligence.campaignGenerator || {};
  const channelRecommendation = campaignIntelligence.channelRecommendation || {};
  const executiveStory = campaignIntelligence.executiveStory || {};

  const objectives = extractArray(
    campaignGenerator,
    'objectives',
    'campaignObjectives',
    'goals'
  );

  const channels = extractArray(
    channelRecommendation,
    'channels',
    'recommendedChannels',
    'bestChannels'
  );

  return {
    objectives: objectives,
    targetAudience: extractString(campaignGenerator, 'targetAudience'),
    creativeAngles: extractArray(campaignGenerator, 'creativeAngles', 'campaignIdeas'),
    copyHooks: extractArray(campaignGenerator, 'copyHooks'),
    marketingAngles: extractArray(campaignGenerator, 'marketingAngles'),
    channels: channels.map(c => ({
      channel: c.channel || c.name || 'Unknown',
      priority: c.priority || 'medium',
      reason: c.reason || c.description || null,
      budgetAllocation: c.budgetAllocation || null,
      expectedReach: c.expectedReach || null,
      evidence: c.evidence || 'campaign_intelligence'
    })),
    channelStrategy: {
      channelPriority: extractString(channelRecommendation, 'channelPriority'),
      channelReasoning: extractString(channelRecommendation, 'channelReasoning'),
      channelExpectedOutcome: extractString(channelRecommendation, 'channelExpectedOutcome'),
      bestChannels: extractArray(channelRecommendation, 'bestChannels')
    },
    executiveStory: executiveStory,
    actionPlan: extractObject(campaignGenerator, 'actionPlan') || extractObject(campaignIntelligence, 'actionPlan')
  };
}

function buildMarketIntelligence(productIntelligence) {
  const marketDiscovery = productIntelligence?.marketDiscovery || {};

  return {
    tam: marketDiscovery.tam || null,
    sam: marketDiscovery.sam || null,
    som: marketDiscovery.som || null,
    cagr: marketDiscovery.cagr || null,
    growthRate: marketDiscovery.growthRate || null,
    industry: extractString(marketDiscovery, 'industry'),
    marketTrends: extractArray(marketDiscovery, 'marketTrends'),
    marketMaturity: extractString(marketDiscovery, 'marketMaturity'),
    pricingPosition: extractString(marketDiscovery, 'pricingPosition'),
    productDescription: extractString(marketDiscovery, 'productDescription'),
    growthOpportunities: extractArray(marketDiscovery, 'growthOpportunities')
  };
}

function buildScoreSummary(productIntelligence, competitorIntelligence, campaignIntelligence) {
  const productAnalysis = productIntelligence?.productAnalysis || {};
  const positioningEngine = competitorIntelligence?.positioningEngine || {};
  const intentPrediction = competitorIntelligence?.intentPrediction || {};

  // Only include scores that actually exist - never default to 0
  const scores = {};

  const productConfidence = normalizeScore(productAnalysis.confidenceScore);
  if (productConfidence !== null) scores.productConfidence = productConfidence;

  const positioningConfidence = normalizeScore(positioningEngine.confidenceScore);
  if (positioningConfidence !== null) scores.positioningConfidence = positioningConfidence;

  const intentConfidence = normalizeScore(intentPrediction.confidenceScore);
  if (intentConfidence !== null) scores.intentConfidence = intentConfidence;

  // Calculate overall growth score only if we have component scores
  if (Object.keys(scores).length > 0) {
    const scoreValues = Object.values(scores).filter(s => s !== null);
    if (scoreValues.length > 0) {
      scores.overallGrowthScore = Math.round(scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length);
    }
  }

  return Object.keys(scores).length > 0 ? scores : null;
}

function buildDataCompleteness(productIntelligence, competitorIntelligence, campaignIntelligence) {
  const completeness = {
    hasProductIntelligence: !!productIntelligence,
    hasAudienceIntelligence: !!(productIntelligence?.audienceIntelligence && Object.keys(productIntelligence.audienceIntelligence).length > 0),
    hasCompetitorIntelligence: !!competitorIntelligence,
    hasCampaignIntelligence: !!campaignIntelligence,
    hasMarketIntelligence: !!(productIntelligence?.marketDiscovery && Object.keys(productIntelligence.marketDiscovery).length > 0),
    hasPositioning: !!(competitorIntelligence?.positioningEngine && Object.keys(competitorIntelligence.positioningEngine).length > 0),
    hasIntentPrediction: !!(competitorIntelligence?.intentPrediction && Object.keys(competitorIntelligence.intentPrediction).length > 0)
  };

  // Calculate percentage complete
  const totalChecks = Object.values(completeness).filter(v => typeof v === 'boolean').length;
  const passedChecks = Object.values(completeness).filter(v => v === true).length;
  completeness.percentageComplete = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  return completeness;
}

/**
 * Build canonical Growth Workspace frontend payload
 */
export function buildGrowthFrontendPayload({
  chat,
  productIntelligence,
  competitorIntelligence,
  campaignIntelligence,
  website = null
}) {
  const hasProduct = !!productIntelligence;
  const hasCompetitor = !!competitorIntelligence;
  const hasCampaign = !!campaignIntelligence;

  if (!hasProduct) {
    return {
      chatId: chat?.id || null,
      status: 'NOT_RUN',
      productIdentity: buildProductIdentity(null, chat, website),
      companyOverview: null,
      executiveSummary: null,
      productDNA: null,
      audienceIntelligence: null,
      competitorIntelligence: null,
      marketIntelligence: null,
      positioning: null,
      campaignStrategy: null,
      channelStrategy: null,
      opportunities: null,
      risks: null,
      actionPlan: null,
      scoreSummary: null,
      dataCompleteness: buildDataCompleteness(null, null, null),
      updatedAt: chat?.updatedAt || null
    };
  }

  const productIdentity = buildProductIdentity(productIntelligence, chat, website);
  const productDNA = buildProductDNA(productIntelligence?.productAnalysis);
  const audienceIntelligence = buildAudienceIntelligence(productIntelligence);
  const competitorIntelligenceData = buildCompetitorIntelligence(competitorIntelligence);
  const campaignIntelligenceData = buildCampaignIntelligence(campaignIntelligence);
  const marketIntelligence = buildMarketIntelligence(productIntelligence);
  const scoreSummary = buildScoreSummary(productIntelligence, competitorIntelligence, campaignIntelligence);
  const dataCompleteness = buildDataCompleteness(productIntelligence, competitorIntelligence, campaignIntelligence);

  // Build positioning from competitor intelligence
  const positioning = competitorIntelligenceData?.positioning || null;

  // Build channel strategy from campaign intelligence
  const channelStrategy = campaignIntelligenceData?.channelStrategy || null;

  // Extract action plan from campaign intelligence
  const actionPlan = campaignIntelligenceData?.actionPlan || null;

  // Build opportunities from market and competitor data
  const opportunities = [];
  if (marketIntelligence?.growthOpportunities?.length > 0) {
    opportunities.push(...marketIntelligence.growthOpportunities.map(o => ({
      title: typeof o === 'string' ? o : o.title || o.opportunity || 'Market Opportunity',
      category: 'market',
      priority: 'medium',
      evidence: 'market_intelligence'
    })));
  }
  if (competitorIntelligenceData?.marketGaps?.length > 0) {
    opportunities.push(...competitorIntelligenceData.marketGaps.map(g => ({
      title: typeof g === 'string' ? g : g.title || g.gap || 'Competitor Gap',
      category: 'competitive',
      priority: 'high',
      evidence: 'competitor_intelligence'
    })));
  }

  // Build risks from competitor weaknesses
  const risks = [];
  if (competitorIntelligenceData?.competitorWeaknesses?.length > 0) {
    risks.push(...competitorIntelligenceData.competitorWeaknesses.map(w => ({
      title: typeof w === 'string' ? w : w.title || w.risk || 'Competitor Risk',
      category: 'competitive',
      priority: 'medium',
      evidence: 'competitor_intelligence'
    })));
  }

  // Build company overview from product identity and market data
  const companyOverview = {
    name: productIdentity.companyName,
    domain: productIdentity.domain,
    industry: marketIntelligence?.industry || productDNA?.category,
    websiteUrl: productIdentity.websiteUrl
  };

  // Build executive summary from available data
  const executiveSummary = {
    productName: productIdentity.productName,
    industry: marketIntelligence?.industry,
    marketSize: marketIntelligence?.tam,
    growthRate: marketIntelligence?.growthRate,
    overallGrowthScore: scoreSummary?.overallGrowthScore,
    dataCompleteness: dataCompleteness.percentageComplete
  };

  return {
    chatId: chat?.id || null,
    status: 'COMPLETED',
    productIdentity,
    companyOverview,
    executiveSummary,
    productDNA,
    audienceIntelligence,
    competitorIntelligence: competitorIntelligenceData,
    marketIntelligence,
    positioning,
    campaignStrategy: campaignIntelligenceData,
    channelStrategy,
    opportunities: opportunities.length > 0 ? opportunities : null,
    risks: risks.length > 0 ? risks : null,
    actionPlan,
    scoreSummary,
    dataCompleteness,
    updatedAt: chat?.updatedAt || null
  };
}
