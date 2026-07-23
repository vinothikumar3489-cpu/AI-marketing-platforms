
import { z } from "zod";
import { prisma } from "../../../config/prisma.js";
import { runProductAnalysis } from '../../../ai/services/productAnalysis.service.js';

const ProductAnalysisRequestSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  websiteUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  description: z.string().optional(),
  targetMarket: z.string().optional(),
  chatId: z.string().min(1, "Chat ID is required")
});

export const runProductAnalysisController = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // Validate input
    const validatedData = ProductAnalysisRequestSchema.parse({
      ...req.body,
      chatId: req.params.chatId
    });

    const result = await runProductAnalysis(userId, validatedData.chatId, validatedData);

    // Also save product profile using the final chatId
    await prisma.productProfile.upsert({
      where: { chatId: result.chatId },
      create: {
        chatId: result.chatId,
        userId: userId,
        productName: validatedData.productName,
        websiteUrl: validatedData.websiteUrl || null,
        description: validatedData.description || null,
        targetAudience: validatedData.targetMarket || null
      },
      update: {
        productName: validatedData.productName,
        websiteUrl: validatedData.websiteUrl || null,
        description: validatedData.description || null,
        targetAudience: validatedData.targetMarket || null
      }
    });

    // Get the saved product profile and analysis
    const productProfile = await prisma.productProfile.findUnique({ where: { chatId: result.chatId } });
    const productAnalysis = await prisma.productAnalysis.findUnique({ where: { chatId: result.chatId } });

    res.status(200).json({
      success: true,
      data: result.data,
      provider: result.provider,
      fallbackUsed: result.fallbackUsed,
      productProfile,
      productAnalysis: {
        ...result.data,
        confidenceScore: 80, // Default for now
        category: "Technology"
      },
      chatId: result.chatId
    });
  } catch (error) {
    console.error("Product analysis controller error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: "Validation failed",
        details: error.errors
      });
    }
    
    res.status(500).json({ success: false, error: "Failed to run product analysis",
      message: error.message
    });
  }
};

export const getProductAnalysisController = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { chatId } = req.params;
    const analysis = await prisma.productAnalysis.findUnique({ where: { chatId } });
    if (!analysis || analysis.userId !== userId) {
      return res.status(404).json({ success: false, error: "Analysis not found" });
    }
    // Return our custom data from outputJson if available
    const data = analysis.outputJson || {
      productSummary: analysis.productSummary,
      targetAudience: analysis.targetUsers,
      painPoints: analysis.painPoints,
      uniqueValueProposition: Array.isArray(analysis.usp) ? analysis.usp[0] : analysis.usp,
      marketOpportunities: analysis.benefits,
      competitorIdeas: analysis.competitors,
      seoSuggestions: analysis.seoOpportunities,
      campaignIdeas: analysis.campaignIdeas,
      finalRecommendation: ""
    };
    res.json({
      ...data,
      confidenceScore: 80,
      category: "Technology",
      fallbackUsed: analysis.fallbackUsed,
      provider: analysis.provider,
      dataSourcesUsed: analysis.dataSourcesUsed
    });
  } catch (error) {
    console.error("Get product analysis error:", error);
    res.status(500).json({ success: false, error: "Failed to get product analysis" });
  }
};
