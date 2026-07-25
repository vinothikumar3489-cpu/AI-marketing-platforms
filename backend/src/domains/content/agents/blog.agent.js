import { callAI } from "../../../domains/ai/services/aiOrchestrator.service.js";
import { buildProductEvidenceContext, getProductName, getPersonaName, getFirstPainPoint, getKeyword, getEvidenceForTrend, buildFallbackFeatures, buildFallbackBenefits, buildFallbackEvidenceFields } from "./agent.utils.js";

export async function generateBlogArticle(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
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
  return generateBlogArticleFallback(brief, productName, persona, painPoint, keyword);
}

function generateBlogArticleFallback(brief, productName, persona, painPoint, keyword) {
  const features = buildFallbackFeatures(brief);
  const benefits = buildFallbackBenefits(brief);
  return {
    headline: `${productName}: Solving ${painPoint} for ${persona}`.slice(0, 70),
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
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}

export async function generateFAQ(brief, aiFunction = callAI, normalizedEvidence) {
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

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
        question: `What is ${productName} and how does it help ${persona}?`,
        answer: `${productName} is a solution designed specifically for ${persona}. It addresses key challenges by providing ${features[0] || 'core capabilities'} and ${features[1] || 'advanced tools'}, enabling teams to achieve ${benefits[0] || 'better outcomes'} more efficiently.`,
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
    cta: `Learn more about ${productName}`,
    evidenceUsed: buildFallbackEvidenceFields(brief),
    claimsRequiringReview: [],
    _provider: 'fallback',
    _fallbackUsed: true,
  };
}
