import { z } from 'zod';

const evidenceUsed = z.array(z.string()).default([]);
const claimsRequiringReview = z.array(z.string()).default([]);

// ---------- BLOG ARTICLE ----------
const blogSectionSchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
  keyTakeaways: z.array(z.string()).default([]),
});

const blogArticleSchema = z.object({
  _type: z.string().optional(),
  headline: z.string().min(1),
  metaDescription: z.string().nullable().optional(),
  introduction: z.string().min(1),
  sections: z.array(blogSectionSchema).min(1),
  conclusion: z.string().min(1),
  cta: z.string().nullable().optional(),
  targetKeywords: z.array(z.string()).default([]),
  evidenceUsed,
  claimsRequiringReview,
});

// ---------- FAQ PAGE ----------
const faqPageSchema = z.object({
  _type: z.string().optional(),
  headline: z.string().min(1),
  metaDescription: z.string().nullable().optional(),
  introduction: z.string().min(1),
  faqs: z.array(z.object({
    question: z.string().min(1),
    answer: z.string().min(1),
  })).min(1),
  cta: z.string().nullable().optional(),
  evidenceUsed,
  claimsRequiringReview,
});

// ---------- LANDING PAGE ----------
const landingFeatureSchema = z.object({
  icon: z.string().optional(),
  title: z.string(),
  description: z.string(),
});

const landingPageSchema = z.object({
  _type: z.string().optional(),
  headline: z.string().min(1),
  subheadline: z.string().nullable().optional(),
  heroCTA: z.string().nullable().optional(),
  painPoints: z.array(z.string()).default([]),
  solution: z.string().nullable().optional(),
  features: z.array(landingFeatureSchema).default([]),
  socialProof: z.array(z.any()).default([]),
  finalCTA: z.string().nullable().optional(),
  seoKeywords: z.array(z.string()).default([]),
  evidenceUsed,
  claimsRequiringReview,
});

// ---------- PRODUCT PAGE ----------
const productFeatureSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  benefit: z.string().nullable().optional(),
});

const productUseCaseSchema = z.object({
  scenario: z.string(),
  solution: z.string(),
  outcome: z.string().nullable().optional(),
});

const productFaqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

const productPageSchema = z.object({
  _type: z.string().optional(),
  productName: z.string().min(1),
  tagline: z.string().nullable().optional(),
  overview: z.string().nullable().optional(),
  keyFeatures: z.array(productFeatureSchema).default([]),
  useCases: z.array(productUseCaseSchema).default([]),
  cta: z.string().nullable().optional(),
  pricing: z.any().nullable().optional(),
  faqs: z.array(productFaqSchema).default([]),
  evidenceUsed,
  claimsRequiringReview,
});

// ---------- COMPARISON PAGE ----------
const comparisonTableRowSchema = z.record(z.string(), z.any());

const comparisonPageSchema = z.object({
  _type: z.string().optional(),
  headline: z.string().min(1),
  introduction: z.string().nullable().optional(),
  comparisonTable: z.object({
    headers: z.array(z.string()),
    rows: z.array(comparisonTableRowSchema),
  }).optional(),
  whyChooseUs: z.string().nullable().optional(),
  cta: z.string().nullable().optional(),
  competitorWeaknesses: z.array(z.object({
    competitor: z.string(),
    weakness: z.string(),
  })).default([]),
  evidenceUsed,
  claimsRequiringReview,
});

// ---------- FEATURE ANNOUNCEMENT ----------
const featureAnnouncementSchema = z.object({
  _type: z.string().optional(),
  headline: z.string().min(1),
  subheadline: z.string().nullable().optional(),
  body: z.string().min(1),
  benefits: z.array(z.string()).default([]),
  cta: z.string().nullable().optional(),
  availability: z.string().nullable().optional(),
  technicalDetails: z.any().nullable().optional(),
  evidenceUsed,
  claimsRequiringReview,
});

// ---------- WHITEPAPER ----------
const whitepaperSectionSchema = z.object({
  heading: z.string().min(1),
  body: z.string().nullable().optional(),
  keyFindings: z.array(z.string()).default([]),
});

const whitepaperSchema = z.object({
  _type: z.string().optional(),
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  executiveSummary: z.string().nullable().optional(),
  sections: z.array(whitepaperSectionSchema).default([]),
  conclusion: z.string().nullable().optional(),
  references: z.array(z.any()).default([]),
  cta: z.string().nullable().optional(),
  evidenceUsed,
  claimsRequiringReview,
});

// ---------- LINKEDIN POST ----------
const linkedInPostSchema = z.object({
  _type: z.string().optional(),
  hook: z.string().min(1),
  body: z.string().min(1),
  cta: z.string().nullable(),
  hashtags: z.array(z.string()).max(8).default([]),
  audience: z.string().nullable(),
  angle: z.string(),
  evidenceUsed,
  claimsRequiringReview,
});

// ---------- INSTAGRAM POST ----------
const instagramPostSchema = z.object({
  _type: z.string().optional(),
  hook: z.string(),
  caption: z.string().min(1),
  cta: z.string().nullable(),
  hashtags: z.array(z.string()).max(15).default([]),
  visualConcept: z.string().nullable(),
  audience: z.string().nullable(),
  angle: z.string(),
  evidenceUsed,
  claimsRequiringReview,
});

// ---------- X/TWITTER POST ----------
const twitterPostSchema = z.object({
  _type: z.string().optional(),
  post: z.string().min(1).max(280),
  cta: z.string().nullable(),
  hashtags: z.array(z.string()).max(3).default([]),
  angle: z.string(),
  audience: z.string().nullable().optional(),
  evidenceUsed,
  claimsRequiringReview,
});

// ---------- FACEBOOK POST ----------
const facebookPostSchema = z.object({
  _type: z.string().optional(),
  headline: z.string().nullable(),
  body: z.string().min(1),
  cta: z.string().nullable(),
  audience: z.string().nullable(),
  angle: z.string(),
  evidenceUsed,
  claimsRequiringReview,
});

// ---------- YOUTUBE DESCRIPTION ----------
const youtubeChapterSchema = z.object({
  timestamp: z.string(),
  title: z.string(),
});

const youtubeLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

const youtubeDescriptionSchema = z.object({
  _type: z.string().optional(),
  title: z.string(),
  openingHook: z.string(),
  description: z.string().min(1),
  chapters: z.array(youtubeChapterSchema).default([]),
  links: z.array(youtubeLinkSchema).default([]),
  cta: z.string().nullable(),
  hashtags: z.array(z.string()).max(15).default([]),
  keywords: z.array(z.string()).default([]),
  evidenceUsed,
  claimsRequiringReview,
});

// ---------- EMAIL COPY ----------
const subjectOptionSchema = z.object({
  subject: z.string(),
  angle: z.string().optional(),
  evidence: z.string().optional(),
  confidence: z.string().optional(),
  aScore: z.number().optional(),
  bScore: z.number().optional(),
});

const ctaObjectSchema = z.object({
  label: z.string(),
  destination: z.string().nullable().optional(),
  offerType: z.string().optional(),
  evidenceSource: z.string().optional(),
  verified: z.boolean().optional(),
  url: z.string().nullable().optional(),
});

const linkSchema = z.object({
  label: z.string(),
  url: z.string().nullable().optional(),
  verified: z.boolean().optional(),
});

const emailCopySchema = z.object({
  _type: z.string().optional(),
  assetName: z.string().optional(),
  campaignName: z.string().optional(),
  emailType: z.enum(['outreach', 'nurture', 'product_announcement', 'newsletter', 'follow_up', 'trial_conversion']),
  audience: z.string().optional(),
  goal: z.string().optional(),
  subject: z.string(),
  selectedSubject: z.string().optional(),
  subjectOptions: z.array(subjectOptionSchema).default([]),
  previewText: z.string().nullable(),
  senderName: z.string().optional(),
  replyTo: z.string().optional(),
  greeting: z.string(),
  opening: z.string(),
  openingHook: z.string().optional(),
  audienceProblem: z.string().optional(),
  valueProposition: z.string().optional(),
  benefits: z.array(z.string()).default([]),
  featureHighlights: z.array(z.string()).default([]),
  proof: z.string().nullable().optional(),
  bodyParagraphs: z.array(z.string()).min(1),
  bulletPoints: z.array(z.string()).default([]),
  ctaText: z.string(),
  ctaUrl: z.string().nullable(),
  primaryCta: ctaObjectSchema.optional(),
  secondaryCta: ctaObjectSchema.nullable().optional(),
  closing: z.string(),
  signature: z.string(),
  personalizationFields: z.array(z.string()).default([]),
  personalizationVariables: z.array(z.object({
    name: z.string(),
    description: z.string(),
    example: z.string().optional(),
  })).default([]),
  links: z.array(linkSchema).default([]),
  sections: z.object({
    preheader: z.string().optional(),
    header: z.string().optional(),
    body: z.string().optional(),
    footer: z.string().optional(),
    unsubscribe: z.string().optional(),
    greeting: z.string().optional(),
    openingHook: z.string().optional(),
    audienceProblem: z.string().optional(),
    valueProposition: z.string().optional(),
    closing: z.string().optional(),
    signature: z.string().optional(),
  }).optional(),
  complianceNote: z.string().nullable(),
  qualityReport: z.object({
    checks: z.record(z.any()).optional(),
    overallStatus: z.string().optional(),
  }).optional(),
  evidenceUsed,
  claimsRequiringReview,
});

// ---------- CREATIVE BRIEF ----------
const creativeBriefSchema = z.object({
  _type: z.string().optional(),
  objective: z.string().nullable().optional(),
  audience: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  supportingMessages: z.array(z.string()).default([]),
  deliverables: z.array(z.string()).default([]),
  visualDirection: z.string().nullable().optional(),
  tone: z.string().nullable().optional(),
  mandatoryElements: z.array(z.string()).default([]),
  prohibitedClaims: z.array(z.string()).default([]),
  cta: z.string().nullable().optional(),
  brandSignals: z.array(z.string()).default([]),
  requiredText: z.string().nullable().optional(),
  format: z.string().nullable().optional(),
  evidenceLimitations: z.array(z.string()).default([]),
  evidenceUsed,
  limitations: z.array(z.string()).default([]),
});

// ---------- VIDEO SCRIPT ----------
const videoSceneSchema = z.object({
  scene: z.number().or(z.string()).optional(),
  narration: z.string().nullable().optional(),
  onScreenText: z.string().nullable().optional(),
  visual: z.string().nullable().optional(),
  evidencePoint: z.string().nullable().optional(),
  cta: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
});

const videoScriptSchema = z.object({
  _type: z.string().optional(),
  title: z.string().nullable().optional(),
  format: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  scenes: z.array(videoSceneSchema).default([]),
  evidenceUsed,
  limitations: z.array(z.string()).default([]),
});

// ---------- REGISTRY ----------
export const SCHEMAS = {
  blog_article: blogArticleSchema,
  faq_page: faqPageSchema,
  landing_page: landingPageSchema,
  product_page: productPageSchema,
  comparison_page: comparisonPageSchema,
  feature_announcement: featureAnnouncementSchema,
  whitepaper: whitepaperSchema,
  linkedin_post: linkedInPostSchema,
  instagram_post: instagramPostSchema,
  twitter_post: twitterPostSchema,
  facebook_post: facebookPostSchema,
  youtube_description: youtubeDescriptionSchema,
  email_copy: emailCopySchema,
  email_campaign: emailCopySchema,
  email_nurture: emailCopySchema,
  email_newsletter: emailCopySchema,
  creative_brief: creativeBriefSchema,
  video_script: videoScriptSchema,
};

export const SCHEMA_REGISTRY = {
  blog_article: { schema: blogArticleSchema, normalizer: 'blogArticle' },
  faq_page: { schema: faqPageSchema, normalizer: 'faqPage' },
  landing_page: { schema: landingPageSchema, normalizer: 'landingPage' },
  product_page: { schema: productPageSchema, normalizer: 'productPage' },
  comparison_page: { schema: comparisonPageSchema, normalizer: 'comparisonPage' },
  feature_announcement: { schema: featureAnnouncementSchema, normalizer: 'featureAnnouncement' },
  whitepaper: { schema: whitepaperSchema, normalizer: 'whitepaper' },
  linkedin_post: { schema: linkedInPostSchema, normalizer: 'linkedinPost' },
  instagram_post: { schema: instagramPostSchema, normalizer: 'instagramPost' },
  twitter_post: { schema: twitterPostSchema, normalizer: 'twitterPost' },
  facebook_post: { schema: facebookPostSchema, normalizer: 'facebookPost' },
  youtube_description: { schema: youtubeDescriptionSchema, normalizer: 'youtubeDescription' },
  email_copy: { schema: emailCopySchema, normalizer: 'emailCopy' },
  email_campaign: { schema: emailCopySchema, normalizer: 'emailCopy' },
  email_nurture: { schema: emailCopySchema, normalizer: 'emailCopy' },
  email_newsletter: { schema: emailCopySchema, normalizer: 'emailCopy' },
  creative_brief: { schema: creativeBriefSchema, normalizer: 'creativeBrief' },
  video_script: { schema: videoScriptSchema, normalizer: 'videoScript' },
};

/** Normalize legacy stored assets to match current schema */
export function normalizeLegacyAsset(raw, assetType) {
  if (!raw || typeof raw !== 'object') return raw;

  if (assetType === 'blog_article') {
    if (raw.title && !raw.headline) raw.headline = raw.title;
    if (raw.article && (!raw.introduction || !raw.conclusion)) {
      const text = raw.article;
      const parts = text.split(/\n\n+/);
      raw.introduction = raw.introduction || parts[0] || text;
      raw.conclusion = raw.conclusion || parts[parts.length - 1] || '';
      raw.sections = raw.sections || parts.slice(1, -1).filter(Boolean).map(p => ({
        heading: 'Section',
        body: p,
        keyTakeaways: [],
      }));
    }
    if (!raw.sections) raw.sections = [{ heading: 'Overview', body: raw.article || '', keyTakeaways: [] }];
    delete raw.title;
    delete raw.article;
  }

  if (assetType === 'faq_page') {
    if (raw.faqItems && !raw.faqs) {
      raw.faqs = raw.faqItems;
      delete raw.faqItems;
    }
  }

  return raw;
}

/** Validate and normalize content output */
export function validateContentOutput(raw, assetType) {
  const entry = SCHEMA_REGISTRY[assetType];
  if (!entry) {
    console.warn(`[Schema] No schema registered for: ${assetType}`);
    return { valid: false, errors: [`No schema for content type: ${assetType}`] };
  }

  const normalized = normalizeLegacyAsset(raw, assetType);

  const result = entry.schema.safeParse(normalized);
  if (result.success) {
    return { valid: true, data: result.data };
  }

  const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
  return { valid: false, errors, raw: normalized };
}

/** Attempt repair of common AI output issues */
export function repairAIOutput(raw, assetType) {
  if (!raw || typeof raw !== 'object') return raw;
  const repaired = { ...raw };

  if (assetType === 'blog_article') {
    if (repaired.title) { repaired.headline = repaired.headline || repaired.title; delete repaired.title; }
    if (repaired.article) {
      if (!repaired.introduction) repaired.introduction = repaired.article.substring(0, 200);
      if (!repaired.sections) repaired.sections = [{ heading: 'Overview', body: repaired.article, keyTakeaways: [] }];
      delete repaired.article;
    }
  }

  if (assetType === 'faq_page') {
    if (repaired.faqItems && !repaired.faqs) { repaired.faqs = repaired.faqItems; delete repaired.faqItems; }
    if (repaired.title && !repaired.headline) { repaired.headline = repaired.title; delete repaired.title; }
  }

  return repaired;
}
