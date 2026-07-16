import { extractValidCompetitors } from './validated-competitors.js';

function safeArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [];
}

function safeScore(val) {
  if (val === null || val === undefined || val === '' || val === 'Not measured') return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  if (n >= 0 && n <= 1) return Math.round(n * 100);
  return Math.round(n);
}

export function buildCanonicalGrowthPayload({ chat, productIntelligence, audienceIntelligence, competitorIntelligence, campaignIntelligence }) {
  const warnings = [];

  const productAnalysis = productIntelligence?.productAnalysis || {};
  const marketDiscovery = productIntelligence?.marketDiscovery || {};
  const audience = audienceIntelligence || productIntelligence?.audienceIntelligence || {};
  const competitorAnalysis = competitorIntelligence?.competitorAnalysis || {};
  const campaignGen = campaignIntelligence?.campaignGenerator || {};
  const channelRec = campaignIntelligence?.channelRecommendation || {};
  const executiveStory = campaignIntelligence?.executiveStory || {};
  const actionPlan = campaignIntelligence?.actionPlan || {};

  const validatedCompetitors = extractValidCompetitors(competitorAnalysis);

  const features = safeArray(productAnalysis?.features);
  const benefits = safeArray(productAnalysis?.benefits);
  const pricingTiers = safeArray(productAnalysis?.pricingTiers || productAnalysis?.pricing);
  const personas = safeArray(audience?.buyerPersonas || audience?.personas);
  const channels = safeArray(channelRec?.recommendedChannels || channelRec?.channels);
  const opportunities = safeArray(marketDiscovery?.growthOpportunities || marketDiscovery?.opportunities);
  const trends = safeArray(marketDiscovery?.marketTrends || marketDiscovery?.trends);
  const risks = safeArray(marketDiscovery?.marketRisks || marketDiscovery?.risks);

  const audienceClarityScore = scoresFromPersonas(personas);
  const competitiveDefensibilityScore = scoresFromCompetitors(validatedCompetitors);
  const campaignReadinessScore = scoresFromCampaignData(campaignGen, channels);
  const marketOpportunityScore = scoresFromMarketData(marketDiscovery);

  function scoresFromPersonas(p) {
    if (!Array.isArray(p) || p.length === 0) return null;
    const hasEvidence = p.some(pp => pp.painPoints || pp.goals || pp.decisionAuthority);
    if (!hasEvidence) return null;
    const score = Math.min(Math.round((p.length / 5) * 40 + 30), 85);
    return score;
  }

  function scoresFromCompetitors(comps) {
    if (!Array.isArray(comps) || comps.length === 0) return null;
    const validated = comps.filter(c => c.validationStatus === 'VALIDATED');
    if (validated.length === 0) return null;
    const score = Math.min(Math.round(50 + (validated.length / 8) * 30), 85);
    if (!Number.isFinite(score)) return null;
    return score;
  }

  function scoresFromCampaignData(cg, ch) {
    const hasAngles = safeArray(cg?.creativeAngles || cg?.campaignConcepts).length > 0;
    const hasChannels = ch.length > 0;
    if (!hasAngles && !hasChannels) return null;
    let score = 30;
    if (hasAngles) score += 25;
    if (hasChannels) score += 20;
    return Math.min(score, 85);
  }

  function scoresFromMarketData(md) {
    const tam = md?.tam || md?.marketSize?.tam;
    const sam = md?.sam;
    const growth = md?.growthRate || md?.marketGrowthRate;
    if (!tam && !sam && !growth) return null;
    let score = 40;
    if (tam) score += 15;
    if (sam) score += 10;
    if (growth) score += 15;
    return Math.min(score, 85);
  }

  const scores = {
    overallGrowthScore: null,
    marketOpportunityScore,
    audienceClarityScore,
    competitiveDefensibilityScore,
    campaignReadinessScore,
  };

  const numericScores = [marketOpportunityScore, audienceClarityScore, competitiveDefensibilityScore, campaignReadinessScore].filter(s => s !== null);
  if (numericScores.length > 0) {
    scores.overallGrowthScore = Math.round(numericScores.reduce((a, b) => a + b, 0) / numericScores.length);
  }

  if (numericScores.length === 0) {
    warnings.push('No evidence-backed scores could be calculated');
  }

  if (validatedCompetitors.length === 0) {
    warnings.push('No validated competitors found');
  }

  const roadmap = buildValidatedRoadmap(actionPlan, campaignGen, warnings);

  return {
    chatId: chat?.id,
    status: 'COMPLETED',
    productIdentity: null,
    company: {
      name: '',
      domain: '',
      industry: '',
      category: '',
      businessModel: productAnalysis?.businessModel || '',
      targetMarket: productAnalysis?.targetMarket || '',
    },
    product: {
      name: '',
      summary: productAnalysis?.productSummary || '',
      features,
      benefits,
      differentiators: safeArray(productAnalysis?.usp || productAnalysis?.differentiators),
      painPoints: safeArray(productAnalysis?.painPoints),
      pricing: {
        tiers: pricingTiers,
        hasFree: false,
        hasFreeTrial: false,
        hasEnterprise: false,
      },
    },
    market: {
      tam: marketDiscovery?.tam || marketDiscovery?.marketSize?.tam || null,
      sam: marketDiscovery?.sam || marketDiscovery?.marketSize?.sam || null,
      som: marketDiscovery?.som || marketDiscovery?.marketSize?.som || null,
      growthRate: marketDiscovery?.growthRate || marketDiscovery?.marketGrowthRate || null,
      trends,
      opportunities,
      risks,
    },
    audience: {
      personas,
      segments: safeArray(audience?.audienceSegments || audience?.segments),
    },
    competitors: validatedCompetitors,
    positioning: {
      statement: productAnalysis?.positioning || competitorAnalysis?.positioningStatement || '',
      valueProposition: productAnalysis?.valueProposition || competitorAnalysis?.valueProposition || '',
    },
    campaign: {
      creativeAngles: safeArray(campaignGen?.creativeAngles || campaignGen?.campaignConcepts),
      copyHooks: safeArray(campaignGen?.copyHooks),
      summary: campaignGen?.growthSummary?.summary || campaignGen?.executiveSummary || '',
    },
    channels,
    scores,
    roadmap,
    evidenceCoverage: {
      hasFeatures: features.length > 0,
      hasPersonas: personas.length > 0,
      hasCompetitors: validatedCompetitors.length > 0,
      hasPricing: pricingTiers.length > 0,
      hasMarketData: !!marketDiscovery?.tam || !!marketDiscovery?.marketSize,
      hasChannels: channels.length > 0,
      hasCampaignData: safeArray(campaignGen?.creativeAngles || campaignGen?.campaignConcepts).length > 0,
    },
    warnings,
    updatedAt: chat?.updatedAt || new Date().toISOString(),
  };
}

function buildValidatedRoadmap(actionPlan, campaignGen, warnings) {
  const phases = ['day7', 'day30', 'day60', 'day90', 'day180', 'day365'];
  const roadmap = {};
  let totalItems = 0;

  for (const phase of phases) {
    const items = safeArray(actionPlan?.[phase] || actionPlan?.[phase.replace('day', '')]);
    const validItems = items.filter(item => {
      if (!item) return false;
      const title = item.title || item.action || item.task || item.recommendation || '';
      if (!title || title.length < 5) return false;
      const genericPhrases = [
        'set up google ads', 'launch linkedin ads', 'launch email campaign',
        'build predictive market', 'partner ecosystem', 'optimize website',
        'create content', 'build backlinks', 'improve seo',
        'run social media', 'increase brand awareness',
      ];
      const lower = title.toLowerCase();
      if (genericPhrases.some(g => lower.includes(g))) return false;
      return true;
    });
    if (validItems.length > 0) {
      roadmap[phase] = validItems.slice(0, 5);
      totalItems += validItems.length;
    }
  }

  if (totalItems === 0) {
    warnings.push('No evidence-backed roadmap entries available');
  }

  return roadmap;
}
