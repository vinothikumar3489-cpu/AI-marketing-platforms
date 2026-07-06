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

  const { productName, companyName, targetAudience, industry, productUsp } = context;

  const prompt = `Generate a ${typeConfig.label} (${typeConfig.duration}) video script for marketing execution.

CONTEXT:
Product/Company: ${productName || 'N/A'}${companyName ? `\nCompany: ${companyName}` : ''}${targetAudience ? `\nTarget Audience: ${targetAudience}` : ''}${industry ? `\nIndustry: ${industry}` : ''}${productUsp ? `\nProduct USP: ${productUsp}` : ''}

VIDEO TYPE: ${typeConfig.label}
DURATION: ${typeConfig.duration}

REQUIRED OUTPUT FIELDS (return valid JSON):
{
  "title": "Video title",
  "hook": "Opening hook (first 3 seconds)",
  "script": "Full script with timing cues",
  "storyboard": [
    {
      "scene": 1,
      "duration": "time in seconds",
      "visual": "Visual description",
      "audio": "Voiceover / sound description",
      "camera": "Camera direction (close-up, wide shot, etc.)",
      "transitions": "Transition to next scene"
    }
  ],
  "scenes": "Array of scene objects with descriptions",
  "voiceover": "Voiceover direction (tone, speed, style)",
  "camera": "Overall camera direction",
  "music": "Music style and mood recommendations",
  "transitions": "Transition style between scenes",
  "cta": "Call to action text and visual",
  "duration": "${typeConfig.duration}",
  "format": "Aspect ratio and format recommendation",
  "evidence": { "source": "video_studio", "confidence": 85, "dataSource": "ai_generation" }
}

RULES:
1. Hook must capture attention in first 3 seconds.
2. Script must fit within ${typeConfig.duration}.
3. Storyboard scenes must be specific and producible.
4. Do NOT invent fake statistics or testimonials.
5. Use "Based on analysis" for claims without verified data.
6. Return ONLY valid JSON. No markdown code fences.`;

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
