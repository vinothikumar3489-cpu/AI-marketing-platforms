// ============================================
// FALLBACK GENERATORS - VERIFIED DATA ONLY
// Uses Business Intelligence data when available
// Returns 'Unknown' only when data cannot be verified
// NO GENERIC OR INVENTED DATA ALLOWED
// ============================================

import { 
  preferNonEmptyArray, 
  preferDefinedValue, 
  validateProductIdentity,
  extractDomainFromUrl 
} from '../../utils/merge-utilities.util.js';

/**
 * Generate fallback Product Analysis
 * Uses verified Business Intelligence data when AI fails
 */
export function generateProductFallback(input, websiteData, businessIntelligence = null) {
  const description = websiteData?.metadata?.description || input?.description || '';
  const bi = businessIntelligence;
  
  // Extract product identity from BI
  const productIdentity = validateProductIdentity({
    productName: input?.productName || bi?.companyIntelligence?.name || input?.companyName,
    companyName: input?.companyName || bi?.companyIntelligence?.name,
    brandName: input?.brandName || bi?.companyIntelligence?.name,
    domain: extractDomainFromUrl(input?.websiteUrl) || bi?.companyIntelligence?.domain,
    websiteUrl: input?.websiteUrl,
    category: bi?.companyIntelligence?.category || bi?.marketIntelligence?.industry,
    industry: bi?.companyIntelligence?.industry || bi?.marketIntelligence?.industry
  });

  // Extract features from BI technology and product evidence
  const biFeatures = [];
  if (bi?.technologyIntelligence?.technologies?.length) {
    biFeatures.push(...bi.technologyIntelligence.technologies.map(t => ({
      name: t.name || t,
      category: t.category || 'Technology',
      evidence: 'business_intelligence'
    })));
  }
  
  // Extract pricing from BI
  const biPricing = bi?.pricingIntelligence || {};
  const pricingTiers = preferNonEmptyArray(biPricing.tiers);
  
  // Extract audience from BI
  const biPersonas = preferNonEmptyArray(bi?.audienceIntelligence?.personas);
  const biPainPoints = preferNonEmptyArray(bi?.audienceIntelligence?.painPoints);
  
  // Extract market from BI
  const biIndustry = preferDefinedValue(bi?.marketIntelligence?.industry, bi?.companyIntelligence?.industry);
  const biTrends = preferNonEmptyArray(bi?.marketIntelligence?.trends);
  
  return {
    identity: productIdentity,
    summary: description || bi?.companyIntelligence?.description || 'Insufficient Data - Analysis unavailable from verified sources',
    category: preferDefinedValue(biIndustry, productIdentity.category, 'Unknown'),
    usp: biFeatures.length > 0 ? `Built with ${biFeatures.slice(0, 3).map(f => f.name).join(', ')}` : null,
    features: preferNonEmptyArray(biFeatures),
    benefits: preferNonEmptyArray(bi?.audienceIntelligence?.painPoints?.map(p => ({
      name: p,
      category: 'Benefit',
      evidence: 'business_intelligence'
    }))),
    jobsToBeDone: preferNonEmptyArray(bi?.audienceIntelligence?.buyingTriggers?.map(t => ({
      name: t,
      category: 'Job to be Done',
      evidence: 'business_intelligence'
    }))),
    pricing: {
      tiers: pricingTiers,
      hasFreePlan: biPricing.hasFreePlan ?? null,
      hasFreeTrial: biPricing.hasFreeTrial ?? null,
      hasEnterprise: biPricing.hasEnterprise ?? null,
      currency: biPricing.currency ?? null,
      source: 'business_intelligence'
    },
    personas: biPersonas,
    painPoints: biPainPoints,
    targetUsers: preferNonEmptyArray(bi?.audienceIntelligence?.targetUsers),
    market: {
      industry: biIndustry,
      trends: biTrends,
      opportunities: preferNonEmptyArray(bi?.marketIntelligence?.opportunities),
      tam: preferDefinedValue(bi?.marketIntelligence?.tam),
      sam: preferDefinedValue(bi?.marketIntelligence?.sam),
      som: preferDefinedValue(bi?.marketIntelligence?.som)
    },
    sources: preferNonEmptyArray(bi?.sources),
    limitations: biFeatures.length === 0 ? ['Product features not verified from Business Intelligence'] : [],
    confidenceScore: bi?.sources?.length > 0 ? Math.min(85, bi.sources.length * 15) : null,
    provider: bi?.sources?.length > 0 ? 'business_intelligence_fallback' : 'fallback_unavailable',
    evidence: {
      sources: bi?.sources || [],
      confidence: bi?.sources?.length > 0 ? 'Medium - Business Intelligence verified' : 'Low - No verified sources',
      inferenceStatus: 'deterministic'
    }
  };
}

/**
 * Generate fallback Market Discovery
 * Uses verified Business Intelligence data when AI fails
 */
export function generateMarketFallback(input, productData, businessIntelligence = null) {
  const bi = businessIntelligence;
  
  return {
    tam: preferDefinedValue(bi?.marketIntelligence?.tam),
    sam: preferDefinedValue(bi?.marketIntelligence?.sam),
    som: preferDefinedValue(bi?.marketIntelligence?.som),
    cagr: preferDefinedValue(bi?.marketIntelligence?.cagr),
    marketTrends: preferNonEmptyArray(bi?.marketIntelligence?.trends),
    demandScore: bi?.marketIntelligence?.demandScore ?? null,
    growthOpportunities: preferNonEmptyArray(bi?.marketIntelligence?.opportunities),
    marketRisks: preferNonEmptyArray(bi?.marketIntelligence?.risks),
    entryStrategy: bi?.marketIntelligence?.entryStrategy || 'Insufficient Data - Market discovery unavailable from verified sources',
    competitiveLandscape: bi?.marketIntelligence?.competitiveLandscape || 'Insufficient Data - Competitive landscape unavailable from verified sources',
    industry: preferDefinedValue(bi?.marketIntelligence?.industry, bi?.companyIntelligence?.industry),
    growthRate: preferDefinedValue(bi?.marketIntelligence?.growthRate),
    sources: preferNonEmptyArray(bi?.sources),
    confidenceScore: bi?.marketIntelligence?.tam ? 70 : null,
    provider: bi?.marketIntelligence?.tam ? 'business_intelligence_fallback' : 'fallback_unavailable',
    evidence: {
      sources: bi?.sources || [],
      confidence: bi?.marketIntelligence?.tam ? 'Medium - Business Intelligence verified' : 'Low - No verified sources',
      inferenceStatus: 'deterministic'
    }
  };
}

/**
 * Generate fallback Audience Intelligence
 * Uses verified Business Intelligence data when AI fails
 */
export function generateAudienceFallback(input, productData, businessIntelligence = null) {
  const bi = businessIntelligence;
  
  const biPersonas = preferNonEmptyArray(bi?.audienceIntelligence?.personas);
  const biDecisionMakers = preferNonEmptyArray(bi?.audienceIntelligence?.decisionMakers);
  const biBuyingCommittee = preferNonEmptyArray(bi?.audienceIntelligence?.buyingCommittee);
  const biPainPoints = preferNonEmptyArray(bi?.audienceIntelligence?.painPoints);
  const biBuyingTriggers = preferNonEmptyArray(bi?.audienceIntelligence?.buyingTriggers);
  const biChannels = preferNonEmptyArray(bi?.audienceIntelligence?.channels);
  const biTargetUsers = preferNonEmptyArray(bi?.audienceIntelligence?.targetUsers);
  
  return {
    personas: biPersonas,
    buyerPersonas: biPersonas,
    decisionMakers: biDecisionMakers,
    buyingCommittee: biBuyingCommittee,
    painPoints: biPainPoints,
    buyingTriggers: biBuyingTriggers,
    preferredChannels: biChannels,
    targetUsers: biTargetUsers,
    messagingStyle: biPersonas.length > 0 ? 'Based on verified Business Intelligence personas' : 'Insufficient Data - Audience intelligence unavailable from verified sources',
    sources: preferNonEmptyArray(bi?.sources),
    confidenceScore: biPersonas.length > 0 ? Math.min(85, biPersonas.length * 20) : null,
    provider: biPersonas.length > 0 ? 'business_intelligence_fallback' : 'fallback_unavailable',
    evidence: {
      sources: bi?.sources || [],
      confidence: biPersonas.length > 0 ? 'Medium - Business Intelligence verified' : 'Low - No verified sources',
      inferenceStatus: 'deterministic'
    }
  };
}

/**
 * Generate fallback Competitor Analysis
 * Uses Business Intelligence and orchestrator competitors when available
 */
export function generateCompetitorFallback(input, productData, orchestratorCompetitors = [], businessIntelligence = null) {
  const bi = businessIntelligence;
  
  // Combine BI competitors with orchestrator competitors
  const biCompetitors = preferNonEmptyArray(bi?.competitorIntelligence?.direct);
  const orchestratorCompetitorsFormatted = orchestratorCompetitors.length > 0 
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
  
  const allCompetitors = preferNonEmptyArray(biCompetitors, orchestratorCompetitorsFormatted);
  
  return {
    competitors: allCompetitors,
    marketGaps: preferNonEmptyArray(bi?.competitorIntelligence?.marketGaps),
    directCompetitors: allCompetitors.map(c => ({
      name: c.name,
      domain: c.domain,
      opportunityScore: c.opportunityScore || null,
      strengths: c.strengths || [],
      weaknesses: c.weaknesses || [],
      evidence: c.evidence,
      source: c.source
    })),
    indirectCompetitors: preferNonEmptyArray(bi?.competitorIntelligence?.indirect),
    competitorMatrix: allCompetitors.length > 0 
      ? `${allCompetitors.length} competitors identified from verified sources`
      : 'Insufficient Data - Competitor analysis unavailable from verified sources',
    differentiationOpportunities: preferNonEmptyArray(bi?.competitorIntelligence?.opportunities),
    strengths: preferNonEmptyArray(bi?.competitorIntelligence?.strengths),
    weaknesses: preferNonEmptyArray(bi?.competitorIntelligence?.weaknesses),
    sources: preferNonEmptyArray(bi?.sources),
    confidenceScore: allCompetitors.length > 0 ? Math.min(85, allCompetitors.length * 15) : null,
    provider: allCompetitors.length > 0 ? 'business_intelligence_fallback' : 'fallback_unavailable',
    evidence: {
      sources: bi?.sources || [],
      confidence: allCompetitors.length > 0 ? 'Medium - Business Intelligence verified' : 'Low - No verified sources',
      inferenceStatus: 'deterministic'
    }
  };
}

/**
 * Generate fallback Intent Prediction
 * Uses Business Intelligence when available
 */
export function generateIntentFallback(input, audienceData, businessIntelligence = null) {
  const bi = businessIntelligence;
  const biChannels = preferNonEmptyArray(bi?.audienceIntelligence?.channels);
  
  return {
    highIntentSegments: preferNonEmptyArray(bi?.audienceIntelligence?.highIntentSegments),
    mediumIntentSegments: preferNonEmptyArray(bi?.audienceIntelligence?.mediumIntentSegments),
    lowIntentSegments: preferNonEmptyArray(bi?.audienceIntelligence?.lowIntentSegments),
    buyingSignals: preferNonEmptyArray(bi?.audienceIntelligence?.buyingTriggers),
    hotSegments: preferNonEmptyArray(bi?.audienceIntelligence?.hotSegments),
    channels: biChannels,
    confidenceScore: biChannels.length > 0 ? 65 : null,
    provider: biChannels.length > 0 ? 'business_intelligence_fallback' : 'fallback_unavailable',
    evidence: {
      sources: bi?.sources || [],
      confidence: biChannels.length > 0 ? 'Medium - Business Intelligence verified' : 'Low - No verified sources',
      inferenceStatus: 'deterministic'
    }
  };
}

/**
 * Generate fallback Positioning Engine
 * Uses Business Intelligence when available
 */
export function generatePositioningFallback(input, productData, competitorData, businessIntelligence = null) {
  const bi = businessIntelligence;
  const productName = input?.productName || input?.companyName || 'the product';
  const industry = preferDefinedValue(bi?.marketIntelligence?.industry, bi?.companyIntelligence?.industry);
  
  return {
    positioningStatement: industry 
      ? `Leading ${industry} solution for ${productName}`
      : 'Insufficient Data - Positioning unavailable from verified sources',
    valueProposition: bi?.companyIntelligence?.description || 'Insufficient Data - Value proposition unavailable from verified sources',
    differentiationAngle: bi?.competitorIntelligence?.opportunities?.[0] || 'Insufficient Data - Differentiation unavailable from verified sources',
    messagingPillars: preferNonEmptyArray(bi?.audienceIntelligence?.painPoints?.slice(0, 3)),
    brandPromise: bi?.companyIntelligence?.mission || 'Insufficient Data - Brand promise unavailable from verified sources',
    competitorWeaknessToAttack: preferNonEmptyArray(bi?.competitorIntelligence?.weaknesses),
    targetPerception: bi?.audienceIntelligence?.personas?.[0]?.name 
      ? `Perceived as solution for ${bi.audienceIntelligence.personas[0].name}`
      : 'Insufficient Data - Target perception unavailable from verified sources',
    sources: preferNonEmptyArray(bi?.sources),
    confidenceScore: industry ? 60 : null,
    provider: industry ? 'business_intelligence_fallback' : 'fallback_unavailable',
    evidence: {
      sources: bi?.sources || [],
      confidence: industry ? 'Medium - Business Intelligence verified' : 'Low - No verified sources',
      inferenceStatus: 'deterministic'
    }
  };
}

/**
 * Generate fallback Campaign Generator
 * Uses Business Intelligence when available, does not generate generic roadmap
 */
export function generateCampaignFallback(input, websiteData, allResults, businessIntelligence = null) {
  const bi = businessIntelligence;
  const productName = input?.productName || input?.companyName || 'the product';
  const biPersonas = preferNonEmptyArray(bi?.audienceIntelligence?.personas);
  const biChannels = preferNonEmptyArray(bi?.audienceIntelligence?.channels);
  const biPainPoints = preferNonEmptyArray(bi?.audienceIntelligence?.painPoints);
  
  // Only generate action plan if we have real findings
  let actionPlan = null;
  if (biPainPoints.length > 0 && biChannels.length > 0) {
    actionPlan = {
      immediate: biPainPoints.slice(0, 2).map(p => ({
        action: `Address ${p}`,
        reason: 'Verified pain point from Business Intelligence',
        evidence: 'business_intelligence',
        priority: 'high'
      })),
      shortTerm: biChannels.slice(0, 2).map(c => ({
        action: `Launch ${c} campaign`,
        reason: 'Verified channel from Business Intelligence',
        evidence: 'business_intelligence',
        priority: 'medium'
      }))
    };
  }
  
  return {
    status: actionPlan ? 'PARTIALLY_GENERATED' : 'INSUFFICIENT_DATA',
    campaignObjective: biPainPoints.length > 0 
      ? `Address ${biPainPoints[0]} for ${productName}`
      : 'Insufficient Data - Campaign objective unavailable from verified sources',
    campaignAngles: biPainPoints.slice(0, 3).map(p => ({
      angle: `Solve ${p}`,
      reason: 'Based on verified pain point)',
      evidence: 'business_intelligence'
    })),
    hooks: biPersonas.slice(0, 3).map(p => ({
      hook: `For ${p.name}`,
      reason: 'Based on verified persona',
      evidence: 'business_intelligence'
    })),
    campaignIdeas: [],
    adHooks: [],
    actionPlan: actionPlan,
    ctaSuggestions: [],
    channels: biChannels,
    objectives: biPainPoints.slice(0, 3).map(p => ({
      objective: `Address ${p}`,
      reason: 'Verified pain point',
      evidence: 'business_intelligence'
    })),
    sources: preferNonEmptyArray(bi?.sources),
    confidenceScore: (biPainPoints.length > 0 && biChannels.length > 0) ? 60 : null,
    provider: (biPainPoints.length > 0 && biChannels.length > 0) ? 'business_intelligence_fallback' : 'fallback_unavailable',
    availableRecommendations: actionPlan ? [] : [
      `Run complete Growth Analysis for ${productName} to generate campaign angles`,
      'Configure website URL for audience and competitor evidence',
      'Complete Product Analysis for feature-based messaging'
    ],
    missingEvidence: actionPlan ? [] : [
      'Product features and USP analysis',
      'Audience persona definitions',
      'Competitor positioning data',
      'Market trend signals'
    ],
    generationWarnings: actionPlan ? [] : [
      'AI providers unavailable or returned empty results',
      'Fallback used - campaign not generated from evidence'
    ],
    evidence: {
      sources: bi?.sources || [],
      confidence: (biPainPoints.length > 0 && biChannels.length > 0) ? 'Medium - Business Intelligence verified' : 'Low - No verified sources',
      inferenceStatus: 'deterministic'
    }
  };
}

/**
 * Generate fallback Channel Recommendation
 * Uses Business Intelligence when available
 */
export function generateChannelFallback(input, audienceData, campaignData, businessIntelligence = null) {
  const bi = businessIntelligence;
  const biChannels = preferNonEmptyArray(bi?.audienceIntelligence?.channels);
  
  return {
    primaryChannel: biChannels[0]?.channel || biChannels[0] || 'Unknown',
    recommendedChannels: biChannels.map(c => ({
      channel: c.channel || c,
      reason: 'Verified from Business Intelligence',
      evidence: 'business_intelligence',
      priority: 'medium'
    })),
    sources: preferNonEmptyArray(bi?.sources),
    confidenceScore: biChannels.length > 0 ? Math.min(85, biChannels.length * 15) : null,
    provider: biChannels.length > 0 ? 'business_intelligence_fallback' : 'fallback_unavailable',
    evidence: {
      sources: bi?.sources || [],
      confidence: biChannels.length > 0 ? 'Medium - Business Intelligence verified' : 'Low - No verified sources',
      inferenceStatus: 'deterministic'
    }
  };
}
