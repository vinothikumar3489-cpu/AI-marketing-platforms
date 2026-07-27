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

  const prompt = `You are an executive thought-leadership strategist advising the C-suite at ${productName}. Your audience is ${persona} — senior leaders who evaluate decisions on strategic impact and ROI.

Write a LinkedIn post that establishes the author as a peer-level authority for ${persona}.

${productContext}

Platform: LinkedIn
Format: Executive insight post (1,300-2,000 characters)
Tone: ${brandVoice || 'Executive, authoritative, contrarian'}

STRATEGIC REQUIREMENTS:
- Hook: Open with a provocative industry insight, contrarian take, or an observation that challenges a widely held assumption about "${painPoint}". Max 200 chars. Must stop the scroll. No questions — state a thesis.
- Body: 3-4 tight paragraphs, separated by line breaks. Educate through a specific framework, methodology, or approach. Reference ${productName}'s features and benefits organically as proof points. Every paragraph must tie back to a business outcome — efficiency gain, revenue impact, cost reduction, or strategic advantage.
- Evidence Anchoring: Every substantive claim must reference a specific feature, benefit, pain point, or campaign goal from the evidence above. Use natural language, not bullet lists.
- CTA: Discussion-oriented. Invite debate or ask a question that positions the author as a leader willing to challenge convention. Examples: "I'd push back on that — here is why.", "What is your team doing differently?", "The data I have seen suggests otherwise — agree or disagree?"
- Hashtags: Max 3. Branded + industry. Place only at the end of the post.
${campaignGoal ? `- Campaign Alignment: Align with the goal: "${campaignGoal}"` : ''}

CRITICAL CONSTRAINTS:
- You MUST NOT include: fake statistics, percentages, "studies show", "research finds", "data shows", invented testimonials, competitor bashing, superlatives ("best", "leading", "#1"), cliché openers ("In today's world", "The modern era", "It's no secret").
- You MUST use only evidence explicitly present in the brief above.
- Any claim not directly supported by the brief MUST be listed in claimsRequiringReview.

Return valid JSON:
{
  "hook": "string — provocative thesis, max 200 chars",
  "body": "string — 3-4 paragraphs, each tied to business outcome, separated by \\n\\n",
  "cta": "string or null — discussion-oriented, invites debate or alternative views",
  "hashtags": ["max", "3", "hashtags"],
  "audience": "string — target persona from evidence",
  "angle": "string — the specific thought-leadership angle used",
  "evidenceUsed": ["list of evidence fields referenced in the post"],
  "claimsRequiringReview": ["list claims that lack direct evidence support, or empty array"]
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[LinkedIn Agent] AI success', { hasHook: !!result.data.hook, hasBody: !!result.data.body, provider: result.provider });
      return { ...result.data, _provider: result.provider, _traceId: result.traceId };
    }
    console.warn('[LinkedIn Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) {
    console.error('[LinkedIn Agent] AI generation error:', e.message);
  }
  return generateLinkedInPostFallback(brief, productName, persona, painPoint, usp);
}

function generateLinkedInPostFallback(brief, productName, persona, painPoint, usp) {
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    hook: `Most ${persona} treat "${painPoint}" as an operational given. That assumption is costing them.`,
    body: `For most organizations, "${painPoint}" has been accepted as an inevitability — a line item budgeted for rather than eliminated. The teams that break from this pattern do not just reduce friction; they reallocate resources toward strategic advantage.\n\n${productName} challenges that default. By applying ${features[0]} and ${features[1]}, leaders convert a cost center into a capability — unlocking ${benefits[0]} and ${benefits[1]} that directly impact the bottom line.\n\nThe distinction between teams that manage ${painPoint.toLowerCase()} and teams that eliminate it is not budget — it is architecture. The latter group treats ${painPoint.toLowerCase()} as a design problem, not an operational one.`,
    cta: 'If your team has found a way to turn this pain point into a strategic lever, I would like to hear your approach.',
    hashtags: ['#Leadership', '#Strategy', '#ExecutiveInsight'],
    audience: persona,
    angle: usp ? 'product differentiation' : 'contrarian take',
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

  const prompt = `You are a senior Instagram content strategist for ${productName}.

Create a high-engagement Instagram carousel post for ${persona}. Use a carousel-first strategy — a minimum of 5 slides.

${productContext}

Platform: Instagram (Carousel format)
Tone: ${brandVoice || 'Professional yet approachable'}
Visual Style: Clean, modern, brand-consistent

STRATEGIC REQUIREMENTS:
- Hook: Ultra-short attention grabber, max 100 chars. Must stop the scroll instantly.
- Caption: Follow this exact structure: Hook → Problem → Solution → CTA → Hashtags. Use emojis and line breaks for readability. Do not exceed 6 lines.
- Carousel Slides: Minimum 5 slides. Each slide must include: headline (bold value prop), body (1-2 sentences), visualHint (describe image for designer/photographer).
- Visual Brief: Write a detailed paragraph for the designer covering color palette, mood, composition, and typography.
- Image Prompt: Write a detailed DALL-E/Midjourney-style prompt for the cover image. Include specific visual elements, lighting, color scheme, camera angle, and mood.
- Reel Idea: Include a "reelIdea" field with a short script outline, suggested duration (15-30s), and music suggestion.
- CallToAction: Use one of these exact CTAs — "Save for later", "Share with a teammate", "Comment your thoughts".
- Hashtags: 8-10 hashtags — mix of branded + industry + niche tags.
- Evidence Reference: EVERY slide must reference specific evidence (features, benefits, pain points, data points from the brief above).
${trendNote ? `\nNOTE: ${trendNote}` : ''}

Do NOT use: fake stats, testimonials, awards, ROI claims, "stay ahead of the curve", "go viral", "revolutionary".

Return valid JSON:
{
  "hook": "string — max 100 chars, scroll-stopping",
  "caption": "string — Hook → Problem → Solution → CTA → Hashtags, emojis, line breaks",
  "visualConcept": "string — detailed visual brief for designer (color palette, mood, composition, typography)",
  "carouselSlides": [{"headline": "string — bold value prop", "body": "string — 1-2 sentences", "visualHint": "string or null"}],
  "imagePrompt": "string — detailed DALL-E/Midjourney-style prompt for cover image",
  "reelIdea": "string — script outline, duration (15-30s), music suggestion",
  "callToAction": "string — one of: Save for later, Share with a teammate, Comment your thoughts",
  "hashtags": ["8-10", "mix", "branded", "industry", "niche"],
  "audience": "string — target persona",
  "angle": "string — creative angle used",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[Instagram Agent] AI success', { hasCaption: !!result.data.caption, hasHook: !!result.data.hook, provider: result.provider });
      return { ...result.data, _provider: result.provider, _traceId: result.traceId };
    }
    console.warn('[Instagram Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) {
    console.error('[Instagram Agent] AI generation error:', e.message);
  }
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
    reelIdea: `Quick-cut reel (20s): Open with "${painPoint} — sound familiar?" → show ${persona} struggling → transition to ${productName} solving it → feature close-ups → end card "Save for later". Music: upbeat lo-fi / trending instrumental.`,
    callToAction: 'Save for later',
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

  const prompt = `You are a senior X (Twitter) strategist for ${productName}, writing viral, high-engagement posts for ${persona}.

${productContext}

Platform: X (Twitter)
Format: Short-form posts (max 280 chars each)
Tone: Sharp, contrarian, conversational

VIRAL STRUCTURE REQUIREMENTS:
- Hook in the FIRST 60 characters. Open with a question, bold claim, or contrarian take.
- Create a curiosity gap — make them need the next line.
- Short, punchy sentences. One idea per sentence.
- Max 280 characters per post including hashtags.
- HIGH engagement mechanics: include a question, poll suggestion, or opinion that invites replies.

OUTPUT REQUIREMENTS:
- Generate 3 different tweet variants (different angles, same core message).
- Max 2 hashtags: 1 branded + 1 trending/niche.
- Reference a specific pain point or insight from evidence.
- No filler words, no "In today's world", no generic statements.

CRITICAL: Every character must earn its place.

Return valid JSON:
{
  "post": "string — primary tweet, max 280 chars",
  "variants": [
    "string — alternative tweet 1, different angle, max 280 chars",
    "string — alternative tweet 2, different angle, max 280 chars",
    "string — alternative tweet 3, different angle, max 280 chars"
  ],
  "cta": "string or null — question, poll suggestion, or reply-bait",
  "hashtags": ["branded", "niche"],
  "audience": "string — target persona",
  "angle": "string — concise angle description",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[Twitter Agent] AI success', { hasPost: !!result.data.post, provider: result.provider });
      return { ...result.data, _provider: result.provider, _traceId: result.traceId };
    }
    console.warn('[Twitter Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) {
    console.error('[Twitter Agent] AI generation error:', e.message);
  }
  return generateTwitterPostFallback(brief, productName, persona, painPoint);
}

function generateTwitterPostFallback(brief, productName, persona, painPoint) {
  const benefits = buildFallbackBenefits(brief);
  const features = buildFallbackFeatures(brief);
  const tag = '#' + productName.toLowerCase().replace(/\s+/g, '');
  return {
    post: `Tired of ${painPoint}? ${productName} helps ${persona} achieve ${benefits[0] || 'better outcomes'} — without the complexity.`,
    variants: [
      `${painPoint} eating your team's time? ${productName} flips it. ${benefits[0] || 'Better outcomes'} in half the effort.`,
      `Most ${persona} accept ${painPoint} as normal. We don't. ${productName} ${features[0] || 'changes the game'}.`,
      `Stop fighting ${painPoint}. ${productName} ${benefits[1] || 'streamlines everything'} for ${persona}. Question is — can you afford not to?`
    ],
    cta: "What's your biggest challenge with this? Drop it below.",
    hashtags: [tag, '#' + (brief.trend || painPoint.toLowerCase().replace(/\s+/g, ''))],
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

  const prompt = `You are a community manager writing a Facebook group conversation starter for ${productName}.

Write a Facebook post that reads like a community discussion starter — not a broadcast — for ${persona}.

${productContext}

Platform: Facebook
Format: Community discussion post (3-5 short paragraphs)
Tone: ${brandVoice || 'Conversational, community-driven, authentic'}

STRATEGIC REQUIREMENTS:
- Emotional Hook: Open with a relatable scenario or personal anecdote about "${painPoint}". Make it feel like a conversation between peers.
- Body (Situation → Challenge → Solution → Outcome): 3-5 short paragraphs. Use "we" and "you" language. Build community connection.
- Comment CTA: A specific question that drives comments. NOT "What do you think?" — instead ask something like "Tag a teammate who struggles with [specific problem]" or "Drop a 🙋 if this hits close to home."
- Share CTA: Include a share-worthy angle. Something like "Share this with someone who needs to hear it."
- Evidence: Every claim must trace back to evidence from the brief. Reference specific features and benefits naturally.
${brief.campaign?.goal ? `- Align with campaign goal: "${brief.campaign.goal}"` : ''}

Do NOT: fake stats, invented testimonials, superlatives, competitor bashing, fake engagement claims, generic openers.

Return valid JSON:
{
  "headline": "string — max 150 chars, conversation hook",
  "body": "string — 3-5 paragraphs, Situation → Challenge → Solution → Outcome",
  "cta": "string — specific comment-driving question, NOT generic",
  "shareCta": "string — share invitation, e.g. 'Share this with someone who needs to hear it'",
  "audience": "string — target persona",
  "angle": "string — community engagement angle",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[Facebook Agent] AI success', { hasHeadline: !!result.data.headline, hasBody: !!result.data.body, provider: result.provider });
      return { ...result.data, _provider: result.provider, _traceId: result.traceId };
    }
    console.warn('[Facebook Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) {
    console.error('[Facebook Agent] AI generation error:', e.message);
  }
  return generateFacebookPostFallback(brief, productName, persona, painPoint);
}

function generateFacebookPostFallback(brief, productName, persona, painPoint) {
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    headline: `We have all been there — ${painPoint} is real. Here is how we are fixing it.`,
    body: `You know that feeling when ${painPoint.toLowerCase()} keeps slowing you down? We have been there too.\n\nIt starts small — just another task on the list. But before you know it, it is eating into your team's time, energy, and morale.\n\nThat is why we built ${productName}. With ${features[0]} and ${features[1]}, we are helping ${persona} cut through the noise and focus on what actually matters.\n\nThe result? ${benefits[0]} and ${benefits[1]} — without the headache.\n\nThis is not just another tool. It is a different way of working together.`,
    cta: 'Tag a teammate who deals with this every day 👇',
    shareCta: 'Share this with someone who needs to hear it.',
    audience: persona,
    angle: 'community conversation starter',
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

Write a video title and description optimized for search, CTR, and retention.

${productContext}

Platform: YouTube
Format: Video description with SEO optimization
Estimated video length: 6–10 minutes

REQUIREMENTS:

1. SEO TITLE — Include primary keyword "${keyword}" naturally. Max 70 chars. Use brackets or parentheses for CTAs like [2025 Guide] or (Step-by-Step). First 3 words must create urgency or curiosity using power words (e.g., "Stop Wasting Time", "The Secret To", "Why Your Team", "Never Do This").

2. RETENTION-FOCUSED DESCRIPTION — 4–6 SEO paragraphs. First 2 paragraphs above the fold must hook immediately:
   - Para 1: Hook paragraph with target keyword, addressing pain point "${painPoint}"
   - Para 2: What viewers will learn (3–4 bullet points previewing value)
   - Para 3: Who this is for (${persona})
   - Para 4–6: Deep dive, credibility, social proof, mention ${productName} features naturally
   - Final para: Transition to CTA

3. OPENING HOOK — One compelling sentence for the video intro. Must create a curiosity gap that makes viewers want to keep watching.

4. CHAPTERS — 5–7 timestamped chapters. Timestamps must match estimated video length (6–10 min). Use realistic, sequential timestamps. Each chapter title must be specific and keyword-rich.

5. PINNED COMMENT — An engagement prompt or discussion starter to pin under the video.

6. SUGGESTED NEXT VIDEO — A recommended next video title or topic to drive watch time.

7. CTA — Subscribe + like/comment + specific next video mention. Natural and not forced.

8. TAGS / KEYWORDS — 5–7 video-specific keywords from evidence.

9. HASHTAGS — Max 4 relevant, branded or industry hashtags.

Do NOT: invent URLs, fake stats, testimonials, superlatives in title ("best", "ultimate").

Return valid JSON:
{
  "title": "string — max 70 chars, CTR-optimized, first 3 words create urgency",
  "description": "string — 4-6 SEO paragraphs, hook above the fold",
  "openingHook": "string — one sentence, curiosity gap",
  "chapters": [{"timestamp": "string", "title": "string"}],
  "pinnedComment": "string — engagement prompt or discussion starter",
  "suggestedNextVideo": "string — title or topic of recommended next video",
  "cta": "string — subscribe + like/comment + next video",
  "hashtags": ["max", "4", "hashtags"],
  "keywords": ["5-7", "video", "keywords"],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[YouTube Agent] AI success', { hasTitle: !!result.data.title, hasDescription: !!result.data.description, provider: result.provider });
      return { ...result.data, _provider: result.provider, _traceId: result.traceId };
    }
    console.warn('[YouTube Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) {
    console.error('[YouTube Agent] AI generation error:', e.message);
  }
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
    pinnedComment: `What has been your biggest struggle with ${painPoint}? Let us know below.`,
    suggestedNextVideo: `How to Maximize ${productName} for ${persona}`,
    cta: 'Subscribe for more insights on ' + productName,
    hashtags: ['#' + productName.toLowerCase().replace(/\s+/g, ''), '#Productivity', '#Tutorial', '#HowTo'],
    keywords: [productName, painPoint.toLowerCase(), persona.toLowerCase(), features[0].toLowerCase(), benefits[0].toLowerCase()],
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}
