import { callAI } from "../../ai/services/aiRouter.service.js";

const CREATIVE_TYPES = {
  poster_brief: { label: 'Poster Brief', dimensions: 'Various' },
  banner_brief: { label: 'Banner Brief', dimensions: '728x90, 300x250, 336x280' },
  carousel_brief: { label: 'Carousel Brief', dimensions: '1080x1080 per slide' },
  instagram_post: { label: 'Instagram Post', dimensions: '1080x1080' },
  linkedin_graphic: { label: 'LinkedIn Graphic', dimensions: '1200x627' },
  facebook_creative: { label: 'Facebook Creative', dimensions: '1200x628' },
  display_ad: { label: 'Display Ad', dimensions: '300x250, 728x90, 160x600' },
  youtube_thumbnail: { label: 'YouTube Thumbnail', dimensions: '1280x720' },
};

export { CREATIVE_TYPES };

export async function generateCreativeBrief(creativeType, context) {
  const typeConfig = CREATIVE_TYPES[creativeType];
  if (!typeConfig) throw new Error(`Unknown creative type: ${creativeType}`);

  const { productName, companyName, targetAudience, industry, brandColors, campaignGoal, productUsp, evidence } = context;

  const evidenceLines = [];
  if (productUsp) evidenceLines.push(`Product USP: ${productUsp}`);
  if (evidence?.website?.heroText) evidenceLines.push(`Website Hero: ${evidence.website.heroText}`);
  if (evidence?.website?.ctaTexts?.length) evidenceLines.push(`Website CTAs: ${evidence.website.ctaTexts.join('; ')}`);
  if (evidence?.website?.featuresText?.length) evidenceLines.push(`Features Mentioned: ${evidence.website.featuresText.slice(0, 3).join('; ')}`);
  if (evidence?.audience?.painPoints?.length) evidenceLines.push(`Audience Pain Points: ${evidence.audience.painPoints.slice(0, 3).join('; ')}`);
  if (evidence?.competitors?.list?.length) evidenceLines.push(`Competitors: ${evidence.competitors.list.slice(0, 3).map(c => c.name || c.url).filter(Boolean).join(', ')}`);
  if (evidence?.sourceSummary?.sourcesCollected?.length) evidenceLines.push(`Evidence Sources: ${evidence.sourceSummary.sourcesCollected.join(', ')}`);

  const prompt = `Generate a creative brief for a ${typeConfig.label} (${typeConfig.dimensions}) for marketing execution. Use the verified product/company data below. CRITICAL: Visual direction must reference actual product features and audience pain points. No fake text or placeholder slogans — use readable English only.

CONTEXT:
Product/Company: ${productName || 'N/A'}${companyName ? `\nCompany: ${companyName}` : ''}${targetAudience ? `\nTarget Audience: ${targetAudience}` : ''}${industry ? `\nIndustry: ${industry}` : ''}${brandColors ? `\nBrand Colors: ${brandColors}` : ''}${campaignGoal ? `\nCampaign Goal: ${campaignGoal}` : ''}
${evidenceLines.join('\n')}

CREATIVE TYPE: ${typeConfig.label}
DIMENSIONS: ${typeConfig.dimensions}

REQUIRED OUTPUT FIELDS (return valid JSON):
{
  "headline": "Primary headline based on actual product USP or feature (no placeholder text)",
  "visualDirection": "Visual direction referencing actual product/audience/industry",
  "brandColors": ["color1", "color2", "color3"],
  "typography": "Font recommendations",
  "layout": "Layout description (e.g., 'image left, text right')",
  "imageSuggestions": "Description of imagery referencing actual product use case",
  "imageGenerationPrompt": "Detailed prompt for AI image generation tools including product details",
  "cta": "Call to action using actual product CTA if available",
  "dimensions": "width x height in pixels",
  "format": "File format recommendation (PNG, JPG, etc.)",
  "additionalNotes": "Any additional design notes referencing evidence",
  "evidence": { "source": "creative_studio", "confidence": null, "dataSource": "ai_generation" }
}

RULES:
1. Be specific about visual style, mood, and composition based on actual product/audience.
2. Image generation prompt must include product name and audience details.
3. No fake text, no placeholder slogans — use readable English only.
4. CTA must be specific to the product (not generic).
5. Return ONLY valid JSON. No markdown code fences.`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) {
      return {
        ...result.data,
        _type: creativeType,
        _label: typeConfig.label,
        _dimensions: typeConfig.dimensions,
        _generatedAt: new Date().toISOString(),
        _provider: result.provider || 'ai',
      };
    }
  } catch (e) {
    console.warn(`[CreativeStudio] AI generation failed for ${creativeType}:`, e.message);
  }

  return null;
}

export async function generateCreativeStudioPlan(context) {
  const types = Object.keys(CREATIVE_TYPES);
  const results = {};
  for (const type of types) {
    const brief = await generateCreativeBrief(type, context);
    if (brief) results[type] = brief;
  }
  return {
    briefs: results,
    totalGenerated: Object.keys(results).length,
    _metadata: {
      evidenceVersion: '2.0.0',
      generatedAt: new Date().toISOString(),
      typesGenerated: Object.keys(results),
      provider: 'creative_studio',
    },
  };
}
