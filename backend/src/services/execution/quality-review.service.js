const QUALITY_WEIGHTS = {
  professionalism: 0.15,
  seo: 0.10,
  readability: 0.15,
  brandVoice: 0.10,
  marketingEffectiveness: 0.15,
  grammar: 0.10,
  platformSuitability: 0.15,
  ctaStrength: 0.10,
};

const QUALITY_THRESHOLD = 90;

function clamp(v) { return Math.max(0, Math.min(100, v)); }

function scoreProfessionalism(content) {
  let score = 100;
  const text = JSON.stringify(content).toLowerCase();
  const banned = ['fake', 'invented', 'unverified', 'supposedly', 'allegedly', 'might be', 'could be'];
  for (const b of banned) { if (text.includes(b)) score -= 15; }
  if (!content.evidenceUsed || content.evidenceUsed.length === 0) score -= 10;
  if (content._fallbackUsed) score -= 30;
  if (content._status === 'fallback') score -= 40;
  return clamp(score);
}

function scoreSeo(content) {
  let score = 50;
  const text = JSON.stringify(content).toLowerCase();
  if (content.headline && content.headline.length > 10 && content.headline.length < 71) score += 15;
  if (content.metaDescription && content.metaDescription.length > 50 && content.metaDescription.length < 161) score += 10;
  if (content.targetKeywords?.length > 0) score += 10;
  if (content.seoKeywords?.length > 0) score += 10;
  if (content.keywords?.length > 0) score += 10;
  if (content.hashtags?.length > 0) score += 5;
  return clamp(score);
}

function scoreReadability(content) {
  let score = 80;
  const textFields = [];
  if (content.body) textFields.push(content.body);
  if (content.caption) textFields.push(content.caption);
  if (content.introduction) textFields.push(content.introduction);
  if (content.description) textFields.push(content.description);
  if (content.sections) textFields.push(...content.sections.map(s => s.body || ''));
  if (content.faqs) textFields.push(...content.faqs.map(f => f.answer || ''));
  const fullText = textFields.join(' ');
  const sentences = fullText.split(/[.!?]+/).filter(Boolean);
  const avgWords = sentences.length > 0 ? fullText.split(/\s+/).length / sentences.length : 0;
  if (avgWords > 25) score -= 15;
  if (avgWords < 5) score -= 10;
  if (fullText.length < 100) score -= 20;
  const paragraphs = fullText.split('\n').filter(Boolean);
  if (paragraphs.length > 1 && paragraphs.some(p => p.split(/\s+/).length > 3)) score += 10;
  return clamp(score);
}

function scoreBrandVoice(content, evidenceContext) {
  let score = 70;
  if (!evidenceContext) return clamp(score);
  const brandVoice = evidenceContext.brandVoice?.value || evidenceContext.campaign?.brandVoice?.value || '';
  if (brandVoice) {
    const text = JSON.stringify(content).toLowerCase();
    const voiceWords = brandVoice.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const matched = voiceWords.filter(w => text.includes(w)).length;
    if (matched > 0) score += Math.min(matched * 10, 20);
    if (content.tone && content.tone.toLowerCase() === brandVoice.toLowerCase()) score += 10;
  }
  const productName = evidenceContext.product?.name?.value || '';
  if (productName && JSON.stringify(content).toLowerCase().includes(productName.toLowerCase())) score += 10;
  return clamp(score);
}

function scoreMarketingEffectiveness(content) {
  let score = 60;
  if (content.cta || content.callToAction || content.heroCTA || content.finalCTA) score += 15;
  if (content.headline || content.hook || content.title) score += 10;
  if (content.painPoints?.length > 0) score += 10;
  if (content.benefits?.length > 0) score += 10;
  if (content.socialProof?.length > 0) score += 5;
  return clamp(score);
}

function scoreGrammar(content) {
  let score = 90;
  const text = JSON.stringify(content);
  const issues = [];
  const doubleSpace = text.match(/\s{2,}/g);
  if (doubleSpace) issues.push(doubleSpace.length + ' double spaces');
  if (text.toLowerCase().includes("it's") && !text.toLowerCase().includes("its")) issues.push('apostrophe check');
  const textOnly = text.replace(/"[^"]*"/g, '').replace(/{[^}]*}/g, '');
  if (textOnly.includes('  ')) score -= 5;
  return clamp(score);
}

function scorePlatformSuitability(content, assetType) {
  let score = 100;
  if (assetType === 'linkedin_post') {
    if (content.body?.length > 1500) score -= 20;
    if (!content.hook || content.hook.length > 200) score -= 15;
    if (!content.cta) score -= 10;
  }
  if (assetType === 'twitter_post') {
    if (content.post?.length > 280) score -= 30;
    if (content.post?.length < 50) score -= 10;
    if (!content.post) score -= 40;
  }
  if (assetType === 'instagram_post') {
    if (!content.caption) score -= 20;
    if (!content.visualConcept) score -= 15;
    if (!content.imagePrompt && !content.carouselSlides?.length) score -= 10;
  }
  if (assetType === 'blog_article') {
    if (!content.sections || content.sections.length < 2) score -= 20;
    if (!content.headline) score -= 15;
    if (!content.introduction) score -= 10;
    if (!content.conclusion) score -= 10;
  }
  if (assetType === 'landing_page') {
    if (!content.headline) score -= 20;
    if (!content.heroCTA) score -= 15;
    if (!content.features || content.features.length < 2) score -= 15;
  }
  if (assetType === 'email_copy' || assetType.startsWith('email_')) {
    if (!content.subject) score -= 20;
    if (!content.html) score -= 15;
    if (!content.callToAction && !content.primaryCta) score -= 10;
    if (!content.greeting) score -= 10;
  }
  if (assetType === 'video_script') {
    if (!content.scenes || content.scenes.length < 3) score -= 25;
    if (!content.title) score -= 15;
  }
  if (assetType === 'faq_page') {
    if (!content.faqs || content.faqs.length < 3) score -= 20;
    if (!content.headline) score -= 10;
  }
  if (assetType === 'youtube_description') {
    if (!content.description) score -= 20;
    if (!content.title) score -= 15;
  }
  return clamp(score);
}

function scoreCtaStrength(content) {
  let score = 50;
  const ctas = [];
  if (content.cta) ctas.push(content.cta);
  if (content.callToAction) ctas.push(typeof content.callToAction === 'string' ? content.callToAction : content.callToAction.label || content.callToAction.text || '');
  if (content.heroCTA) ctas.push(content.heroCTA);
  if (content.finalCTA) ctas.push(content.finalCTA);
  const unique = [...new Set(ctas.filter(Boolean))];
  if (unique.length > 0) score += 20;
  for (const cta of unique) {
    if (cta.length > 20) score += 10;
    if (cta.includes('?') || cta.includes('!')) score += 10;
    if (cta.toLowerCase().includes('free') || cta.toLowerCase().includes('try') || cta.toLowerCase().includes('start') || cta.toLowerCase().includes('get')) score += 10;
    if (cta.toLowerCase().includes('learn more') || cta.toLowerCase().includes('click here')) score -= 5;
  }
  return clamp(score);
}

export function scoreContentQuality(content, evidenceContext, assetType) {
  const dimensions = {
    professionalism: scoreProfessionalism(content),
    seo: scoreSeo(content),
    readability: scoreReadability(content),
    brandVoice: scoreBrandVoice(content, evidenceContext),
    marketingEffectiveness: scoreMarketingEffectiveness(content),
    grammar: scoreGrammar(content),
    platformSuitability: scorePlatformSuitability(content, assetType),
    ctaStrength: scoreCtaStrength(content),
  };

  let overall = 0;
  for (const [dim, score] of Object.entries(dimensions)) {
    overall += score * (QUALITY_WEIGHTS[dim] || 0);
  }
  overall = Math.round(overall);

  return {
    overall,
    dimensions,
    needsRewrite: overall < QUALITY_THRESHOLD,
    details: Object.entries(dimensions).map(([k, v]) => ({
      dimension: k,
      score: v,
      weight: QUALITY_WEIGHTS[k] || 0,
      weighted: Math.round(v * (QUALITY_WEIGHTS[k] || 0)),
    })),
    threshold: QUALITY_THRESHOLD,
    gap: overall < QUALITY_THRESHOLD ? QUALITY_THRESHOLD - overall : 0,
  };
}

export function buildRewritePrompt(content, qualityResult, assetType, brief) {
  const lowDimensions = qualityResult.details
    .filter(d => d.score < 70)
    .map(d => `${d.dimension} (${d.score}/100)`);

  const prompt = `Improve the following ${assetType} content for quality.

CURRENT CONTENT:
${JSON.stringify(content, null, 2)}

QUALITY SCORE: ${qualityResult.overall}/100
DIMENSIONS BELOW 70: ${lowDimensions.join(', ') || 'None — slight improvement needed'}

REWRITE INSTRUCTIONS:
${lowDimensions.map(d => `- Improve "${d}" dimension`).join('\n')}

${brief?._retryInstructions ? `\nADDITIONAL: ${brief._retryInstructions}` : ''}

Return the EXACT SAME JSON structure with improvements applied. Only change content, not the schema.`;

  return prompt;
}

export { QUALITY_WEIGHTS, QUALITY_THRESHOLD };
