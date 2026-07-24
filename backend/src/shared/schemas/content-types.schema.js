import { z } from 'zod';
import { InferenceStatus } from './enums.js';

// Common fields
export const evidenceUsed = z.array(z.string()).default([]);
export const claimsRequiringReview = z.array(z.string()).default([]);

// Inference status enum (from enums.js)
export const InferenceStatusSchema = z.enum([
  InferenceStatus.EVIDENCE_BACKED,
  InferenceStatus.AI_INFERRED,
  InferenceStatus.USER_PROVIDED,
  InferenceStatus.NOT_MEASURED,
  InferenceStatus.BEST_PRACTICE
]);

// ---------- BLOG ARTICLE ----------
export const blogSectionSchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
  keyTakeaways: z.array(z.string()).default([]),
});

export const blogArticleSchema = z.object({
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
export const faqPageSchema = z.object({
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
export const landingFeatureSchema = z.object({
  icon: z.string().optional(),
  title: z.string(),
  description: z.string(),
});

export const landingPageSchema = z.object({
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
export const productFeatureSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  benefit: z.string().nullable().optional(),
});

export const productUseCaseSchema = z.object({
  scenario: z.string(),
  solution: z.string(),
  outcome: z.string().nullable().optional(),
});

export const productFaqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export const productPageSchema = z.object({
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
export const comparisonTableRowSchema = z.record(z.string(), z.any());

export const comparisonPageSchema = z.object({
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
export const featureAnnouncementSchema = z.object({
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
export const whitepaperSectionSchema = z.object({
  heading: z.string().min(1),
  body: z.string().nullable().optional(),
  keyFindings: z.array(z.string()).default([]),
});

export const whitepaperSchema = z.object({
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
export const linkedInPostSchema = z.object({
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
export const instagramPostSchema = z.object({
  _type: z.string().optional(),
  hook: z.string(),
  caption: z.string().min(1),
  visualConcept: z.string().nullable(),
  carouselSlides: z.array(z.object({
    headline: z.string(),
    body: z.string(),
    visualHint: z.string().nullable(),
  })).default([]),
  imagePrompt: z.string().nullable(),
  callToAction: z.string().nullable(),
  hashtags: z.array(z.string()).max(15).default([]),
  audience: z.string().nullable(),
  angle: z.string(),
  evidenceUsed,
  claimsRequiringReview,
});

// ---------- X/TWITTER POST ----------
export const twitterPostSchema = z.object({
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
export const facebookPostSchema = z.object({
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
export const youtubeChapterSchema = z.object({
  timestamp: z.string(),
  title: z.string(),
});

export const youtubeLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});

export const youtubeDescriptionSchema = z.object({
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
export const emailCopySchema = z.object({
  _type: z.string().optional(),
  emailType: z.string().optional(),
  subject: z.string().min(1),
  subjectAlternatives: z.array(z.string()).optional(),
  previewText: z.string().nullable().optional(),
  greeting: z.string().optional(),
  headline: z.string().optional(),
  opening: z.string().optional(),
  painPoint: z.string().optional(),
  solution: z.string().optional(),
  bodyParagraphs: z.array(z.string()).min(1),
  features: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  socialProof: z.string().nullable().optional(),
  primaryCta: z.object({ label: z.string(), url: z.string().nullable().optional() }).optional(),
  secondaryCta: z.object({ label: z.string(), url: z.string().nullable().optional() }).nullable().optional(),
  closing: z.string().optional(),
  signature: z.string().optional(),
  postscript: z.string().optional(),
  complianceFooter: z.string().nullable().optional(),
  unsubscribeText: z.string().optional(),
  footer: z.string().nullable().optional(),
  compliance: z.string().nullable().optional(),
  variables: z.array(z.string()).default([]),
  plainText: z.string().nullable().optional(),
  html: z.string().nullable().optional(),
  evidenceUsed,
  claimsRequiringReview,
});

// ---------- CREATIVE BRIEF ----------
export const creativeBriefSchema = z.object({
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
export const videoSceneSchema = z.object({
  scene: z.number().or(z.string()).optional(),
  narration: z.string().nullable().optional(),
  onScreenText: z.string().nullable().optional(),
  visual: z.string().nullable().optional(),
  evidencePoint: z.string().nullable().optional(),
  cta: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
});

export const videoScriptSchema = z.object({
  _type: z.string().optional(),
  title: z.string().nullable().optional(),
  format: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  scenes: z.array(videoSceneSchema).default([]),
  evidenceUsed,
  limitations: z.array(z.string()).default([]),
});


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
