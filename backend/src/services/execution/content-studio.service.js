import { callAI } from "../../ai/services/aiRouter.service.js";

const CONTENT_TYPES = {
  blog_article: { label: 'Blog Article', outputFields: ['title', 'metaDescription', 'seoKeywords', 'outline', 'fullContent', 'internalLinks', 'cta', 'schemaSuggestions', 'estimatedReadTime', 'wordCount'] },
  landing_page: { label: 'Landing Page', outputFields: ['title', 'metaDescription', 'seoKeywords', 'outline', 'headline', 'subHeadline', 'keySections', 'fullContent', 'internalLinks', 'cta', 'schemaSuggestions', 'trustElements'] },
  case_study: { label: 'Case Study', outputFields: ['title', 'metaDescription', 'seoKeywords', 'outline', 'fullContent', 'challenge', 'solution', 'results', 'testimonial', 'cta'] },
  product_page: { label: 'Product Page', outputFields: ['title', 'metaDescription', 'seoKeywords', 'outline', 'fullContent', 'features', 'benefits', 'pricingContext', 'faq', 'cta', 'schemaSuggestions'] },
  feature_announcement: { label: 'Feature Announcement', outputFields: ['title', 'metaDescription', 'seoKeywords', 'outline', 'fullContent', 'featureDescription', 'benefits', 'availability', 'cta'] },
  newsletter: { label: 'Newsletter', outputFields: ['title', 'previewText', 'seoKeywords', 'outline', 'fullContent', 'sections', 'cta', 'unsubscribeNote'] },
  press_release: { label: 'Press Release', outputFields: ['title', 'metaDescription', 'seoKeywords', 'outline', 'fullContent', 'dateline', 'boilerplate', 'mediaContact', 'cta'] },
  faq_page: { label: 'FAQ Page', outputFields: ['title', 'metaDescription', 'seoKeywords', 'outline', 'fullContent', 'faqItems', 'schemaSuggestions'] },
  comparison_page: { label: 'Comparison Page', outputFields: ['title', 'metaDescription', 'seoKeywords', 'outline', 'fullContent', 'comparisonPoints', 'prosAndCons', 'recommendation', 'cta', 'schemaSuggestions'] },
  whitepaper: { label: 'Whitepaper', outputFields: ['title', 'metaDescription', 'seoKeywords', 'outline', 'executiveSummary', 'fullContent', 'sections', 'researchMethodology', 'keyFindings', 'conclusion', 'references', 'cta'] },
  linkedin_article: { label: 'LinkedIn Article', outputFields: ['title', 'metaDescription', 'seoKeywords', 'outline', 'fullContent', 'engagementPrompt', 'cta'] },
};

export { CONTENT_TYPES };

export async function generateContent(assetType, context) {
  const typeConfig = CONTENT_TYPES[assetType];
  if (!typeConfig) throw new Error(`Unknown content type: ${assetType}`);

  const { productName, companyName, targetAudience, industry, seoKeywords, tone, productUsp, seoData, growthData, campaignGoal, platforms, evidence } = context;
  const toneGuide = tone || 'professional';

  const evidenceSections = [];
  evidenceSections.push(`Product/Company: ${productName || 'N/A'}`);
  if (companyName) evidenceSections.push(`Company: ${companyName}`);
  if (targetAudience) evidenceSections.push(`Target Audience: ${targetAudience}`);
  if (industry) evidenceSections.push(`Industry: ${industry}`);
  if (productUsp) evidenceSections.push(`Unique Value Proposition: ${productUsp}`);
  if (campaignGoal) evidenceSections.push(`Campaign Goal: ${campaignGoal}`);
  if (seoData) evidenceSections.push(`SEO Evidence: ${seoData}`);
  if (growthData) evidenceSections.push(`Growth Data: ${growthData}`);
  if (seoKeywords) evidenceSections.push(`SEO Keywords: ${Array.isArray(seoKeywords) ? seoKeywords.slice(0, 10).join(', ') : seoKeywords}`);
  if (platforms && platforms.length > 0) evidenceSections.push(`Marketing Platforms: ${platforms.join(', ')}`);

  // Evidence context from EvidenceSnapshot
  if (evidence?.website) {
    const w = evidence.website;
    if (w.heroText) evidenceSections.push(`Website Hero: ${w.heroText}`);
    if (w.ctaTexts?.length) evidenceSections.push(`Website CTAs: ${w.ctaTexts.join('; ')}`);
    if (w.featuresText?.length) evidenceSections.push(`Website Features Mentioned: ${w.featuresText.slice(0, 5).join('; ')}`);
    if (w.technologyHints?.length) evidenceSections.push(`Detected Technologies: ${w.technologyHints.join(', ')}`);
    if (w.metaDescription) evidenceSections.push(`Meta Description: ${w.metaDescription}`);
  }
  if (evidence?.audience?.painPoints?.length) {
    evidenceSections.push(`Audience Pain Points: ${evidence.audience.painPoints.slice(0, 5).join('; ')}`);
  }
  if (evidence?.audience?.personas?.length) {
    evidenceSections.push(`Buyer Personas: ${evidence.audience.personas.slice(0, 3).map(p => p.name || p.title).filter(Boolean).join('; ')}`);
  }
  if (evidence?.seo?.contentOpportunities?.length) {
    evidenceSections.push(`SEO Content Opportunities: ${evidence.seo.contentOpportunities.slice(0, 5).map(o => o.opportunity).join('; ')}`);
  }
  if (evidence?.competitors?.list?.length) {
    evidenceSections.push(`Competitors: ${evidence.competitors.list.slice(0, 5).map(c => c.name || c.url).filter(Boolean).join(', ')}`);
  }
  if (evidence?.sourceSummary) {
    evidenceSections.push(`Evidence Sources: ${evidence.sourceSummary.sourcesCollected?.join(', ') || 'None'}`);
  }

  const prompt = `Generate a complete ${typeConfig.label} for marketing execution. Use the verified company/product data below. CRITICAL: Every claim about the product, company, audience, or market must reference the evidence provided. Do NOT invent statistics, testimonials, or case study numbers.

COMPANY/PRODUCT DATA:
${evidenceSections.join('\n')}

TONE: ${toneGuide}

REQUIRED OUTPUT FIELDS:
${typeConfig.outputFields.map(f => `- ${f}`).join('\n')}

EVIDENCE REQUIREMENTS:
- For any factual claim, include evidence: { source, confidence, dataSource }
- CTA must use actual product CTAs if available, otherwise be specific
- Meta description must be under 160 characters
- SEO keywords must be comma-separated, max 10
- If no product USPs or features available, set them to null

Return valid JSON with all required fields. Do NOT invent fake data. If data is unavailable, use "Data unavailable" or leave null. Never use placeholder text like "To be determined".`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) {
      return {
        ...result.data,
        _type: assetType,
        _label: typeConfig.label,
        _generatedAt: new Date().toISOString(),
        _provider: result.provider || 'ai',
        _evidence: { source: 'content_studio_ai', confidence: null, dataSource: 'ai_generation' },
      };
    }
  } catch (e) {
    console.warn(`[ContentStudio] AI generation failed for ${assetType}:`, e.message);
  }

  return null;
}

export async function generateContentStudioPlan(context) {
  const types = Object.keys(CONTENT_TYPES);
  const results = {};
  for (const type of types) {
    const content = await generateContent(type, context);
    if (content) results[type] = content;
  }
  return {
    assets: results,
    totalGenerated: Object.keys(results).length,
    _metadata: {
      evidenceVersion: '2.0.0',
      generatedAt: new Date().toISOString(),
      typesGenerated: Object.keys(results),
      provider: 'content_studio',
    },
  };
}
