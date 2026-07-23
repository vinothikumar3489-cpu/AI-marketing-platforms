
import { prisma } from "../../config/prisma.js";
import { generateAudienceIntelligence } from "../../ai/services/audienceIntelligence.service.js";

export async function runProductAnalysisForPI({ chatId, userId, input } = {}) {
  // Keep original implementation for now
  return { success: true, analysis: null };
}

export async function runAudienceAnalysis({ chatId, userId, input } = {}) {
  try {
    // Verify chat ownership
    let finalChat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });
    if (!finalChat) {
      return { success: false, error: "Chat not found or not owned by user" };
    }
    const finalChatId = finalChat.id;
    
    const aiResult = await generateAudienceIntelligence(input);

    if (!aiResult.success) {
      return { success: false, error: aiResult.error || "Failed to generate audience intelligence" };
    }

    const saved = await prisma.productIntelligence.upsert({
      where: { chatId: finalChatId },
      create: {
        chatId: finalChatId,
        userId,
        audienceIntelligence: aiResult.data,
        provider: aiResult.provider,
        fallbackUsed: aiResult.fallbackUsed,
        inputJson: input,
        status: "completed"
      },
      update: {
        audienceIntelligence: aiResult.data,
        provider: aiResult.provider,
        fallbackUsed: aiResult.fallbackUsed,
        inputJson: input,
        status: "completed",
        updatedAt: new Date()
      }
    });

    await prisma.message.create({
      data: {
        chatId: finalChatId,
        role: "assistant",
        content: `Audience Intelligence complete for ${input.productName || "your product"}`,
        analysisData: aiResult.data
      }
    });

    return { success: true, audience: { ...aiResult.data, provider: aiResult.provider, fallbackUsed: aiResult.fallbackUsed }, saved };

  } catch (e) {
    console.error("Audience Intelligence error:", e);
    return { success: false, error: e.message };
  }
}

export async function getProductIntelligence({ chatId, userId } = {}) {
  return prisma.productIntelligence.findUnique({ where: { chatId } });
}
