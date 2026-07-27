
import prisma from "../../../config/prisma.js";
import { generateMarketDiscovery } from "../../../ai/services/marketDiscovery.service.js";

export async function runMarketDiscovery({ chatId, userId, input } = {}) {
  const { productName, industry, targetCountry, targetAudience, businessStage } = input || {};

  // Validate required fields
  if (!productName || !industry) {
    return { success: false, error: "productName and industry are required" };
  }

  try {
    // Verify chat ownership
    let finalChat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });
    if (!finalChat) {
      return { success: false, error: "Chat not found or not owned by user" };
    }
    const finalChatId = finalChat.id;
    
    // Generate market discovery via our new AI router
    const aiResult = await generateMarketDiscovery(input);

    if (!aiResult.success) {
      return { success: false, error: aiResult.error || "Failed to generate market discovery" };
    }

    // Save to ProductIntelligence table
    const saved = await prisma.productIntelligence.upsert({
      where: { chatId: finalChatId },
      create: {
        chatId: finalChatId,
        userId,
        marketDiscovery: aiResult.data,
        provider: aiResult.provider,
        fallbackUsed: aiResult.fallbackUsed,
        inputJson: input,
        status: "completed"
      },
      update: {
        marketDiscovery: aiResult.data,
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
        content: `Market Discovery complete for ${productName}`,
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
    console.error("marketDiscovery save error", e);
    return { success: false, error: e.message };
  }
}

