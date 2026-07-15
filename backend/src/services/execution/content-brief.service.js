import { getLatestEvidenceSnapshot } from '../../modules/evidence/evidence.service.js';
import { asArray, takeArray } from '../normalizers/array-helpers.js';
import { normalizeSeoForExecution } from '../normalizers/seo-intelligence.normalizer.js';
import { normalizeProductIntelligence, normalizeFeatures, normalizeBenefits, featureToText, benefitToText } from '../normalizers/product-intelligence.normalizer.js';
import { getSeoIntelligenceForChat } from '../loaders/seo-intelligence.loader.js';
import { getProductIntelligenceForChat } from '../loaders/product-intelligence.loader.js';
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
    getProductIntelligenceForChat({ prisma, userId, chatId }),
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

  if (!productIdentity.resolved || !productIdentity.productName) {
    console.warn("[Content Brief] Product identity unresolved", {
      chatId, userId,
      productName: productIdentity.productName,
      source: productIdentity.source,
    });
    return {
      rejected: true,
      reason: 'The product identity could not be resolved from the current analysis.',
      code: 'PRODUCT_IDENTITY_UNRESOLVED',
      readiness: {
        ready: false,
        missingRequired: ['PRODUCT_IDENTITY'],
        missingOptional: normalizedSeo.available ? [] : ['SEO_INTELLIGENCE'],
      },
    };
  }

  // PART 2: Normalize product features and benefits
  const normalizedProduct = normalizeProductIntelligence(productIntel);
  console.info("[Content Brief] Product normalized", {
    featuresCount: normalizedProduct.features.length,
    benefitsCount: normalizedProduct.benefits.length,
    warnings: normalizedProduct.warnings
  });

  // PART 2b: Derive conservative capabilities from summary/USP when no features exist
  const derivedFeatures = [];
  const hasExplicitFeatures = normalizedProduct.features.length > 0
    || (productAnalysis.features && productAnalysis.features.length > 0)
    || (productAnalysis.capabilities && productAnalysis.capabilities.length > 0)
    || (website.featuresText && website.featuresText.length > 0);
  if (!hasExplicitFeatures) {
    const summary = productAnalysis.summary || productAnalysis.productSummary || '';
    const usp = productAnalysis.usp || '';
    const textToParse = (summary + ' ' + usp).toLowerCase();
    const capabilityPatterns = [
      { name: 'Video trend tracking', keywords: ['trend', 'viral', 'video', 'short-form'] },
      { name: 'Creator monitoring', keywords: ['creator', 'influencer', 'content creator'] },
      { name: 'Competitor monitoring', keywords: ['competitor', 'competitive', 'compete'] },
      { name: 'Platform analytics', keywords: ['analytics', 'insight', 'data', 'measure'] },
      { name: 'Content discovery', keywords: ['discover', 'find', 'content research', 'content planning'] },
      { name: 'Social listening', keywords: ['listen', 'social listening', 'monitor'] },
    ];
    capabilityPatterns.forEach(({ name, keywords }) => {
      const matched = keywords.some(k => textToParse.includes(k));
      if (matched) {
        derivedFeatures.push({
          name,
          description: null,
          benefit: null,
          evidence: null,
          inferenceStatus: 'AI_INFERRED_FROM_EVIDENCE',
        });
      }
    });
    if (derivedFeatures.length > 0) {
      console.info('[Content Brief] Derived capabilities from summary/USP:', derivedFeatures.map(f => f.name));
    }
  }

  // PART 5: Filter low-quality SEO keywords
  const LOW_QUALITY_KEYWORDS = new Set([
    'started', 'alerts', 'outlier', 'shorts', 'text', 'tracking', 'trends',
    'content', 'alert', 'product', 'home', 'page', 'app', 'get', 'use',
    'how', 'what', 'why', 'when', 'where', 'login', 'signup', 'sign up',
    'register', 'pricing', 'features', 'blog', 'docs', 'documentation',
    'support', 'contact', 'about', 'careers', 'help', 'search', 'setting',
    'settings', 'dashboard', 'profile', 'account', 'billing',
  ]);

  const filteredKeywords = normalizedSeo.keywords.filter(k => {
    const keyword = (typeof k === 'string' ? k : (k.keyword || k.phrase || k.text || '')).trim().toLowerCase();
    if (!keyword || keyword.length < 3) return false;
    if (LOW_QUALITY_KEYWORDS.has(keyword)) return false;
    if (/^\d+$/.test(keyword)) return false;
    if (keyword.startsWith('http') || keyword.startsWith('www')) return false;
    return true;
  });

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
      features: derivedFeatures.length > 0 ? derivedFeatures : (normalizedProduct.features.length > 0
        ? normalizedProduct.features
        : normalizeFeatures(takeArray(
            productAnalysis.features
            || productAnalysis.capabilities
            || productAnalysis.keyFeatures
            || productAnalysis.productFeatures
            || productAnalysis.differentiators
            || website.featuresText
            || [], 15))),
      benefits: normalizedProduct.benefits.length > 0
        ? normalizedProduct.benefits
        : normalizeBenefits(takeArray(
            productAnalysis.benefits
            || productAnalysis.coreBenefits
            || productAnalysis.valuePropositions
            || productAnalysis.advantages
            || [], 10)),
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
    verifiedKeywords: filteredKeywords.slice(0, 20),
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
    console.warn('[Content Brief] Validation warnings (non-blocking)', validation.errors);
    for (const err of validation.errors) {
      brief.warnings.push(`Schema: ${err.path} — ${err.message}`);
    }
  }

  return {
    success: true,
    data: brief,
    warnings: brief.warnings
  };
}

export default { buildContentBrief };
