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

  const { productName, companyName, targetAudience, industry, seoKeywords, tone, productUsp, seoData, growthData, campaignGoal, platforms } = context;
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

  const prompt = `Generate a complete ${typeConfig.label} for marketing execution. Use the verified company/product data below.

COMPANY/PRODUCT DATA:
${evidenceSections.join('\n')}

TONE: ${toneGuide}

REQUIRED OUTPUT FIELDS:
${typeConfig.outputFields.map(f => `- ${f}`).join('\n')}

EVIDENCE REQUIREMENTS:
- For any factual claim, include evidence: { source, confidence, dataSource }
- Internal links must be contextual and natural
- Schema suggestions must be valid JSON-LD types
- CTA must be specific and actionable
- Meta description must be under 160 characters
- SEO keywords must be comma-separated, max 10

Return valid JSON with all required fields. Do NOT invent fake statistics, testimonials, or case study numbers. If data is unavailable, use "Data unavailable" or leave null. Never use placeholder text like "To be determined".`;

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
