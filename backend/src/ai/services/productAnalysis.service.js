
import prisma from "../../config/prisma.js";
import { scrapeWebsite } from "../../domains/research/services/scraper.service.js";
import { generateProductAnalysis } from "../../domains/ai/services/aiOrchestrator.service.js";

export const runProductAnalysis = async (userId, chatId, inputData) => {
  const { productName, websiteUrl, description, targetMarket } = inputData;
  
  // Verify chat ownership or create a new one if needed
  let finalChat = await prisma.chat.findFirst({
    where: { id: chatId, userId }
  });
  
  if (!finalChat) {
    finalChat = await prisma.chat.create({
      data: {
        userId,
        title: productName || "New Product Analysis",
        productName: productName || null
      }
    });
  }
  
  const finalChatId = finalChat.id;
  
  let scrapedData = null;
  
  if (websiteUrl) {
    const scrapeResult = await scrapeWebsite({ websiteUrl, productName });
    if (scrapeResult.success) {
      scrapedData = scrapeResult.scrapedData;
    }
  }
  
  const aiResult = await generateProductAnalysis(
    { productName, description, targetMarket },
    scrapedData
  );
  
  if (!aiResult.success) {
    throw new Error(aiResult.error || "Failed to generate analysis");
  }

  console.log("🏷️ AI Provider used:", aiResult.provider);
  console.log("🔄 Fallback used:", aiResult.fallbackUsed);

  const data = aiResult.data && typeof aiResult.data === "object" ? aiResult.data : {};

  // Map AI output to the canonical ProductAnalysis columns. Fields that the AI
  // could not ground in evidence are omitted (undefined) so Prisma stores null
  // instead of fabricated content.
  const toArray = (value, ...fallbacks) => {
    const candidates = [value, ...fallbacks];
    for (const c of candidates) {
      if (Array.isArray(c)) {
        const cleaned = c.map((v) => (typeof v === "string" ? v.trim() : v)).filter(Boolean);
        if (cleaned.length) return cleaned;
      }
      if (typeof c === "string") {
        const cleaned = c.split(/[;,\n]/).map((s) => s.trim()).filter(Boolean);
        if (cleaned.length) return cleaned;
      }
    }
    return undefined;
  };
  const toStr = (value, ...fallbacks) => {
    for (const c of [value, ...fallbacks]) {
      if (typeof c === "string" && c.trim()) return c.trim();
      if (typeof c === "number" && Number.isFinite(c)) return String(c);
    }
    return undefined;
  };

  const productSummary = toStr(data.productSummary, data.summary);
  const usp = toArray(data.usp, data.uniqueValueProposition);
  const features = toArray(data.features, data.keyFeatures, scrapedData?.features);
  const benefits = toArray(data.benefits, data.coreBenefits, scrapedData?.benefits);
  const painPoints = toArray(data.painPoints, data.painPointsSolved);
  const targetUsers = toArray(data.targetUsers, data.targetAudience);
  const buyerPersonas = toArray(data.buyerPersonas);
  const competitors = toArray(data.competitors, data.directCompetitors, data.competitorIdeas);
  const seoOpportunities = toArray(data.seoOpportunities, data.seoSuggestions);
  const campaignIdeas = toArray(data.campaignIdeas);
  const recommendedChannels = toArray(data.recommendedChannels);

  // Save to ProductAnalysis table
  const savedAnalysis = await prisma.productAnalysis.upsert({
    where: { chatId: finalChatId },
    create: {
      userId,
      chatId: finalChatId,
      productSummary,
      usp,
      features,
      benefits,
      painPoints,
      targetUsers,
      buyerPersonas,
      competitors,
      seoOpportunities,
      campaignIdeas,
      recommendedChannels,
      dataSourcesUsed: [
        "Manual input",
        ...(scrapedData ? ["Website scraping"] : []),
        `AI: ${aiResult.provider || "unknown"}`
      ],
      source: aiResult.provider,
      // Save our custom fields in inputJson/outputJson
      inputJson: { productName, websiteUrl, description, targetMarket },
      outputJson: data,
      provider: aiResult.provider,
      fallbackUsed: aiResult.fallbackUsed
    },
    update: {
      productSummary,
      usp,
      features,
      benefits,
      painPoints,
      targetUsers,
      buyerPersonas,
      competitors,
      seoOpportunities,
      campaignIdeas,
      recommendedChannels,
      dataSourcesUsed: [
        "Manual input",
        ...(scrapedData ? ["Website scraping"] : []),
        `AI: ${aiResult.provider || "unknown"}`
      ],
      source: aiResult.provider,
      inputJson: { productName, websiteUrl, description, targetMarket },
      outputJson: data,
      provider: aiResult.provider,
      fallbackUsed: aiResult.fallbackUsed,
      updatedAt: new Date()
    }
  });

  // Save a message to chat history
  await prisma.message.create({
    data: {
      chatId: finalChatId,
      role: "assistant",
      content: productSummary || `${productName || "Product"} analysis complete.`,
      analysisData: data
    }
  });

  return {
    success: true,
    data,
    provider: aiResult.provider,
    fallbackUsed: aiResult.fallbackUsed,
    savedAnalysis,
    chatId: finalChatId
  };
};
