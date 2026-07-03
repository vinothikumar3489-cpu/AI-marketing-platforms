// ============================================
// EVIDENCE-BASED FALLBACK GENERATORS
// These NEVER generate fake data. When AI/APIs fail,
// they return structured responses indicating
// insufficient verified data.
// ============================================

const NO_DATA = 'No verified market data available';
const INSUFFICIENT_DATA = 'Insufficient verified data';

function noDataResponse(module, confidence = 0) {
  return {
    hasVerifiedData: false,
    confidenceScore: confidence,
    provider: 'fallback',
    warnings: [`${module}: ${INSUFFICIENT_DATA}`],
    dataSources: []
  };
}

/**
 * Generate evidence-based Product Analysis fallback
 * NEVER generates fake features, benefits, or USPs
 */
export function generateProductFallback(input, websiteData) {
  const sources = [];
  if (websiteData?.metadata?.title) sources.push('Website Metadata');
  if (websiteData?.text) sources.push('Website Content');
  if (websiteData?.extract) sources.push('AI Website Extraction');

  const hasRealData = websiteData?.metadata?.title || websiteData?.metadata?.description || websiteData?.text;

  const result = {
    hasVerifiedData: !!hasRealData,
    productSummary: hasRealData ? (websiteData.metadata?.description || websiteData.text?.substring(0, 200) || NO_DATA) : NO_DATA,
    productCategory: input.industry || null,
    productMaturity: null,
    businessModel: null,
    revenueModel: null,
    jobsToBeDone: [],
    valuePropositions: [],
    keyDifferentiators: [],
    painPoints: [],
    buyerPersonas: [],
    targetUsers: [],
    pricingPosition: null,
    confidenceScore: hasRealData ? 25 : 0,
    provider: 'fallback_evidence',
    websiteDataUsed: hasRealData,
    dataSources: sources,
    warnings: hasRealData ? ['Limited data - only website metadata available'] : ['No verified product data available']
  };

  if (websiteData?.metadata?.title) {
    result.productSummary = websiteData.metadata.description || `Website: ${websiteData.metadata.title}`;
    result.confidenceScore = 30;
  }

  return result;
}

/**
 * Generate evidence-based Market Discovery fallback
 * NEVER generates fake TAM/SAM/SOM
 */
export function generateMarketFallback(input, productData) {
  return {
    ...noDataResponse('Market Discovery'),
    tam: { value: null, source: null, confidence: 0, method: null },
    sam: { value: null, source: null, confidence: 0, method: null },
    som: { value: null, source: null, confidence: 0, method: null },
    cagr: null,
    marketTrends: [],
    demandScore: null,
    growthOpportunities: [],
    marketRisks: [],
    entryStrategy: null,
    competitiveLandscape: null,
    note: NO_DATA
  };
}

/**
 * Generate evidence-based Audience Intelligence fallback
 * NEVER generates fake personas
 */
export function generateAudienceFallback(input, productData) {
  return {
    ...noDataResponse('Audience Intelligence'),
    buyerPersonas: [],
    personas: [],
    decisionMakers: [],
    bestChannels: [],
    messagingStyle: null,
    note: NO_DATA
  };
}

/**
 * Generate evidence-based Competitor Analysis fallback
 * NEVER generates fake competitors
 */
export function generateCompetitorFallback(input, productData, orchestratorCompetitors = []) {
  const hasVerifiedCompetitors = orchestratorCompetitors.length > 0;

  const result = {
    hasVerifiedData: hasVerifiedCompetitors,
    competitors: hasVerifiedCompetitors ? orchestratorCompetitors.map(c => ({
      name: c.name,
      domain: c.domain,
      source: c.source || 'orchestrator',
      confidenceScore: c.confidence || 50,
      note: 'Basic competitor info - requires deeper analysis'
    })) : [],
    marketGaps: [],
    directCompetitors: hasVerifiedCompetitors ? orchestratorCompetitors.map(c => ({
      name: c.name,
      domain: c.domain,
      note: 'Competitor identified but no detailed analysis available'
    })) : [],
    indirectCompetitors: [],
    competitorMatrix: null,
    differentiationOpportunities: [],
    strengths: [],
    weaknesses: [],
    confidenceScore: hasVerifiedCompetitors ? 30 : 0,
    provider: hasVerifiedCompetitors ? 'orchestrator_fallback' : 'fallback_evidence',
    warnings: hasVerifiedCompetitors
      ? ['Competitors identified but limited analysis available']
      : ['No verified competitor data available'],
    dataSources: hasVerifiedCompetitors ? ['Research Orchestrator'] : []
  };

  return result;
}

/**
 * Generate evidence-based Intent Prediction fallback
 * NEVER generates fake intent signals
 */
export function generateIntentFallback(input, audienceData) {
  return {
    ...noDataResponse('Intent Prediction'),
    highIntentSegments: [],
    mediumIntentSegments: [],
    lowIntentSegments: [],
    buyingSignals: [],
    triggerEvents: [],
    leadScoringRules: [],
    note: NO_DATA
  };
}

/**
 * Generate evidence-based Positioning Engine fallback
 * NEVER generates fake positioning statements
 */
export function generatePositioningFallback(input, productData, competitorData) {
  return {
    ...noDataResponse('Positioning Engine'),
    positioningStatement: null,
    valueProposition: null,
    differentiationAngle: null,
    messagingPillars: [],
    brandPromise: null,
    competitorWeaknessToAttack: [],
    targetPerception: null,
    note: NO_DATA
  };
}

/**
 * Generate evidence-based Campaign Generator fallback
 * NEVER generates fake campaign ideas or fake KPIs
 */
export function generateCampaignFallback(input, websiteData, allResults) {
  return {
    ...noDataResponse('Campaign Generator'),
    campaignObjective: null,
    campaignIdeas: [],
    adHooks: [],
    actionPlan: { sevenDay: [], thirtyDay: [], sixtyDay: [], ninetyDay: [] },
    ctaSuggestions: [],
    creativeAngles: [],
    copyHooks: [],
    note: NO_DATA
  };
}

/**
 * Generate evidence-based Channel Recommendation fallback
 * NEVER generates fake ROI numbers or fake budget allocations
 */
export function generateChannelFallback(input, audienceData, campaignData) {
  return {
    ...noDataResponse('Channel Recommendation'),
    primaryChannel: null,
    recommendedChannels: [],
    budgetSplit: null,
    note: NO_DATA
  };
}
