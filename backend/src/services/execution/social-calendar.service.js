import { callAI } from "../../ai/services/aiRouter.service.js";

const CALENDAR_TYPES = {
  day_30: { label: '30-Day Calendar', days: 30 },
  weekly: { label: 'Weekly Calendar', days: 7 },
  platform_specific: { label: 'Platform-Specific Schedule', days: 30 },
};

export { CALENDAR_TYPES };

export async function generateSocialCalendar(calendarType, context) {
  const typeConfig = CALENDAR_TYPES[calendarType];
  if (!typeConfig) throw new Error(`Unknown calendar type: ${calendarType}`);

  const { productName, companyName, targetAudience, industry, platforms, productUsp, evidence } = context;
  const platformList = platforms || ['linkedin', 'instagram', 'twitter', 'facebook'];

  const evidenceLines = [];
  if (productUsp) evidenceLines.push(`Product USP: ${productUsp}`);
  if (evidence?.website?.featuresText?.length) evidenceLines.push(`Product Features: ${evidence.website.featuresText.slice(0, 5).join('; ')}`);
  if (evidence?.website?.heroText) evidenceLines.push(`Website Hero: ${evidence.website.heroText}`);
  if (evidence?.audience?.painPoints?.length) evidenceLines.push(`Audience Pain Points: ${evidence.audience.painPoints.slice(0, 3).join('; ')}`);
  if (evidence?.seo?.contentOpportunities?.length) evidenceLines.push(`SEO Content Topics: ${evidence.seo.contentOpportunities.slice(0, 5).map(o => o.opportunity).join('; ')}`);
  if (evidence?.sourceSummary?.sourcesCollected?.length) evidenceLines.push(`Evidence Sources: ${evidence.sourceSummary.sourcesCollected.join(', ')}`);

  const prompt = `Generate a ${typeConfig.label} (${typeConfig.days} days) social media content calendar. Use ONLY the verified product/company data below. Every post topic must reference actual product features, audience pain points, or evidence-backed content opportunities.

CONTEXT:
Product/Company: ${productName || 'N/A'}${companyName ? `\nCompany: ${companyName}` : ''}${targetAudience ? `\nTarget Audience: ${targetAudience}` : ''}${industry ? `\nIndustry: ${industry}` : ''}
Platforms: ${platformList.join(', ')}
${evidenceLines.join('\n')}

CALENDAR DURATION: ${typeConfig.label} (${typeConfig.days} days)

REQUIRED OUTPUT FIELDS (return valid JSON):
{
  "calendar": [
    {
      "day": 1,
      "date": "relative date (Day 1, Day 2, etc.)",
      "platform": "platform name",
      "contentType": "post / story / video / article",
      "topic": "Content topic based on actual product features or SEO opportunities",
      "caption": "Post caption referencing specific product value",
      "hashtags": ["tag1", "tag2", "tag3"],
      "bestPostingTime": "Recommended time",
      "contentTheme": "Theme category",
      "cta": "Call to action using actual product CTA if available",
      "visualNotes": "Visual direction for this post"
    }
  ],
  "weeklyTheme": ["Theme for week 1", "Theme for week 2"],
  "bestPostingTimes": {
    "linkedin": "best time",
    "instagram": "best time",
    "twitter": "best time",
    "facebook": "best time"
  },
  "hashtagStrategy": {
    "recommendedHashtags": ["tag1", "tag2"],
    "industryHashtags": ["tag1", "tag2"],
    "brandedHashtags": ["tag1"]
  },
  "contentMix": {
    "educational": "percentage",
    "promotional": "percentage",
    "engagement": "percentage",
    "behindTheScenes": "percentage"
  },
  "evidence": { "source": "social_calendar", "confidence": null, "dataSource": "ai_generation" }
}

RULES:
1. Generate ${typeConfig.days} entries, one per day, rotating through platforms.
2. Every topic must reference actual product features or evidence-backed content.
3. Best posting times should be platform-appropriate.
4. Hashtags must be relevant to the specific product/industry — not generic.
5. Content mix should be roughly 60% educational/value, 20% promotional, 20% engagement.
6. Do NOT invent fake engagement metrics.
7. Return ONLY valid JSON. No markdown code fences.`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) {
      return {
        ...result.data,
        _type: calendarType,
        _label: typeConfig.label,
        _days: typeConfig.days,
        _generatedAt: new Date().toISOString(),
        _provider: result.provider || 'ai',
      };
    }
  } catch (e) {
    console.warn(`[SocialCalendar] AI generation failed for ${calendarType}:`, e.message);
  }

  return null;
}

export async function generateSocialCalendarPlan(context) {
  const types = Object.keys(CALENDAR_TYPES);
  const results = {};
  for (const type of types) {
    const cal = await generateSocialCalendar(type, context);
    if (cal) results[type] = cal;
  }
  return {
    calendars: results,
    totalGenerated: Object.keys(results).length,
    _metadata: {
      evidenceVersion: '2.0.0',
      generatedAt: new Date().toISOString(),
      typesGenerated: Object.keys(results),
      provider: 'social_calendar',
    },
  };
}
