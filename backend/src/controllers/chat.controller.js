import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { resolveCanonicalProductIdentity } from "../services/canonical/product-identity.resolver.js";
import { buildCanonicalGrowthPayload } from "../services/canonical/growth-payload.builder.js";
import { buildCanonicalSeoPayload } from "../services/canonical/seo-payload.builder.js";

export async function getChatIntelligenceReadiness({ userId, chatId }) {
  const [productIntel, competitorIntel, campaignIntel, seoIntel, automationPlan] = await Promise.all([
    prisma.productIntelligence.findUnique({ where: { chatId } }),
    prisma.competitorIntelligence.findUnique({ where: { chatId } }),
    prisma.campaignIntelligence.findUnique({ where: { chatId } }),
    prisma.seoIntelligence.findUnique({ where: { chatId } }).catch(() => null),
    prisma.automationPlan.findUnique({ where: { chatId } }).catch(() => null),
  ]);

  return {
    hasProductIntelligence: !!productIntel,
    hasAudienceIntelligence: !!(productIntel?.audienceIntelligence && Object.keys(productIntel.audienceIntelligence).length > 0),
    hasCompetitorIntelligence: !!competitorIntel,
    hasCampaignIntelligence: !!campaignIntel,
    hasSeoIntelligence: !!seoIntel,
    hasAutomationPlan: !!automationPlan,
    contentGenerationReady: !!productIntel,
    campaignGenerationReady: !!productIntel && !!(productIntel?.audienceIntelligence || competitorIntel),
    automationGenerationReady: !!productIntel && !!campaignIntel,
  };
}

const chatSchema = z.object({
  title: z.string().min(1),
  productName: z.string().optional(),
});

export const createChat = async (req, res) => {
  try {
    const result = chatSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.errors[0].message });
    }

    const { title, productName } = result.data;
    const chat = await prisma.chat.create({
      data: {
        title,
        productName: productName || title,
        userId: req.user.id,
      },
    });

    return res.status(201).json(chat);
  } catch (error) {
    console.error(`[Controller] createChat error:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const listChats = async (req, res) => {
  try {
    const chats = await prisma.chat.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: { take: 1, orderBy: { createdAt: "desc" } },
        productIntelligence: { select: { inputJson: true, status: true } },
        seoIntelligence: { select: { websiteUrl: true, seoScore: true, updatedAt: true, scoreBreakdown: { select: { overallScore: true } } } },
      },
    });

    const enriched = chats.map(chat => {
      const input = chat.productIntelligence?.inputJson || {};
      const growthScore = chat.messages?.[0]?.analysisData?.summary?.overallGrowthScore || null;
      const seoScore = chat.seoIntelligence?.scoreBreakdown?.overallScore || chat.seoIntelligence?.seoScore || null;
      return {
        ...chat,
        companyName: input.companyName || null,
        websiteUrl: input.websiteUrl || chat.seoIntelligence?.websiteUrl || null,
        growthScore,
        seoScore,
        status: chat.productIntelligence?.status || chat.seoIntelligence ? 'analyzed' : 'draft',
      };
    });

    return res.json(enriched);
  } catch (error) {
    console.error(`[Controller] listChats error:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const getChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId: req.user.id },
      include: { messages: { orderBy: { createdAt: "asc" } }, analysis: true },
    });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }
    return res.json(chat);
  } catch (error) {
    console.error(`[Controller] getChat error:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const getFullChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    
    // Verify chat ownership first
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    const productAnalysisRecord = await prisma.productAnalysis.findUnique({ where: { chatId } });
    const productIntelligence = await prisma.productIntelligence.findUnique({ where: { chatId } });
    const competitorIntelligence = await prisma.competitorIntelligence.findUnique({ where: { chatId } });
    const seoIntelligence = await prisma.seoIntelligence.findUnique({ where: { chatId } });
    const campaignIntelligence = await prisma.campaignIntelligence.findUnique({ where: { chatId } });
    const assistantMessages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
    });

    return res.json({
      chat,
      productAnalysis: productAnalysisRecord?.outputJson || null,
      marketDiscovery: productIntelligence?.marketDiscovery || null,
      competitorAnalysis: competitorIntelligence?.competitorAnalysis || null,
      seoAnalysis: seoIntelligence?.seoAudit || null,
      campaignGenerator: campaignIntelligence?.campaignGenerator || null,
      audienceIntelligence: productIntelligence?.audienceIntelligence || null,
      assistantMessages
    });
  } catch (error) {
    console.error(`[Controller] getFullChat error:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

/**
 * GET /api/chats/:chatId/full-results
 * Returns all saved analysis results for a chat/project
 */
export const getFullResults = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[FullResults Request] chatId:', chatId, 'userId:', userId);
    }

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    const productIntelligence = await prisma.productIntelligence.findUnique({ where: { chatId } });
    const competitorIntelligence = await prisma.competitorIntelligence.findUnique({ where: { chatId } });
    const campaignIntelligence = await prisma.campaignIntelligence.findUnique({ where: { chatId } });

    let seoIntelligence = await prisma.seoIntelligence.findUnique({
      where: { chatId },
      include: {
        technicalAuditDetail: true, scoreBreakdown: true, keywordIntelligence: true,
        geoIntelligence: true, competitorSeoRecord: true, contentGapRecord: true,
        blogIntelligenceRecord: true, executiveDashboard: true,
      },
    });

    if (!seoIntelligence) {
      seoIntelligence = await prisma.seoIntelligence.findFirst({
        where: { chatId },
        include: {
          technicalAuditDetail: true, scoreBreakdown: true, keywordIntelligence: true,
          geoIntelligence: true, competitorSeoRecord: true, contentGapRecord: true,
          blogIntelligenceRecord: true, executiveDashboard: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const agentRuns = await prisma.agentRun.findMany({ where: { chatId }, orderBy: { createdAt: 'desc' } });

    let automationPlan = null;
    try {
      automationPlan = await prisma.automationPlan.findUnique({
        where: { chatId },
        include: { assets: { orderBy: { createdAt: 'asc' } } },
      });
    } catch (e) {
      console.warn('[FullResults] automationPlan query failed:', e.message);
    }

    const productIdentity = resolveCanonicalProductIdentity({
      chat,
      productIntelligence,
      websiteEvidence: productIntelligence?.productAnalysis?.features
        ? { title: chat?.productName || productIntelligence?.productName }
        : null,
    });

    const audienceIntelligenceData = productIntelligence?.audienceIntelligence || null;

    const canonicalGrowth = productIntelligence || competitorIntelligence || campaignIntelligence
      ? buildCanonicalGrowthPayload({
          chat,
          productIntelligence,
          audienceIntelligence: audienceIntelligenceData,
          competitorIntelligence,
          campaignIntelligence,
        })
      : null;

    if (canonicalGrowth) {
      canonicalGrowth.productIdentity = productIdentity;
      canonicalGrowth.company.name = productIdentity.companyName;
      canonicalGrowth.company.domain = productIdentity.domain;
      canonicalGrowth.company.industry = productIdentity.industry;
      canonicalGrowth.company.category = productIdentity.category;
      canonicalGrowth.product.name = productIdentity.productName;
    }

    const canonicalSeo = seoIntelligence
      ? buildCanonicalSeoPayload({
          chat,
          productIdentity,
          seoIntelligence,
          seoScoreBreakdown: seoIntelligence.scoreBreakdown || null,
          technicalAuditDetail: seoIntelligence.technicalAuditDetail || null,
          keywordIntelligence: seoIntelligence.keywordIntelligence || seoIntelligence.keywordOpportunities || null,
          contentGapRecord: seoIntelligence.contentGapRecord || null,
          competitorSeoAnalysis: seoIntelligence.competitorSeoRecord || null,
          blogIntelligence: seoIntelligence.blogIntelligenceRecord || seoIntelligence.blogIntelligenceItems || null,
          validatedGrowthCompetitors: canonicalGrowth?.competitors || [],
        })
      : null;

    const hasGrowthWorkspace = !!(productIntelligence || competitorIntelligence || campaignIntelligence);
    const hasSeoIntelligence = !!canonicalSeo;

    const keywordCount = canonicalSeo?.keywords?.length || 0;
    const competitorCount = canonicalSeo?.competitors?.length || 0;
    const contentGapCount = canonicalSeo?.contentGaps?.length || 0;
    const blogCount = canonicalSeo?.blogOpportunities?.length || 0;
    const technicalHasAuditData = canonicalSeo?.technicalAudit?.available || false;

    console.log('[FullResults Counts]', {
      chatId, keywordCount, competitorCount, contentGapCount, blogCount, technicalHasAuditData,
    });

    const growthStatus = hasGrowthWorkspace ? (canonicalGrowth ? 'COMPLETED' : 'INCOMPLETE') : 'NOT_RUN';
    const seoStatus = hasSeoIntelligence ? 'COMPLETED' : (seoIntelligence ? 'INCOMPLETE' : 'NOT_RUN');

    const result = {
      success: true,
      data: {
        chatId,
        growthStatus,
        seoStatus,
        growthWorkspace: canonicalGrowth,
        seoIntelligence: canonicalSeo,
        persistence: {
          productIntelligence: !!productIntelligence,
          competitorIntelligence: !!competitorIntelligence,
          campaignIntelligence: !!campaignIntelligence,
          seoIntelligence: !!seoIntelligence,
        },
        readiness: {
          hasGrowthWorkspace,
          hasSeoIntelligence,
          hasProductIntelligence: !!productIntelligence,
          hasCompetitorIntelligence: !!competitorIntelligence,
          hasCampaignIntelligence: !!campaignIntelligence,
          hasSeoIntelligence,
        },
        updatedAt: new Date().toISOString(),
      },
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log('[FullResults] growthWorkspace keys:', Object.keys(canonicalGrowth || {}));
      console.log('[FullResults] seoIntelligence keys:', Object.keys(canonicalSeo || {}));
      console.log('[FullResults] keywordCount:', keywordCount, 'competitorCount:', competitorCount, 'contentGapCount:', contentGapCount);
      console.log('[FullResults] technicalAudit available:', technicalHasAuditData);
    }

    return res.json(result);
  } catch (error) {
    console.error('[Controller] getFullResults error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'FULL_RESULTS_ERROR',
        message: error.message || 'Failed to load full results',
        recoverable: true,
        missingRequirements: [],
      },
    });
  }
};

export const updateChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const result = chatSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.errors[0].message });
    }

    const { title, productName } = result.data;
    const chat = await prisma.chat.updateMany({
      where: { id: chatId, userId: req.user.id },
      data: { title, productName: productName || title },
    });

    if (chat.count === 0) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    const updatedChat = await prisma.chat.findUnique({ where: { id: chatId } });
    return res.json(updatedChat);
  } catch (error) {
    console.error(`[Controller] updateChat error:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const deleteChat = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  console.log('🗑️ [Chat] Deleting chat and all related data:', { chatId, userId });

  // Verify chat ownership
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId },
  });

  if (!chat) {
    return res.status(404).json({ 
      success: false,
      error: "Chat not found or you don't have permission to delete it" 
    });
  }

  try {
    // Use a transaction to ensure all deletions happen atomically
    await prisma.$transaction(async (tx) => {
      // Delete all related data (cascading deletes should handle most, but being explicit)
      await tx.message.deleteMany({ where: { chatId } });
      await tx.analysis.deleteMany({ where: { chatId } });
      await tx.productAnalysis.deleteMany({ where: { chatId } });
      await tx.productProfile.deleteMany({ where: { chatId } });
      await tx.productIntelligence.deleteMany({ where: { chatId } });
      await tx.competitorIntelligence.deleteMany({ where: { chatId } });
      await tx.campaignIntelligence.deleteMany({ where: { chatId } });
      await tx.agentRun.deleteMany({ where: { chatId } });
      
      // Automation models (cascade deletes automationAsset via AutomationPlan relation)
      await tx.automationLog.deleteMany({ where: { chatId } });
      await tx.automationPlan.deleteMany({ where: { chatId } });

      // SEO Intelligence has many related models - let Prisma cascade handle them
      await tx.seoIntelligence.deleteMany({ where: { chatId } });

      // Finally delete the chat itself
      await tx.chat.delete({ where: { id: chatId } });
    });

    console.log('✅ [Chat] Chat and all related data deleted');

    return res.json({ 
      success: true,
      message: 'Project and all analysis data deleted successfully'
    });
  } catch (error) {
    console.error('❌ [Chat] Error deleting chat:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to delete chat. Please try again.' 
    });
  }
};

/**
 * GET /api/chats/:chatId/evidence-readiness
 * Returns evidence readiness for all modules
 */
export const getEvidenceReadiness = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    const readiness = await getChatIntelligenceReadiness({ userId, chatId });
    const { hasProductIntelligence, hasAudienceIntelligence, hasCompetitorIntelligence, hasCampaignIntelligence, hasSeoIntelligence, hasAutomationPlan } = readiness;

    return res.json({
      success: true,
      data: {
        chatId,
        hasProductIntelligence,
        hasAudienceIntelligence,
        hasCompetitorIntelligence,
        hasCampaignIntelligence,
        hasSeoIntelligence,
        hasAutomationPlan,
        contentGenerationReady: hasProductIntelligence,
        campaignGenerationReady: hasProductIntelligence && (hasAudienceIntelligence || hasCompetitorIntelligence),
        automationGenerationReady: hasProductIntelligence && hasCampaignIntelligence,
      }
    });
  } catch (error) {
    console.error('[Evidence Readiness] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const clearHistory = async (req, res) => {
  const userId = req.user.id;

  console.log('🗑️ [Chat] Clearing all chat history for user:', { userId });

  try {
    // Use a transaction to ensure all deletions happen atomically
    await prisma.$transaction(async (tx) => {
      // Get all chat IDs for this user
      const userChats = await tx.chat.findMany({
        where: { userId },
        select: { id: true }
      });

      const chatIds = userChats.map(c => c.id);

      if (chatIds.length === 0) {
        console.log('ℹ️ [Chat] No chats found for user');
        return;
      }

      console.log(`🗑️ [Chat] Deleting ${chatIds.length} chats and all related data`);

      // Delete all related records for all user's chats
      await tx.message.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.analysis.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.productAnalysis.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.productProfile.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.productIntelligence.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.competitorIntelligence.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.campaignIntelligence.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.agentRun.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.automationLog.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.automationPlan.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.seoIntelligence.deleteMany({ where: { chatId: { in: chatIds } } });

      // Finally delete all chats
      await tx.chat.deleteMany({ where: { userId } });
    });

    console.log('✅ [Chat] All chat history cleared successfully');

    return res.json({ 
      success: true,
      message: 'All chat history and analysis data cleared successfully'
    });
  } catch (error) {
    console.error('❌ [Chat] Error clearing chat history:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to clear chat history. Please try again.' 
    });
  }
};
