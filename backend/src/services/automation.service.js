import { callAI } from "../ai/services/aiRouter.service.js";
import { validateRecommendations, EvidenceFilter } from "../services/intelligence/evidence-validator.service.js";

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
  'googleAds', 'contentCalendar', 'crmWorkflows', 'workflows',
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
  "sampleLeads": [],
  "googleAds": [],
  "contentCalendar": [],
  "crmWorkflows": [],
  "workflows": []
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
  const channelData = campaignIntelligence?.channelRecommendation || {};
  const seoInfo = seoIntelligence || {};
  const competitorData = competitorIntelligence?.competitorAnalysis || {};

  const companyName = executiveStory?.companyOverview?.name || product;
  const plan = {};

  // === CAMPAIGN OVERVIEW ===
  if (companyName) {
    plan.campaignName = `${companyName} Automation Plan`;
  }
  if (growthWorkspace?.overallGrowthScore !== undefined) {
    plan.campaignObjective = `Growth Score: ${growthWorkspace.overallGrowthScore}/100. Prioritize channels and campaigns based on growth analysis.`;
  } else if (hasProductData && productAnalysis.usp) {
    plan.campaignObjective = `Promote ${product}: ${productAnalysis.usp}`;
  } else if (hasCampaignData && campaignData.campaignObjectives) {
    plan.campaignObjective = campaignData.campaignObjectives;
  }

  // === TARGET AUDIENCE ===
  if (targetAudience) {
    const persona = audienceData.buyerPersonas?.[0] || {};
    plan.targetAudience = {
      primary: targetAudience,
      demographics: persona.demographics || '',
      interests: (persona.interests || persona.goals || []).slice(0, 5),
      painPoints: (persona.painPoints || []).slice(0, 5),
      goals: (persona.goals || []).slice(0, 3),
      evidence: "audience_intelligence",
      confidence: hasAudienceData ? "high" : "medium",
      dataSource: hasAudienceData ? "audience_persona_analysis" : "project_input",
    };
  }

  // === CHANNELS ===
  if (channels.length > 0) {
    plan.channels = channels.map(ch => ({
      ...ch,
      tool: ch.channel === 'email' ? 'email_platform' : ch.channel === 'linkedin' ? 'linkedin' : ch.channel === 'instagram' ? 'instagram' : ch.channel === 'google_ads' ? 'google_ads' : 'content_platform',
      owner: ch.channel === 'email' ? 'email_marketing' : ch.channel === 'linkedin' ? 'content_marketing' : ch.channel === 'instagram' ? 'social_media' : ch.channel === 'google_ads' ? 'ppc_specialist' : 'marketing_team',
      budgetAllocation: ch.budgetAllocation || 'N/A',
      expectedReach: ch.expectedReach || 'N/A',
      effort: ch.priority === 'high' ? 'high' : ch.priority === 'low' ? 'low' : 'medium',
      evidence: ch.evidence || 'channel_recommendation',
      confidence: ch.priority === 'high' ? 'high' : 'medium',
      dataSource: 'campaign_intelligence',
    }));
  }

  // === KPIS ===
  const primaryKpis = [];
  const secondaryKpis = [];

  if (growthWorkspace?.overallGrowthScore !== undefined) {
    primaryKpis.push({ kpi: `Growth Score: ${growthWorkspace.overallGrowthScore}/100`, measurementSource: 'growth_workspace', trackingTool: 'growth_dashboard', reportingFrequency: 'monthly', baseline: growthWorkspace.overallGrowthScore, target: Math.min(100, growthWorkspace.overallGrowthScore + 15), evidence: 'growth_workspace_analysis', confidence: 'medium' });
  }
  if (hasSeoData && seoInfo.seoScore !== null) {
    primaryKpis.push({ kpi: `SEO Score: ${seoInfo.seoScore}/100`, measurementSource: 'seo_intelligence', trackingTool: 'seo_dashboard', reportingFrequency: 'monthly', baseline: seoInfo.seoScore, target: Math.min(100, seoInfo.seoScore + 10), evidence: 'seo_technical_audit', confidence: 'high' });
  }
  if (hasProductData && productAnalysis.usp) {
    secondaryKpis.push({ kpi: 'Product Awareness Lift', measurementSource: 'campaign_analytics', trackingTool: 'analytics_platform', reportingFrequency: 'weekly', baseline: 0, target: 25, evidence: 'product_analysis', confidence: 'medium' });
  }
  if (hasCampaignData && campaignData.creativeAngles?.length) {
    secondaryKpis.push({ kpi: 'Campaign Engagement Rate', measurementSource: 'channel_analytics', trackingTool: 'channel_specific_tools', reportingFrequency: 'weekly', baseline: 0, target: 3.5, unit: '%', evidence: 'campaign_generator', confidence: 'medium' });
  }
  if (channels.length > 0) {
    secondaryKpis.push({ kpi: `Channel Reach (${channels.map(c => c.channel).join(', ')})`, measurementSource: 'channel_analytics', trackingTool: 'channel_specific_tools', reportingFrequency: 'weekly', baseline: 0, target: 10000, unit: 'impressions', evidence: 'channel_recommendation', confidence: 'medium' });
  }

  plan.kpis = {
    primaryKPIs: primaryKpis,
    secondaryKPIs: secondaryKpis,
    measurementSource: Array.from(new Set([...primaryKpis, ...secondaryKpis].map(k => k.measurementSource).filter(Boolean))),
    trackingTool: 'automation_dashboard',
    reportingFrequency: 'monthly',
    evidence: 'combined_intelligence',
    confidence: primaryKpis.length > 0 ? 'high' : 'medium',
  };

  // === BUDGET SPLIT ===
  if (channels.length > 0) {
    const totalChannels = channels.length;
    const basePercent = Math.floor(100 / totalChannels);
    const split = {};
    channels.forEach((ch, i) => {
      split[ch.channel || ch.name] = i === 0 ? `${100 - basePercent * (totalChannels - 1)}%` : `${basePercent}%`;
    });
    plan.budgetSplit = split;
  }

  // === WEEKLY PLAN ===
  const weeklyPlan = {};
  if (actionPlan?.day7?.length > 0) {
    actionPlan.day7.slice(0, 5).forEach((item, i) => {
      weeklyPlan[`Day ${i * 7 + 1}`] = {
        title: item.title || item,
        problem: item.problem || '',
        evidence: item.evidence || 'growth_action_plan',
        priority: item.priority || 'medium',
        difficulty: item.difficulty || 'medium',
        expectedGain: item.expectedGain || '',
        businessImpact: item.businessImpact || '',
        owner: item.owner || 'marketing_team',
        estimatedTimeline: item.estimatedTimeline || '7 days',
        source: 'growth_workspace_action_plan',
      };
    });
  }
  if (actionPlan?.day30?.length > 0) {
    actionPlan.day30.slice(0, 3).forEach((item, i) => {
      weeklyPlan[`Day ${i * 10 + 30}`] = {
        title: item.title || item,
        problem: item.problem || '',
        evidence: item.evidence || 'growth_action_plan',
        priority: item.priority || 'medium',
        difficulty: item.difficulty || 'medium',
        expectedGain: item.expectedGain || '',
        businessImpact: item.businessImpact || '',
        owner: item.owner || 'marketing_team',
        estimatedTimeline: item.estimatedTimeline || '30 days',
        source: 'growth_workspace_action_plan',
      };
    });
  }
  if (hasSeoData && seoInfo.keywordOpportunities?.length) {
    weeklyPlan['SEO Day 1'] = {
      title: 'Target top SEO keywords for content creation',
      evidence: 'seo_keyword_opportunities',
      priority: 'high',
      owner: 'seo_specialist',
      estimatedTimeline: '7 days',
      confidence: seoInfo.seoScore ? 'high' : 'medium',
      source: 'seo_intelligence',
    };
  }
  if (Object.keys(weeklyPlan).length > 0) {
    plan.weeklyPlan = weeklyPlan;
  }

  // === COLD EMAIL DRAFTS ===
  const coldEmails = [];
  if (hasSeoData && seoInfo.keywordOpportunities?.length) {
    const keywords = seoInfo.keywordOpportunities.slice(0, 3);
    keywords.forEach((kw, i) => {
      const kwText = typeof kw === 'string' ? kw : kw.keyword || kw.value || kw;
      coldEmails.push({
        subject: `Insights on ${kwText} for ${companyName || product}`,
        previewText: `How ${companyName || product} can leverage ${kwText} for growth`,
        body: `Hi {{firstName}},\n\nI noticed that ${companyName || product} has strong potential in the ${kwText} space. Based on our analysis, there are opportunities to improve visibility and drive targeted traffic.\n\nWould you be open to a brief call to discuss how we can help you achieve better results?\n\nBest,\n{{senderName}}`,
        cta: 'Schedule a call to discuss',
        targetPersona: 'Marketing Manager',
        personalizationNotes: `Reference ${kwText} specifically in the opening line. Mention any recent ${industry || 'industry'} trends if available.`,
        complianceNote: 'Include unsubscribe link and physical mailing address per CAN-SPAM. Review GDPR requirements for EU recipients.',
        unsubscribeReminder: 'Recipients can unsubscribe at any time via the link at the bottom of the email.',
        approvalStatus: 'draft',
        day: i + 1,
        trigger: 'seo_opportunity_detected',
        condition: 'keyword_ranking_below_top_10',
        action: 'send_cold_email',
        tool: 'email_platform',
        owner: 'email_marketing',
        evidence: `keyword_${kwText}_identified`,
        confidence: kw.confidence || 'medium',
        dataSource: 'seo_intelligence',
      });
    });
  }
  if (coldEmails.length === 0 && hasProductData && productAnalysis.usp) {
    coldEmails.push({
      subject: `Enhance your ${product || 'growth'} strategy`,
      previewText: `Personalized approach to ${productAnalysis.usp || 'drive growth'}`,
      body: `Hi {{firstName}},\n\nAt ${companyName || 'our company'}, we've developed strategies to help businesses like yours achieve better outcomes.\n\nWe'd love to show you how our approach can make a difference.\n\nBest,\n{{senderName}}`,
      cta: 'Learn more',
      targetPersona: 'Growth Lead',
      personalizationNotes: `Reference ${productAnalysis.usp || 'the value proposition'} in context of ${targetAudience || 'the target audience'}.`,
      complianceNote: 'Include unsubscribe link and physical mailing address per CAN-SPAM.',
      unsubscribeReminder: 'You can unsubscribe at any time.',
      approvalStatus: 'draft',
      day: 1,
      trigger: 'product_analysis_available',
      condition: 'manual_approval',
      action: 'send_cold_email',
      tool: 'email_platform',
      owner: 'email_marketing',
      evidence: 'product_usp_analysis',
      confidence: 'medium',
      dataSource: 'product_intelligence',
    });
  }
  if (coldEmails.length > 0) {
    plan.emailSequence = coldEmails;
  }

  // === LINKEDIN POSTS ===
  const linkedInPosts = [];
  if (seoInfo.blogIdeas && Array.isArray(seoInfo.blogIdeas)) {
    seoInfo.blogIdeas.slice(0, 5).forEach((post, i) => {
      const postTitle = typeof post === 'string' ? post : post.title || post.value || post;
      linkedInPosts.push({
        title: postTitle,
        format: 'educational',
        content: `We've identified "${postTitle}" as a key topic for ${companyName || product}. Here's what we found:\n\n• Relevant to ${targetAudience || 'your audience'}\n• Aligns with ${industry || 'industry'} trends\n• Opportunity for thought leadership\n\nWhat are your thoughts?`,
        bestTime: `Day ${(i + 1) * 3} at 9:00 AM`,
        trigger: 'content_gap_identified',
        condition: 'weekly_schedule',
        action: 'publish_educational_post',
        tool: 'linkedin',
        owner: 'content_marketing',
        evidence: 'seo_blog_idea_' + (i + 1),
        confidence: post.confidence || 'medium',
        dataSource: 'seo_intelligence',
      });
    });
  }
  if (linkedInPosts.length === 0 && hasProductData) {
    linkedInPosts.push({
      title: `${product || 'Product'} Industry Insights and Trends`,
      format: 'thought_leadership',
      content: `Sharing our analysis of ${product || 'the product'} space and key trends we're observing for ${companyName || 'the industry'}.\n\nStay tuned for more insights.`,
      bestTime: 'Day 1 at 9:00 AM',
      trigger: 'product_analysis_available',
      condition: 'content_calendar',
      action: 'publish_linkedin_post',
      tool: 'linkedin',
      owner: 'content_marketing',
      evidence: 'product_analysis_insights',
      confidence: 'medium',
      dataSource: 'product_intelligence',
    });
  }
  if (linkedInPosts.length > 0) {
    plan.linkedInPosts = linkedInPosts;
  }

  // === LINKEDIN DM TEMPLATES ===
  const dmTemplates = [];
  if (hasProductData && productAnalysis.usp) {
    dmTemplates.push({
      title: 'Product Introduction',
      body: `Hi {{firstName}},\n\nI came across ${companyName || product} and noticed you're doing interesting work in ${industry || 'your industry'}.\n\nWe've developed a framework that helps companies like yours ${productAnalysis.usp || 'achieve better outcomes'}.\n\nWould you be open to a quick chat?\n\nBest,\n{{senderName}}`,
      cta: 'Schedule a call',
      trigger: 'prospect_identified',
      condition: 'profile_matches_ideal_customer',
      action: 'send_dm_introduction',
      tool: 'linkedin',
      owner: 'sales_development',
      evidence: 'product_usp_analysis',
      confidence: 'medium',
      dataSource: 'product_intelligence',
    });
  }
  if (dmTemplates.length > 0) {
    plan.linkedInDmTemplates = dmTemplates;
  }

  // === INSTAGRAM CAPTIONS ===
  const igCaptions = [];
  const personaName = audienceData.buyerPersonas?.[0]?.name || targetAudience || 'target audience';
  if (hasProductData && productAnalysis.usp) {
    igCaptions.push({
      title: 'Product Spotlight',
      postType: 'carousel',
      caption: `Unlocking the power of ${productAnalysis.usp || 'innovation'} for ${personaName} 🚀\n\nSwipe to see how we're transforming ${industry || 'the industry'}.\n\n#${(product || 'Product').replace(/\s+/g, '')} #Innovation #${(industry || 'Industry').replace(/\s+/g, '')}`,
      hashtags: [product?.replace(/\s+/g, '') || 'Product', 'Innovation', industry?.replace(/\s+/g, '') || 'Industry', 'Growth', 'Strategy'].filter(Boolean),
      trigger: 'content_calendar',
      condition: 'weekly_schedule',
      action: 'publish_instagram_post',
      tool: 'instagram',
      owner: 'social_media',
      evidence: 'product_analysis',
      confidence: 'medium',
      dataSource: 'product_intelligence',
    });
    igCaptions.push({
      title: 'Behind the Scenes',
      postType: 'story',
      caption: `Here's how we approach ${industry || 'our work'} differently.\n\nTag someone who needs to see this! 💡`,
      hashtags: ['BehindTheScenes', 'WorkInProgress', (industry || 'Business').replace(/\s+/g, '')].filter(Boolean),
      trigger: 'content_calendar',
      condition: 'biweekly_schedule',
      action: 'publish_instagram_story',
      tool: 'instagram',
      owner: 'social_media',
      evidence: 'brand_voice',
      confidence: 'medium',
      dataSource: 'brand_guidelines',
    });
  }
  if (igCaptions.length > 0) {
    plan.instagramCaptions = igCaptions;
  }

  // === INSTAGRAM REEL IDEAS ===
  const reelIdeas = [];
  if (hasProductData) {
    reelIdeas.push({
      title: 'Quick tip for ' + (personaName || 'our audience'),
      description: `A 30-second reel sharing a quick tip about ${productAnalysis.usp || 'how we help'} our customers succeed.`,
      music: 'Trending upbeat track',
      duration: '30s',
      trigger: 'reel_idea_generation',
      condition: 'weekly_content_planning',
      action: 'create_reel',
      tool: 'instagram',
      owner: 'social_media',
      evidence: 'content_strategy',
      confidence: 'medium',
      dataSource: 'content_plan',
    });
  }
  if (reelIdeas.length > 0) {
    plan.instagramReelIdeas = reelIdeas;
  }

  // === GOOGLE ADS ===
  const googleAds = [];
  const keywordsTexts = seoInfo.keywordOpportunities?.slice(0, 5).map((k) => typeof k === 'string' ? k : k.keyword || k.value || k).filter(Boolean) || [];
  if (keywordsTexts.length > 0) {
    const groupSize = Math.min(3, keywordsTexts.length);
    const adGroup1 = keywordsTexts.slice(0, groupSize);
    const adGroup2 = keywordsTexts.length > groupSize ? keywordsTexts.slice(groupSize, groupSize * 2) : [];
    googleAds.push({
      title: `${product || 'Brand'} Search Campaign`,
      headline: `${product || 'Professional'} Solutions for ${personaName}`,
      description: `Discover how ${companyName || product} helps ${targetAudience || 'professionals'} achieve better outcomes.`,
      cta: 'Learn More',
      destinationUrl: website || 'https://example.com',
      budget: 'N/A - Requires budget configuration',
      targeting: { keywords: adGroup1, audience: targetAudience || personaName, location: 'Target markets', device: 'All devices' },
      campaignName: `${companyName || product} Search`,
      objective: 'Lead generation and brand awareness',
      audience: targetAudience || personaName,
      adGroups: [{ name: 'Primary Keywords', keywords: adGroup1, bidStrategy: 'maximize_clicks' }],
      headlines: [googleAds[0]?.headline || `${product || 'Brand'} Solutions`].filter(Boolean),
      descriptions: [googleAds[0]?.description || `Learn more about ${companyName || product}`].filter(Boolean),
      landingPageRecommendation: website || 'Homepage',
      negativeKeywords: ['free', 'cheap', 'jobs', 'career'].filter(k => !keywordsTexts.some((kt) => kt.includes(k))),
      budgetSuggestion: 'Start with $500-1000/month test budget',
      evidence: 'seo_keyword_analysis',
      confidence: 'medium',
      dataSource: 'seo_intelligence',
      channel: 'google_ads',
      priority: 'medium',
      trigger: 'keyword_analysis_complete',
      condition: 'budget_approved',
      action: 'launch_search_campaign',
      tool: 'google_ads',
      owner: 'ppc_specialist',
    });
    if (adGroup2.length > 0) {
      googleAds.push({
        title: `${product || 'Brand'} - Secondary Keywords`,
        headline: `Advanced ${product || 'Solutions'} for ${industry || 'Professionals'}`,
        description: `Explore additional ways ${companyName || product} serves ${targetAudience || 'its customers'} with tailored solutions.`,
        cta: 'Get Started',
        destinationUrl: website || 'https://example.com',
        budget: 'N/A',
        targeting: { keywords: adGroup2, audience: targetAudience || personaName },
        campaignName: `${companyName || product} - Secondary`,
        objective: 'Expand reach',
        audience: targetAudience || personaName,
        adGroups: [{ name: 'Secondary Keywords', keywords: adGroup2, bidStrategy: 'maximize_clicks' }],
        headlines: [`Advanced ${product || 'Solutions'}`],
        descriptions: [`Explore ${companyName || product}'s offerings for ${industry || 'professionals'}`],
        landingPageRecommendation: website || 'Homepage',
        negativeKeywords: ['free', 'cheap'],
        budgetSuggestion: 'Allocate 30% of primary campaign budget',
        evidence: 'seo_keyword_secondary_analysis',
        confidence: 'medium',
        dataSource: 'seo_intelligence',
        channel: 'google_ads',
        priority: 'medium',
        trigger: 'keyword_expansion',
        condition: 'primary_campaign_performing',
        action: 'launch_secondary_campaign',
        tool: 'google_ads',
        owner: 'ppc_specialist',
      });
    }
  } else if (hasSeoData && seoInfo.seoScore !== null) {
    googleAds.push({
      title: `${companyName || product} - Brand Awareness`,
      headline: `Grow with ${companyName || product}`,
      description: `Targeted campaigns to reach ${targetAudience || 'ideal customers'} in the ${industry || 'business'} space.`,
      cta: 'Contact Us',
      destinationUrl: website || 'https://example.com',
      budget: 'N/A - Requires budget configuration',
      targeting: { audience: targetAudience || personaName, location: 'Primary markets' },
      campaignName: `${companyName || product} Awareness`,
      objective: 'Brand awareness',
      audience: targetAudience || personaName,
      adGroups: [{ name: 'Brand Campaign', keywords: ['brand'], bidStrategy: 'maximize_impressions' }],
      headlines: [`Grow with ${companyName || product}`],
      descriptions: [`Reach ${targetAudience || 'your audience'} with targeted campaigns`],
      landingPageRecommendation: website || 'Homepage',
      negativeKeywords: ['free', 'cheap'],
      budgetSuggestion: 'Start with $300-500/month test budget',
      evidence: 'seo_analysis_brand',
      confidence: 'low',
      dataSource: 'seo_intelligence',
      channel: 'google_ads',
      priority: 'low',
      trigger: 'brand_awareness_initiative',
      condition: 'budget_available',
      action: 'launch_awareness_campaign',
      tool: 'google_ads',
      owner: 'ppc_specialist',
    });
  }
  if (googleAds.length > 0) {
    plan.googleAds = googleAds;
  }

  // === POSTER/CREATIVE PROMPTS ===
  const posterPrompts = [];
  if (hasProductData && productAnalysis.usp) {
    posterPrompts.push({
      title: 'Value Proposition Poster',
      campaignGoal: campaignData.campaignObjectives || plan.campaignObjective || `Promote ${productAnalysis.usp || product}`,
      targetAudience: targetAudience || personaName,
      visualStyle: 'Modern, clean, professional with brand colors',
      headline: productAnalysis.usp || `Discover ${product || 'Our Solution'}`,
      cta: 'Learn More',
      format: 'Social media graphic (1080x1080)',
      platform: 'Instagram / LinkedIn',
      brandNotes: `Use ${companyName || 'brand'} colors and logo. Maintain professional tone.`,
      prompt: `Create a poster for ${companyName || product} highlighting their key value: ${productAnalysis.usp || 'innovative solutions'}. Target audience: ${targetAudience || personaName}. Style: Modern and professional. CTA: Learn more.`,
      description: `Visual highlighting ${productAnalysis.usp || 'value proposition'} for ${targetAudience || 'target audience'}.`,
      trigger: 'campaign_launch',
      condition: 'creative_assets_needed',
      action: 'generate_poster_prompt',
      tool: 'design_tool',
      owner: 'creative_team',
      evidence: 'product_analysis_usp',
      confidence: 'high',
      dataSource: 'product_intelligence',
    });
  }
  if (hasSeoData && keywordsTexts.length > 0) {
    posterPrompts.push({
      title: `SEO Topic: ${keywordsTexts[0]}`,
      campaignGoal: `Content promotion for ${keywordsTexts[0]}`,
      targetAudience: targetAudience || personaName,
      visualStyle: 'Educational, informative with data visualizations',
      headline: `Master ${keywordsTexts[0]}`,
      cta: 'Read More',
      format: 'Blog featured image (1200x630)',
      platform: 'Website / LinkedIn',
      brandNotes: 'Include blog title overlay. Use consistent brand typography.',
      prompt: `Design a featured image for a blog post about ${keywordsTexts[0]}. Target audience: ${targetAudience || personaName}. Style: Educational with visual data elements.`,
      description: `Content promotion graphic for ${keywordsTexts[0]} topic.`,
      trigger: 'content_publishing',
      condition: 'weekly_content_calendar',
      action: 'generate_poster_prompt',
      tool: 'design_tool',
      owner: 'creative_team',
      evidence: 'seo_keyword_strategy',
      confidence: 'medium',
      dataSource: 'seo_intelligence',
    });
  }
  if (posterPrompts.length > 0) {
    plan.posterPrompts = posterPrompts;
  }

  // === DESIGN STYLES ===
  plan.designStyles = {
    colors: ['#53a7ff', '#10e18b', '#101622', '#ffffff'],
    fonts: ['Inter', 'system-ui', 'sans-serif'],
    style: 'Modern, clean, professional',
    mood: 'Professional and outcome-focused',
    tone: 'Professional and outcome-focused',
    imagery: 'Product screenshots, team photos, data visualizations',
  };

  // === VIDEO AD SCRIPTS ===
  const videoScripts = [];
  if (hasProductData && productAnalysis.usp) {
    videoScripts.push({
      title: `${product || 'Brand'} - Value Proposition Video`,
      hook: `Did you know that ${targetAudience || 'most businesses'} face challenges with ${productAnalysis.painPoints?.[0]?.value || productAnalysis.painPoints?.[0] || 'growth'}?`,
      problem: `${targetAudience || 'Companies'} struggle to ${productAnalysis.painPoints?.slice(0, 2).map((p) => typeof p === 'string' ? p : p.value || p).join(' and ') || 'achieve their goals'} effectively.`,
      productSolution: `${productAnalysis.usp || companyName || 'Our solution'} provides a streamlined approach to solve these challenges.`,
      proofEvidence: industry ? `Trusted by companies in the ${industry} space.` : 'Built on proven methodologies and verified data.',
      cta: 'Schedule a demo today',
      duration: '60 seconds',
      voiceover: 'Professional, confident, warm tone',
      visualDirection: 'Open with problem visualization, transition to solution screenshots, end with brand and CTA',
      script: `[OPEN: 0-10s] Visual of ${targetAudience || 'professionals'} facing challenges.\nVoiceover: "${hook}"\n\n[PROBLEM: 10-25s] Statistics and pain points visualization.\nVoiceover: "${problem}"\n\n[SOLUTION: 25-45s] Product/service showcase.\nVoiceover: "${productSolution}"\n\n[PROOF: 45-52s] Testimonial or evidence display.\nVoiceover: "${'Built on proven methodologies and verified data.'}"\n\n[CTA: 52-60s] Brand and call to action.\nVoiceover: "${cta}"`,
      scenes: [
        { description: 'Problem visualization with statistics', visual: 'Animated infographic showing pain points', audio: 'Background music starts, voiceover begins', duration: '10s' },
        { description: 'Solution introduction', visual: 'Product screenshots and feature highlights', audio: 'Voiceover explains solution', duration: '15s' },
        { description: 'Proof and evidence', visual: `Industry ${industry || 'relevant'} data and results`, audio: 'Voiceover presents evidence', duration: '10s' },
        { description: 'Call to action', visual: 'Brand logo, website URL, CTA button', audio: 'Voiceover delivers CTA, music crescendo', duration: '5s' },
      ],
      trigger: 'video_ad_campaign',
      condition: 'creative_assets_needed',
      action: 'produce_video_ad',
      tool: 'video_production',
      owner: 'creative_team',
      evidence: 'product_analysis_differentiators',
      confidence: 'high',
      dataSource: 'product_intelligence',
    });
  }
  if (videoScripts.length > 0) {
    plan.videoScripts = videoScripts;
  }

  // === CONTENT CALENDAR ===
  const calendarEntries = [];
  const now = new Date();
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  weekDays.forEach((day, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    if (plan.linkedInPosts?.[i]) {
      calendarEntries.push({ week: `Week 1`, dateRange: dateStr, theme: plan.linkedInPosts[i].title || 'LinkedIn Post', posts: [{ channel: 'linkedin', content: plan.linkedInPosts[i].title, type: 'educational' }], channels: ['linkedin'], goal: 'Thought leadership', owner: 'content_marketing', evidence: 'seo_content_gap_analysis', confidence: 'medium' });
    }
    if (plan.instagramCaptions?.[i]) {
      calendarEntries.push({ week: `Week 1`, dateRange: dateStr, theme: plan.instagramCaptions[i].title || 'Instagram Post', posts: [{ channel: 'instagram', content: plan.instagramCaptions[i].caption?.substring(0, 100), type: plan.instagramCaptions[i].postType }], channels: ['instagram'], goal: 'Brand awareness', owner: 'social_media', evidence: 'content_strategy', confidence: 'medium' });
    }
  });

  if (keywordsTexts.slice(0, 3).length > 0) {
    keywordsTexts.slice(0, 3).forEach((kw, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() + i + 5);
      calendarEntries.push({ week: 'Week 2', dateRange: date.toISOString().split('T')[0], theme: `Blog: ${kw}`, posts: [{ channel: 'blog', content: `Write comprehensive guide on ${kw}`, type: 'SEO' }], channels: ['blog', 'linkedin'], goal: 'SEO traffic', owner: 'seo_specialist', evidence: 'seo_keyword_opportunity', confidence: 'high' });
    });
  }

  if (calendarEntries.length > 0) {
    plan.contentCalendar = calendarEntries;
  }

  // === CRM WORKFLOWS ===
  const crmWorkflows = [];
  if (hasCompetitorData && competitorData.directCompetitors?.length > 0) {
    crmWorkflows.push({
      workflowName: 'Competitor Monitoring',
      trigger: 'Weekly competitor check',
      conditions: ['Competitor activity detected', 'Market share change > 5%'],
      actions: ['Analyze competitor move', 'Update positioning', 'Adjust campaign messaging'],
      crmTool: 'CRM not detected',
      recommendation: 'Connect CRM before activation. Recommended: HubSpot or Salesforce.',
      owner: 'competitive_intelligence',
      expectedKPI: 'Market share maintained',
      evidence: 'competitor_analysis_intelligence',
      confidence: 'high',
      priority: 'high',
      difficulty: 'medium',
      timeline: 'Weekly',
      dataSource: 'competitor_intelligence',
    });
  }
  if (hasSeoData && keywordsTexts.length > 0) {
    crmWorkflows.push({
      workflowName: 'SEO Content Pipeline',
      trigger: 'Weekly SEO audit',
      conditions: ['Keyword ranking dropped', 'New content gap identified'],
      actions: ['Assign content to writer', 'Create SEO-optimized article', 'Publish and promote'],
      crmTool: 'CRM not detected',
      recommendation: 'Connect CRM for lead tracking from content downloads.',
      owner: 'seo_specialist',
      expectedKPI: `Improve ranking for ${keywordsTexts.length} keywords`,
      evidence: 'seo_content_gap_analysis',
      confidence: 'high',
      priority: 'high',
      difficulty: 'medium',
      timeline: 'Bi-weekly',
      dataSource: 'seo_intelligence',
    });
  }
  if (hasProductData) {
    crmWorkflows.push({
      workflowName: 'Lead Nurturing Sequence',
      trigger: 'New lead captured',
      conditions: ['Lead score > 50', 'Source identified'],
      actions: ['Send welcome email', 'Assign to SDR', 'Schedule follow-up'],
      crmTool: 'CRM not detected',
      recommendation: 'Connect CRM before activation. Automated lead routing requires CRM integration.',
      owner: 'sales_development',
      expectedKPI: 'Lead response time < 5 min',
      evidence: 'sales_process_standard',
      confidence: 'medium',
      priority: 'high',
      difficulty: 'high',
      timeline: 'Ongoing',
      dataSource: 'sales_process',
    });
  }
  if (crmWorkflows.length > 0) {
    plan.crmWorkflows = crmWorkflows;
  }

  // === IDEAL LEAD PROFILE / LEAD CRITERIA ===
  if (hasAudienceData && audienceData.buyerPersonas?.length > 0) {
    const persona = audienceData.buyerPersonas[0];
    plan.idealLeadProfile = {
      industry: [industry || persona.industry].filter(Boolean),
      jobTitles: [persona.name || 'Marketing Manager', 'Growth Lead', 'Product Manager'].filter(Boolean),
      goals: (persona.goals || []).slice(0, 5),
      painPoints: (persona.painPoints || []).slice(0, 5),
      evidence: 'audience_intelligence',
      confidence: 'high',
      dataSource: 'audience_persona_analysis',
    };
    plan.leadCriteria = {
      minLeadScore: 50,
      requiredFields: ['email', 'company', 'role'],
      preferredChannels: channels.map(c => c.channel || c.name).filter(Boolean),
      evidence: 'audience_intelligence',
      confidence: 'high',
      dataSource: 'audience_persona_analysis',
    };
  }

  // === LEAD SOURCES ===
  const leadSources = [];
  if (keywordsTexts.length > 0) {
    leadSources.push({ source: 'SEO Organic Search', priority: 'high', cost: 'Low', volume: 'High', tool: 'Google Search Console', owner: 'seo_specialist', evidence: 'seo_traffic_data', confidence: 'high', dataSource: 'seo_intelligence' });
  }
  if (channels.length > 0) {
    channels.forEach(ch => {
      leadSources.push({ source: ch.channel || ch.name, priority: ch.priority || 'medium', cost: 'Medium', volume: 'Medium', tool: ch.channel === 'email' ? 'Email Platform' : ch.channel === 'linkedin' ? 'LinkedIn Sales Navigator' : 'Platform Analytics', owner: 'marketing_team', evidence: 'channel_strategy', confidence: 'medium', dataSource: 'campaign_intelligence' });
    });
  }
  if (leadSources.length > 0) {
    plan.leadSources = leadSources;
  }

  // === EVIDENCE VALIDATION ===
  // Validate all generated array fields through EvidenceFilter to reject placeholders, fakes, and duplicates
  const filter = new EvidenceFilter();
  const arrayFields = ['emailSequence', 'linkedInPosts', 'linkedInDmTemplates', 'instagramCaptions', 'instagramReelIdeas', 'googleAds', 'posterPrompts', 'videoScripts', 'contentCalendar', 'crmWorkflows', 'leadSources'];
  for (const field of arrayFields) {
    if (Array.isArray(plan[field]) && plan[field].length > 0) {
      const result = filter.filter(plan[field], `automation_${field}`);
      if (result.valid && result.items.length > 0) {
        plan[field] = result.items;
      } else if (result.items.length === 0) {
        delete plan[field];
      }
    }
  }

  // Add evidence metadata wrapper at plan level
  plan._metadata = {
    evidenceVersion: '2.0.0',
    generatedAt: new Date().toISOString(),
    sourcesUsed: {
      productAnalysis: !!productAnalysis,
      seoIntelligence: hasSeoData,
      audienceIntelligence: hasAudienceData,
      competitorIntelligence: !!competitorData,
      campaignIntelligence: !!campaignData,
      actionPlan: !!actionPlan,
      businessIntelligence: !!(executiveStory || actionPlan),
      growthWorkspace: !!growthWorkspace,
    },
    totalItemsGenerated: Object.values(plan).reduce((sum, v) => sum + (Array.isArray(v) ? v.length : 0), 0),
    validationStats: filter.getStats(),
  };

  return plan;
}
