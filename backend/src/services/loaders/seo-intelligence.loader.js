/**
 * Canonical SEO Intelligence Loader
 * Shared loader for all modules to ensure consistent SEO data retrieval
 * Validates Chat ownership and returns the latest SeoIntelligence
 */

/**
 * Get the latest SeoIntelligence for a chat
 * Validates Chat ownership and returns the most recent record
 */
export async function getSeoIntelligenceForChat({ prisma, userId, chatId }) {
  if (!prisma || !userId || !chatId) {
    console.warn('[SEO Loader] Missing required parameters', { prisma: !!prisma, userId, chatId });
    return null;
  }

  // First verify chat ownership
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat || chat.userId !== userId) {
    console.warn('[SEO Loader] Chat not found or owner mismatch', { chatId, userId });
    return null;
  }

  // Use findUnique since chatId is @unique on SeoIntelligence
  // This matches the query pattern used by FullResults in chat.controller.js
  const seoIntel = await prisma.seoIntelligence.findUnique({
    where: { chatId },
    include: {
      technicalAuditDetail: true,
      scoreBreakdown: true,
      keywordIntelligence: true,
      geoIntelligence: true,
      competitorSeoRecord: true,
      contentGapRecord: true,
      blogIntelligenceRecord: true,
      executiveDashboard: true,
    }
  });

  if (!seoIntel) {
    console.info('[SEO Loader] No SeoIntelligence found', { chatId, userId });
    return null;
  }

  console.info('[SEO Loader] SeoIntelligence loaded', {
    chatId,
    userId,
    seoIntelId: seoIntel.id,
    hasKeywordOpportunities: !!seoIntel.keywordOpportunities,
    hasKeywordIntelligence: !!seoIntel.keywordIntelligence,
    hasContentGaps: !!seoIntel.contentGaps,
    hasTechnicalIssues: !!seoIntel.technicalIssues,
    hasTechnicalAuditDetail: !!seoIntel.technicalAuditDetail,
    hasScoreBreakdown: !!seoIntel.scoreBreakdown,
  });

  return seoIntel;
}

export default { getSeoIntelligenceForChat };
