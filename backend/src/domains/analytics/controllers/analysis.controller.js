import { z } from "zod";
import prisma from "../../../config/prisma.js";
import { generateAnalysis } from "../services/analysis.service.js";
import { scrapeWebsite } from "../../research/services/scraper.service.js";
import { collectEvidence } from '../../../modules/evidence/evidence.service.js';

const analysisSchema = z.object({
  chatId: z.string().optional(),
  productName: z.string().min(1),
  productDescription: z.string().min(1),
  targetAudience: z.string().min(1),
  companyName: z.string().optional(),
  industry: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  followUpQuestion: z.string().optional(),
});

export const analyzeProduct = async (req, res) => {
  try {
    const parseResult = analysisSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
    }

    const { chatId, productName, productDescription, targetAudience, companyName, industry, websiteUrl, followUpQuestion } = parseResult.data;

    let scrapedData = {};
    let evidenceContext = "";
    if (websiteUrl) {
      try {
        const scrapeResult = await scrapeWebsite({ websiteUrl, productName, companyName: companyName || productName });
        if (scrapeResult.success && scrapeResult.scrapedData) {
          scrapedData = {
            title: scrapeResult.scrapedData.title || "",
            metaDescription: scrapeResult.scrapedData.metaDescription || "",
            cleanedText: scrapeResult.scrapedData.cleanedText || "",
            headings: scrapeResult.scrapedData.headings || [],
            features: scrapeResult.scrapedData.features || [],
            benefits: scrapeResult.scrapedData.benefits || [],
            websiteUrl,
          };
        }
      } catch (scrapeErr) {
        console.warn(`[Controller] Website scrape failed (non-fatal):`, scrapeErr.message);
      }

      // Collect evidence (non-fatal)
      try {
        const evidenceResult = await collectEvidence(websiteUrl, { companyName });
        if (evidenceResult.success) {
          evidenceContext = evidenceResult.contextString;
        }
      } catch (evidenceErr) {
        console.warn(`[Controller] Evidence collection failed (non-fatal):`, evidenceErr.message);
      }
    }

    let chat = null;
    if (chatId) {
      chat = await prisma.chat.findFirst({ where: { id: chatId, userId: req.user.id } });
      if (!chat) {
        return res.status(404).json({ success: false, error: "Chat not found" });
      }
    }

    const analysisResult = await generateAnalysis({ manualData: { productName, productDescription, targetAudience, companyName, industry, followUpQuestion }, scrapedData, evidenceContext });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          userId: req.user.id,
          title: productName,
          productName,
        },
      });
    } else {
      await prisma.chat.update({ where: { id: chat.id }, data: { title: productName, productName } });
    }

    const structured = analysisResult.structured || {};
    const userId = req.user.id;

    const userMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: "user",
        content: followUpQuestion || `Analyze product: ${productDescription}`,
      },
    });

    await prisma.analysis.create({
      data: {
        chatId: chat.id,
        userId,
        productName,
        productDescription,
        targetAudience,
        marketInsights: structured,
        competitorInsights: structured.competitors ? { competitors: structured.competitors } : null,
        campaignSuggestions: structured.campaignIdeas ? { campaignIdeas: structured.campaignIdeas } : null,
        roiSuggestions: structured.roiSuggestions ?? null,
      },
    });

    await prisma.productIntelligence.upsert({
      where: { chatId: chat.id },
      create: {
        chatId: chat.id,
        userId,
        productAnalysis: {
          productSummary: structured.productSummary || "",
          category: structured.category || "",
          confidenceScore: structured.confidenceScore || null,
          usp: structured.usp || "",
          features: structured.features || [],
          benefits: structured.benefits || [],
          painPoints: structured.painPoints || [],
          targetUsers: structured.targetUsers || [],
          buyerPersonas: structured.buyerPersonas || [],
          marketingAngles: structured.marketingAngles || [],
          recommendedModules: structured.recommendedModules || [],
          dataSourcesUsed: structured.dataSourcesUsed || [],
          warnings: structured.warnings || [],
        },
        marketDiscovery: {
          productName,
          productDescription,
          targetAudience,
          industry: structured.category || "",
          pricingPosition: structured.pricingPosition || "",
          marketMaturity: structured.marketMaturity || "",
          tam: structured.tam || null,
          sam: structured.sam || null,
          som: structured.som || null,
          marketTrends: structured.marketTrends || [],
          growthOpportunities: structured.growthOpportunities || [],
          growthRate: structured.growthRate || null,
          cagr: structured.cagr || null,
        },
        audienceIntelligence: {
          targetAudience,
          targetUsers: structured.targetUsers || [],
          buyerPersonas: structured.buyerPersonas || [],
          painPoints: structured.painPoints || [],
        },
        status: "completed",
        provider: analysisResult.message || "heuristic",
        fallbackUsed: analysisResult.message === "fallback" || analysisResult.message === "heuristic",
      },
      update: {
        productAnalysis: {
          productSummary: structured.productSummary || "",
          category: structured.category || "",
          confidenceScore: structured.confidenceScore || null,
          usp: structured.usp || "",
          features: structured.features || [],
          benefits: structured.benefits || [],
          painPoints: structured.painPoints || [],
          targetUsers: structured.targetUsers || [],
          buyerPersonas: structured.buyerPersonas || [],
          marketingAngles: structured.marketingAngles || [],
          recommendedModules: structured.recommendedModules || [],
          dataSourcesUsed: structured.dataSourcesUsed || [],
          warnings: structured.warnings || [],
        },
        marketDiscovery: {
          productName,
          productDescription,
          targetAudience,
          industry: structured.category || "",
          pricingPosition: structured.pricingPosition || "",
          marketMaturity: structured.marketMaturity || "",
          tam: structured.tam || null,
          sam: structured.sam || null,
          som: structured.som || null,
          marketTrends: structured.marketTrends || [],
          growthOpportunities: structured.growthOpportunities || [],
          growthRate: structured.growthRate || null,
          cagr: structured.cagr || null,
        },
        audienceIntelligence: {
          targetAudience,
          targetUsers: structured.targetUsers || [],
          buyerPersonas: structured.buyerPersonas || [],
          painPoints: structured.painPoints || [],
        },
        status: "completed",
        provider: analysisResult.message || "heuristic",
        fallbackUsed: analysisResult.message === "fallback" || analysisResult.message === "heuristic",
      },
    });

    const buildStructuredCompetitors = (raw) => {
      if (!Array.isArray(raw) || raw.length === 0) return [];
      return raw.map(c => {
        if (typeof c === "string") {
          return { name: c, domain: "", strengths: [], weaknesses: [], positioning: "", differentiationOpportunity: "" };
        }
        if (typeof c === "object" && c !== null) {
          return {
            name: c.name || "",
            domain: c.domain || "",
            strengths: Array.isArray(c.strengths) ? c.strengths : [],
            weaknesses: Array.isArray(c.weaknesses) ? c.weaknesses : [],
            positioning: c.positioning || "",
            differentiationOpportunity: c.differentiationOpportunity || "",
          };
        }
        return { name: String(c), domain: "", strengths: [], weaknesses: [], positioning: "", differentiationOpportunity: "" };
      });
    };

    const intentPrediction = {
      hotSegments: structured.buyerPersonas?.length ? structured.buyerPersonas.map(p => ({
        segment: typeof p === "string" ? p : p.name || p.segment || "",
        intent: "evaluate",
        confidence: null,
      })) : [],
      buyingSignals: structured.painPoints?.length ? structured.painPoints.map(pp => ({
        signal: typeof pp === "string" ? pp : pp.value || pp.signal || "",
        source: "product_analysis",
        confidence: null,
      })) : [],
      intentClusters: [],
      confidenceScore: null,
    };

    const positioningEngine = {
      positioningStatement: structured.usp || null,
      messagingPillars: structured.marketingAngles?.length ? structured.marketingAngles.map(a => ({
        pillar: typeof a === "string" ? a : a.value || a.pillar || "",
        focus: "differentiation",
        confidence: null,
      })) : [],
      differentiation: structured.differentiationOpportunities?.length ? structured.differentiationOpportunities.map(d => ({
        opportunity: typeof d === "string" ? d : d.value || d.opportunity || "",
        source: "competitor_analysis",
        confidence: null,
      })) : [],
      confidenceScore: null,
    };

    await prisma.competitorIntelligence.upsert({
      where: { chatId: chat.id },
      create: {
        chatId: chat.id,
        userId,
        competitorAnalysis: {
          competitorTypes: structured.competitorTypes || [],
          competitors: buildStructuredCompetitors(structured.competitors),
          pricingPosition: structured.pricingPosition || "",
          marketMaturity: structured.marketMaturity || "",
          marketGaps: structured.marketGaps || [],
          competitorWeaknesses: structured.competitorWeaknesses || [],
          differentiationOpportunities: structured.differentiationOpportunities || [],
        },
        intentPrediction,
        positioningEngine,
        status: "completed",
        provider: analysisResult.message || "heuristic",
      },
      update: {
        competitorAnalysis: {
          competitorTypes: structured.competitorTypes || [],
          competitors: buildStructuredCompetitors(structured.competitors),
          pricingPosition: structured.pricingPosition || "",
          marketMaturity: structured.marketMaturity || "",
          marketGaps: structured.marketGaps || [],
          competitorWeaknesses: structured.competitorWeaknesses || [],
          differentiationOpportunities: structured.differentiationOpportunities || [],
        },
        intentPrediction,
        positioningEngine,
        status: "completed",
        provider: analysisResult.message || "heuristic",
      },
    });

    const campaignCreativeAngles = structured.marketingAngles?.length ? structured.marketingAngles.map(a => ({
      value: typeof a === "string" ? a : a.value || a.angle || a.title || "",
      confidence: null,
      impact: null,
    })) : [];

    const campaignCopyHooks = structured.campaignIdeas?.length ? structured.campaignIdeas.map(ci => ({
      value: typeof ci === "string" ? ci : ci.value || ci.hook || ci.title || ci.headline || "",
      confidence: null,
      impact: null,
    })) : [];

    await prisma.campaignIntelligence.upsert({
      where: { chatId: chat.id },
      create: {
        chatId: chat.id,
        userId,
        campaignGenerator: {
          campaignIdeas: structured.campaignIdeas || [],
          marketingAngles: structured.marketingAngles || [],
          creativeAngles: campaignCreativeAngles,
          copyHooks: campaignCopyHooks,
          actionPlan: structured.actionPlan || null,
          targetAudience,
        },
        channelRecommendation: {
          bestChannels: structured.bestChannels || [],
          channelReasoning: structured.channelReasoning || null,
          channelPriority: structured.channelPriority || null,
          channelExpectedOutcome: structured.channelExpectedOutcome || null,
        },
        executiveStory: structured.executiveStory || null,
        actionPlan: structured.actionPlan || null,
        status: "completed",
        provider: analysisResult.message || "heuristic",
      },
      update: {
        campaignGenerator: {
          campaignIdeas: structured.campaignIdeas || [],
          marketingAngles: structured.marketingAngles || [],
          creativeAngles: campaignCreativeAngles,
          copyHooks: campaignCopyHooks,
          actionPlan: structured.actionPlan || null,
          targetAudience,
        },
        channelRecommendation: {
          bestChannels: structured.bestChannels || [],
          channelReasoning: structured.channelReasoning || null,
          channelPriority: structured.channelPriority || null,
          channelExpectedOutcome: structured.channelExpectedOutcome || null,
        },
        executiveStory: structured.executiveStory || null,
        actionPlan: structured.actionPlan || null,
        status: "completed",
        provider: analysisResult.message || "heuristic",
      },
    });

    if (structured.seoOpportunities && structured.seoOpportunities.length > 0) {
      await prisma.seoIntelligence.upsert({
        where: { chatId: chat.id },
        create: {
          chatId: chat.id,
          userId,
          productName,
          keywordOpportunities: { opportunities: structured.seoOpportunities },
          status: "completed",
        },
        update: {
          keywordOpportunities: { opportunities: structured.seoOpportunities },
          status: "completed",
        },
      });
    }

    await prisma.notification.create({
      data: {
        userId,
        title: "Product Analysis completed",
        message: `${productName} analysis was saved successfully.`,
        type: "analysis",
      },
    });

    const assistantMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: "assistant",
        content: analysisResult.message,
        analysisData: structured,
      },
    });

    return res.json({
      chat,
      analysis: analysisResult.structured,
      messages: [userMessage, assistantMessage],
    });
  } catch (error) {
    console.error(`[Controller] analyzeProduct error:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};
