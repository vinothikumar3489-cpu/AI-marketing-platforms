import { getLatestEvidenceSnapshot } from '../../modules/evidence/evidence.service.js';
import { asArray, takeArray } from '../normalizers/array-helpers.js';
import { normalizeSeoForExecution } from '../normalizers/seo-intelligence.normalizer.js';
import { getSeoIntelligenceForChat } from '../loaders/seo-intelligence.loader.js';
import { resolveProductIdentity } from '../resolvers/product-identity.resolver.js';
import { validateContentBrief } from '../validators/content-brief.schema.js';

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
    getSeoIntelligenceForChat({ prisma, userId, chatId }),
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

  // PART 2: Log actual SEO JSON shape before normalization
  console.info("[Content Brief] SEO shape", {
    keywordOpportunitiesType: Array.isArray(seoInfo?.keywordOpportunities) ? "array" : typeof seoInfo?.keywordOpportunities,
    keywordOpportunityKeys: seoInfo?.keywordOpportunities && typeof seoInfo.keywordOpportunities === "object" ? Object.keys(seoInfo.keywordOpportunities).slice(0, 20) : [],
    keywordIntelligenceKeys: seoInfo?.keywordIntelligence && typeof seoInfo.keywordIntelligence === "object" ? Object.keys(seoInfo.keywordIntelligence).slice(0, 20) : [],
    contentGapsType: Array.isArray(seoInfo?.contentGaps) ? "array" : typeof seoInfo?.contentGaps,
    contentOpportunitiesType: Array.isArray(seoInfo?.contentOpportunities) ? "array" : typeof seoInfo?.contentOpportunities
  });

  // PART 3: Use canonical SEO normalizer
  const normalizedSeo = normalizeSeoForExecution(seoInfo);
  console.info("[Content Brief] SEO normalized", {
    available: normalizedSeo.available,
    keywordsCount: normalizedSeo.keywords.length,
    contentGapsCount: normalizedSeo.contentGaps.length,
    warnings: normalizedSeo.warnings
  });

  // PART 5: Use canonical product identity resolver
  const productIdentity = resolveProductIdentity({
    chat,
    productIntelligence: productIntel,
    evidenceSnapshot,
    website
  });
  console.info("[Content Brief] Product identity resolved", {
    productName: productIdentity.productName,
    brandName: productIdentity.brandName,
    source: productIdentity.source,
    domain: productIdentity.domain
  });

  if (!productIntel) {
    console.warn("[Content Brief] ProductIntelligence missing", { chatId, userId });
    return { rejected: true, reason: 'Complete Growth Analysis before generating content.', code: 'EVIDENCE_MISSING' };
  }

  const brief = {
    company: {
      name: productIdentity.companyName || chat.title || null,
      productName: productIdentity.productName,
      brandName: productIdentity.brandName,
      websiteUrl: productIdentity.websiteUrl || null,
      domain: productIdentity.domain || null,
      industry: productAnalysis.industry || null,
    },
    product: {
      name: productIdentity.productName,
      brandName: productIdentity.brandName,
      summary: productAnalysis.summary || productAnalysis.productSummary || null,
      features: takeArray(website.featuresText || productAnalysis.features, 15),
      benefits: takeArray(productAnalysis.benefits || productAnalysis.coreBenefits, 10),
      usp: productAnalysis.usp || null,
    },
    website: {
      title: website.title || null,
      metaDescription: website.metaDescription || null,
      heroText: website.heroText || null,
      ctaTexts: takeArray(website.ctaTexts, 5),
      pageTypes: website.pageTypes || null,
      technologyHints: takeArray(website.technologyHints, 10),
    },
    targetPersonas: takeArray(audienceData.buyerPersonas, 5).map(p => ({
      name: p.name || p.title || null,
      role: p.role || null,
      painPoints: takeArray(p.painPoints, 5),
      goals: takeArray(p.goals, 5),
    })),
    painPoints: takeArray(audienceData.painPoints, 10),
    objections: asArray(productAnalysis.objections || audienceData.objections),
    validatedCompetitors: takeArray(competitorData.competitors || competitorData.directCompetitors, 10).map(c => ({
      name: c.name || c.url || null,
      domain: c.domain || c.url || null,
      strengths: takeArray(c.strengths, 5),
      weaknesses: takeArray(c.weaknesses, 5),
    })),
    verifiedKeywords: normalizedSeo.keywords.slice(0, 20),
    topicIdeas: normalizedSeo.blogIdeas.slice(0, 10),
    contentGaps: normalizedSeo.contentGaps.slice(0, 10),
    tone: 'professional',
    CTA: takeArray(website.ctaTexts, 3),
    evidenceSources: {
      hasEvidenceSnapshot: !!evidenceSnapshot,
      hasProductIntel: !!productIntel,
      hasCompetitorIntel: !!competitorIntel,
      hasSeoIntel: !!seoIntel,
    },
    limitations: [],
    warnings: [],
    _briefId: `brief_${chatId}_${Date.now()}`,
    _chatId: chatId,
    _userId: userId,
    _builtAt: new Date().toISOString(),
  };

  // PART 6: Add warnings for missing optional data instead of failing
  if (!brief.product.usp) brief.limitations.push('No verified USP available');
  if (!brief.product.features.length) brief.limitations.push('No product features extracted from website');
  if (!brief.targetPersonas.length) brief.warnings.push('No buyer personas defined - using generic audience');
  if (!brief.painPoints.length) brief.warnings.push('No audience pain points from evidence');
  if (!brief.validatedCompetitors.length) brief.warnings.push('No validated competitors - content may lack competitive context');
  
  // Add SEO warnings
  if (normalizedSeo.warnings.length > 0) {
    brief.warnings.push(...normalizedSeo.warnings);
  }
  if (brief.verifiedKeywords.length === 0) {
    brief.warnings.push('No keyword data available - content may lack SEO optimization');
  }

  // PART 7: Validate with Zod before returning
  const validation = validateContentBrief({
    success: true,
    data: brief,
    warnings: brief.warnings
  });

  if (!validation.valid) {
    console.error('[Content Brief] Validation failed', validation.errors);
    // Return the brief anyway but include validation errors as warnings
    brief.warnings.push(...validation.errors.map(e => `Validation: ${e.path} - ${e.message}`));
  }

  return {
    success: true,
    data: brief,
    warnings: brief.warnings
  };
}

export default { buildContentBrief };
