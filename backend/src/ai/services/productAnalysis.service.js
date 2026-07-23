
import { prisma } from "../../config/prisma.js";
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

  // Save to ProductAnalysis table
  const savedAnalysis = await prisma.productAnalysis.upsert({
    where: { chatId: finalChatId },
    create: {
      userId,
      chatId: finalChatId,
      productSummary: aiResult.data.productSummary,
      usp: [aiResult.data.uniqueValueProposition],
      features: aiResult.data.campaignIdeas, // repurpose for now
      benefits: aiResult.data.marketOpportunities,
      painPoints: aiResult.data.painPoints,
      targetUsers: aiResult.data.targetAudience,
      buyerPersonas: aiResult.data.targetAudience.map(name => ({ name })),
      competitors: aiResult.data.competitorIdeas,
      seoOpportunities: aiResult.data.seoSuggestions,
      campaignIdeas: aiResult.data.campaignIdeas,
      dataSourcesUsed: [
        "Manual input",
        ...(scrapedData ? ["Website scraping"] : []),
        `AI: ${aiResult.provider}`
      ],
      source: aiResult.provider,
      // Save our custom fields in inputJson/outputJson
      inputJson: { productName, websiteUrl, description, targetMarket },
      outputJson: aiResult.data,
      provider: aiResult.provider,
      fallbackUsed: aiResult.fallbackUsed
    },
    update: {
      productSummary: aiResult.data.productSummary,
      usp: [aiResult.data.uniqueValueProposition],
      features: aiResult.data.campaignIdeas,
      benefits: aiResult.data.marketOpportunities,
      painPoints: aiResult.data.painPoints,
      targetUsers: aiResult.data.targetAudience,
      buyerPersonas: aiResult.data.targetAudience.map(name => ({ name })),
      competitors: aiResult.data.competitorIdeas,
      seoOpportunities: aiResult.data.seoSuggestions,
      campaignIdeas: aiResult.data.campaignIdeas,
      dataSourcesUsed: [
        "Manual input",
        ...(scrapedData ? ["Website scraping"] : []),
        `AI: ${aiResult.provider}`
      ],
      source: aiResult.provider,
      inputJson: { productName, websiteUrl, description, targetMarket },
      outputJson: aiResult.data,
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
      content: aiResult.data.productSummary,
      analysisData: aiResult.data
    }
  });

  return {
    success: true,
    data: aiResult.data,
    provider: aiResult.provider,
    fallbackUsed: aiResult.fallbackUsed,
    savedAnalysis,
    chatId: finalChatId
  };
};
