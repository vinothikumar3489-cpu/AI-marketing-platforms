import { callAI } from "../../ai/services/aiRouter.service.js";

const VIDEO_TYPES = {
  ad_30s: { label: '30 Second Ad', duration: '30s' },
  ad_60s: { label: '60 Second Ad', duration: '60s' },
  ad_90s: { label: '90 Second Ad', duration: '90s' },
  youtube_ad: { label: 'YouTube Ad', duration: '15-60s' },
  linkedin_ad: { label: 'LinkedIn Ad', duration: '15-30s' },
  instagram_reel: { label: 'Instagram Reel', duration: '15-90s' },
  tiktok: { label: 'TikTok Video', duration: '15-60s' },
  explainer_video: { label: 'Explainer Video', duration: '60-120s' },
};

export { VIDEO_TYPES };

export async function generateVideoScript(videoType, context) {
  const typeConfig = VIDEO_TYPES[videoType];
  if (!typeConfig) throw new Error(`Unknown video type: ${videoType}`);

  const { productName, companyName, targetAudience, industry, productUsp, evidence } = context;

  const evidenceLines = [];
  if (productUsp) evidenceLines.push(`Product USP: ${productUsp}`);
  if (evidence?.website?.heroText) evidenceLines.push(`Website Hero: ${evidence.website.heroText}`);
  if (evidence?.website?.featuresText?.length) evidenceLines.push(`Product Features from Website: ${evidence.website.featuresText.slice(0, 5).join('; ')}`);
  if (evidence?.website?.ctaTexts?.length) evidenceLines.push(`Product CTAs: ${evidence.website.ctaTexts.join('; ')}`);
  if (evidence?.audience?.painPoints?.length) evidenceLines.push(`Audience Pain Points: ${evidence.audience.painPoints.slice(0, 3).join('; ')}`);
  if (evidence?.competitors?.weaknesses?.length) evidenceLines.push(`Competitor Weaknesses: ${evidence.competitors.weaknesses.slice(0, 3).join('; ')}`);
  if (evidence?.sourceSummary?.sourcesCollected?.length) evidenceLines.push(`Evidence Sources: ${evidence.sourceSummary.sourcesCollected.join(', ')}`);

  const prompt = `Generate a ${typeConfig.label} (${typeConfig.duration}) video script for marketing execution. Use the verified company/product data below. CRITICAL: Every storyboard scene must reference actual product features, audience problems, and evidence-backed benefits. No generic filler scenes.

CONTEXT:
Product/Company: ${productName || 'N/A'}${companyName ? `\nCompany: ${companyName}` : ''}${targetAudience ? `\nTarget Audience: ${targetAudience}` : ''}${industry ? `\nIndustry: ${industry}` : ''}
${evidenceLines.join('\n')}

VIDEO TYPE: ${typeConfig.label}
DURATION: ${typeConfig.duration}

REQUIRED OUTPUT FIELDS (return valid JSON):
{
  "title": "Video title including product name",
  "hook": "Opening hook (first 3 seconds) referencing audience problem",
  "script": "Full script with timing cues, product-specific solution scenes",
  "storyboard": [
    {
      "scene": 1,
      "duration": "time in seconds",
      "visual": "Visual description showing audience problem or product use case",
      "audio": "Voiceover / sound description referencing evidence-backed benefit",
      "camera": "Camera direction (close-up, wide shot, etc.)",
      "transitions": "Transition to next scene"
    }
  ],
  "scenes": "Array of scene objects with descriptions, all product-specific",
  "voiceover": "Voiceover direction (tone, speed, style)",
  "camera": "Overall camera direction",
  "music": "Music style and mood recommendations",
  "transitions": "Transition style between scenes",
  "cta": "Call to action text and visual using actual product CTA",
  "duration": "${typeConfig.duration}",
  "format": "Aspect ratio and format recommendation",
  "evidence": { "source": "video_studio", "confidence": null, "dataSource": "ai_generation" }
}

RULES:
1. Hook must capture attention in first 3 seconds referencing audience problem.
2. Script must fit within ${typeConfig.duration}.
3. Every storyboard scene must be product-specific — no generic filler scenes.
4. Do NOT invent fake statistics or testimonials.
5. Use "Based on analysis" for claims without verified data.
6. CTA must be specific to the product.
7. Return ONLY valid JSON. No markdown code fences.`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) {
      return {
        ...result.data,
        _type: videoType,
        _label: typeConfig.label,
        _duration: typeConfig.duration,
        _generatedAt: new Date().toISOString(),
        _provider: result.provider || 'ai',
      };
    }
  } catch (e) {
    console.warn(`[VideoStudio] AI generation failed for ${videoType}:`, e.message);
  }

  return null;
}

export async function generateVideoStudioPlan(context) {
  const types = Object.keys(VIDEO_TYPES);
  const results = {};
  for (const type of types) {
    const script = await generateVideoScript(type, context);
    if (script) results[type] = script;
  }
  return {
    scripts: results,
    totalGenerated: Object.keys(results).length,
    _metadata: {
      evidenceVersion: '2.0.0',
      generatedAt: new Date().toISOString(),
      typesGenerated: Object.keys(results),
      provider: 'video_studio',
    },
  };
}
