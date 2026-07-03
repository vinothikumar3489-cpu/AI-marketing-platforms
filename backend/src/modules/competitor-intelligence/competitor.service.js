
import { prisma } from "../../config/prisma.js";
import { generateCompetitorAnalysis } from "../../ai/services/competitorAnalysis.service.js";

export async function runCompetitorAnalysis({ chatId, userId, input } = {}) {
  try {
    // Verify chat ownership
    let finalChat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });
    if (!finalChat) {
      return { success: false, error: "Chat not found or not owned by user" };
    }
    const finalChatId = finalChat.id;
    
    // Parse competitorUrls if it's a string (comma-separated)
    let competitorUrls = input.competitorUrls;
    if (typeof competitorUrls === "string" && competitorUrls.trim()) {
      competitorUrls = competitorUrls.split(",").map(url => url.trim()).filter(url => url);
    } else if (!Array.isArray(competitorUrls)) {
      competitorUrls = [];
    }
    const processedInput = { ...input, competitorUrls };

    // Generate analysis using our new AI router
    const aiResult = await generateCompetitorAnalysis(processedInput);

    if (!aiResult.success) {
      return { success: false, error: aiResult.error || "Failed to generate competitor analysis" };
    }

    // Save to CompetitorIntelligence table
    const saved = await prisma.competitorIntelligence.upsert({
      where: { chatId: finalChatId },
      create: {
        chatId: finalChatId,
        userId,
        competitorAnalysis: aiResult.data,
        provider: aiResult.provider,
        fallbackUsed: aiResult.fallbackUsed,
        inputJson: processedInput,
        status: "completed"
      },
      update: {
        competitorAnalysis: aiResult.data,
        provider: aiResult.provider,
        fallbackUsed: aiResult.fallbackUsed,
        inputJson: processedInput,
        status: "completed",
        updatedAt: new Date()
      }
    });

    // Also save a message to chat
    await prisma.message.create({
      data: {
        chatId: finalChatId,
        role: "assistant",
        content: `Competitor Analysis complete for ${input.productName || "your product"}`,
        analysisData: aiResult.data
      }
    });

    return {
      success: true,
      result: {
        ...aiResult.data,
        provider: aiResult.provider,
        fallbackUsed: aiResult.fallbackUsed
      },
      saved
    };

  } catch (e) {
    console.error("Competitor Analysis error:", e);
    return { success: false, error: e.message };
  }
}

export async function runIntentPrediction({ chatId, userId, input } = {}) {
  // keep original mock for now
  const result = { intents: ['purchase', 'compare'], signals: ['pricing','features'] };
  await prisma.competitorIntelligence.upsert({ where: { chatId }, create: { chatId, userId, intentPrediction: result }, update: { intentPrediction: result } });
  return { success: true, result };
}

export async function runPositioning({ chatId, userId, input } = {}) {
  // keep original mock for now
  const result = { positioning: `Position ${input.productName || 'Product'} as faster, AI-first alternative.` };
  await prisma.competitorIntelligence.upsert({ where: { chatId }, create: { chatId, userId, positioningEngine: result }, update: { positioningEngine: result } });
  return { success: true, result };
}

