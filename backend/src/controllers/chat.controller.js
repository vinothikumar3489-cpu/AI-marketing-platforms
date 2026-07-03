import { z } from "zod";
import { prisma } from "../config/prisma.js";

const chatSchema = z.object({
  title: z.string().min(1),
  productName: z.string().optional(),
});

export const createChat = async (req, res) => {
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
};

export const listChats = async (req, res) => {
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
};

export const getChat = async (req, res) => {
  const { chatId } = req.params;
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: req.user.id },
    include: { messages: { orderBy: { createdAt: "asc" } }, analysis: true },
  });
  if (!chat) {
    return res.status(404).json({ success: false, error: "Chat not found" });
  }
  return res.json(chat);
};

export const getFullChat = async (req, res) => {
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
};

/**
 * GET /api/chats/:chatId/full-results
 * Returns all saved analysis results for a chat/project
 * Must always return 200 for a valid chat, even if empty.
 */
export const getFullResults = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  console.log('[FullResults] chatId:', chatId, 'userId:', userId);

  try {
    // Verify chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      console.log('[FullResults] chat not found');
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    console.log('[FullResults] chat found');

    // Fetch all intelligence modules (all may be null for new chats)
    const productIntelligence = await prisma.productIntelligence.findUnique({ where: { chatId } }).catch(() => null);
    const competitorIntelligence = await prisma.competitorIntelligence.findUnique({ where: { chatId } }).catch(() => null);
    const campaignIntelligence = await prisma.campaignIntelligence.findUnique({ where: { chatId } }).catch(() => null);
    const seoIntelligence = await prisma.seoIntelligence.findUnique({
      where: { chatId },
      include: {
        technicalAuditDetail: true,
        scoreBreakdown: true,
        keywordIntelligence: true,
        geoIntelligence: true,
        competitorSeoRecord: true,
        contentGapRecord: true,
        blogIntelligenceRecord: true,
        executiveDashboard: true,
      },
    }).catch(() => null);

    const agentRuns = await prisma.agentRun.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    const automationPlan = await prisma.automationPlan.findUnique({
      where: { chatId },
      include: { assets: { orderBy: { createdAt: 'asc' } } },
    }).catch(() => null);

    console.log('[FullResults] response built');

    // Build canonical response with actual data
    const hasGrowth = !!(productIntelligence || competitorIntelligence || campaignIntelligence);
    const canonicalResult = {
      success: true,
      chat,
      growth: {
        identity: {
          websiteUrl: productIntelligence?.inputJson?.websiteUrl || '',
          productName: productIntelligence?.inputJson?.productName || chat?.productName || '',
          companyName: productIntelligence?.inputJson?.companyName || chat?.title || '',
          industry: productIntelligence?.inputJson?.industry || '',
        },
        product: productIntelligence?.productAnalysis || null,
        market: productIntelligence?.marketDiscovery || null,
        audience: productIntelligence?.audienceIntelligence || null,
        competitor: competitorIntelligence?.competitorAnalysis || null,
        intent: competitorIntelligence?.intentPrediction || null,
        positioning: competitorIntelligence?.positioningEngine || null,
        campaign: campaignIntelligence?.campaignGenerator || null,
        channel: campaignIntelligence?.channelRecommendation || null,
        executiveStory: campaignIntelligence?.executiveStory || null,
        actionPlan: campaignIntelligence?.actionPlan || null,
        summary: campaignIntelligence?.campaignGenerator?.metadata?.growthSummary || null,
      },
      seoIntelligence: seoIntelligence || null,
      hasGrowthWorkspace: hasGrowth,
      hasSeoIntelligence: !!seoIntelligence,
      productIntelligence: productIntelligence || null,
      competitorIntelligence: competitorIntelligence || null,
      campaignIntelligence: campaignIntelligence || null,
      agentRuns: agentRuns || [],
      automationPlan: automationPlan || null,
    };

    return res.json(canonicalResult);
  } catch (error) {
    console.error('[FullResults] error message:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to load full results',
    });
  }
};

export const updateChat = async (req, res) => {
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

  // Delete all related data (cascading deletes should handle most, but being explicit)
  await prisma.message.deleteMany({ where: { chatId } });
  await prisma.analysis.deleteMany({ where: { chatId } });
  await prisma.productAnalysis.deleteMany({ where: { chatId } });
  await prisma.productProfile.deleteMany({ where: { chatId } });
  await prisma.productIntelligence.deleteMany({ where: { chatId } });
  await prisma.competitorIntelligence.deleteMany({ where: { chatId } });
  await prisma.campaignIntelligence.deleteMany({ where: { chatId } });
  await prisma.agentRun.deleteMany({ where: { chatId } });
  
  // SEO Intelligence has many related models - let Prisma cascade handle them
  await prisma.seoIntelligence.deleteMany({ where: { chatId } });

  // Finally delete the chat itself
  await prisma.chat.delete({ where: { id: chatId } });

  console.log('✅ [Chat] Chat and all related data deleted');

  return res.json({ 
    success: true,
    message: 'Project and all analysis data deleted successfully'
  });
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
