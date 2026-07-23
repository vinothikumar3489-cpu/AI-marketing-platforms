import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildEvidenceSection, buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getKeyword, getEvidenceForTrend, FALLBACK_FAILURE } from "./agent.utils.js";

export async function generateLandingPage(brief, aiFunction = callAI) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are writing a landing page for ${productName}.

${productContext}

REQUIREMENTS:
- headline: Benefit-driven headline. Max 80 chars. Reference USP if available.
- subheadline: Supporting subheadline. Max 150 chars.
- heroCTA: Primary CTA button text. Product-specific.
- painPoints: Array of 3 pain points from the evidence this page addresses.
- solution: One paragraph describing the solution using evidence.
- features: Array of {icon (emoji), title, description}. 3 features. Use evidence-backed descriptions.
- socialProof: Empty array — do not invent testimonials or stats.
- finalCTA: Closing CTA text.
- seoKeywords: Array of 3 SEO keywords from evidence.
- Do NOT: invent testimonials, fake stats, ROI claims, pricing, superlatives.

Return valid JSON:
{
  "headline": "string",
  "subheadline": "string",
  "heroCTA": "string",
  "painPoints": ["string"],
  "solution": "string",
  "features": [{"icon": "string", "title": "string", "description": "string"}],
  "socialProof": [],
  "finalCTA": "string",
  "seoKeywords": ["string"],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { }
  return FALLBACK_FAILURE;
}

export async function generateProductPage(brief, aiFunction = callAI) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are writing a product page for ${productName}.

${productContext}

REQUIREMENTS:
- productName: "${productName}".
- tagline: Short compelling tagline referencing USP if available.
- overview: One paragraph product overview addressing pain point "${painPoint}".
- keyFeatures: Array of {name, description, benefit}. 3 features minimum from evidence.
- useCases: Array of {scenario, solution, outcome}. At least 1 use case relevant to ${persona}.
- cta: Clear CTA. Product-specific.
- pricing: null — do not invent pricing.
- faqs: Array of {question, answer}. 2 FAQs minimum from evidence.
- Do NOT: invent pricing, testimonials, fake data, superlatives.

Return valid JSON:
{
  "productName": "string",
  "tagline": "string",
  "overview": "string",
  "keyFeatures": [{"name": "string", "description": "string", "benefit": "string"}],
  "useCases": [{"scenario": "string", "solution": "string", "outcome": "string"}],
  "cta": "string",
  "pricing": null,
  "faqs": [{"question": "string", "answer": "string"}],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { }
  return FALLBACK_FAILURE;
}

export async function generateComparisonPage(brief, aiFunction = callAI) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const competitors = brief.validatedCompetitors?.slice(0, 3).map(c => c.name) || [];

  const prompt = `You are writing a comparison page for ${productName}.

${productContext}

REQUIREMENTS:
- headline: Comparison page title. Include product name and key category.
- introduction: One paragraph intro stating what is being compared.
- comparisonTable: Object with headers (array) and rows (array of objects). Be objective — ${productName} does not need to win every row. Use evidence for claims.
- whyChooseUs: Why someone would choose ${productName} based on evidence. Reference specific features/USPs.
- cta: Clear CTA. Product-specific.
- competitorWeaknesses: Array of {competitor, weakness}. Only include if evidence supports it.
${competitors.length ? `\nCompetitors from evidence: ${competitors.join(', ')}` : '\nNo competitor evidence available — use generic "Alternatives" category.'}
- Do NOT: bash competitors without evidence, make superlative claims, use fake data.

Return valid JSON:
{
  "headline": "string",
  "introduction": "string",
  "comparisonTable": {"headers": ["string"], "rows": [{"feature": "string"}]},
  "whyChooseUs": "string",
  "cta": "string",
  "competitorWeaknesses": [{"competitor": "string", "weakness": "string"}],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { }
  return FALLBACK_FAILURE;
}
