import { getLatestEvidenceSnapshot } from '../../modules/evidence/evidence.service.js';

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
    return { rejected: true, reason: 'Chat not found', code: 'CHAT_NOT_FOUND' };
  }
  if (chat.userId !== userId) {
    return { rejected: true, reason: 'Context belongs to another chat', code: 'CHAT_OWNER_MISMATCH' };
  }

  const hasProductName = !!(chat.productName || chat.title);

  if (!hasProductName) {
    return { rejected: true, reason: 'Product identity is missing. Set a product name first.', code: 'PRODUCT_IDENTITY_MISSING' };
  }

  // --- Gather evidence ---
  const evidenceSnapshot = await getLatestEvidenceSnapshot({ prisma, userId, chatId });

  if (!evidenceSnapshot) {
    return { rejected: true, reason: 'Current chat evidence is missing. Run an analysis first.', code: 'EVIDENCE_MISSING' };
  }

  const raw = evidenceSnapshot.evidence || {};

  // --- Fetch intelligence records in parallel ---
  const [productIntel, competitorIntel, campaignIntel, seoIntel] = await Promise.all([
    prisma.productIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
    prisma.competitorIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
    prisma.campaignIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
    prisma.seoIntelligence.findFirst({
      where: { chatId, userId },
      include: { scoreBreakdown: true, technicalSeoAudit: true, keywordIntelligence: true },
    }).catch(() => null),
  ]);

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

  // Product identity
  const productName = chat.productName || productAnalysis.name || null;

  // Validate legacy SEO — if only generic SEO topics without product data, reject
  const seoKeywords = seoInfo?.keywordOpportunities || seoInfo?.keywordIntelligence?.primaryKeywords || [];
  const hasValidSeo = Array.isArray(seoKeywords) && seoKeywords.length > 0;
  if (!productName && !productAnalysis?.usp && !websiteRaw?.featuresText?.length && !audienceData?.primaryAudience && hasValidSeo) {
    return { rejected: true, reason: 'Only legacy SEO topics available — no product identity or evidence. Run Growth Workspace first.', code: 'LEGACY_SEO_ONLY' };
  }

  const context = {
    contextId: `ctx_${chatId}_${Date.now()}`,
    chatId: sourced(chatId, 'chat', 'id'),
    userId: sourced(userId, 'chat', 'userId'),

    company: {
      name: sourcedOpt(chat.title || raw.website?.title || null, chat.title ? 'chat' : 'evidenceSnapshot', 'title'),
      productName: sourcedOpt(productName, productName === chat.productName ? 'chat' : 'productIntelligence', 'productName'),
      websiteUrl: sourcedOpt(chat.websiteUrl || raw.website?.url || null, chat.websiteUrl ? 'chat' : 'evidenceSnapshot', 'websiteUrl'),
      industry: sourcedOpt(productAnalysis.industry || null, 'productIntelligence', 'industry'),
    },

    product: {
      name: sourcedOpt(productName, productName === chat.productName ? 'chat' : 'productIntelligence', 'productName'),
      usp: sourcedOpt(productAnalysis.usp || null, 'productIntelligence', 'usp'),
      description: sourcedOpt(productAnalysis.description || null, 'productIntelligence', 'description'),
      features: sourcedOpt(
        (raw.website?.featuresText || productAnalysis.features || []).length > 0
          ? (raw.website?.featuresText || productAnalysis.features || [])
          : null,
        raw.website?.featuresText?.length ? 'evidenceSnapshot' : 'productIntelligence',
        'features'
      ),
      benefits: sourcedOpt(productAnalysis.benefits?.length ? productAnalysis.benefits : null, 'productIntelligence', 'benefits'),
      targetAudience: sourcedOpt(audienceData.primaryAudience || productAnalysis.targetAudience || null, audienceData.primaryAudience ? 'productIntelligence' : 'productIntelligence', 'targetAudience'),
      industry: sourcedOpt(productAnalysis.industry || null, 'productIntelligence', 'industry'),
    },

    website: {
      title: sourcedOpt(raw.website?.title || null, 'evidenceSnapshot', 'title'),
      metaDescription: sourcedOpt(raw.website?.metaDescription || null, 'evidenceSnapshot', 'metaDescription'),
      heroText: sourcedOpt(raw.website?.heroText || null, 'evidenceSnapshot', 'heroText'),
      ctaTexts: sourcedOpt(raw.website?.ctaTexts?.length ? raw.website.ctaTexts : null, 'evidenceSnapshot', 'ctaTexts'),
      featuresText: sourcedOpt(raw.website?.featuresText?.length ? raw.website.featuresText : null, 'evidenceSnapshot', 'featuresText'),
      pageTypes: raw.website?.pageTypes || null,
      technologyHints: sourcedOpt(raw.website?.technologyHints?.length ? raw.website.technologyHints : null, 'evidenceSnapshot', 'technologyHints'),
    },

    audience: audienceData?.primaryAudience || audienceData?.buyerPersonas?.length
      ? {
          primary: sourcedOpt(audienceData.primaryAudience || null, 'productIntelligence', 'primaryAudience'),
          personas: sourcedOpt(audienceData.buyerPersonas?.length ? audienceData.buyerPersonas : null, 'productIntelligence', 'buyerPersonas'),
          painPoints: sourcedOpt(audienceData.painPoints?.length ? audienceData.painPoints : null, 'productIntelligence', 'painPoints'),
          goals: sourcedOpt(audienceData.goals?.length ? audienceData.goals : null, 'productIntelligence', 'goals'),
        }
      : null,

    competitors: competitorData?.competitors?.length
      ? {
          list: sourcedOpt(competitorData.competitors, 'competitorIntelligence', 'competitors'),
          strengths: sourcedOpt(competitorData.strengths?.length ? competitorData.strengths : null, 'competitorIntelligence', 'strengths'),
          weaknesses: sourcedOpt(competitorData.weaknesses?.length ? competitorData.weaknesses : null, 'competitorIntelligence', 'weaknesses'),
        }
      : null,

    seo: seoInfo || raw.website?.metaDescription
      ? {
          issues: sourcedOpt(seoInfo.technicalIssues?.length ? seoInfo.technicalIssues : null, 'seoIntelligence', 'technicalIssues'),
          contentOpportunities: sourcedOpt(seoInfo.contentOpportunities?.length ? seoInfo.contentOpportunities : null, 'seoIntelligence', 'contentOpportunities'),
          keywords: sourcedOpt(seoKeywords?.length ? seoKeywords.slice(0, 20) : null, 'seoIntelligence', 'keywords'),
          contentGaps: sourcedOpt(seoInfo.contentGaps?.length ? seoInfo.contentGaps : null, 'seoIntelligence', 'contentGaps'),
          blogIdeas: sourcedOpt(seoInfo.blogIdeas?.length ? seoInfo.blogIdeas : null, 'seoIntelligence', 'blogIdeas'),
        }
      : null,

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

    growth: growthWs
      ? {
          overallScore: sourcedOpt(growthWs.overallGrowthScore ?? null, 'growthWorkspace', 'overallGrowthScore'),
          actionPlan: growthWs.day7Actions?.length || growthWs.day30Actions?.length
            ? {
                day7: growthWs.day7Actions || [],
                day30: growthWs.day30Actions || [],
                day60: growthWs.day60Actions || [],
                day90: growthWs.day90Actions || [],
              }
            : null,
        }
      : null,

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
