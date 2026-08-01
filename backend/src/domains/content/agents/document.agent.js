import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getFirstFeature, getKeyword, getEvidenceForTrend, buildFallbackFeatures, buildFallbackBenefits, buildFallbackEvidenceFields, checkEvidenceSufficiency } from "./agent.utils.js";

export async function generateFeatureAnnouncement(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const evidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (evidenceCheck) {
    console.warn(`[FeatureAnnouncement Agent] Insufficient evidence: ${evidenceCheck}`);
    return { _insufficientEvidence: true, _message: evidenceCheck, _provider: 'evidence_gate' };
  }
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
- Body: 2-3 paragraphs. Context (problem â†’ pain point "${painPoint}") â†’ What we built (feature) â†’ Why it matters (benefit for ${persona}). Specific, evidence-backed.
- Benefits: 3 specific benefits from evidence. Use "What â†’ So What â†’ Now What" format for each benefit.
- CTA: Specific next step. "Try it now in [product]", "Enable [feature] in settings", "Learn how [feature] helps".
- Availability: Evidence-based. "Available now" or specific timeline.
- releaseVersion: Evidence-based version number or null if unknown.
- impact: One sentence on business impact for ${persona}.
- quote: Include only if evidence contains a real quote. Provide {name, role, text}. Otherwise null.
- nextSteps: 2-3 concrete actions the user can take (e.g., "Enable in settings", "Watch tutorial", "Contact support").
- TechnicalDetails: null unless evidence supports it.

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
Do NOT: fake stats, testimonials, superlatives ("game-changing", "revolutionary"), invented quotes.

Return valid JSON:
{
  "headline": "string â€” [Product] launches [Feature]: [Benefit]",
  "subheadline": "string â€” one sentence, the 'why'",
  "body": "string â€” 2-3 paragraphs, problem â†’ solution â†’ benefit",
  "benefits": ["3 benefits in 'What â†’ So What â†’ Now What' format"],
  "cta": "string â€” specific next step",
  "availability": "string â€” evidence-based timeline",
  "releaseVersion": "string or null â€” evidence-based version number",
  "impact": "string â€” one sentence on business impact",
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
  console.warn('[*Agent] AI generation failed — returning null (no fabricated fallback content)');
  return null;
}

function generateFeatureAnnouncementFallback(brief, productName, persona, feature) {
  const fallbackEvidenceCheck = checkEvidenceSufficiency(brief);
  if (fallbackEvidenceCheck) {
    return { _insufficientEvidence: true, _message: fallbackEvidenceCheck, _provider: 'evidence_gate' };
  }
  const benefits = buildFallbackBenefits(brief);
  return {
    headline: `Introducing ${feature}: A New Capability for ${persona} in ${productName}`,
    subheadline: `${productName}'s ${feature} is designed for ${persona} working through ${benefits[0] || 'their key challenges'}.`,
    body: `We are pleased to announce ${feature}, a new capability within ${productName} designed for ${persona}.\n\n${feature} is built to help ${persona} make progress on ${benefits[0] || 'their priority outcomes'} while reducing manual effort. For details on how it works, see the documentation or reach out to the team.`,
    benefits: benefits.slice(0, 3),
    cta: `Explore ${feature} in ${productName}`,
    availability: null,
    releaseVersion: null,
    impact: `${feature} is designed to help ${persona} with ${benefits[0] || 'their priority outcomes'}.`,
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
  const evidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (evidenceCheck) {
    console.warn(`[Whitepaper Agent] Insufficient evidence: ${evidenceCheck}`);
    return { _insufficientEvidence: true, _message: evidenceCheck, _provider: 'evidence_gate' };
  }
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
- Sections: Must follow this order: industry context â†’ problem analysis â†’ solution approach â†’ implementation â†’ measurement. Each with:
  - heading: Research-driven section title
  - body: 2-3 paragraphs, evidence-backed claims, industry context
  - keyFindings: 3 bullet points per section
- actionFramework: 3-step actionable framework derived from evidence (as a single string describing the framework).
- Conclusion: Recommendations based on evidence. Call to action.
- References: Empty array â€” do not invent.
- CTA: Specific. "Download the full whitepaper", "Access the complete research".

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
Do NOT: invent statistics, references, testimonials, superlatives.

Return valid JSON:
{
  "title": "string â€” including pain point and product name",
  "subtitle": "string â€” strategies and insights positioning",
  "targetAudience": "string â€” specific roles/industries from evidence",
  "keyStatistic": "string or null â€” one evidence-backed stat or insight",
  "methodology": "string or null â€” one paragraph on how findings were gathered",
  "executiveSummary": "string â€” 3-5 sentences",
  "sections": [{"heading": "string", "body": "string â€” 2-3 paragraphs", "keyFindings": ["3", "findings"]}],
  "actionFramework": "string â€” 3-step actionable framework",
  "conclusion": "string â€” recommendations and CTA",
  "references": [],
  "cta": "string â€” download or access CTA",
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
  console.warn('[*Agent] AI generation failed — returning null (no fabricated fallback content)');
  return null;
}

function generateWhitepaperFallback(brief, productName, persona, painPoint) {
  const fallbackEvidenceCheck = checkEvidenceSufficiency(brief);
  if (fallbackEvidenceCheck) {
    return { _insufficientEvidence: true, _message: fallbackEvidenceCheck, _provider: 'evidence_gate' };
  }
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    title: `Overcoming ${painPoint}: A ${productName} Whitepaper for ${persona}`,
    subtitle: `Strategies, insights, and practical approaches to addressing ${painPoint} with ${productName}`,
    targetAudience: `${persona} professionals and decision-makers in relevant industries`,
    keyStatistic: null,
    methodology: null,
    executiveSummary: `This whitepaper explores how ${productName} is designed to help ${persona} address "${painPoint}". It walks through the problem, how ${features[0] || 'the platform capabilities'} and ${features[1] || 'its workflows'} are intended to help, and what ${benefits[0] || 'outcomes'} and ${benefits[1] || 'results'} the product targets.`,
    sections: [
      {
        heading: `Understanding ${painPoint} in Today's Landscape`,
        body: `${painPoint} is a recurring operational challenge for ${persona} in many organizations. This section outlines why the problem persists and what a structured approach to it looks like.`,
        keyFindings: [`${painPoint} is a recurring operational challenge for ${persona}`, 'Off-the-shelf fixes often only address symptoms', 'A structured, product-led approach is worth testing'],
      },
      {
        heading: `How ${productName} Addresses ${painPoint}`,
        body: `${productName} takes a targeted approach to ${painPoint}. Through ${features[0] || 'its features'} and ${features[1] || 'its workflows'}, the platform gives ${persona} tools designed for ${benefits[0] || 'practical outcomes'}. This section details the specific capabilities ${productName} offers.`,
        keyFindings: [`${features[0] || 'Core features'} target ${painPoint}`, `${benefits[0] || 'Key benefits'} are the stated design goals`, 'Implementation follows a structured rollout'],
      },
      {
        heading: `Practical Implementation Guide for ${persona}`,
        body: `Implementing ${productName} to address ${painPoint} is a structured process. This section provides a step-by-step guide for ${persona} to deploy ${productName}, including rollout steps, common pitfalls to avoid, and how to track ${benefits[0] || 'progress'} and ${benefits[1] || 'impact'}.`,
        keyFindings: ['Follow a structured implementation approach', 'Engage stakeholders early and often', 'Measure and iterate for continuous improvement'],
      },
    ],
    actionFramework: `1) Assess current state and identify gaps related to ${painPoint}. 2) Implement ${productName} solutions tailored to ${persona} needs. 3) Measure outcomes and iterate based on ${benefits[0] || 'key metrics'}.`,
    conclusion: `${painPoint} does not have to be accepted as a given. ${productName} is designed to help ${persona} take a structured approach to it. By applying ${features[0] || 'the platform capabilities'} and the steps in this whitepaper, organizations can aim for ${benefits[0] || 'meaningful improvements'} and ${benefits[1] || 'sustainable results'}.`,
    references: [],
    cta: `Download the full ${productName} whitepaper`,
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}
