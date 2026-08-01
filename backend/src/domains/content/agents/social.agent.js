import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getKeyword, getEvidenceForTrend, buildFallbackFeatures, buildFallbackBenefits, buildFallbackEvidenceFields, checkEvidenceSufficiency } from "./agent.utils.js";

export async function generateLinkedInPost(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const evidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (evidenceCheck) {
    console.warn(`[LinkedIn Agent] Insufficient evidence: ${evidenceCheck}`);
    return { _insufficientEvidence: true, _message: evidenceCheck, _provider: 'evidence_gate' };
  }
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const usp = brief.product?.usp || '';
  const trendNote = getEvidenceForTrend(brief);
  const campaignGoal = brief.campaign?.goal?.value || brief.campaign?.goal || '';
  const brandVoice = brief.campaign?.brandVoice?.value || brief.campaign?.brandVoice || brief.brandVoice?.value || brief.brandVoice || 'professional';

  const prompt = `You are an executive thought-leadership strategist advising the C-suite at ${productName}. Your audience is ${persona} â€” senior leaders who evaluate decisions on strategic impact and ROI.

Write a LinkedIn post that establishes the author as a peer-level authority for ${persona}.

${productContext}

Platform: LinkedIn
Format: Executive insight post (1,300-2,000 characters)
Tone: ${brandVoice || 'Executive, authoritative, contrarian'}

STRATEGIC REQUIREMENTS:
- Hook: Open with a provocative industry insight, contrarian take, or an observation that challenges a widely held assumption about "${painPoint}". Max 200 chars. Must stop the scroll. No questions â€” state a thesis.
- Body: 3-4 tight paragraphs, separated by line breaks. Educate through a specific framework, methodology, or approach. Reference ${productName}'s features and benefits organically as proof points. Every paragraph must tie back to a business outcome â€” efficiency gain, revenue impact, cost reduction, or strategic advantage.
- Evidence Anchoring: Every substantive claim must reference a specific feature, benefit, pain point, or campaign goal from the evidence above. Use natural language, not bullet lists.
- CTA: Discussion-oriented. Invite debate or ask a question that positions the author as a leader willing to challenge convention. Examples: "I'd push back on that â€” here is why.", "What is your team doing differently?", "The data I have seen suggests otherwise â€” agree or disagree?"
- Hashtags: Max 3. Branded + industry. Place only at the end of the post.
${campaignGoal ? `- Campaign Alignment: Align with the goal: "${campaignGoal}"` : ''}

CRITICAL CONSTRAINTS:
- You MUST NOT include: fake statistics, percentages, "studies show", "research finds", "data shows", invented testimonials, competitor bashing, superlatives ("best", "leading", "#1"), clichÃ© openers ("In today's world", "The modern era", "It's no secret").
- You MUST use only evidence explicitly present in the brief above.
- Any claim not directly supported by the brief MUST be listed in claimsRequiringReview.
- EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.

Return valid JSON:
{
  "hook": "string â€” provocative thesis, max 200 chars",
  "body": "string â€” 3-4 paragraphs, each tied to business outcome, separated by \\n\\n",
  "cta": "string or null â€” discussion-oriented, invites debate or alternative views",
  "hashtags": ["max", "3", "hashtags"],
  "audience": "string â€” target persona from evidence",
  "angle": "string â€” the specific thought-leadership angle used",
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
  console.warn('[*Agent] AI generation failed — returning null (no fabricated fallback content)');
  return null;
}

function generateLinkedInPostFallback(brief, productName, persona, painPoint, usp) {
  const fallbackEvidenceCheck = checkEvidenceSufficiency(brief);
  if (fallbackEvidenceCheck) {
    return { _insufficientEvidence: true, _message: fallbackEvidenceCheck, _provider: 'evidence_gate' };
  }
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    hook: `Most ${persona} treat "${painPoint}" as an operational given.`,
    body: `For most organizations, "${painPoint}" is accepted as an inevitability \u2014 a line item budgeted for rather than solved. Addressing it directly, instead of working around it, can reduce friction in daily operations.\n\n${productName} is designed with this problem in mind. Its ${features[0] || 'core features'} and ${features[1] || 'specialized workflows'} give teams a structured way to approach ${painPoint.toLowerCase()}, with ${benefits[0] || 'key benefits'} and ${benefits[1] || 'practical outcomes'} as intended outcomes.\n\nWhether it works depends on how it fits your workflow \u2014 but treating ${painPoint.toLowerCase()} as a design problem rather than an operational one is worth testing.`,
    cta: 'If your team has found a way to reduce this pain point, I would like to hear your approach.',
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
  const evidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (evidenceCheck) {
    console.warn(`[Instagram Agent] Insufficient evidence: ${evidenceCheck}`);
    return { _insufficientEvidence: true, _message: evidenceCheck, _provider: 'evidence_gate' };
  }
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const trendNote = getEvidenceForTrend(brief);
  const brandVoice = brief.campaign?.brandVoice?.value || brief.campaign?.brandVoice || brief.brandVoice?.value || brief.brandVoice || 'professional';

  const prompt = `You are a senior Instagram content strategist for ${productName}.

Create a high-engagement Instagram carousel post for ${persona}. Use a carousel-first strategy â€” a minimum of 5 slides.

${productContext}

Platform: Instagram (Carousel format)
Tone: ${brandVoice || 'Professional yet approachable'}
Visual Style: Clean, modern, brand-consistent

STRATEGIC REQUIREMENTS:
- Hook: Ultra-short attention grabber, max 100 chars. Must stop the scroll instantly.
- Caption: Follow this exact structure: Hook â†’ Problem â†’ Solution â†’ CTA â†’ Hashtags. Use emojis and line breaks for readability. Do not exceed 6 lines.
- Carousel Slides: Minimum 5 slides. Each slide must include: headline (bold value prop), body (1-2 sentences), visualHint (describe image for designer/photographer).
- Visual Brief: Write a detailed paragraph for the designer covering color palette, mood, composition, and typography.
- Image Prompt: Write a detailed DALL-E/Midjourney-style prompt for the cover image. Include specific visual elements, lighting, color scheme, camera angle, and mood.
- Reel Idea: Include a "reelIdea" field with a short script outline, suggested duration (15-30s), and music suggestion.
- CallToAction: Use one of these exact CTAs â€” "Save for later", "Share with a teammate", "Comment your thoughts".
- Hashtags: 8-10 hashtags â€” mix of branded + industry + niche tags.
- Evidence Reference: EVERY slide must reference specific evidence (features, benefits, pain points, data points from the brief above).
${trendNote ? `\nNOTE: ${trendNote}` : ''}

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
Do NOT use: fake stats, testimonials, awards, ROI claims, "stay ahead of the curve", "go viral", "revolutionary".

Return valid JSON:
{
  "hook": "string â€” max 100 chars, scroll-stopping",
  "caption": "string â€” Hook â†’ Problem â†’ Solution â†’ CTA â†’ Hashtags, emojis, line breaks",
  "visualConcept": "string â€” detailed visual brief for designer (color palette, mood, composition, typography)",
  "carouselSlides": [{"headline": "string â€” bold value prop", "body": "string â€” 1-2 sentences", "visualHint": "string or null"}],
  "imagePrompt": "string â€” detailed DALL-E/Midjourney-style prompt for cover image",
  "reelIdea": "string â€” script outline, duration (15-30s), music suggestion",
  "callToAction": "string â€” one of: Save for later, Share with a teammate, Comment your thoughts",
  "hashtags": ["8-10", "mix", "branded", "industry", "niche"],
  "audience": "string â€” target persona",
  "angle": "string â€” creative angle used",
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
  console.warn('[*Agent] AI generation failed — returning null (no fabricated fallback content)');
  return null;
}

function generateInstagramPostFallback(brief, productName, persona, painPoint) {
  const fallbackEvidenceCheck = checkEvidenceSufficiency(brief);
  if (fallbackEvidenceCheck) {
    return { _insufficientEvidence: true, _message: fallbackEvidenceCheck, _provider: 'evidence_gate' };
  }
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    hook: `${painPoint} \u2014 sound familiar?`,
    caption: `This is a common challenge for ${persona}.\n\n${productName} is designed to address it directly.\n\n\u2728 ${features[0] || 'Core platform capability'}\n\u2728 ${features[1] || 'Key feature area'}\n\n\u2705 ${benefits[0] || 'Intended outcome'}\n\u2705 ${benefits[1] || 'Practical benefit'}\n\nSave for later. \u2194\uFE0F`,
    visualConcept: `Clean, modern interface of ${productName} showing ${features[0] || 'core features'} in use. Professional color scheme with accent highlights.`,
    carouselSlides: [
      { headline: `Meet ${productName}`, body: `Designed for ${persona} to address "${painPoint}".`, visualHint: 'Product branding and hero shot' },
      { headline: 'Key Feature', body: features[0] || 'Core platform capability', visualHint: 'Feature screenshot with callouts' },
      { headline: 'Key Benefit', body: benefits[0] || 'Intended outcome', visualHint: 'Benefit visualization graphic' },
    ],
    imagePrompt: `Product screenshot of ${productName} dashboard, clean UI, modern design, technology context, professional lighting`,
    reelIdea: `Quick-cut reel (20s): Open with "${painPoint} \u2014 sound familiar?" \u2192 show ${persona} working through it \u2192 transition to ${productName} being used \u2192 feature close-ups \u2192 end card "Save for later". Music: upbeat lo-fi / trending instrumental.`,
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
  const evidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (evidenceCheck) {
    console.warn(`[Twitter Agent] Insufficient evidence: ${evidenceCheck}`);
    return { _insufficientEvidence: true, _message: evidenceCheck, _provider: 'evidence_gate' };
  }
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
- Create a curiosity gap â€” make them need the next line.
- Short, punchy sentences. One idea per sentence.
- Max 280 characters per post including hashtags.
- HIGH engagement mechanics: include a question, poll suggestion, or opinion that invites replies.

OUTPUT REQUIREMENTS:
- Generate 3 different tweet variants (different angles, same core message).
- Max 2 hashtags: 1 branded + 1 trending/niche.
- Reference a specific pain point or insight from evidence.
- No filler words, no "In today's world", no generic statements.

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
CRITICAL: Every character must earn its place.

Return valid JSON:
{
  "post": "string â€” primary tweet, max 280 chars",
  "variants": [
    "string â€” alternative tweet 1, different angle, max 280 chars",
    "string â€” alternative tweet 2, different angle, max 280 chars",
    "string â€” alternative tweet 3, different angle, max 280 chars"
  ],
  "cta": "string or null â€” question, poll suggestion, or reply-bait",
  "hashtags": ["branded", "niche"],
  "audience": "string â€” target persona",
  "angle": "string â€” concise angle description",
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
  console.warn('[*Agent] AI generation failed — returning null (no fabricated fallback content)');
  return null;
}

function generateTwitterPostFallback(brief, productName, persona, painPoint) {
  const fallbackEvidenceCheck = checkEvidenceSufficiency(brief);
  if (fallbackEvidenceCheck) {
    return { _insufficientEvidence: true, _message: fallbackEvidenceCheck, _provider: 'evidence_gate' };
  }
  const benefits = buildFallbackBenefits(brief);
  const features = buildFallbackFeatures(brief);
  const tag = '#' + productName.toLowerCase().replace(/\s+/g, '');
  return {
    post: `Tired of ${painPoint}? ${productName} is built to help ${persona} work through it \u2014 focused, not overwhelming.`,
    variants: [
      `${painPoint} eating your team's time? ${productName} gives ${persona} a structured way to tackle ${benefits[0] || 'practical outcomes'}.`,
      `Most ${persona} accept ${painPoint} as normal. ${productName} takes a different approach \u2014 ${features[0] || 'built around the problem'}.`,
      `Stop fighting ${painPoint}. ${productName} focuses on ${benefits[1] || 'practical outcomes'} for ${persona}.`
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
  const evidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (evidenceCheck) {
    console.warn(`[Facebook Agent] Insufficient evidence: ${evidenceCheck}`);
    return { _insufficientEvidence: true, _message: evidenceCheck, _provider: 'evidence_gate' };
  }
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const brandVoice = brief.campaign?.brandVoice?.value || brief.campaign?.brandVoice || brief.brandVoice?.value || brief.brandVoice || 'professional';

  const prompt = `You are a community manager writing a Facebook group conversation starter for ${productName}.

Write a Facebook post that reads like a community discussion starter â€” not a broadcast â€” for ${persona}.

${productContext}

Platform: Facebook
Format: Community discussion post (3-5 short paragraphs)
Tone: ${brandVoice || 'Conversational, community-driven, authentic'}

STRATEGIC REQUIREMENTS:
- Emotional Hook: Open with a relatable scenario or personal anecdote about "${painPoint}". Make it feel like a conversation between peers.
- Body (Situation â†’ Challenge â†’ Solution â†’ Outcome): 3-5 short paragraphs. Use "we" and "you" language. Build community connection.
- Comment CTA: A specific question that drives comments. NOT "What do you think?" â€” instead ask something like "Tag a teammate who struggles with [specific problem]" or "Drop a ðŸ™‹ if this hits close to home."
- Share CTA: Include a share-worthy angle. Something like "Share this with someone who needs to hear it."
- Evidence: Every claim must trace back to evidence from the brief. Reference specific features and benefits naturally.
${brief.campaign?.goal ? `- Align with campaign goal: "${brief.campaign.goal}"` : ''}

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
Do NOT: fake stats, invented testimonials, superlatives, competitor bashing, fake engagement claims, generic openers.

Return valid JSON:
{
  "headline": "string â€” max 150 chars, conversation hook",
  "body": "string â€” 3-5 paragraphs, Situation â†’ Challenge â†’ Solution â†’ Outcome",
  "cta": "string â€” specific comment-driving question, NOT generic",
  "shareCta": "string â€” share invitation, e.g. 'Share this with someone who needs to hear it'",
  "audience": "string â€” target persona",
  "angle": "string â€” community engagement angle",
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
  console.warn('[*Agent] AI generation failed — returning null (no fabricated fallback content)');
  return null;
}

function generateFacebookPostFallback(brief, productName, persona, painPoint) {
  const fallbackEvidenceCheck = checkEvidenceSufficiency(brief);
  if (fallbackEvidenceCheck) {
    return { _insufficientEvidence: true, _message: fallbackEvidenceCheck, _provider: 'evidence_gate' };
  }
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    headline: `We have all been there \u2014 ${painPoint} is real. Here is how ${productName} approaches it.`,
    body: `You know that feeling when ${painPoint.toLowerCase()} keeps slowing you down? Many teams do.\n\nIt starts small \u2014 just another task on the list \u2014 and then it becomes part of everyday work.\n\nThat is the problem ${productName} is designed to address. With ${features[0]} and ${features[1]}, it gives ${persona} a structured way to work through ${painPoint.toLowerCase()}.\n\nThe intended outcomes are ${benefits[0]} and ${benefits[1]}.\n\nWhether it fits your workflow is worth a closer look.`,
    cta: 'Tag a teammate who deals with this every day ðŸ‘‡',
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
  const evidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (evidenceCheck) {
    console.warn(`[YouTube Agent] Insufficient evidence: ${evidenceCheck}`);
    return { _insufficientEvidence: true, _message: evidenceCheck, _provider: 'evidence_gate' };
  }
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const keyword = getKeyword(brief, 0) || '';

  const prompt = `You are a senior YouTube SEO strategist for ${productName}.

Write a video title and description optimized for search, CTR, and retention.

${productContext}

Platform: YouTube
Format: Video description with SEO optimization
Estimated video length: 6â€“10 minutes

REQUIREMENTS:

1. SEO TITLE â€” Include primary keyword "${keyword}" naturally. Max 70 chars. Use brackets or parentheses for CTAs like [2025 Guide] or (Step-by-Step). First 3 words must create urgency or curiosity using power words (e.g., "Stop Wasting Time", "The Secret To", "Why Your Team", "Never Do This").

2. RETENTION-FOCUSED DESCRIPTION â€” 4â€“6 SEO paragraphs. First 2 paragraphs above the fold must hook immediately:
   - Para 1: Hook paragraph with target keyword, addressing pain point "${painPoint}"
   - Para 2: What viewers will learn (3â€“4 bullet points previewing value)
   - Para 3: Who this is for (${persona})
   - Para 4â€“6: Deep dive, credibility, social proof, mention ${productName} features naturally
   - Final para: Transition to CTA

3. OPENING HOOK â€” One compelling sentence for the video intro. Must create a curiosity gap that makes viewers want to keep watching.

4. CHAPTERS â€” 5â€“7 timestamped chapters. Timestamps must match estimated video length (6â€“10 min). Use realistic, sequential timestamps. Each chapter title must be specific and keyword-rich.

5. PINNED COMMENT â€” An engagement prompt or discussion starter to pin under the video.

6. SUGGESTED NEXT VIDEO â€” A recommended next video title or topic to drive watch time.

7. CTA â€” Subscribe + like/comment + specific next video mention. Natural and not forced.

8. TAGS / KEYWORDS â€” 5â€“7 video-specific keywords from evidence.

9. HASHTAGS â€” Max 4 relevant, branded or industry hashtags.

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
Do NOT: invent URLs, fake stats, testimonials, superlatives in title ("best", "ultimate").

Return valid JSON:
{
  "title": "string â€” max 70 chars, CTR-optimized, first 3 words create urgency",
  "description": "string â€” 4-6 SEO paragraphs, hook above the fold",
  "openingHook": "string â€” one sentence, curiosity gap",
  "chapters": [{"timestamp": "string", "title": "string"}],
  "pinnedComment": "string â€” engagement prompt or discussion starter",
  "suggestedNextVideo": "string â€” title or topic of recommended next video",
  "cta": "string â€” subscribe + like/comment + next video",
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
  console.warn('[*Agent] AI generation failed — returning null (no fabricated fallback content)');
  return null;
}

function generateYouTubeDescriptionFallback(brief, productName, persona, painPoint) {
  const fallbackEvidenceCheck = checkEvidenceSufficiency(brief);
  if (fallbackEvidenceCheck) {
    return { _insufficientEvidence: true, _message: fallbackEvidenceCheck, _provider: 'evidence_gate' };
  }
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    title: `${productName}: A Practical Look at ${painPoint} for ${persona}`,
    description: `In this video, we look at how ${productName} approaches "${painPoint}" for ${persona}, and what it is designed to do about it.\n\nTopics covered:\n\u2022 Understanding the ${painPoint} challenge\n\u2022 How ${productName} addresses it with ${features[0]}\n\u2022 ${benefits[0]} and ${benefits[1]} as intended outcomes\n\u2022 Implementation best practices and tips\n\nWatch to see whether ${productName} fits your team's workflow.`,
    openingHook: `${painPoint} is a familiar problem for ${persona} \u2014 here is how one platform approaches it.`,
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
