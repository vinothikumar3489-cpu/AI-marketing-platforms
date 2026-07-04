import { callAI } from "../ai/services/aiRouter.service.js";

export const AUTOMATION_PLAN_ALLOWED_FIELDS = new Set([
  'campaignName', 'campaignObjective', 'targetAudience',
  'channels', 'weeklyPlan', 'kpis', 'budgetSplit',
  'emailSequence', 'emailSubjects', 'emailSchedule', 'leadCriteria',
  'linkedInCalendar', 'linkedInPosts', 'linkedInDmTemplates', 'linkedInSchedule',
  'instagramCaptions', 'instagramReelIdeas', 'instagramSchedule', 'instagramHashtags',
  'posterPrompts', 'imageAdIdeas', 'designStyles',
  'videoScripts', 'videoScenes', 'videoSchedule',
  'idealLeadProfile', 'leadSources', 'outreachAngles', 'sampleLeads',
  'readinessScore', 'status', 'provider', 'fallbackUsed'
]);

export function sanitizeAutomationPlanData(data) {
  const allowed = {};
  for (const key of Object.keys(data)) {
    if (AUTOMATION_PLAN_ALLOWED_FIELDS.has(key)) {
      allowed[key] = data[key];
    }
  }
  return allowed;
}

/**
 * Generate automation plan with AI or evidence-based plan from verified data
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

  // Check for sufficient verified data
  const hasProductData = !!productIntelligence?.productAnalysis;
  const hasMarketData = !!productIntelligence?.marketDiscovery;
  const hasAudienceData = !!productIntelligence?.audienceIntelligence;
  const hasCompetitorData = !!competitorIntelligence?.competitorAnalysis;
  const hasCampaignData = !!campaignIntelligence?.campaignGenerator;
  const hasChannelData = !!campaignIntelligence?.channelRecommendation;
  const hasSeoData = !!seoIntelligence?.seoScore;

  if (!hasProductData && !hasCampaignData && !hasSeoData && !hasCompetitorData) {
    return { _noData: true };
  }

  // Extract key data (only verified sources)
  const productData = productIntelligence?.inputJson || {};
  const productAnalysis = productIntelligence?.productAnalysis || {};
  const audienceData = productIntelligence?.audienceIntelligence || {};
  const campaignData = campaignIntelligence?.campaignGenerator || {};
  const channelData = campaignIntelligence?.channelRecommendation || {};
  const seoKeywords = seoIntelligence?.keywordOpportunities || null;
  const seoContentGaps = seoIntelligence?.contentGaps || null;
  const seoBlogIdeas = seoIntelligence?.blogIdeas || null;
  const seoCompetitorKeywords = seoIntelligence?.competitorKeywords || null;
  const seoTechnicalAudit = seoIntelligence?.technicalAudit || null;
  const seoActionPlan = seoIntelligence?.actionPlan || null;
  const seoScoreBreakdown = seoIntelligence?.scoreBreakdown || null;
  const seoScore = seoIntelligence?.seoScore ?? null;

  // Determine product info from verified data only
  const product = productName || chatTitle || "Project";
  const targetAudience = productData.targetAudience || audienceData.primaryAudience || null;
  const industry = productData.industry || null;
  const website = productData.websiteUrl || "";

  // Determine channels from verified data only
  let channels = [];
  if (channelData.recommendedChannels && Array.isArray(channelData.recommendedChannels)) {
    channels = channelData.recommendedChannels.map(ch => ({
      channel: ch.channel || ch.name,
      priority: ch.priority || "medium",
      reason: ch.reason || null,
      evidence: "channel_recommendation",
    }));
  }

  // Try AI generation first
  try {
    const prompt = `Generate a comprehensive marketing automation plan for:
Product: ${product}
${industry ? `Industry: ${industry}` : ""}
${targetAudience ? `Target Audience: ${targetAudience}` : ""}
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
}

Every item in any array MUST include these evidence fields:
- "trigger": "what triggers this action"
- "condition": "condition to execute"
- "action": "the actual content or action"
- "tool": "tool to execute (e.g. LinkedIn, Email, Instagram)"
- "owner": "role responsible"
- "evidence": "source data from analysis"
- "confidence": "high/medium/low"
- "dataSource": "where data came from"

CRITICAL: Use ONLY verified data. Set any field to null or empty array if no verified data exists. Do NOT invent or fabricate data.`;

    const aiResult = await callAI(prompt);
    
    if (aiResult.success && aiResult.data) {
      console.log('✅ [Automation] AI-generated plan created');
      return aiResult.data;
    }
  } catch (error) {
    console.log('⚠️ [Automation] AI generation failed:', error.message);
  }

  // If AI fails, generate evidence-based plan from verified data
  console.log('📝 [Automation] Generating evidence-based automation plan from verified data');
  
  return generateEvidenceBasedPlan({
    product,
    targetAudience,
    industry,
    channels,
    website,
    hasProductData,
    hasMarketData,
    hasAudienceData,
    hasCompetitorData,
    hasCampaignData,
    hasChannelData,
    hasSeoData,
    productIntelligence,
    competitorIntelligence,
    campaignIntelligence,
    seoIntelligence,
  });
}

/**
 * Generate evidence-based automation plan from verified intelligence data only
 */
function generateEvidenceBasedPlan(context) {
  const {
    product, targetAudience, industry, channels, website,
    hasProductData, hasMarketData, hasAudienceData, hasCompetitorData,
    hasCampaignData, hasChannelData, hasSeoData,
    productIntelligence, competitorIntelligence, campaignIntelligence, seoIntelligence,
  } = context;

  const productAnalysis = productIntelligence?.productAnalysis || {};
  const audienceData = productIntelligence?.audienceIntelligence || {};
  const campaignData = campaignIntelligence?.campaignGenerator || {};

  const plan = {
    campaignName: `${product} Campaign`,
    provider: "evidence_based",
    fallbackUsed: true,
  };

  if (targetAudience) {
    plan.targetAudience = {
      primary: targetAudience,
      evidence: "target_audience_input",
      confidence: "medium",
      dataSource: "project_input",
    };
  }

  if (channels.length > 0) {
    plan.channels = channels;
  }

  if (hasProductData && productAnalysis.usp) {
    plan.campaignObjective = `Promote ${product}: ${productAnalysis.usp}`;
  } else if (hasCampaignData && campaignData.campaignObjectives) {
    plan.campaignObjective = campaignData.campaignObjectives;
  }

  if (hasCampaignData) {
    const actionPlan = campaignData.actionPlan || {};
    if (actionPlan.kpis) {
      plan.kpis = Array.isArray(actionPlan.kpis)
        ? actionPlan.kpis.map(k => ({ kpi: k, tool: "campaign_tracker", owner: "marketing_team", evidence: "campaign_generator", confidence: "medium", dataSource: "campaign_intelligence" }))
        : actionPlan.kpis;
    }
  }

  if (hasSeoData) {
    const seoInfo = seoIntelligence || {};
    if (seoInfo.keywordOpportunities && Array.isArray(seoInfo.keywordOpportunities)) {
      plan.emailSubjects = seoInfo.keywordOpportunities.slice(0, 5).map(kw => ({
        subject: typeof kw === 'string' ? kw : kw.keyword || kw.value,
        trigger: "seo_opportunity_detected",
        condition: "keyword_ranking_below_top_10",
        action: "create_content_around_keyword",
        tool: "content_management",
        owner: "seo_specialist",
        evidence: `keyword_volume_${kw.volume || 'unknown'}`,
        confidence: kw.confidence || "medium",
        dataSource: "seo_intelligence",
      }));
    }
    if (seoInfo.blogIdeas && Array.isArray(seoInfo.blogIdeas)) {
      plan.linkedInPosts = seoInfo.blogIdeas.slice(0, 5).map(post => ({
        title: typeof post === 'string' ? post : post.title || post.value,
        format: "educational",
        trigger: "content_gap_identified",
        condition: "weekly_schedule",
        action: "publish_educational_post",
        tool: "linkedin",
        owner: "content_marketing",
        evidence: "seo_content_gap_analysis",
        confidence: post.confidence || "medium",
        dataSource: "seo_intelligence",
      }));
    }
  }

  if (hasAudienceData && audienceData.buyerPersonas && audienceData.buyerPersonas.length > 0) {
    const persona = audienceData.buyerPersonas[0];
    plan.idealLeadProfile = {
      industry: [industry || persona.industry].filter(Boolean),
      jobTitles: [persona.name || "Unknown"],
      goals: persona.goals || [],
      painPoints: persona.painPoints || [],
      evidence: "audience_intelligence",
      confidence: "high",
      dataSource: "audience_persona_analysis",
    };
  }

  return plan;
}
