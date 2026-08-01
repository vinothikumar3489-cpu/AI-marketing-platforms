import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getKeyword, getEvidenceForTrend, buildFallbackFeatures, buildFallbackBenefits, buildFallbackEvidenceFields, checkEvidenceSufficiency } from "./agent.utils.js";

export async function generateVideoScript(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const evidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (evidenceCheck) {
    console.warn(`[VideoScript Agent] Insufficient evidence: ${evidenceCheck}`);
    return { _insufficientEvidence: true, _message: evidenceCheck, _provider: 'evidence_gate' };
  }
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const keyword = getKeyword(brief, 0) || '';

  const prompt = `You are a senior video scriptwriter for ${productName}.

Write a compelling video script for ${persona}.

${productContext}

Format: Video script (Explainer/Demo)
Tone: Conversational, benefit-focused, authentic

STRATEGIC REQUIREMENTS:
- Title: "[Product Name]: [Solution] for [Persona]" â€” include keyword "${keyword}" if natural.
- Format: "Explainer" or "Demo".
- Duration: "60-90 seconds" or "2-3 minutes" based on complexity.
- targetDuration: Number of seconds (e.g., 90, 120).
- hook: A single opening line (max 15 words) that creates a curiosity gap â€” makes the viewer need to know more.
- musicGuidance: Genre, tempo, and mood suggestion for background music (e.g., "Upbeat electronic, 120 BPM, energetic and optimistic").
- toneGuidance: Specific acting/delivery direction for the voiceover talent (e.g., "empathetic and understanding, then confident and authoritative").
- Scenes: 5 scenes minimum. Must follow "Hook â†’ Problem â†’ Solution â†’ Demo â†’ CTA" beat structure.
  - Scene 1: Hook â€” Open with a curiosity-grabbing hook. Not the pain point directly â€” a question, a surprising stat, or a relatable moment that pulls the viewer in.
  - Scene 2: Problem â€” Show the struggle. Make the pain point "${painPoint}" visceral and relatable.
  - Scene 3: Solution â€” Introduce ${productName} as the answer. The "aha" moment.
  - Scene 4: Demo â€” Demonstrate 2-3 specific features from evidence. Show, don't tell.
  - Scene 5: CTA â€” Strong closing with specific call to action.
- Each scene:
  - scene: sequential number starting at 1
  - narration: natural, speakable dialogue. Not formal copy. Conversational. MAXIMUM 75 words per scene (under 30 seconds speaking time).
  - onScreenText: Key text overlay (headline, stat, or callout) or null
  - visual: Specific visual direction for video editor/animator
  - evidencePoint: Specific evidence field referenced or null
  - cta: null except final scene

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
Do NOT: invent testimonials, fake data, unverifiable claims, superlatives, "revolutionary".

Return valid JSON:
{
  "title": "string â€” include product name and keyword",
  "format": "string â€” Explainer or Demo",
  "duration": "string â€” estimated duration",
  "targetDuration": "number â€” duration in seconds",
  "hook": "string â€” opening line, max 15 words, creates curiosity gap",
  "musicGuidance": "string â€” genre, tempo, mood suggestion",
  "toneGuidance": "string â€” specific acting/delivery direction",
  "scenes": [{"scene": 1, "narration": "string â€” speakable dialogue, max 75 words", "onScreenText": "string or null", "visual": "string â€” specific visual direction", "evidencePoint": "string or null", "cta": "string or null"}],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": [],
  "limitations": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[VideoScript Agent] AI success', { hasTitle: !!result.data.title, scenes: result.data.scenes?.length, provider: result.provider });
      return { ...result.data, _provider: result.provider, _traceId: result.traceId };
    }
    console.warn('[VideoScript Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) {
    console.error('[VideoScript Agent] AI generation error:', e.message);
  }
  console.warn('[*Agent] AI generation failed — returning null (no fabricated fallback content)');
  return null;
}

function generateVideoScriptFallback(brief, productName, persona, painPoint) {
  const fallbackEvidenceCheck = checkEvidenceSufficiency(brief);
  if (fallbackEvidenceCheck) {
    return { _insufficientEvidence: true, _message: fallbackEvidenceCheck, _provider: 'evidence_gate' };
  }
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    title: `${productName}: A Closer Look at ${painPoint} for ${persona}`.slice(0, 70),
    format: 'Explainer',
    duration: '60-90 seconds',
    targetDuration: 90,
    hook: `What if "${painPoint}" could be approached differently?`,
    musicGuidance: 'Upbeat electronic, 110-120 BPM, energetic and optimistic',
    toneGuidance: 'Empathetic and understanding in the opening, then informative and clear throughout the demo',
    scenes: [
      {
        scene: 1,
        narration: `Meet ${persona}. Every day they face "${painPoint}" \u2014 a challenge many teams know well.`,
        onScreenText: `${painPoint} \u2014 a daily challenge for ${persona}`,
        visual: `${persona} working at a desk, focused, clock ticking in background`,
        evidencePoint: painPoint || null,
        cta: null,
      },
      {
        scene: 2,
        narration: `But what if there was a different approach? ${productName} is designed to address exactly this problem.`,
        onScreenText: `Introducing ${productName}`,
        visual: `${productName} logo animating on screen, clean interface mockup fades in`,
        evidencePoint: productName || null,
        cta: null,
      },
      {
        scene: 3,
        narration: `With ${features[0] || 'its core features'}, ${productName} gives ${persona} a structured approach to ${painPoint.toLowerCase()} \u2014 with ${benefits[0] || 'practical outcomes'} as the intended result.`,
        onScreenText: features[0] || 'Core features',
        visual: `Screen recording of ${productName} interface showing ${features[0] || 'core features'} in action`,
        evidencePoint: features[0] || null,
        cta: null,
      },
      {
        scene: 4,
        narration: `${benefits[0] || 'Practical outcomes'} and ${benefits[1] || 'clear workflows'} \u2014 what ${productName} is designed to deliver.`,
        onScreenText: `${benefits[0] || 'Practical outcomes'} + ${benefits[1] || 'Clear workflows'}`,
        visual: `Side-by-side comparison of a typical workflow and a ${productName}-based workflow, team collaborating`,
        evidencePoint: benefits[0] || null,
        cta: null,
      },
      {
        scene: 5,
        narration: `Want to see how it works? Start with ${productName} today and judge it for yourself.`,
        onScreenText: `Start with ${productName}`,
        visual: `${productName} website CTA screen, button animating`,
        evidencePoint: null,
        cta: `Visit ${productName} to learn more`,
      },
    ],
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    limitations: [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}

export async function generateCreativeBrief(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const evidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (evidenceCheck) {
    console.warn(`[CreativeBrief Agent] Insufficient evidence: ${evidenceCheck}`);
    return { _insufficientEvidence: true, _message: evidenceCheck, _provider: 'evidence_gate' };
  }
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const campaignGoal = brief.campaign?.goal?.value || brief.campaign?.goal || '';
  const brandVoice = brief.campaign?.brandVoice?.value || brief.campaign?.brandVoice || brief.brandVoice?.value || brief.brandVoice || 'professional';

  const prompt = `You are a senior creative director for ${productName}.

Create a comprehensive creative brief for ${persona}.

${productContext}

Format: Creative brief / Campaign brief
Tone: Strategic, specific, creative yet grounded

STRATEGIC REQUIREMENTS:
- Objective: Clear, measurable campaign objective. "Drive [metric] among [persona] by [value prop] through [channels]."
- Audience: Target audience from evidence. Include persona name, role, pain point, buying stage.
- Message: Single, powerful core message. "From [pain point] to [desired state] with [product name]."
- creativeConcept: A single creative idea or theme that unifies the entire campaign. One sentence â€” the big idea.
- channelStrategy: Specific channel breakdown describing what runs where. E.g., "LinkedIn for thought leadership (weekly articles), Instagram for brand awareness (behind-the-scenes reels), email for conversion (drip sequences with case studies)."
- successMetrics: Array of 3 specific, measurable KPIs drawn from evidence. E.g., ["CTR â‰¥ 2.5%", "demo requests per week â‰¥ 10", "content engagement rate â‰¥ 5%"].
- keyMessageHouse: Three-tier message hierarchy.
  - primary: The core message (single sentence â€” what everyone must remember).
  - secondary: Supporting messages that reinforce the primary.
  - tertiary: Proof points â€” specific evidence-backed claims that prove the secondary.
- VisualDirection: Comprehensive visual direction. Color palette, mood, typography, composition, photography style, motion guidelines.
- BrandSignals: 5 specific brand elements that must be present. E.g., "gradient overlays", "case-study-blue accent", "icon system X".
- RequiredText: Short tagline or product text that must appear in every piece.
- CTA: Primary and secondary CTA recommendations.
- Format: "Multi-channel campaign" or specific channel focus.

${campaignGoal ? `Campaign Alignment: "${campaignGoal}"` : ''}
${brandVoice ? `Brand Voice: "${brandVoice}"` : ''}

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
Do NOT: invent budget, timeline beyond evidence, fake testimonials, or generic advice.

Return valid JSON:
{
  "objective": "string â€” clear, measurable campaign objective",
  "audience": "string â€” persona description including role, pain point, stage",
  "message": "string â€” single core message, pain-point to solution",
  "creativeConcept": "string â€” single creative idea that unifies the campaign",
  "channelStrategy": "string â€” specific channel breakdown, what runs where",
  "successMetrics": ["3 measurable KPIs from evidence"],
  "keyMessageHouse": {
    "primary": "string â€” core message, what everyone must remember",
    "secondary": "string â€” supporting messages that reinforce primary",
    "tertiary": "string â€” evidence-backed proof points"
  },
  "visualDirection": "string â€” comprehensive visual direction paragraph",
  "brandSignals": ["5 specific brand elements that must be present"],
  "requiredText": "string â€” tagline or text that must appear",
  "cta": "string â€” primary CTA recommendation",
  "format": "string â€” campaign format",
  "evidenceLimitations": [],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[CreativeBrief Agent] AI success', { hasObjective: !!result.data.objective, provider: result.provider });
      return { ...result.data, _provider: result.provider, _traceId: result.traceId };
    }
    console.warn('[CreativeBrief Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) {
    console.error('[CreativeBrief Agent] AI generation error:', e.message);
  }
  console.warn('[*Agent] AI generation failed — returning null (no fabricated fallback content)');
  return null;
}

function generateCreativeBriefFallback(brief, productName, persona, painPoint) {
  const fallbackEvidenceCheck = checkEvidenceSufficiency(brief);
  if (fallbackEvidenceCheck) {
    return { _insufficientEvidence: true, _message: fallbackEvidenceCheck, _provider: 'evidence_gate' };
  }
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    objective: `Drive awareness and adoption of ${productName} among ${persona} by addressing "${painPoint}" through ${features[0] || 'core features'} and ${benefits[0] || 'intended outcomes'}.`,
    audience: persona,
    message: `${productName} is designed to help ${persona} work through ${painPoint} with ${features[0] || 'targeted solutions'}, aiming for ${benefits[0] || 'practical outcomes'}.`,
    creativeConcept: `From frustration to flow: ${productName} takes on ${painPoint} for ${persona}.`,
    channelStrategy: 'LinkedIn for thought leadership, Instagram for brand awareness, email for conversion',
    successMetrics: ['Content engagement rate', 'Demo requests per week', 'Click-through rate on CTA'],
    keyMessageHouse: {
      primary: `${productName} is designed to address ${painPoint} for ${persona}.`,
      secondary: `${productName} aims to deliver ${benefits[0] || 'intended outcomes'} through ${features[0] || 'core capabilities'}.`,
      tertiary: `${benefits[0] || 'Key benefit'} and ${benefits[1] || 'additional benefit'} as described in the brief.`,
    },
    visualDirection: `Clean, modern aesthetic with ${productName} brand colors. Imagery should show ${persona} in realistic work settings. Use product interface screenshots and simple data visualization elements.`,
    brandSignals: [
      `${productName} brand typography and color palette`,
      'Clean, minimal design language',
      'Professional imagery with human elements',
      'Data-driven visual elements',
      'Consistent iconography style',
    ],
    requiredText: `${productName} \u2014 A practical approach for ${persona}`,
    cta: `Discover ${productName}`,
    format: 'Multi-channel campaign',
    evidenceLimitations: [],
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}
