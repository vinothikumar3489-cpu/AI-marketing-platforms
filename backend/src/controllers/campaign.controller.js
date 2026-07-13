import { prisma } from "../config/prisma.js";
import { buildEvidenceContext } from "../services/execution/evidence-context-builder.service.js";
import { generateCampaignIntelligence } from "../services/automation/campaign-intelligence.service.js";

/**
 * POST /api/campaign/:chatId/generate
 * Generate campaign intelligence from evidence context
 */
export const generateCampaignPlan = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  try {
    console.log("[Campaign] Generating intelligence for:", { chatId, userId });

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    const evidenceContext = await buildEvidenceContext(prisma, userId, chatId);

    if (evidenceContext.rejected) {
      return res.status(422).json({
        success: false,
        error: {
          code: evidenceContext.code || "PRODUCT_INTELLIGENCE_REQUIRED",
          message: evidenceContext.reason || "Complete Growth Analysis before generating this module.",
          retryable: false,
          missing: evidenceContext.rejected === 'no_product_intelligence' ? ['ProductIntelligence', 'CampaignIntelligence'] : ['EvidenceSnapshot']
        }
      });
    }

    const campaignData = await generateCampaignIntelligence({
      userId,
      chatId,
      evidenceContext,
    });

    if (campaignData._noData) {
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

    const plan = await prisma.campaignPlan.upsert({
      where: { chatId },
      update: {
        executiveSummary: campaignData.executiveSummary,
        businessGoal: campaignData.businessGoal,
        campaignObjective: campaignData.campaignObjective,
        audienceSelection: campaignData.audienceSelection,
        channelRecommendations: campaignData.channelRecommendations,
        timeline: campaignData.timeline,
        marketingFunnel: campaignData.marketingFunnel,
        kpiFramework: campaignData.kpiFramework,
        riskAssessment: campaignData.riskAssessment,
        opportunityAssessment: campaignData.opportunityAssessment,
        nextActions: campaignData.nextActions || campaignData.executiveSummary?.nextActions,
        status: "draft",
        provider: campaignData._metadata?.provider || "ai",
        fallbackUsed: campaignData._metadata?.fallbackUsed || false,
      },
      create: {
        userId,
        chatId,
        executiveSummary: campaignData.executiveSummary,
        businessGoal: campaignData.businessGoal,
        campaignObjective: campaignData.campaignObjective,
        audienceSelection: campaignData.audienceSelection,
        channelRecommendations: campaignData.channelRecommendations,
        timeline: campaignData.timeline,
        marketingFunnel: campaignData.marketingFunnel,
        kpiFramework: campaignData.kpiFramework,
        riskAssessment: campaignData.riskAssessment,
        opportunityAssessment: campaignData.opportunityAssessment,
        nextActions: campaignData.nextActions || campaignData.executiveSummary?.nextActions,
        status: "draft",
        provider: campaignData._metadata?.provider || "ai",
        fallbackUsed: campaignData._metadata?.fallbackUsed || false,
      },
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

    return res.json({
      success: true,
      campaignPlan: plan,
    });
  } catch (error) {
    console.error("[Campaign] Error generating intelligence:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to generate campaign intelligence",
    });
  }
};

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

    return res.json({ success: true, exists: true, campaignPlan: plan });
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
