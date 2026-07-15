import { z } from 'zod';

const evidenceUsed = z.array(z.string()).default([]);
const claimsRequiringReview = z.array(z.string()).default([]);

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

const instagramPostSchema = z.object({
  _type: z.string().optional(),
  hook: z.string(),
  caption: z.string(),
  cta: z.string().nullable(),
  hashtags: z.array(z.string()).max(15).default([]),
  visualConcept: z.string().nullable(),
  audience: z.string().nullable(),
  angle: z.string(),
  evidenceUsed,
  claimsRequiringReview,
});

const twitterPostSchema = z.object({
  _type: z.string().optional(),
  post: z.string().min(1).max(280),
  cta: z.string().nullable(),
  hashtags: z.array(z.string()).max(3).default([]),
  angle: z.string(),
  evidenceUsed,
  claimsRequiringReview,
});

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

const youtubeDescriptionSchema = z.object({
  _type: z.string().optional(),
  title: z.string(),
  openingHook: z.string(),
  description: z.string().min(1),
  chapters: z.array(z.object({
    timestamp: z.string(),
    title: z.string(),
  })).default([]),
  links: z.array(z.object({
    label: z.string(),
    url: z.string(),
  })).default([]),
  cta: z.string().nullable(),
  hashtags: z.array(z.string()).max(15).default([]),
  keywords: z.array(z.string()).default([]),
  evidenceUsed,
  claimsRequiringReview,
});

const emailCopySchema = z.object({
  _type: z.string().optional(),
  emailType: z.enum(['outreach', 'nurture', 'product_announcement', 'newsletter', 'follow_up', 'trial_conversion']),
  subject: z.string(),
  previewText: z.string().nullable(),
  greeting: z.string(),
  opening: z.string(),
  bodyParagraphs: z.array(z.string()).min(1),
  bulletPoints: z.array(z.string()).default([]),
  ctaText: z.string(),
  ctaUrl: z.string().nullable(),
  closing: z.string(),
  signature: z.string(),
  personalizationFields: z.array(z.string()).default([]),
  complianceNote: z.string().nullable(),
  evidenceUsed,
  claimsRequiringReview,
});

const blogArticleSchema = z.object({
  title: z.string().min(1).max(200),
  purpose: z.string().optional(),
  audience: z.string().optional(),
  targetTopic: z.string().optional(),
  searchIntent: z.enum(['informational', 'commercial', 'navigational', 'transactional']).optional(),
  outline: z.array(z.string()).default([]),
  article: z.string().min(1),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(300).optional(),
  internalLinkSuggestions: z.array(z.object({ text: z.string(), url: z.string() })).default([]),
  cta: z.string().optional(),
  evidenceUsed,
  claimsRequiringReview,
});

const faqPageSchema = z.object({
  title: z.string().min(1).max(200),
  purpose: z.string().optional(),
  audience: z.string().optional(),
  faqItems: z.array(z.object({
    question: z.string().min(1),
    answer: z.string(),
  })).default([]),
  evidenceUsed,
  claimsRequiringReview,
});

const landingPageSchema = z.object({
  headline: z.string().min(1).max(200),
  subHeadline: z.string().max(300).optional(),
  problem: z.string().optional(),
  solution: z.string().optional(),
  featureBenefitBlocks: z.array(z.object({
    feature: z.string(),
    benefit: z.string(),
    evidence: z.string().optional(),
  })).default([]),
  objectionHandling: z.array(z.object({
    objection: z.string(),
    response: z.string(),
  })).default([]),
  cta: z.string().optional(),
  seoMetadata: z.object({
    metaTitle: z.string().max(200).optional(),
    metaDescription: z.string().max(300).optional(),
  }).optional(),
  evidenceUsed,
});

const productPageSchema = z.object({
  title: z.string().min(1).max(200),
  purpose: z.string().optional(),
  productSummary: z.string().optional(),
  features: z.array(z.object({
    feature: z.string(),
    benefit: z.string().optional(),
    evidence: z.string().optional(),
  })).default([]),
  cta: z.string().optional(),
  seoMetadata: z.object({
    metaTitle: z.string().max(200).optional(),
    metaDescription: z.string().max(300).optional(),
  }).optional(),
  evidenceUsed,
});

const comparisonPageSchema = z.object({
  title: z.string().min(1).max(200),
  purpose: z.string().optional(),
  primaryProduct: z.string().optional(),
  comparedCompetitors: z.array(z.object({
    name: z.string(),
    domain: z.string().optional(),
  })).default([]),
  comparisonFields: z.array(z.object({
    field: z.string(),
    ourValue: z.string().nullable().optional(),
    competitorValue: z.string().nullable().optional(),
    source: z.string().optional(),
  })).default([]),
  cta: z.string().optional(),
  evidenceUsed,
  claimsRequiringReview,
});

const featureAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  purpose: z.string().optional(),
  featureName: z.string().optional(),
  featureDescription: z.string().optional(),
  benefit: z.string().optional(),
  availability: z.string().nullable().optional(),
  cta: z.string().optional(),
  evidenceUsed,
});

const whitepaperSchema = z.object({
  title: z.string().min(1).max(200),
  purpose: z.string().optional(),
  audience: z.string().optional(),
  executiveSummary: z.string().optional(),
  sections: z.array(z.object({
    heading: z.string(),
    content: z.string(),
  })).default([]),
  conclusion: z.string().optional(),
  evidenceUsed,
  limitations: z.array(z.string()).default([]),
});

const creativeBriefSchema = z.object({
  objective: z.string().optional(),
  audience: z.string().optional(),
  message: z.string().optional(),
  visualDirection: z.string().optional(),
  brandSignals: z.array(z.string()).default([]),
  requiredText: z.string().optional(),
  cta: z.string().optional(),
  format: z.string().optional(),
  evidenceLimitations: z.array(z.string()).default([]),
  evidenceUsed,
  claimsRequiringReview,
});

const videoScriptSchema = z.object({
  duration: z.string().optional(),
  scenes: z.array(z.object({
    scene: z.number().or(z.string()).optional(),
    narration: z.string().optional(),
    onScreenText: z.string().optional(),
    visual: z.string().optional(),
    evidencePoint: z.string().optional(),
    cta: z.string().nullable().optional(),
  })).default([]),
  evidenceUsed,
  limitations: z.array(z.string()).default([]),
});

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
  creative_brief: creativeBriefSchema,
  video_script: videoScriptSchema,
};

export const SCHEMA_REGISTRY = {
  linkedin_post: { schema: linkedInPostSchema, renderer: 'linkedin' },
  instagram_post: { schema: instagramPostSchema, renderer: 'instagram' },
  twitter_post: { schema: twitterPostSchema, renderer: 'twitter' },
  facebook_post: { schema: facebookPostSchema, renderer: 'facebook' },
  youtube_description: { schema: youtubeDescriptionSchema, renderer: 'youtube' },
  email_copy: { schema: emailCopySchema, renderer: 'email' },
  creative_brief: { schema: creativeBriefSchema, renderer: 'creativeBrief' },
  video_script: { schema: videoScriptSchema, renderer: 'videoScript' },
  blog_article: { schema: blogArticleSchema, renderer: 'blog' },
  faq_page: { schema: faqPageSchema, renderer: 'faq' },
  landing_page: { schema: landingPageSchema, renderer: 'landing' },
  product_page: { schema: productPageSchema, renderer: 'product' },
  comparison_page: { schema: comparisonPageSchema, renderer: 'comparison' },
  feature_announcement: { schema: featureAnnouncementSchema, renderer: 'featureAnnouncement' },
  whitepaper: { schema: whitepaperSchema, renderer: 'whitepaper' },
};

export function validateContentOutput(raw, assetType) {
  const entry = SCHEMA_REGISTRY[assetType];
  if (!entry) {
    console.warn(`[Schema] No schema registered for: ${assetType}`);
    return { valid: false, errors: [`No schema for content type: ${assetType}`] };
  }

  console.info('[Content Schema Debug]', {
    contentType: assetType,
    resultType: typeof raw,
    resultKeys: raw && typeof raw === 'object' ? Object.keys(raw) : [],
    hasTextField: Boolean(raw && typeof raw === 'object' && typeof raw.text === 'string'),
    hasBodyField: Boolean(raw && typeof raw === 'object' && typeof raw.body === 'string'),
    hasPostField: Boolean(raw && typeof raw === 'object' && typeof raw.post === 'string'),
    hasCaptionField: Boolean(raw && typeof raw === 'object' && typeof raw.caption === 'string'),
    hasHookField: Boolean(raw && typeof raw === 'object' && typeof raw.hook === 'string'),
    hasHeadlineField: Boolean(raw && typeof raw === 'object' && typeof raw.headline === 'string'),
    hasSubjectField: Boolean(raw && typeof raw === 'object' && typeof raw.subject === 'string'),
  });

  const result = entry.schema.safeParse(raw);
  if (result.success) {
    return { valid: true, data: result.data };
  }

  const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
  console.warn(`[Schema] Validation failed for ${assetType}:`, JSON.stringify(errors));
  console.warn(`[Schema] Raw received:`, JSON.stringify(raw).substring(0, 500));
  return { valid: false, errors };
}
