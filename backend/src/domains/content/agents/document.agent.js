import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getFirstFeature, getKeyword, getEvidenceForTrend, buildFallbackFeatures, buildFallbackBenefits, buildFallbackEvidenceFields } from "./agent.utils.js";

export async function generateFeatureAnnouncement(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const feature = getFirstFeature(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are a product marketing manager at ${productName}.

Write an exciting feature announcement for ${persona}.

${productContext}

Format: Feature announcement / Product update
Tone: Excited but credible, specific not hypey

STRATEGIC REQUIREMENTS:
- Headline: Announcement headline featuring "${feature}" and ${productName}. "[Product Name] Launches [Feature Name]: [Key Benefit for Persona]".
- Subheadline: Supporting subheadline explaining the "why" behind the feature. One sentence.
- Body: 2-3 paragraphs. Context (problem → pain point "${painPoint}") → What we built (feature) → Why it matters (benefit for ${persona}). Specific, evidence-backed.
- Benefits: 3 specific benefits from evidence. Use "What → So What → Now What" format for each benefit.
- CTA: Specific next step. "Try it now in [product]", "Enable [feature] in settings", "Learn how [feature] helps".
- Availability: Evidence-based. "Available now" or specific timeline.
- releaseVersion: Evidence-based version number or null if unknown.
- impact: One sentence on business impact for ${persona}.
- quote: Include only if evidence contains a real quote. Provide {name, role, text}. Otherwise null.
- nextSteps: 2-3 concrete actions the user can take (e.g., "Enable in settings", "Watch tutorial", "Contact support").
- TechnicalDetails: null unless evidence supports it.

Do NOT: fake stats, testimonials, superlatives ("game-changing", "revolutionary"), invented quotes.

Return valid JSON:
{
  "headline": "string — [Product] launches [Feature]: [Benefit]",
  "subheadline": "string — one sentence, the 'why'",
  "body": "string — 2-3 paragraphs, problem → solution → benefit",
  "benefits": ["3 benefits in 'What → So What → Now What' format"],
  "cta": "string — specific next step",
  "availability": "string — evidence-based timeline",
  "releaseVersion": "string or null — evidence-based version number",
  "impact": "string — one sentence on business impact",
  "quote": {"name": "string", "role": "string", "text": "string"} or null,
  "nextSteps": ["2-3 concrete actions"],
  "technicalDetails": null,
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[FeatureAnnouncement Agent] AI success', { hasHeadline: !!result.data.headline, benefits: result.data.benefits?.length, provider: result.provider });
      return { ...result.data, _provider: result.provider, _traceId: result.traceId };
    }
    console.warn('[FeatureAnnouncement Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) {
    console.error('[FeatureAnnouncement Agent] AI generation error:', e.message);
  }
  return generateFeatureAnnouncementFallback(brief, productName, persona, feature);
}

function generateFeatureAnnouncementFallback(brief, productName, persona, feature) {
  const benefits = buildFallbackBenefits(brief);
  return {
    headline: `Introducing ${feature}: A New Way for ${persona} to Achieve More with ${productName}`,
    subheadline: `${productName} ${feature} helps ${persona} overcome key challenges with targeted capabilities.`,
    body: `We are excited to announce ${feature}, a new capability within ${productName} designed specifically for ${persona}. This feature addresses the evolving needs of teams who require more from their tools.\n\n${feature} enables ${persona} to ${benefits[0] || 'achieve better outcomes'} while reducing complexity. Built on feedback from our users, this enhancement reflects our commitment to continuous improvement and user-centric design.`,
    benefits: benefits.slice(0, 3),
    cta: `Explore ${feature} in ${productName}`,
    availability: 'Available now',
    releaseVersion: null,
    impact: `${feature} enables ${persona} to ${benefits[0] || 'achieve better outcomes'} efficiently.`,
    quote: null,
    nextSteps: [`Explore ${feature} in ${productName}`, 'Review the documentation', 'Contact support for guidance'],
    technicalDetails: null,
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}

export async function generateWhitepaper(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are a senior industry analyst writing a whitepaper for ${productName}.

Write a comprehensive whitepaper outline for ${persona}.

${productContext}

Format: Whitepaper / Industry report
Tone: Authoritative, research-driven, data-informed

STRATEGIC REQUIREMENTS:
- Title: "Overcoming [Pain Point]: A [Product Name] Whitepaper for [Persona]". Include key theme.
- Subtitle: "Strategies, Insights, and Best Practices for [Persona]".
- targetAudience: Specific roles/industries this is for, derived from evidence.
- keyStatistic: One evidence-backed statistic or insight. Null if none available.
- methodology: One paragraph on how findings were gathered. Only from evidence. Null if insufficient evidence.
- ExecutiveSummary: 3-5 sentences. Problem statement, why it matters, what this whitepaper covers, key finding.
- Sections: Must follow this order: industry context → problem analysis → solution approach → implementation → measurement. Each with:
  - heading: Research-driven section title
  - body: 2-3 paragraphs, evidence-backed claims, industry context
  - keyFindings: 3 bullet points per section
- actionFramework: 3-step actionable framework derived from evidence (as a single string describing the framework).
- Conclusion: Recommendations based on evidence. Call to action.
- References: Empty array — do not invent.
- CTA: Specific. "Download the full whitepaper", "Access the complete research".

Do NOT: invent statistics, references, testimonials, superlatives.

Return valid JSON:
{
  "title": "string — including pain point and product name",
  "subtitle": "string — strategies and insights positioning",
  "targetAudience": "string — specific roles/industries from evidence",
  "keyStatistic": "string or null — one evidence-backed stat or insight",
  "methodology": "string or null — one paragraph on how findings were gathered",
  "executiveSummary": "string — 3-5 sentences",
  "sections": [{"heading": "string", "body": "string — 2-3 paragraphs", "keyFindings": ["3", "findings"]}],
  "actionFramework": "string — 3-step actionable framework",
  "conclusion": "string — recommendations and CTA",
  "references": [],
  "cta": "string — download or access CTA",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[Whitepaper Agent] AI success', { hasTitle: !!result.data.title, sections: result.data.sections?.length, provider: result.provider });
      return { ...result.data, _provider: result.provider, _traceId: result.traceId };
    }
    console.warn('[Whitepaper Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) {
    console.error('[Whitepaper Agent] AI generation error:', e.message);
  }
  return generateWhitepaperFallback(brief, productName, persona, painPoint);
}

function generateWhitepaperFallback(brief, productName, persona, painPoint) {
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    title: `Overcoming ${painPoint}: A ${productName} Whitepaper for ${persona}`,
    subtitle: `Strategies, insights, and practical approaches to addressing ${painPoint} with ${productName}`,
    targetAudience: `${persona} professionals and decision-makers in relevant industries`,
    keyStatistic: null,
    methodology: null,
    executiveSummary: `This whitepaper explores how ${persona} can overcome "${painPoint}" using ${productName}. Drawing on ${features[0] || 'industry best practices'} and ${features[1] || 'real-world applications'}, we provide a comprehensive framework for achieving ${benefits[0] || 'measurable improvements'} and ${benefits[1] || 'sustainable results'}.`,
    sections: [
      {
        heading: `Understanding ${painPoint} in Today's Landscape`,
        body: `${painPoint} continues to challenge ${persona} across the industry. ${productName} has identified key patterns and contributing factors through extensive research and user feedback. This section examines the root causes and impact of this challenge.`,
        keyFindings: [`${painPoint} affects the majority of ${persona}`, 'Traditional approaches provide incomplete solutions', 'New strategies are needed for lasting impact'],
      },
      {
        heading: `How ${productName} Addresses ${painPoint}`,
        body: `${productName} takes a targeted approach to solving ${painPoint}. Through ${features[0] || 'innovative features'} and ${features[1] || 'intelligent workflows'}, the platform provides ${persona} with the tools they need to achieve ${benefits[0] || 'better outcomes'}. This section details the specific mechanisms and capabilities that make ${productName} effective.`,
        keyFindings: [`${features[0] || 'Core features'} directly address ${painPoint}`, `${benefits[0] || 'Key benefits'} are validated by user feedback`, 'Implementation is straightforward and efficient'],
      },
      {
        heading: `Practical Implementation Guide for ${persona}`,
        body: `Implementing ${productName} to address ${painPoint} is a structured process. This section provides a step-by-step guide for ${persona} to deploy ${productName} effectively, including best practices, common pitfalls to avoid, and strategies for maximizing ${benefits[0] || 'value'} and ${benefits[1] || 'impact'}.`,
        keyFindings: ['Follow a structured implementation approach', 'Engage stakeholders early and often', 'Measure and iterate for continuous improvement'],
      },
    ],
    actionFramework: `1) Assess current state and identify gaps related to ${painPoint}. 2) Implement ${productName} solutions tailored to ${persona} needs. 3) Measure outcomes and iterate based on ${benefits[0] || 'key metrics'}.`,
    conclusion: `${painPoint} does not have to limit what ${persona} can achieve. ${productName} provides a comprehensive, proven approach to overcoming this challenge. By leveraging ${features[0] || 'targeted capabilities'} and following the strategies outlined in this whitepaper, organizations can achieve ${benefits[0] || 'meaningful improvements'} and ${benefits[1] || 'lasting results'}.`,
    references: [],
    cta: `Download the full ${productName} whitepaper`,
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}
