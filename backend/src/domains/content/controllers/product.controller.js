import { z } from "zod";
import prisma from "../../../config/prisma.js";
import { scrapeWebsite } from "../../research/services/scraper.service.js";
import { analyzeProductIntelligence } from "../../../services/intelligence.service.js";

const profileSchema = z.object({
  productName: z.string().min(1),
  companyName: z.string().optional(),
  websiteUrl: z.string().optional(),
  description: z.string().optional(),
  industry: z.string().optional(),
  targetAudience: z.string().optional(),
  pricing: z.string().optional(),
  competitors: z.string().optional(),
  businessGoal: z.string().optional(),
});

export const upsertProductProfile = async (req, res) => {
  const { chatId } = req.params;
  const parse = profileSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ success: false, error: parse.error.errors[0].message });

  try {
    // Check if chat exists, create if not
    const existingChat = await prisma.chat.findUnique({ where: { id: chatId, userId: req.user.id } });
    if (!existingChat) {
      await prisma.chat.create({
        data: {
          id: chatId,
          title: parse.data.productName || "New Chat",
          productName: parse.data.productName || "New Chat",
          userId: req.user.id,
        },
      });
    }

    const data = { ...parse.data, chatId, userId: req.user.id };
    const profile = await prisma.productProfile.upsert({
      where: { chatId },
      create: data,
      update: { ...parse.data },
    });
    return res.json(profile);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Failed to save product profile" });
  }
};

export const getProductProfile = async (req, res) => {
  try {
    const { chatId } = req.params;
    const profile = await prisma.productProfile.findUnique({ where: { chatId } });
    if (!profile || profile.userId !== req.user.id) return res.status(404).json({ success: false, error: "Product profile not found" });
    return res.json(profile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Failed to get product profile" });
  }
};

export const runProductAnalysis = async (req, res) => {
  const { chatId } = req.params;
  const hasBody = req.body && Object.keys(req.body).length > 0;
  const manualParse = hasBody ? profileSchema.partial().safeParse(req.body) : null;
  const manual = manualParse?.success ? manualParse.data : null;
  if (manualParse && !manualParse.success) {
    return res.status(400).json({ success: false, error: manualParse.error.errors[0].message });
  }

  try {
    // Check if chat exists, create if not
    const existingChat = await prisma.chat.findUnique({ where: { id: chatId, userId: req.user.id } });
    if (!existingChat) {
      await prisma.chat.create({
        data: {
          id: chatId,
          title: manual?.productName || "New Chat",
          productName: manual?.productName || "New Chat",
          userId: req.user.id,
        },
      });
    }

    const existing = await prisma.productProfile.findUnique({ where: { chatId } });
    let profileData = existing;

    if (manual) {
      const createData = {
        chatId,
        userId: req.user.id,
        productName: manual.productName || existing?.productName || `Product ${chatId.slice(0, 6)}`,
        ...manual,
      };

      const updateData = { ...manual };

      if (!createData.productName) {
        return res.status(400).json({ success: false, error: "Product name is required to create or update a product profile." });
      }

      const up = await prisma.productProfile.upsert({
        where: { chatId },
        create: createData,
        update: updateData,
      });
      profileData = up;
    }

    if (!profileData) {
      return res.status(400).json({ success: false, error: "No product profile found to analyze." });
    }

    let scraped = { success: false, scrapedData: null };
    if (profileData.websiteUrl) {
      await prisma.productProfile.update({ where: { chatId }, data: { scrapeStatus: "running" } });
      try {
        scraped = await scrapeWebsite({ websiteUrl: profileData.websiteUrl, productName: profileData.productName, companyName: profileData.companyName });
      } catch (error) {
        console.warn("scrape failed", error);
      }
    }

    const mergedData = { manual: profileData, scraped: scraped.scrapedData || null };
    
    // Run new intelligence orchestrator
    console.log("🧠 Starting product intelligence analysis...");
    const intelligenceResult = await analyzeProductIntelligence(profileData, scraped.scrapedData || null);
    const analysisData = intelligenceResult.analysis;
    const providers = intelligenceResult.providers || intelligenceResult.providerStatus || {};

    console.log("✅ Intelligence analysis complete");
    console.log("📊 Providers:", providers);
    console.log("⚠️  Warnings:", intelligenceResult.warnings);

    // Build complete analysis object
    const completeAnalysis = {
      chatId,
      userId: req.user.id,
      productSummary: analysisData?.productSummary || "",
      category: analysisData?.category || "",
      confidenceScore: analysisData?.confidenceScore ?? 0,
      usp: analysisData?.usp || [],
      features: analysisData?.features || [],
      benefits: analysisData?.benefits || [],
      painPoints: analysisData?.painPoints || [],
      targetUsers: analysisData?.targetUsers || [],
      buyerPersonas: analysisData?.buyerPersonas || [],
      competitors: analysisData?.competitors || [],
      directCompetitors: analysisData?.directCompetitors || [],
      indirectCompetitors: analysisData?.indirectCompetitors || [],
      emergingCompetitors: analysisData?.emergingCompetitors || [],
      competitorTypes: analysisData?.competitors?.map((c) => c.type) || [],
      pricingPosition: analysisData?.pricingPosition || "",
      businessModel: analysisData?.businessModel || "",
      revenueModel: analysisData?.revenueModel || "",
      marketSegment: analysisData?.marketSegment || "",
      marketMaturity: analysisData?.marketMaturity || "",
      marketingAngles: analysisData?.marketingAngles || [],
      seoOpportunities: analysisData?.seoOpportunities || [],
      campaignIdeas: analysisData?.campaignIdeas || [],
      recommendedChannels: analysisData?.recommendedChannels || [],
      confidenceBreakdown: analysisData?.confidenceBreakdown || null,
      recommendedModules: analysisData?.recommendedModules || [],
      apiStatus: analysisData?.apiStatus || null,
      dataSourcesUsed: [
        ...(intelligenceResult.research?.source ? [`research:${intelligenceResult.research.source}`] : []),
        ...(scraped.success ? [`scraper:${scraped.scrapedData?.source || "cheerio"}`] : []),
        ...(providers.cerebras === "success" ? ["analysis:cerebras"] : []),
        ...(providers.deepseek === "success" ? ["analysis:deepseek"] : []),
        ...(providers.openrouter === "success" ? ["analysis:openrouter"] : []),
        ...(providers.groq === "success" ? ["analysis:groq"] : []),
        ...(providers.gemini === "success" ? ["analysis:gemini"] : []),
        ...(providers.usedProvider === "heuristic" ? ["analysis:heuristic"] : []),
      ],
      providers,
      warnings: intelligenceResult.warnings,
      source: providers.cerebras === "success"
        ? "cerebras"
        : providers.deepseek === "success"
        ? "deepseek"
        : providers.openrouter === "success"
        ? "openrouter"
        : providers.groq === "success"
        ? "groq"
        : providers.gemini === "success"
        ? "gemini"
        : "heuristic",
    };

    const saved = await prisma.productAnalysis.upsert({
      where: { chatId },
      create: completeAnalysis,
      update: completeAnalysis,
    });

    const updatedProfile = await prisma.productProfile.update({
      where: { chatId },
      data: {
        scrapedData: scraped.scrapedData || null,
        mergedData,
        scrapeStatus: scraped.success ? "completed" : "failed",
      },
    });

    const responseAnalysis = {
      productSummary: saved.productSummary || "",
      category: saved.category || "",
      confidenceScore: saved.confidenceScore ?? 0,
      usp: saved.usp || [],
      features: saved.features || [],
      benefits: saved.benefits || [],
      painPoints: saved.painPoints || [],
      buyerPersonas: saved.buyerPersonas || [],
      targetUsers: saved.targetUsers || [],
      competitors: saved.competitors || [],
      directCompetitors: saved.directCompetitors || [],
      indirectCompetitors: saved.indirectCompetitors || [],
      emergingCompetitors: saved.emergingCompetitors || [],
      competitorTypes: saved.competitorTypes || [],
      pricingPosition: saved.pricingPosition || "",
      businessModel: saved.businessModel || "",
      revenueModel: saved.revenueModel || "",
      marketSegment: saved.marketSegment || "",
      marketMaturity: saved.marketMaturity || "",
      marketingAngles: saved.marketingAngles || [],
      seoOpportunities: saved.seoOpportunities || [],
      campaignIdeas: saved.campaignIdeas || [],
      recommendedChannels: saved.recommendedChannels || [],
      confidenceBreakdown: saved.confidenceBreakdown || null,
      apiStatus: saved.apiStatus || null,
      recommendedModules: saved.recommendedModules || [],
      dataSourcesUsed: saved.dataSourcesUsed || [],
      providers: saved.providers || {},
      warnings: saved.warnings || [],
      source: saved.source || "heuristic",
    };

    return res.json({ 
      success: true, 
      productProfile: updatedProfile, 
      productAnalysis: responseAnalysis,
      scrapeSource: scraped.source || "none",
      scrapeStatus: scraped.success ? "completed" : "failed",
      aiProvider: saved.source || "heuristic",
      providerStatuses: saved.providers || {},
    });
  } catch (error) {
    console.error("runProductAnalysis error", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getProductAnalysis = async (req, res) => {
  try {
    const { chatId } = req.params;
    const a = await prisma.productAnalysis.findUnique({ where: { chatId } });
    if (!a || a.userId !== req.user.id) return res.status(404).json({ success: false, error: "Product analysis not found" });
    return res.json(a);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Failed to get product analysis" });
  }
};
