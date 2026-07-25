import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getKeyword, getEvidenceForTrend, buildFallbackFeatures, buildFallbackBenefits, buildFallbackEvidenceFields } from "./agent.utils.js";

export async function generateLandingPage(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
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
  return generateLandingPageFallback(brief, productName, persona, painPoint);
}

function generateLandingPageFallback(brief, productName, persona, painPoint) {
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    headline: `Solve ${painPoint} with ${productName}`.slice(0, 80),
    subheadline: `${productName} helps ${persona} achieve ${benefits[0] || 'better outcomes'} through ${features[0] || 'innovative capabilities'}.`.slice(0, 150),
    heroCTA: `See how ${productName} works`,
    painPoints: [
      painPoint,
      ...(brief.painPoints || []).slice(0, 2),
    ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3),
    solution: `${productName} directly addresses ${painPoint} by providing ${persona} with ${features[0] || 'powerful tools'} and ${features[1] || 'intelligent workflows'}. The platform delivers ${benefits[0] || 'measurable improvements'} through an approach designed for real-world use.`,
    features: [
      { icon: '⚡', title: features[0] || 'Core Platform', description: `${features[0] || 'Core capabilities'} that help ${persona} achieve ${benefits[0] || 'better results'} faster.` },
      { icon: '🎯', title: features[1] || 'Advanced Analytics', description: `${features[1] || 'Data-driven insights'} to make informed decisions and track ${benefits[1] || 'key metrics'}.` },
      { icon: '🔗', title: features[2] || 'Seamless Integration', description: `Connect with existing tools and workflows for ${benefits[2] || 'smooth adoption and maximum impact'}.` },
    ].filter(f => f.description),
    socialProof: [],
    finalCTA: `Start with ${productName} today`,
    seoKeywords: [productName, painPoint.toLowerCase(), ...(brief.verifiedKeywords || []).slice(0, 1).map(k => k.keyword || k)].filter(Boolean).slice(0, 3),
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}

export async function generateProductPage(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
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
  return generateProductPageFallback(brief, productName, persona, painPoint);
}

function generateProductPageFallback(brief, productName, persona, painPoint) {
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    productName,
    tagline: `The solution ${persona} need to overcome ${painPoint}`,
    overview: `${productName} is designed specifically for ${persona} dealing with "${painPoint}". The platform combines ${features[0] || 'powerful capabilities'} with ${features[1] || 'intuitive design'} to deliver ${benefits[0] || 'measurable results'}. Whether you are looking to ${benefits[1] || 'improve outcomes'} or ${benefits[2] || 'streamline operations'}, ${productName} provides the tools you need.`,
    keyFeatures: [
      { name: features[0] || 'Core Capabilities', description: `${features[0] || 'Core platform features'} purpose-built for ${persona}.`, benefit: benefits[0] || 'Achieve better results faster' },
      { name: features[1] || 'Intelligent Workflows', description: `${features[1] || 'Smart automation'} that reduces manual effort.`, benefit: benefits[1] || 'Save time and reduce errors' },
      { name: features[2] || 'Analytics Dashboard', description: `${features[2] || 'Comprehensive analytics'} for data-driven decisions.`, benefit: benefits[2] || 'Make informed decisions with confidence' },
    ],
    useCases: [
      {
        scenario: `${persona} facing ${painPoint}`,
        solution: `${productName} provides targeted tools and workflows to address this challenge directly.`,
        outcome: `${benefits[0] || 'Improved outcomes'} and ${benefits[1] || 'enhanced efficiency'} for your team.`,
      },
    ],
    cta: `Get started with ${productName}`,
    pricing: null,
    faqs: [
      { question: `What is ${productName}?`, answer: `${productName} is a platform designed to help ${persona} address ${painPoint} through ${features[0] || 'innovative capabilities'} and ${benefits[0] || 'proven methodologies'}.` },
      { question: `How does ${productName} benefit ${persona}?`, answer: `${productName} delivers ${benefits.join(', ') || 'multiple benefits'} through an integrated platform built specifically for your needs.` },
    ],
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}

export async function generateComparisonPage(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
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
  return generateComparisonPageFallback(brief, productName, persona);
}

function generateComparisonPageFallback(brief, productName, persona) {
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  const competitors = brief.validatedCompetitors?.slice(0, 3).map(c => c.name) || ['Alternative solutions'];
  return {
    headline: `${productName} vs. ${competitors[0] || 'Alternatives'}: A Comprehensive Comparison`,
    introduction: `Choosing the right solution for ${persona} requires careful evaluation. This comparison examines how ${productName} stacks up against ${competitors.join(' and ') || 'alternative approaches'} across key criteria important to ${persona}.`,
    comparisonTable: {
      headers: ['Feature', productName, ...competitors.slice(0, 2)],
      rows: [
        { feature: features[0] || 'Core capabilities', [productName]: '✓', [competitors[0] || 'Competitor A']: 'Limited', [competitors[1] || 'Competitor B']: 'Partial' },
        { feature: features[1] || 'Ease of use', [productName]: '✓', [competitors[0] || 'Competitor A']: 'Moderate', [competitors[1] || 'Competitor B']: 'Complex' },
        { feature: benefits[0] || 'Time to value', [productName]: 'Fast', [competitors[0] || 'Competitor A']: 'Slow', [competitors[1] || 'Competitor B']: 'Medium' },
        { feature: benefits[1] || 'Integration', [productName]: 'Seamless', [competitors[0] || 'Competitor A']: 'Limited', [competitors[1] || 'Competitor B']: 'Requires custom work' },
      ],
    },
    whyChooseUs: `${productName} is purpose-built for ${persona} who need to address their specific challenges. Unlike generic alternatives, ${productName} delivers ${features.join(', ') || 'targeted capabilities'} with a focus on ${benefits[0] || 'practical outcomes'} and ${benefits[1] || 'measurable results'}. The platform's intuitive design and seamless integration capabilities make it the preferred choice for teams looking to make an immediate impact.`,
    cta: `Compare ${productName} for yourself`,
    competitorWeaknesses: competitors.slice(0, 2).map(c => ({
      competitor: c,
      weakness: `Limited specialization for ${persona}'s specific needs compared to ${productName}.`,
    })),
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}
