import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getKeyword, getEvidenceForTrend, buildFallbackFeatures, buildFallbackBenefits, buildFallbackEvidenceFields, checkEvidenceSufficiency } from "./agent.utils.js";

export async function generateBlogArticle(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const evidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (evidenceCheck) {
    console.warn(`[Blog Agent] Insufficient evidence: ${evidenceCheck}`);
    return { _insufficientEvidence: true, _message: evidenceCheck, _provider: 'evidence_gate' };
  }
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const keyword = getKeyword(brief, 0) || painPoint.toLowerCase().replace(/\s+/g, '-');
  const campaignGoal = brief.campaign?.goal?.value || brief.campaign?.goal || '';

  const prompt = `You are a subject-matter expert writing for ${productName} â€” not a marketer, but a trusted authority with deep domain knowledge.

Write an EEAT-optimized blog article for ${persona} grounded in evidence, not marketing fluff.

${productContext}

Format: Long-form educational article (1,200-1,800 words)
Tone: Authoritative, evidence-driven, expert-level

STRUCTURE REQUIREMENTS â€” follow Problem â†’ Agitate â†’ Solution â†’ Proof â†’ Benefit â†’ CTA arc:
- Headline: Must follow one of these formats: "How to [Achieve X]" or "[Number] Ways to [Solve Y]" or "[Keyword]: [Benefit]". Max 60 chars.
- Meta Title: SEO-optimized, includes primary keyword "${keyword}". Max 60 chars.
- Meta Description: SEO-optimized with primary keyword, benefit, and clear value proposition. Max 160 chars.
- Introduction: Hook â†’ Name the pain point "${painPoint}" â†’ Agitate the frustration â†’ Preview the evidence-backed solution.
- Sections: 3-4 in-depth sections. Each with:
  - heading: H2 keyword-variant
  - body: 2-3 paragraphs. Every claim must trace to an evidence field. No invented data.
  - keyTakeaways: 2-3 actionable takeaways per section
- FAQ Section: 3-4 actual questions from evidence, schema-ready Q&A format. Not generic.
- Internal Links: Suggest 2-3 internal links to related product features with anchor text and URL.
- Conclusion: Summarize key points, reinforce value proposition, specific CTA.
- CTA: Action-oriented, specific to ${productName}. Not "Learn more".

${campaignGoal ? `Campaign Alignment: This article supports the goal "${campaignGoal}".` : ''}

BANNED: "studies show", "research indicates", any percentages or invented data, fake statistics, invented testimonials, superlatives ("best", "ultimate", "revolutionary"), generic advice.

EVIDENCE RULE: Every factual claim in the article must be traceable to a specific evidence field provided in the context. If evidence is insufficient, set claimsRequiringReview accordingly.

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.

Return valid JSON:
{
  "headline": "string â€” max 60 chars, one of the approved formats",
  "metaTitle": "string â€” max 60 chars, SEO-optimized",
  "metaDescription": "string â€” max 160 chars, includes keyword and benefit",
  "introduction": "string â€” Problem â†’ Agitate â†’ Solution arc",
  "sections": [{"heading": "string â€” H2 with keyword variant", "body": "string â€” 2-3 evidence-backed paragraphs", "keyTakeaways": ["2-3", "actionable", "takeaways"]}],
  "faqSection": [{"question": "string", "answer": "string"}],
  "internalLinks": [{"text": "string â€” anchor text", "url": "string â€” relative URL"}],
  "conclusion": "string â€” summarize, reinforce, CTA",
  "cta": "string â€” specific, action-oriented CTA",
  "targetKeywords": ["2-3", "target", "keywords"],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[Blog Agent] AI success', { hasHeadline: !!result.data.headline, sections: result.data.sections?.length, provider: result.provider });
      return { ...result.data, _provider: result.provider, _traceId: result.traceId };
    }
    console.warn('[Blog Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) {
    console.error('[Blog Agent] AI generation error:', e.message);
  }
  console.warn('[Blog Agent] AI generation failed — using evidence-based deterministic fallback');
  return generateBlogArticleFallback(brief, productName, persona, painPoint, keyword);
}

function generateBlogArticleFallback(brief, productName, persona, painPoint, keyword) {
  const fallbackEvidenceCheck = checkEvidenceSufficiency(brief);
  if (fallbackEvidenceCheck) {
    return { _insufficientEvidence: true, _message: fallbackEvidenceCheck, _provider: 'evidence_gate' };
  }
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    headline: `${productName}: Solving ${painPoint} for ${persona}`.slice(0, 60),
    metaTitle: `${productName}: ${painPoint} Solutions for ${persona}`.slice(0, 60),
    metaDescription: `Learn how ${productName} helps ${persona} address ${painPoint} with ${features[0] || 'core features'} and ${benefits[0] || 'key benefits'}.`,
    introduction: `${painPoint} is one of the most significant challenges ${persona} face today. It can impact productivity, increase costs, and add complexity. ${productName} is designed to address these issues directly. In this article, we explore how.`,
    sections: [
      {
        heading: `Understanding ${painPoint}`,
        body: `For ${persona}, ${painPoint} manifests in daily operations, creating friction and inefficiency. ${productName} was built with this specific challenge in mind, and its features are designed to address root causes rather than symptoms.`,
        keyTakeaways: [`${painPoint} can affect productivity and outcomes`, 'Traditional approaches may not fully address it', 'A targeted solution may be needed'],
      },
      {
        heading: `How ${productName} Addresses This Challenge`,
        body: `${productName} includes ${features[0] || 'core capabilities'} and ${features[1] || 'specialized workflows'} to help ${persona} address ${painPoint}. The platform is built around an interface designed for real-world use cases. ${features[2] ? 'With ' + features[2] + ', teams have additional options.' : ''}`,
        keyTakeaways: [`${features[0] || 'Core features'} are designed for this use case`, `${benefits[1] || 'Key benefits'} are delivered through the core product`, 'The platform adapts to your workflow'],
      },
      {
        heading: `Getting Started with ${productName}`,
        body: `Implementing ${productName} follows a standard setup process. The platform is designed to integrate with existing tools and workflows. Actual outcomes depend on implementation and how the platform is used.`,
        keyTakeaways: ['Setup follows standard onboarding steps', 'Designed to integrate with existing tools', 'Outcomes depend on implementation and usage'],
      },
    ],
    conclusion: `${painPoint} does not have to be an accepted part of your workflow. ${productName} provides tools designed to help ${persona} address this challenge. Explore how ${productName} can help your team.`,
    cta: `Discover how ${productName} can help your team`,
    targetKeywords: [keyword, productName.toLowerCase(), painPoint.toLowerCase()],
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    faqSection: [
      { question: `What is ${productName} and how does it help with ${painPoint}?`, answer: `${productName} provides ${persona} with tools designed to address ${painPoint}, including ${features[0] || 'core capabilities'} and ${features[1] || 'specialized workflows'}.` },
      { question: `How does ${productName} address ${painPoint} specifically?`, answer: `${productName} tackles ${painPoint} through ${features[0] || 'dedicated solutions'} and ${features[1] || 'specialized workflows'} designed for ${persona}.` },
      { question: `What results can ${persona} expect from ${productName}?`, answer: `Results depend on implementation and usage. ${productName} provides tools focused on ${benefits[0] || 'key outcomes'} and ${benefits[1] || 'operational efficiency'}, but outcomes vary by organization.` },
    ],
    internalLinks: [
      { text: `${features[0] || 'Core feature'} overview`, url: `/features/${(features[0] || 'core').toLowerCase().replace(/\s+/g, '-')}` },
      { text: `How ${productName} helps ${persona}`, url: `/solutions/${persona.toLowerCase().replace(/\s+/g, '-')}` },
      { text: `${productName} pricing and plans`, url: '/pricing' },
    ],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}

export async function generateFAQ(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const evidenceCheck = checkEvidenceSufficiency(brief, normalizedEvidence);
  if (evidenceCheck) {
    console.warn(`[FAQ Agent] Insufficient evidence: ${evidenceCheck}`);
    return { _insufficientEvidence: true, _message: evidenceCheck, _provider: 'evidence_gate' };
  }
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const keyword = getKeyword(brief, 0) || '';

  const prompt = `You are writing an SEO-optimized FAQ page for ${productName} with Schema.org/FAQPage markup.

${productContext}

Format: FAQ with Schema.org markup
Tone: Clear, concise, helpful, authoritative

STRATEGIC REQUIREMENTS:
- Headline: Include product name and primary keyword "${keyword}". Follow format: "Frequently Asked Questions About [Product Name] for [Persona]".
- MetaDescription: SEO meta with keyword and value proposition. Max 160 chars.
- Introduction: 1-2 sentences acknowledging that ${persona} often have questions about "${painPoint}" and how ${productName} addresses them.
- FAQs: 5-7 questions derived from evidence. NOT generic. First question MUST directly address the primary pain point "${painPoint}".
- Answer format: 2-4 sentences. First sentence directly answers. Second provides evidence/feature reference. Third adds specific benefit.
- People Also Ask: Include a "people also ask" section with 3-4 related questions.
- Schema: Output a schema field with basic FAQPage Schema.org markup (@type, mainEntity).
- CTA: Specific next-step CTA based on campaign goal.
${brief.campaign?.goal ? `- Campaign Goal reference: "${brief.campaign.goal}"` : ''}

EVIDENCE INTEGRITY: If evidence does not contain information about a specific feature or claim, do NOT invent it. Return {missingEvidence: true, message: 'Additional verified product information is required for [specific area]'}.
Do NOT invent: pricing questions not in evidence, fake stats, testimonials, questions unrelated to product capabilities.

Return valid JSON:
{
  "headline": "string â€” include product name and keyword",
  "metaDescription": "string â€” max 160 chars",
  "introduction": "string â€” 1-2 sentences",
  "faqs": [{"question": "string â€” real customer concern", "answer": "string â€” 2-4 sentences, evidence-backed"}],
  "relatedQuestions": ["3-4", "related", "question", "strings"],
  "cta": "string â€” specific CTA",
  "schema": {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "string", "acceptedAnswer": {"@type": "Answer", "text": "string"}}]},
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data && typeof result.data === 'object') {
      console.info('[FAQ Agent] AI success', { hasHeadline: !!result.data.headline, faqs: result.data.faqs?.length, provider: result.provider });
      return { ...result.data, _provider: result.provider, _traceId: result.traceId };
    }
    console.warn('[FAQ Agent] AI returned invalid data, using fallback', {
      success: result.success, dataType: typeof result.data, provider: result.provider, traceId: result.traceId
    });
  } catch (e) {
    console.error('[FAQ Agent] AI generation error:', e.message);
  }
  console.warn('[*Agent] AI generation failed — returning null (no fabricated fallback content)');
  return null;
}

function generateFAQFallback(brief, productName, persona, painPoint) {
  const fallbackEvidenceCheck = checkEvidenceSufficiency(brief);
  if (fallbackEvidenceCheck) {
    return { _insufficientEvidence: true, _message: fallbackEvidenceCheck, _provider: 'evidence_gate' };
  }
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    headline: `Frequently Asked Questions About ${productName}`,
    metaDescription: `Find answers to common questions about ${productName} â€” how it helps ${persona}, key features, implementation, and support.`,
    introduction: `Here are answers to the most common questions ${persona} ask about ${productName}. If you have additional questions, please reach out to our team.`,
    faqs: [
      {
        question: `What is ${productName} and how does it help ${persona} address ${painPoint}?`,
        answer: `${productName} is a solution designed for ${persona}. It targets challenges including ${painPoint} by providing ${features[0] || 'core capabilities'} and ${features[1] || 'supporting tools'}, with ${benefits[0] || 'practical outcomes'} as the intended result.`,
      },
      {
        question: `What are the key features of ${productName}?`,
        answer: `${productName} includes ${features.join(', ') || 'its core tools and capabilities'}, designed to help ${persona} make progress on their key challenges.`,
      },
      {
        question: `How does ${productName} compare to other solutions?`,
        answer: `${productName} is built for ${persona} with a focus on ${benefits[0] || 'practical, real-world outcomes'} and ${benefits[1] || 'clear workflows'}. How it compares to other options depends on your requirements, so it is worth evaluating each product directly.`,
      },
      {
        question: `What kind of support is available?`,
        answer: `Support details depend on your plan. Reach out to the team to confirm what is included for implementation, training, and ongoing use.`,
      },
    ],
    relatedQuestions: [
      `How does ${productName} integrate with existing tools?`,
      `Can ${productName} scale with my ${persona} team?`,
      `What makes ${productName} different from alternatives?`,
    ],
    cta: `Learn more about ${productName}`,
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    schema: {
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: `What is ${productName} and how does it help ${persona} address ${painPoint}?`, acceptedAnswer: { "@type": "Answer", text: `${productName} is a solution designed for ${persona}. It targets challenges including ${painPoint} by providing ${features[0] || 'core capabilities'} and ${features[1] || 'supporting tools'}.` } },
        { "@type": "Question", name: `What are the key features of ${productName}?`, acceptedAnswer: { "@type": "Answer", text: `${productName} includes ${features.join(', ') || 'its core tools and capabilities'}, designed to help ${persona} make progress on their key challenges.` } },
        { "@type": "Question", name: `How does ${productName} compare to other solutions?`, acceptedAnswer: { "@type": "Answer", text: `${productName} is built for ${persona} with a focus on ${benefits[0] || 'practical, real-world outcomes'} and ${benefits[1] || 'clear workflows'}. Evaluate each product against your own requirements.` } },
        { "@type": "Question", name: `What kind of support is available?`, acceptedAnswer: { "@type": "Answer", text: `Support details depend on your plan. Reach out to the team to confirm what is included.` } },
      ],
    },
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}
