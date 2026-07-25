import { buildUnifiedEvidenceGraph } from "./unified-evidence-graph.service.js";

function sourced(value, source, field) {
  return { value, source, field: field || null, collectedAt: new Date().toISOString() };
}

function sourcedOpt(value, source, field) {
  if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) return null;
  return sourced(value, source, field);
}

export async function buildEvidenceContext(prisma, userId, chatId) {
  if (!prisma) throw new Error('Prisma client missing in buildEvidenceContext');
  if (!userId) throw new Error('userId missing in buildEvidenceContext');
  if (!chatId) throw new Error('chatId missing in buildEvidenceContext');

  const graph = await buildUnifiedEvidenceGraph(prisma, userId, chatId);
  if (graph.rejected) return graph;

  const s = graph.sourceRegistry;

  const context = {
    contextId: `ctx_${chatId}_${Date.now()}`,
    chatId: sourced(chatId, 'chat', 'id'),
    userId: sourced(userId, 'chat', 'userId'),
    evidenceSnapshotId: graph.evidenceSnapshot?.id || null,

    company: {
      name: sourcedOpt(graph.productIdentity.companyName || graph.chat.title, 'productIdentity', 'name'),
      websiteUrl: sourcedOpt(graph.productIdentity.websiteUrl, 'productIdentity', 'websiteUrl'),
      domain: sourcedOpt(graph.productIdentity.domain, 'productIdentity', 'domain'),
      industry: sourcedOpt(graph.productIdentity.industry, 'productIntelligence', 'industry'),
    },

    product: {
      name: sourcedOpt(graph.productIdentity.productName, 'productIdentity', 'productName'),
      brandName: sourcedOpt(graph.productIdentity.brandName, 'productIdentity', 'brandName'),
      description: sourcedOpt(graph.product.description, 'productIntelligence', 'description'),
      category: sourcedOpt(graph.product.category, 'productIntelligence', 'category'),
      summary: sourcedOpt(graph.product.summary, 'productIntelligence', 'summary'),
    },

    features: sourcedOpt(graph.product.features, 'productIntelligence', 'features'),
    benefits: sourcedOpt(graph.product.benefits, 'productIntelligence', 'benefits'),
    usp: sourcedOpt(graph.product.usp, 'productIntelligence', 'usp'),
    pricing: sourcedOpt(graph.product.pricing, 'productIntelligence', 'pricing'),
    useCases: sourcedOpt(graph.product.useCases, 'productIntelligence', 'useCases'),

    audience: {
      primary: sourcedOpt(graph.audience.primary, 'productIntelligence', 'primaryAudience'),
      personas: sourcedOpt(graph.audience.personas, 'productIntelligence', 'buyerPersonas'),
      painPoints: sourcedOpt(graph.audience.painPoints, 'productIntelligence', 'painPoints'),
      buyingStage: sourcedOpt(graph.audience.buyingStage, 'campaignPlan', 'buyingStage'),
      decisionDrivers: sourcedOpt(graph.audience.decisionDrivers, 'campaignPlan', 'decisionDrivers'),
      contentPreferences: sourcedOpt(graph.audience.contentPreferences, 'campaignPlan', 'contentPreferences'),
    },

    website: {
      title: sourcedOpt(graph.evidenceSnapshot.websiteTitle, 'evidenceSnapshot', 'title'),
      metaDescription: sourcedOpt(graph.evidenceSnapshot.websiteMetaDescription, 'evidenceSnapshot', 'metaDescription'),
      heroText: sourcedOpt(graph.evidenceSnapshot.heroText, 'evidenceSnapshot', 'heroText'),
      ctaTexts: sourcedOpt(graph.evidenceSnapshot.ctaTexts, 'evidenceSnapshot', 'ctaTexts'),
    },

    competitors: {
      list: sourcedOpt(graph.competitors.list, 'competitorIntelligence', 'competitors'),
      strengths: sourcedOpt(graph.competitors.strengths, 'competitorIntelligence', 'strengths'),
      weaknesses: sourcedOpt(graph.competitors.weaknesses, 'competitorIntelligence', 'weaknesses'),
      positioning: sourcedOpt(graph.competitors.positioning, 'competitorIntelligence', 'positioning'),
    },

    seo: {
      score: sourcedOpt(graph.seo.score, 'seoIntelligence', 'score'),
      visibility: sourcedOpt(graph.seo.visibility, 'seoIntelligence', 'visibility'),
      primary: sourcedOpt(graph.seo.primaryKeywords, 'seoIntelligence', 'primaryKeywords'),
      secondary: sourcedOpt(graph.seo.secondaryKeywords, 'seoIntelligence', 'secondaryKeywords'),
      question: sourcedOpt(graph.seo.questionKeywords, 'seoIntelligence', 'questionKeywords'),
      clusters: sourcedOpt(graph.seo.clusters, 'seoIntelligence', 'clusters'),
      intent: sourcedOpt(graph.seo.intent, 'seoIntelligence', 'intent'),
      contentGaps: sourcedOpt(graph.seo.contentGaps, 'seoIntelligence', 'contentGaps'),
      competitorTopics: sourcedOpt(graph.seo.competitorTopics, 'seoIntelligence', 'competitorTopics'),
      priorityTopics: sourcedOpt(graph.seo.priorityTopics, 'seoIntelligence', 'priorityTopics'),
      executiveRecommendations: sourcedOpt(graph.seo.executiveRecommendations, 'executiveDashboard', 'recommendations'),
    },

    keywords: {
      primary: sourcedOpt(graph.seo.primaryKeywords, 'seoIntelligence', 'primaryKeywords'),
      secondary: sourcedOpt(graph.seo.secondaryKeywords, 'seoIntelligence', 'secondaryKeywords'),
      question: sourcedOpt(graph.seo.questionKeywords, 'seoIntelligence', 'questionKeywords'),
    },

    clusters: sourcedOpt(graph.seo.clusters, 'seoIntelligence', 'clusters'),
    contentGaps: sourcedOpt(graph.seo.contentGaps, 'seoIntelligence', 'contentGaps'),

    campaign: {
      goal: sourcedOpt(graph.campaign.goal, 'campaignIntelligence', 'goal'),
      businessGoal: sourcedOpt(graph.campaign.businessGoal, 'campaignIntelligence', 'businessGoal'),
      objective: sourcedOpt(graph.campaign.objective, 'campaignIntelligence', 'objective'),
      primaryCTA: sourcedOpt(graph.campaign.primaryCTA, 'campaignPlan', 'cta'),
      channels: graph.campaign.channels || [],
      timeline: graph.campaign.timeline || null,
      marketingFunnel: graph.campaign.marketingFunnel || null,
      kpis: graph.campaign.kpis || [],
      creativeAngles: sourcedOpt(graph.campaign.creativeAngles, 'campaignIntelligence', 'creativeAngles'),
      brandVoice: sourcedOpt(graph.campaign.brandVoice, 'campaignIntelligence', 'brandVoice'),
      executiveStory: sourcedOpt(graph.executive.story, 'campaignIntelligence', 'executiveStory'),
      actionPlan: sourcedOpt(graph.executive.actionPlan, 'campaignIntelligence', 'actionPlan'),
    },

    executive: {
      story: sourcedOpt(graph.executive.story, 'campaignIntelligence', 'executiveStory'),
      overview: graph.executive.overview || null,
      actionPlan: graph.executive.actionPlan || null,
      contentStrategy: graph.executive.contentStrategy || null,
      keyOpportunities: graph.executive.keyOpportunities || [],
      recommendations: sourcedOpt(graph.executive.recommendations, 'executiveDashboard', 'recommendations'),
    },

    growthWorkspace: graph.growthWorkspace || null,
    brandVoice: sourcedOpt(graph.campaign.brandVoice, 'campaignIntelligence', 'brandVoice'),
    technicalAudit: graph.technicalAudit || null,

    sourceRegistry: s,
    sourceSummary: {
      sourcesCollected: Object.entries(s).filter(([, v]) => v).map(([k]) => k),
      totalSources: Object.keys(s).length,
      hasEvidenceSnapshot: !!s.evidenceSnapshot,
      hasProductIntel: !!s.productIntelligence,
      hasCompetitorIntel: !!s.competitorIntelligence,
      hasCampaignIntel: !!s.campaignIntelligence,
      hasSeoIntel: !!s.seoIntelligence,
      hasCampaignPlan: !!s.campaignPlan,
      hasExecutiveDashboard: !!s.executiveDashboard,
    },

    readiness: {
      product: !!s.productIntelligence,
      audience: graph.audience.personas?.length > 0 || !!graph.audience.primary,
      competitor: !!s.competitorIntelligence,
      campaign: !!s.campaignIntelligence || true,
      seo: !!s.seoIntelligence,
      snapshot: !!s.evidenceSnapshot,
      campaignPlan: !!s.campaignPlan,
      executiveDashboard: !!s.executiveDashboard,
    },
  };

  return context;
}

export function buildReadinessChecklist(context) {
  const items = [
    { key: 'product_evidence', label: 'Product evidence available', met: !!(context?.product?.name?.value || context?.usp?.value) },
    { key: 'audience_defined', label: 'Audience defined', met: !!(context?.audience?.primary?.value || context?.audience?.personas?.value?.length) },
    { key: 'campaign_goal', label: 'Campaign goal defined', met: !!context?.campaign?.goal?.value },
    { key: 'seo_keywords', label: 'SEO keywords available', met: !!context?.keywords?.primary?.value?.length },
  ];

  const metCount = items.filter(i => i.met).length;
  const status = metCount === items.length ? 'Ready' : metCount >= 2 ? 'Partially ready' : 'Blocked';

  return { status, metCount, totalItems: items.length, items, missing: items.filter(i => !i.met).map(i => i.label) };
}

export default { buildEvidenceContext, buildReadinessChecklist };
