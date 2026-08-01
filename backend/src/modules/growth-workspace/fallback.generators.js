/**
 * Fallback generators for the Growth Workspace pipeline.
 *
 * These run when every AI provider fails. Golden rule: NEVER fabricate data.
 * Output is derived exclusively from verified inputs (user query/inputs,
 * scraped website data, orchestrator research, evidence snapshots). When no
 * evidence exists, arrays are empty, strings are null, and confidenceScore is
 * null so downstream validators and quality filters stay honest.
 */

const EVIDENCE_BASED = 'EVIDENCE_BASED';
const HYPOTHESIS = 'HYPOTHESIS';

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return value.trim() ? [value.trim()] : [];
    }
  }
  return [];
}

function textFromWebsite(websiteData, maxLength = 800) {
  if (!websiteData) return '';
  const text = websiteData.text || websiteData.cleanedText || '';
  return typeof text === 'string' ? text.slice(0, maxLength) : '';
}

function metaDescription(websiteData) {
  if (!websiteData) return '';
  const meta = websiteData.metadata || {};
  return typeof meta.description === 'string' && meta.description.trim()
    ? meta.description.trim()
    : (typeof meta.title === 'string' ? meta.title.trim() : '');
}

function deriveConfidence(derivedCount) {
  if (!derivedCount || derivedCount <= 0) return null;
  return Math.min(60, 30 + derivedCount * 5);
}

/**
 * Product fallback — real features/benefits/pain points are extracted from
 * scraped website content and evidence snapshots only. No AI invention.
 */
export function generateProductFallback(input, websiteData, evidenceGrowthData) {
  const productName = (input && input.productName) || 'the product';
  const query = (input && input.query) || '';
  const description = (input && input.description) || '';

  const features = [];
  const benefits = [];
  const painPoints = [];

  if (evidenceGrowthData?.productIntelligence) {
    const pi = evidenceGrowthData.productIntelligence;
    (pi.features || []).forEach((f) => {
      if (f && f.value) features.push({ value: f.value, confidence: null, impact: null });
    });
    (pi.ctaTexts || []).forEach((c) => {
      if (c) benefits.push({ value: c, confidence: null, impact: null });
    });
  }

  if (websiteData) {
    const headings = websiteData.content?.headings || [];
    for (const h of headings.slice(0, 8)) {
      if (h && h.text && !/menu|navigation|footer|login|sign up/i.test(h.text)) {
        features.push({ value: h.text, confidence: null, impact: null });
      }
    }
    const websiteFeatures = websiteData.features || [];
    for (const f of websiteFeatures) {
      if (typeof f === 'string' && f.trim()) features.push({ value: f.trim(), confidence: null, impact: null });
    }
    const websiteBenefits = websiteData.benefits || [];
    for (const b of websiteBenefits) {
      if (typeof b === 'string' && b.trim()) benefits.push({ value: b.trim(), confidence: null, impact: null });
    }

    const body = textFromWebsite(websiteData);
    if (body) {
      const PAIN_PATTERNS = /\b(struggle|challenge|difficult|time.?consuming|expensive|manual|slow|outdated|frustrat|waste)\b/i;
      const sentences = body.split(/(?<=[.!?])\s+/).filter((s) => s.length > 20 && s.length < 200);
      for (const s of sentences.slice(0, 6)) {
        if (PAIN_PATTERNS.test(s)) {
          painPoints.push({ value: s.trim().replace(/^[-•\s]+/, '').slice(0, 160), confidence: null, impact: null });
        }
      }
    }
  }

  const meta = metaDescription(websiteData);
  const productSummary = description
    || meta
    || (query ? `${productName} — ${query}` : `${productName} — no verified data available.`);

  const derivedCount = features.length + benefits.length + painPoints.length;

  return {
    productSummary,
    usp: null,
    valuePropositions: [],
    keyFeatures: features.slice(0, 12),
    keyDifferentiators: [],
    painPoints: painPoints.slice(0, 6),
    jobsToBeDone: [],
    targetUsers: [],
    confidenceScore: deriveConfidence(derivedCount),
    provider: 'fallback',
    _dataSource: HYPOTHESIS
  };
}

/**
 * Market fallback — market sizing (TAM/SAM/SOM) is NEVER invented. It stays
 * null unless real keyword-volume evidence is supplied.
 */
export function generateMarketFallback(input, productData, researchData) {
  const trends = [];
  const opportunities = [];
  const risks = [];
  const growthSignals = [];

  const keywords = toList(researchData?.keywords);
  const verifiedKeywords = keywords.filter((k) => k && k.keyword && Number(k.searchVolume) > 0);
  if (verifiedKeywords.length > 0) {
    const totalVolume = verifiedKeywords.slice(0, 25).reduce((sum, k) => sum + Number(k.searchVolume), 0);
    opportunities.push({
      value: `${verifiedKeywords.length} verified keywords with real search volume (${totalVolume.toLocaleString()} combined monthly searches) — a concrete demand surface for acquisition.`,
      confidence: 70,
      impact: 'High'
    });
    growthSignals.push({
      signal: `Verified keyword demand of ${totalVolume.toLocaleString()} monthly searches across ${verifiedKeywords.length} terms`,
      source: 'DataForSEO keyword data',
      confidence: 70
    });
    for (const k of verifiedKeywords.slice(0, 4)) {
      trends.push({
        value: `Ongoing search demand for "${k.keyword}" (${k.searchVolume.toLocaleString()}/mo)`,
        confidence: 60,
        impact: 'Medium'
      });
    }
  }

  const news = toList(researchData?.newsSignals);
  for (const n of news.slice(0, 4)) {
    const title = n.title || n.headline || null;
    if (title) growthSignals.push({ signal: title, source: 'News signal', confidence: 50 });
  }

  const marketData = productData && typeof productData === 'object' ? productData : {};
  const realTAM = marketData.tam && marketData.tam !== 'Unknown' ? marketData.tam : null;

  return {
    tam: realTAM,
    sam: null,
    som: null,
    cagr: null,
    marketTrends: trends,
    opportunities,
    risks,
    growthSignals,
    entryStrategy: null,
    demandScore: null,
    confidenceScore: deriveConfidence(opportunities.length + trends.length),
    provider: 'fallback',
    _dataSource: HYPOTHESIS
  };
}

/**
 * Audience fallback — personas are never fabricated. Derived only from real
 * audience signals collected during research.
 */
export function generateAudienceFallback(input, productData, evidenceGrowthData, researchData) {
  const buyerPersonas = [];
  const buyingTriggers = [];
  const commonObjections = [];
  const bestChannels = [];
  const decisionMakers = [];

  const audienceSignals = toList(researchData?.audienceSignals);
  for (const signal of audienceSignals) {
    for (const persona of toList(signal.personas)) {
      if (persona && (persona.name || persona.title)) {
        buyerPersonas.push({
          name: persona.name || persona.title,
          role: persona.role || persona.name || null,
          demographics: persona.demographics || '',
          goals: toList(persona.goals).map((g) => g.goal || g || ''),
          painPoints: toList(persona.painPoints).map((p) => p.painPoint || p || ''),
          channels: toList(persona.channels),
          intentScore: persona.intentScore ?? null
        });
      }
    }
    for (const trigger of toList(signal.buyingTriggers)) {
      if (trigger && (trigger.value || trigger.trigger)) {
        buyingTriggers.push({ value: trigger.value || trigger.trigger, confidence: null, impact: null });
      }
    }
  }

  const derivedCount = buyerPersonas.length + buyingTriggers.length;

  return {
    buyerPersonas: buyerPersonas.slice(0, 8),
    buyingTriggers: buyingTriggers.slice(0, 8),
    commonObjections,
    bestChannels,
    decisionMakers,
    confidenceScore: deriveConfidence(derivedCount),
    provider: 'fallback',
    _dataSource: HYPOTHESIS
  };
}

/**
 * Competitor fallback — only real competitors from the research orchestrator
 * or BI layer are surfaced. Never invents names.
 */
export function generateCompetitorFallback(input, productData, orchestratorCompetitors) {
  const competitors = [];
  const directCompetitors = [];

  const sourceList = toList(orchestratorCompetitors);
  for (const c of sourceList) {
    if (!c || (!c.name && !c.domain && !c.website)) continue;
    const name = c.name || c.domain || c.website || '';
    if (!name || /competitor|unknown/i.test(name)) continue;

    const mapped = {
      name,
      domain: c.domain || (c.website ? c.website.replace(/^https?:\/\//, '').replace(/^www\./, '') : ''),
      website: c.website || null,
      category: c.category || null,
      strengths: toList(c.strengths),
      weaknesses: toList(c.weaknesses),
      pricing: c.pricing || null,
      trafficEstimate: c.trafficEstimate ?? null,
      seoAuthority: c.seoAuthority ?? null,
      confidence: c.confidence ?? null,
      evidence: c.evidence || null,
      source: c.source || 'research_orchestrator'
    };
    competitors.push(mapped);
    directCompetitors.push(mapped);
  }

  return {
    competitors,
    directCompetitors,
    competitorMatrix: competitors.length > 0 ? `Direct competitive set of ${competitors.length} verified players.` : null,
    marketGaps: [],
    competitorWeaknesses: [],
    differentiationOpportunities: [],
    confidenceScore: deriveConfidence(competitors.length),
    provider: 'fallback',
    _dataSource: competitors.length > 0 ? EVIDENCE_BASED : HYPOTHESIS
  };
}

/**
 * Intent fallback — segments/signals are never invented without evidence.
 */
export function generateIntentFallback(input, audienceData, researchData) {
  const highIntentSegments = [];
  const mediumIntentSegments = [];
  const lowIntentSegments = [];
  const buyingSignals = [];
  const triggerEvents = [];
  const leadScoringRules = [];

  const personas = toList(audienceData?.buyerPersonas);
  for (const p of personas.slice(0, 4)) {
    if (p && (p.name || p.title)) {
      const intent = p.intentScore;
      const segment = {
        value: p.name || p.title,
        confidence: null,
        impact: p.intentScore != null && p.intentScore >= 70 ? 'High' : 'Medium'
      };
      if (intent != null && intent >= 70) highIntentSegments.push(segment);
      else mediumIntentSegments.push(segment);
    }
  }

  const triggers = toList(audienceData?.buyingTriggers);
  for (const t of triggers.slice(0, 5)) {
    const value = t.value || t.trigger || null;
    if (value) buyingSignals.push({ value, confidence: null, impact: null });
  }

  const news = toList(researchData?.newsSignals);
  for (const n of news.slice(0, 3)) {
    const title = n.title || n.headline || null;
    if (title) triggerEvents.push({ value: `Market event: ${title}`, confidence: null, impact: null });
  }

  return {
    highIntentSegments,
    mediumIntentSegments,
    lowIntentSegments,
    buyingSignals,
    triggerEvents,
    leadScoringRules,
    confidenceScore: deriveConfidence(highIntentSegments.length + buyingSignals.length),
    provider: 'fallback',
    _dataSource: HYPOTHESIS
  };
}

/**
 * Positioning fallback — pillars map real product evidence; the positioning
 * statement is never invented.
 */
export function generatePositioningFallback(input, productData, competitorData, evidenceGrowthData) {
  const messagingPillars = [];
  const competitorWeaknessesToAttack = [];

  const features = toList(productData?.features).concat(toList(evidenceGrowthData?.productIntelligence?.features));
  const seen = new Set();
  for (const f of features.slice(0, 5)) {
    const value = f.value || f || null;
    if (value && !seen.has(value)) {
      seen.add(value);
      messagingPillars.push({ value, confidence: null, impact: null });
    }
  }

  const usp = productData?.usp || null;
  if (usp && typeof usp === 'string' && !/unknown/i.test(usp)) {
    messagingPillars.push({ value: usp, confidence: null, impact: null });
  }

  const weaknesses = toList(competitorData?.competitorWeaknesses);
  for (const w of weaknesses.slice(0, 4)) {
    const value = w.value || w || null;
    if (value) competitorWeaknessesToAttack.push({ value, confidence: null, impact: null });
  }

  return {
    positioningStatement: null,
    valueProposition: null,
    brandPromise: null,
    messagingPillars: messagingPillars.slice(0, 6),
    competitorWeaknessesToAttack: competitorWeaknessesToAttack.slice(0, 4),
    confidenceScore: deriveConfidence(messagingPillars.length),
    provider: 'fallback',
    _dataSource: HYPOTHESIS
  };
}

/**
 * Campaign fallback — status reflects that the deterministic pipeline ran.
 * Angles/hooks map real evidence only; nothing is invented.
 */
export function generateCampaignFallback(input, allResults, campaignData, evidenceGrowthData) {
  const creativeAngles = [];
  const copyHooks = [];
  const ctaSuggestions = [];
  const emailSequence = [];
  const socialPostIdeas = [];
  const videoIdeas = [];

  const positioning = allResults?.positioning || {};
  const valueProposition = positioning.valueProposition || positioning.brandPromise || null;
  if (valueProposition && !/unknown/i.test(valueProposition)) {
    creativeAngles.push({ value: `Lead with: ${valueProposition}`, confidence: null, impact: null });
  }

  const features = toList(allResults?.product?.features);
  for (const f of features.slice(0, 3)) {
    const value = f.value || f || null;
    if (value) copyHooks.push({ value: `Built around ${value}`, confidence: null, impact: null });
  }

  const ctaTexts = toList(evidenceGrowthData?.productIntelligence?.ctaTexts);
  for (const c of ctaTexts.slice(0, 3)) {
    if (c) ctaSuggestions.push({ value: c, confidence: null, impact: null });
  }

  return {
    status: 'GENERATED',
    creativeAngles: creativeAngles.slice(0, 5),
    copyHooks: copyHooks.slice(0, 5),
    ctaSuggestions: ctaSuggestions.slice(0, 5),
    emailSequence: emailSequence.slice(0, 5),
    socialPostIdeas: socialPostIdeas.slice(0, 5),
    videoIdeas: videoIdeas.slice(0, 5),
    actionPlan: { sevenDay: [], thirtyDay: [], sixtyDay: [], ninetyDay: [] },
    confidenceScore: deriveConfidence(creativeAngles.length + copyHooks.length),
    provider: 'fallback',
    _dataSource: HYPOTHESIS
  };
}

/**
 * Channel fallback — primary channel is derived from real audience channel
 * preferences only. Never defaults to a guess.
 */
export function generateChannelFallback(input, audienceData, campaignData, evidenceGrowthData) {
  const recommendedChannels = [];
  let primaryChannel = null;

  const bestChannels = toList(audienceData?.bestChannels);
  for (const ch of bestChannels.slice(0, 5)) {
    const name = ch.value || ch.channel || ch.name || null;
    if (!name || /channel|unknown/i.test(name)) continue;
    const mapped = {
      channel: name,
      name,
      fit: ch.fit || ch.reason || '',
      reason: ch.reason || ch.fit || '',
      postingFrequency: ch.postingFrequency || null,
      contentTypes: toList(ch.contentTypes)
    };
    recommendedChannels.push(mapped);
  }

  const audienceSignals = toList(audienceData?.buyerPersonas);
  const signalChannels = toList(audienceSignals[0]?.channels);
  for (const ch of signalChannels.slice(0, 3)) {
    if (typeof ch === 'string' && ch.trim()) {
      recommendedChannels.push({ channel: ch.trim(), name: ch.trim(), fit: '', reason: '', postingFrequency: null, contentTypes: [] });
    }
  }

  if (recommendedChannels.length > 0) {
    primaryChannel = recommendedChannels[0].channel;
  }

  return {
    recommendedChannels: recommendedChannels.slice(0, 6),
    primaryChannel,
    channelStrategy: null,
    budgetRecommendation: null,
    confidenceScore: deriveConfidence(recommendedChannels.length),
    provider: 'fallback',
    _dataSource: recommendedChannels.length > 0 ? EVIDENCE_BASED : HYPOTHESIS
  };
}
