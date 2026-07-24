import { z } from 'zod';
import { SCHEMA_REGISTRY } from "../../shared/schemas/content-types.schema.js";

const evidenceUsed = z.array(z.string()).default([]);
const claimsRequiringReview = z.array(z.string()).default([]);

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
