import { callAI } from '../../ai/services/aiRouter.service.js';
import { validateContentClaims, validateBriefContent } from './claim-validator.service.js';
import { validateContentOutput } from './content-schemas.js';

// ================================================
// SCHEMAS — output contracts per content type
// ================================================

const CONTENT_TYPES = {
  blog_article: {
    label: 'Blog Article',
    schema: {
      title: 'string — max 70 chars, product/industry specific',
      purpose: 'string — why this article exists',
      audience: 'string — who it is for from brief personas',
      targetTopic: 'string — from brief verifiedKeywords or topicIdeas',
      searchIntent: 'string — informational / commercial / navigational / transactional',
      outline: 'array of strings — section headings',
      article: 'string — full article body, product/evidence specific',
      metaTitle: 'string — max 60 chars',
      metaDescription: 'string — max 160 chars',
      internalLinkSuggestions: 'array of { text, url } or empty',
      cta: 'string — from brief CTA or product-specific',
      evidenceUsed: 'array of strings — which evidence fields were used',
      claimsRequiringReview: 'array of strings — claims that could not be verified',
    },
  },
  faq_page: {
    label: 'FAQ Page',
    schema: {
      title: 'string',
      purpose: 'string',
      audience: 'string',
      faqItems: 'array of { question, answer } — answers limited to verified product capabilities',
      evidenceUsed: 'array of strings',
      claimsRequiringReview: 'array of strings',
    },
  },
  landing_page: {
    label: 'Landing Page',
    schema: {
      headline: 'string — max 60 chars',
      subHeadline: 'string — max 120 chars',
      problem: 'string — audience problem from brief painPoints',
      solution: 'string — product solution from brief features/usp',
      featureBenefitBlocks: 'array of { feature, benefit, evidence }',
      objectionHandling: 'array of { objection, response } or empty',
      cta: 'string',
      seoMetadata: { metaTitle: 'string', metaDescription: 'string' },
      evidenceUsed: 'array of strings',
    },
  },
  product_page: {
    label: 'Product Page',
    schema: {
      title: 'string',
      purpose: 'string',
      productSummary: 'string — from brief product.summary',
      features: 'array of { feature, benefit, evidence }',
      cta: 'string',
      seoMetadata: { metaTitle: 'string', metaDescription: 'string' },
      evidenceUsed: 'array of strings',
    },
  },
  comparison_page: {
    label: 'Comparison Page',
    schema: {
      title: 'string',
      purpose: 'string',
      primaryProduct: 'string — from brief product.name',
      comparedCompetitors: 'array of { name, domain } — only from brief.validatedCompetitors',
      comparisonFields: 'array of { field, ourValue, competitorValue, source } — source must be evidence, unknown when unavailable',
      cta: 'string',
      evidenceUsed: 'array of strings',
      claimsRequiringReview: 'array of strings',
    },
  },
  feature_announcement: {
    label: 'Feature Announcement',
    schema: {
      title: 'string',
      purpose: 'string',
      featureName: 'string',
      featureDescription: 'string — from brief product.features',
      benefit: 'string',
      availability: 'string — null if unknown, never fabricate dates',
      cta: 'string',
      evidenceUsed: 'array of strings',
    },
  },
  whitepaper: {
    label: 'Whitepaper',
    schema: {
      title: 'string',
      purpose: 'string',
      audience: 'string',
      executiveSummary: 'string',
      sections: 'array of { heading, content }',
      conclusion: 'string',
      evidenceUsed: 'array of strings',
      limitations: 'array of strings — topics without evidence',
    },
  },
  linkedin_post: {
    label: 'LinkedIn Post',
    schema: {
      text: 'string — max 3000 chars, product/industry specific',
      hook: 'string — first line, max 150 chars',
      cta: 'string',
      evidenceUsed: 'array of strings',
    },
  },
  instagram_post: {
    label: 'Instagram Post',
    schema: {
      caption: 'string — max 2200 chars',
      hook: 'string — first line, max 125 chars',
      hashtags: 'array of strings — max 5, relevant to product/industry',
      cta: 'string',
      evidenceUsed: 'array of strings',
    },
  },
  twitter_post: {
    label: 'X (Twitter) Post',
    schema: {
      text: 'string — max 280 chars',
      cta: 'string — optional',
      evidenceUsed: 'array of strings',
    },
  },
  facebook_post: {
    label: 'Facebook Post',
    schema: {
      text: 'string — max 2000 chars',
      hook: 'string',
      cta: 'string',
      evidenceUsed: 'array of strings',
    },
  },
  youtube_description: {
    label: 'YouTube Description',
    schema: {
      title: 'string — max 70 chars',
      description: 'string — max 5000 chars, product/evidence specific',
      timestamps: 'array of { time, topic } or empty',
      links: 'array of { text, url } or empty',
      cta: 'string',
      evidenceUsed: 'array of strings',
    },
  },
  email_copy: {
    label: 'Email Copy',
    schema: {
      subjectLine: 'string — max 60 chars',
      previewText: 'string — max 100 chars',
      body: 'string — evidence-backed pain point and product value',
      cta: 'string — single CTA',
      personalizationFields: 'array of strings — variables like {{firstName}}',
      evidenceUsed: 'array of strings',
    },
  },
  creative_brief: {
    label: 'Creative Brief',
    schema: {
      objective: 'string — what the creative should achieve',
      audience: 'string — from brief targetPersonas',
      message: 'string — core message from brief USP',
      visualDirection: 'string — reference to product/industry',
      brandSignals: 'array of strings — from brief website.technologyHints or product.features',
      requiredText: 'string — text that must appear (overlaid, not burned in)',
      cta: 'string',
      format: 'string — poster/banner/social/display',
      evidenceLimitations: 'array of strings — what cannot be claimed',
    },
  },
  video_script: {
    label: 'Video Script',
    schema: {
      duration: 'string — 15s / 30s / 60s / 90s',
      scenes: 'array of { scene, narration, onScreenText, visual, evidencePoint, cta }',
      evidenceUsed: 'array of strings',
      limitations: 'array of strings',
    },
  },
};

export const CONTENT_TYPES_LIST = Object.keys(CONTENT_TYPES);
export { CONTENT_TYPES };

// ================================================
// GENERIC PROMPT BUILDER
// ================================================

function buildEvidenceSection(brief) {
  const lines = [];
  if (brief.product?.name) lines.push(`Product: ${brief.product.name}`);
  if (brief.product?.summary) lines.push(`Product Summary: ${brief.product.summary}`);
  if (brief.product?.usp) lines.push(`USP: ${brief.product.usp}`);
  if (brief.product?.features?.length) lines.push(`Features: ${brief.product.features.slice(0, 8).join('; ')}`);
  if (brief.product?.benefits?.length) lines.push(`Benefits: ${brief.product.benefits.slice(0, 5).join('; ')}`);
  if (brief.company?.industry) lines.push(`Industry: ${brief.company.industry}`);
  if (brief.targetPersonas?.length) lines.push(`Target Personas: ${brief.targetPersonas.map(p => p.name).filter(Boolean).join(', ')}`);
  if (brief.painPoints?.length) lines.push(`Pain Points: ${brief.painPoints.slice(0, 5).join('; ')}`);
  if (brief.objections?.length) lines.push(`Objections: ${brief.objections.slice(0, 3).join('; ')}`);
  if (brief.validatedCompetitors?.length) lines.push(`Competitors: ${brief.validatedCompetitors.map(c => c.name).filter(Boolean).join(', ')}`);
  if (brief.verifiedKeywords?.length) lines.push(`Keywords: ${brief.verifiedKeywords.map(k => k.keyword).filter(Boolean).slice(0, 10).join(', ')}`);
  if (brief.topicIdeas?.length) lines.push(`Topic Ideas: ${brief.topicIdeas.map(t => t.topic).filter(Boolean).slice(0, 5).join('; ')}`);
  if (brief.contentGaps?.length) lines.push(`Content Gaps: ${brief.contentGaps.slice(0, 5).join('; ')}`);
  if (brief.CTA?.length) lines.push(`Available CTAs from website: ${brief.CTA.join('; ')}`);
  if (brief.limitations?.length) lines.push(`Limitations: ${brief.limitations.join('; ')}`);
  return lines.join('\n');
}

// ================================================
// INDIVIDUAL GENERATORS
// ================================================

async function generateBlogArticle(brief) {
  const evidence = buildEvidenceSection(brief);
  const prompt = `Write a blog article. Use ONLY the evidence below.

EVIDENCE:
${evidence}

SCHEMA (return valid JSON):
{
  "title": "max 70 chars, product/industry specific",
  "purpose": "why this article exists",
  "audience": "who it is for",
  "targetTopic": "from evidence keywords or topic ideas",
  "searchIntent": "informational / commercial / navigational",
  "outline": ["Heading 1", "Heading 2"],
  "article": "full article body — make specific claims only where evidence exists",
  "metaTitle": "max 60 chars",
  "metaDescription": "max 160 chars",
  "internalLinkSuggestions": [],
  "cta": "single CTA, product-specific",
  "evidenceUsed": ["list of evidence fields used"],
  "claimsRequiringReview": ["any claims that could not be verified"]
}

RULES:
1. No statistics, testimonials, customer names, or awards.
2. No pricing or ROI claims.
3. Every factual claim must trace to evidence above.
4. Volume/difficulty only if present in evidence.
5. Return ONLY valid JSON. No markdown.`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Blog AI failed:`, e.message); }
  return null;
}

async function generateFAQ(brief) {
  const evidence = buildEvidenceSection(brief);
  const prompt = `Generate an FAQ page. Use ONLY evidence below.

EVIDENCE:
${evidence}

SCHEMA (return valid JSON):
{
  "title": "string",
  "purpose": "string",
  "audience": "string",
  "faqItems": [{"question": "derived from website gaps, schema, personas, or objections", "answer": "limited to verified product capabilities — no speculation"}],
  "evidenceUsed": [],
  "claimsRequiringReview": []
}

RULES:
1. Questions must come from: website content gaps, schema markups, persona pain points, or objections in evidence.
2. Answers limited to what evidence supports. Use "Information not available" for unknowns.
3. Return ONLY valid JSON. No markdown.`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] FAQ AI failed:`, e.message); }
  return null;
}

async function generateLandingPage(brief) {
  const evidence = buildEvidenceSection(brief);
  const prompt = `Generate a landing page. Use ONLY evidence below.

EVIDENCE:
${evidence}

SCHEMA (return valid JSON):
{
  "headline": "max 60 chars, from USP or feature",
  "subHeadline": "max 120 chars",
  "problem": "specific audience problem from pain points",
  "solution": "product solution from features/usp",
  "featureBenefitBlocks": [{"feature": "from evidence", "benefit": "from evidence or inferred", "evidence": "field name"}],
  "objectionHandling": [{"objection": "from objections", "response": "from verified capabilities"}],
  "cta": "one CTA from evidence or product-specific",
  "seoMetadata": {"metaTitle": "max 60 chars", "metaDescription": "max 160 chars"},
  "evidenceUsed": []
}

RULES:
1. No fake statistics, testimonials, or customer logos.
2. No pricing or comparison claims without evidence.
3. Return ONLY valid JSON. No markdown.`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Landing page AI failed:`, e.message); }
  return null;
}

async function generateProductPage(brief) {
  const evidence = buildEvidenceSection(brief);
  const prompt = `Generate a product page. Use ONLY evidence below.

EVIDENCE:
${evidence}

SCHEMA (return valid JSON):
{
  "title": "string",
  "purpose": "string",
  "productSummary": "from evidence product.summary",
  "features": [{"feature": "from evidence", "benefit": "from evidence or marked as inferred", "evidence": "field name"}],
  "cta": "string",
  "seoMetadata": {"metaTitle": "string", "metaDescription": "string"},
  "evidenceUsed": []
}

RULES:
1. No pricing — never fabricate price.
2. No comparisons without evidence counterparts.
3. Return ONLY valid JSON. No markdown.`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Product page AI failed:`, e.message); }
  return null;
}

async function generateComparisonPage(brief) {
  const evidence = buildEvidenceSection(brief);
  const competitors = brief.validatedCompetitors || [];
  const names = competitors.map(c => c.name).filter(Boolean).join(', ');

  if (!names) return {
    title: `${brief.product?.name || 'Product'} Comparison`,
    purpose: 'No validated competitors available for comparison',
    primaryProduct: brief.product?.name || 'Unknown',
    comparedCompetitors: [],
    comparisonFields: [],
    cta: brief.CTA?.[0] || 'Learn more',
    evidenceUsed: [],
    claimsRequiringReview: ['No validated competitors — comparison not possible'],
  };

  const prompt = `Generate a comparison page. Use ONLY evidence below.
Only compare competitors that appear in evidence. Never invent competitor data.

EVIDENCE:
${evidence}

VALIDATED COMPETITORS: ${names}

SCHEMA (return valid JSON):
{
  "title": "string",
  "purpose": "string",
  "primaryProduct": "from evidence",
  "comparedCompetitors": [{"name": "from evidence", "domain": "from evidence"}],
  "comparisonFields": [{"field": "feature/attribute", "ourValue": "from evidence or null", "competitorValue": "from competitor strengths/weaknesses or 'Unknown'", "source": "evidence field"}],
  "cta": "string",
  "evidenceUsed": [],
  "claimsRequiringReview": []
}

RULES:
1. ONLY compare competitors listed in validatedCompetitors.
2. For any competitor field where data is unavailable, set value to "Unknown".
3. Never claim product is cheaper, faster, safer, or better without direct evidence.
4. Return ONLY valid JSON. No markdown.`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Comparison AI failed:`, e.message); }
  return null;
}

async function generateFeatureAnnouncement(brief) {
  const evidence = buildEvidenceSection(brief);
  const prompt = `Generate a feature announcement. Use ONLY evidence below.

EVIDENCE:
${evidence}

SCHEMA (return valid JSON):
{
  "title": "string",
  "purpose": "string",
  "featureName": "from evidence features",
  "featureDescription": "from evidence features",
  "benefit": "from evidence or marked as inferred",
  "availability": null,
  "cta": "string",
  "evidenceUsed": []
}

RULES:
1. availability must be null — never fabricate release dates.
2. Only describe features present in evidence.
3. Return ONLY valid JSON. No markdown.`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Feature AI failed:`, e.message); }
  return null;
}

async function generateWhitepaper(brief) {
  const evidence = buildEvidenceSection(brief);
  const prompt = `Generate a whitepaper (industry analysis). Use ONLY evidence below.

EVIDENCE:
${evidence}

SCHEMA (return valid JSON):
{
  "title": "string",
  "purpose": "string",
  "audience": "string",
  "executiveSummary": "string — evidence-backed summary",
  "sections": [{"heading": "string", "content": "string — only claims supported by evidence"}],
  "conclusion": "string",
  "evidenceUsed": [],
  "limitations": ["topics where evidence was insufficient"]
}

RULES:
1. No fabricated research, statistics, or industry data.
2. Mark sections where evidence is thin as "limited evidence available".
3. Return ONLY valid JSON. No markdown.`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Whitepaper AI failed:`, e.message); }
  return null;
}

async function generateSocialPost(postType, brief) {
  const evidence = buildEvidenceSection(brief);
  const lengthGuides = {
    linkedin_post: 'max 3000 chars, professional tone',
    instagram_post: 'max 2200 chars, max 5 hashtags',
    twitter_post: 'max 280 chars',
    facebook_post: 'max 2000 chars',
    youtube_description: 'max 5000 chars with timestamps',
  };
  const lengthGuide = lengthGuides[postType] || 'standard social post length';

  const schemas = {
    linkedin_post: '{"text": "string", "hook": "first line max 150 chars", "cta": "string", "evidenceUsed": []}',
    instagram_post: '{"caption": "string", "hook": "first line max 125 chars", "hashtags": ["max 5"], "cta": "string", "evidenceUsed": []}',
    twitter_post: '{"text": "string max 280 chars", "cta": "string or null", "evidenceUsed": []}',
    facebook_post: '{"text": "string", "hook": "string", "cta": "string", "evidenceUsed": []}',
    youtube_description: '{"title": "max 70 chars", "description": "string", "timestamps": [], "links": [], "cta": "string", "evidenceUsed": []}',
  };

  const prompt = `Write a ${postType} for the product below.

EVIDENCE:
${evidence}

LENGTH: ${lengthGuide}

SCHEMA (return valid JSON):
${schemas[postType] || schemas.linkedin_post}

RULES:
1. Platform-appropriate length and tone.
2. CTA must be specific to product.
3. No generic repeated captions — make it product/evidence specific.
4. Return ONLY valid JSON. No markdown.`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return { ...result.data, _platform: postType };
  } catch (e) { console.warn(`[ContentStudio] ${postType} AI failed:`, e.message); }
  return null;
}

async function generateEmailCopy(brief) {
  const evidence = buildEvidenceSection(brief);
  const prompt = `Generate an email copy for the product below.

EVIDENCE:
${evidence}

SCHEMA (return valid JSON):
{
  "subjectLine": "max 60 chars, product-specific",
  "previewText": "max 100 chars",
  "body": "evidence-backed pain point and product value — no generic copy",
  "cta": "single CTA",
  "personalizationFields": ["{{firstName}}"],
  "evidenceUsed": []
}

RULES:
1. Only use {{firstName}} for personalization.
2. Subject must be product/industry specific — no clickbait.
3. Do not invent statistics or testimonials.
4. Return ONLY valid JSON. No markdown.`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Email AI failed:`, e.message); }
  return null;
}

async function generateCreativeBrief(brief) {
  const evidence = buildEvidenceSection(brief);
  const prompt = `Generate a creative brief for the product below.

EVIDENCE:
${evidence}

SCHEMA (return valid JSON):
{
  "objective": "what the creative should achieve",
  "audience": "from evidence targetPersonas",
  "message": "core message from USP or features",
  "visualDirection": "reference to product/industry — no generic stock imagery",
  "brandSignals": ["visual cues from product features or technology"],
  "requiredText": "text that must appear (overlaid, not burned into image)",
  "cta": "single CTA",
  "format": "poster / banner / social / display",
  "evidenceLimitations": ["what cannot be claimed in the creative"]
}

RULES:
1. Do NOT include text in image generation prompt — text is overlaid separately.
2. requiredText is the safe text overlay layer.
3. Return ONLY valid JSON. No markdown.`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Creative brief AI failed:`, e.message); }
  return null;
}

async function generateVideoScript(brief) {
  const evidence = buildEvidenceSection(brief);
  const prompt = `Generate a video script for the product below.

EVIDENCE:
${evidence}

SCHEMA (return valid JSON):
{
  "duration": "30s",
  "scenes": [{"scene": 1, "narration": "voiceover text", "onScreenText": "text overlay", "visual": "scene description", "evidencePoint": "which evidence this scene uses", "cta": "scene-level CTA or null"}],
  "evidenceUsed": [],
  "limitations": []
}

RULES:
1. Every scene must reference product/audience from evidence.
2. No fake statistics or testimonials.
3. CTA must be product-specific.
4. Return ONLY valid JSON. No markdown.`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Video script AI failed:`, e.message); }
  return null;
}

// ================================================
// GENERATOR MAP
// ================================================

const GENERATORS = {
  blog_article: generateBlogArticle,
  faq_page: generateFAQ,
  landing_page: generateLandingPage,
  product_page: generateProductPage,
  comparison_page: generateComparisonPage,
  feature_announcement: generateFeatureAnnouncement,
  whitepaper: generateWhitepaper,
  linkedin_post: (b) => generateSocialPost('linkedin_post', b),
  instagram_post: (b) => generateSocialPost('instagram_post', b),
  twitter_post: (b) => generateSocialPost('twitter_post', b),
  facebook_post: (b) => generateSocialPost('facebook_post', b),
  youtube_description: (b) => generateSocialPost('youtube_description', b),
  email_copy: generateEmailCopy,
  creative_brief: generateCreativeBrief,
  video_script: generateVideoScript,
};

// ================================================
// MAIN EXPORTS
// ================================================

export async function generateContent(assetType, brief, evidenceContext, callAiFn, userId, chatId) {
  const typeConfig = CONTENT_TYPES[assetType];
  if (!typeConfig) throw new Error(`Unknown content type: ${assetType}`);

  const generator = GENERATORS[assetType];
  if (!generator) throw new Error(`No generator for: ${assetType}`);

  const briefValidation = validateBriefContent(brief);
  if (briefValidation.status === 'blocked') {
    return {
      _type: assetType,
      _label: typeConfig.label,
      _status: 'blocked',
      _reason: briefValidation.issues.join('; '),
      _generatedAt: new Date().toISOString(),
    };
  }

  const result = await generator(brief);

  if (!result) {
    return {
      _type: assetType,
      _label: typeConfig.label,
      _status: 'generation_failed',
      _generatedAt: new Date().toISOString(),
    };
  }

  // Validate AI output against Zod schema
  const schemaValidation = validateContentOutput(result, assetType);
  if (!schemaValidation.valid) {
    return {
      content: result,
      metadata: {
        type: assetType,
        label: typeConfig.label,
        status: 'schema_rejected',
        generatedAt: new Date().toISOString(),
        provider: 'content_studio_ai',
        schemaErrors: schemaValidation.errors,
      },
    };
  }

  // Validate claims
  const claimValidation = validateContentClaims(result, assetType);

  return {
    content: schemaValidation.data,
    metadata: {
      type: assetType,
      label: typeConfig.label,
      generatedAt: new Date().toISOString(),
      provider: 'content_studio_ai',
      claimStatus: claimValidation.status,
      claimFindings: claimValidation.findings,
      schemaValid: true,
    },
  };
}

export async function generateContentStudioPlan(typesOrCtx, brief, evidenceContext, callAiFn, userId, chatId) {
  // Backward compatibility: if first arg is an object (marketing-execution context), treat as legacy call
  if (typesOrCtx && typeof typesOrCtx === 'object' && !Array.isArray(typesOrCtx)) {
    const execCtx = typesOrCtx;
    const minimalBrief = {
      product: { name: execCtx.productName || 'N/A', summary: null, features: [], benefits: [], usp: execCtx.productUsp || null },
      company: { name: execCtx.companyName || null, websiteUrl: null, industry: execCtx.industry || null },
      targetPersonas: execCtx.targetAudience ? [{ name: execCtx.targetAudience, role: null, painPoints: [], goals: [] }] : [],
      painPoints: [], objections: [], validatedCompetitors: [], verifiedKeywords: [], topicIdeas: [],
      contentGaps: [], tone: execCtx.tone || 'professional', CTA: [], evidenceSources: {}, limitations: [],
      _briefId: `legacy_${Date.now()}`, _chatId: null, _userId: null, _builtAt: new Date().toISOString(),
    };
    const allTypes = Object.keys(CONTENT_TYPES);
    return generateContentStudioPlan(allTypes, minimalBrief, null, null, null, null);
  }

  const types = typesOrCtx;
  const results = [];

  for (const type of types) {
    const genResult = await generateContent(type, brief, evidenceContext, callAiFn, userId, chatId);
    if (genResult) results.push({ type, content: genResult.content || genResult, metadata: genResult.metadata || null });
  }

  return {
    assets: results,
    totalGenerated: results.length,
    _metadata: {
      evidenceVersion: '2.0.0',
      generatedAt: new Date().toISOString(),
      typesGenerated: types,
      provider: 'content_studio',
    },
  };
}
