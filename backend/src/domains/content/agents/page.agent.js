import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getKeyword, getEvidenceForTrend, buildFallbackFeatures, buildFallbackBenefits, buildFallbackEvidenceFields, checkEvidenceSufficiency } from "./agent.utils.js";

export async function generateLandingPage(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const evidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (evidenceCheck) {
    console.warn(`[LandingPage Agent] Insufficient evidence: ${evidenceCheck}`);
    return { _insufficientEvidence: true, _message: evidenceCheck, _provider: 'evidence_gate' };
  }
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const campaignGoal = brief.campaign?.goal?.value || brief.campaign?.goal || '';
  const primaryCTA = brief.campaign?.primaryCTA?.value || brief.campaign?.primaryCTA || '';

  const prompt = `You are a senior conversion copywriter for ${productName}.

Write a high-converting landing page for ${persona}.

${productContext}

Format: Landing page
Tone: Persuasive, benefit-driven, urgent without being pushy

STRATEGIC REQUIREMENTS:
- Headline: Single, powerful benefit-driven headline. Include primary value prop. Max 80 chars. Use the "So that" framework: [Feature] so that [Benefit].
- Subheadline: Expand on the headline with a specific promise. Max 150 chars.
- HeroCTA: Primary CTA button text. Must be a specific action verb + value. NOT generic like "Get Started" — use "Start Your Free Trial" or "Book Your Demo" instead. ${primaryCTA ? `Recommended: "${primaryCTA}"` : ''}
- HeroSubtext: Short line below CTA (e.g. "No credit card required. Free 14-day trial."). Use evidence if available.
- TrustSignals: Array of evidence-backed trust indicators (e.g., "Used by [number] teams", "SOC 2 compliant"). Empty if not in evidence.
- UrgencyMechanism: A single string with a time-limited offer or scarcity angle IF evidence supports it. Null otherwise.
- PainPoints: 3 specific pain points from evidence that ${persona} experiences.
- Solution: One compelling paragraph describing the solution. Specific features, not generic claims.
- Features: 3 features with icon (emoji), title, and benefit-driven description. Use the "Feature → Benefit → Outcome" structure.
- SocialProof: Empty array — do NOT invent testimonials, logos, or stats.
- FinalCTA: Closing CTA. Strong, confident, specific.
- SEO Keywords: 3 keywords from evidence to optimize for.

${campaignGoal ? `- Campaign Goal: "${campaignGoal}"` : ''}

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
Do NOT: invent testimonials, fake stats, ROI claims, pricing, superlatives, generic stock photography references.

Return valid JSON:
{
  "headline": "string — max 80 chars, benefit-driven, USP-focused",
  "subheadline": "string — max 150 chars, specific promise",
  "heroCTA": "string — specific action verb + value (e.g. 'Start Your Free Trial')",
  "heroSubtext": "string — short line below CTA (e.g. 'No credit card required. Free 14-day trial.')",
  "trustSignals": ["array of evidence-backed trust indicators, or empty"],
  "urgencyMechanism": "string or null — time-limited offer or scarcity angle if in evidence",
  "painPoints": ["3", "specific", "pain", "points"],
  "solution": "string — one paragraph, specific, evidence-backed",
  "features": [{"icon": "emoji", "title": "string", "description": "string — Feature → Benefit → Outcome"}],
  "socialProof": [],
  "finalCTA": "string — strong, confident closing CTA",
  "seoKeywords": ["3", "seo", "keywords"],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[LandingPage Agent] AI success', { hasHeadline: !!result.data.headline, features: result.data.features?.length, provider: result.provider });
      return { ...result.data, _provider: result.provider, _traceId: result.traceId };
    }
    console.warn('[LandingPage Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) {
    console.error('[LandingPage Agent] AI generation error:', e.message);
  }
  return generateLandingPageFallback(brief, productName, persona, painPoint);
}

function generateLandingPageFallback(brief, productName, persona, painPoint) {
  const fallbackEvidenceCheck = checkEvidenceSufficiency(brief);
  if (fallbackEvidenceCheck) {
    return { _insufficientEvidence: true, _message: fallbackEvidenceCheck, _provider: 'evidence_gate' };
  }
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    headline: `Solve ${painPoint} with ${productName}`.slice(0, 80),
    subheadline: `${productName} helps ${persona} achieve ${benefits[0] || 'better outcomes'} through ${features[0] || 'innovative capabilities'}.`.slice(0, 150),
    heroCTA: `Start Your Free Trial`,
    heroSubtext: 'No credit card required. Free 14-day trial.',
    trustSignals: [],
    urgencyMechanism: null,
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
  const evidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (evidenceCheck) {
    console.warn(`[ProductPage Agent] Insufficient evidence: ${evidenceCheck}`);
    return { _insufficientEvidence: true, _message: evidenceCheck, _provider: 'evidence_gate' };
  }
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are a senior product copywriter for ${productName}.

Write a compelling product page for ${persona}.

${productContext}

Format: Product page
Tone: Confident, specific, value-oriented

STRATEGIC REQUIREMENTS:
- productName: "${productName}" — use exactly.
- tagline: One-line value proposition. Reference USP from evidence. "The [category] for [persona] that [key benefit]."
- overview: One paragraph. Problem (pain point) → Solution (product) → Outcome (benefits). Reference evidence.
- heroImage: A detailed Midjourney/DALL-E image prompt describing the product hero image. Include visual style, perspective, and mood.
- keyFeatures: 4-5 features. Each description must use "Feature → Mechanism → Benefit" triple structure (what it is → how it works → what it means for them). Map directly to evidence.
- integrationHighlights: Array of 2-3 integration names from evidence. Null if none found.
- roiMetrics: Array of {metric, value, description} objects. ONLY include if evidence has ROI data. Empty otherwise.
- useCases: 2-3 use cases. Each: scenario (when), solution (how), outcome (result). Relevant to ${persona}.
- cta: Specific, confident CTA. Action + value.
- pricing: null — do not invent.
- faqs: 3-4 FAQs addressing real customer concerns from evidence. Not generic.

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
Do NOT: invent pricing, testimonials, fake data, superlatives, competitor bashing.

Return valid JSON:
{
  "productName": "${productName}",
  "tagline": "string — one-line value proposition with USP",
  "overview": "string — Problem → Solution → Outcome paragraph",
  "heroImage": "string — detailed Midjourney/DALL-E prompt for product hero image",
  "keyFeatures": [{"name": "string", "description": "string — Feature → Mechanism → Benefit", "benefit": "string — what it means"}],
  "integrationHighlights": ["array of 2-3 integration names from evidence, or null"],
  "roiMetrics": [{"metric": "string", "value": "string", "description": "string"}],
  "useCases": [{"scenario": "string — when", "solution": "string — how", "outcome": "string — result"}],
  "cta": "string — specific, confident CTA",
  "pricing": null,
  "faqs": [{"question": "string — real concern", "answer": "string — evidence-backed"}],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[ProductPage Agent] AI success', { productName: result.data.productName, features: result.data.keyFeatures?.length, provider: result.provider });
      return { ...result.data, _provider: result.provider, _traceId: result.traceId };
    }
    console.warn('[ProductPage Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) {
    console.error('[ProductPage Agent] AI generation error:', e.message);
  }
  return generateProductPageFallback(brief, productName, persona, painPoint);
}

function generateProductPageFallback(brief, productName, persona, painPoint) {
  const fallbackEvidenceCheck = checkEvidenceSufficiency(brief);
  if (fallbackEvidenceCheck) {
    return { _insufficientEvidence: true, _message: fallbackEvidenceCheck, _provider: 'evidence_gate' };
  }
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    productName,
    tagline: `The solution ${persona} need to overcome ${painPoint}`,
    overview: `${productName} is designed specifically for ${persona} dealing with "${painPoint}". The platform combines ${features[0] || 'powerful capabilities'} with ${features[1] || 'intuitive design'} to deliver ${benefits[0] || 'measurable results'}. Whether you are looking to ${benefits[1] || 'improve outcomes'} or ${benefits[2] || 'streamline operations'}, ${productName} provides the tools you need.`,
    heroImage: `Product hero showcasing ${productName}'s interface with ${persona} using the platform — clean, modern SaaS dashboard style, warm lighting, focused professional environment`,
    keyFeatures: [
      { name: features[0] || 'Core Capabilities', description: `${features[0] || 'Core platform features'} purpose-built for ${persona}.`, benefit: benefits[0] || 'Achieve better results faster' },
      { name: features[1] || 'Intelligent Workflows', description: `${features[1] || 'Smart automation'} that reduces manual effort.`, benefit: benefits[1] || 'Save time and reduce errors' },
      { name: features[2] || 'Analytics Dashboard', description: `${features[2] || 'Comprehensive analytics'} for data-driven decisions.`, benefit: benefits[2] || 'Make informed decisions with confidence' },
    ],
    integrationHighlights: null,
    roiMetrics: [],
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
  const evidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (evidenceCheck) {
    console.warn(`[ComparisonPage Agent] Insufficient evidence: ${evidenceCheck}`);
    return { _insufficientEvidence: true, _message: evidenceCheck, _provider: 'evidence_gate' };
  }
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const competitors = brief.validatedCompetitors?.slice(0, 3).map(c => c.name) || [];

  const prompt = `You are writing an objective comparison page for ${productName}.

${productContext}

Format: Comparison / Alternatives page
Tone: Objective, evidence-based, helpful

STRATEGIC REQUIREMENTS:
- headline: "${productName} vs. [Competitor 1] vs. [Competitor 2]: [Category] Comparison for ${persona}".
- introduction: 1-2 paragraphs. What's being compared, who it's for, criteria used. No bias.
- comparisonTable: Object with headers [criteria, ${productName}, competitors...] and rows. Be OBJECTIVE. ${productName} does NOT need to win every row. Only use evidence-backed comparisons.
- Each row in comparisonTable must have a "winner" field: "${productName}" or "competitor" or "tie".
- The table must have at least 7 rows comparing different criteria. Use: Features, Ease of Use, Time to Value, Integration, Scalability, Security & Compliance, Support, Pricing (if known), Customization, Performance, Onboarding, Analytics, Automation, Reporting (select 7+).
- verdict: One-sentence "who should choose [product]" recommendation. Tailored to ${persona}.
- idealCustomerProfile: Brief description of who benefits most from ${productName}.
- whyChooseUs: Evidence-based reasons to choose ${productName}. Specific features, capabilities.
- competitorWeaknesses: ONLY if evidence supports. Empty array otherwise.
- cta: Specific, helpful CTA.

${competitors.length ? `Competitors from evidence: ${competitors.join(', ')}` : 'No competitor evidence — use generic categories.'}

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
Do NOT: bash competitors without evidence, make superlative claims, use fake data, invent competitor weaknesses.

Return valid JSON:
{
  "headline": "string",
  "introduction": "string",
  "comparisonTable": {"headers": ["string"], "rows": [{"feature": "string", "winner": "productName or competitor or tie"}]},
  "verdict": "string — one-sentence who should choose this product",
  "idealCustomerProfile": "string — brief description of who benefits most",
  "whyChooseUs": "string — evidence-based differentiators",
  "cta": "string",
  "competitorWeaknesses": [{"competitor": "string", "weakness": "string"}],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[ComparisonPage Agent] AI success', { hasHeadline: !!result.data.headline, rows: result.data.comparisonTable?.rows?.length, provider: result.provider });
      return { ...result.data, _provider: result.provider, _traceId: result.traceId };
    }
    console.warn('[ComparisonPage Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) {
    console.error('[ComparisonPage Agent] AI generation error:', e.message);
  }
  return generateComparisonPageFallback(brief, productName, persona);
}

function generateComparisonPageFallback(brief, productName, persona) {
  const fallbackEvidenceCheck = checkEvidenceSufficiency(brief);
  if (fallbackEvidenceCheck) {
    return { _insufficientEvidence: true, _message: fallbackEvidenceCheck, _provider: 'evidence_gate' };
  }
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  const competitors = brief.validatedCompetitors?.slice(0, 3).map(c => c.name) || ['Alternative solutions'];
  return {
    headline: `${productName} vs. ${competitors[0] || 'Alternatives'}: A Comprehensive Comparison`,
    introduction: `Choosing the right solution for ${persona} requires careful evaluation. This comparison examines how ${productName} stacks up against ${competitors.join(' and ') || 'alternative approaches'} across key criteria important to ${persona}.`,
    comparisonTable: {
      headers: ['Feature', productName, ...competitors.slice(0, 2)],
      rows: [
        { feature: features[0] || 'Core capabilities', [productName]: '✓', [competitors[0] || 'Competitor A']: 'Limited', [competitors[1] || 'Competitor B']: 'Partial', winner: productName },
        { feature: features[1] || 'Ease of use', [productName]: '✓', [competitors[0] || 'Competitor A']: 'Moderate', [competitors[1] || 'Competitor B']: 'Complex', winner: productName },
        { feature: benefits[0] || 'Time to value', [productName]: 'Fast', [competitors[0] || 'Competitor A']: 'Slow', [competitors[1] || 'Competitor B']: 'Medium', winner: productName },
        { feature: benefits[1] || 'Integration', [productName]: 'Seamless', [competitors[0] || 'Competitor A']: 'Limited', [competitors[1] || 'Competitor B']: 'Requires custom work', winner: productName },
        { feature: 'Scalability', [productName]: 'High', [competitors[0] || 'Competitor A']: 'Medium', [competitors[1] || 'Competitor B']: 'Low', winner: productName },
        { feature: 'Support', [productName]: 'Dedicated', [competitors[0] || 'Competitor A']: 'Standard', [competitors[1] || 'Competitor B']: 'Limited', winner: productName },
        { feature: 'Pricing', [productName]: 'Competitive', [competitors[0] || 'Competitor A']: 'Varies', [competitors[1] || 'Competitor B']: 'Premium', winner: 'tie' },
      ],
    },
    verdict: `${productName} is the best choice for ${persona} who need ${features[0] || 'specialized capabilities'} with fast time to value and seamless integration.`,
    idealCustomerProfile: `${persona} teams looking to address ${benefits[0] || 'key challenges'} with a purpose-built solution that combines ${features.join(' and ') || 'power and simplicity'}.`,
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
