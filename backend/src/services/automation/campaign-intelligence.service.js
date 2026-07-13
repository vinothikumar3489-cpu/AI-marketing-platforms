import { callAI } from "../../ai/services/aiRouter.service.js";

const POSSIBLE_CHANNELS = [
  "Google Search", "LinkedIn", "Meta", "Instagram", "Facebook",
  "YouTube", "Reddit", "Email", "Referral", "Content Marketing",
  "Product Hunt", "Communities", "Partnerships", "Organic SEO",
  "Webinars", "Events"
];

const POSSIBLE_GOALS = [
  "Launch Product", "Increase Leads", "Increase Sales", "Brand Awareness",
  "SEO Growth", "Product Adoption", "Retention", "Upsell",
  "Community Growth", "Enterprise Sales", "Hiring", "Funding"
];

export async function generateCampaignIntelligence({ userId, chatId, evidenceContext }) {
  const ec = evidenceContext || {};

  if (!ec || ec.rejected) {
    return { _noData: true, reason: ec?.reason || "No evidence context available" };
  }

  const product = ec.product || {};
  const company = ec.company || {};
  const website = ec.website || {};
  const audience = ec.audience || {};
  const competitors = ec.competitors || {};
  const seo = ec.seo || {};
  const channels = ec.channels || [];
  const growth = ec.growth || {};
  const sources = ec.sourceSummary || {};

  try {
    const prompt = buildCampaignPrompt({
      product, company, website, audience, competitors, seo, channels, growth, sources
    });

    const aiResult = await callAI(prompt);

    if (aiResult.success && aiResult.data) {
      return validateCampaignOutput(aiResult.data);
    }
  } catch (err) {
    console.warn("[CampaignIntelligence] AI generation failed:", err.message);
  }

  return generateEvidenceBasedCampaign({
    product, company, website, audience, competitors, seo, channels, growth, sources
  });
}

function buildCampaignPrompt(context) {
  const { product, company, website, audience, competitors, seo, channels, growth, sources } = context;

  const evidenceLines = [];

  if (company.name?.value) evidenceLines.push(`Company Name: ${company.name.value}`);
  if (company.industry?.value) evidenceLines.push(`Industry: ${company.industry.value}`);
  if (company.websiteUrl?.value) evidenceLines.push(`Website: ${company.websiteUrl.value}`);
  if (product.name?.value) evidenceLines.push(`Product Name: ${product.name.value}`);
  if (product.usp?.value) evidenceLines.push(`USP: ${product.usp.value}`);
  if (product.description?.value) evidenceLines.push(`Description: ${product.description.value}`);
  if (product.features?.value?.length) evidenceLines.push(`Features: ${product.features.value.slice(0, 8).join(", ")}`);
  if (product.benefits?.value?.length) evidenceLines.push(`Benefits: ${product.benefits.value.slice(0, 5).join(", ")}`);
  if (website.heroText?.value) evidenceLines.push(`Hero Text: ${website.heroText.value}`);
  if (website.ctaTexts?.value?.length) evidenceLines.push(`CTAs Found: ${website.ctaTexts.value.join(", ")}`);
  if (website.title?.value) evidenceLines.push(`Website Title: ${website.title.value}`);
  if (website.metaDescription?.value) evidenceLines.push(`Meta Description: ${website.metaDescription.value}`);

  if (audience) {
    if (audience.primary?.value) evidenceLines.push(`Primary Audience: ${audience.primary.value}`);
    if (audience.personas?.value?.length) {
      audience.personas.value.slice(0, 3).forEach(p => {
        evidenceLines.push(`Persona: ${p.name || p.title || p.role || "Unnamed"} — ${(p.painPoints || []).slice(0, 2).join(", ")}`);
      });
    }
    if (audience.painPoints?.value?.length) evidenceLines.push(`Pain Points: ${audience.painPoints.value.slice(0, 5).join(", ")}`);
  }

  if (competitors?.list?.value?.length) {
    evidenceLines.push(`Competitors: ${competitors.list.value.slice(0, 5).map(c => c.name || c.domain || "Unknown").join(", ")}`);
  }

  if (seo) {
    if (seo.issues?.value?.length) evidenceLines.push(`SEO Issues: ${seo.issues.value.slice(0, 5).map(i => i.action || i.title || i).join("; ")}`);
    if (seo.contentOpportunities?.value?.length) evidenceLines.push(`SEO Content Opportunities: ${seo.contentOpportunities.value.slice(0, 5).map(o => o.opportunity || o.title || o).join("; ")}`);
    if (seo.keywords?.value?.length) evidenceLines.push(`SEO Keywords: ${seo.keywords.value.slice(0, 10).map(k => k.keyword || k).join(", ")}`);
  }

  if (channels?.length) {
    evidenceLines.push(`Suggested Channels: ${channels.map(c => c.channel || c.name).join(", ")}`);
  }

  if (growth?.overallScore?.value != null) {
    evidenceLines.push(`Growth Score: ${growth.overallScore.value}/100`);
  }

  evidenceLines.push(`Evidence Sources: ${sources.sourcesCollected?.join(", ") || "none"}`);

  return `You are the Campaign Intelligence Engine for an AI Marketing Platform. Your role is to plan evidence-based marketing campaigns.

EVIDENCE FROM ANALYSIS:
${evidenceLines.join("\n")}

RULES (ABSOLUTE):
1. Use ONLY the evidence above. Do NOT invent any data.
2. Do NOT fabricate ROI, conversion rates, budgets, revenue numbers, or statistics.
3. Every field MUST include "reason" (why this was chosen) and "evidence" (what data supports it).
4. If evidence is insufficient, use "Insufficient evidence" as the reason.
5. Never use placeholder text, lorem ipsum, or filler content.
6. Do NOT generate fake percentages, fake growth numbers, or fake performance metrics.

Return valid JSON with this exact structure (no markdown, no code fences):

{
  "executiveSummary": {
    "campaignName": "Evidence-based campaign name derived from product + goal",
    "campaignTheme": "Central theme based on evidence",
    "campaignGoal": "Primary campaign goal derived from evidence",
    "recommendedDuration": "Duration based on goals (e.g. 90 days, 60 days)",
    "primaryAudience": { "value": "audience name", "reason": "why", "evidence": "what data" },
    "primaryChannels": [{ "channel": "name", "reason": "why", "evidence": "what data" }],
    "topOpportunities": [{ "title": "opp", "reason": "why", "evidence": "what data" }],
    "topRisks": [{ "risk": "risk", "reason": "why", "evidence": "what data" }],
    "nextActions": [{ "action": "what to do", "owner": "who", "priority": "high/medium/low", "evidence": "what data" }]
  },
  "businessGoal": {
    "goal": "One of: Launch Product, Increase Leads, Increase Sales, Brand Awareness, SEO Growth, Product Adoption, Retention, Upsell, Community Growth, Enterprise Sales, Hiring, Funding",
    "confidence": "high/medium/low",
    "reason": "why this goal was determined",
    "evidence": "what evidence supports it"
  },
  "campaignObjective": {
    "primary": { "value": "primary objective", "reason": "why", "evidence": "what data" },
    "secondary": { "value": "secondary objective or null", "reason": "why", "evidence": "what data" },
    "successDefinition": { "value": "how success is measured", "reason": "why", "evidence": "what data" },
    "targetAudience": { "value": "target audience description", "reason": "why", "evidence": "what data" },
    "idealCustomer": { "value": "ideal customer profile or null", "reason": "why", "evidence": "what data" },
    "timeline": { "value": "campaign timeline", "reason": "why", "evidence": "what data" },
    "priority": "high/medium/low",
    "dependencies": [{ "dependency": "what depends", "reason": "why" }]
  },
  "audienceSelection": {
    "primaryAudience": { "value": "audience", "reason": "why", "evidence": "what data" },
    "secondaryAudience": { "value": "audience or null", "reason": "why", "evidence": "what data" },
    "buyingStage": { "value": "awareness/consideration/decision or null", "reason": "why", "evidence": "what data" },
    "painPoints": [{ "value": "pain point", "evidence": "what data" }],
    "decisionDrivers": [{ "value": "driver", "evidence": "what data" }],
    "objections": [{ "value": "objection", "evidence": "what data" }],
    "contentPreferences": [{ "value": "content type", "evidence": "what data" }]
  },
  "channelRecommendations": [
    {
      "channel": "channel name",
      "fit": "high/medium/low",
      "priority": "high/medium/low",
      "reason": "why this channel fits",
      "evidence": "what evidence supports it",
      "recommendedContent": "what content to create",
      "recommendedCTA": "what call to action",
      "organicOrPaid": "organic/paid/both"
    }
  ],
  "timeline": {
    "week1": [{ "title": "task", "description": "details", "dependency": "what depends on this", "ownerRole": "who", "evidence": "why" }],
    "week2": [{ "title": "task", "description": "details", "dependency": "what depends on this", "ownerRole": "who", "evidence": "why" }],
    "week3": [{ "title": "task", "description": "details", "dependency": "what depends on this", "ownerRole": "who", "evidence": "why" }],
    "week4": [{ "title": "task", "description": "details", "dependency": "what depends on this", "ownerRole": "who", "evidence": "why" }],
    "month2": [{ "title": "task", "description": "details", "dependency": "what depends on this", "ownerRole": "who", "evidence": "why" }],
    "month3": [{ "title": "task", "description": "details", "dependency": "what depends on this", "ownerRole": "who", "evidence": "why" }]
  },
  "marketingFunnel": {
    "awareness": { "objective": "goal", "channels": ["ch1"], "content": "content type", "cta": "call to action", "measurement": "how to measure" },
    "interest": { "objective": "goal", "channels": ["ch1"], "content": "content type", "cta": "call to action", "measurement": "how to measure" },
    "consideration": { "objective": "goal", "channels": ["ch1"], "content": "content type", "cta": "call to action", "measurement": "how to measure" },
    "conversion": { "objective": "goal", "channels": ["ch1"], "content": "content type", "cta": "call to action", "measurement": "how to measure" },
    "retention": { "objective": "goal", "channels": ["ch1"], "content": "content type", "cta": "call to action", "measurement": "how to measure" },
    "advocacy": { "objective": "goal", "channels": ["ch1"], "content": "content type", "cta": "call to action", "measurement": "how to measure" }
  },
  "kpiFramework": [
    { "kpi": "KPI name", "howToMeasure": "method", "tool": "tool name", "frequency": "weekly/monthly", "status": "Measured or Estimated or Not Yet Measured" }
  ],
  "riskAssessment": [
    { "risk": "risk description", "cause": "what causes it", "evidence": "evidence", "severity": "high/medium/low", "mitigation": "how to mitigate" }
  ],
  "opportunityAssessment": [
    { "opportunity": "opportunity description", "reason": "why", "evidence": "evidence", "effort": "high/medium/low", "priority": "high/medium/low", "expectedBusinessImpact": "impact description (no revenue numbers)" }
  ]
}

Return ONLY valid JSON. No markdown. No code fences. No explanations.`;
}

function validateCampaignOutput(data) {
  if (!data || typeof data !== "object") {
    return { _noData: true, reason: "Invalid AI output" };
  }

  const validated = {
    executiveSummary: data.executiveSummary || null,
    businessGoal: data.businessGoal || null,
    campaignObjective: data.campaignObjective || null,
    audienceSelection: data.audienceSelection || null,
    channelRecommendations: data.channelRecommendations || null,
    timeline: data.timeline || null,
    marketingFunnel: data.marketingFunnel || null,
    kpiFramework: data.kpiFramework || null,
    riskAssessment: data.riskAssessment || null,
    opportunityAssessment: data.opportunityAssessment || null,
    nextActions: data.executiveSummary?.nextActions || null,
    _metadata: {
      generatedAt: new Date().toISOString(),
      provider: "ai",
      fallbackUsed: false,
    }
  };

  return validated;
}

function generateEvidenceBasedCampaign(context) {
  const { product, company, website, audience, competitors, seo, channels, growth, sources } = context;

  const companyName = company.name?.value || product.name?.value || "Project";
  const industry = company.industry?.value || product.industry?.value || "Unknown";
  const websiteTitle = website.title?.value || companyName;

  const hasProductData = !!(product.usp?.value || product.features?.value?.length);
  const hasAudienceData = !!(audience?.primary?.value || audience?.personas?.value?.length);
  const hasCompetitorData = !!(competitors?.list?.value?.length);
  const hasSeoData = !!(seo?.keywords?.value?.length || seo?.issues?.value?.length);
  const hasChannelData = !!(channels?.length);
  const hasGrowthData = growth?.overallScore?.value != null;

  const goal = determineBusinessGoal(context);
  const channelRecs = determineChannels(context);

  return {
    executiveSummary: {
      campaignName: `${companyName} Evidence-Based Campaign`,
      campaignTheme: `Growth through ${goal.goal || "strategic marketing"}`,
      campaignGoal: goal.goal || "Brand Awareness",
      recommendedDuration: "90 days",
      primaryAudience: {
        value: audience?.primary?.value || "TBD from audience intelligence",
        reason: hasAudienceData ? "Derived from audience intelligence analysis" : "Audience intelligence not yet available",
        evidence: hasAudienceData ? "audience_intelligence" : "insufficient_evidence"
      },
      primaryChannels: channelRecs.slice(0, 3).map(c => ({
        channel: c.channel,
        reason: c.reason,
        evidence: c.evidence
      })),
      topOpportunities: buildOpportunities(context).slice(0, 3).map(o => ({
        title: o.opportunity,
        reason: o.reason,
        evidence: o.evidence
      })),
      topRisks: buildRisks(context).slice(0, 3).map(r => ({
        risk: r.risk,
        reason: r.cause,
        evidence: r.evidence
      })),
      nextActions: buildNextActions(context).slice(0, 5)
    },
    businessGoal: goal,
    campaignObjective: buildCampaignObjective(context, goal),
    audienceSelection: buildAudienceSelection(context),
    channelRecommendations: channelRecs,
    timeline: buildTimeline(context, channelRecs),
    marketingFunnel: buildFunnel(context, channelRecs),
    kpiFramework: buildKPIs(context),
    riskAssessment: buildRisks(context),
    opportunityAssessment: buildOpportunities(context),
    _metadata: {
      generatedAt: new Date().toISOString(),
      provider: "evidence-based",
      fallbackUsed: true,
    }
  };
}

function determineBusinessGoal(context) {
  const { product, company, website, audience, competitors, seo, channels, growth, sources } = context;

  const text = [
    website.heroText?.value || "",
    website.metaDescription?.value || "",
    product.description?.value || "",
    product.usp?.value || "",
    website.title?.value || "",
    company.name?.value || "",
  ].filter(Boolean).join(" ").toLowerCase();

  const ctaTexts = (website.ctaTexts?.value || []).join(" ").toLowerCase();

  const industry = (company.industry?.value || product.industry?.value || "").toLowerCase();
  const hasProductData = !!(product.usp?.value || product.features?.value?.length);
  const hasCompetitorData = !!(competitors?.list?.value?.length);
  const hasSeoIssues = !!(seo?.issues?.value?.length);

  let goal = "Brand Awareness";
  let confidence = "low";
  let reason = "Insufficient evidence to determine specific business goal";
  let evidence = "insufficient_evidence";

  if (text.includes("launch") || text.includes("coming soon") || text.includes("new product")) {
    goal = "Launch Product";
    confidence = "medium";
    reason = "Website evidence suggests a product launch";
    evidence = "website_content_language";
  } else if (ctaTexts.includes("get started") || ctaTexts.includes("sign up") || ctaTexts.includes("try free")) {
    goal = "Increase Leads";
    confidence = "high";
    reason = "CTA evidence shows lead generation focus";
    evidence = "website_cta_analysis";
  } else if (ctaTexts.includes("buy") || ctaTexts.includes("shop") || ctaTexts.includes("purchase") || ctaTexts.includes("subscribe")) {
    goal = "Increase Sales";
    confidence = "high";
    reason = "CTA evidence shows direct sales focus";
    evidence = "website_cta_analysis";
  } else if (hasSeoIssues) {
    goal = "SEO Growth";
    confidence = "medium";
    reason = "SEO issues detected, indicating growth opportunity through organic search";
    evidence = "seo_technical_audit";
  } else if (industry.includes("saas") || industry.includes("software")) {
    goal = "Product Adoption";
    confidence = "medium";
    reason = "Industry pattern suggests product adoption as primary goal";
    evidence = "industry_pattern_analysis";
  } else if (industry.includes("ecommerce") || industry.includes("retail")) {
    goal = "Increase Sales";
    confidence = "medium";
    reason = "Industry pattern suggests sales as primary goal";
    evidence = "industry_pattern_analysis";
  } else if (text.includes("enterprise") || text.includes("for teams") || text.includes("business")) {
    goal = "Enterprise Sales";
    confidence = "medium";
    reason = "Language targets enterprise audience";
    evidence = "website_content_language";
  } else if (hasProductData && hasCompetitorData) {
    goal = "Increase Leads";
    confidence = "medium";
    reason = "Product and competitor data available — lead generation is recommended starting point";
    evidence = "product_and_competitor_analysis";
  }

  return { goal, confidence, reason, evidence };
}

function buildCampaignObjective(context, goal) {
  const { product, company, audience } = context;
  const goalText = goal?.goal || "Brand Awareness";

  return {
    primary: {
      value: `Drive ${goalText.toLowerCase()} through evidence-based multi-channel marketing`,
      reason: "Derived from detected business goal and available evidence",
      evidence: "business_goal_detection"
    },
    secondary: {
      value: "Establish measurable marketing operations and data-driven decision making",
      reason: "All campaigns should establish measurement infrastructure",
      evidence: "campaign_best_practices"
    },
    successDefinition: {
      value: "Campaign KPIs measured and reported with actual data",
      reason: "Success must be defined by measurable outcomes",
      evidence: "kpi_framework_definition"
    },
    targetAudience: {
      value: audience?.primary?.value || "TBD from audience intelligence",
      reason: audience?.primary?.value ? "Derived from audience intelligence" : "Awaiting audience intelligence analysis",
      evidence: audience?.primary?.value ? "audience_intelligence" : "insufficient_evidence"
    },
    idealCustomer: {
      value: null,
      reason: "Insufficient data to construct ideal customer profile",
      evidence: "insufficient_evidence"
    },
    timeline: {
      value: "12 weeks (90 days)",
      reason: "Standard campaign duration for measurable results",
      evidence: "campaign_planning_standards"
    },
    priority: "high",
    dependencies: [
      { dependency: "Complete audience intelligence analysis", reason: "Campaign targeting requires defined audience" },
      { dependency: "Set up measurement infrastructure", reason: "KPIs require tracking tools" }
    ]
  };
}

function buildAudienceSelection(context) {
  const { audience } = context;
  const hasData = !!(audience?.primary?.value || audience?.personas?.value?.length);

  const painPoints = audience?.painPoints?.value?.map(p => ({
    value: typeof p === "string" ? p : (p.value || p),
    evidence: "audience_intelligence"
  })) || [];

  if (!hasData) {
    return {
      primaryAudience: { value: "Insufficient evidence", reason: "No audience intelligence available", evidence: "insufficient_evidence" },
      secondaryAudience: null,
      buyingStage: { value: null, reason: "Insufficient evidence", evidence: "insufficient_evidence" },
      painPoints: [],
      decisionDrivers: [],
      objections: [],
      contentPreferences: []
    };
  }

  const personas = audience?.personas?.value || [];
  const firstPersona = personas[0] || {};

  return {
    primaryAudience: {
      value: audience?.primary?.value || firstPersona.name || "Unknown",
      reason: "Derived from audience intelligence analysis",
      evidence: "audience_intelligence"
    },
    secondaryAudience: personas.length > 1 ? {
      value: personas[1].name || "Secondary segment",
      reason: "Secondary segment from audience analysis",
      evidence: "audience_intelligence"
    } : null,
    buyingStage: {
      value: "awareness",
      reason: "Initial campaigns should focus on awareness before conversion",
      evidence: "funnel_strategy"
    },
    painPoints: painPoints.length > 0 ? painPoints : (firstPersona.painPoints || []).slice(0, 5).map(p => ({
      value: typeof p === "string" ? p : (p.value || "Unknown"),
      evidence: "audience_intelligence"
    })),
    decisionDrivers: (firstPersona.goals || []).slice(0, 5).map(g => ({
      value: typeof g === "string" ? g : (g.value || g),
      evidence: "audience_intelligence"
    })),
    objections: (firstPersona.objections || []).slice(0, 5).map(o => ({
      value: typeof o === "string" ? o : (o.value || o),
      evidence: "audience_intelligence"
    })),
    contentPreferences: (firstPersona.preferredContent || []).slice(0, 5).map(c => ({
      value: typeof c === "string" ? c : (c.value || c),
      evidence: "audience_intelligence"
    }))
  };
}

function determineChannels(context) {
  const { product, company, website, audience, competitors, seo, channels, growth } = context;
  const recs = [];

  const text = (website.heroText?.value || "") + " " +
    (website.metaDescription?.value || "") + " " +
    (product.description?.value || "") + " " +
    (company.name?.value || "");

  const lower = text.toLowerCase();
  const hasProductData = !!(product.usp?.value || product.features?.value?.length);
  const hasSeoKeywords = !!(seo?.keywords?.value?.length);
  const hasCompetitorData = !!(competitors?.list?.value?.length);

  if (hasSeoKeywords || seo?.issues?.value?.length) {
    recs.push({
      channel: "Organic SEO",
      fit: "high",
      priority: "high",
      reason: "SEO opportunities and/or issues detected in analysis",
      evidence: "seo_intelligence",
      recommendedContent: "SEO-optimized blog posts and landing pages addressing identified keyword gaps",
      recommendedCTA: "Learn More / Read More",
      organicOrPaid: "organic"
    });
  }

  if (hasProductData) {
    recs.push({
      channel: "Content Marketing",
      fit: "high",
      priority: "high",
      reason: "Product features and USPs identified — content marketing can showcase them effectively",
      evidence: "product_intelligence",
      recommendedContent: "Product-focused content, case studies, comparison guides",
      recommendedCTA: "Get Started / Learn More",
      organicOrPaid: "organic"
    });
  }

  recs.push({
    channel: "LinkedIn",
    fit: "medium",
    priority: "high",
    reason: "B2B lead generation and professional networking",
    evidence: "channel_best_practices",
    recommendedContent: "Thought leadership, industry insights, product updates",
    recommendedCTA: "Follow Page / Visit Website",
    organicOrPaid: "organic"
  });

  if (hasCompetitorData) {
    recs.push({
      channel: "Google Search",
      fit: "high",
      priority: "medium",
      reason: "Competitors present — paid search can capture competitor audience",
      evidence: "competitor_intelligence",
      recommendedContent: "Competitor comparison landing pages, branded search ads",
      recommendedCTA: "Learn More / Compare",
      organicOrPaid: "both"
    });
  }

  recs.push({
    channel: "Email",
    fit: "medium",
    priority: "medium",
    reason: "Direct communication channel for lead nurturing",
    evidence: "channel_best_practices",
    recommendedContent: "Newsletter, product updates, educational content",
    recommendedCTA: "Read More / Get Started",
    organicOrPaid: "organic"
  });

  recs.push({
    channel: "Communities",
    fit: "medium",
    priority: "low",
    reason: "Community engagement for brand building and feedback",
    evidence: "channel_best_practices",
    recommendedContent: "Discussion participation, AMAs, community support",
    recommendedCTA: "Join Community",
    organicOrPaid: "organic"
  });

  if (lower.includes("youtube") || lower.includes("video")) {
    recs.push({
      channel: "YouTube",
      fit: "high",
      priority: "medium",
      reason: "Video content referenced on website",
      evidence: "website_content_analysis",
      recommendedContent: "Product demos, tutorials, thought leadership videos",
      recommendedCTA: "Subscribe / Watch More",
      organicOrPaid: "organic"
    });
  }

  return recs;
}

function buildTimeline(context, channels) {
  const { product, company, audience } = context;
  const companyName = company.name?.value || product.name?.value || "Project";
  const hasAudienceData = !!(audience?.primary?.value || audience?.personas?.value?.length);

  return {
    week1: [
      { title: "Set up measurement infrastructure", description: "Configure analytics tools and KPI tracking for all channels", dependency: "None", ownerRole: "Marketing Operations", evidence: "Required for all subsequent measurement" },
      { title: "Finalize audience segments", description: "Review and refine audience intelligence for campaign targeting", dependency: "Complete audience intelligence", ownerRole: "Marketing Strategist", evidence: hasAudienceData ? "audience_intelligence" : "needs_audience_analysis" },
      { title: "Create content calendar", description: "Plan first 30 days of content across priority channels", dependency: "Channel selection complete", ownerRole: "Content Manager", evidence: "channel_recommendations" },
    ],
    week2: [
      { title: "Launch organic SEO content", description: "Publish first batch of SEO-optimized content targeting identified keywords", dependency: "Content calendar created", ownerRole: "SEO Specialist", evidence: "seo_keyword_analysis" },
      { title: "Set up LinkedIn company page", description: "Optimize LinkedIn presence and begin organic posting", dependency: "None", ownerRole: "Social Media Manager", evidence: "channel_recommendation" },
      { title: "Build email nurture sequence", description: "Create initial email workflow for lead nurturing", dependency: "Measurement infrastructure ready", ownerRole: "Email Marketer", evidence: "channel_recommendation" },
    ],
    week3: [
      { title: "Publish content marketing assets", description: "Release product-focused content and case studies", dependency: "Content production complete", ownerRole: "Content Manager", evidence: "product_intelligence" },
      { title: "Begin community engagement", description: "Start participating in relevant industry communities", dependency: "Brand guidelines finalized", ownerRole: "Community Manager", evidence: "channel_recommendation" },
      { title: "Review week 1-2 analytics", description: "Analyze initial data and adjust strategy", dependency: "Measurement infrastructure live", ownerRole: "Marketing Operations", evidence: "analytics_data_review" },
    ],
    week4: [
      { title: "Optimize based on early data", description: "Adjust content strategy and channel mix based on performance", dependency: "Week 1-3 data collected", ownerRole: "Marketing Strategist", evidence: "early_performance_data" },
      { title: "Scale high-performing channels", description: "Double down on channels showing early traction", dependency: "Performance data collected", ownerRole: "Channel Manager", evidence: "performance_analysis" },
      { title: "Plan month 2 campaigns", description: "Develop detailed plan for second month based on learnings", dependency: "First month data", ownerRole: "Campaign Manager", evidence: "month_1_results" },
    ],
    month2: [
      { title: "Expand content distribution", description: "Extend content reach through partnerships and syndication", dependency: "Content library established", ownerRole: "Content Manager", evidence: "content_strategy" },
      { title: "Launch retargeting campaign", description: "Set up retargeting for engaged but unconverted audience", dependency: "Sufficient traffic data", ownerRole: "Paid Media Specialist", evidence: "audience_engagement_data" },
      { title: "Deepen community presence", description: "Host AMA or community event", dependency: "Community presence established", ownerRole: "Community Manager", evidence: "community_growth_strategy" },
    ],
    month3: [
      { title: "Full campaign performance review", description: "Comprehensive analysis of all channels and KPIs", dependency: "3 months of data", ownerRole: "Marketing Strategist", evidence: "quarterly_performance_data" },
      { title: "Develop next quarter strategy", description: "Evidence-based plan for next campaign cycle", dependency: "Performance review complete", ownerRole: "Campaign Manager", evidence: "quarterly_review" },
      { title: "Document learnings", description: "Create playbook from campaign insights for future campaigns", dependency: "Campaign complete", ownerRole: "Marketing Operations", evidence: "campaign_learnings" },
    ]
  };
}

function buildFunnel(context, channels) {
  const channelNames = channels.map(c => c.channel);
  const topChannels = channelNames.slice(0, 3).length > 0 ? channelNames.slice(0, 3) : ["Content Marketing", "Organic SEO", "LinkedIn"];

  return {
    awareness: {
      objective: "Build brand visibility and reach new audience segments",
      channels: topChannels,
      content: "Educational content, thought leadership, SEO-optimized articles",
      cta: "Learn More / Read Article",
      measurement: "Traffic, impressions, reach, new visitors"
    },
    interest: {
      objective: "Engage audience with relevant content and establish authority",
      channels: topChannels,
      content: "In-depth guides, case studies, webinars, comparison content",
      cta: "Download Guide / Watch Webinar",
      measurement: "Time on page, content downloads, email signups, social engagement"
    },
    consideration: {
      objective: "Nurture prospects toward solution awareness and evaluation",
      channels: ["Email", "Content Marketing", "LinkedIn"],
      content: "Product comparisons, feature highlights, ROI calculators, demo content",
      cta: "Schedule Demo / Request Quote",
      measurement: "Demo requests, content engagement score, email CTR"
    },
    conversion: {
      objective: "Convert qualified prospects into customers",
      channels: ["Email", "Google Search", "Direct"],
      content: "Case studies, testimonials, free trial offers, limited-time incentives",
      cta: "Start Free Trial / Get Started",
      measurement: "Conversion rate, signup rate, revenue (when measurable)"
    },
    retention: {
      objective: "Retain customers and drive product adoption",
      channels: ["Email", "In-App", "Communities"],
      content: "Onboarding sequences, product tips, feature updates, success stories",
      cta: "Explore Feature / Join Community",
      measurement: "Activation rate, retention rate, feature adoption, NPS"
    },
    advocacy: {
      objective: "Convert customers into brand advocates and referral sources",
      channels: ["Email", "Referral", "Communities"],
      content: "Referral program, case study features, customer spotlight, review requests",
      cta: "Refer a Friend / Leave a Review",
      measurement: "Referral count, reviews, testimonials, organic mentions"
    }
  };
}

function buildKPIs(context) {
  const { product, company, seo, audience, competitors } = context;
  const kpis = [];

  const hasSeoData = !!(seo?.keywords?.value?.length || seo?.issues?.value?.length);
  const hasAudienceData = !!(audience?.primary?.value || audience?.personas?.value?.length);
  const hasCompetitorData = !!(competitors?.list?.value?.length);
  const hasProductData = !!(product.usp?.value || product.features?.value?.length);

  if (hasSeoData) {
    kpis.push({ kpi: "Organic Traffic", howToMeasure: "Google Search Console + Google Analytics", tool: "Google Search Console", frequency: "weekly", status: "Estimated" });
    kpis.push({ kpi: "Organic CTR", howToMeasure: "Google Search Console average CTR", tool: "Google Search Console", frequency: "weekly", status: "Estimated" });
    kpis.push({ kpi: "Organic Keyword Rankings", howToMeasure: "Track target keyword positions in SERP", tool: "Google Search Console / DataForSEO", frequency: "weekly", status: "Estimated" });
  }

  if (hasAudienceData) {
    kpis.push({ kpi: "Email Open Rate", howToMeasure: "Email platform open rate tracking", tool: "Email Marketing Platform", frequency: "weekly", status: "Not Yet Measured" });
    kpis.push({ kpi: "Email CTR", howToMeasure: "Email platform click-through rate tracking", tool: "Email Marketing Platform", frequency: "weekly", status: "Not Yet Measured" });
  }

  if (hasProductData) {
    kpis.push({ kpi: "Lead Count", howToMeasure: "Track form submissions and content downloads", tool: "CRM / Analytics", frequency: "weekly", status: "Not Yet Measured" });
    kpis.push({ kpi: "Demo Requests", howToMeasure: "Count demo booking form submissions", tool: "CRM / Booking System", frequency: "weekly", status: "Not Yet Measured" });
    kpis.push({ kpi: "Signup Rate", howToMeasure: "Free trial or account signups", tool: "Product Analytics", frequency: "weekly", status: "Not Yet Measured" });
    kpis.push({ kpi: "Activation Rate", howToMeasure: "Users who completed key activation milestone", tool: "Product Analytics", frequency: "monthly", status: "Not Yet Measured" });
  }

  kpis.push({ kpi: "Website Traffic", howToMeasure: "Google Analytics sessions and users", tool: "Google Analytics", frequency: "weekly", status: "Estimated" });

  if (kpis.length === 0) {
    kpis.push({ kpi: "Website Traffic", howToMeasure: "Google Analytics sessions", tool: "Google Analytics", frequency: "weekly", status: "Not Yet Measured" });
  }

  return kpis;
}

function buildRisks(context) {
  const { product, company, website, audience, competitors, seo } = context;
  const risks = [];

  const hasProductData = !!(product.usp?.value || product.features?.value?.length);
  const hasAudienceData = !!(audience?.primary?.value || audience?.personas?.value?.length);
  const hasCompetitorData = !!(competitors?.list?.value?.length);
  const hasSeoData = !!(seo?.keywords?.value?.length || seo?.issues?.value?.length);
  const hasWebsiteData = !!(website.title?.value || website.heroText?.value);

  if (!hasAudienceData) {
    risks.push({
      risk: "Campaign targeting may be imprecise without defined audience segments",
      cause: "No audience intelligence data collected",
      evidence: "audience_intelligence_missing",
      severity: "high",
      mitigation: "Run audience intelligence analysis before campaign launch"
    });
  }

  if (!hasProductData) {
    risks.push({
      risk: "Messaging may lack differentiation without clear product positioning",
      cause: "No product USPs or features identified",
      evidence: "product_intelligence_missing",
      severity: "high",
      mitigation: "Complete product analysis to define key messaging pillars"
    });
  }

  if (!hasCompetitorData) {
    risks.push({
      risk: "Competitive blind spot may lead to undifferentiated positioning",
      cause: "No competitor intelligence collected",
      evidence: "competitor_intelligence_missing",
      severity: "medium",
      mitigation: "Run competitor analysis to understand market positioning"
    });
  }

  if (!hasWebsiteData) {
    risks.push({
      risk: "Website evidence may be insufficient for accurate campaign context",
      cause: "Website scraping or evidence collection did not return data",
      evidence: "website_evidence_missing",
      severity: "medium",
      mitigation: "Verify website URL is correct and accessible, then re-run evidence collection"
    });
  }

  if (!hasSeoData) {
    risks.push({
      risk: "SEO opportunities may be missed without search data",
      cause: "No SEO intelligence collected",
      evidence: "seo_intelligence_missing",
      severity: "low",
      mitigation: "Run SEO intelligence analysis to identify organic growth opportunities"
    });
  }

  return risks;
}

function buildOpportunities(context) {
  const { product, company, website, audience, competitors, seo } = context;
  const opportunities = [];

  const hasSeoData = !!(seo?.keywords?.value?.length || seo?.issues?.value?.length);
  const hasAudienceData = !!(audience?.primary?.value || audience?.personas?.value?.length);
  const hasCompetitorData = !!(competitors?.list?.value?.length);
  const hasProductData = !!(product.usp?.value || product.features?.value?.length);

  if (hasSeoData) {
    const keywords = seo?.keywords?.value?.slice(0, 3).map(k => k.keyword || k).filter(Boolean) || [];
    if (keywords.length > 0) {
      opportunities.push({
        opportunity: `Target SEO keywords: ${keywords.join(", ")}`,
        reason: "Keywords identified in SEO analysis with verified search potential",
        evidence: "seo_keyword_intelligence",
        effort: "medium",
        priority: "high",
        expectedBusinessImpact: "Increased organic traffic and search visibility"
      });
    }
  }

  if (hasAudienceData && audience?.primary?.value) {
    opportunities.push({
      opportunity: `Build targeted campaigns for ${audience.primary.value}`,
      reason: "Audience segments identified with defined pain points and preferences",
      evidence: "audience_intelligence",
      effort: "medium",
      priority: "high",
      expectedBusinessImpact: "Improved campaign relevance and conversion rates"
    });
  }

  if (hasProductData) {
    opportunities.push({
      opportunity: `Content marketing around product USP: ${product.usp?.value || "differentiated features"}`,
      reason: "Product USPs and features identified for compelling content creation",
      evidence: "product_intelligence",
      effort: "medium",
      priority: "high",
      expectedBusinessImpact: "Stronger brand positioning and customer acquisition"
    });
  }

  if (hasCompetitorData && competitors?.list?.value?.length > 0) {
    opportunities.push({
      opportunity: `Competitive differentiation against ${competitors.list.value[0]?.name || "identified competitors"}`,
      reason: "Competitors identified — opportunity to capture untapped market segments",
      evidence: "competitor_intelligence",
      effort: "medium",
      priority: "medium",
      expectedBusinessImpact: "Stronger competitive position and market share growth"
    });
  }

  return opportunities;
}

function buildNextActions(context) {
  const { product, company, website, audience, competitors, seo } = context;
  const actions = [];

  const hasAudienceData = !!(audience?.primary?.value || audience?.personas?.value?.length);
  const hasSeoData = !!(seo?.keywords?.value?.length || seo?.issues?.value?.length);
  const hasProductData = !!(product.usp?.value || product.features?.value?.length);
  const hasCompetitorData = !!(competitors?.list?.value?.length);

  if (!hasAudienceData) {
    actions.push({ action: "Run audience intelligence analysis", owner: "Marketing Operations", priority: "high", evidence: "required_for_targeting" });
  }
  if (!hasProductData) {
    actions.push({ action: "Complete product analysis with USP identification", owner: "Product Marketing", priority: "high", evidence: "required_for_messaging" });
  }
  if (!hasSeoData) {
    actions.push({ action: "Run SEO intelligence analysis", owner: "SEO Specialist", priority: "medium", evidence: "required_for_organic_growth" });
  }
  if (!hasCompetitorData) {
    actions.push({ action: "Run competitor intelligence analysis", owner: "Competitive Intelligence", priority: "medium", evidence: "required_for_positioning" });
  }

  actions.push({ action: "Set up measurement infrastructure for campaign KPIs", owner: "Marketing Operations", priority: "high", evidence: "required_for_all_kpis" });
  actions.push({ action: "Create content calendar for first 30 days", owner: "Content Manager", priority: "high", evidence: "channel_recommendations" });
  actions.push({ action: "Review and approve campaign plan", owner: "Marketing Director", priority: "high", evidence: "campaign_intelligence_complete" });

  return actions;
}
