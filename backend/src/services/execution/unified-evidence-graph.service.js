import { getLatestEvidenceSnapshot } from '../../modules/evidence/evidence.service.js';
import { getSeoIntelligenceForChat } from "../loaders/seo-intelligence.loader.js";
import { getProductIntelligenceForChat } from "../loaders/product-intelligence.loader.js";
import { resolveProductIdentity } from '../resolvers/product-identity.resolver.js';
import { asArray, takeArray } from "../normalizers/array-helpers.js";

const graphCache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

function getCached(userId, chatId) {
  const key = `${userId}:${chatId}`;
  const cached = graphCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
  graphCache.delete(key);
  return null;
}

function setCached(userId, chatId, data) {
  const key = `${userId}:${chatId}`;
  graphCache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(userId, chatId) {
  const key = `${userId}:${chatId}`;
  graphCache.delete(key);
}

function extractText(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    if (value.value && typeof value.value === 'string') return value.value.trim();
    if (value.text) return value.text.trim();
    if (value.name) return value.name.trim();
    if (value.title) return value.title.trim();
  }
  return null;
}

function extractArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') {
    if (value.value && Array.isArray(value.value)) return value.value;
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.list)) return value.list;
  }
  return [];
}

export async function buildUnifiedEvidenceGraph(prisma, userId, chatId) {
  if (!prisma || !userId || !chatId) throw new Error('prisma, userId, and chatId required');

  const cached = getCached(userId, chatId);
  if (cached) return cached;

  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat || chat.userId !== userId) return { rejected: true, reason: 'Chat not found or owner mismatch', code: 'CHAT_ERROR' };

  const evidenceSnapshot = await getLatestEvidenceSnapshot({ prisma, userId, chatId });
  const raw = evidenceSnapshot?.evidence || {};
  const website = raw.website || {};

  const [productIntel, competitorIntel, campaignIntel, seoIntel, campaignPlan] = await Promise.all([
    getProductIntelligenceForChat({ prisma, userId, chatId }),
    prisma.competitorIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
    prisma.campaignIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
    getSeoIntelligenceForChat({ prisma, userId, chatId }),
    prisma.campaignPlan.findUnique({ where: { chatId } }).catch(() => null),
  ]);

  if (!productIntel) return { rejected: true, reason: 'Complete Growth Analysis before generating content.', code: 'EVIDENCE_MISSING' };

  const productIdentity = resolveProductIdentity({ chat, productIntelligence: productIntel, evidenceSnapshot, website });
  if (!productIdentity.resolved || !productIdentity.productName) return { rejected: true, reason: 'The product identity could not be resolved.', code: 'PRODUCT_IDENTITY_UNRESOLVED' };

  const pa = productIntel.productAnalysis || {};
  const audienceData = productIntel.audienceIntelligence || {};
  const marketData = productIntel.marketDiscovery || {};
  const competitorData = competitorIntel?.competitorAnalysis || {};
  const campaignData = campaignIntel?.campaignGenerator || {};
  const channelData = campaignIntel?.channelRecommendation || {};
  const execDashboard = seoIntel?.executiveDashboard || {};

  const execOverview = execDashboard.executiveOverview || {};
  const execActionPlan = execDashboard.executiveActionPlan || {};
  const execContentStrategy = execDashboard.contentStrategySummary || {};
  const execCompetitorSnapshot = execDashboard.competitorSnapshot || {};
  const execKeyOpportunities = execDashboard.keyOpportunities || [];

  const cpExecSummary = campaignPlan?.executiveSummary || {};
  const cpBusinessGoal = campaignPlan?.businessGoal || {};
  const cpObjective = campaignPlan?.campaignObjective || {};
  const cpAudience = campaignPlan?.audienceSelection || {};
  const cpChannels = campaignPlan?.channelRecommendations || [];
  const cpTimeline = campaignPlan?.timeline || {};
  const cpFunnel = campaignPlan?.marketingFunnel || {};
  const cpKpis = campaignPlan?.kpiFramework || [];

  const features = extractArray(pa.features || pa.keyFeatures || pa.capabilities || pa.productFeatures || pa.differentiators || pa.jobsToBeDone || website.featuresText || []);
  const benefits = extractArray(pa.benefits || pa.coreBenefits || pa.valuePropositions || pa.advantages || pa.valueProposition || []);
  const painPoints = extractArray(audienceData.painPoints || pa.painPoints || pa.problemsSolved || pa.challenges || []);
  const useCases = extractArray(pa.useCases || pa.jobsToBeDone || []);
  const pricing = pa.pricing || pa.pricingModel || null;

  const cpPainPoints = extractArray(cpAudience.painPoints || []);
  const cpDecisionDrivers = extractArray(cpAudience.decisionDrivers || []);
  const cpBuyingStage = cpAudience.buyingStage || cpObjective.buyingStage || null;
  const cpContentPreferences = extractArray(cpAudience.contentPreferences || []);
  const cpGoal = cpBusinessGoal.goal || cpObjective.primary || cpExecSummary.campaignGoal || null;
  const cpObjectiveText = cpObjective.primary || cpObjective.secondary || null;
  const cpCta = cpExecSummary.primaryCTA || null;

  const execStoryData = campaignIntel?.executiveStory || {};
  const execStory = execStoryData.story || execStoryData.executiveSummary || execStoryData.summary || null;
  const brandVoice = pa.brandVoice || campaignData.brandVoice || null;

  const seoKeywords = [];
  const seoKeywordData = seoIntel?.keywordOpportunities || {};
  if (Array.isArray(seoKeywordData)) seoKeywords.push(...seoKeywordData);
  else {
    if (seoKeywordData.primaryKeywords) seoKeywords.push(...asArray(seoKeywordData.primaryKeywords));
    if (seoKeywordData.secondaryKeywords) seoKeywords.push(...asArray(seoKeywordData.secondaryKeywords));
    if (seoKeywordData.longTailKeywords) seoKeywords.push(...asArray(seoKeywordData.longTailKeywords));
    if (seoKeywordData.questionKeywords) seoKeywords.push(...asArray(seoKeywordData.questionKeywords));
    if (seoKeywordData.geoKeywords) seoKeywords.push(...asArray(seoKeywordData.geoKeywords));
  }

  const kwIntelligence = seoIntel?.keywordIntelligence || {};
  const kiPrimary = extractArray(kwIntelligence.primary || kwIntelligence.primaryKeywords || []);
  const kiSecondary = extractArray(kwIntelligence.secondary || kwIntelligence.secondaryKeywords || []);
  const kiQuestion = extractArray(kwIntelligence.question || kwIntelligence.questionKeywords || []);
  const kiClusters = extractArray(kwIntelligence.clusters || seoKeywordData.clusters || []);
  const kiIntent = kwIntelligence.searchIntent || kwIntelligence.intent || null;

  const contentGaps = extractArray(seoIntel?.contentGaps || seoIntel?.contentGapRecord?.contentGaps || seoIntel?.contentGaps?.gaps || seoIntel?.contentGaps?.items || []);

  const graph = {
    _builtAt: new Date().toISOString(),
    _version: '2.0',
    _graphId: `graph_${chatId}_${Date.now()}`,
    _source: 'unified_evidence_graph',

    chat: { id: chatId, title: chat.title, userId },
    productIdentity: {
      productName: productIdentity.productName,
      brandName: productIdentity.brandName,
      companyName: productIdentity.companyName,
      displayName: productIdentity.displayName,
      websiteUrl: productIdentity.websiteUrl,
      domain: productIdentity.domain,
      industry: pa.industry || null,
      category: pa.category || null,
      resolved: productIdentity.resolved,
      source: productIdentity.source,
    },

    product: {
      name: productIdentity.productName,
      brandName: productIdentity.brandName,
      summary: pa.summary || pa.productSummary || null,
      description: pa.description || null,
      category: pa.category || null,
      usp: pa.usp || null,
      features: takeArray(features.map(f => ({ name: extractText(f) || (typeof f === 'string' ? f : ''), description: f.description || null, benefit: f.benefit || null })).filter(f => f.name), 15),
      benefits: takeArray(benefits.map(b => ({ text: extractText(b) || (typeof b === 'string' ? b : ''), description: b.description || null })).filter(b => b.text), 10),
      pricing: pricing ? (typeof pricing === 'string' ? pricing : pricing.model || pricing.type || JSON.stringify(pricing)) : null,
      useCases: takeArray(useCases.map(u => ({ scenario: u.scenario || u.useCase || u.name || u.title || (typeof u === 'string' ? u : ''), solution: u.solution || u.description || null, outcome: u.outcome || u.result || null })).filter(u => u.scenario), 5),
    },

    audience: {
      primary: extractText(audienceData.primaryAudience || cpAudience.primary || null),
      personas: takeArray(extractArray(audienceData.buyerPersonas).map(p => ({ name: extractText(p.name || p.title), role: p.role || null, painPoints: takeArray(extractArray(p.painPoints), 5), goals: takeArray(extractArray(p.goals), 5) })).filter(p => p.name), 5),
      painPoints: takeArray([...painPoints, ...cpPainPoints].filter(Boolean).map(p => typeof p === 'string' ? p : extractText(p) || '').filter(Boolean), 10),
      buyingStage: cpBuyingStage || null,
      decisionDrivers: takeArray(cpDecisionDrivers, 5),
      contentPreferences: takeArray(cpContentPreferences, 5),
    },

    campaign: {
      goal: cpGoal || campaignData.campaignGoals?.[0] || campaignData.goals?.[0] || campaignData.objective || null,
      businessGoal: cpBusinessGoal.goal || campaignData.businessGoal || null,
      objective: cpObjectiveText || null,
      primaryCTA: cpCta || null,
      channels: takeArray(cpChannels.length > 0 ? cpChannels : (channelData?.recommendedChannels || []).map(ch => ({ channel: ch.channel || ch.name, priority: ch.priority || 'medium', reason: ch.reason || null })), 5),
      timeline: cpTimeline,
      marketingFunnel: cpFunnel,
      kpis: takeArray(cpKpis, 5),
      creativeAngles: takeArray(campaignData.creativeAngles || campaignData.messagingPillars || [], 5),
      brandVoice: brandVoice || null,
    },

    competitors: {
      list: takeArray(extractArray(competitorData.competitors || seoIntel?.competitorSeoRecord?.competitors || []).map(c => ({ name: extractText(c.name || c.url || c), domain: c.domain || null, strengths: takeArray(extractArray(c.strengths), 5), weaknesses: takeArray(extractArray(c.weaknesses), 5) })).filter(c => c.name), 10),
      strengths: extractArray(competitorData.strengths || execCompetitorSnapshot.strengths || []),
      weaknesses: extractArray(competitorData.weaknesses || execCompetitorSnapshot.weaknesses || []),
      positioning: competitorIntel?.positioningEngine || null,
      snapshot: execCompetitorSnapshot,
    },

    seo: {
      score: seoIntel?.seoScore || null,
      visibility: seoIntel?.geoIntelligence?.aiVisibilityScore || execOverview.overallGeoScore || null,
      primaryKeywords: takeArray([...seoKeywords, ...kiPrimary].map(k => ({ keyword: extractText(k.keyword || k.phrase || k.name || k) || '', volume: k.volume || null, difficulty: k.difficulty || k.keywordDifficulty || null, intent: k.intent || null })).filter(k => k.keyword), 10),
      secondaryKeywords: takeArray(kiSecondary.map(k => ({ keyword: extractText(k.keyword || k.phrase || k.name || k) || '', volume: k.volume || null })).filter(k => k.keyword), 10),
      questionKeywords: takeArray(kiQuestion.map(k => ({ keyword: extractText(k.keyword || k.phrase || k.name || k) || '', volume: k.volume || null })).filter(k => k.keyword), 10),
      clusters: takeArray(kiClusters.map(c => ({ name: c.name || c.topic || '', keywords: takeArray(extractArray(c.keywords || c.items || []).map(k => extractText(k) || '').filter(Boolean), 10), volume: c.volume || null })).filter(c => c.name), 10),
      intent: kiIntent || null,
      contentGaps: takeArray(contentGaps.map(g => ({ topic: g.topic || g.opportunity || g.title || g, reason: g.reason || g.gap || g.description || null, priority: g.priority || null })), 10),
      competitorTopics: extractArray(seoIntel?.competitorSeoRecord?.topics || execCompetitorSnapshot.topCompetitors || []),
      priorityTopics: extractArray(execKeyOpportunities.map(o => ({ topic: o.title || o.recommendation || '', impact: o.impact || null, effort: o.effort || null, priority: o.priority || null }))),
      executiveRecommendations: extractArray(execActionPlan.immediateActions || execActionPlan.day30Plan || execActionPlan.day60Plan || execActionPlan.day90Plan || []).map(a => ({ action: a.action || a.recommendation || a, timeline: a.timeline || 'immediate' })),
    },

    executive: {
      story: execStory || null,
      overview: execOverview,
      actionPlan: execActionPlan,
      contentStrategy: execContentStrategy,
      keyOpportunities: takeArray(execKeyOpportunities, 5),
      recommendations: extractArray(execDashboard.executiveRecommendations || execDashboard.actionPlan || []),
    },

    growthWorkspace: campaignData.growthSummary || null,

    evidenceSnapshot: {
      id: evidenceSnapshot?.id || null,
      websiteTitle: extractText(website.title),
      websiteMetaDescription: extractText(website.metaDescription),
      heroText: extractText(website.heroText),
      ctaTexts: takeArray(extractArray(website.ctaTexts), 3),
    },

    technicalAudit: seoIntel?.technicalAudit || seoIntel?.technicalAuditDetail?.auditData || null,

    sourceRegistry: {
      productIntelligence: !!productIntel,
      competitorIntelligence: !!competitorIntel,
      campaignIntelligence: !!campaignIntel,
      seoIntelligence: !!seoIntel,
      campaignPlan: !!campaignPlan,
      evidenceSnapshot: !!evidenceSnapshot,
      executiveDashboard: !!execDashboard,
    },
  };

  setCached(userId, chatId, graph);
  return graph;
}

/**
 * Get or create a single immutable EvidenceGraph for the given chat.
 * Returns the cached graph if it exists and is still valid.
 * All modules (Growth, SEO, Campaign, Audience, Executive, Content Studio) consume this same instance.
 */
export async function getOrCreateEvidenceGraph(prisma, userId, chatId) {
  const cached = getCached(userId, chatId);
  if (cached) {
    console.info(`[EvidenceGraph] Returning cached graph for ${userId}:${chatId} (built at ${cached._builtAt})`);
    return cached;
  }
  console.info(`[EvidenceGraph] Building new graph for ${userId}:${chatId}`);
  return buildUnifiedEvidenceGraph(prisma, userId, chatId);
}

export default { buildUnifiedEvidenceGraph, getOrCreateEvidenceGraph, invalidateCache };
