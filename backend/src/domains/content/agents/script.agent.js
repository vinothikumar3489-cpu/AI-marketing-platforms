import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildEvidenceSection, buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getKeyword, getEvidenceForTrend, FALLBACK_FAILURE } from "./agent.utils.js";

export async function generateVideoScript(brief, aiFunction = callAI) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
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
  return FALLBACK_FAILURE;
}

export async function generateCreativeBrief(brief, aiFunction = callAI) {
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
  return FALLBACK_FAILURE;
}
