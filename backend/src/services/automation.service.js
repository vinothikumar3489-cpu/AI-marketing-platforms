import { callAI } from "../ai/services/aiRouter.service.js";

/**
 * Generate automation plan with AI or fallback to intelligent defaults
 */
export async function generateAutomationPlanWithAI(context) {
  const {
    productIntelligence,
    competitorIntelligence,
    campaignIntelligence,
    seoIntelligence,
    chatTitle,
    productName,
  } = context;

  // Extract key data
  const productData = productIntelligence?.inputJson || {};
  const productAnalysis = productIntelligence?.productAnalysis || {};
  const audienceData = productIntelligence?.audienceIntelligence || {};
  const campaignData = campaignIntelligence?.campaignGenerator || {};
  const channelData = campaignIntelligence?.channelRecommendation || {};

  // Determine product info
  const product = productName || productData.productName || chatTitle || "Your Product";
  const targetAudience = productData.targetAudience || audienceData.primaryAudience || "professionals and businesses";
  const industry = productData.industry || "technology";
  const website = productData.websiteUrl || "";

  // Determine best channels
  let channels = [];
  if (channelData.recommendedChannels && Array.isArray(channelData.recommendedChannels)) {
    channels = channelData.recommendedChannels.slice(0, 3).map(ch => ({
      channel: ch.channel || ch.name || "LinkedIn",
      priority: ch.priority || "high",
      reason: ch.reason || "Best for your audience",
    }));
  } else if (channelData.primaryChannel) {
    channels = [{ channel: channelData.primaryChannel, priority: "high", reason: "Primary channel" }];
  } else {
    // Default channels
    channels = [
      { channel: "LinkedIn", priority: "high", reason: "Professional B2B audience" },
      { channel: "Instagram", priority: "medium", reason: "Visual content engagement" },
      { channel: "Email", priority: "high", reason: "Direct communication" },
    ];
  }

  // Extract SEO Intelligence data
  const seoScore = seoIntelligence?.seoScore ?? null;
  const seoKeywords = seoIntelligence?.keywordOpportunities ?? null;
  const seoContentGaps = seoIntelligence?.contentGaps ?? null;
  const seoBlogIdeas = seoIntelligence?.blogIdeas ?? null;
  const seoCompetitorKeywords = seoIntelligence?.competitorKeywords ?? null;
  const seoTechnicalAudit = seoIntelligence?.technicalAudit ?? null;
  const seoActionPlan = seoIntelligence?.actionPlan ?? null;
  const seoScoreBreakdown = seoIntelligence?.scoreBreakdown ?? null;

  // Try AI generation first
  try {
    const prompt = `Generate a comprehensive marketing automation plan for:
Product: ${product}
Industry: ${industry}
Target Audience: ${targetAudience}
Channels: ${channels.map(c => c.channel).join(", ")}
${seoScore !== null ? `SEO Score: ${seoScore}/100` : ""}
${seoKeywords ? `Keyword Opportunities: ${JSON.stringify(seoKeywords)}` : ""}
${seoContentGaps ? `Content Gaps: ${JSON.stringify(seoContentGaps)}` : ""}
${seoBlogIdeas ? `Blog Ideas: ${JSON.stringify(seoBlogIdeas)}` : ""}
${seoCompetitorKeywords ? `Competitor Keywords: ${JSON.stringify(seoCompetitorKeywords)}` : ""}
${seoTechnicalAudit ? `Technical Audit: ${JSON.stringify(seoTechnicalAudit)}` : ""}
${seoActionPlan ? `SEO Action Plan: ${JSON.stringify(seoActionPlan)}` : ""}
${seoScoreBreakdown ? `Score Breakdown: ${JSON.stringify(seoScoreBreakdown)}` : ""}

Generate:
1. Campaign objective and weekly plan
2. Email sequence (3 emails with subject, preview, body, CTA)
3. LinkedIn posts (5 posts with different formats)
4. Instagram content (5 captions with hashtags and reel ideas)
5. Video ad scripts (3 videos with scenes and voiceover)
6. Image ad prompts (5 poster ideas with design direction)
7. Lead generation strategy with ideal profile
8. DM templates for outreach

Return as JSON with these exact keys:
{
  "campaignName": "string",
  "campaignObjective": "string",
  "targetAudience": {},
  "channels": [],
  "weeklyPlan": {},
  "kpis": {},
  "budgetSplit": {},
  "emailSequence": [],
  "emailSubjects": [],
  "emailSchedule": {},
  "leadCriteria": {},
  "linkedInCalendar": {},
  "linkedInPosts": [],
  "linkedInDmTemplates": [],
  "linkedInSchedule": {},
  "instagramCaptions": [],
  "instagramReelIdeas": [],
  "instagramSchedule": {},
  "instagramHashtags": [],
  "posterPrompts": [],
  "imageAdIdeas": [],
  "designStyles": {},
  "videoScripts": [],
  "videoScenes": [],
  "videoSchedule": {},
  "idealLeadProfile": {},
  "leadSources": [],
  "outreachAngles": [],
  "sampleLeads": []
}`;

    const aiResult = await callAI(prompt);
    
    if (aiResult.success && aiResult.data) {
      console.log('✅ [Automation] AI-generated plan created');
      return {
        ...aiResult.data,
        provider: aiResult.provider || 'ai',
        fallbackUsed: false,
      };
    }
  } catch (error) {
    console.log('⚠️ [Automation] AI generation failed, using fallback:', error.message);
  }

  // Fallback — no verified data available
  console.log('⚠️ [Automation] AI unavailable, returning empty fallback');
  
  return generateFallbackAutomationPlan({
    product,
    targetAudience,
    industry,
    channels,
    website,
  });
}

/**
 * Generate fallback — returns empty/no-verified-data response
 */
function generateFallbackAutomationPlan(context) {
  return {
    campaignName: null,
    campaignObjective: null,
    targetAudience: null,
    channels: null,
    weeklyPlan: null,
    kpis: null,
    budgetSplit: null,
    emailSequence: null,
    emailSubjects: null,
    emailSchedule: null,
    leadCriteria: null,
    linkedInCalendar: null,
    linkedInPosts: null,
    linkedInDmTemplates: null,
    linkedInSchedule: null,
    instagramCaptions: null,
    instagramReelIdeas: null,
    instagramSchedule: null,
    instagramHashtags: null,
    posterPrompts: null,
    imageAdIdeas: null,
    designStyles: null,
    videoScripts: null,
    videoScenes: null,
    videoSchedule: null,
    idealLeadProfile: null,
    leadSources: null,
    outreachAngles: null,
    sampleLeads: null,
    provider: "fallback",
    fallbackUsed: true,
    message: "No verified data available. AI generation was not available.",
  };
}

export function sanitizeAutomationPlanData(automationData, chatTitle = 'Your Product') {
  const safe = (v) => (v !== undefined && v !== null ? v : null);

  if (!automationData || typeof automationData !== 'object') {
    return {
      campaignName: null,
      campaignObjective: null,
      targetAudience: null,
      channels: null,
      weeklyPlan: null,
      kpis: null,
      budgetSplit: null,
      emailSequence: null,
      emailSubjects: null,
      emailSchedule: null,
      leadCriteria: null,
      linkedInCalendar: null,
      linkedInPosts: null,
      linkedInDmTemplates: null,
      linkedInSchedule: null,
      instagramCaptions: null,
      instagramReelIdeas: null,
      instagramSchedule: null,
      instagramHashtags: null,
      posterPrompts: null,
      imageAdIdeas: null,
      designStyles: null,
      videoScripts: null,
      videoScenes: null,
      videoSchedule: null,
      idealLeadProfile: null,
      leadSources: null,
      outreachAngles: null,
      sampleLeads: null,
      provider: safe(automationData?.provider) || 'ai',
      fallbackUsed: safe(automationData?.fallbackUsed) || false,
    };
  }

  return {
    campaignName: safe(automationData.campaignName),
    campaignObjective: safe(automationData.campaignObjective),
    targetAudience: safe(automationData.targetAudience),
    channels: safe(automationData.channels),
    weeklyPlan: safe(automationData.weeklyPlan),
    kpis: safe(automationData.kpis),
    budgetSplit: safe(automationData.budgetSplit),
    emailSequence: safe(automationData.emailSequence),
    emailSubjects: safe(automationData.emailSubjects),
    emailSchedule: safe(automationData.emailSchedule),
    leadCriteria: safe(automationData.leadCriteria),
    linkedInCalendar: safe(automationData.linkedInCalendar),
    linkedInPosts: safe(automationData.linkedInPosts),
    linkedInDmTemplates: safe(automationData.linkedInDmTemplates),
    linkedInSchedule: safe(automationData.linkedInSchedule),
    instagramCaptions: safe(automationData.instagramCaptions),
    instagramReelIdeas: safe(automationData.instagramReelIdeas),
    instagramSchedule: safe(automationData.instagramSchedule),
    instagramHashtags: safe(automationData.instagramHashtags),
    posterPrompts: safe(automationData.posterPrompts),
    imageAdIdeas: safe(automationData.imageAdIdeas),
    designStyles: safe(automationData.designStyles),
    videoScripts: safe(automationData.videoScripts),
    videoScenes: safe(automationData.videoScenes),
    videoSchedule: safe(automationData.videoSchedule),
    idealLeadProfile: safe(automationData.idealLeadProfile),
    leadSources: safe(automationData.leadSources),
    outreachAngles: safe(automationData.outreachAngles),
    sampleLeads: safe(automationData.sampleLeads),
    provider: safe(automationData.provider) || 'ai',
    fallbackUsed: safe(automationData.fallbackUsed) || false,
  };
}
