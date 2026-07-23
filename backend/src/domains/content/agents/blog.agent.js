import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildEvidenceSection, buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getKeyword, getEvidenceForTrend, FALLBACK_FAILURE } from "./agent.utils.js";

export async function generateBlogArticle(brief, aiFunction = callAI) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const keyword = getKeyword(brief, 0) || painPoint.toLowerCase().replace(/\s+/g, '-');

  const prompt = `You are writing a blog article for ${productName}.

Write an informative blog post for ${persona} dealing with "${painPoint}".

${productContext}

REQUIREMENTS:
- headline: SEO-friendly headline including target keyword "${keyword}" if natural. Max 70 chars.
- metaDescription: Compelling meta description. Max 160 chars.
- introduction: Engaging intro paragraph addressing the pain point.
- sections: Array of {heading, body, keyTakeaways}. 2-4 sections. Each section should reference evidence.
- conclusion: Strong conclusion with CTA.
- cta: A clear call to action. Product-specific.
- targetKeywords: Array of 2-3 target keywords.
- Do NOT use: fake stats, testimonials, superlatives, invented data, "revolutionary".

Return valid JSON:
{
  "headline": "string",
  "metaDescription": "string — max 160 chars",
  "introduction": "string",
  "sections": [{"heading": "string", "body": "string", "keyTakeaways": ["string"]}],
  "conclusion": "string",
  "cta": "string",
  "targetKeywords": ["string"],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { }
  return FALLBACK_FAILURE;
}

export async function generateFAQ(brief, aiFunction = callAI) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);

  const prompt = `You are writing an FAQ page for ${productName}.

${productContext}

REQUIREMENTS:
- headline: Clear FAQ page title including product name.
- metaDescription: SEO meta description. Max 160 chars.
- introduction: Short intro paragraph addressing common questions.
- faqs: Array of {question, answer}. 4-6 FAQs based on evidence. Questions should reflect real customer concerns.
- cta: A clear CTA. Product-specific.
- Do NOT invent: fake questions, pricing, claims not supported by evidence.

Return valid JSON:
{
  "headline": "string",
  "metaDescription": "string — max 160 chars",
  "introduction": "string",
  "faqs": [{"question": "string", "answer": "string"}],
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
