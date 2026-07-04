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
  'readinessScore', 'status', 'provider', 'fallbackUsed',
  'automationType', 'priority', 'startDate', 'endDate',
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
    growthWorkspace,
    executiveStory,
    actionPlan,
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
    const prompt = `Generate a marketing automation plan using ONLY the verified data below.

VERIFIED DATA:
Product: ${product}
${industry ? `Industry: ${industry}` : ""}
${targetAudience ? `Target Audience: ${targetAudience}` : ""}
${channels.length > 0 ? `Channels: ${channels.map(c => c.channel).join(", ")}` : ""}
${seoScore !== null ? `SEO Score: ${seoScore}/100` : ""}
${seoKeywords ? `SEO Keywords: ${JSON.stringify(seoKeywords.slice(0, 10))}` : ""}
${seoContentGaps ? `Content Gaps: ${JSON.stringify(seoContentGaps.slice(0, 5))}` : ""}
${seoBlogIdeas ? `Blog Ideas: ${JSON.stringify(seoBlogIdeas.slice(0, 5))}` : ""}
${growthWorkspace ? `Growth Score: ${JSON.stringify(growthWorkspace.overallGrowthScore)}` : ""}
${executiveStory?.companyOverview?.name ? `Company Name: ${executiveStory.companyOverview.name}` : ""}

RULES:
1. Use ONLY the verified data shown above. Do NOT invent any data.
2. For any section with no verified data, set it to an empty array [] or null.
3. Do NOT generate sample leads, fake discounts, fake case studies, placeholder hashtags, or fabricated campaign names.
4. Every item in any array MUST include evidence fields: trigger, condition, action, tool, owner, evidence, confidence, dataSource.

Return valid JSON with these keys (set to [] or null if no data):
{
  "campaignName": "string or null",
  "campaignObjective": "string or null",
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

CRITICAL: Return valid JSON. Empty arrays for sections with no data. No fabricated content.`;

    const aiResult = await callAI(prompt);
    
    if (aiResult.success && aiResult.data) {
      console.log('✅ [Automation] AI-generated plan created');
      return aiResult.data;
    }
  } catch (error) {
    console.log('⚠️ [Automation] AI generation failed:', error.message);
  }

  // If AI fails, generate evidence-based plan from verified data
  console.log('[Automation] Generating evidence-based automation plan from verified data');
  
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
    growthWorkspace,
    executiveStory,
    actionPlan,
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
    growthWorkspace, executiveStory, actionPlan,
  } = context;

  const productAnalysis = productIntelligence?.productAnalysis || {};
  const audienceData = productIntelligence?.audienceIntelligence || {};
  const campaignData = campaignIntelligence?.campaignGenerator || {};

  const plan = {};

  if (executiveStory?.companyOverview?.name) {
    plan.campaignName = `${executiveStory.companyOverview.name} Automation Plan`;
  } else if (product) {
    plan.campaignName = `${product} Automation Plan`;
  }

  if (growthWorkspace?.overallGrowthScore !== undefined) {
    plan.campaignObjective = `Growth Score: ${growthWorkspace.overallGrowthScore}/100. Prioritize channels and campaigns based on growth analysis.`;
  } else if (hasProductData && productAnalysis.usp) {
    plan.campaignObjective = `Promote ${product}: ${productAnalysis.usp}`;
  } else if (hasCampaignData && campaignData.campaignObjectives) {
    plan.campaignObjective = campaignData.campaignObjectives;
  }

  if (targetAudience) {
    plan.targetAudience = {
      primary: targetAudience,
      evidence: "verified_data",
      confidence: "medium",
      dataSource: "project_input",
    };
  }

  if (channels.length > 0) {
    plan.channels = channels;
  }

  if (hasCampaignData) {
    const campaignActionPlan = campaignData.actionPlan || {};
    if (campaignActionPlan.kpis) {
      plan.kpis = Array.isArray(campaignActionPlan.kpis)
        ? campaignActionPlan.kpis.map(k => ({ kpi: k, tool: "campaign_tracker", owner: "marketing_team", evidence: "campaign_generator", confidence: "medium", dataSource: "campaign_intelligence" }))
        : campaignActionPlan.kpis;
    }
  }

  if (actionPlan?.day7?.length > 0) {
    plan.weeklyPlan = {
      day7: actionPlan.day7.slice(0, 7),
      day30: actionPlan.day30?.slice(0, 5) || [],
      source: "growth_workspace_action_plan",
    };
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
