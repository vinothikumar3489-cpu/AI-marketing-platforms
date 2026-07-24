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
const emailCopySchema = z.object({
  _type: z.string().optional(),
  emailType: z.enum(['promotional', 'newsletter', 'product_announcement', 'nurture', 'outreach', 'follow_up', 'trial_conversion']),
  subject: z.string().min(1),
  previewText: z.string().nullable(),
  greeting: z.string(),
  opening: z.string(),
  bodyParagraphs: z.array(z.string()).min(1),
  ctaText: z.string(),
  ctaUrl: z.string().nullable(),
  closing: z.string(),
  signature: z.string(),
  footer: z.string().nullable(),
  plainText: z.string().nullable(),
  html: z.string().nullable(),
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

  if (assetType === 'email_copy' || assetType === 'email_campaign' || assetType === 'email_nurture' || assetType === 'email_newsletter') {
    if (raw.subjectLine && !raw.subject) raw.subject = raw.subjectLine;
    if (raw.preheader && !raw.previewText) raw.previewText = raw.preheader;
    if (raw.greetingText && !raw.greeting) raw.greeting = raw.greetingText;
    if (raw.cta && !raw.ctaText) raw.ctaText = typeof raw.cta === 'object' ? raw.cta.label || raw.cta.text || '' : raw.cta;
    if (raw.ctaUrl === undefined && raw.cta && typeof raw.cta === 'object') raw.ctaUrl = raw.cta.url || raw.cta.destination || null;
    if (raw.body && !raw.bodyParagraphs) raw.bodyParagraphs = [raw.body];
    if (!raw.bodyParagraphs && raw.sections?.body) raw.bodyParagraphs = [raw.sections.body];
    if (raw.plainTextBody && !raw.plainText) raw.plainText = raw.plainTextBody;
    if (raw.htmlBody && !raw.html) raw.html = raw.htmlBody;
    if (raw.footerText && !raw.footer) raw.footer = raw.footerText;
    delete raw.title;
    delete raw.article;
    delete raw.headline;
    delete raw.blogContent;
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

  const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
  const missingFields = result.error.issues
    .filter(i => i.code === 'invalid_type' && i.received === 'undefined' || (i.message.toLowerCase().includes('required')))
    .map(i => i.path.join('.'));

  return { valid: false, errors: issues, missingFields, issues, raw: normalized };
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
    if (repaired.content && !repaired.sections) {
      repaired.sections = [{ heading: 'Content', body: repaired.content, keyTakeaways: [] }];
      delete repaired.content;
    }
    if (repaired.body) {
      if (!repaired.introduction) repaired.introduction = repaired.body.substring(0, 200);
      if (!repaired.sections) repaired.sections = [{ heading: 'Overview', body: repaired.body, keyTakeaways: [] }];
      if (!repaired.conclusion) repaired.conclusion = repaired.body.substring(0, 150);
      delete repaired.body;
    }
    repaired.headline = repaired.headline || repaired.metaTitle || 'Untitled Article';
    repaired.introduction = repaired.introduction || (repaired.headline ? `An overview of ${repaired.headline.toLowerCase()}.` : 'Introduction to this topic.');
    if (!repaired.sections || repaired.sections.length === 0) {
      repaired.sections = [{ heading: 'Overview', body: 'Content not available.', keyTakeaways: [] }];
    }
    repaired.conclusion = repaired.conclusion || 'This concludes the article. Reach out to learn more.';
    repaired.evidenceUsed = repaired.evidenceUsed || [];
    repaired.claimsRequiringReview = repaired.claimsRequiringReview || [];
  }

  if (assetType === 'faq_page') {
    if (repaired.faqItems && !repaired.faqs) { repaired.faqs = repaired.faqItems; delete repaired.faqItems; }
    if (repaired.title && !repaired.headline) { repaired.headline = repaired.title; delete repaired.title; }
    if (repaired.questions && !repaired.faqs) {
      repaired.faqs = repaired.questions.map(q => typeof q === 'string' ? { question: q, answer: '' } : q);
      delete repaired.questions;
    }
    repaired.headline = repaired.headline || 'Frequently Asked Questions';
    repaired.introduction = repaired.introduction || 'Find answers to common questions.';
    if (!repaired.faqs || repaired.faqs.length === 0) {
      repaired.faqs = [{ question: 'What is this about?', answer: 'Please contact us for more information.' }];
    }
  }

  if (assetType === 'linkedin_post') {
    repaired.hook = repaired.hook || repaired.headline || repaired.title || 'Check this out';
    repaired.body = repaired.body || repaired.content || repaired.text || '';
    if (repaired.content && !repaired.body) { repaired.body = repaired.content; delete repaired.content; }
    if (repaired.text && !repaired.body) { repaired.body = repaired.text; delete repaired.text; }
    repaired.body = repaired.body || (repaired.hook ? `Learn more about ${repaired.hook.toLowerCase()}.` : 'Read on for insights.');
    repaired.cta = repaired.cta || repaired.callToAction || 'Learn more';
    repaired.audience = repaired.audience || 'Professionals in the industry';
    repaired.angle = repaired.angle || 'informational';
    repaired.hashtags = repaired.hashtags || [];
  }

  if (assetType === 'instagram_post') {
    repaired.hook = repaired.hook || repaired.headline || 'Check this out';
    repaired.caption = repaired.caption || repaired.body || repaired.content || '';
    repaired.cta = repaired.cta || 'Learn more';
    repaired.hashtags = repaired.hashtags || [];
    repaired.audience = repaired.audience || 'General audience';
    repaired.angle = repaired.angle || 'informational';
  }

  if (assetType === 'twitter_post' || assetType === 'x_post') {
    repaired.post = repaired.post || repaired.content || repaired.text || repaired.body || '';
    if (repaired.content && !repaired.post) { repaired.post = repaired.content; delete repaired.content; }
    if (repaired.body && !repaired.post) { repaired.post = repaired.body; delete repaired.body; }
    repaired.post = repaired.post || 'Check this out';
    repaired.hashtags = repaired.hashtags || [];
    repaired.audience = repaired.audience || 'General audience';
    repaired.angle = repaired.angle || 'informational';
  }

  if (assetType === 'facebook_post') {
    repaired.body = repaired.body || repaired.content || repaired.text || '';
    if (repaired.content && !repaired.body) { repaired.body = repaired.content; delete repaired.content; }
    if (repaired.text && !repaired.body) { repaired.body = repaired.text; delete repaired.text; }
    repaired.body = repaired.body || 'Check this out';
    repaired.audience = repaired.audience || 'General audience';
    repaired.angle = repaired.angle || 'informational';
  }

  if (assetType === 'youtube_description') {
    repaired.title = repaired.title || repaired.headline || 'Video';
    repaired.openingHook = repaired.openingHook || repaired.introduction || 'Watch this video to learn more.';
    repaired.description = repaired.description || repaired.body || repaired.content || '';
    repaired.chapters = repaired.chapters || [];
    repaired.cta = repaired.cta || 'Subscribe for more';
    repaired.hashtags = repaired.hashtags || [];
    repaired.keywords = repaired.keywords || [];
  }

  if (assetType === 'landing_page') {
    repaired.headline = repaired.headline || repaired.title || 'Welcome';
    repaired.painPoints = repaired.painPoints || [];
    if (!repaired.features || repaired.features.length === 0) {
      repaired.features = [{ icon: 'star', title: 'Feature', description: 'Description of the feature.' }];
    }
    repaired.socialProof = repaired.socialProof || [];
    repaired.seoKeywords = repaired.seoKeywords || [];
  }

  if (assetType === 'email_copy' || assetType.startsWith('email_')) {
    repaired.subject = repaired.subject || repaired.subjectLine || 'Update';
    if (repaired.subjectLine && !repaired.subject) { repaired.subject = repaired.subjectLine; delete repaired.subjectLine; }
    repaired.previewText = repaired.previewText || '';
    repaired.greeting = repaired.greeting || 'Hi there,';
    repaired.opening = repaired.opening || repaired.introduction || 'We wanted to share an update with you.';
    if (!repaired.bodyParagraphs || repaired.bodyParagraphs.length === 0) {
      if (repaired.body) { repaired.bodyParagraphs = [repaired.body]; delete repaired.body; }
      else if (repaired.content) { repaired.bodyParagraphs = [repaired.content]; delete repaired.content; }
      else { repaired.bodyParagraphs = ['Check out what we have to offer.']; }
    }
    repaired.ctaText = repaired.ctaText || repaired.cta || 'Learn More';
    if (repaired.cta && !repaired.ctaText) { repaired.ctaText = repaired.cta; delete repaired.cta; }
    repaired.closing = repaired.closing || 'Best regards,';
    repaired.signature = repaired.signature || 'The Team';
  }

  if (assetType === 'comparison_page') {
    repaired.headline = repaired.headline || repaired.title || 'Comparison';
    repaired.introduction = repaired.introduction || 'Compare options to find the best fit.';
    repaired.competitorWeaknesses = repaired.competitorWeaknesses || [];
  }

  if (assetType === 'feature_announcement') {
    repaired.headline = repaired.headline || repaired.title || 'Announcement';
    repaired.body = repaired.body || repaired.content || '';
    repaired.benefits = repaired.benefits || [];
  }

  if (assetType === 'whitepaper') {
    repaired.title = repaired.title || repaired.headline || 'Whitepaper';
    repaired.sections = repaired.sections || [];
    repaired.references = repaired.references || [];
  }

  if (assetType === 'creative_brief') {
    repaired.supportingMessages = repaired.supportingMessages || [];
    repaired.deliverables = repaired.deliverables || [];
    repaired.mandatoryElements = repaired.mandatoryElements || [];
    repaired.prohibitedClaims = repaired.prohibitedClaims || [];
    repaired.brandSignals = repaired.brandSignals || [];
    repaired.evidenceLimitations = repaired.evidenceLimitations || [];
  }

  return repaired;
}
