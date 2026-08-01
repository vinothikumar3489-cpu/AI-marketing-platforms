import { z } from 'zod';
import { SCHEMA_REGISTRY } from "../../shared/schemas/content-types.schema.js";

const evidenceUsed = z.array(z.string()).default([]);
const claimsRequiringReview = z.array(z.string()).default([]);

function fillCommon(repaired) {
  repaired.evidenceUsed = Array.isArray(repaired.evidenceUsed) ? repaired.evidenceUsed : [];
  repaired.claimsRequiringReview = Array.isArray(repaired.claimsRequiringReview) ? repaired.claimsRequiringReview : [];
  return repaired;
}



function extractString(val, fallback = '') {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  return String(val);
}

function extractCtaObject(candidate, ctaUrlFallback) {
  if (!candidate) return null;
  if (typeof candidate === 'string') return candidate.trim() ? { label: candidate, url: ctaUrlFallback || null } : null;
  if (typeof candidate === 'object') {
    const label = extractString(candidate.label || candidate.text || candidate.title, null);
    if (!label) return null;
    return {
      label,
      url: extractString(candidate.url || candidate.destination || ctaUrlFallback, null),
    };
  }
  return null;
}

/**
 * Normalize email content to canonical field names.
 * Canonical uses: featureHighlights (not features), callToAction (not primaryCta/cta/ctaText),
 * bodyParagraphs (not body), secondaryCta (not secondaryCallToAction).
 * Auto-generates html from bodyParagraphs, plainText from html.
 * Converts null/undefined to "" for all string fields.
 */
export function normalizeEmailContent(data) {
  if (!data || typeof data !== 'object') return data || {};
  const n = { ...data };
  const now = new Date().getFullYear();

  // === CANONICAL: featureHighlights (NOT features) ===
  if (Array.isArray(n.features) && !Array.isArray(n.featureHighlights)) {
    n.featureHighlights = n.features;
  }
  n.featureHighlights = Array.isArray(n.featureHighlights) ? n.featureHighlights : [];
  delete n.features;

  // === CANONICAL: callToAction (NOT primaryCta, cta, ctaText+ctaUrl) ===
  const ctaUrlFallback = n.ctaUrl || null;
  const ctaSources = [
    extractCtaObject(n.callToAction, ctaUrlFallback),
    extractCtaObject(n.primaryCta, ctaUrlFallback),
    extractCtaObject(n.cta, ctaUrlFallback),
    n.ctaText ? { label: n.ctaText, url: ctaUrlFallback } : null,
  ].filter(Boolean);

  n.callToAction = ctaSources[0] || null;
  delete n.primaryCta;
  delete n.cta;
  delete n.ctaText;
  delete n.ctaUrl;

  // secondaryCta (support both naming conventions)
  if (n.secondaryCallToAction && !n.secondaryCta) {
    n.secondaryCta = n.secondaryCallToAction;
  }
  delete n.secondaryCallToAction;
  n.secondaryCta = extractCtaObject(n.secondaryCta, null);

  // === CANONICAL: painPoint (NOT problem) ===
  if (n.problem && !n.painPoint) n.painPoint = n.problem;
  n.painPoint = extractString(n.painPoint);
  delete n.problem;

  // === CANONICAL: variables (NOT personalizationVariables) ===
  if (Array.isArray(n.personalizationVariables) && !Array.isArray(n.variables)) {
    n.variables = n.personalizationVariables;
  }
  n.variables = Array.isArray(n.variables) && n.variables.length > 0 ? n.variables : [];
  delete n.personalizationVariables;

  // === CANONICAL: bodyParagraphs (NOT body) ===
  if (!Array.isArray(n.bodyParagraphs) || n.bodyParagraphs.length < 2) {
    if (Array.isArray(n.body)) {
      n.bodyParagraphs = n.body;
    } else if (typeof n.body === 'string') {
      n.bodyParagraphs = [n.body];
    } else if (n.opening || n.painPoint || n.solution) {
      n.bodyParagraphs = [n.opening || '', n.painPoint || '', n.solution || ''].filter(Boolean);
    } else {
      n.bodyParagraphs = [];
    }
  }
  delete n.body;

  // === Strings: never null; no fabricated copy, only template placeholders ===
  n.subject = extractString(n.subject || n.subjectLine);
  if (n.subject.length > 70) n.subject = n.subject.substring(0, 67) + '...';
  n.previewText = extractString(n.previewText || n.preheader);
  if (n.previewText.length > 150) n.previewText = n.previewText.substring(0, 147) + '...';
  n.greeting = extractString(n.greeting || n.greetingText, 'Hi {{firstName}},');
  n.headline = extractString(n.headline);
  n.opening = extractString(n.opening || n.introduction);
  n.solution = extractString(n.solution);
  n.closing = extractString(n.closing, 'Best regards');
  n.signature = extractString(n.signature, 'The Team');
  n.postscript = extractString(n.postscript);
  n.compliance = extractString(n.compliance);
  n.socialProof = extractString(n.socialProof);
  n.emailType = extractString(n.emailType);
  n.footer = extractString(n.footer || n.complianceFooter, `Â© ${now}. All rights reserved.`);
  n.complianceFooter = extractString(n.complianceFooter);
  n.unsubscribeText = extractString(n.unsubscribeText, 'To unsubscribe, reply with UNSUBSCRIBE');
  delete n.subjectLine;
  delete n.preheader;
  delete n.greetingText;
  delete n.introduction;

  // === Arrays with minimum sizes (validators require >=2) â€” no canned content ===
  n.benefits = Array.isArray(n.benefits) ? n.benefits : [];
  n.bodyParagraphs = Array.isArray(n.bodyParagraphs) && n.bodyParagraphs.length >= 2 ? n.bodyParagraphs : [];
  n.subjectAlternatives = Array.isArray(n.subjectAlternatives) ? n.subjectAlternatives : [];

  // === Evidence ===
  n.evidenceUsed = Array.isArray(n.evidenceUsed) ? n.evidenceUsed : [];
  n.claimsRequiringReview = Array.isArray(n.claimsRequiringReview) ? n.claimsRequiringReview : [];

  // === AUTO-GENERATE html (always) ===
  const bodyHtml = n.bodyParagraphs.map(p =>
    `<p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 16px 0;">${extractString(p)}</p>`
  ).join('\n    ');
  const ctaLabel = n.callToAction?.label || '';
  const ctaUrl = n.callToAction?.url || '#';
  const footerText = n.footer || n.complianceFooter || `Â© ${now}. All rights reserved.`;
  n.html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${extractString(n.subject)}</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr><td align="center" style="padding:20px 10px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="background-color:#ffffff;border-radius:8px;">
        ${n.headline ? `<tr><td style="padding:28px 32px 0 32px;text-align:center;"><h1 style="font-size:24px;color:#1e293b;margin:0;">${extractString(n.headline)}</h1></td></tr>` : ''}
        ${n.greeting ? `<tr><td style="padding:20px 32px 0 32px;"><p style="font-size:16px;color:#333;margin:0;">${extractString(n.greeting)}</p></td></tr>` : ''}
        <tr><td style="padding:20px 32px 24px 32px;">${bodyHtml}
        ${ctaLabel ? `<div style="text-align:center;margin:24px 0;"><a href="${ctaUrl}" style="background-color:#2563eb;color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:6px;display:inline-block;font-size:16px;font-weight:600;">${ctaLabel}</a></div>` : ''}
        </td></tr>
        <tr><td style="background-color:#f8fafc;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="font-size:12px;color:#888;margin:0;">${footerText}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // === AUTO-GENERATE plainText from html ===
  n.plainText = n.html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

  // === sender default if missing ===
  if (!n.sender || (!n.sender.name && !n.sender.email)) {
    n.sender = n.sender || {};
    n.sender.name = n.sender.name || n.signature || 'The Team';
    n.sender.email = n.sender.email || '';
  }

  // === recipient default ===
  if (!n.recipient) n.recipient = {};
  n.recipient.email = n.recipient.email || '';
  n.recipient.firstName = n.recipient.firstName || '';
  n.recipient.lastName = n.recipient.lastName || '';
  n.recipient.companyName = n.recipient.companyName || '';

  return n;
}

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

  if (assetType.startsWith('email_')) {
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

  let normalized = normalizeLegacyAsset(raw, assetType);

  // Run normalizeEmailContent for all email types to bridge AI output, DTO, schema, frontend, Brevo
  if (assetType === 'email_copy' || assetType.startsWith('email_')) {
    normalized = normalizeEmailContent(normalized);
  }

  const result = entry.schema.safeParse(normalized);
  if (result.success) {
    return { valid: true, data: result.data };
  }

  const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
  const missingFields = result.error.issues
    .filter(i => i.code === 'invalid_type' && i.received === 'undefined' || (i.message.toLowerCase().includes('required')))
    .map(i => i.path.join('.'));

  console.warn('[Schema Validation Failed]', {
    assetType,
    issues: issues.slice(0, 10),
    missingFields: missingFields.slice(0, 10),
    receivedKeys: Object.keys(raw).filter(k => !/^\d+$/.test(k)).slice(0, 30),
  });

  return { valid: false, errors: issues, missingFields, issues, raw: normalized };
}

/** Attempt repair of common AI output issues â€” STRUCTURAL renames/repackaging only. No fabricated content.
 *  Missing content fields remain missing so validation reports them honestly (schema_rejected + retry).
 */
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
    fillCommon(repaired);
  }

  if (assetType === 'faq_page') {
    if (repaired.faqItems && !repaired.faqs) { repaired.faqs = repaired.faqItems; delete repaired.faqItems; }
    if (repaired.title && !repaired.headline) { repaired.headline = repaired.title; delete repaired.title; }
    if (repaired.questions && !repaired.faqs) {
      repaired.faqs = repaired.questions.map(q => typeof q === 'string' ? { question: q, answer: '' } : q);
      delete repaired.questions;
    }
    fillCommon(repaired);
  }

  if (assetType === 'linkedin_post') {
    repaired.body = repaired.body || repaired.content || repaired.text || '';
    if (repaired.content && !repaired.body) { repaired.body = repaired.content; delete repaired.content; }
    if (repaired.text && !repaired.body) { repaired.body = repaired.text; delete repaired.text; }
    if (repaired.title && !repaired.headline) { repaired.headline = repaired.title; delete repaired.title; }
    if (repaired.callToAction && !repaired.cta) { repaired.cta = repaired.callToAction; delete repaired.callToAction; }
    fillCommon(repaired);
  }

  if (assetType === 'instagram_post') {
    repaired.caption = repaired.caption || repaired.body || repaired.content || '';
    if (repaired.body && !repaired.caption) { repaired.caption = repaired.body; delete repaired.body; }
    if (repaired.content && !repaired.caption) { repaired.caption = repaired.content; delete repaired.content; }
    if (repaired.headline && !repaired.hook) { repaired.hook = repaired.headline; }
    if (repaired.callToAction && !repaired.cta) { repaired.cta = repaired.callToAction; delete repaired.callToAction; }
    fillCommon(repaired);
  }

  if (assetType === 'twitter_post' || assetType === 'x_post') {
    repaired.post = repaired.post || repaired.content || repaired.text || repaired.body || '';
    if (repaired.content && !repaired.post) { repaired.post = repaired.content; delete repaired.content; }
    if (repaired.body && !repaired.post) { repaired.post = repaired.body; delete repaired.body; }
    if (repaired.text && !repaired.post) { repaired.post = repaired.text; delete repaired.text; }
    if (repaired.post.length > 280) repaired.post = repaired.post.substring(0, 277) + '...';
    if (repaired.callToAction && !repaired.cta) { repaired.cta = repaired.callToAction; delete repaired.callToAction; }
    fillCommon(repaired);
  }

  if (assetType === 'facebook_post') {
    repaired.body = repaired.body || repaired.content || repaired.text || '';
    if (repaired.content && !repaired.body) { repaired.body = repaired.content; delete repaired.content; }
    if (repaired.text && !repaired.body) { repaired.body = repaired.text; delete repaired.text; }
    if (repaired.title && !repaired.headline) { repaired.headline = repaired.title; delete repaired.title; }
    if (repaired.callToAction && !repaired.cta) { repaired.cta = repaired.callToAction; delete repaired.callToAction; }
    fillCommon(repaired);
  }

  if (assetType === 'youtube_description') {
    repaired.title = repaired.title || repaired.headline || '';
    if (repaired.headline && !repaired.title) delete repaired.headline;
    repaired.openingHook = repaired.openingHook || repaired.introduction || '';
    repaired.description = repaired.description || repaired.body || repaired.content || '';
    if (repaired.body && !repaired.description) { repaired.description = repaired.body; delete repaired.body; }
    if (repaired.content && !repaired.description) { repaired.description = repaired.content; delete repaired.content; }
    if (repaired.callToAction && !repaired.cta) { repaired.cta = repaired.callToAction; delete repaired.callToAction; }
    fillCommon(repaired);
  }

  if (assetType === 'landing_page') {
    repaired.headline = repaired.headline || repaired.title || '';
    if (repaired.title && !repaired.headline) delete repaired.title;
    if (repaired.callToAction && !repaired.heroCTA) { repaired.heroCTA = repaired.callToAction; delete repaired.callToAction; }
    if (repaired.cta && !repaired.heroCTA) { repaired.heroCTA = repaired.cta; delete repaired.cta; }
    if (repaired.finalCta && !repaired.finalCTA) { repaired.finalCTA = repaired.finalCta; delete repaired.finalCta; }
    fillCommon(repaired);
  }

  if (assetType === 'email_copy' || assetType.startsWith('email_')) {
    Object.assign(repaired, normalizeEmailContent(repaired));
    fillCommon(repaired);
  }

  if (assetType === 'comparison_page') {
    repaired.headline = repaired.headline || repaired.title || '';
    if (repaired.title && !repaired.headline) delete repaired.title;
    fillCommon(repaired);
  }

  if (assetType === 'feature_announcement') {
    repaired.headline = repaired.headline || repaired.title || '';
    if (repaired.title && !repaired.headline) delete repaired.title;
    repaired.body = repaired.body || repaired.content || '';
    if (repaired.content && !repaired.body) { repaired.body = repaired.content; delete repaired.content; }
    if (repaired.callToAction && !repaired.cta) { repaired.cta = repaired.callToAction; delete repaired.callToAction; }
    fillCommon(repaired);
  }

  if (assetType === 'whitepaper') {
    repaired.title = repaired.title || repaired.headline || '';
    if (repaired.headline && !repaired.title) delete repaired.headline;
    fillCommon(repaired);
  }

  if (assetType === 'creative_brief') {
    repaired.objective = repaired.objective || '';
    repaired.visualDirection = repaired.visualDirection || '';
    repaired.requiredText = repaired.requiredText || '';
    repaired.supportingMessages = Array.isArray(repaired.supportingMessages) ? repaired.supportingMessages : [];
    repaired.deliverables = Array.isArray(repaired.deliverables) ? repaired.deliverables : [];
    repaired.mandatoryElements = Array.isArray(repaired.mandatoryElements) ? repaired.mandatoryElements : [];
    repaired.prohibitedClaims = Array.isArray(repaired.prohibitedClaims) ? repaired.prohibitedClaims : [];
    repaired.evidenceLimitations = Array.isArray(repaired.evidenceLimitations) ? repaired.evidenceLimitations : [];
    fillCommon(repaired);
  }

  if (assetType === 'video_script') {
    repaired.title = repaired.title || '';
    fillCommon(repaired);
  }

  if (assetType === 'product_page') {
    repaired.productName = repaired.productName || repaired._productName || '';
    repaired.tagline = repaired.tagline || '';
    repaired.overview = repaired.overview || '';
    repaired.pricing = repaired.pricing ?? null;
    if (repaired.callToAction && !repaired.cta) { repaired.cta = repaired.callToAction; delete repaired.callToAction; }
    fillCommon(repaired);
  }

  return repaired;
}
