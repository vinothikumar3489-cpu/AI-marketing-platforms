import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildEvidenceSection, buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getKeyword, getEvidenceForTrend, FALLBACK_FAILURE, buildFallbackFeatures, buildFallbackBenefits, buildFallbackEvidenceFields } from "./agent.utils.js";

export async function generateVideoScript(brief, aiFunction = callAI, normalizedEvidence) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are writing a video script for ${productName}.

${productContext}

REQUIREMENTS:
- title: Video title. Include product name and target keyword if available.
- format: "Explainer" or "Testimonial" or "Demo".
- duration: Estimated duration like "60-90 seconds".
- scenes: Array of {scene, narration, onScreenText, visual, evidencePoint, cta}. 3-5 scenes.
- Each scene should reference specific evidence from the evidence above.
- scene must start at 1.
- Last scene should include cta.
- Use "evidencePoint" (not "evidence") for the evidence reference field.
- Use "onScreenText" (not "on_screen_text") for on-screen text.
- narration should be speakable, natural dialogue, not formal copy.
- Do NOT: invent testimonials, fake data, unverifiable claims, superlatives.

Return valid JSON:
{
  "title": "string",
  "format": "string",
  "duration": "string",
  "scenes": [{"scene": 1, "narration": "string", "onScreenText": "string or null", "visual": "string", "evidencePoint": "string or null", "cta": "string or null"}],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": [],
  "limitations": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { }
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
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are creating a creative brief for ${productName}.

${productContext}

REQUIREMENTS:
- objective: Clear campaign objective focused on solving "${painPoint}" for ${persona}. Specific to ${productName}'s USP.
- audience: Target audience name from evidence.
- message: Single key message that communicates value. Rooted in product evidence.
- visualDirection: Describe the visual creative direction with specific imagery references.
- brandSignals: Array of brand-specific signals or themes (e.g., "minimalist design", "case study blue"). Max 5.
- requiredText: A short required product text or tagline.
- cta: Primary call to action. Product-specific.
- format: Content format (e.g., "Multi-channel campaign", "Social video series", "Email nurture sequence").
- evidenceLimitations: Empty array — do not invent limitations.
- Do NOT: invent budget, timeline beyond evidence, fake testimonials, or generic advice.

Return valid JSON:
{
  "objective": "string — clear campaign objective",
  "audience": "string — target audience name",
  "message": "string — single key message",
  "visualDirection": "string — visual creative direction",
  "brandSignals": ["string"],
  "requiredText": "string — required product text",
  "cta": "string",
  "format": "string",
  "evidenceLimitations": [],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { }
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
