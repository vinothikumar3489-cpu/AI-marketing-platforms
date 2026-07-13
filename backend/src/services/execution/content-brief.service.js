import { getLatestEvidenceSnapshot } from '../../modules/evidence/evidence.service.js';

/**
 * Canonical ContentBrief — shared input for every content generator.
 * Sources every field with provenance metadata.
 */
export async function buildContentBrief(prisma, userId, chatId) {
  if (!prisma || !userId || !chatId) {
    throw new Error('prisma, userId, and chatId required');
  }

  console.info("[Content Brief] Building brief", { chatId, userId });

  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat || chat.userId !== userId) {
    console.warn("[Content Brief] Chat not found or owner mismatch", { chatId, userId });
    return { rejected: true, reason: 'Chat not found or owner mismatch', code: 'CHAT_ERROR' };
  }

  const evidenceSnapshot = await getLatestEvidenceSnapshot({ prisma, userId, chatId });
  const raw = evidenceSnapshot?.evidence || {};

  const [productIntel, competitorIntel, seoIntel] = await Promise.all([
    prisma.productIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
    prisma.competitorIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
    prisma.seoIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
  ]);

  console.info("[Content Brief] Evidence loaded", {
    chatId,
    userId,
    hasProductIntel: Boolean(productIntel),
    hasCompetitorIntel: Boolean(competitorIntel),
    hasSeoIntel: Boolean(seoIntel),
    hasEvidenceSnapshot: Boolean(evidenceSnapshot)
  });

  const productAnalysis = productIntel?.productAnalysis || {};
  const audienceData = productIntel?.audienceIntelligence || {};
  const competitorData = competitorIntel?.competitorAnalysis || {};
  const seoInfo = seoIntel || {};
  const website = raw.website || {};

  const productName = chat.productName || productAnalysis.name || null;
  if (!productIntel) {
    console.warn("[Content Brief] ProductIntelligence missing", { chatId, userId });
    return { rejected: true, reason: 'Complete Growth Analysis before generating content.', code: 'EVIDENCE_MISSING' };
  }

  const brief = {
    company: {
      name: chat.title || null,
      productName,
      websiteUrl: chat.websiteUrl || null,
      industry: productAnalysis.industry || null,
    },
    product: {
      name: productName,
      summary: productAnalysis.summary || productAnalysis.productSummary || null,
      features: (website.featuresText || productAnalysis.features || []).slice(0, 15),
      benefits: (productAnalysis.benefits || productAnalysis.coreBenefits || []).slice(0, 10),
      usp: productAnalysis.usp || null,
    },
    website: {
      title: website.title || null,
      metaDescription: website.metaDescription || null,
      heroText: website.heroText || null,
      ctaTexts: (website.ctaTexts || []).slice(0, 5),
      pageTypes: website.pageTypes || null,
      technologyHints: (website.technologyHints || []).slice(0, 10),
    },
    targetPersonas: (audienceData.buyerPersonas || []).slice(0, 5).map(p => ({
      name: p.name || p.title || null,
      role: p.role || null,
      painPoints: (p.painPoints || []).slice(0, 5),
      goals: (p.goals || []).slice(0, 5),
    })),
    painPoints: (audienceData.painPoints || []).slice(0, 10),
    objections: productAnalysis.objections || audienceData.objections || [],
    validatedCompetitors: (competitorData.competitors || competitorData.directCompetitors || []).slice(0, 10).map(c => ({
      name: c.name || c.url || null,
      domain: c.domain || c.url || null,
      strengths: (c.strengths || []).slice(0, 5),
      weaknesses: (c.weaknesses || []).slice(0, 5),
    })),
    verifiedKeywords: (seoInfo.keywordOpportunities || seoInfo.keywordIntelligence?.primaryKeywords || []).slice(0, 20).map(k => ({
      keyword: k.keyword || k.term || k,
      volume: k.volume ?? k.searchVolume ?? null,
      difficulty: k.difficulty ?? k.keywordDifficulty ?? null,
    })),
    topicIdeas: (seoInfo.contentOpportunities || seoInfo.contentGaps || []).slice(0, 10).map(o => ({
      topic: o.opportunity || o.topic || o.title || null,
      reason: o.reason || null,
    })),
    contentGaps: (seoInfo.contentGaps || []).slice(0, 10),
    tone: 'professional',
    CTA: (website.ctaTexts || []).slice(0, 3),
    evidenceSources: {
      hasEvidenceSnapshot: !!evidenceSnapshot,
      hasProductIntel: !!productIntel,
      hasCompetitorIntel: !!competitorIntel,
      hasSeoIntel: !!seoIntel,
    },
    limitations: [],
    _briefId: `brief_${chatId}_${Date.now()}`,
    _chatId: chatId,
    _userId: userId,
    _builtAt: new Date().toISOString(),
  };

  if (!brief.product.usp) brief.limitations.push('No verified USP available');
  if (!brief.product.features.length) brief.limitations.push('No product features extracted from website');
  if (!brief.targetPersonas.length) brief.limitations.push('No buyer personas defined');
  if (!brief.painPoints.length) brief.limitations.push('No audience pain points from evidence');
  if (!brief.validatedCompetitors.length) brief.limitations.push('No validated competitors');

  return brief;
}

export default { buildContentBrief };
