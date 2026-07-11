/**
 * Zod schemas for validating AI-generated content output.
 * One schema per content type — rejects malformed output before it reaches the database.
 */

import { z } from 'zod';

const evidenceUsed = z.array(z.string()).default([]);
const claimsRequiringReview = z.array(z.string()).default([]);
const generatedAt = z.string().optional();
const provider = z.string().optional();

const seoMeta = z.object({
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(300).optional(),
}).optional();

export const blogArticleSchema = z.object({
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

export const faqPageSchema = z.object({
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

export const landingPageSchema = z.object({
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
  seoMetadata: seoMeta,
  evidenceUsed,
});

export const productPageSchema = z.object({
  title: z.string().min(1).max(200),
  purpose: z.string().optional(),
  productSummary: z.string().optional(),
  features: z.array(z.object({
    feature: z.string(),
    benefit: z.string().optional(),
    evidence: z.string().optional(),
  })).default([]),
  cta: z.string().optional(),
  seoMetadata: seoMeta,
  evidenceUsed,
});

export const comparisonPageSchema = z.object({
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

export const featureAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  purpose: z.string().optional(),
  featureName: z.string().optional(),
  featureDescription: z.string().optional(),
  benefit: z.string().optional(),
  availability: z.string().nullable().optional(),
  cta: z.string().optional(),
  evidenceUsed,
});

export const whitepaperSchema = z.object({
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

export const linkedinPostSchema = z.object({
  text: z.string().min(1).max(4000),
  hook: z.string().max(300).optional(),
  cta: z.string().optional(),
  evidenceUsed,
});

export const instagramPostSchema = z.object({
  caption: z.string().min(1).max(3000),
  hook: z.string().max(200).optional(),
  hashtags: z.array(z.string()).max(10).default([]),
  cta: z.string().optional(),
  evidenceUsed,
});

export const twitterPostSchema = z.object({
  text: z.string().min(1).max(400),
  cta: z.string().optional(),
  evidenceUsed,
});

export const facebookPostSchema = z.object({
  text: z.string().min(1).max(3000),
  hook: z.string().optional(),
  cta: z.string().optional(),
  evidenceUsed,
});

export const youtubeDescriptionSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().min(1).max(6000),
  timestamps: z.array(z.object({
    time: z.string(),
    topic: z.string(),
  })).default([]),
  links: z.array(z.object({
    text: z.string(),
    url: z.string(),
  })).default([]),
  cta: z.string().optional(),
  evidenceUsed,
});

export const emailCopySchema = z.object({
  subjectLine: z.string().min(1).max(200),
  previewText: z.string().max(200).optional(),
  body: z.string().min(1),
  cta: z.string().optional(),
  personalizationFields: z.array(z.string()).default([]),
  evidenceUsed,
});

export const creativeBriefSchema = z.object({
  objective: z.string().optional(),
  audience: z.string().optional(),
  message: z.string().optional(),
  visualDirection: z.string().optional(),
  brandSignals: z.array(z.string()).default([]),
  requiredText: z.string().optional(),
  cta: z.string().optional(),
  format: z.string().optional(),
  evidenceLimitations: z.array(z.string()).default([]),
});

export const videoScriptSchema = z.object({
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
  linkedin_post: linkedinPostSchema,
  instagram_post: instagramPostSchema,
  twitter_post: twitterPostSchema,
  facebook_post: facebookPostSchema,
  youtube_description: youtubeDescriptionSchema,
  email_copy: emailCopySchema,
  creative_brief: creativeBriefSchema,
  video_script: videoScriptSchema,
};

export function validateContentOutput(raw, assetType) {
  const schema = SCHEMAS[assetType];
  if (!schema) {
    return { valid: false, errors: [`No schema for content type: ${assetType}`] };
  }

  const result = schema.safeParse(raw);
  if (result.success) {
    return { valid: true, data: result.data };
  }

  const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
  return { valid: false, errors };
}
