import { getLatestEvidenceSnapshot } from '../../modules/evidence/evidence.service.js';

/**
 * Canonical ContentBrief — shared input for every content generator.
 * Sources every field with provenance metadata.
 */
export async function buildContentBrief(prisma, userId, chatId) {
  if (!prisma || !userId || !chatId) {
    throw new Error('prisma, userId, and chatId required');
  }

  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat || chat.userId !== userId) {
    return { rejected: true, reason: 'Chat not found or owner mismatch', code: 'CHAT_ERROR' };
  }

  const evidenceSnapshot = await getLatestEvidenceSnapshot({ prisma, userId, chatId });
  if (!evidenceSnapshot) {
    return { rejected: true, reason: 'No evidence snapshot — run an analysis first', code: 'EVIDENCE_MISSING' };
  }

  const raw = evidenceSnapshot.evidence || {};

  const [productIntel, competitorIntel, seoIntel] = await Promise.all([
    prisma.productIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
    prisma.competitorIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
    prisma.seoIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null),
  ]);

  const productAnalysis = productIntel?.productAnalysis || {};
  const audienceData = productIntel?.audienceIntelligence || {};
  const competitorData = competitorIntel?.competitorAnalysis || {};
  const seoInfo = seoIntel || {};
  const website = raw.website || {};

  const productName = chat.productName || productAnalysis.name || null;
  if (!productName && !website.featuresText?.length) {
    return { rejected: true, reason: 'Product identity missing — no name or features found', code: 'PRODUCT_IDENTITY_MISSING' };
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
      hasEvidenceSnapshot: true,
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
