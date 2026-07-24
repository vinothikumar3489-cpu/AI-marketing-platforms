import { getLatestEvidenceSnapshot } from '../../modules/evidence/evidence.service.js';
import { getSeoIntelligenceForChat } from "../loaders/seo-intelligence.loader.js";
import { getProductIntelligenceForChat } from "../loaders/product-intelligence.loader.js";
import { resolveProductIdentity } from '../resolvers/product-identity.resolver.js';

// Build a partial checks object, defaulting all known checks to false
function emptyChecks(partial = {}) {
  return {
    chatExists: false,
    chatOwnedByUser: false,
    productIntelligenceExists: false,
    audienceIntelligenceExists: false,
    competitorIntelligenceExists: false,
    campaignIntelligenceExists: false,
    evidenceSnapshotExists: false,
    seoIntelligenceExists: false,
    existingCampaignPlanExists: false,
    ...partial,
  };
}

// Source metadata wrapper: attaches provenance to every value
function sourced(value, source, field) {
  return {
    value,
    source,
    field: field || null,
    collectedAt: new Date().toISOString()
  };
}

function sourcedOpt(value, source, field) {
  if (value === null || value === undefined) return null;
  return sourced(value, source, field);
}

export async function buildEvidenceContext(prisma, userId, chatId) {
  if (!prisma) {
    throw new Error('Prisma client missing in buildEvidenceContext');
  }
  if (!userId) {
    throw new Error('userId missing in buildEvidenceContext');
  }
  if (!chatId) {
    throw new Error('chatId missing in buildEvidenceContext');
  }

  // --- Validate chat ownership ---
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat) {
    return { rejected: true, reason: 'Chat not found', code: 'CHAT_NOT_FOUND', checks: emptyChecks({ chatExists: false }) };
  }
  if (chat.userId !== userId) {
    return { rejected: true, reason: 'Context belongs to another chat', code: 'CHAT_OWNER_MISMATCH', checks: emptyChecks({ chatExists: true, chatOwnedByUser: false }) };
  }

  // --- Gather evidence (snapshot is optional, fall back to intelligence records) ---
  const evidenceSnapshot = await getLatestEvidenceSnapshot({ prisma, userId, chatId });
  const raw = evidenceSnapshot?.evidence || {};

  // --- Fetch intelligence records in parallel using canonical loaders ---
  const [productIntel, competitorIntel, campaignIntel, seoIntel] = await Promise.all([
    getProductIntelligenceForChat({ prisma, userId, chatId }),
    prisma.competitorIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
    prisma.campaignIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
    getSeoIntelligenceForChat({ prisma, userId, chatId }),
  ]);

  const checks = {
    chatExists: true,
    chatOwnedByUser: true,
    productIntelligenceExists: Boolean(productIntel),
    audienceIntelligenceExists: Boolean(productIntel?.audienceIntelligence || productIntel?.marketDiscovery),
    competitorIntelligenceExists: Boolean(competitorIntel),
    campaignIntelligenceExists: Boolean(campaignIntel),
    evidenceSnapshotExists: Boolean(evidenceSnapshot),
    seoIntelligenceExists: Boolean(seoIntel),
    existingCampaignPlanExists: false,
  };

  console.info("[Evidence Context] Intelligence records", {
    chatId,
    userId,
    productIntelExists: Boolean(productIntel),
    competitorIntelExists: Boolean(competitorIntel),
    campaignIntelExists: Boolean(campaignIntel),
    seoIntelExists: Boolean(seoIntel),
    evidenceSnapshotExists: Boolean(evidenceSnapshot),
    checks
  });

  // ProductIntelligence is the minimum requirement — evidence snapshot is optional
  if (!productIntel) {
    console.warn("[Evidence Context] ProductIntelligence missing", {
      chatId,
      userId,
      checks,
      missing: ['ProductIntelligence']
    });
    return { rejected: true, reason: 'Complete Growth Analysis before generating this module.', code: 'EVIDENCE_MISSING', missing: ['ProductIntelligence'], checks };
  }

  let growthWs = null;
  try {
    if (prisma.growthWorkspace) {
      growthWs = await prisma.growthWorkspace.findFirst({ where: { chatId, userId } });
    }
  } catch {
    growthWs = null;
  }

  // --- Build source registry ---
  const sourceRegistry = {};

  function registerSource(key, exists) {
    sourceRegistry[key] = { exists: !!exists, key };
    return exists;
  }

  registerSource('chat', true);
  registerSource('evidenceSnapshot', !!evidenceSnapshot);
  registerSource('productIntelligence', !!productIntel);
  registerSource('competitorIntelligence', !!competitorIntel);
  registerSource('campaignIntelligence', !!campaignIntel);
  registerSource('seoIntelligence', !!seoIntel);
  registerSource('growthWorkspace', !!growthWs);

  // --- Extract data with source metadata ---
  const websiteRaw = raw.website || {};
  const productAnalysis = productIntel?.productAnalysis || {};
  const audienceData = productIntel?.audienceIntelligence || {};
  const marketData = productIntel?.marketDiscovery || {};
  const competitorData = competitorIntel?.competitorAnalysis || {};
  const campaignData = campaignIntel?.campaignGenerator || {};
  const channelData = campaignIntel?.channelRecommendation || {};
  const seoInfo = seoIntel || {};

  // Resolve product identity from intelligence records before any validation
  // This uses inputJson paths, not chat.title, so it works when chat title is a generic label
  const productIdentity = resolveProductIdentity({
    chat,
    productIntelligence: productIntel,
    evidenceSnapshot,
    website: websiteRaw
  });

  console.info("[Evidence Context] Product identity resolved", {
    productName: productIdentity.productName,
    brandName: productIdentity.brandName,
    source: productIdentity.source,
    domain: productIdentity.domain,
    resolved: productIdentity.resolved
  });

  // Reject if product identity could not be resolved
  if (!productIdentity.resolved || !productIdentity.productName) {
    console.warn("[Evidence Context] Product identity unresolved", {
      chatId, userId,
      productName: productIdentity.productName,
      source: productIdentity.source
    });
    return {
      rejected: true,
      reason: 'The product identity could not be resolved from the current analysis.',
      code: 'PRODUCT_IDENTITY_UNRESOLVED',
      checks: emptyChecks({ ...checks, productIdentityResolved: false }),
      missing: ['PRODUCT_IDENTITY'],
    };
  }

  // Validate legacy SEO — if only generic SEO topics without product data, reject
  const seoKeywords = seoInfo?.keywordOpportunities || seoInfo?.keywordIntelligence?.primaryKeywords || [];
  const hasValidSeo = Array.isArray(seoKeywords) && seoKeywords.length > 0;
  if (!productIdentity.productName && !productAnalysis?.usp && !websiteRaw?.featuresText?.length && !audienceData?.primaryAudience && hasValidSeo) {
    return { rejected: true, reason: 'Only legacy SEO topics available — no product identity or evidence. Run Growth Workspace first.', code: 'LEGACY_SEO_ONLY' };
  }

  const ki = seoInfo?.keywordIntelligence || seoInfo?.keywordIntelligenceRecord || {};
  const csg = seoInfo?.competitorSeoRecord || {};
  const gap = seoInfo?.contentGapRecord || {};
  const tech = seoInfo?.technicalAuditDetail || {};
  const geo = seoInfo?.geoIntelligenceRecord || seoInfo?.geoIntelligence || {};
  const blog = seoInfo?.blogIntelligenceRecord || {};
  const execSeo = seoInfo?.executiveDashboard || {};

  const seoKeywords = ki.primaryKeywords || seoInfo?.keywordOpportunities || [];

  const context = {
    contextId: `ctx_${chatId}_${Date.now()}`,
    chatId: sourced(chatId, 'chat', 'id'),
    userId: sourced(userId, 'chat', 'userId'),
    evidenceSnapshotId: evidenceSnapshot?.id || null,

    // 1. Company
    company: {
      name: sourcedOpt(productIdentity.companyName || chat.title || raw.website?.title || null, productIdentity.companyName ? 'productIdentity' : 'chat', 'name'),
      websiteUrl: sourcedOpt(productIdentity.websiteUrl || chat.websiteUrl || raw.website?.url || null, productIdentity.websiteUrl ? 'productIdentity' : 'chat', 'websiteUrl'),
      domain: sourcedOpt(productIdentity.domain, 'productIdentity', 'domain'),
      industry: sourcedOpt(productAnalysis.industry || null, 'productIntelligence', 'industry'),
    },

    // 2. Product
    product: {
      name: sourcedOpt(productIdentity.productName, 'productIdentity', 'productName'),
      brandName: sourcedOpt(productIdentity.brandName, 'productIdentity', 'brandName'),
      description: sourcedOpt(productAnalysis.description || productAnalysis.productSummary || null, 'productIntelligence', 'description'),
      category: sourcedOpt(productAnalysis.category || null, 'productIntelligence', 'category'),
    },

    // 3. Features & Benefits & USP
    features: sourcedOpt(productAnalysis.features || raw.website?.featuresText || null, 'productIntelligence', 'features'),
    benefits: sourcedOpt(productAnalysis.benefits || null, 'productIntelligence', 'benefits'),
    usp: sourcedOpt(productAnalysis.usp || null, 'productIntelligence', 'usp'),
    pricing: sourcedOpt(productAnalysis.pricing || null, 'productIntelligence', 'pricing'),
    useCases: sourcedOpt(productAnalysis.useCases || null, 'productIntelligence', 'useCases'),

    // 4. Website
    website: {
      title: sourcedOpt(raw.website?.title || null, 'evidenceSnapshot', 'title'),
      metaDescription: sourcedOpt(raw.website?.metaDescription || null, 'evidenceSnapshot', 'metaDescription'),
      heroText: sourcedOpt(raw.website?.heroText || null, 'evidenceSnapshot', 'heroText'),
      ctaTexts: sourcedOpt(raw.website?.ctaTexts || null, 'evidenceSnapshot', 'ctaTexts'),
      technologyStack: sourcedOpt(raw.website?.technologyHints || productAnalysis.technologyStack || null, 'evidenceSnapshot', 'technologyStack'),
    },

    // 5. Audience
    audience: {
      primary: sourcedOpt(audienceData.primaryAudience || null, 'productIntelligence', 'primaryAudience'),
      personas: sourcedOpt(audienceData.buyerPersonas || null, 'productIntelligence', 'buyerPersonas'),
      painPoints: sourcedOpt(audienceData.painPoints || null, 'productIntelligence', 'painPoints'),
      customerSegments: sourcedOpt(productAnalysis.customerSegments || null, 'productIntelligence', 'customerSegments'),
    },

    // 6. Competitors (Semantic validated)
    competitors: {
      list: sourcedOpt(competitorData.competitors || csg.competitors || null, 'competitorIntelligence', 'competitors'),
      strengths: sourcedOpt(competitorData.strengths || null, 'competitorIntelligence', 'strengths'),
      weaknesses: sourcedOpt(competitorData.weaknesses || null, 'competitorIntelligence', 'weaknesses'),
      positioning: sourcedOpt(competitorIntel?.positioningEngine || null, 'competitorIntelligence', 'positioning'),
    },

    // 7. SEO
    seo: {
      score: sourcedOpt(seoInfo?.seoScore || null, 'seoIntelligence', 'score'),
      visibility: sourcedOpt(geo.aiVisibilityScore || null, 'seoIntelligence', 'visibility'),
    },

    // 8. Technical Audit
    technicalAudit: {
      criticalIssues: sourcedOpt(tech.criticalIssues || seoInfo?.technicalIssues || null, 'seoIntelligence', 'criticalIssues'),
      highIssues: sourcedOpt(tech.highIssues || null, 'seoIntelligence', 'highIssues'),
      recommendations: sourcedOpt(tech.recommendations || seoInfo?.actionPlan?.recommendations || null, 'seoIntelligence', 'recommendations'),
      performance: sourcedOpt(seoInfo?.technicalAudit?.performance || null, 'seoIntelligence', 'performance'),
    },

    // 9. Keywords & Clusters
    keywords: {
      primary: sourcedOpt(ki.primaryKeywords || seoKeywords || null, 'seoIntelligence', 'primaryKeywords'),
      secondary: sourcedOpt(ki.secondaryKeywords || null, 'seoIntelligence', 'secondaryKeywords'),
      longTail: sourcedOpt(ki.longTailKeywords || null, 'seoIntelligence', 'longTailKeywords'),
      question: sourcedOpt(ki.questionKeywords || null, 'seoIntelligence', 'questionKeywords'),
      geo: sourcedOpt(ki.geoKeywords || null, 'seoIntelligence', 'geoKeywords'),
    },
    clusters: sourcedOpt(ki.clusters || null, 'seoIntelligence', 'clusters'),

    // 10. Content Gaps
    contentGaps: {
      missingContent: sourcedOpt(gap.contentGaps || seoInfo?.contentGaps || null, 'seoIntelligence', 'contentGaps'),
      landingPages: sourcedOpt(gap.landingPageIdeas || null, 'seoIntelligence', 'landingPages'),
      faqOpportunities: sourcedOpt(gap.faqOpportunities || null, 'seoIntelligence', 'faqOpportunities'),
      blogIdeas: sourcedOpt(blog.blogIdeas || seoInfo?.blogIdeas || null, 'seoIntelligence', 'blogIdeas'),
    },

    // 11. Market Research
    marketResearch: {
      marketRisks: sourcedOpt(marketData.marketRisks || null, 'productIntelligence', 'marketRisks'),
      growthOpportunities: sourcedOpt(marketData.growthOpportunities || null, 'productIntelligence', 'growthOpportunities'),
    },

    // 12. Campaign
    campaign: {
      channels: channelData?.recommendedChannels?.length
        ? channelData.recommendedChannels.map((ch, i) => ({
            channel: ch.channel || ch.name,
            priority: ch.priority || 'medium',
            reason: ch.reason || null,
            evidence: 'channel_recommendation',
            source: 'campaignIntelligence',
            index: i,
          }))
        : [],
      executiveStory: sourcedOpt(campaignIntel?.executiveStory || null, 'campaignIntelligence', 'executiveStory'),
      actionPlan: sourcedOpt(campaignIntel?.actionPlan || null, 'campaignIntelligence', 'actionPlan'),
    },

    // 13. Brand Voice
    brandVoice: sourcedOpt(productAnalysis.brandVoice || campaignIntel?.campaignGenerator?.brandVoice || null, 'campaignIntelligence', 'brandVoice'),

    // 14. Confidence & Sources
    confidence: {
      product: sourcedOpt(productAnalysis.confidenceScore || 0, 'productIntelligence', 'confidenceScore'),
      seo: sourcedOpt(seoInfo?.scoreBreakdown?.overallScore || 0, 'seoIntelligence', 'score'),
    },
    sourceRegistry,
    sourceSummary: {
      sourcesCollected: Object.entries(sourceRegistry).filter(([, v]) => v.exists).map(([k]) => k),
      totalSources: Object.keys(sourceRegistry).length,
      hasEvidenceSnapshot: !!evidenceSnapshot,
      hasProductIntel: !!productIntel,
      hasCompetitorIntel: !!competitorIntel,
      hasCampaignIntel: !!campaignIntel,
      hasSeoIntel: !!seoIntel,
      hasGrowthWs: !!growthWs,
    },

    checks,
    readiness: {
      product: Boolean(productIntel),
      audience: Boolean(audienceData?.primaryAudience || audienceData?.buyerPersonas?.length),
      competitor: Boolean(competitorIntel),
      campaign: Boolean(campaignIntel),
      seo: Boolean(seoIntel),
      snapshot: Boolean(evidenceSnapshot),
    },
    missingEvidence: Object.entries({
      ProductIntelligence: productIntel,
      AudienceIntelligence: audienceData?.primaryAudience || audienceData?.buyerPersonas?.length,
      CompetitorIntelligence: competitorIntel,
      CampaignIntelligence: campaignIntel,
      SeoIntelligence: seoIntel,
      EvidenceSnapshot: evidenceSnapshot,
    }).filter(([, v]) => !v).map(([k]) => k),

    _raw: {
      productIntel,
      competitorIntel,
      campaignIntel,
      seoIntel,
      growthWs,
      evidence: raw,
    },
  };

  return context;
}

/**
 * Build readiness checklist from evidence context.
 */
export function buildReadinessChecklist(context) {
  const product = context?.product || {};
  const audience = context?.audience;
  const website = context?.website || {};
  const channels = context?.channels || [];
  const ctaTexts = website?.ctaTexts?.value || [];
  const hasChannelRationale = channels.length > 0 && channels.some(c => c.reason);

  const items = [
    { key: 'product_evidence', label: 'Product evidence available', met: !!(product.name?.value || product.usp?.value || product.features?.value?.length) },
    { key: 'audience_defined', label: 'Audience defined', met: !!(audience?.primary?.value || audience?.personas?.value?.length) },
    { key: 'valid_cta', label: 'Valid CTA available', met: ctaTexts.length > 0 },
    { key: 'channel_rationale', label: 'Channel rationale available', met: hasChannelRationale },
  ];

  // These require separate provider configuration check (approximated here)
  const providerEmail = process.env.EMAIL_PROVIDER || process.env.GMAIL_USER || process.env.SENDGRID_API_KEY ? true : false;
  const providerCreative = process.env.POLLINATIONS_API_KEY || process.env.FAL_API_KEY ? true : false;
  const providerVideo = process.env.SHOTSTACK_API_KEY || process.env.CREATOMATE_API_KEY ? true : false;
  const analyticsConnected = process.env.GA_API_KEY || process.env.MIXPANEL_API_KEY || process.env.POSTHOG_API_KEY ? true : false;
  const crmConfigured = process.env.HUBSPOT_API_KEY || process.env.SALESFORCE_API_KEY ? true : false;

  items.push(
    { key: 'email_provider', label: 'Email provider configured', met: providerEmail },
    { key: 'creative_provider', label: 'Creative provider configured', met: providerCreative },
    { key: 'video_provider', label: 'Video provider configured', met: providerVideo },
    { key: 'analytics_connected', label: 'Analytics connected', met: analyticsConnected },
    { key: 'crm_configured', label: 'CRM destination configured', met: crmConfigured },
  );

  const metCount = items.filter(i => i.met).length;
  let status;
  if (metCount === items.length) {
    status = 'Ready';
  } else if (metCount >= 4) {
    status = 'Partially ready';
  } else {
    status = 'Blocked';
  }

  const missing = items.filter(i => !i.met).map(i => i.label);

  return {
    status,
    metCount,
    totalItems: items.length,
    items,
    missing,
    providerEmail,
    providerCreative,
    providerVideo,
    analyticsConnected,
    crmConfigured,
  };
}

export default { buildEvidenceContext, buildReadinessChecklist };
