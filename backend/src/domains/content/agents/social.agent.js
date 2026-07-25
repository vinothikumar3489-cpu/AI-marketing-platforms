import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getKeyword, getEvidenceForTrend, buildFallbackFeatures, buildFallbackBenefits, buildFallbackEvidenceFields } from "./agent.utils.js";

export async function generateLinkedInPost(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const usp = brief.product?.usp || '';
  const trendNote = getEvidenceForTrend(brief);
  const campaignGoal = brief.campaign?.goal?.value || brief.campaign?.goal || '';
  const brandVoice = brief.campaign?.brandVoice?.value || brief.campaign?.brandVoice || brief.brandVoice?.value || brief.brandVoice || 'professional';

  const prompt = `You are a senior LinkedIn content strategist writing for ${productName}.

Write a thought-leadership LinkedIn post that positions ${productName} as the solution for ${persona}.

${productContext}

Platform: LinkedIn
Format: Professional long-form post (1,300-2,000 characters)
Tone: ${brandVoice || 'Professional, authoritative, data-driven'}

STRATEGIC REQUIREMENTS:
- Hook: Open with a provocative industry insight, contrarian take, or data-backed observation about "${painPoint}". Max 200 chars. Must stop the scroll.
- Body: 3-4 short paragraphs. Educate, don't sell. Share a specific framework, methodology, or insight. Reference ${productName}'s capabilities naturally within the narrative. Use line breaks between paragraphs.
- Social Proof: Reference industry trends or market shifts — never invent testimonials. Use "forward-thinking organizations" or "industry leaders" style language.
- CTA: Discussion-oriented. Ask a question or invite debate. Examples: "What's your experience with this?", "How is your team handling this?", "Thoughts below."
- Hashtags: Max 3 branded and industry hashtags. Place only at the end.
- Evidence Reference: Reference specific features, benefits, or data points from the evidence above.
${campaignGoal ? `- Campaign Alignment: Align with the goal: "${campaignGoal}"` : ''}

Do NOT include: fake statistics (no "studies show", "research finds", "87% of"), invented testimonials, competitor bashing, superlatives ("best", "leading", "#1"), generic openers ("In today's world", "In the modern era").

Return valid JSON:
{
  "hook": "string — strong, scroll-stopping opening, max 200 chars",
  "body": "string — 3-4 paragraphs with line breaks, educational content",
  "cta": "string or null — discussion-oriented question or invite",
  "hashtags": ["max", "3", "hashtags"],
  "audience": "string — target persona name from evidence",
  "angle": "string — the specific thought-leadership angle used",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
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
  const brandVoice = brief.campaign?.brandVoice?.value || brief.campaign?.brandVoice || brief.brandVoice?.value || brief.brandVoice || 'professional';

  const prompt = `You are a senior Instagram content creator for ${productName}.

Create a high-engagement Instagram carousel post for ${persona}.

${productContext}

Platform: Instagram (Carousel format)
Tone: ${brandVoice || 'Professional yet approachable'}
Visual Style: Clean, modern, brand-consistent

STRATEGIC REQUIREMENTS:
- Hook: Ultra-short attention grabber, max 100 chars. Must stop the scroll instantly.
- Caption: 4-6 lines with emojis, line breaks, storytelling format. Hook → Problem → Solution → CTA structure.
- Carousel Slides: 4-5 slides. Each slide: headline (bold value prop), body (1-2 sentences), visualHint (describe image for designer/photographer).
- VisualConcept: Full paragraph describing the overall visual direction (color palette, mood, composition, typography).
- ImagePrompt: Detailed text-to-image prompt for DALL-E/Midjourney/Leonardo. Include specific visual elements, lighting, color scheme.
- CallToAction: Platform-appropriate. "Link in bio", "Save for later", "Share with a teammate", "Comment your thoughts".
- Hashtags: 8-10 highly relevant, mix of branded + industry + niche tags.
- Evidence Reference: Every slide should reference specific evidence (features, benefits, pain points).
${trendNote ? `\nNOTE: ${trendNote}` : ''}

Do NOT use: fake stats, testimonials, awards, ROI claims, "stay ahead of the curve", "go viral", "revolutionary".

Return valid JSON:
{
  "hook": "string — max 100 chars, scroll-stopping",
  "caption": "string — 4-6 lines with emojis, storytelling format",
  "visualConcept": "string — detailed visual direction paragraph",
  "carouselSlides": [{"headline": "string — bold value prop", "body": "string — 1-2 sentences", "visualHint": "string or null"}],
  "imagePrompt": "string — detailed text-to-image prompt",
  "callToAction": "string — platform-appropriate CTA",
  "hashtags": ["8-10", "highly", "relevant", "hashtags"],
  "audience": "string — target persona",
  "angle": "string — creative angle used",
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

  const prompt = `You are a senior X (Twitter) writer for ${productName}.

Write a concise, high-impact post for ${persona}.

${productContext}

Platform: X (Twitter)
Format: Single post or thread (indicate [1/n] for threads)
Tone: Sharp, insightful, value-dense

STRICT REQUIREMENTS:
- Must be under 280 characters total including hashtags.
- One clear, powerful idea per post.
- If the concept needs more space, start with "[1/3]" and structure as a thread.
- Hook in first sentence. Immediate value perception.
- CTA can be "RT/follow/link" or discussion prompt.
- Max 1 hashtag, preferably branded.
- Reference a specific pain point or insight from evidence.

CRITICAL: Every character counts. No fluff, no filler, no "In today's world".

Return valid JSON:
{
  "post": "string — max 280 chars total, thread-ready format if needed",
  "cta": "string or null",
  "hashtags": ["max", "1"],
  "audience": "string — target persona",
  "angle": "string — concise angle description",
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
    hashtags: ['#' + productName.toLowerCase().replace(/\s+/g, '')],
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
  const brandVoice = brief.campaign?.brandVoice?.value || brief.campaign?.brandVoice || brief.brandVoice?.value || brief.brandVoice || 'professional';

  const prompt = `You are a senior Facebook content writer for ${productName}.

Write an engaging, community-focused Facebook post for ${persona}.

${productContext}

Platform: Facebook
Format: Long-form community post (3-5 paragraphs)
Tone: ${brandVoice || 'Conversational, community-driven, authentic'}

STRATEGIC REQUIREMENTS:
- Headline: Benefit-driven headline referencing the pain point or solution. Max 150 chars. Use { } around the hook for emphasis if needed.
- Body: 3-5 short paragraphs. Storytelling format: Situation → Challenge → Solution → Outcome. Use "we" and "you" language. Build community connection.
- Engagement: Ask a specific, answerable question to drive comments. Not "What do you think?" but something specific to their experience.
- CTA: Specific, actionable engagement CTA. "Tag a teammate who needs to see this", "Drop your biggest challenge with [painPoint] below", "Comment your score out of 10".
- Evidence: Reference specific features or benefits naturally. Every claim should trace back to evidence.
${brief.campaign?.goal ? `- Align with campaign goal: "${brief.campaign.goal}"` : ''}

Do NOT: fake stats, invented testimonials, superlatives, competitor bashing, fake engagement claims.

Return valid JSON:
{
  "headline": "string — max 150 chars, benefit-driven",
  "body": "string — 3-5 paragraphs, community-focused storytelling",
  "cta": "string — specific engagement CTA, not generic",
  "audience": "string — target persona",
  "angle": "string — community engagement angle",
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
  const keyword = getKeyword(brief, 0) || '';

  const prompt = `You are a senior YouTube SEO strategist for ${productName}.

Write a video title and description optimized for search and click-through.

${productContext}

Platform: YouTube
Format: Video description with SEO optimization

STRATEGIC REQUIREMENTS:
- Title: Click-optimized title. Include target keyword "${keyword}" naturally. Max 70 chars. Use brackets or parentheses for CTAs: [2025 Guide] or (Step-by-Step).
- Description: 4-6 paragraph description. First 2 paragraphs above the fold (visible without clicking "more"). Include:
  1. Hook paragraph with target keyword
  2. What viewers will learn (3-4 bullet points)
  3. Who this is for (persona + pain point)
  4. CTA (subscribe, comment, watch next)
- OpeningHook: One compelling sentence for the video intro. Must create curiosity gap.
- Chapters: 4-5 timestamped chapters with realistic timestamps that match the estimated video length.
- Keywords: 3-5 video-specific keywords from evidence for tags. Use the keyword tool to find exact match.
- CTA: Subscribe + specific next video suggestion.

Do NOT: invent URLs, fake stats, testimonials, superlatives in title ("best", "ultimate").

Return valid JSON:
{
  "title": "string — max 70 chars, click-optimized",
  "description": "string — 4-6 paragraphs, SEO-optimized",
  "openingHook": "string — one compelling sentence, curiosity gap",
  "chapters": [{"timestamp": "0:00", "title": "string"}, {"timestamp": "string", "title": "string"}],
  "cta": "string — subscribe CTA with specific suggestion",
  "hashtags": ["max", "4", "relevant"],
  "keywords": ["3-5", "video", "keywords"],
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
    cta: 'Subscribe for more insights on ' + productName,
    hashtags: ['#' + productName.toLowerCase().replace(/\s+/g, ''), '#Productivity', '#Tutorial', '#HowTo'],
    keywords: [productName, painPoint.toLowerCase(), persona.toLowerCase(), features[0].toLowerCase(), benefits[0].toLowerCase()],
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}
