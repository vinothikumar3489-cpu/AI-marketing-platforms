import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getKeyword, getEvidenceForTrend, buildFallbackFeatures, buildFallbackBenefits, buildFallbackEvidenceFields } from "./agent.utils.js";

export async function generateBlogArticle(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const keyword = getKeyword(brief, 0) || painPoint.toLowerCase().replace(/\s+/g, '-');
  const campaignGoal = brief.campaign?.goal?.value || brief.campaign?.goal || '';

  const prompt = `You are a subject-matter expert writing for ${productName} — not a marketer, but a trusted authority with deep domain knowledge.

Write an EEAT-optimized blog article for ${persona} grounded in evidence, not marketing fluff.

${productContext}

Format: Long-form educational article (1,200-1,800 words)
Tone: Authoritative, evidence-driven, expert-level

STRUCTURE REQUIREMENTS — follow Problem → Agitate → Solution → Proof → Benefit → CTA arc:
- Headline: Must follow one of these formats: "How to [Achieve X]" or "[Number] Ways to [Solve Y]" or "[Keyword]: [Benefit]". Max 60 chars.
- Meta Title: SEO-optimized, includes primary keyword "${keyword}". Max 60 chars.
- Meta Description: SEO-optimized with primary keyword, benefit, and clear value proposition. Max 160 chars.
- Introduction: Hook → Name the pain point "${painPoint}" → Agitate the frustration → Preview the evidence-backed solution.
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

Return valid JSON:
{
  "headline": "string — max 60 chars, one of the approved formats",
  "metaTitle": "string — max 60 chars, SEO-optimized",
  "metaDescription": "string — max 160 chars, includes keyword and benefit",
  "introduction": "string — Problem → Agitate → Solution arc",
  "sections": [{"heading": "string — H2 with keyword variant", "body": "string — 2-3 evidence-backed paragraphs", "keyTakeaways": ["2-3", "actionable", "takeaways"]}],
  "faqSection": [{"question": "string", "answer": "string"}],
  "internalLinks": [{"text": "string — anchor text", "url": "string — relative URL"}],
  "conclusion": "string — summarize, reinforce, CTA",
  "cta": "string — specific, action-oriented CTA",
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
  return generateBlogArticleFallback(brief, productName, persona, painPoint, keyword);
}

function generateBlogArticleFallback(brief, productName, persona, painPoint, keyword) {
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    headline: `${productName}: Solving ${painPoint} for ${persona}`.slice(0, 60),
    metaTitle: `${productName}: ${painPoint} Solutions for ${persona}`.slice(0, 60),
    metaDescription: `Learn how ${productName} helps ${persona} overcome ${painPoint} with ${features[0] || 'innovative features'} and ${benefits[0] || 'proven benefits'}.`,
    introduction: `${painPoint} is one of the most significant challenges ${persona} face today. It impacts productivity, increases costs, and creates unnecessary complexity. ${productName} offers a practical, effective solution that addresses these issues at their core. In this article, we explore how.`,
    sections: [
      {
        heading: `Understanding ${painPoint}`,
        body: `For ${persona}, ${painPoint} manifests in daily operations, creating friction and inefficiency. ${productName} was designed with this specific challenge in mind. By analyzing common pain points across the industry, the ${productName} team developed targeted solutions that address root causes rather than symptoms.`,
        keyTakeaways: [`${painPoint} affects productivity and outcomes`, 'Traditional approaches often fall short', 'A targeted solution is needed'],
      },
      {
        heading: `How ${productName} Addresses This Challenge`,
        body: `${productName} leverages ${features[0] || 'advanced technology'} and ${features[1] || 'industry best practices'} to provide ${persona} with the tools they need. The platform delivers ${benefits[0] || 'measurable results'} through an intuitive interface designed for real-world use cases. ${features[2] ? 'With ' + features[2] + ', teams can achieve even more.' : ''}`,
        keyTakeaways: [`${features[0] || 'Core features'} drive meaningful outcomes`, `${benefits[1] || 'Key benefits'} are delivered consistently`, 'The platform adapts to your workflow'],
      },
      {
        heading: `Getting Started with ${productName}`,
        body: `Implementing ${productName} is straightforward. The platform integrates seamlessly with existing tools and workflows, minimizing disruption while maximizing impact. ${persona} who have adopted ${productName} report significant improvements in ${benefits[0] || 'outcomes'} and overall satisfaction.`,
        keyTakeaways: ['Quick implementation with minimal disruption', 'Seamless integration with existing tools', 'Immediate improvements in key metrics'],
      },
    ],
    conclusion: `${painPoint} does not have to be an accepted part of your workflow. ${productName} provides the tools and capabilities ${persona} need to overcome this challenge and achieve better outcomes. Explore how ${productName} can transform your approach today.`,
    cta: `Discover how ${productName} can help your team`,
    targetKeywords: [keyword, productName.toLowerCase(), painPoint.toLowerCase()],
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    faqSection: [
      { question: `What is ${productName} and how does it help with ${painPoint}?`, answer: `${productName} provides ${persona} with targeted tools to address ${painPoint}, including ${features[0] || 'core capabilities'} and ${features[1] || 'advanced features'}.` },
      { question: `How does ${productName} address ${painPoint} specifically?`, answer: `${productName} tackles ${painPoint} through ${features[0] || 'dedicated solutions'} and ${features[1] || 'specialized workflows'} designed for ${persona}.` },
      { question: `What results can ${persona} expect from ${productName}?`, answer: `${persona} using ${productName} typically see improvements in ${benefits[0] || 'key outcomes'} and ${benefits[1] || 'operational efficiency'} through the platform's evidence-based approach.` },
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

Do NOT invent: pricing questions not in evidence, fake stats, testimonials, questions unrelated to product capabilities.

Return valid JSON:
{
  "headline": "string — include product name and keyword",
  "metaDescription": "string — max 160 chars",
  "introduction": "string — 1-2 sentences",
  "faqs": [{"question": "string — real customer concern", "answer": "string — 2-4 sentences, evidence-backed"}],
  "relatedQuestions": ["3-4", "related", "question", "strings"],
  "cta": "string — specific CTA",
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
  return generateFAQFallback(brief, productName, persona, painPoint);
}

function generateFAQFallback(brief, productName, persona, painPoint) {
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    headline: `Frequently Asked Questions About ${productName}`,
    metaDescription: `Find answers to common questions about ${productName} — how it helps ${persona}, key features, implementation, and support.`,
    introduction: `Here are answers to the most common questions ${persona} ask about ${productName}. If you have additional questions, please reach out to our team.`,
    faqs: [
      {
        question: `What is ${productName} and how does it help ${persona} address ${painPoint}?`,
        answer: `${productName} is a solution designed specifically for ${persona}. It addresses key challenges including ${painPoint} by providing ${features[0] || 'core capabilities'} and ${features[1] || 'advanced tools'}, enabling teams to achieve ${benefits[0] || 'better outcomes'} more efficiently.`,
      },
      {
        question: `What are the key features of ${productName}?`,
        answer: `${productName} includes ${features.join(', ') || 'a comprehensive set of tools and capabilities'} designed to help ${persona} overcome their most pressing challenges and achieve measurable results.`,
      },
      {
        question: `How does ${productName} compare to other solutions?`,
        answer: `${productName} is built specifically for ${persona} with a focus on ${benefits[0] || 'practical, real-world outcomes'}. Unlike generic alternatives, ${productName} addresses the specific nuances of ${painPoint || 'industry-specific challenges'} with targeted solutions.`,
      },
      {
        question: `What kind of support is available?`,
        answer: `${productName} offers comprehensive support to ensure ${persona} get the most out of the platform. Our team is available to assist with implementation, training, and ongoing optimization.`,
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
        { "@type": "Question", name: `What is ${productName} and how does it help ${persona} address ${painPoint}?`, acceptedAnswer: { "@type": "Answer", text: `${productName} is a solution designed specifically for ${persona}. It addresses key challenges including ${painPoint} by providing ${features[0] || 'core capabilities'} and ${features[1] || 'advanced tools'}.` } },
        { "@type": "Question", name: `What are the key features of ${productName}?`, acceptedAnswer: { "@type": "Answer", text: `${productName} includes ${features.join(', ') || 'a comprehensive set of tools and capabilities'} designed to help ${persona} overcome their most pressing challenges.` } },
        { "@type": "Question", name: `How does ${productName} compare to other solutions?`, acceptedAnswer: { "@type": "Answer", text: `${productName} is built specifically for ${persona} with a focus on ${benefits[0] || 'practical, real-world outcomes'}, addressing the specific nuances of ${painPoint || 'industry-specific challenges'}.` } },
        { "@type": "Question", name: `What kind of support is available?`, acceptedAnswer: { "@type": "Answer", text: `${productName} offers comprehensive support to ensure ${persona} get the most out of the platform, including implementation, training, and ongoing optimization.` } },
      ],
    },
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}
