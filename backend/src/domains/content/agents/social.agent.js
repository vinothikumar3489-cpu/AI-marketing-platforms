import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getKeyword, getEvidenceForTrend, buildFallbackFeatures, buildFallbackBenefits, buildFallbackEvidenceFields } from "./agent.utils.js";

export async function generateLinkedInPost(brief, aiFunction = callAI, normalizedEvidence) {
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
  return generateLinkedInPostFallback(brief, productName, persona, painPoint, usp);
}

function generateLinkedInPostFallback(brief, productName, persona, painPoint, usp) {
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    hook: `${persona} still dealing with ${painPoint}? Here is how leading teams are solving it.`,
    body: `For too long, ${persona} have accepted "${painPoint}" as just part of the workflow. Forward-thinking organizations are taking a new approach with ${productName}.\n\nBy leveraging ${features[0]} and ${features[1]}, teams unlock ${benefits[0]} and ${benefits[1]} — without the overhead of traditional solutions.\n\nThe shift is clear: ${benefits[2] || 'better outcomes'} is achievable with the right foundation.`,
    cta: 'What approach has worked for your team? Share below.',
    hashtags: ['#Productivity', '#Innovation', '#Strategy'],
    audience: persona,
    angle: usp ? 'product differentiation' : 'trend insight',
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}

export async function generateInstagramPost(brief, aiFunction = callAI, normalizedEvidence) {
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
  return generateInstagramPostFallback(brief, productName, persona, painPoint);
}

function generateInstagramPostFallback(brief, productName, persona, painPoint) {
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    hook: `${painPoint} — sound familiar?`,
    caption: `We hear this from ${persona} every day. 👂\n\nThe good news? There is a better way with ${productName}.\n\n✨ ${features[0]}\n✨ ${features[1]}\n\n✅ ${benefits[0]}\n✅ ${benefits[1]}\n\nStop settling for less. 🚀`,
    visualConcept: `Clean, modern interface of ${productName} showing ${features[0] || 'core features'} in use. Professional color scheme with accent highlights.`,
    carouselSlides: [
      { headline: `Meet ${productName}`, body: `Designed for ${persona} to overcome "${painPoint}".`, visualHint: 'Product branding and hero shot' },
      { headline: 'Key Feature', body: features[0] || 'Core platform capability', visualHint: 'Feature screenshot with callouts' },
      { headline: 'Key Benefit', body: benefits[0] || 'Primary value proposition', visualHint: 'Benefit visualization graphic' },
    ],
    imagePrompt: `Product screenshot of ${productName} dashboard, clean UI, modern design, technology context, professional lighting`,
    callToAction: 'Link in bio to learn more',
    hashtags: ['#' + productName.toLowerCase().replace(/\s+/g, ''), '#Productivity', '#Innovation', '#Tech', '#Growth', '#Efficiency', '#Digital', '#FutureOfWork', '#Platform', '#Solution'].slice(0, 10),
    audience: persona,
    angle: 'feature highlight',
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}

export async function generateTwitterPost(brief, aiFunction = callAI, normalizedEvidence) {
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
  return generateTwitterPostFallback(brief, productName, persona, painPoint);
}

function generateTwitterPostFallback(brief, productName, persona, painPoint) {
  const benefits = buildFallbackBenefits(brief);
  return {
    post: `Tired of ${painPoint}? ${productName} helps ${persona} achieve ${benefits[0] || 'better outcomes'} — without the complexity.`,
    cta: 'Learn how →',
    hashtags: ['#' + productName.toLowerCase().replace(/\s+/g, ''), '#Efficiency'],
    audience: persona,
    angle: 'pain point solution',
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}

export async function generateFacebookPost(brief, aiFunction = callAI, normalizedEvidence) {
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
  return generateFacebookPostFallback(brief, productName, persona, painPoint);
}

function generateFacebookPostFallback(brief, productName, persona, painPoint) {
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    headline: `How ${productName} Helps ${persona} Overcome ${painPoint}`,
    body: `We know that ${painPoint} is a real challenge for ${persona}. It affects productivity, team morale, and ultimately your bottom line.\n\nThat is why we built ${productName} — to provide a practical, proven solution.\n\nWith features like ${features[0]} and ${features[1]}, our users are experiencing ${benefits[0]} and ${benefits[1]} every day.\n\n${persona} who have made the switch tell us the biggest difference is ${benefits[2] || 'the simplicity and effectiveness of the platform'}.\n\nWhat challenges have you faced with ${painPoint}? We would love to hear your story.`,
    cta: 'Share your experience in the comments below',
    audience: persona,
    angle: 'community engagement',
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}

export async function generateYouTubeDescription(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
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
  return generateYouTubeDescriptionFallback(brief, productName, persona, painPoint);
}

function generateYouTubeDescriptionFallback(brief, productName, persona, painPoint) {
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    title: `${productName}: Solving ${painPoint} for ${persona}`,
    description: `In this video, we explore how ${productName} helps ${persona} overcome "${painPoint}" with practical, effective solutions.\n\nTopics covered:\n• Understanding the ${painPoint} challenge\n• How ${productName} addresses it with ${features[0]}\n• ${benefits[0]} and ${benefits[1]} — real results\n• Implementation best practices and tips\n\nWatch to learn how your team can benefit from ${productName}.`,
    openingHook: `${painPoint} is costing ${persona} time and resources — here is the solution.`,
    chapters: [
      { timestamp: '0:00', title: 'Introduction' },
      { timestamp: '0:45', title: 'The Challenge' },
      { timestamp: '2:30', title: 'How ' + productName + ' Helps' },
      { timestamp: '4:15', title: 'Key Features Overview' },
      { timestamp: '6:00', title: 'Getting Started' },
    ],
    links: [],
    cta: 'Subscribe for more insights on ' + productName,
    hashtags: ['#' + productName.toLowerCase().replace(/\s+/g, ''), '#Productivity', '#Tutorial', '#HowTo'],
    keywords: [productName, painPoint.toLowerCase(), persona.toLowerCase(), features[0].toLowerCase(), benefits[0].toLowerCase()],
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}
