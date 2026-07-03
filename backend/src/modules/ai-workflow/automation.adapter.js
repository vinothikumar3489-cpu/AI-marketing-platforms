import { prisma } from "../../config/prisma.js";
import { generateAutomationPlanWithAI } from "../../services/automation.service.js";

export async function generateAutomationPlanStep({ chatId, userId }) {
  const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
  if (!chat) {
    return { success: false, error: "Chat not found" };
  }

  const [productIntelligence, competitorIntelligence, campaignIntelligence, seoIntelligence] = await Promise.all([
    prisma.productIntelligence.findUnique({ where: { chatId } }),
    prisma.competitorIntelligence.findUnique({ where: { chatId } }),
    prisma.campaignIntelligence.findUnique({ where: { chatId } }),
    prisma.seoIntelligence.findUnique({ where: { chatId }, include: { scoreBreakdown: true } }),
  ]);

  const readinessModules = {
    productAnalysis: !!productIntelligence?.productAnalysis,
    marketDiscovery: !!productIntelligence?.marketDiscovery,
    audienceIntelligence: !!productIntelligence?.audienceIntelligence,
    competitorAnalysis: !!competitorIntelligence?.competitorAnalysis,
    campaignGenerator: !!campaignIntelligence?.campaignGenerator,
    channelRecommendation: !!campaignIntelligence?.channelRecommendation,
    seoAnalysis: !!seoIntelligence?.seoScore,
  };

  const completedModules = Object.values(readinessModules).filter(Boolean).length;
  const readinessScore = Math.round((completedModules / 7) * 100);

  const automationData = await generateAutomationPlanWithAI({
    productIntelligence,
    competitorIntelligence,
    campaignIntelligence,
    seoIntelligence,
    chatTitle: chat.title,
    productName: chat.productName,
  });

  await prisma.automationPlan.deleteMany({ where: { chatId } });

  const { source: _s, confidence: _c, isFallback: _i, ...planData } = automationData;

  const automationPlan = await prisma.automationPlan.create({
    data: {
      userId,
      chatId,
      ...planData,
      readinessScore,
      status: "draft",
    },
  });

  const assets = [];

  if (automationData.emailSequence && Array.isArray(automationData.emailSequence)) {
    for (let i = 0; i < automationData.emailSequence.length; i++) {
      const email = automationData.emailSequence[i];
      assets.push({
        automationPlanId: automationPlan.id,
        assetType: "email",
        assetTitle: email.subject || `Email ${i + 1}`,
        assetContent: email,
        channel: "email",
        status: "draft",
      });
    }
  }

  if (automationData.linkedInPosts && Array.isArray(automationData.linkedInPosts)) {
    for (let i = 0; i < automationData.linkedInPosts.length; i++) {
      const post = automationData.linkedInPosts[i];
      assets.push({
        automationPlanId: automationPlan.id,
        assetType: "linkedin_post",
        assetTitle: post.title || `LinkedIn Post ${i + 1}`,
        assetContent: post,
        channel: "linkedin",
        status: "draft",
      });
    }
  }

  if (automationData.instagramCaptions && Array.isArray(automationData.instagramCaptions)) {
    for (let i = 0; i < automationData.instagramCaptions.length; i++) {
      const caption = automationData.instagramCaptions[i];
      assets.push({
        automationPlanId: automationPlan.id,
        assetType: "instagram_post",
        assetTitle: caption.title || `Instagram Post ${i + 1}`,
        assetContent: caption,
        channel: "instagram",
        status: "draft",
      });
    }
  }

  if (automationData.videoScripts && Array.isArray(automationData.videoScripts)) {
    for (let i = 0; i < automationData.videoScripts.length; i++) {
      const video = automationData.videoScripts[i];
      assets.push({
        automationPlanId: automationPlan.id,
        assetType: "video_ad",
        assetTitle: video.title || `Video Ad ${i + 1}`,
        assetContent: video,
        channel: "video",
        status: "draft",
      });
    }
  }

  if (automationData.posterPrompts && Array.isArray(automationData.posterPrompts)) {
    for (let i = 0; i < automationData.posterPrompts.length; i++) {
      const poster = automationData.posterPrompts[i];
      assets.push({
        automationPlanId: automationPlan.id,
        assetType: "image_ad",
        assetTitle: poster.title || `Image Ad ${i + 1}`,
        assetContent: poster,
        channel: "image",
        status: "draft",
      });
    }
  }

  if (assets.length > 0) {
    await prisma.automationAsset.createMany({ data: assets });
  }

  await prisma.automationLog.create({
    data: {
      userId,
      chatId,
      action: "generated",
      message: `Workflow automation plan generated with ${assets.length} assets`,
      metadata: { readinessScore, assetsCount: assets.length, source: "workflow" },
    },
  });

  const completePlan = await prisma.automationPlan.findUnique({
    where: { id: automationPlan.id },
    include: { assets: { orderBy: { createdAt: "asc" } } },
  });

  return { success: true, plan: completePlan, readinessModules };
}

export async function getAutomationPlanStatus({ chatId, userId }) {
  const plan = await prisma.automationPlan.findUnique({
    where: { chatId },
    include: { assets: { orderBy: { createdAt: "asc" } } },
  });

  if (!plan) {
    return { success: true, exists: false, plan: null };
  }

  if (plan.userId !== userId) {
    return { success: false, error: "Unauthorized" };
  }

  const assetCounts = {};
  for (const asset of plan.assets) {
    assetCounts[asset.status] = (assetCounts[asset.status] || 0) + 1;
  }

  return {
    success: true,
    exists: true,
    plan,
    summary: {
      totalAssets: plan.assets.length,
      byStatus: assetCounts,
      byChannel: plan.assets.reduce((acc, a) => {
        acc[a.channel] = (acc[a.channel] || 0) + 1;
        return acc;
      }, {}),
    },
  };
}
