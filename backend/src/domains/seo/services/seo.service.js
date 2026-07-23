
import { prisma } from "../../../config/prisma.js";
import { generateSeoIntelligence } from '../../../../ai/services/seoIntelligence.service.js';

export async function runSeoAudit({ chatId, userId, input } = {}) {
  try {
    // Verify chat ownership
    let finalChat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });
    if (!finalChat) {
      return { success: false, error: "Chat not found or not owned by user" };
    }
    const finalChatId = finalChat.id;
    
    // Generate SEO intelligence via our new AI router
    const aiResult = await generateSeoIntelligence(input);

    if (!aiResult.success) {
      return { success: false, error: aiResult.error || "Failed to generate SEO intelligence" };
    }

    // Save to SeoIntelligence table
    const saved = await prisma.seoIntelligence.upsert({
      where: { chatId: finalChatId },
      create: {
        chatId: finalChatId,
        userId,
        seoAudit: aiResult.data,
        provider: aiResult.provider,
        fallbackUsed: aiResult.fallbackUsed,
        inputJson: input,
        status: "completed"
      },
      update: {
        seoAudit: aiResult.data,
        provider: aiResult.provider,
        fallbackUsed: aiResult.fallbackUsed,
        inputJson: input,
        status: "completed",
        updatedAt: new Date()
      }
    });

    // Also save a message to chat
    await prisma.message.create({
      data: {
        chatId: finalChatId,
        role: "assistant",
        content: `SEO Intelligence complete for ${input.websiteUrl || "your website"}`,
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
    console.error("SEO Intelligence error:", e);
    return { success: false, error: e.message };
  }
}

export async function getSeo({ chatId, userId } = {}) {
  const pi = await prisma.seoIntelligence.findUnique({ where: { chatId } });
  return pi;
}

