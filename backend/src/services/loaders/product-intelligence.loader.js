/**
 * Canonical ProductIntelligence Loader
 * Shared loader for fetching ProductIntelligence records
 * Ensures consistent data access across all modules
 */

/**
 * Get the latest ProductIntelligence for a chat
 * Validates Chat ownership and returns the most recent record
 */
export async function getProductIntelligenceForChat({ prisma, userId, chatId }) {
  if (!prisma || !userId || !chatId) {
    console.warn('[ProductIntelligence Loader] Missing required parameters', { prisma: !!prisma, userId, chatId });
    return null;
  }

  try {
    // First verify chat ownership
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat || chat.userId !== userId) {
      console.warn('[ProductIntelligence Loader] Chat not found or owner mismatch', { chatId, userId });
      return null;
    }

    // Fetch the latest ProductIntelligence for this chat
    const productIntel = await prisma.productIntelligence.findFirst({
      where: { chatId },
      orderBy: { updatedAt: 'desc' }
    });

    if (!productIntel) {
      console.info('[ProductIntelligence Loader] No ProductIntelligence found', { chatId, userId });
      return null;
    }

    console.info('[ProductIntelligence Loader] ProductIntelligence loaded', {
      chatId,
      userId,
      productIntelId: productIntel.id,
      productName: productIntel.productName || productIntel.inputJson?.productName || '(in inputJson)',
      hasProductAnalysis: !!productIntel.productAnalysis,
      hasAudienceIntelligence: !!productIntel.audienceIntelligence
    });

    return productIntel;
  } catch (error) {
    console.error('[ProductIntelligence Loader] Error loading ProductIntelligence', {
      chatId,
      userId,
      error: error.message
    });
    return null;
  }
}

export default { getProductIntelligenceForChat };
