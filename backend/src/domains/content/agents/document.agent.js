import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildEvidenceSection, buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getFirstFeature, getKeyword, getEvidenceForTrend, FALLBACK_FAILURE } from "./agent.utils.js";

export async function generateFeatureAnnouncement(brief, aiFunction = callAI) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const feature = getFirstFeature(brief);

  const prompt = `You are announcing a new feature for ${productName}.

${productContext}

REQUIREMENTS:
- headline: Announcement headline highlighting "${feature}". Include product name.
- subheadline: Supporting subheadline.
- body: 1-2 paragraphs describing the feature and its value for ${persona}. Reference evidence.
- benefits: Array of 3 key benefits from evidence.
- cta: Clear CTA. Product-specific.
- availability: "Available now" or specific timeline if supported by evidence.
- technicalDetails: null unless evidence supports it.
- Do NOT: fake stats, testimonials, superlatives, "game-changing".

Return valid JSON:
{
  "headline": "string",
  "subheadline": "string",
  "body": "string",
  "benefits": ["string"],
  "cta": "string",
  "availability": "string",
  "technicalDetails": null,
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { }
  return FALLBACK_FAILURE;
}

export async function generateWhitepaper(brief, aiFunction = callAI) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are writing a whitepaper outline for ${productName}.

${productContext}

REQUIREMENTS:
- title: Whitepaper title focusing on ${painPoint} and ${productName}.
- subtitle: Supporting subtitle.
- executiveSummary: 2-3 sentence executive summary.
- sections: Array of {heading, body, keyFindings}. 3 sections minimum. Each section grounded in evidence.
- conclusion: Strong conclusion with recommendations.
- references: Empty array — do not invent references.
- cta: Clear CTA. Product-specific.
- Do NOT: invent statistics, references, testimonials, superlatives.

Return valid JSON:
{
  "title": "string",
  "subtitle": "string",
  "executiveSummary": "string",
  "sections": [{"heading": "string", "body": "string", "keyFindings": ["string"]}],
  "conclusion": "string",
  "references": [],
  "cta": "string",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { }
  return FALLBACK_FAILURE;
}
