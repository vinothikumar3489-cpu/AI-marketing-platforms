import { getLatestEvidenceSnapshot } from '../../modules/evidence/evidence.service.js';
import { buildSEOEvidenceData } from '../../modules/evidence/evidence.normalizer.js';
import { buildGrowthWorkspaceDataFromEvidence } from '../../modules/evidence/evidence.normalizer.js';

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

  const evidenceSnapshot = await getLatestEvidenceSnapshot({ prisma, userId, chatId });
  const evidence = evidenceSnapshot?.evidence || null;
  const seoEvidence = evidence ? buildSEOEvidenceData(evidence) : null;

  let growthWs = null;
  try {
    if (prisma.growthWorkspace) {
      growthWs = await prisma.growthWorkspace.findFirst({ where: { chatId, userId } });
    }
  } catch {
    growthWs = null;
  }

  const [productIntel, competitorIntel, campaignIntel, seoIntel] = await Promise.all([
    prisma.productIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
    prisma.competitorIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
    prisma.campaignIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
    prisma.seoIntelligence.findFirst({
      where: { chatId, userId },
      include: { scoreBreakdown: true, technicalSeoAudit: true, keywordIntelligence: true },
    }).catch(() => null),
  ]);

  const productAnalysis = productIntel?.productAnalysis || null;
  const audienceData = productIntel?.audienceIntelligence || null;
  const marketData = productIntel?.marketDiscovery || null;
  const competitorData = competitorIntel?.competitorAnalysis || null;
  const campaignData = campaignIntel?.campaignGenerator || null;
  const channelData = campaignIntel?.channelRecommendation || null;

  const chat = await prisma.chat.findUnique({ where: { id: chatId } });

  const company = {
    name: chat?.title || evidence?.website?.title || null,
    productName: chat?.productName || productAnalysis?.name || null,
    websiteUrl: chat?.websiteUrl || evidence?.website?.url || null,
    industry: productAnalysis?.industry || null,
  };

  const product = {
    name: company.productName,
    usp: productAnalysis?.usp || null,
    description: productAnalysis?.description || null,
    features: evidence?.website?.featuresText || productAnalysis?.features || [],
    benefits: productAnalysis?.benefits || [],
    targetAudience: audienceData?.primaryAudience || productAnalysis?.targetAudience || null,
    industry: company.industry,
  };

  const website = {
    title: evidence?.website?.title || null,
    metaDescription: evidence?.website?.metaDescription || null,
    heroText: evidence?.website?.heroText || null,
    ctaTexts: evidence?.website?.ctaTexts || [],
    featuresText: evidence?.website?.featuresText || [],
    pageTypes: evidence?.website?.pageTypes || {},
    technologyHints: evidence?.website?.technologyHints || [],
  };

  const audience = audienceData
    ? {
        primary: audienceData.primaryAudience || null,
        personas: audienceData.buyerPersonas || [],
        painPoints: audienceData.painPoints || [],
        goals: audienceData.goals || [],
        demographics: audienceData.demographics || null,
      }
    : null;

  const competitors = competitorData
    ? {
        list: competitorData.competitors || [],
        directCount: competitorData.directCount || (competitorData.competitors?.length || 0),
        strengths: competitorData.strengths || [],
        weaknesses: competitorData.weaknesses || [],
        keywordGaps: competitorData.keywordGaps || [],
      }
    : null;

  const seo = seoIntel
    ? {
        score: seoIntel.seoScore ?? null,
        issues: seoEvidence?.technicalIssues || [],
        contentOpportunities: seoEvidence?.contentOpportunities || [],
        pageSpeed: seoEvidence?.pageSpeed || null,
        sitemap: seoEvidence?.sitemap || null,
        schemas: seoEvidence?.schemas || null,
        robots: seoEvidence?.robots || null,
      }
    : seoEvidence
    ? {
        score: null,
        issues: seoEvidence.technicalIssues || [],
        contentOpportunities: seoEvidence.contentOpportunities || [],
        pageSpeed: seoEvidence.pageSpeed || null,
        sitemap: seoEvidence.sitemap || null,
        schemas: seoEvidence.schemas || null,
        robots: seoEvidence.robots || null,
      }
    : null;

  const channels = channelData?.recommendedChannels
    ? channelData.recommendedChannels.map(ch => ({
        channel: ch.channel || ch.name,
        priority: ch.priority || 'medium',
        reason: ch.reason || null,
        evidence: 'channel_recommendation',
      }))
    : [];

  const growth = growthWs
    ? {
        overallScore: growthWs.overallGrowthScore ?? null,
        channels: growthWs.channels || [],
        actionPlan: {
          day7: growthWs.day7Actions || [],
          day30: growthWs.day30Actions || [],
          day60: growthWs.day60Actions || [],
          day90: growthWs.day90Actions || [],
        },
      }
    : null;

  const sourcesCollected = [];
  if (evidence) sourcesCollected.push('EvidenceSnapshot');
  if (productIntel) sourcesCollected.push('ProductIntelligence');
  if (competitorIntel) sourcesCollected.push('CompetitorIntelligence');
  if (campaignIntel) sourcesCollected.push('CampaignIntelligence');
  if (seoIntel) sourcesCollected.push('SeoIntelligence');
  if (growthWs) sourcesCollected.push('GrowthWorkspace');

  const sourceSummary = {
    sourcesCollected,
    totalSources: 6,
    hasEvidenceSnapshot: !!evidence,
    hasProductIntel: !!productIntel,
    hasCompetitorIntel: !!competitorIntel,
    hasCampaignIntel: !!campaignIntel,
    hasSeoIntel: !!seoIntel,
    hasGrowthWs: !!growthWs,
  };

  return {
    company,
    product,
    website,
    audience,
    competitors,
    seo,
    channels,
    growth,
    sourceSummary,
    _raw: {
      productIntel,
      competitorIntel,
      campaignIntel,
      seoIntel,
      growthWs,
      evidence,
    },
  };
}
