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

  const { productName, companyName, targetAudience, industry, brandColors, campaignGoal } = context;

  const prompt = `Generate a creative brief for a ${typeConfig.label} (${typeConfig.dimensions}) for marketing execution.

CONTEXT:
Product/Company: ${productName || 'N/A'}${companyName ? `\nCompany: ${companyName}` : ''}${targetAudience ? `\nTarget Audience: ${targetAudience}` : ''}${industry ? `\nIndustry: ${industry}` : ''}${brandColors ? `\nBrand Colors: ${brandColors}` : ''}${campaignGoal ? `\nCampaign Goal: ${campaignGoal}` : ''}

CREATIVE TYPE: ${typeConfig.label}
DIMENSIONS: ${typeConfig.dimensions}

REQUIRED OUTPUT FIELDS (return valid JSON):
{
  "headline": "Primary headline for the creative",
  "visualDirection": "Detailed visual direction description",
  "brandColors": ["color1", "color2", "color3"],
  "typography": "Font recommendations",
  "layout": "Layout description (e.g., 'image left, text right')",
  "imageSuggestions": "Description of imagery needed",
  "imageGenerationPrompt": "Detailed prompt for AI image generation tools (Midjourney, DALL-E, etc.)",
  "cta": "Call to action text",
  "dimensions": "width x height in pixels",
  "format": "File format recommendation (PNG, JPG, etc.)",
  "additionalNotes": "Any additional design notes",
  "evidence": { "source": "creative_studio", "confidence": 85, "dataSource": "ai_generation" }
}

RULES:
1. Be specific about visual style, mood, and composition.
2. Image generation prompt must be detailed enough for Midjourney/DALL-E.
3. Brand colors should be specific hex codes if not provided.
4. Return ONLY valid JSON. No markdown code fences.`;

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
