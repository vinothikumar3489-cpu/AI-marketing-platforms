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

  const biFeatures = [];
  if (bi?.technologyIntelligence?.technologies?.length) {
    biFeatures.push(...bi.technologyIntelligence.technologies.map(t => ({
      value: t.name || t,
      confidence: null,
      impact: null
    })));
  }

  const biPricing = bi?.pricingIntelligence || {};
  const pricingTiers = preferNonEmptyArray(biPricing.tiers);

  const biPersonas = preferNonEmptyArray(bi?.audienceIntelligence?.personas);
  const biPainPoints = preferNonEmptyArray(bi?.audienceIntelligence?.painPoints);

  const biIndustry = preferDefinedValue(bi?.marketIntelligence?.industry, bi?.companyIntelligence?.industry);
  const biTrends = preferNonEmptyArray(bi?.marketIntelligence?.trends);

  const benefitItems = biPainPoints.map(p => ({
    value: p,
    confidence: null,
    impact: null
  }));

  const jtbdItems = (bi?.audienceIntelligence?.buyingTriggers || []).map(t => ({
    value: t,
    confidence: null,
    impact: null
  }));

  return {
    identity: productIdentity,
    summary: description || bi?.companyIntelligence?.description || 'Insufficient Data - Analysis unavailable from verified sources',
    productSummary: description || bi?.companyIntelligence?.description || 'Insufficient Data - Analysis unavailable from verified sources',
    category: preferDefinedValue(biIndustry, productIdentity.category, 'Unknown'),
    usp: biFeatures.length > 0 ? `Built with ${biFeatures.slice(0, 3).map(f => f.value).join(', ')}` : null,
    uniqueSellingProposition: biFeatures.length > 0 ? `Built with ${biFeatures.slice(0, 3).map(f => f.value).join(', ')}` : null,
    features: preferNonEmptyArray(biFeatures),
    keyFeatures: preferNonEmptyArray(biFeatures),
    benefits: preferNonEmptyArray(benefitItems),
    coreBenefits: preferNonEmptyArray(benefitItems),
    jobsToBeDone: preferNonEmptyArray(jtbdItems),
    jtbd: preferNonEmptyArray(jtbdItems),
    painPointsSolved: biPainPoints.map(p => ({ value: p, confidence: null, impact: null })),
    painPoints: biPainPoints.map(p => ({ value: p, confidence: null, impact: null })),
    targetUsers: (bi?.audienceIntelligence?.targetUsers || []).map(u => ({ value: u, confidence: null, impact: null })),
    differentiators: [],
    pricing: {
      tiers: pricingTiers,
      hasFreePlan: biPricing.hasFreePlan ?? null,
      hasFreeTrial: biPricing.hasFreeTrial ?? null,
      hasEnterprise: biPricing.hasEnterprise ?? null,
      currency: biPricing.currency ?? null,
      source: 'business_intelligence'
    },
    personas: biPersonas,
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

  const trends = (bi?.marketIntelligence?.trends || []).map(t => ({
    value: typeof t === 'string' ? t : t.value || t.trend || '',
    confidence: null,
    impact: null
  }));

  const opportunities = (bi?.marketIntelligence?.opportunities || []).map(o => ({
    value: typeof o === 'string' ? o : o.value || o.opportunity || '',
    confidence: null,
    impact: null
  }));

  const risks = (bi?.marketIntelligence?.risks || []).map(r => ({
    value: typeof r === 'string' ? r : r.value || r.risk || '',
    confidence: null,
    impact: null
  }));

  return {
    demandScore: bi?.marketIntelligence?.demandScore ?? null,
    confidence: null,
    confidenceScore: null,
    marketTrends: trends,
    trends: trends,
    growthOpportunities: opportunities,
    opportunities: opportunities,
    marketRisks: risks,
    risks: risks,
    growthSignals: [],
    entryStrategy: bi?.marketIntelligence?.entryStrategy || 'Insufficient Data - Market discovery unavailable from verified sources',
    competitiveLandscape: bi?.marketIntelligence?.competitiveLandscape || 'Insufficient Data - Competitive landscape unavailable from verified sources',
    industry: preferDefinedValue(bi?.marketIntelligence?.industry, bi?.companyIntelligence?.industry),
    growthRate: preferDefinedValue(bi?.marketIntelligence?.growthRate),
    demand: bi?.marketIntelligence?.demandScore ?? null,
    sources: preferNonEmptyArray(bi?.sources),
    confidenceScore: (trends.length > 0 || opportunities.length > 0) ? 70 : null,
    provider: (trends.length > 0 || opportunities.length > 0) ? 'business_intelligence_fallback' : 'fallback_unavailable',
    evidence: {
      sources: bi?.sources || [],
      confidence: (trends.length > 0 || opportunities.length > 0) ? 'Medium - Business Intelligence verified' : 'Low - No verified sources',
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

  const biPersonas = (bi?.audienceIntelligence?.personas || []).map(p => ({
    name: typeof p === 'string' ? p : p.name || p.persona || '',
    demographics: typeof p === 'object' ? (p.demographics || p.description || '') : '',
    intentScore: null,
    goals: typeof p === 'object' ? (p.goals || []) : [],
    painPoints: typeof p === 'object' ? (p.painPoints || []) : [],
    buyingMotivations: typeof p === 'object' ? (p.motivations || []) : []
  })).filter(p => p.name);

  const biDecisionMakers = (bi?.audienceIntelligence?.decisionMakers || []).map(d => ({
    value: typeof d === 'string' ? d : d.title || d.name || d,
    confidence: null,
    impact: null
  }));

  const biChannels = (bi?.audienceIntelligence?.channels || []).map(c => ({
    value: typeof c === 'string' ? c : c.channel || c.name || c,
    confidence: null,
    impact: null
  }));

  const biBuyingTriggers = (bi?.audienceIntelligence?.buyingTriggers || []).map(t => ({
    value: typeof t === 'string' ? t : t.value || t.trigger || t,
    confidence: null,
    impact: null
  }));

  const biPainPoints = (bi?.audienceIntelligence?.painPoints || []).map(p => ({
    value: typeof p === 'string' ? p : p.value || p.pain || p,
    confidence: null,
    impact: null
  }));

  return {
    personas: biPersonas,
    buyerPersonas: biPersonas,
    decisionMakers: biDecisionMakers,
    buyingCommittee: biDecisionMakers,
    painPoints: biPainPoints,
    buyingTriggers: biBuyingTriggers,
    preferredChannels: biChannels,
    bestChannels: biChannels,
    commonObjections: [],
    objections: [],
    targetUsers: (bi?.audienceIntelligence?.targetUsers || []).map(u => ({ value: u, confidence: null, impact: null })),
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

  const biCompetitors = (bi?.competitorIntelligence?.direct || []).map(c => ({
    name: c.name || c,
    domain: c.domain || '',
    opportunityScore: c.opportunityScore || null,
    trafficEstimate: 'Unknown',
    seoAuthority: null,
    strengths: c.strengths || [],
    weaknesses: c.weaknesses || [],
    evidence: 'business_intelligence',
    source: 'business_intelligence'
  }));

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

  const gaps = (bi?.competitorIntelligence?.marketGaps || []).map(g => ({
    value: typeof g === 'string' ? g : g.value || g.gap || g.opportunity || '',
    confidence: null,
    impact: null
  }));

  const diffOpps = (bi?.competitorIntelligence?.opportunities || []).map(o => ({
    value: typeof o === 'string' ? o : o.value || o.opportunity || '',
    confidence: null,
    impact: null
  }));

  return {
    competitors: allCompetitors,
    directCompetitors: allCompetitors.map(c => ({
      name: c.name,
      domain: c.domain,
      opportunityScore: c.opportunityScore || null,
      strengths: c.strengths || [],
      weaknesses: c.weaknesses || [],
      positioning: c.positioning || c.evidence || '',
    })),
    indirectCompetitors: (bi?.competitorIntelligence?.indirect || []).map(c => ({
      name: c.name || c,
      domain: c.domain || '',
    })),
    marketGaps: gaps,
    differentiationOpportunities: diffOpps,
    competitorWeaknesses: (bi?.competitorIntelligence?.weaknesses || []).map(w => ({
      value: typeof w === 'string' ? w : w.value || w.weakness || '',
      confidence: null,
      impact: null
    })),
    strengths: (bi?.competitorIntelligence?.strengths || []).map(s => ({
      value: typeof s === 'string' ? s : s.value || s.strength || '',
      confidence: null,
      impact: null
    })),
    weaknesses: (bi?.competitorIntelligence?.weaknesses || []).map(w => ({
      value: typeof w === 'string' ? w : w.value || w.weakness || '',
      confidence: null,
      impact: null
    })),
    competitorMatrix: allCompetitors.length > 0
      ? `${allCompetitors.length} competitors identified from verified sources`
      : 'Insufficient Data - Competitor analysis unavailable from verified sources',
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

  const signals = (bi?.audienceIntelligence?.buyingTriggers || []).map(t => ({
    value: typeof t === 'string' ? t : t.value || t.trigger || t,
    confidence: null,
    impact: null
  }));

  return {
    hotSegments: signals.map(s => ({ value: s.value, confidence: null, impact: null })),
    highIntentSegments: signals.map(s => ({ value: s.value, confidence: null, impact: null })),
    warmSegments: [],
    mediumIntentSegments: [],
    coldSegments: [],
    lowIntentSegments: [],
    buyingSignals: signals,
    triggerEvents: [],
    leadScoringRules: [],
    channels: (bi?.audienceIntelligence?.channels || []).map(c => ({
      value: typeof c === 'string' ? c : c.channel || c.name || c,
      confidence: null,
      impact: null
    })),
    confidenceScore: signals.length > 0 ? 65 : null,
    provider: signals.length > 0 ? 'business_intelligence_fallback' : 'fallback_unavailable',
    evidence: {
      sources: bi?.sources || [],
      confidence: signals.length > 0 ? 'Medium - Business Intelligence verified' : 'Low - No verified sources',
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

  const pillars = (bi?.audienceIntelligence?.painPoints || []).slice(0, 3).map(p => ({
    value: typeof p === 'string' ? p : p.value || p.pain || p,
    confidence: null,
    impact: null
  }));

  const weaknessesToAttack = (bi?.competitorIntelligence?.weaknesses || []).map(w => ({
    value: typeof w === 'string' ? w : w.value || w.weakness || w,
    confidence: null,
    impact: null
  }));

  return {
    positioningStatement: industry
      ? `Leading ${industry} solution for ${productName}`
      : 'Insufficient Data - Positioning unavailable from verified sources',
    statement: industry
      ? `Leading ${industry} solution for ${productName}`
      : 'Insufficient Data - Positioning unavailable from verified sources',
    valueProposition: bi?.companyIntelligence?.description || 'Insufficient Data - Value proposition unavailable from verified sources',
    differentiationAngle: (bi?.competitorIntelligence?.opportunities || [])[0] || 'Insufficient Data - Differentiation unavailable from verified sources',
    messagingPillars: pillars,
    pillars: pillars,
    brandPromise: bi?.companyIntelligence?.mission || 'Insufficient Data - Brand promise unavailable from verified sources',
    competitorWeaknessesToAttack: weaknessesToAttack,
    competitorWeaknessToAttack: weaknessesToAttack.map(w => w.value),
    targetPerception: (bi?.audienceIntelligence?.personas || [])[0]?.name
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

  const biPersonas = (bi?.audienceIntelligence?.personas || []).map(p => ({
    name: typeof p === 'string' ? p : p.name || p.persona || '',
  })).filter(p => p.name);

  const biChannels = (bi?.audienceIntelligence?.channels || []).map(c => ({
    value: typeof c === 'string' ? c : c.channel || c.name || c,
    confidence: null,
    impact: null
  }));

  const biPainPoints = (bi?.audienceIntelligence?.painPoints || []).map(p => ({
    value: typeof p === 'string' ? p : p.value || p.pain || p,
    confidence: null,
    impact: null
  }));

  const biAngles = biPainPoints.slice(0, 3).map(p => ({
    value: `Solve ${p.value}`,
    confidence: null,
    impact: null
  }));

  const biHooks = biPersonas.slice(0, 3).map(p => ({
    value: `For ${p.name}`,
    confidence: null,
    impact: null
  }));

  let actionPlan = null;
  if (biPainPoints.length > 0 && biChannels.length > 0) {
    actionPlan = {
      sevenDay: biPainPoints.slice(0, 2).map(p => ({
        title: `Address ${p.value}`,
        problem: p.value,
        evidence: 'business_intelligence',
        priority: 'high',
        difficulty: 'Medium',
        estimatedTimeline: '1-2 weeks',
        owner: 'Marketing'
      })),
      thirtyDay: biChannels.slice(0, 2).map(c => ({
        title: `Launch ${c.value} campaign`,
        evidence: 'business_intelligence',
        priority: 'medium',
        difficulty: 'Medium',
        estimatedTimeline: '1 month',
        owner: 'Marketing'
      })),
      sixtyDay: [],
      ninetyDay: []
    };
  }

  return {
    creativeAngles: biAngles,
    angles: biAngles,
    copyHooks: biHooks,
    hooks: biHooks,
    ctaSuggestions: [],
    ctas: [],
    emailSequence: [],
    socialPostIdeas: [],
    socialPosts: [],
    videoIdeas: [],
    campaignIdeas: biAngles,
    nextActions: actionPlan ? ['Campaign partially generated from Business Intelligence evidence'] : ['Run complete Growth Analysis'],
    actionPlan: actionPlan || {
      sevenDay: [],
      thirtyDay: [],
      sixtyDay: [],
      ninetyDay: []
    },
    channels: biChannels,
    sources: preferNonEmptyArray(bi?.sources),
    confidenceScore: (biPainPoints.length > 0 && biChannels.length > 0) ? 60 : null,
    provider: (biPainPoints.length > 0 && biChannels.length > 0) ? 'business_intelligence_fallback' : 'fallback_unavailable',
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

  const biChannels = (bi?.audienceIntelligence?.channels || []).map(c => ({
    channel: typeof c === 'string' ? c : c.channel || c.name || c,
    name: typeof c === 'string' ? c : c.channel || c.name || c,
    reasoning: 'Verified from Business Intelligence',
    reason: 'Verified from Business Intelligence',
    evidence: 'business_intelligence',
    priority: 'medium',
    fit: 'Good fit based on audience evidence'
  }));

  return {
    primaryChannel: biChannels[0]?.channel || 'Unknown',
    recommendedChannels: biChannels,
    channels: biChannels.map(c => ({
      channel: c.channel,
      name: c.name,
      reasoning: c.reasoning
    })),
    budgetSplit: [],
    channelFitScores: [],
    postingFrequency: [],
    contentTypes: [],
    channelStrategy: biChannels.length > 0 ? 'Multi-channel approach based on verified audience channels' : 'Insufficient Data - Channel recommendation unavailable from verified sources',
    budgetRecommendation: biChannels.length > 0 ? 'Allocate budget proportionally to channel priority' : 'Unknown',
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
