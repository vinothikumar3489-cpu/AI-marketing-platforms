import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getKeyword, getEvidenceForTrend, buildFallbackFeatures, buildFallbackBenefits, buildFallbackEvidenceFields } from "./agent.utils.js";

export async function generateVideoScript(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
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
- Title: "[Product Name]: [Solution] for [Persona]" — include keyword "${keyword}" if natural.
- Format: "Explainer" or "Demo".
- Duration: "60-90 seconds" or "2-3 minutes" based on complexity.
- Scenes: 5 scenes minimum.
  - Scene 1: Hook — Open with the pain point "${painPoint}" in a relatable scenario. Show the struggle.
  - Scene 2: Discovery — Introduce ${productName} as the solution. Show the "aha" moment.
  - Scene 3: Features — Demonstrate 2-3 specific features from evidence. Show, don't tell.
  - Scene 4: Benefits — Show the transformation. Before vs. after. End state.
  - Scene 5: CTA — Strong closing with specific call to action.
- Each scene:
  - scene: sequential number starting at 1
  - narration: natural, speakable dialogue. Not formal copy. Conversational.
  - onScreenText: Key text overlay (headline, stat, or callout) or null
  - visual: Specific visual direction for video editor/animator
  - evidencePoint: Specific evidence field referenced or null
  - cta: null except final scene

Do NOT: invent testimonials, fake data, unverifiable claims, superlatives, "revolutionary".

Return valid JSON:
{
  "title": "string — include product name and keyword",
  "format": "string — Explainer or Demo",
  "duration": "string — estimated duration",
  "scenes": [{"scene": 1, "narration": "string — speakable dialogue", "onScreenText": "string or null", "visual": "string — specific visual direction", "evidencePoint": "string or null", "cta": "string or null"}],
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
  return generateVideoScriptFallback(brief, productName, persona, painPoint);
}

function generateVideoScriptFallback(brief, productName, persona, painPoint) {
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    title: `${productName}: Solving ${painPoint} for ${persona}`.slice(0, 70),
    format: 'Explainer',
    duration: '60-90 seconds',
    scenes: [
      {
        scene: 1,
        narration: `Meet ${persona}. Every day they face "${painPoint}" — a challenge that slows them down and limits their potential.`,
        onScreenText: `${painPoint} — a daily struggle for ${persona}`,
        visual: `${persona} working at a desk, looking frustrated, clock ticking in background`,
        evidencePoint: painPoint || null,
        cta: null,
      },
      {
        scene: 2,
        narration: `But what if there was a better way? ${productName} was built specifically to solve this exact problem.`,
        onScreenText: `Introducing ${productName}`,
        visual: `${productName} logo animating on screen, clean interface mockup fades in`,
        evidencePoint: productName || null,
        cta: null,
      },
      {
        scene: 3,
        narration: `With ${features[0] || 'powerful features'}, ${productName} helps ${persona} achieve ${benefits[0] || 'better outcomes'} — faster and more efficiently than ever before.`,
        onScreenText: features[0] || 'Powerful features',
        visual: `Screen recording of ${productName} interface showing ${features[0] || 'core features'} in action`,
        evidencePoint: features[0] || null,
        cta: null,
      },
      {
        scene: 4,
        narration: `${benefits[0] || 'Better outcomes'} and ${benefits[1] || 'enhanced efficiency'} — that is what ${productName} delivers to teams like yours every day.`,
        onScreenText: `${benefits[0] || 'Better outcomes'} + ${benefits[1] || 'Enhanced efficiency'}`,
        visual: `Split screen showing before/after scenarios, happy team collaborating`,
        evidencePoint: benefits[0] || null,
        cta: null,
      },
      {
        scene: 5,
        narration: `Ready to transform your approach? Start with ${productName} today and see the difference for yourself.`,
        onScreenText: `Start your journey with ${productName}`,
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
- VisualDirection: Comprehensive visual direction. Color palette, mood, typography, composition, photography style, motion guidelines.
- BrandSignals: 5 specific brand elements that must be present. E.g., "gradient overlays", "case-study-blue accent", "icon system X".
- RequiredText: Short tagline or product text that must appear in every piece.
- CTA: Primary and secondary CTA recommendations.
- Format: "Multi-channel campaign" or specific channel focus.

${campaignGoal ? `Campaign Alignment: "${campaignGoal}"` : ''}
${brandVoice ? `Brand Voice: "${brandVoice}"` : ''}

Do NOT: invent budget, timeline beyond evidence, fake testimonials, or generic advice.

Return valid JSON:
{
  "objective": "string — clear, measurable campaign objective",
  "audience": "string — persona description including role, pain point, stage",
  "message": "string — single core message, pain-point to solution",
  "visualDirection": "string — comprehensive visual direction paragraph",
  "brandSignals": ["5 specific brand elements that must be present"],
  "requiredText": "string — tagline or text that must appear",
  "cta": "string — primary CTA recommendation",
  "format": "string — campaign format",
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
  return generateCreativeBriefFallback(brief, productName, persona, painPoint);
}

function generateCreativeBriefFallback(brief, productName, persona, painPoint) {
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    objective: `Drive awareness and adoption of ${productName} among ${persona} by demonstrating how it solves "${painPoint}" through ${features[0] || 'innovative capabilities'} and ${benefits[0] || 'proven outcomes'}.`,
    audience: persona,
    message: `${productName} helps ${persona} overcome ${painPoint} with ${features[0] || 'targeted solutions'} that deliver ${benefits[0] || 'real results'} — simply and effectively.`,
    visualDirection: `Clean, modern aesthetic with ${productName} brand colors. Imagery should show ${persona} in realistic work settings transitioning from frustration to success. Use product interface screenshots and data visualization elements.`,
    brandSignals: [
      `${productName} brand typography and color palette`,
      'Clean, minimal design language',
      'Professional imagery with human elements',
      'Data-driven visual elements',
      'Consistent iconography style',
    ],
    requiredText: `${productName} — ${benefits[0] || 'Smarter solutions for'} ${persona}`,
    cta: `Discover ${productName}`,
    format: 'Multi-channel campaign',
    evidenceLimitations: [],
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}
