import { prisma } from "../config/prisma.js";
import { generateAutomationPlanWithAI, sanitizeAutomationPlanData } from "../services/automation.service.js";
import { callAI } from "../ai/services/aiRouter.service.js";

/**
 * GET /api/automation/:chatId/demo
 * Get existing automation plan for a chat/project
 */
export const getAutomationDemo = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  try {
    console.log('🤖 [Automation] Fetching demo for:', { chatId, userId });

    // Verify chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found"
      });
    }

    // Fetch automation plan with assets
    const automationPlan = await prisma.automationPlan.findUnique({
      where: { chatId },
      include: {
        assets: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!automationPlan) {
      return res.json({
        success: true,
        exists: false,
        automationPlan: null,
      });
    }

    console.log('✅ [Automation] Plan found with', automationPlan.assets.length, 'assets');

    return res.json({
      success: true,
      exists: true,
      automationPlan,
    });

  } catch (error) {
    console.error('❌ [Automation] Error fetching demo:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch automation demo'
    });
  }
};

/**
 * POST /api/automation/:chatId/generate-demo
 * Generate new automation demo plan
 */
export const generateAutomationDemo = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  try {
    console.log('🚀 [Automation] Generating demo for:', { chatId, userId });

    // Verify chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found"
      });
    }

    // Fetch existing analysis data
    const productIntelligence = await prisma.productIntelligence.findUnique({
      where: { chatId }
    });
    const competitorIntelligence = await prisma.competitorIntelligence.findUnique({
      where: { chatId }
    });
    const campaignIntelligence = await prisma.campaignIntelligence.findUnique({
      where: { chatId }
    });
    const seoIntelligence = await prisma.seoIntelligence.findUnique({
      where: { chatId },
      include: { scoreBreakdown: true }
    });

    // Calculate readiness score
    const readinessModules = {
      productAnalysis: !!productIntelligence?.productAnalysis,
      marketDiscovery: !!productIntelligence?.marketDiscovery,
      audienceIntelligence: !!productIntelligence?.audienceIntelligence,
      competitorAnalysis: !!competitorIntelligence?.competitorAnalysis,
      campaignGenerator: !!campaignIntelligence?.campaignGenerator,
      channelRecommendation: !!campaignIntelligence?.channelRecommendation,
      contentStudio: !!campaignIntelligence?.contentStudio,
      seoAnalysis: !!seoIntelligence?.seoScore,
    };

    const completedModules = Object.values(readinessModules).filter(Boolean).length;
    const readinessScore = Math.round((completedModules / 8) * 100);

    console.log('📊 [Automation] Readiness:', { completedModules, readinessScore });

    // Generate automation plan using AI or fallback
    const automationData = await generateAutomationPlanWithAI({
      productIntelligence,
      competitorIntelligence,
      campaignIntelligence,
      seoIntelligence,
      chatTitle: chat.title,
      productName: chat.productName,
    });

    console.log('📦 [Automation] Generated data keys:', Object.keys(automationData));

    // Delete existing plan if any
    await prisma.automationPlan.deleteMany({
      where: { chatId }
    });

    // Create new automation plan using only supported fields
    const automationPlanData = {
      userId,
      chatId,
      ...sanitizeAutomationPlanData(automationData, chat.title),
      readinessScore,
      status: 'draft',
    };

    // Create plan record
    const automationPlan = await prisma.automationPlan.create({
      data: automationPlanData
    });

    // Create automation assets
    const assets = [];

    // Email assets
    if (automationData.emailSequence && Array.isArray(automationData.emailSequence)) {
      for (let i = 0; i < automationData.emailSequence.length; i++) {
        const email = automationData.emailSequence[i];
        assets.push({
          automationPlanId: automationPlan.id,
          assetType: 'email',
          assetTitle: email.subject || `Email ${i + 1}`,
          assetContent: email,
          channel: 'email',
          status: 'draft',
        });
      }
    }

    // LinkedIn assets
    if (automationData.linkedInPosts && Array.isArray(automationData.linkedInPosts)) {
      for (let i = 0; i < automationData.linkedInPosts.length; i++) {
        const post = automationData.linkedInPosts[i];
        assets.push({
          automationPlanId: automationPlan.id,
          assetType: 'linkedin_post',
          assetTitle: post.title || `LinkedIn Post ${i + 1}`,
          assetContent: post,
          channel: 'linkedin',
          status: 'draft',
        });
      }
    }

    // Instagram assets
    if (automationData.instagramCaptions && Array.isArray(automationData.instagramCaptions)) {
      for (let i = 0; i < automationData.instagramCaptions.length; i++) {
        const caption = automationData.instagramCaptions[i];
        assets.push({
          automationPlanId: automationPlan.id,
          assetType: 'instagram_post',
          assetTitle: caption.title || `Instagram Post ${i + 1}`,
          assetContent: caption,
          channel: 'instagram',
          status: 'draft',
        });
      }
    }

    // Video ads
    if (automationData.videoScripts && Array.isArray(automationData.videoScripts)) {
      for (let i = 0; i < automationData.videoScripts.length; i++) {
        const video = automationData.videoScripts[i];
        assets.push({
          automationPlanId: automationPlan.id,
          assetType: 'video_ad',
          assetTitle: video.title || `Video Ad ${i + 1}`,
          assetContent: video,
          channel: 'video',
          status: 'draft',
        });
      }
    }

    // Image ads
    if (automationData.posterPrompts && Array.isArray(automationData.posterPrompts)) {
      for (let i = 0; i < automationData.posterPrompts.length; i++) {
        const poster = automationData.posterPrompts[i];
        assets.push({
          automationPlanId: automationPlan.id,
          assetType: 'image_ad',
          assetTitle: poster.title || `Image Ad ${i + 1}`,
          assetContent: poster,
          channel: 'image',
          status: 'draft',
        });
      }
    }

    // Create all assets in database
    if (assets.length > 0) {
      await prisma.automationAsset.createMany({
        data: assets
      });
    }

    // Log automation generation
    await prisma.automationLog.create({
      data: {
        userId,
        chatId,
        action: 'generated',
        message: `Automation plan generated with ${assets.length} assets`,
        metadata: {
          readinessScore,
          assetsCount: assets.length,
        }
      }
    });

    // Fetch complete plan with assets
    const completePlan = await prisma.automationPlan.findUnique({
      where: { id: automationPlan.id },
      include: {
        assets: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    console.log('✅ [Automation] Plan generated with', assets.length, 'assets');

    return res.json({
      success: true,
      automationPlan: completePlan,
      readinessModules,
    });

  } catch (error) {
    console.error('❌ [Automation] Error generating demo:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate automation demo'
    });
  }
};

/**
 * GET /api/automation/:chatId/assets
 * Get all automation assets for a chat
 */
export const getAutomationAssets = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  try {
    // Verify chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found"
      });
    }

    const automationPlan = await prisma.automationPlan.findUnique({
      where: { chatId },
    });

    if (!automationPlan) {
      return res.json({
        success: true,
        assets: []
      });
    }

    const assets = await prisma.automationAsset.findMany({
      where: { automationPlanId: automationPlan.id },
      orderBy: { createdAt: 'asc' }
    });

    return res.json({
      success: true,
      assets
    });

  } catch (error) {
    console.error('❌ [Automation] Error fetching assets:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch automation assets'
    });
  }
};

/**
 * PUT /api/automation/assets/:assetId/status
 * Update asset status (approve/reject/schedule)
 */
export const updateAssetStatus = async (req, res) => {
  const { assetId } = req.params;
  const { status, scheduledFor, reviewNotes } = req.body;
  const userId = req.user.id;

  try {
    console.log('📝 [Automation] Updating asset status:', { assetId, status });

    // Fetch asset and verify ownership through automation plan
    const asset = await prisma.automationAsset.findUnique({
      where: { id: assetId },
      include: {
        automationPlan: true
      }
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: "Asset not found"
      });
    }

    if (asset.automationPlan.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized"
      });
    }

    // Update asset
    const updateData = {
      status,
      reviewNotes: reviewNotes || asset.reviewNotes,
    };

    if (status === 'approved') {
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
    }

    if (status === 'scheduled' && scheduledFor) {
      updateData.scheduledFor = new Date(scheduledFor);
    }

    if (status === 'published_demo') {
      updateData.publishedAt = new Date();
    }

    const updatedAsset = await prisma.automationAsset.update({
      where: { id: assetId },
      data: updateData
    });

    // Log the action
    await prisma.automationLog.create({
      data: {
        userId,
        chatId: asset.automationPlan.chatId,
        assetId,
        action: status,
        message: `Asset "${asset.assetTitle}" status changed to ${status}`,
      }
    });

    console.log('✅ [Automation] Asset updated:', { assetId, status });

    return res.json({
      success: true,
      asset: updatedAsset
    });

  } catch (error) {
    console.error('❌ [Automation] Error updating asset:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update asset status'
    });
  }
};

/**
 * POST /api/automation/assets/:assetId/regenerate
 * Regenerate specific asset
 */
export const regenerateAsset = async (req, res) => {
  const { assetId } = req.params;
  const userId = req.user.id;

  try {
    console.log('🔄 [Automation] Regenerating asset:', { assetId });

    // Fetch asset and verify ownership
    const asset = await prisma.automationAsset.findUnique({
      where: { id: assetId },
      include: {
        automationPlan: true
      }
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: "Asset not found"
      });
    }

    if (asset.automationPlan.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized"
      });
    }

    // Build regeneration prompt from asset context
    const currentVersion = asset.assetContent?.version || 1;
    const prompt = `Regenerate this ${asset.assetType} for a marketing automation campaign. Keep the same style and format but create fresh content.

Current content: ${JSON.stringify(asset.assetContent, null, 2)}

Return ONLY valid JSON with the same structure as the original content. Ensure all text is new, unique, and improved.`;

    let regeneratedContent;
    try {
      const aiResult = await callAI(prompt);
      if (aiResult.success && aiResult.data) {
        regeneratedContent = aiResult.data;
        regeneratedContent.version = currentVersion + 1;
        regeneratedContent.regeneratedByAI = true;
        regeneratedContent.aiProvider = aiResult.provider || 'ai';
      } else {
        throw new Error('AI regeneration returned empty result');
      }
    } catch (aiError) {
      console.warn('⚠️ [Automation] AI regeneration failed, using fallback:', aiError.message);
      regeneratedContent = {
        ...asset.assetContent,
        version: currentVersion + 1,
        regeneratedByAI: false,
        source: "regeneration_fallback",
        isFallback: true,
      };
    }

    const updatedAsset = await prisma.automationAsset.update({
      where: { id: assetId },
      data: {
        assetContent: regeneratedContent,
        status: 'needs_review',
      }
    });

    // Log the regeneration
    await prisma.automationLog.create({
      data: {
        userId,
        chatId: asset.automationPlan.chatId,
        assetId,
        action: 'regenerated',
        message: `Asset "${asset.assetTitle}" regenerated`,
      }
    });

    console.log('✅ [Automation] Asset regenerated:', { assetId });

    return res.json({
      success: true,
      asset: updatedAsset
    });

  } catch (error) {
    console.error('❌ [Automation] Error regenerating asset:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to regenerate asset'
    });
  }
};

/**
 * GET /api/automation/:chatId/logs
 * Get automation log history for a chat
 */
export const getAutomationLogs = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  try {
    const logs = await prisma.automationLog.findMany({
      where: { chatId, userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error('❌ [Automation] Error fetching logs:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch automation logs'
    });
  }
};
