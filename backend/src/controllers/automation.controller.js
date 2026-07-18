import { prisma } from "../config/prisma.js";
import { generateAutomationPlanWithAI, sanitizeAutomationPlanData } from "../services/automation.service.js";
import { callAI } from "../ai/services/aiRouter.service.js";
import { generateAllExecutionModules, generateSingleModule } from "../services/execution/marketing-execution.service.js";
import { buildEvidenceContext, buildReadinessChecklist } from "../services/execution/evidence-context-builder.service.js";
import { buildContentBrief } from "../services/execution/content-brief.service.js";
import { getSeoIntelligenceForChat } from "../services/loaders/seo-intelligence.loader.js";
import { CONTENT_TYPES, CONTENT_TYPES_LIST, SUPPORTED_CONTENT_TYPES, getContentTypeRegistryEntry, getCanonicalContentType, getGeneratorNameForType } from "../constants/content-types.js";

const inProgressAutomation = new Set();
const inProgressCampaign = new Set();
import { generateContent, generateContentStudioPlan } from "../services/execution/content-studio.service.js";
import { scoreContentQuality } from "../services/execution/quality-scorer.service.js";
import { saveContentAsset, getContentAssets, getAssetVersions, regenerateAsset as renewAssetInDb } from "../services/execution/content-asset.service.js";

/**
 * GET /api/automation/:chatId/demo
 * Get existing automation plan for a chat/project
 */
export const getAutomationDemo = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  try {
    console.log('[Automation Plan] Fetching plan for:', { chatId, userId });

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

    console.log('✅ [Automation Plan] Plan found with', automationPlan.assets.length, 'assets');

    return res.json({
      success: true,
      exists: true,
      automationPlan,
    });

  } catch (error) {
    console.error('❌ [Automation Plan] Error fetching plan:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch automation plan'
    });
  }
};

/**
 * POST /api/automation/:chatId/generate-demo
 * Generate new automation plan
 */
export const generateAutomationDemo = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  const dedupKey = `automation:${userId}:${chatId}`;
  if (inProgressAutomation.has(dedupKey)) {
    return res.status(409).json({ success: false, error: 'Automation generation already in progress' });
  }
  inProgressAutomation.add(dedupKey);

  try {
    console.log('[Automation Plan] Generation started for:', { chatId, userId });

    // Verify chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      console.warn('[Automation Plan] Chat not found', { chatId, userId });
      return res.status(404).json({
        success: false,
        error: "Chat not found"
      });
    }

    console.info('[Automation Plan] Chat details', {
      chatId,
      userId,
      productName: chat.productName,
      title: chat.title,
      hasProductName: !!(chat.productName || chat.title)
    });

    // Fetch existing analysis data (scoped by userId)
    const evidenceContext = await buildEvidenceContext(prisma, userId, chatId);

    console.info("[Automation Evidence]", {
      chatId,
      userId,
      chatExists: evidenceContext.rejected ? (evidenceContext.code === 'CHAT_NOT_FOUND' ? false : true) : true,
      productExists: Boolean(evidenceContext.checks?.productIntelligenceExists),
      audienceExists: Boolean(evidenceContext.checks?.audienceIntelligenceExists),
      competitorExists: Boolean(evidenceContext.checks?.competitorIntelligenceExists),
      campaignIntelligenceExists: Boolean(evidenceContext.checks?.campaignIntelligenceExists),
      campaignPlanExists: Boolean(evidenceContext.checks?.existingCampaignPlanExists),
      seoExists: Boolean(evidenceContext.checks?.seoIntelligenceExists),
      evidenceSnapshotExists: Boolean(evidenceContext.checks?.evidenceSnapshotExists),
      missingEvidence: evidenceContext.missingEvidence || []
    });

    // Handle rejection from evidence context
    if (evidenceContext.rejected) {
      const missing = evidenceContext.missingEvidence || [];
      if (evidenceContext.code === 'EVIDENCE_MISSING' || evidenceContext.code === 'PRODUCT_IDENTITY_MISSING') {
        missing.push('ProductIntelligence');
      }
      console.warn("[Automation Plan] Evidence rejected", {
        chatId,
        userId,
        code: evidenceContext.code,
        reason: evidenceContext.reason,
        missing
      });
      return res.status(422).json({
        success: false,
        error: {
          code: evidenceContext.code || "PRODUCT_INTELLIGENCE_REQUIRED",
          message: evidenceContext.reason || "Complete Growth Analysis before generating this module.",
          retryable: false,
          missing
        }
      });
    }

    console.info("[Automation Plan] Evidence loaded successfully");

    const { _raw } = evidenceContext;
    const productIntelligence = _raw.productIntel;
    const competitorIntelligence = _raw.competitorIntel;
    const campaignIntelligence = _raw.campaignIntel;
    const seoIntelligence = _raw.seoIntel;

    // Build readiness checklist (replaces numeric score)
    const readinessChecklist = buildReadinessChecklist(evidenceContext);

    // Generate automation plan using AI or evidence-based fallback
    const automationData = await generateAutomationPlanWithAI({
      productIntelligence,
      competitorIntelligence,
      campaignIntelligence,
      seoIntelligence,
      chatTitle: chat.title,
      productName: chat.productName,
      growthWorkspace: campaignIntelligence?.campaignGenerator?.growthSummary || null,
      executiveStory: campaignIntelligence?.executiveStory || campaignIntelligence?.campaignGenerator?.executiveStory || null,
      actionPlan: campaignIntelligence?.actionPlan || campaignIntelligence?.campaignGenerator?.actionPlan || null,
      evidenceContext,
    });

    // Check for insufficient data
    if (automationData._noData) {
      return res.status(422).json({
        success: false,
        error: {
          code: "PRODUCT_INTELLIGENCE_REQUIRED",
          message: "Complete Growth Analysis before generating this module.",
          retryable: true,
          missing: ['ProductIntelligence', 'CampaignIntelligence']
        }
      });
    }

    // Delete existing plan if any
    await prisma.automationPlan.deleteMany({
      where: { chatId }
    });

    // Create new automation plan (with strict field sanitization)
    const sanitizedData = sanitizeAutomationPlanData(automationData);
    // campaignName is required by the schema — guarantee a value
    const createData = {
      ...sanitizedData,
      campaignName: sanitizedData.campaignName || chat.productName || chat.title || 'Automation Plan',
      readinessChecklist,
      status: 'draft',
    };
    const automationPlan = await prisma.automationPlan.create({
      data: {
        userId,
        chatId,
        ...createData,
      }
    });

    // Log automation generation
    await prisma.automationLog.create({
      data: {
        userId,
        chatId,
        action: 'plan_generated',
        message: `Automation plan generated with readiness: ${readinessChecklist.status}`,
        metadata: {
          readinessStatus: readinessChecklist.status,
          missingItems: readinessChecklist.missing,
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

    const persisted = await prisma.automationPlan.findFirst({ where: { userId, chatId } });
    console.log('[Automation Plan] Persistence check', {
      automationPlanSaved: Boolean(persisted),
      automationPlanId: persisted?.id,
      campaignName: persisted?.campaignName,
      status: persisted?.status
    });

    if (!persisted) {
      console.error('[Automation Plan] Failed to persist plan after create');
      return res.status(500).json({
        success: false,
        error: {
          code: "PERSISTENCE_FAILED",
          message: "Automation plan was generated but could not be saved",
          retryable: true,
          stage: "PERSISTENCE"
        }
      });
    }

    console.info("[Automation Plan] Generation completed successfully", {
      chatId,
      userId,
      automationPlanId: automationPlan.id,
      campaignName: automationPlan.campaignName
    });

    return res.status(201).json({
      success: true,
      automationPlan: completePlan,
      readinessChecklist,
    });

  } catch (error) {
    console.error('❌ [Automation] Error generating plan:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: "AUTOMATION_GENERATION_ERROR",
        message: error.message || 'Failed to generate automation plan',
        retryable: true,
        stage: "UNKNOWN"
      }
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

// ============================================
// PHASE 6 — Marketing Execution Platform
// ============================================

/**
 * POST /api/automation/:chatId/execute
 * Generate all marketing execution modules at once
 */
export const executeAllModules = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  try {
    console.log('🚀 [MarketingExecution] Generating all modules for:', { chatId, userId });

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: "Chat not found" });

    const [productIntelligence, competitorIntelligence, campaignIntelligence, seoIntelligence, plan] = await Promise.all([
      prisma.productIntelligence.findFirst({ where: { chatId, userId } }),
      prisma.competitorIntelligence.findFirst({ where: { chatId, userId } }),
      prisma.campaignIntelligence.findFirst({ where: { chatId, userId } }),
      prisma.seoIntelligence.findFirst({ where: { chatId, userId } }),
      prisma.automationPlan.findFirst({ where: { chatId, userId } }),
    ]);

    const context = {
      productName: chat.productName || chat.title,
      companyName: chat.productName,
      targetAudience: productIntelligence?.productAnalysis?.targetAudience || productIntelligence?.audienceIntelligence?.primaryAudience,
      industry: productIntelligence?.productAnalysis?.industry,
      productUsp: productIntelligence?.productAnalysis?.usp,
      seoData: seoIntelligence?.seoScore != null ? `SEO Score: ${seoIntelligence.seoScore}` : null,
      growthData: campaignIntelligence?.campaignGenerator?.growthSummary,
      totalBudget: plan?.budgetSplit ? 'Configured in plan' : null,
      brandColors: plan?.designStyles?.colors?.join(', '),
      campaignGoal: plan?.campaignObjective,
      platforms: plan?.channels?.map(c => c.channel || c.name).filter(Boolean),
    };

    const executionData = await generateAllExecutionModules(context);

    await prisma.automationPlan.upsert({
      where: { chatId },
      update: {
        contentStudio: executionData.contentStudio,
        emailCampaigns: executionData.emailCampaigns,
        creativeStudio: executionData.creativeStudio,
        videoStudio: executionData.videoStudio,
        campaignPlans: executionData.campaignPlans,
        socialCalendars: executionData.socialCalendars,
        analyticsData: executionData._summary,
      },
      create: {
        userId, chatId,
        campaignName: chat.title || 'Marketing Execution',
        contentStudio: executionData.contentStudio,
        emailCampaigns: executionData.emailCampaigns,
        creativeStudio: executionData.creativeStudio,
        videoStudio: executionData.videoStudio,
        campaignPlans: executionData.campaignPlans,
        socialCalendars: executionData.socialCalendars,
        analyticsData: executionData._summary,
        readinessScore: 0,
        status: 'draft',
      },
    });

    await prisma.automationLog.create({
      data: {
        userId, chatId,
        action: 'execution_generated',
        message: `Marketing execution plan generated with ${executionData._summary.totalAssetsGenerated} assets across ${executionData._summary.modulesGenerated} modules`,
        metadata: executionData._summary,
      },
    });

    // Phase 9 — Create execution records
    const modules = ['contentStudio', 'emailCampaigns', 'creativeStudio', 'videoStudio', 'campaignPlans', 'socialCalendars'];
    const planRecord = await prisma.automationPlan.findFirst({ where: { chatId, userId } });
    for (const mod of modules) {
      if (executionData[mod] && !executionData[mod].error) {
        await prisma.executionRecord.create({
          data: {
            userId, chatId,
            automationPlanId: planRecord?.id || null,
            module: mod,
            contextSnapshotId: `ctx_${chatId}_${Date.now()}`,
            provider: mod === 'emailCampaigns' ? (executionData[mod].providerConfigured ? 'email_provider' : 'no_provider') : 'ai_generation',
            requestStatus: 'success',
            retryCount: 0,
            maxRetries: 3,
            startedAt: new Date(Date.now() - 1000),
            completedAt: new Date(),
          },
        });
      }
    }

    console.log('✅ [MarketingExecution] All modules generated:', executionData._summary);
    return res.json({ success: true, data: executionData });
  } catch (error) {
    console.error('❌ [MarketingExecution] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to generate execution modules' });
  }
};

/**
 * POST /api/automation/:chatId/execute/:module
 * Generate a single execution module
 */
export const executeSingleModule = async (req, res) => {
  const { chatId, module: moduleType } = req.params;
  const userId = req.user.id;

  try {
    console.log('🚀 [MarketingExecution] Generating single module:', { chatId, moduleType });

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: "Chat not found" });

    const [productIntelligence, seoIntelligence, campaignIntelligence, plan, evidenceContext] = await Promise.all([
      prisma.productIntelligence.findFirst({ where: { chatId, userId } }),
      prisma.seoIntelligence.findFirst({ where: { chatId, userId } }),
      prisma.campaignIntelligence.findFirst({ where: { chatId, userId } }),
      prisma.automationPlan.findFirst({ where: { chatId, userId } }),
      buildEvidenceContext(prisma, userId, chatId),
    ]);

    const context = {
      productName: chat.productName || chat.title,
      companyName: chat.productName,
      targetAudience: productIntelligence?.productAnalysis?.targetAudience,
      industry: productIntelligence?.productAnalysis?.industry,
      productUsp: productIntelligence?.productAnalysis?.usp,
      seoData: seoIntelligence?.seoScore != null ? `SEO Score: ${seoIntelligence.seoScore}` : null,
      totalBudget: plan?.budgetSplit ? 'Configured in plan' : null,
      brandColors: plan?.designStyles?.colors?.join(', '),
      campaignGoal: plan?.campaignObjective,
      evidenceContext,
    };

    const result = await generateSingleModule(moduleType, context);

    const fieldMap = {
      'content-studio': 'contentStudio',
      'email-campaigns': 'emailCampaigns',
      'creative-studio': 'creativeStudio',
      'video-studio': 'videoStudio',
      'campaign-plans': 'campaignPlans',
      'social-calendars': 'socialCalendars',
    };

    const prismaField = fieldMap[moduleType];
    if (prismaField && result.data) {
      await prisma.automationPlan.upsert({
        where: { chatId },
        update: { [prismaField]: result.data },
        create: { userId, chatId, campaignName: chat.title || 'Marketing Execution', [prismaField]: result.data, readinessScore: 0, status: 'draft' },
      });
    }

    await prisma.automationLog.create({
      data: { userId, chatId, action: `module_${moduleType}_generated`, message: `${moduleType} module generated with ${result.data?.totalGenerated || 0} assets`, metadata: { module: moduleType, result: result.data } },
    });

    // Phase 9 — Create execution record for single module
    await prisma.executionRecord.create({
      data: {
        userId, chatId,
        automationPlanId: plan?.id || null,
        module: moduleType,
        contextSnapshotId: `ctx_${chatId}_${Date.now()}`,
        provider: result.data?.provider || 'ai_generation',
        requestStatus: result.data ? 'success' : 'failed',
        retryCount: 0,
        maxRetries: 3,
        startedAt: new Date(Date.now() - 1000),
        completedAt: new Date(),
      },
    });

    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('❌ [MarketingExecution] Error:', error);
    return res.status(500).json({ success: false, error: error.message || `Failed to generate module: ${req.params.module}` });
  }
};

/**
 * GET /api/automation/:chatId/execution
 * Get execution data for a chat
 */
export const getExecutionData = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  try {
    let plan = null;
    try {
      plan = await prisma.automationPlan.findFirst({ where: { chatId, userId } });
    } catch (dbErr) {
      console.warn('[getExecutionData] DB query failed, schema may be out of sync:', dbErr.message);
      return res.json({ success: true, exists: false, data: null });
    }
    if (!plan) return res.json({ success: true, exists: false, data: null });

    return res.json({
      success: true,
      exists: true,
      data: {
        contentStudio: plan.contentStudio,
        emailCampaigns: plan.emailCampaigns,
        creativeStudio: plan.creativeStudio,
        videoStudio: plan.videoStudio,
        campaignPlans: plan.campaignPlans,
        socialCalendars: plan.socialCalendars,
        analyticsData: plan.analyticsData,
      },
    });
  } catch (error) {
    console.error('❌ [MarketingExecution] Error fetching:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch execution data' });
  }
};

/**
 * GET /api/automation/:chatId/evidence-context
 * Get evidence context for the content studio (lightweight, no DB writes)
 */
export const getEvidenceContext = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  try {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: "Chat not found" });

    const evidenceContext = await buildEvidenceContext(prisma, userId, chatId);

    return res.json({
      success: true,
      data: {
        company: evidenceContext.company,
        product: evidenceContext.product,
        website: evidenceContext.website,
        audience: evidenceContext.audience,
        competitors: evidenceContext.competitors,
        seo: evidenceContext.seo,
        channels: evidenceContext.channels,
        growth: evidenceContext.growth,
        sourceSummary: evidenceContext.sourceSummary,
      },
    });
  } catch (error) {
    console.error('❌ [EvidenceContext] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch evidence context' });
  }
};

/**
 * GET /api/automation/:chatId/readiness
 * Get readiness checklist (Phase 2)
 */
export const getReadinessCheck = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  try {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: "Chat not found" });

    const evidenceContext = await buildEvidenceContext(prisma, userId, chatId);
    if (evidenceContext.rejected) {
      return res.json({ success: true, rejected: true, code: evidenceContext.code, reason: evidenceContext.reason });
    }

    const checklist = buildReadinessChecklist(evidenceContext);
    return res.json({ success: true, readiness: checklist });
  } catch (error) {
    console.error('❌ [Readiness] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to check readiness' });
  }
};

/**
 * GET /api/automation/:chatId/execution-history
 * Get execution history (Phase 9)
 */
export const getExecutionHistory = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  try {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: "Chat not found" });

    const records = await prisma.executionRecord.findMany({
      where: { chatId, userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({ success: true, records });
  } catch (error) {
    console.error('❌ [ExecutionHistory] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch execution history' });
  }
};

/**
 * GET /api/automation/:chatId/content-brief
 * Get canonical content brief (Phase 1)
 */
export const getContentBrief = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  try {
    console.info("[Content Brief API] Fetching brief", { chatId, userId });
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      console.warn("[Content Brief API] Chat not found", { chatId, userId });
      return res.status(404).json({ 
        success: false, 
        error: {
          code: "CHAT_NOT_FOUND",
          message: "Chat not found",
          retryable: false,
          stage: "AUTHENTICATION"
        }
      });
    }

    const brief = await buildContentBrief(prisma, userId, chatId);
    console.info("[Content Brief API] Brief built successfully", {
      chatId,
      userId,
      hasBrief: Boolean(brief),
      isRejected: brief?.rejected,
      rejectionCode: brief?.code
    });
    
    // Handle new Content Brief response structure
    const briefData = brief?.data || brief;
    const briefWarnings = brief?.warnings || [];
    
    if (brief?.rejected) {
      return res.status(422).json({
        success: false,
        error: {
          code: brief.code || "EVIDENCE_MISSING",
          message: brief.reason || "Complete Growth Analysis before generating content.",
          retryable: false,
          stage: "BRIEF_BUILDING"
        }
      });
    }
    
    return res.json({ success: true, data: briefData, warnings: briefWarnings });
  } catch (error) {
    console.error('❌ [ContentBrief API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: {
        code: "CONTENT_BRIEF_BUILD_FAILED",
        message: error.message || 'Failed to build content brief',
        retryable: true,
        stage: "UNKNOWN"
      }
    });
  }
};

/**
 * POST /api/automation/:chatId/content
 * Generate specific content type via Content Studio (Phase 3–8)
 */
export const generateContentItem = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;
  const { contentType } = req.body;

  if (!contentType || !CONTENT_TYPES_LIST.includes(contentType)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_CONTENT_TYPE",
        message: `Invalid contentType. Must be one of: ${CONTENT_TYPES_LIST.join(', ')}`,
        retryable: false
      }
    });
  }

  try {
    const registryEntry = getContentTypeRegistryEntry(contentType);
    const normalizedType = getCanonicalContentType(contentType);
    const generatorName = getGeneratorNameForType(contentType);

    if (!registryEntry || !generatorName) {
      console.error("[Content Studio] No generator registered for content type", { contentType, normalizedType });
      return res.status(400).json({
        success: false,
        error: {
          code: "UNSUPPORTED_CONTENT_TYPE",
          message: `No generator registered for content type: ${contentType}`,
          retryable: false
        }
      });
    }

    console.info("[Content Studio] Content-type routing", {
      uiTab: req.body._uiTab || 'unknown',
      uiSelection: contentType,
      requestContentType: contentType,
      normalizedContentType: normalizedType,
      generatorSelected: generatorName,
      validatorSelected: registryEntry.validator || 'unknown',
      persistedContentType: normalizedType,
      chatId, userId
    });
    
    // Stage 1: Validate authentication and chat ownership
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      console.warn("[Content Studio] Chat not found", { chatId, userId });
      return res.status(404).json({ 
        success: false, 
        error: {
          code: "CHAT_NOT_FOUND",
          message: "Chat not found",
          retryable: false,
          stage: "AUTHENTICATION"
        }
      });
    }

    // Stage 2: Build Content Brief
    const briefResult = await buildContentBrief(prisma, userId, chatId);
    
    // Handle new Content Brief response structure
    const brief = briefResult?.data || briefResult;
    const briefWarnings = briefResult?.warnings || [];
    
    if (brief?.rejected) {
      console.warn("[Content Studio] Brief rejected", { chatId, userId, code: brief.code, reason: brief.reason });
      return res.status(422).json({
        success: false,
        error: {
          code: brief.code || "EVIDENCE_MISSING",
          message: brief.reason || "Complete Growth Analysis before generating content.",
          retryable: false,
          stage: "BRIEF_BUILDING"
        }
      });
    }

    // Stage 3: Build evidence context
    const evidenceContext = await buildEvidenceContext(prisma, userId, chatId);

    // Stage 4: Generate content using canonical type
    const effectiveType = getCanonicalContentType(contentType) || contentType;
    const result = await generateContent(effectiveType, brief, evidenceContext, callAI, userId, chatId);
    const contentBody = result?.content || result;
    const meta = result?.metadata || {};

    if (!contentBody) {
      return res.status(500).json({
        success: false,
        error: { code: "CONTENT_GENERATION_FAILED", message: "Content generation returned no data", retryable: true, stage: "GENERATION" }
      });
    }

    if (!contentBody._type) contentBody._type = effectiveType;

    if (contentBody._status === 'generation_failed' || contentBody._status === 'blocked') {
      console.error("[Content Studio] Generation failed", {
        chatId, userId, contentType, effectiveType,
        status: contentBody._status,
        reason: contentBody._reason,
      });
      if (contentBody._status === 'blocked') {
        return res.status(422).json({
          success: false, status: 'BLOCKED', code: 'PRODUCT_IDENTITY_UNAVAILABLE',
          message: contentBody._reason || 'Content generation requires a verified product identity',
          readiness: { ready: false, missingRequired: ['PRODUCT_IDENTITY'] },
        });
      }
      return res.status(500).json({
        success: false,
        error: { code: "CONTENT_GENERATION_FAILED", message: contentBody._reason || "AI provider returned no content", retryable: true, stage: "GENERATION" }
      });
    }

    if (meta?.status === 'schema_rejected') {
      const typeLabel = CONTENT_TYPES[effectiveType]?.label || contentType;
      const errorDetails = (meta.schemaErrors || []).join('; ');
      const userMessage = `${typeLabel} did not match the required format. Please try again.`;
      console.error("[Content Studio] Schema rejected", {
        chatId, userId, effectiveType,
        errors: meta.schemaErrors,
      });
      return res.status(422).json({
        success: false, error: userMessage, code: "SCHEMA_REJECTED",
        retryable: true, stage: "VALIDATION", details: errorDetails,
      });
    }

    // Stage 5: Quality scoring
    const qualityScore = scoreContentQuality(contentBody, brief, effectiveType);

    // Stage 6: Persist asset
    const asset = await saveContentAsset(prisma, {
      userId,
      chatId,
      contentType: effectiveType,
      briefSnapshot: brief,
      evidenceSnapshot: evidenceContext,
      provider: 'groq',
      content: contentBody,
      metadata: meta,
      qualityScore,
    });

    if (!asset || !asset.id) {
      console.error("[Content Studio] Asset persistence failed", { chatId, userId, contentType, effectiveType });
      return res.status(500).json({
        success: false,
        error: {
          code: "ASSET_PERSISTENCE_FAILED",
          message: "Content was generated but could not be saved",
          retryable: true,
          stage: "PERSISTENCE"
        }
      });
    }

    if (contentBody && typeof contentBody === 'object') {
      contentBody._type = effectiveType;
      contentBody._assetId = asset.id;
    }

    console.info("[Content Studio] Asset saved", {
      chatId, userId, contentType: effectiveType,
      assetId: asset?.id, assetSaved: Boolean(asset)
    });

    // Stage 7: Verify asset persistence
    const persistedAsset = await prisma.automationAsset.findFirst({
      where: { id: asset?.id }
    });
    console.info("[Content Studio] Asset persistence check", {
      assetId: asset?.id,
      persisted: Boolean(persistedAsset)
    });

    if (!persistedAsset) {
      console.error("[Content Studio] Asset not persisted after save", { assetId: asset?.id });
      return res.status(500).json({
        success: false,
        error: {
          code: "ASSET_VERIFICATION_FAILED",
          message: "Asset was saved but could not be verified",
          retryable: true,
          stage: "VALIDATION"
        }
      });
    }

    return res.status(201).json({
      success: true,
      routing: {
        uiTab: req.body._uiTab || 'content-studio',
        uiSelection: contentType,
        requestContentType: contentType,
        normalizedContentType: effectiveType,
        generatorSelected: generatorName,
        validatorSelected: registryEntry?.validator || 'unknown',
        persistedContentType: effectiveType,
      },
      data: {
        content: contentBody,
        metadata: meta,
        qualityScore,
        asset,
        warnings: briefWarnings
      },
    });
  } catch (error) {
    console.error('❌ [Content Studio] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: {
        code: "CONTENT_GENERATION_ERROR",
        message: error.message || 'Failed to generate content',
        retryable: true,
        stage: "UNKNOWN"
      }
    });
  }
};

/**
 * POST /api/automation/:chatId/content/plan
 * Generate all content types via Content Studio
 */
export const generateAllContent = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;
  const { types = CONTENT_TYPES_LIST } = req.body;

  try {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: "Chat not found" });

    const brief = await buildContentBrief(prisma, userId, chatId);
    const evidenceContext = await buildEvidenceContext(prisma, userId, chatId);

    const invalid = types.filter(t => !CONTENT_TYPES_LIST.includes(t));
    if (invalid.length) {
      return res.status(400).json({ success: false, error: `Invalid types: ${invalid.join(', ')}` });
    }

    const planResult = await generateContentStudioPlan(types, brief, evidenceContext, callAI, userId, chatId);
    const generatedItems = planResult?.assets || [];

    // Score each, save each (skip failed generations)
    const assets = [];
    const qualityScores = [];
    const skipped = [];

    for (const item of generatedItems) {
      const contentBody = item.content || item;
      const meta = item.metadata || {};

      // Skip items that failed generation or were blocked
      if (!contentBody || contentBody._status === 'generation_failed' || contentBody._status === 'blocked') {
        skipped.push({ type: item.type, status: contentBody?._status || 'null', reason: contentBody?._reason });
        continue;
      }

      const score = scoreContentQuality(contentBody, brief, item.type);
      qualityScores.push({ type: item.type, ...score });

      const asset = await saveContentAsset(prisma, {
        userId,
        chatId,
        contentType: item.type,
        briefSnapshot: brief,
        evidenceSnapshot: evidenceContext,
        provider: meta?.provider || 'content_studio_ai',
        content: contentBody,
        metadata: meta,
        qualityScore: score,
      });
      assets.push(asset);
    }

    return res.status(201).json({
      success: true,
      data: {
        results: planResult,
        qualityScores: qualityScores.reduce((a, s) => ({ ...a, [s.type]: s }), {}),
        assets,
        skipped: skipped.length > 0 ? skipped : undefined,
      },
    });
  } catch (error) {
    console.error('❌ [ContentStudioPlan] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to generate content plan' });
  }
};

/**
 * GET /api/automation/:chatId/content/assets
 * Get all content assets for a chat
 */
export const getContentAssetList = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;
  const { type } = req.query;

  try {
    const assets = await getContentAssets(prisma, userId, chatId, type);
    return res.json({ success: true, data: assets });
  } catch (error) {
    console.error('❌ [ContentAssets] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch assets' });
  }
};

/**
 * GET /api/automation/content/assets/:assetId/versions
 * Get version history for an asset
 */
export const getAssetVersionHistory = async (req, res) => {
  const { assetId } = req.params;

  try {
    const versions = await getAssetVersions(prisma, assetId);
    return res.json({ success: true, data: versions });
  } catch (error) {
    console.error('❌ [AssetVersions] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch versions' });
  }
};

/**
 * POST /api/automation/content/assets/:assetId/regenerate
 * Regenerate (create new version) of a content asset
 */
export const regenerateContentAsset = async (req, res) => {
  const { assetId } = req.params;
  const userId = req.user.id;

  try {
    const existing = await prisma.automationAsset.findUnique({ where: { id: assetId } });
    if (!existing) return res.status(404).json({ success: false, error: 'Asset not found' });

    const chatId = (await prisma.automationPlan.findUnique({ where: { id: existing.automationPlanId } })).chatId;
    const brief = await buildContentBrief(prisma, userId, chatId);
    const evidenceContext = await buildEvidenceContext(prisma, userId, chatId);
    const contentType = existing.assetType.replace('content_', '');

    const result = await generateContent(contentType, brief, evidenceContext, callAI, userId, chatId);
    const contentBody = result?.content || result;
    const meta = result?.metadata || {};

    const asset = await renewAssetInDb(prisma, assetId, result);

    if (contentBody && typeof contentBody === 'object') {
      if (!contentBody._type) contentBody._type = contentType;
      contentBody._assetId = asset.id;
    }

    const qualityScore = scoreContentQuality(contentBody, brief, contentType);

    return res.status(201).json({ success: true, data: { content: contentBody, metadata: meta, qualityScore, asset } });
  } catch (error) {
    console.error('❌ [RegenerateAsset] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to regenerate asset' });
  }
};
