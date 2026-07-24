import { validateContentOutput, repairAIOutput } from "./content-schemas.js";
import { SCHEMA_REGISTRY } from "../../shared/schemas/content-types.schema.js";

export function qualityReview(content, assetType, brief) {
  const issues = [];
  const warnings = [];

  // 1. Schema validation
  const schemaValidation = validateContentOutput(content, assetType);
  if (!schemaValidation.valid) {
    issues.push(...schemaValidation.errors.map(e => `schema: ${e}`));
  }

  // 2. SEO keyword usage check
  const keywords = brief?.verifiedKeywords || brief?.seo?.keywords || [];
  const contentText = JSON.stringify(content).toLowerCase();
  const usedKeywords = keywords.filter(k => {
    const kw = (typeof k === 'string' ? k : (k.keyword || k.phrase || '')).toLowerCase();
    return kw && contentText.includes(kw);
  });
  if (keywords.length > 0 && usedKeywords.length === 0) {
    warnings.push('No SEO keywords used in content');
  }

  // 3. CTA validation
  const ctaFields = ['cta', 'callToAction', 'primaryCta', 'heroCTA', 'finalCTA'];
  const hasCta = ctaFields.some(f => {
    const v = content[f];
    return v && (typeof v === 'string' || (typeof v === 'object' && v.label));
  });
  if (!hasCta) {
    warnings.push('No call-to-action found');
  }

  // 4. Readability check (minimum content length)
  const textLength = contentText.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean).length;
  if (textLength < 10) {
    issues.push('Content too short for meaningful output');
  }

  // 5. Platform suitability
  if (assetType === 'twitter_post' || assetType === 'x_post') {
    const postText = content.post || content.text || '';
    if (postText.length > 280) {
      issues.push('X/Twitter post exceeds 280 character limit');
    }
  }
  if (assetType === 'linkedin_post') {
    if (!content.hook) warnings.push('LinkedIn post missing hook');
    if (!content.body) warnings.push('LinkedIn post missing body');
  }
  if (assetType === 'instagram_post') {
    if (!content.caption) warnings.push('Instagram post missing caption');
    if (!content.visualConcept) warnings.push('Instagram post missing visual concept');
  }
  if (assetType.startsWith('email_')) {
    if (!content.subject) issues.push('Email missing subject');
    if (!content.html) warnings.push('Email missing HTML version');
    if (!content.plainText && !content._plainText) warnings.push('Email missing plain text version');
  }

  return {
    passed: issues.length === 0,
    issues,
    warnings,
    usedKeywords: usedKeywords.length,
    totalKeywords: keywords.length,
    wordCount: textLength,
    needsRetry: issues.length > 0,
    score: issues.length === 0 ? (warnings.length === 0 ? 1 : 0.7) : 0.3,
  };
}

export function autoRepair(content, assetType) {
  const repaired = repairAIOutput(content, assetType);

  if (assetType === 'instagram_post') {
    if (!repaired.caption && repaired.body) repaired.caption = repaired.body;
    if (!repaired.caption && repaired.hook) repaired.caption = repaired.hook;
    if (!repaired.caption) repaired.caption = 'Discover how this can help you.';
    if (!repaired.visualConcept) repaired.visualConcept = 'Modern, clean design with product imagery and brand colors.';
    if (!repaired.carouselSlides) repaired.carouselSlides = [];
    if (!repaired.callToAction && repaired.cta) { repaired.callToAction = repaired.cta; delete repaired.cta; }
    if (!repaired.callToAction && repaired.callToAction !== repaired.cta) repaired.callToAction = repaired.cta || null;
    if (!repaired.imagePrompt) repaired.imagePrompt = repaired.visualConcept || null;
    if (!repaired.audience) repaired.audience = 'General audience';
    if (!repaired.angle) repaired.angle = 'informational';
    if (!repaired.hashtags) repaired.hashtags = [];
    if (!repaired.evidenceUsed) repaired.evidenceUsed = [];
    if (!repaired.claimsRequiringReview) repaired.claimsRequiringReview = [];
  }

  if (assetType === 'linkedin_post') {
    if (!repaired.hook) repaired.hook = 'Check this out';
    if (!repaired.body) repaired.body = repaired.content || repaired.text || '';
    if (!repaired.hashtags) repaired.hashtags = [];
    if (!repaired.audience) repaired.audience = 'Professionals';
    if (!repaired.angle) repaired.angle = 'informational';
  }

  if (assetType.startsWith('email_')) {
    if (!repaired.subject) repaired.subject = 'Update';
    if (!repaired.previewText) repaired.previewText = repaired.subject;
    if (!repaired.greeting) repaired.greeting = 'Hi {{firstName}},';
    if (!repaired.opening) repaired.opening = 'We wanted to share an update with you.';
    if (!repaired.bodyParagraphs || !repaired.bodyParagraphs.length) {
      repaired.bodyParagraphs = [repaired.body || 'Check out what we have to offer.'];
    }
    if (!repaired.benefits || !repaired.benefits.length) repaired.benefits = ['Improved efficiency', 'Better results', 'Easy to use'];
    if (!repaired.primaryCta) repaired.primaryCta = { label: 'Learn More', url: '#' };
    if (!repaired.closing) repaired.closing = 'Best regards';
    if (!repaired.signature) repaired.signature = 'The Team';
    if (!repaired.complianceFooter) repaired.complianceFooter = `© ${new Date().getFullYear()}. All rights reserved.`;
    if (!repaired.unsubscribeText) repaired.unsubscribeText = 'Unsubscribe';
    if (!repaired.html) repaired.html = `<p>${repaired.opening}</p><p>${Array.isArray(repaired.bodyParagraphs) ? repaired.bodyParagraphs.join('</p><p>') : repaired.bodyParagraphs}</p>`;
    if (!repaired.plainText) repaired.plainText = [repaired.opening, ...(Array.isArray(repaired.bodyParagraphs) ? repaired.bodyParagraphs : [])].join('\n\n');
  }

  return repaired;
}

export default { qualityReview, autoRepair };