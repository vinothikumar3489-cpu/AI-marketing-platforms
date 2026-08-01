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
- HeroCTA: Primary CTA button text. Must be a specific action verb + value. NOT generic like "Get Started" â€” use "Start Your Free Trial" or "Book Your Demo" only if the offer actually exists and is in evidence; otherwise use "Learn More" or a factual action. ${primaryCTA ? `Recommended: "${primaryCTA}"` : ''}
- HeroSubtext: Short line below CTA, only if supported by evidence (e.g. actual trial terms from evidence). Omit fabricated offers ("No credit card required. Free 14-day trial.") unless the brief verifies them. Null otherwise.
- TrustSignals: Array of evidence-backed trust indicators (e.g., "Used by [number] teams", "SOC 2 compliant"). Empty if not in evidence.
- UrgencyMechanism: A single string with a time-limited offer or scarcity angle IF evidence supports it. Null otherwise.
- PainPoints: 3 specific pain points from evidence that ${persona} experiences.
- Solution: One compelling paragraph describing the solution. Specific features, not generic claims.
- Features: 3 features with icon (emoji), title, and benefit-driven description. Use the "Feature â†’ Benefit â†’ Outcome" structure.
- SocialProof: Empty array â€” do NOT invent testimonials, logos, or stats.
- FinalCTA: Closing CTA. Strong, confident, specific.
- SEO Keywords: 3 keywords from evidence to optimize for.

${campaignGoal ? `- Campaign Goal: "${campaignGoal}"` : ''}

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
Do NOT: invent testimonials, fake stats, ROI claims, pricing, superlatives, generic stock photography references.

Return valid JSON:
{
  "headline": "string â€” max 80 chars, benefit-driven, USP-focused",
  "subheadline": "string â€” max 150 chars, specific promise",
  "heroCTA": "string â€” specific action verb + value; trial/demo offers only if verified in evidence",
  "heroSubtext": "string or null â€” short line below CTA, only if verified in evidence",
  "trustSignals": ["array of evidence-backed trust indicators, or empty"],
  "urgencyMechanism": "string or null â€” time-limited offer or scarcity angle if in evidence",
  "painPoints": ["3", "specific", "pain", "points"],
  "solution": "string â€” one paragraph, specific, evidence-backed",
  "features": [{"icon": "emoji", "title": "string", "description": "string â€” Feature â†’ Benefit â†’ Outcome"}],
  "socialProof": [],
  "finalCTA": "string â€” strong, confident closing CTA",
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
  console.warn('[*Agent] AI generation failed — returning null (no fabricated fallback content)');
  return null;
}

function generateLandingPageFallback(brief, productName, persona, painPoint) {
  const fallbackEvidenceCheck = checkEvidenceSufficiency(brief);
  if (fallbackEvidenceCheck) {
    return { _insufficientEvidence: true, _message: fallbackEvidenceCheck, _provider: 'evidence_gate' };
  }
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    headline: `Address ${painPoint} with ${productName}`.slice(0, 80),
    subheadline: `${productName} is designed to help ${persona} work through ${painPoint} with ${features[0] || 'practical capabilities'} and ${features[1] || 'clear workflows'}.`.slice(0, 150),
    heroCTA: `Learn More`,
    heroSubtext: `See ${productName} in action and decide for yourself.`,
    trustSignals: [],
    urgencyMechanism: null,
    painPoints: [
      painPoint,
      ...(brief.painPoints || []).slice(0, 2),
    ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3),
    solution: `${productName} is designed to address ${painPoint} by giving ${persona} ${features[0] || 'practical tools'} and ${features[1] || 'structured workflows'}. The intended outcomes are ${benefits[0] || 'practical results'} and ${benefits[1] || 'clear improvements'}.`,
    features: [
      { icon: '\u26A1', title: features[0] || 'Core Platform', description: `${features[0] || 'Core capabilities'} designed to help ${persona} make progress on ${benefits[0] || 'practical outcomes'}.` },
      { icon: '\uD83C\uDFAF', title: features[1] || 'Reporting', description: `${features[1] || 'Dashboards and reporting'} to track progress on ${benefits[1] || 'key metrics'}.` },
      { icon: '\uD83D\uDD17', title: features[2] || 'Integrations', description: `Integrate with existing tools and workflows for ${benefits[2] || 'smoother adoption'}.` },
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
- productName: "${productName}" â€” use exactly.
- tagline: One-line value proposition. Reference USP from evidence. "The [category] for [persona] that [key benefit]."
- overview: One paragraph. Problem (pain point) â†’ Solution (product) â†’ Outcome (benefits). Reference evidence.
- heroImage: A detailed Midjourney/DALL-E image prompt describing the product hero image. Include visual style, perspective, and mood.
- keyFeatures: 4-5 features. Each description must use "Feature â†’ Mechanism â†’ Benefit" triple structure (what it is â†’ how it works â†’ what it means for them). Map directly to evidence.
- integrationHighlights: Array of 2-3 integration names from evidence. Null if none found.
- roiMetrics: Array of {metric, value, description} objects. ONLY include if evidence has ROI data. Empty otherwise.
- useCases: 2-3 use cases. Each: scenario (when), solution (how), outcome (result). Relevant to ${persona}.
- cta: Specific, confident CTA. Action + value.
- pricing: null â€” do not invent.
- faqs: 3-4 FAQs addressing real customer concerns from evidence. Not generic.

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
Do NOT: invent pricing, testimonials, fake data, superlatives, competitor bashing.

Return valid JSON:
{
  "productName": "${productName}",
  "tagline": "string â€” one-line value proposition with USP",
  "overview": "string â€” Problem â†’ Solution â†’ Outcome paragraph",
  "heroImage": "string â€” detailed Midjourney/DALL-E prompt for product hero image",
  "keyFeatures": [{"name": "string", "description": "string â€” Feature â†’ Mechanism â†’ Benefit", "benefit": "string â€” what it means"}],
  "integrationHighlights": ["array of 2-3 integration names from evidence, or null"],
  "roiMetrics": [{"metric": "string", "value": "string", "description": "string"}],
  "useCases": [{"scenario": "string â€” when", "solution": "string â€” how", "outcome": "string â€” result"}],
  "cta": "string â€” specific, confident CTA",
  "pricing": null,
  "faqs": [{"question": "string â€” real concern", "answer": "string â€” evidence-backed"}],
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
  console.warn('[*Agent] AI generation failed — returning null (no fabricated fallback content)');
  return null;
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
    tagline: `A platform designed for ${persona} addressing ${painPoint}`,
    overview: `${productName} is designed for ${persona} dealing with "${painPoint}". The platform combines ${features[0] || 'practical capabilities'} with ${features[1] || 'structured workflows'} to aim for ${benefits[0] || 'practical outcomes'}. Whether you are looking to ${benefits[1] || 'improve workflows'} or ${benefits[2] || 'reduce overhead'}, ${productName} is built around those goals.`,
    heroImage: `Product hero showcasing ${productName}'s interface with ${persona} using the platform \u2014 clean, modern SaaS dashboard style, warm lighting, focused professional environment`,
    keyFeatures: [
      { name: features[0] || 'Core Capabilities', description: `${features[0] || 'Core platform features'} built for ${persona}.`, benefit: benefits[0] || 'Practical outcomes as the goal' },
      { name: features[1] || 'Workflow Tools', description: `${features[1] || 'Tooling for repetitive tasks'} to reduce manual effort.`, benefit: benefits[1] || 'Less manual work' },
      { name: features[2] || 'Reporting', description: `${features[2] || 'Dashboards and reporting'} for evidence-based decisions.`, benefit: benefits[2] || 'Track progress over time' },
    ],
    integrationHighlights: null,
    roiMetrics: [],
    useCases: [
      {
        scenario: `${persona} facing ${painPoint}`,
        solution: `${productName} provides targeted tools and workflows to address this challenge directly.`,
        outcome: `Intended outcomes are ${benefits[0] || 'practical results'} and ${benefits[1] || 'clear improvements'}.`,
      },
    ],
    cta: `Get started with ${productName}`,
    pricing: null,
    faqs: [
      { question: `What is ${productName}?`, answer: `${productName} is a platform designed to help ${persona} address ${painPoint} through ${features[0] || 'practical capabilities'} and ${benefits[0] || 'intended outcomes'}.` },
      { question: `How does ${productName} benefit ${persona}?`, answer: `${productName} is designed around ${benefits.join(', ') || 'practical outcomes'} for ${persona}.` },
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

${competitors.length ? `Competitors from evidence: ${competitors.join(', ')}` : 'No competitor evidence â€” use generic categories.'}

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
Do NOT: bash competitors without evidence, make superlative claims, use fake data, invent competitor weaknesses.

Return valid JSON:
{
  "headline": "string",
  "introduction": "string",
  "comparisonTable": {"headers": ["string"], "rows": [{"feature": "string", "winner": "productName or competitor or tie"}]},
  "verdict": "string â€” one-sentence who should choose this product",
  "idealCustomerProfile": "string â€” brief description of who benefits most",
  "whyChooseUs": "string â€” evidence-based differentiators",
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
  console.warn('[*Agent] AI generation failed — returning null (no fabricated fallback content)');
  return null;
}

function generateComparisonPageFallback(brief, productName, persona) {
  const fallbackEvidenceCheck = checkEvidenceSufficiency(brief);
  if (fallbackEvidenceCheck) {
    return { _insufficientEvidence: true, _message: fallbackEvidenceCheck, _provider: 'evidence_gate' };
  }
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  const competitors = brief.validatedCompetitors?.slice(0, 3).map(c => c.name) || [];
  const compA = competitors[0] || 'Competitor A';
  const compB = competitors[1] || 'Competitor B';
  return {
    headline: `${productName} vs. ${competitors[0] || 'Alternatives'}: A Feature Comparison`,
    introduction: `Choosing the right solution for ${persona} requires careful evaluation. This comparison lists what ${productName} offers; data on the alternatives was not verified and is marked as requiring review.`,
    comparisonTable: {
      headers: ['Feature', productName, compA, compB],
      rows: [
        { feature: features[0] || 'Core capabilities', [productName]: 'Available', [compA]: 'Requires review', [compB]: 'Requires review', winner: 'tie' },
        { feature: features[1] || 'Workflow support', [productName]: 'Available', [compA]: 'Requires review', [compB]: 'Requires review', winner: 'tie' },
        { feature: benefits[0] || 'Intended outcome', [productName]: 'Designed for this', [compA]: 'Requires review', [compB]: 'Requires review', winner: 'tie' },
        { feature: benefits[1] || 'Intended outcome', [productName]: 'Designed for this', [compA]: 'Requires review', [compB]: 'Requires review', winner: 'tie' },
        { feature: 'Pricing', [productName]: 'See product page', [compA]: 'Requires review', [compB]: 'Requires review', winner: 'tie' },
        { feature: 'Support', [productName]: 'See product page', [compA]: 'Requires review', [compB]: 'Requires review', winner: 'tie' },
      ],
    },
    verdict: `Confirm each option against your own requirements \u2014 this page only verifies what ${productName} offers.`,
    idealCustomerProfile: `${persona} teams looking to address ${benefits[0] || 'their specific challenges'} with a platform built around ${features.join(' and ') || 'their needs'}.`,
    whyChooseUs: `${productName} is purpose-built for ${persona} and offers ${features.join(', ') || 'its core capabilities'} with a focus on ${benefits[0] || 'practical outcomes'} and ${benefits[1] || 'clear workflows'}. Ratings for alternative products require verified data.`,
    cta: `Try ${productName} for yourself`,
    competitorWeaknesses: [],
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: competitors.length
      ? [`Ratings for ${competitors.join(' and ')} were not verified and require evidence before publication.`]
      : [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}
