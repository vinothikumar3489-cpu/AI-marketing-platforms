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
  if (!content.evidenceUsed || content.evidenceUsed.length === 0) score -= 5;
  if (content._fallbackUsed) score -= 30;
  if (content._status === 'fallback') score -= 40;
  return clamp(score);
}

function scoreSeo(content) {
  let score = 70;
  if (content.headline && content.headline.length > 10 && content.headline.length < 71) score += 10;
  if (content.metaDescription && content.metaDescription.length > 50 && content.metaDescription.length < 161) score += 7;
  if (content.targetKeywords?.length > 0) score += 8;
  if (content.seoKeywords?.length > 0) score += 8;
  if (content.keywords?.length > 0) score += 8;
  if (content.hashtags?.length >= 2) score += 5;
  if (content.hashtags?.length >= 5) score += 4;
  const productName = content._productName || content.productName || '';
  if (productName && JSON.stringify(content).toLowerCase().includes(productName.toLowerCase())) score += 5;
  return clamp(score);
}

function scoreReadability(content) {
  let score = 85;
  const textFields = [];
  if (content.body) textFields.push(content.body);
  if (content.caption) textFields.push(content.caption);
  if (content.introduction) textFields.push(content.introduction);
  if (content.description) textFields.push(content.description);
  if (content.post) textFields.push(content.post);
  if (content.hook) textFields.push(content.hook);
  if (content.sections) textFields.push(...content.sections.map(s => s.body || ''));
  if (content.faqs) textFields.push(...content.faqs.map(f => f.answer || ''));
  const fullText = textFields.join(' ');
  if (fullText.length < 50) score -= 15;
  if (fullText.length >= 500) score += 5;
  const sentences = fullText.split(/[.!?]+/).filter(Boolean);
  const avgWords = sentences.length > 0 ? fullText.split(/\s+/).length / sentences.length : 0;
  if (avgWords > 25) score -= 10;
  if (avgWords < 5) score -= 5;
  if (avgWords >= 10 && avgWords <= 20) score += 5;
  const paragraphs = fullText.split('\n').filter(Boolean);
  if (paragraphs.length >= 2) score += 5;
  if (paragraphs.length >= 4) score += 3;
  return clamp(score);
}

function scoreBrandVoice(content, evidenceContext) {
  let score = 75;
  const productName = content._productName || content.productName || '';
  if (productName && JSON.stringify(content).toLowerCase().includes(productName.toLowerCase())) score += 10;
  if (content.audience && content.audience !== 'General audience') score += 5;
  if (content.tone && ['professional', 'conversational', 'educational', 'authoritative'].includes(content.tone.toLowerCase())) score += 5;
  if (!evidenceContext) return clamp(score);
  const brandVoice = evidenceContext.brandVoice?.value || evidenceContext.campaign?.brandVoice?.value || '';
  if (brandVoice) {
    const text = JSON.stringify(content).toLowerCase();
    const voiceWords = brandVoice.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const matched = voiceWords.filter(w => text.includes(w)).length;
    if (matched > 0) score += Math.min(matched * 10, 15);
    if (content.tone && content.tone.toLowerCase() === brandVoice.toLowerCase()) score += 5;
  }
  return clamp(score);
}

function scoreMarketingEffectiveness(content) {
  let score = 65;
  if (content.cta || content.callToAction || content.heroCTA || content.finalCTA) score += 12;
  if (content.headline || content.hook || content.title) score += 8;
  if (content.painPoints?.length > 0) score += 8;
  if (content.benefits?.length > 0) score += 8;
  if (content.socialProof?.length > 0) score += 4;
  if (content.solution || content.body?.length > 100) score += 5;
  return clamp(score);
}

function scoreGrammar(content) {
  let score = 95;
  const text = JSON.stringify(content);
  const doubleSpace = text.match(/\s{2,}/g);
  if (doubleSpace) score -= doubleSpace.length * 3;
  const textOnly = text.replace(/"[^"]*"/g, '').replace(/{[^}]*}/g, '');
  const capsLocked = (textOnly.match(/[A-Z]{4,}/g) || []).length;
  if (capsLocked > 3) score -= 10;
  return clamp(score);
}

function scorePlatformSuitability(content, assetType) {
  let score = 100;
  if (assetType === 'linkedin_post') {
    if (!content.hook) score -= 20;
    if (!content.body) score -= 20;
    if (!content.cta) score -= 5;
  }
  if (assetType === 'twitter_post' || assetType === 'x_post') {
    if (content.post?.length > 280) score -= 30;
    if (content.post?.length >= 50) score += 10;
    if (!content.post) score -= 40;
  }
  if (assetType === 'instagram_post') {
    if (!content.caption) score -= 20;
    if (!content.visualConcept) score -= 10;
    if (!content.imagePrompt && !content.carouselSlides?.length) score -= 5;
  }
  if (assetType === 'facebook_post') {
    if (!content.body) score -= 20;
    if (!content.headline) score -= 10;
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
    if (!content.bodyParagraphs?.length && !content.body) score -= 15;
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
  let score = 60;
  const ctas = [];
  if (content.cta) ctas.push(typeof content.cta === 'string' ? content.cta : content.cta.label || content.cta.text || '');
  if (content.callToAction) ctas.push(typeof content.callToAction === 'string' ? content.callToAction : content.callToAction.label || content.callToAction.text || '');
  if (content.heroCTA) ctas.push(content.heroCTA);
  if (content.finalCTA) ctas.push(content.finalCTA);
  const unique = [...new Set(ctas.filter(Boolean))];
  if (unique.length === 0) return 10;
  score += 15;
  for (const cta of unique) {
    if (cta.length > 15) score += 8;
    if (cta.includes('?') || cta.includes('!')) score += 5;
    if (/start|try|get|discover|explore|see|join|learn/i.test(cta)) score += 5;
    if (/now|today|free|limited|exclusive|access/i.test(cta)) score += 5;
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

  const productName = brief?._productName || brief?.product?.name || 'this solution';
  const persona = brief?.targetPersonas?.[0]?.name || brief?.targetPersonas?.[0]?.role || 'target audience';
  const painPoint = brief?._painPoint || brief?.painPoints?.[0] || 'key challenges';

  let qualityInstructions = '';
  if (lowDimensions.some(d => d.startsWith('professionalism'))) {
    qualityInstructions += '\n- Remove any unsubstantiated claims, generic statements, or vague language. Be specific and evidence-driven.';
  }
  if (lowDimensions.some(d => d.startsWith('seo'))) {
    qualityInstructions += '\n- Include relevant keywords naturally throughout. Ensure headline is SEO-optimized (10-70 chars).';
  }
  if (lowDimensions.some(d => d.startsWith('readability'))) {
    qualityInstructions += '\n- Improve readability: shorter sentences, better paragraph structure, clearer flow. Aim for <20 words per sentence average.';
  }
  if (lowDimensions.some(d => d.startsWith('marketing'))) {
    qualityInstructions += '\n- Strengthen marketing impact. Clear problem → solution → benefit progression. Include specific value propositions.';
  }
  if (lowDimensions.some(d => d.startsWith('cta'))) {
    qualityInstructions += '\n- Make CTA more specific, action-oriented, and compelling. Avoid "Learn More" or "Click Here".';
  }
  if (lowDimensions.some(d => d.startsWith('platform'))) {
    qualityInstructions += '\n- Better align content format and style with the platform requirements and best practices.';
  }
  if (lowDimensions.some(d => d.startsWith('brand'))) {
    qualityInstructions += '\n- Strengthen brand voice consistency. Use language that reflects the brand personality and values.';
  }
  if (lowDimensions.some(d => d.startsWith('grammar'))) {
    qualityInstructions += '\n- Fix grammar issues: remove double spaces, check apostrophes, ensure professional formatting.';
  }

  const prompt = `You are a senior content quality editor for ${productName}.

Improve the following ${assetType} content. Maintain the EXACT same JSON structure.

PRODUCT: ${productName}
TARGET AUDIENCE: ${persona}
PAIN POINT: ${painPoint}

CURRENT CONTENT:
${JSON.stringify(content, null, 2)}

QUALITY SCORE: ${qualityResult.overall}/100
LOW SCORING DIMENSIONS: ${lowDimensions.join(', ') || 'None — slight improvement needed'}
${qualityInstructions}

Return ONLY valid JSON matching the original schema exactly. Improve the content quality, do NOT change the structure.`;

  return prompt;
}

export { QUALITY_WEIGHTS, QUALITY_THRESHOLD };
