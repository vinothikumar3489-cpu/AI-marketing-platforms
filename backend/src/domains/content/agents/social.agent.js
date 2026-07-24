import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildEvidenceSection, buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getKeyword, getEvidenceForTrend, FALLBACK_FAILURE } from "./agent.utils.js";

export async function generateLinkedInPost(brief, aiFunction = callAI, normalizedEvidence) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const usp = brief.product?.usp || '';
  const trendNote = getEvidenceForTrend(brief);

  const prompt = `You are a LinkedIn content strategist writing a post for ${productName}.

Write a professional LinkedIn post that resonates with ${persona} who face "${painPoint}".

${productContext}

REQUIREMENTS:
- hook: A strong, scroll-stopping opening statement or question. Must reference the pain point "${painPoint}" or USP "${usp}". Max 200 chars. Lead with an industry insight or contrarian thought.
- body: 2-4 short paragraphs. Professional, thought-leadership tone. Provide educational value — share an industry insight, a data point, or a lesson learned. Reference specific capabilities of ${productName} from evidence.
- cta: A clear product-specific CTA or null. Encourage discussion: "What's your take?" or "Share your experience below". Not generic like "Learn more".
- hashtags: Max 3 relevant, industry-specific hashtags. No hashtags in the body text.
- audience: Who this post targets. Must match one of the personas from evidence.
- angle: One specific angle from: early trend detection, competitor monitoring, creator discovery, content research, ad research, short-form campaign planning, platform comparison, trend saturation avoidance.
- Do NOT include: "In today's world", fake stats, testimonials, awards, ROI claims, pricing, competitor bashing, superlatives (best, ultimate, #1, leading).
${trendNote ? `\nNOTE: ${trendNote}` : ''}

Return valid JSON:
{
  "hook": "string — strong opening with industry insight, max 200 chars",
  "body": "string — 2-4 short paragraphs, educational",
  "cta": "string or null — discussion-oriented",
  "hashtags": ["max", "3", "hashtags"],
  "audience": "string — persona name from evidence",
  "angle": "string — one specific angle",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": ["any unverifiable claims"]
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { }
  return FALLBACK_FAILURE;
}

export async function generateInstagramPost(brief, aiFunction = callAI, normalizedEvidence) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const trendNote = getEvidenceForTrend(brief);

  const prompt = `You are an Instagram content creator writing a post for ${productName}.

Write an Instagram caption that engages ${persona} who deal with "${painPoint}".

${productContext}

REQUIREMENTS:
- hook: A short attention-grabbing opening line. Max 100 chars.
- caption: 3-5 lines of engaging, story-driven caption text. Use emojis where appropriate. Conversational tone.
- visualConcept: Describe the visual that should accompany this post in detail (colors, mood, composition).
- carouselSlides: Array of 3-5 carousel slide objects, each with headline, body, and visualHint. Suggest a swipeable carousel structure.
- imagePrompt: A detailed text-to-image prompt for generating the main post visual (e.g., for DALL-E, Midjourney).
- callToAction: Short call to action like "Link in bio" or "Visit our website" or "Double tap if you agree".
- hashtags: Max 10 relevant, product-specific hashtags.
- audience: Who this targets from evidence.
- angle: Specific angle used.
- Do NOT use: fake stats, testimonials, awards, ROI claims, "stay ahead of the curve", "go viral".
${trendNote ? `\nNOTE: ${trendNote}` : ''}

Return valid JSON:
{
  "hook": "string — max 100 chars",
  "caption": "string — 3-5 lines with emojis",
  "visualConcept": "string — describe the visual in detail",
  "carouselSlides": [{"headline": "string", "body": "string", "visualHint": "string or null"}],
  "imagePrompt": "string — text-to-image prompt",
  "callToAction": "string — short CTA",
  "hashtags": ["string"],
  "audience": "string",
  "angle": "string",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { }
  return FALLBACK_FAILURE;
}

export async function generateTwitterPost(brief, aiFunction = callAI, normalizedEvidence) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are writing an X (Twitter) post for ${productName}.

Write a post that resonates with ${persona} who face "${painPoint}".

${productContext}

REQUIREMENTS:
- post: Max 280 characters total including hashtags. Concise, impactful hook. One clear message. If the topic needs more space, indicate thread-ready format with "[1/3]" notation.
- hashtags: Max 2 hashtags.
- audience: Who this targets from evidence.
- angle: The specific angle used.
- Do NOT use: fake stats, testimonials, superlatives.
- Must be under 280 chars total.

Return valid JSON:
{
  "post": "string — max 280 chars total, thread-ready format if needed",
  "cta": "string or null",
  "hashtags": ["max", "2"],
  "audience": "string",
  "angle": "string",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { }
  return FALLBACK_FAILURE;
}

export async function generateFacebookPost(brief, aiFunction = callAI, normalizedEvidence) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const usp = brief.product?.usp || '';

  const prompt = `You are writing a Facebook post for ${productName}.

Write an engaging, conversational post for ${persona} who face "${painPoint}".

${productContext}

REQUIREMENTS:
- headline: A clear, benefit-driven headline. Max 150 chars.
- body: 3-5 short paragraphs. Long-form conversational style, more detailed than Instagram. Ask a question to encourage comments. Community engagement tone.
- cta: A clear CTA that invites engagement ("Share your thoughts", "Tag a colleague", "Comment below").
- audience: Who this targets from evidence.
- angle: The messaging angle used.
- Do NOT use: fake stats, testimonials, superlatives, competitor bashing, fake engagement claims.

Return valid JSON:
{
  "headline": "string — max 150 chars",
  "body": "string — 3-5 paragraphs, conversational",
  "cta": "string — community engagement CTA",
  "audience": "string",
  "angle": "string",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { }
  return FALLBACK_FAILURE;
}

export async function generateYouTubeDescription(brief, aiFunction = callAI, normalizedEvidence) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are writing a YouTube video description for ${productName}.

${productContext}

REQUIREMENTS:
- title: Clickable video title. Include relevant SEO keyword if available.
- description: 4-6 line video description. Include key topics covered. Ready to paste into YouTube.
- openingHook: A compelling hook sentence for the video intro.
- chapters: Array of timestamped chapters [{timestamp, title}]. Max 5. Use realistic timestamps. Set to [] if no timing supplied.
- links: Empty array — do not invent URLs.
- cta: A clear call to action.
- hashtags: Max 4 relevant hashtags.
- keywords: 3-5 video keywords, product-specific.
- Do NOT: invent URLs, fake stats, testimonials, superlatives.

Return valid JSON:
{
  "title": "string",
  "description": "string — 4-6 lines",
  "openingHook": "string",
  "chapters": [{"timestamp": "string", "title": "string"}],
  "links": [],
  "cta": "string",
  "hashtags": ["string"],
  "keywords": ["string"],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { }
  return FALLBACK_FAILURE;
}
