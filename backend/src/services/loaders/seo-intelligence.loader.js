/**
 * Canonical SEO Intelligence Loader
 * Shared loader for all modules to ensure consistent SEO data retrieval
 */

/**
 * Get SEO Intelligence for a chat
 * Uses the same query pattern across all modules
 */
export async function getSeoIntelligenceForChat({ prisma, userId, chatId }) {
  if (!prisma || !userId || !chatId) {
    return null;
  }

  try {
    // Check if SeoIntelligence has direct userId field or uses relation
    const seoIntel = await prisma.seoIntelligence.findFirst({
      where: {
        chatId,
        userId
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return seoIntel;
  } catch (error) {
    console.error('[SEO Loader] Error loading SEO intelligence:', error);
    return null;
  }
}

export default { getSeoIntelligenceForChat };
