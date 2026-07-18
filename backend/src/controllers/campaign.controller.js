import { prisma } from "../config/prisma.js";
import { buildEvidenceContext } from "../services/execution/evidence-context-builder.service.js";
import { generateCampaignIntelligence } from "../services/automation/campaign-intelligence.service.js";
import { getSeoIntelligenceForChat } from "../services/loaders/seo-intelligence.loader.js";
import { getProductIntelligenceForChat } from "../services/loaders/product-intelligence.loader.js";
import { mapCampaignPlanToPersistence } from "../services/execution/campaign-persistence.mapper.js";

const inProgressCampaign = new Set();

// Canonical evidence loader for Campaign generation
async function loadCampaignEvidence({ userId, chatId }) {
  const [chat, product, competitor, campaign, seo, evidenceSnapshot] = await Promise.all([
    prisma.chat.findFirst({ where: { id: chatId, userId } }),
    getProductIntelligenceForChat({ prisma, userId, chatId }),
    prisma.competitorIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
    prisma.campaignIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
    getSeoIntelligenceForChat({ prisma, userId, chatId }),
    prisma.evidenceSnapshot.findFirst({ where: { chatId, userId } }).catch(() => null),
  ]);

  // Extract audience from product intelligence
  const audience = product?.audienceIntelligence || product?.marketDiscovery || null;

  return {
    chat,
    product,
    audience,
    competitor,
    campaign,
    seo,
    evidenceSnapshot,
    readiness: {
      product: Boolean(product),
      audience: Boolean(audience),
      competitor: Boolean(competitor),
      campaign: Boolean(campaign),
      seo: Boolean(seo),
      snapshot: Boolean(evidenceSnapshot)
    }
  };
}

/**
 * POST /api/campaign/:chatId/generate
 * Generate campaign intelligence from evidence context
 */
export const generateCampaignPlan = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  const dedupKey = `campaign:${userId}:${chatId}`;
  if (inProgressCampaign.has(dedupKey)) {
    return res.status(409).json({ success: false, error: 'Campaign generation already in progress' });
  }
  inProgressCampaign.add(dedupKey);

  try {
    console.log("[Campaign] Generating intelligence for:", { chatId, userId });

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      console.warn("[Campaign] Chat not found", { chatId, userId });
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    console.info("[Campaign] Chat details", {
      chatId,
      userId,
      productName: chat.productName,
      title: chat.title,
      hasProductName: !!(chat.productName || chat.title),
      hasProductIntelligence: !!(chat.productIntelligence)
    });

    const evidence = await loadCampaignEvidence({ userId, chatId });
    console.info("[Campaign] Evidence loaded", {
      chatId,
      userId,
      readiness: evidence.readiness,
      hasChat: Boolean(evidence.chat),
      hasProduct: Boolean(evidence.product),
      hasAudience: Boolean(evidence.audience),
      hasCompetitor: Boolean(evidence.competitor),
      hasCampaign: Boolean(evidence.campaign),
      hasSeo: Boolean(evidence.seo),
      hasSnapshot: Boolean(evidence.evidenceSnapshot)
    });

    const existingPlan = await prisma.campaignPlan.findFirst({ where: { userId, chatId } });

    const evidenceContext = await buildEvidenceContext(prisma, userId, chatId);

    if (evidenceContext.rejected) {
      const code = evidenceContext.code || "PRODUCT_INTELLIGENCE_REQUIRED";
      const missing = evidenceContext.missing || [evidenceContext.code === 'EVIDENCE_MISSING' ? 'ProductIntelligence' : 'EvidenceSnapshot'];
      const checks = { ...(evidenceContext.checks || {}), existingCampaignPlanExists: Boolean(existingPlan) };

      console.warn("[Campaign Prerequisite Failure]", {
        chatId,
        userId,
        code,
        missing,
        checks
      });

      return res.status(422).json({
        success: false,
        error: {
          code,
          message: evidenceContext.reason || "Complete Growth Analysis before generating this module.",
          retryable: false,
          missing
        }
      });
    }

    // Only ProductIntelligence is required - other evidence enhances but doesn't block
    if (!evidence.product) {
      console.warn("[Campaign] ProductIntelligence missing", {
        chatId,
        userId,
        checks: evidence.readiness
      });
      return res.status(422).json({
        success: false,
        error: {
          code: "PRODUCT_INTELLIGENCE_REQUIRED",
          message: "Complete Growth Analysis before generating Campaign Intelligence.",
          retryable: false,
          missing: ["ProductIntelligence"]
        }
      });
    }

    const campaignData = await generateCampaignIntelligence({
      userId,
      chatId,
      evidenceContext,
    });

    if (campaignData._noData) {
      console.warn("[Campaign Prerequisite Failure]", {
        chatId,
        userId,
        code: "GENERATION_FAILED",
        missing: ['CampaignIntelligence'],
        checks: evidenceContext.checks || {}
      });
      return res.status(422).json({
        success: false,
        error: {
          code: "GENERATION_FAILED",
          message: campaignData.reason || "Failed to generate campaign intelligence",
          retryable: true,
          missing: ['CampaignIntelligence']
        }
      });
    }

    const { create, update } = mapCampaignPlanToPersistence(campaignData, { userId, chatId, existingPlan });

    const plan = await prisma.campaignPlan.upsert({
      where: { chatId },
      update,
      create,
    });

    await prisma.automationLog.create({
      data: {
        userId,
        chatId,
        action: "campaign_intelligence_generated",
        message: `Campaign intelligence generated via ${campaignData._metadata?.provider || "ai"}`,
        metadata: {
          hasExecutiveSummary: !!campaignData.executiveSummary,
          hasBusinessGoal: !!campaignData.businessGoal,
          hasObjectives: !!campaignData.campaignObjective,
          hasAudience: !!campaignData.audienceSelection,
          hasChannels: !!(campaignData.channelRecommendations?.length > 0),
          hasTimeline: !!campaignData.timeline,
          hasFunnel: !!campaignData.marketingFunnel,
          hasKPIs: !!(campaignData.kpiFramework?.length > 0),
          hasRisks: !!(campaignData.riskAssessment?.length > 0),
          hasOpportunities: !!(campaignData.opportunityAssessment?.length > 0),
          fallbackUsed: campaignData._metadata?.fallbackUsed,
        },
      },
    });

    console.log("[Campaign] Intelligence generated successfully");

    const savedPlan = await prisma.campaignPlan.findFirst({
      where: { userId, chatId },
    });

    console.log("[Campaign] Persistence check", {
      campaignPlanSaved: Boolean(savedPlan),
      campaignPlanId: savedPlan?.id,
    });

    if (!savedPlan) {
      console.error("[Campaign] Failed to persist plan after upsert");
      return res.status(500).json({
        success: false,
        error: "Campaign plan could not be persisted. Please retry.",
      });
    }
    const campaignGenerator = extractCampaignGenerator(savedPlan);
    const metadata = typeof savedPlan.inputJson === 'object' ? (savedPlan.inputJson?._metadata || {}) : {};
    const generationMode = metadata.generationMode || (savedPlan.fallbackUsed ? 'FALLBACK' : 'AI');

    return res.status(201).json({
      success: true,
      campaignPlan: savedPlan,
      campaignGenerator,
      generationMode,
      fallbackUsed: savedPlan.fallbackUsed,
      provider: savedPlan.provider,
      warnings: metadata.warnings || [],
      fallbackReason: metadata.fallbackReason || null,
    });
  } catch (error) {
    console.error("[Campaign] Error generating intelligence:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to generate campaign intelligence",
    });
  } finally {
    inProgressCampaign.delete(dedupKey);
  }
};

function extractCampaignGenerator(plan) {
  if (!plan) return null;
  const execSummary = plan.executiveSummary || {};
  const campaignObjective = plan.campaignObjective || {};
  const timeline = plan.timeline || {};
  const channelRecs = plan.channelRecommendations || [];
  const kpis = plan.kpiFramework || [];

  const sevenDayContentCalendar = [];
  if (timeline.week1 && Array.isArray(timeline.week1)) {
    timeline.week1.slice(0, 7).forEach((task, i) => {
      sevenDayContentCalendar.push({ day: `Day ${i + 1}`, content: typeof task === 'string' ? task : (task.task || task.title || '') });
    });
  } else if (Array.isArray(timeline)) {
    timeline.slice(0, 7).forEach((item, i) => {
      sevenDayContentCalendar.push({ day: `Day ${i + 1}`, content: typeof item === 'string' ? item : (item.task || item.title || '') });
    });
  }

  return {
    campaignStrategy: execSummary.theme || execSummary.campaignName || plan.campaignName || '',
    adCopies: (campaignObjective.adCopies || []).concat(
      channelRecs.filter(r => r.channel === 'Google Ads' || r.channel === 'Paid Search').map(r => r.recommendedContent || r.recommendedCTA || '')
    ),
    socialMediaPosts: channelRecs.filter(r => ['LinkedIn', 'Instagram', 'Facebook', 'Twitter', 'TikTok'].includes(r.channel)).map(r => r.recommendedContent || '').filter(Boolean),
    emailCampaign: channelRecs.filter(r => r.channel === 'Email').map(r => r.recommendedContent || '').filter(Boolean),
    hashtags: campaignObjective.hashtags || [],
    landingPageHeadline: execSummary.headline || campaignObjective.primary || '',
    ctaSuggestions: (campaignObjective.ctas || []).concat(channelRecs.map(r => r.recommendedCTA || '').filter(Boolean)),
    sevenDayContentCalendar,
    finalRecommendation: execSummary.goal || campaignObjective.successDefinition || execSummary.campaignName || '',
  };
}

/**
 * GET /api/campaign/:chatId/plan
 * Get existing campaign plan
 */
export const getCampaignPlan = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  try {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    const plan = await prisma.campaignPlan.findUnique({
      where: { chatId },
    });

    if (!plan) {
      return res.json({ success: true, exists: false, campaignPlan: null });
    }

    const campaignGenerator = extractCampaignGenerator(plan);

    return res.json({ success: true, exists: true, campaignPlan: plan, campaignGenerator });
  } catch (error) {
    console.error("[Campaign] Error fetching plan:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch campaign plan",
    });
  }
};

/**
 * GET /api/campaign/:chatId/status
 * Get campaign generation status
 */
export const getCampaignStatus = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  try {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    const plan = await prisma.campaignPlan.findUnique({
      where: { chatId },
      select: { status: true, fallbackUsed: true, provider: true, updatedAt: true },
    });

    return res.json({
      success: true,
      status: plan?.status || "not_started",
      fallbackUsed: plan?.fallbackUsed || false,
      provider: plan?.provider || null,
      updatedAt: plan?.updatedAt || null,
    });
  } catch (error) {
    console.error("[Campaign] Error fetching status:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch campaign status",
    });
  }
};
