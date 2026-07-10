// ============================================
// FALLBACK GENERATORS - VERIFIED DATA ONLY
// Returns 'Unknown' when data cannot be verified
// NO GENERIC OR INVENTED DATA ALLOWED
// ============================================

/**
 * Generate fallback Product Analysis
 * Returns Unknown values when AI fails
 */
export function generateProductFallback(input, websiteData) {
  const description = websiteData?.metadata?.description || input?.description || '';
  
  return {
    productSummary: description || 'Insufficient Data - Analysis unavailable from verified sources',
    productCategory: 'Unknown',
    productMaturity: 'Unknown',
    businessModel: 'Unknown',
    revenueModel: 'Unknown',
    jobsToBeDone: [],
    valuePropositions: [],
    keyDifferentiators: [],
    painPoints: [],
    buyerPersonas: [],
    targetUsers: [],
    pricingPosition: 'Unknown',
    confidenceScore: null,
    provider: 'fallback_unavailable'
  };
}

/**
 * Generate fallback Market Discovery
 * Returns Unknown values when AI fails
 */
export function generateMarketFallback(input, productData) {
  return {
    tam: 'Unknown',
    sam: 'Unknown',
    som: 'Unknown',
    cagr: 'Unknown',
    marketTrends: [],
    demandScore: null,
    growthOpportunities: [],
    marketRisks: [],
    entryStrategy: 'Insufficient Data - Market discovery unavailable from verified sources',
    competitiveLandscape: 'Insufficient Data - Competitive landscape unavailable from verified sources',
    confidenceScore: null,
    provider: 'fallback_unavailable'
  };
}

/**
 * Generate fallback Audience Intelligence
 * Returns Unknown values when AI fails
 */
export function generateAudienceFallback(input, productData) {
  return {
    buyerPersonas: [],
    personas: [],
    decisionMakers: [],
    bestChannels: [],
    messagingStyle: 'Insufficient Data - Audience intelligence unavailable from verified sources',
    confidenceScore: null,
    provider: 'fallback_unavailable'
  };
}

/**
 * Generate fallback Competitor Analysis
 * Uses orchestrator competitors if available, otherwise returns Unknown
 */
export function generateCompetitorFallback(input, productData, orchestratorCompetitors = []) {
  const verifiedCompetitors = orchestratorCompetitors.length > 0 
    ? orchestratorCompetitors.slice(0, 5).map(c => ({
        name: c.name,
        domain: c.domain,
        opportunityScore: null,
        trafficEstimate: 'Unknown',
        seoAuthority: null,
        strengths: [],
        weaknesses: [],
        evidence: `Identified via ${c.source || 'SERP analysis'}`,
        source: c.source || 'orchestrator'
      }))
    : [];
  
  return {
    competitors: verifiedCompetitors,
    marketGaps: [],
    directCompetitors: verifiedCompetitors.map(c => ({
      name: c.name,
      domain: c.domain,
      opportunityScore: null,
      strengths: [],
      weaknesses: [],
      evidence: c.evidence,
      source: c.source
    })),
    indirectCompetitors: [],
    competitorMatrix: verifiedCompetitors.length > 0 
      ? `${verifiedCompetitors.length} competitors identified from verified sources`
      : 'Insufficient Data - Competitor analysis unavailable from verified sources',
    differentiationOpportunities: [],
    strengths: [],
    weaknesses: [],
    confidenceScore: null,
    provider: orchestratorCompetitors.length > 0 ? 'orchestrator_fallback' : 'fallback_unavailable'
  };
}

/**
 * Generate fallback Intent Prediction
 * Returns Unknown when AI fails
 */
export function generateIntentFallback(input, audienceData) {
  return {
    highIntentSegments: [],
    mediumIntentSegments: [],
    lowIntentSegments: [],
    buyingSignals: [],
    confidenceScore: null,
    provider: 'fallback_unavailable'
  };
}

/**
 * Generate fallback Positioning Engine
 * Returns Unknown when AI fails
 */
export function generatePositioningFallback(input, productData, competitorData) {
  return {
    positioningStatement: 'Insufficient Data - Positioning unavailable from verified sources',
    valueProposition: 'Insufficient Data - Value proposition unavailable from verified sources',
    differentiationAngle: 'Insufficient Data - Differentiation unavailable from verified sources',
    messagingPillars: [],
    brandPromise: 'Insufficient Data - Brand promise unavailable from verified sources',
    competitorWeaknessToAttack: [],
    targetPerception: 'Insufficient Data - Target perception unavailable from verified sources',
    confidenceScore: null,
    provider: 'fallback_unavailable'
  };
}

/**
 * Generate fallback Campaign Generator
 * Returns Unknown when AI fails
 */
export function generateCampaignFallback(input, websiteData, allResults) {
  return {
    campaignObjective: 'Insufficient Data - Campaign objective unavailable from verified sources',
    campaignIdeas: [],
    adHooks: [],
    actionPlan: {
      day7: [],
      day30: [],
      day60: [],
      day90: []
    },
    ctaSuggestions: [],
    confidenceScore: null,
    provider: 'fallback_unavailable'
  };
}

/**
 * Generate fallback Channel Recommendation
 * Returns Unknown when AI fails
 */
export function generateChannelFallback(input, audienceData, campaignData) {
  return {
    primaryChannel: 'Unknown',
    recommendedChannels: [],
    confidenceScore: null,
    provider: 'fallback_unavailable'
  };
}
