import { PLATFORM_QUALITY_RULES } from './quality-scorer.service.js';

const QUALITY_WEIGHTS = {
  productAccuracy: 0.12,
  audienceRelevance: 0.10,
  platformBestPractices: 0.08,
  seo: 0.08,
  readability: 0.08,
  storytelling: 0.10,
  persuasiveness: 0.08,
  ctaStrength: 0.08,
  brandConsistency: 0.08,
  originality: 0.06,
  evidenceCoverage: 0.08,
  marketingImpact: 0.06,
};

const QUALITY_THRESHOLD = 92;

function clamp(v) { return Math.max(0, Math.min(100, v)); }

function getText(content) {
  const textFields = [];
  if (content.body) textFields.push(content.body);
  if (content.caption) textFields.push(content.caption);
  if (content.introduction) textFields.push(content.introduction);
  if (content.description) textFields.push(content.description);
  if (content.post) textFields.push(content.post);
  if (content.hook) textFields.push(content.hook);
  if (content.sections) textFields.push(...content.sections.map(s => s.body || s.content || ''));
  if (content.faqs) textFields.push(...content.faqs.map(f => f.answer || ''));
  if (content.article) textFields.push(content.article);
  if (content.bodyParagraphs) textFields.push(content.bodyParagraphs.join(' '));
  return textFields.join(' ');
}

function scoreProductAccuracy(content) {
  let score = 70;
  const productName = content._productName || content.productName || '';
  if (!productName) return 30;
  const text = JSON.stringify(content).toLowerCase();
  const escaped = productName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mentions = (text.match(new RegExp(escaped, 'g')) || []).length;
  if (mentions === 0) score -= 20;
  else if (mentions >= 3) score += 15;
  else if (mentions >= 1) score += 10;
  const features = content.features || content.featureHighlights || [];
  if (features.length > 0) score += Math.min(features.length * 5, 15);
  return clamp(score);
}

function scoreAudienceRelevance(content) {
  let score = 60;
  const text = JSON.stringify(content).toLowerCase();
  const personaIndicators = ['you', 'your', 'team', 'business', 'organization', 'grow', 'scale', 'solution', 'pain point', 'challenge', 'struggle'];
  const hits = personaIndicators.filter(w => text.includes(w)).length;
  score += hits * 5;
  const painPoints = content.painPoints || [];
  if (painPoints.length > 0) score += Math.min(painPoints.length * 10, 20);
  if (content.audience && content.audience !== 'General audience') score += 10;
  if (hits < 2) score -= 10;
  return clamp(score);
}

function scorePlatformBestPractices(content, assetType) {
  let score = 80;
  const rule = PLATFORM_QUALITY_RULES[assetType];
  if (rule) {
    const result = rule(content);
    if (result.status === 'blocked') score -= 30;
    else if (result.status === 'needs_review') score -= 15;
    else if (result.status === 'passed') score += 10;
  }
  if (assetType === 'linkedin_post') {
    if (content.hook) score += 5;
    if (content.bodyParagraphs?.length > 2) score += 5;
  }
  if (assetType === 'twitter_post' || assetType === 'x_post') {
    const postText = content.post || '';
    if (postText.length <= 280) score += 5;
    if (postText.length >= 50) score += 3;
  }
  if (assetType === 'instagram_post') {
    if (content.caption) score += 5;
  }
  return clamp(score);
}

function scoreSeo(content) {
  let score = 75;
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
  let score = 80;
  const fullText = getText(content);
  if (fullText.length < 50) score -= 15;
  if (fullText.length >= 500) score += 5;
  const sentences = fullText.split(/[.!?]+/).filter(Boolean);
  const avgWords = sentences.length > 0 ? fullText.split(/\s+/).length / sentences.length : 0;
  if (avgWords > 22) score -= 15;
  if (avgWords < 5) score -= 5;
  if (avgWords >= 10 && avgWords <= 18) score += 10;
  const paragraphs = fullText.split('\n').filter(Boolean);
  if (paragraphs.length >= 3) score += 5;
  if (paragraphs.length >= 5) score += 3;
  return clamp(score);
}

function scoreStorytelling(content) {
  let score = 60;
  const text = JSON.stringify(content).toLowerCase();
  const hookIndicators = ['imagine', 'picture this', 'have you ever', 'what if', 'the problem', 'struggle', 'frustrat', 'challenge'];
  const problemIndicators = ['problem', 'issue', 'pain point', 'struggle with', 'difficult', 'hard to', 'waste'];
  const solutionIndicators = ['solution', 'solves', 'resolves', 'fix', 'address', 'platform', 'tool', 'approach', 'method'];
  const outcomeIndicators = ['result', 'outcome', 'benefit', 'improve', 'increase', 'reduce', 'save', 'achieve', 'success'];
  const emotionalLanguage = ['frustrat', 'excit', 'amaz', 'transform', 'empower', 'struggle', 'delight', 'surpris', 'inspire'];
  const hooks = hookIndicators.filter(w => text.includes(w)).length;
  const problems = problemIndicators.filter(w => text.includes(w)).length;
  const solutions = solutionIndicators.filter(w => text.includes(w)).length;
  const outcomes = outcomeIndicators.filter(w => text.includes(w)).length;
  const emotions = emotionalLanguage.filter(w => text.includes(w)).length;
  if (hooks > 0) score += 15;
  if (problems > 0) score += 10;
  if (solutions > 0) score += 10;
  if (outcomes > 0) score += 10;
  if (emotions > 0) score += Math.min(emotions * 5, 10);
  if (hooks === 0 && problems === 0) score -= 15;
  if (text.split(/[.!?]+/).filter(Boolean).length < 3) score -= 10;
  return clamp(score);
}

function scorePersuasiveness(content) {
  let score = 60;
  const text = JSON.stringify(content).toLowerCase();
  const benefitWords = ['benefit', 'advantage', 'value', 'roi', 'save', 'increase', 'improve', 'grow', 'accelerate', 'optimize'];
  const valueProps = ['because', 'which means', 'so you can', 'enables', 'allows', 'helps', 'empowers'];
  const painAcknowledgment = ['you know', 'we understand', 'we know that', 'it can be', 'tired of', 'struggle', 'challenge', 'problem'];
  const benefits = benefitWords.filter(w => text.includes(w)).length;
  const props = valueProps.filter(w => text.includes(w)).length;
  const pain = painAcknowledgment.filter(w => text.includes(w)).length;
  score += benefits * 6;
  score += props * 6;
  score += pain * 4;
  const hasCta = [content.cta, content.callToAction, content.primaryCta, content.heroCTA, content.finalCTA].some(Boolean);
  if (hasCta) score += 10;
  return clamp(score);
}

function getCtaLabel(candidate) {
  if (!candidate) return '';
  if (typeof candidate === 'string') return candidate;
  if (typeof candidate === 'object') return candidate.label || candidate.text || candidate.title || '';
  return String(candidate);
}

function scoreCtaStrength(content) {
  let score = 60;
  const labels = [];
  const pushLabel = (field) => {
    const label = getCtaLabel(field);
    if (label) labels.push(label);
  };
  pushLabel(content.cta);
  pushLabel(content.callToAction);
  pushLabel(content.primaryCta);
  pushLabel(content.heroCTA);
  pushLabel(content.finalCTA);
  if (content.ctaText && typeof content.ctaText === 'string') labels.push(content.ctaText);
  const unique = [...new Set(labels.filter(Boolean))];
  if (unique.length === 0) return 10;
  score += 15;
  const weakCtas = ['learn more', 'click here', 'read more', 'see more', 'get started'];
  for (const cta of unique) {
    const lower = cta.toLowerCase();
    if (weakCtas.some(w => lower.includes(w))) score -= 10;
    if (cta.length > 15) score += 8;
    if (cta.includes('?') || cta.includes('!')) score += 5;
    if (/start|try|get|discover|explore|see|join|claim|reserve|build/i.test(cta)) score += 5;
    if (/now|today|free|limited|exclusive|access|instant|immediately/i.test(cta)) score += 5;
  }
  return clamp(score);
}

function scoreBrandConsistency(content, evidenceContext) {
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

function scoreOriginality(content) {
  let score = 85;
  const text = JSON.stringify(content).toLowerCase();
  const banned = [
    "in today's world", "in today's digital", "in today's fast-paced",
    "revolutionary", "game-changing", "game changer",
    "cutting-edge", "state of the art", "state-of-the-art",
    "thought leader", "thought leadership",
    "paradigm shift", "disrupt", "disruptive",
    "it's important to note", "it goes without saying",
    "needless to say", "at the end of the day",
    "in conclusion", "to sum up", "in summary",
    "as we all know", "it's no secret",
    "when it comes to", "in the realm of",
    "next level", "the best", "world-class",
    "unmatched", "unbeatable", "empower",
    "synergy", "leverage", "holistic",
    "drill down", "circle back", "touch base",
    "deep dive", "bandwidth", "pivot",
    "robust", "streamline", "scalable"
  ];
  let deductions = 0;
  for (const phrase of banned) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const matches = text.match(regex);
    if (matches) deductions += matches.length * 8;
  }
  score -= Math.min(deductions, 60);
  if (score < 25) score = 25;
  return clamp(score);
}

function scoreEvidenceCoverage(content) {
  let score = 60;
  const evidenceUsed = content.evidenceUsed || [];
  const claims = content.claimsRequiringReview || [];
  if (evidenceUsed.length > 0) score += Math.min(evidenceUsed.length * 10, 30);
  if (content._evidenceSnapshot || content._evidenceSources) score += 10;
  if (claims.length > 0) score -= Math.min(claims.length * 5, 20);
  if (evidenceUsed.length === 0 && claims.length === 0) score += 5;
  return clamp(score);
}

function scoreMarketingImpact(content) {
  let score = 55;
  if (content.headline || content.hook || content.title) score += 10;
  if (content.cta || content.callToAction || content.primaryCta || content.heroCTA || content.finalCTA) score += 12;
  if (content.socialProof?.length > 0) score += 8;
  if (content.benefits?.length > 0) score += 8;
  if (content.solution || content.body?.length > 100) score += 7;
  if (content.headline && (content.cta || content.callToAction || content.primaryCta)) score += 5;
  return clamp(score);
}

export function scoreContentQuality(content, evidenceContext, assetType) {
  const dimensions = {
    productAccuracy: scoreProductAccuracy(content),
    audienceRelevance: scoreAudienceRelevance(content),
    platformBestPractices: scorePlatformBestPractices(content, assetType),
    seo: scoreSeo(content),
    readability: scoreReadability(content),
    storytelling: scoreStorytelling(content),
    persuasiveness: scorePersuasiveness(content),
    ctaStrength: scoreCtaStrength(content),
    brandConsistency: scoreBrandConsistency(content, evidenceContext),
    originality: scoreOriginality(content),
    evidenceCoverage: scoreEvidenceCoverage(content),
    marketingImpact: scoreMarketingImpact(content),
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
  if (lowDimensions.some(d => d.startsWith('productAccuracy'))) {
    qualityInstructions += '\n- Reference specific product features and name naturally. Ensure every product claim maps to verified evidence.';
  }
  if (lowDimensions.some(d => d.startsWith('audienceRelevance'))) {
    qualityInstructions += '\n- Speak directly to the target persona. Reference their specific pain points, goals, and challenges.';
  }
  if (lowDimensions.some(d => d.startsWith('platformBestPractices'))) {
    qualityInstructions += '\n- Align the content format and structure with platform-specific best practices and requirements.';
  }
  if (lowDimensions.some(d => d.startsWith('seo'))) {
    qualityInstructions += '\n- Include relevant keywords naturally. Ensure headline is SEO-optimized (10-70 chars), meta description 50-160 chars.';
  }
  if (lowDimensions.some(d => d.startsWith('readability'))) {
    qualityInstructions += '\n- Improve readability: shorter sentences (<20 words avg), better paragraph structure, clearer flow.';
  }
  if (lowDimensions.some(d => d.startsWith('storytelling'))) {
    qualityInstructions += '\n- Strengthen narrative arc: hook → problem → solution → outcome. Use emotional language and specific examples.';
  }
  if (lowDimensions.some(d => d.startsWith('persuasiveness'))) {
    qualityInstructions += '\n- Add benefit-driven arguments and value propositions. Acknowledge pain points and present compelling reasons to act.';
  }
  if (lowDimensions.some(d => d.startsWith('ctaStrength'))) {
    qualityInstructions += '\n- Make CTA more specific and action-oriented. Avoid "Learn More" or "Click Here". Include urgency or value.';
  }
  if (lowDimensions.some(d => d.startsWith('brandConsistency'))) {
    qualityInstructions += '\n- Maintain consistent brand voice and product name usage throughout. Align with brand personality.';
  }
  if (lowDimensions.some(d => d.startsWith('originality'))) {
    qualityInstructions += '\n- Remove generic AI phrases, filler language, and clichés. Write original, specific content.';
  }
  if (lowDimensions.some(d => d.startsWith('evidenceCoverage'))) {
    qualityInstructions += '\n- Ensure every claim is backed by evidence. Include citations and avoid unsupported assertions.';
  }
  if (lowDimensions.some(d => d.startsWith('marketingImpact'))) {
    qualityInstructions += '\n- Strengthen overall conversion potential. Ensure clear value proposition, strong headline, and compelling CTA.';
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
