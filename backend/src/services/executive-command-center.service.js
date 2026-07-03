/**
 * Executive Command Center — aggregates all analysis results into a unified executive dashboard
 */

function asArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'object') return Object.values(v).filter(Boolean);
  return [v];
}

function asNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asText(v, fallback = '') {
  if (v == null) return fallback;
  if (typeof v === 'string') return v.trim() || fallback;
  if (typeof v === 'object') return v.title || v.name || v.opportunity || v.risk || v.keyword || fallback;
  return String(v);
}

function calcGrowthScore(chat) {
  const pi = chat.productIntelligence || {};
  const ci = chat.competitorIntelligence || {};
  const camp = chat.campaignIntelligence || {};
  const scores = [
    pi.productAnalysis?.confidenceScore,
    pi.marketDiscovery?.confidenceScore,
    pi.audienceIntelligence?.confidenceScore,
    ci.competitorAnalysis?.confidenceScore,
    camp.campaignGenerator?.confidenceScore,
  ].filter(s => s != null);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}

function scoreToGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  return 'C';
}

function trendFromScore(score) {
  if (score >= 75) return { direction: 'up', trendLabel: '+8% vs benchmark', confidence: 'high' };
  if (score >= 55) return { direction: 'stable', trendLabel: 'Stable trajectory', confidence: 'medium' };
  return { direction: 'down', trendLabel: 'Needs attention', confidence: 'low' };
}

function priorityColor(priority) {
  const p = String(priority || '').toLowerCase();
  if (p === 'high' || p === 'critical') return 'high';
  if (p === 'medium') return 'medium';
  return 'low';
}

export function buildExecutiveDashboard(chat) {
  const pi = chat.productIntelligence || {};
  const ci = chat.competitorIntelligence || {};
  const camp = chat.campaignIntelligence || {};
  const seo = chat.seoIntelligence || {};
  const input = pi.inputJson || {};

  const growthScore = calcGrowthScore(chat);
  const seoScore = asNum(seo.seoScore, 0);
  const geo = seo.geoIntelligence || {};
  const aiVisibility = asNum(geo.aiVisibilityScore, 0);
  const marketDiscovery = pi.marketDiscovery || {};
  const demandScore = asNum(marketDiscovery.demandScore, 0);
  const brandAuthority = asNum(seo.scoreBreakdown?.authorityScore, 0);
  const competitiveStrength = Math.max(0, 100 - asNum(
    (seo.competitorSeoRecord?.competitorMatrix || []).reduce((s, c) => s + asNum(c.overallThreatScore, 0), 0) /
    Math.max(1, (seo.competitorSeoRecord?.competitorMatrix || []).length),
    50
  ));
  const conversionPotential = Math.round((demandScore * 0.4 + growthScore * 0.35 + aiVisibility * 0.25));
  const marketOpportunity = Math.min(100, Math.round(demandScore * 0.6 + (asArray(marketDiscovery.growthOpportunities).length * 5)));

  const contentScore = asNum(seo.scoreBreakdown?.contentScore, 0);
  const positioningScore = asNum(ci.positioningEngine?.confidenceScore, 0);

  const healthComponents = {
    seo: seoScore || 0,
    growth: growthScore || 0,
    content: contentScore,
    authority: brandAuthority,
    aiVisibility,
    competition: competitiveStrength,
    demand: demandScore,
    positioning: positioningScore,
  };

  const healthScore = Math.round(
    Object.values(healthComponents).reduce((a, b) => a + b, 0) / Object.keys(healthComponents).length
  );

  const globalKpis = [
    { key: 'growthScore', label: 'Growth Score', value: growthScore, ...trendFromScore(growthScore), explanation: 'Composite confidence across product, market, audience, and campaign modules.' },
    { key: 'seoScore', label: 'SEO Score', value: seoScore, ...trendFromScore(seoScore), explanation: 'Technical, on-page, content, and authority SEO performance.' },
    { key: 'aiVisibility', label: 'AI Visibility', value: aiVisibility, ...trendFromScore(aiVisibility), explanation: 'Visibility across ChatGPT, Gemini, Claude, Perplexity, and AI Overviews.' },
    { key: 'marketOpportunity', label: 'Market Opportunity', value: marketOpportunity, ...trendFromScore(marketOpportunity), explanation: 'Demand signals and expansion opportunities in your market.' },
    { key: 'brandAuthority', label: 'Brand Authority', value: brandAuthority, ...trendFromScore(brandAuthority), explanation: 'Domain authority, backlinks, and brand trust signals.' },
    { key: 'competitiveStrength', label: 'Competitive Strength', value: competitiveStrength, ...trendFromScore(competitiveStrength), explanation: 'Your position relative to tracked competitors.' },
    { key: 'conversionPotential', label: 'Conversion Potential', value: conversionPotential, ...trendFromScore(conversionPotential), explanation: 'Likelihood of converting demand into revenue.' },
    { key: 'customerDemand', label: 'Customer Demand', value: demandScore, ...trendFromScore(demandScore), explanation: 'Market demand intensity for your product category.' },
  ];

  const marketRadar = {
    dimensions: ['SEO', 'Authority', 'Content', 'Audience', 'Competition', 'Positioning', 'AI Search', 'Growth'],
    values: [
      seoScore || 0,
      brandAuthority,
      contentScore,
      asNum(pi.audienceIntelligence?.confidenceScore, 0),
      competitiveStrength,
      positioningScore,
      aiVisibility,
      growthScore || 60,
    ],
  };

  const growthCompetitors = asArray(ci.competitorAnalysis?.directCompetitors || ci.competitorAnalysis?.competitors);
  const seoCompetitors = asArray(seo.competitorSeoRecord?.competitorMatrix);
  const competitorWarRoom = buildCompetitorWarRoom(growthCompetitors, seoCompetitors, {
    name: input.companyName || chat.productName || 'You',
    authority: brandAuthority,
    keywords: asNum(seo.keywordIntelligence?.totalKeywords, 0),
    traffic: asNum(seo.keywordIntelligence?.estimatedTraffic, 0),
    aiVisibility,
    content: contentScore,
    trust: brandAuthority,
    marketPosition: positioningScore,
  });

  const opportunities = buildOpportunities(chat);
  const risks = buildRisks(chat);
  const insights = buildCopilotInsights(chat, { growthScore, seoScore, aiVisibility, bestChannel: camp.channelRecommendation?.primaryChannel });
  const roadmap = buildRoadmap(chat, opportunities);
  const seoV2 = buildSeoV2(seo);
  const growthV2 = buildGrowthV2(chat, { growthScore, demandScore, conversionPotential });

  return {
    project: {
      id: chat.id,
      title: chat.title,
      productName: chat.productName || input.productName,
      companyName: input.companyName,
      website: input.websiteUrl,
      industry: input.industry,
      updatedAt: chat.updatedAt,
      createdAt: chat.createdAt,
    },
    globalKpis,
    businessHealth: {
      score: healthScore,
      grade: scoreToGrade(healthScore),
      components: healthComponents,
    },
    marketRadar,
    competitorWarRoom,
    opportunityHeatmap: opportunities.map(o => ({
      ...o,
      color: priorityColor(o.priority),
    })),
    aiCopilotInsights: insights,
    timelineRoadmap: roadmap,
    executiveSummary: {
      headline: `${input.productName || chat.title || 'Project'} — Executive Overview`,
      growthScore,
      seoScore,
      healthGrade: scoreToGrade(healthScore),
      bestChannel: asText(camp.channelRecommendation?.primaryChannel || pi.audienceIntelligence?.bestChannels?.[0], 'LinkedIn'),
      topOpportunity: opportunities[0]?.title || 'Market expansion',
      topRisk: risks[0]?.title || 'Competitive pressure',
      nextAction: roadmap.immediate?.[0]?.task || 'Complete full platform analysis',
    },
    opportunityCenter: opportunities.slice(0, 8),
    riskCenter: risks.slice(0, 6),
    aiRecommendations: insights.filter(i => i.type === 'recommendation').slice(0, 6),
    marketIntelligence: {
      marketSize: asText(marketDiscovery.marketSizeEstimate, 'Growing segment'),
      demandScore,
      trends: asArray(marketDiscovery.marketTrends).slice(0, 5),
      opportunities: asArray(marketDiscovery.growthOpportunities).slice(0, 5),
      threats: asArray(marketDiscovery.marketRisks).slice(0, 4),
    },
    seoIntelligence: {
      score: seoScore,
      technical: asNum(seo.scoreBreakdown?.technicalScore, 0),
      keywords: asNum(seo.keywordIntelligence?.totalKeywords, 0),
      gaps: asArray(seo.contentGapRecord?.contentGaps).length,
      aiVisibility,
      v2: seoV2,
    },
    growthIntelligence: {
      score: growthScore,
      personas: asArray(pi.audienceIntelligence?.buyerPersonas).length,
      channels: asArray(camp.channelRecommendation?.recommendedChannels).length,
      campaigns: asArray(camp.campaignGenerator?.campaignIdeas).length,
      v2: growthV2,
    },
    competitorIntelligence: {
      count: Math.max(growthCompetitors.length, seoCompetitors.length),
      warRoom: competitorWarRoom,
      differentiation: asArray(ci.competitorAnalysis?.differentiationOpportunities).slice(0, 4),
    },
    actionCenter: buildActionCenter(chat, opportunities, risks),
    customerJourney: growthV2.customerJourney,
    acquisitionFunnel: growthV2.acquisitionFunnel,
    keywordClusters: seoV2.topicClusters,
    aiVisibilityMatrix: seoV2.aiVisibilityMatrix,
    generatedAt: new Date().toISOString(),
  };
}

function buildCompetitorWarRoom(growthCompetitors, seoCompetitors, you) {
  const metrics = ['authority', 'keywords', 'traffic', 'aiVisibility', 'content', 'trust', 'marketPosition'];
  const labels = ['Authority', 'Keywords', 'Traffic', 'AI Visibility', 'Content', 'Trust', 'Market Position'];

  const competitors = [];
  for (let i = 0; i < 3; i++) {
    const gc = growthCompetitors[i];
    const sc = seoCompetitors[i];
    const name = asText(gc?.name || sc?.name, `Competitor ${i + 1}`);
    competitors.push({
      name,
      authority: asNum(sc?.authorityStrength || gc?.seoVisibility, 0),
      keywords: asNum(sc?.keywordStrength, 0),
      traffic: asNum(sc?.estimatedTraffic, 0),
      aiVisibility: asNum(gc?.aiVisibility || sc?.aiVisibility, 0),
      content: asNum(sc?.contentStrength, 0),
      trust: asNum(sc?.trustScore, 0),
      marketPosition: asNum(sc?.overallThreatScore, 0),
    });
  }

  return {
    metrics,
    labels,
    you,
    competitors,
  };
}

function buildOpportunities(chat) {
  const items = [];
  const pi = chat.productIntelligence || {};
  const seo = chat.seoIntelligence || {};

  asArray(pi.marketDiscovery?.growthOpportunities).forEach((o, i) => {
    items.push({
      id: `mkt-${i}`,
      title: asText(o.opportunity || o, 'Market opportunity'),
      impact: o.impact || 'high',
      difficulty: o.effort || 'medium',
      roi: o.roi || 'high',
      time: o.timeframe || '30-60 days',
      priority: o.priority || 'high',
      category: 'market',
      recommendation: asText(o.action, 'Pursue this market segment'),
      confidence: 'medium',
    });
  });

  asArray(seo.keywordIntelligence?.contentOpportunities).slice(0, 5).forEach((o, i) => {
    items.push({
      id: `kw-${i}`,
      title: asText(o.pageSuggestion || o.keyword, 'Keyword opportunity'),
      impact: o.impact || 'medium',
      difficulty: o.difficulty || 'medium',
      roi: 'high',
      time: '14-30 days',
      priority: o.impact === 'high' ? 'high' : 'medium',
      category: 'seo',
      recommendation: asText(o.reason, 'Create targeted content'),
      confidence: 'high',
    });
  });

  asArray(seo.contentGapRecord?.contentGaps).filter(g => g.priority === 'critical' || g.priority === 'high').slice(0, 4).forEach((g, i) => {
    items.push({
      id: `cg-${i}`,
      title: asText(g.title, 'Content gap'),
      impact: 'high',
      difficulty: g.estimatedImpact?.effort || 'medium',
      roi: 'high',
      time: '7-21 days',
      priority: g.priority || 'high',
      category: 'content',
      recommendation: asText(g.suggestedAction, 'Fill this content gap'),
      confidence: 'high',
    });
  });

  return items.sort((a, b) => {
    const w = { high: 3, medium: 2, low: 1 };
    return (w[b.priority] || 1) - (w[a.priority] || 1);
  }).slice(0, 12);
}

function buildRisks(chat) {
  const items = [];
  const pi = chat.productIntelligence || {};
  const ci = chat.competitorIntelligence || {};

  asArray(pi.marketDiscovery?.marketRisks).forEach((r, i) => {
    items.push({
      id: `risk-mkt-${i}`,
      title: asText(r.risk || r, 'Market risk'),
      severity: r.severity || 'medium',
      impact: r.impact || 'Revenue and growth trajectory',
      mitigation: asText(r.mitigation, 'Monitor and develop counter-strategy'),
      confidence: 'medium',
    });
  });

  asArray(ci.competitorAnalysis?.threats).forEach((t, i) => {
    items.push({
      id: `risk-comp-${i}`,
      title: asText(t.threat || t, 'Competitive threat'),
      severity: 'high',
      impact: 'Market share and positioning',
      mitigation: asText(t.response, 'Differentiate on unique value'),
      confidence: 'high',
    });
  });

  if (!items.length) {
    items.push({
      id: 'risk-default',
      title: 'Incomplete analysis coverage',
      severity: 'medium',
      impact: 'Blind spots in strategic planning',
      mitigation: 'Run full Growth Workspace and SEO Intelligence analyses',
      confidence: 'high',
    });
  }

  return items;
}

function buildCopilotInsights(chat, scores) {
  const insights = [];
  const camp = chat.campaignIntelligence || {};
  const seo = chat.seoIntelligence || {};
  const channel = asText(camp.channelRecommendation?.primaryChannel, 'LinkedIn');

  if (scores.growthScore >= 70) {
    insights.push({ type: 'insight', text: `Your strongest growth opportunity is ${channel}.`, confidence: 'high', impact: 'high' });
  } else {
    insights.push({ type: 'recommendation', text: `Focus on ${channel} while completing remaining growth modules.`, confidence: 'medium', impact: 'medium' });
  }

  if (scores.seoScore >= scores.aiVisibility + 10) {
    insights.push({ type: 'insight', text: 'Your SEO authority is outperforming competitors.', confidence: 'high', impact: 'high' });
  }

  const gapCount = asArray(seo.contentGapRecord?.contentGaps).length;
  if (gapCount > 3) {
    const pct = Math.min(40, gapCount * 5);
    insights.push({ type: 'insight', text: `Your content gap is costing approximately ${pct}% potential traffic.`, confidence: 'medium', impact: 'high' });
  }

  if (scores.aiVisibility < 60) {
    insights.push({ type: 'insight', text: 'AI search visibility is below industry average.', confidence: 'high', impact: 'high' });
  }

  insights.push({
    type: 'recommendation',
    text: 'Prioritize high-impact, low-difficulty opportunities in the Action Center.',
    confidence: 'high',
    impact: 'medium',
  });

  return insights;
}

function buildRoadmap(chat, opportunities) {
  const phases = {
    immediate: [],
    day7: [],
    day30: [],
    day60: [],
    day90: [],
    day180: [],
  };

  opportunities.slice(0, 2).forEach(o => {
    phases.immediate.push({
      task: o.title,
      expectedResult: o.recommendation,
      estimatedImpact: o.impact,
      difficulty: o.difficulty,
    });
  });

  const seo = chat.seoIntelligence || {};
  asArray(seo.contentGapRecord?.contentCalendar?.day30).slice(0, 3).forEach(item => {
    phases.day30.push({
      task: `Create: ${asText(item.contentTitle, 'Content piece')}`,
      expectedResult: 'Improved keyword coverage',
      estimatedImpact: 'medium',
      difficulty: 'medium',
    });
  });

  phases.day7.push({
    task: 'Audit top 5 landing pages for conversion',
    expectedResult: 'Baseline conversion metrics',
    estimatedImpact: 'medium',
    difficulty: 'low',
  });

  phases.day60.push({
    task: 'Launch content cluster for primary keyword theme',
    expectedResult: '+15-25% organic visibility',
    estimatedImpact: 'high',
    difficulty: 'medium',
  });

  phases.day90.push({
    task: 'Expand into secondary market segment',
    expectedResult: 'New audience pipeline',
    estimatedImpact: 'high',
    difficulty: 'high',
  });

  phases.day180.push({
    task: 'Full competitive repositioning review',
    expectedResult: 'Updated market leadership strategy',
    estimatedImpact: 'high',
    difficulty: 'high',
  });

  return phases;
}

function buildSeoV2(seo) {
  const kw = seo.keywordIntelligence || {};
  const geo = seo.geoIntelligence || {};
  const gaps = seo.contentGapRecord || {};

  return {
    keywordCannibalization: asArray(kw.cannibalizationIssues || kw.keywordCannibalization).slice(0, 5),
    topicClusters: asArray(kw.topicClusters || kw.clusters).slice(0, 6),
    serpAnalysis: asArray(kw.serpAnalysis || kw.serpFeatures).slice(0, 5),
    featuredSnippetOpportunities: asArray(kw.featuredSnippetOpportunities || kw.snippetOpportunities).slice(0, 5),
    paaOpportunities: asArray(kw.peopleAlsoAsk || gaps.faqOpportunities).slice(0, 5),
    backlinkOpportunities: asArray(seo.competitorSeoRecord?.backlinkOpportunities).slice(0, 5),
    internalLinkOpportunities: asArray(kw.internalLinkOpportunities).slice(0, 5),
    entityOptimization: asArray(geo.entityRecommendations || geo.entities).slice(0, 5),
    knowledgeGraphReadiness: {
      score: asNum(geo.knowledgeGraphReadinessScore, 50),
      recommendations: asArray(geo.kgRecommendations).slice(0, 3),
    },
    brandMentionAnalysis: asArray(geo.brandMentions || seo.brandMentions).slice(0, 5),
    aiVisibilityMatrix: {
      platforms: ['ChatGPT', 'Gemini', 'Claude', 'Perplexity', 'AI Overview'],
      scores: [
        asNum(geo.chatGptScore, 50),
        asNum(geo.geminiScore, 50),
        asNum(geo.claudeScore, 50),
        asNum(geo.perplexityScore, 50),
        asNum(geo.googleAiOverviewScore, 50),
      ],
    },
  };
}

function buildGrowthV2(chat, scores) {
  const pi = chat.productIntelligence || {};
  const camp = chat.campaignIntelligence || {};

  return {
    customerJourney: [
      { stage: 'Awareness', score: Math.round(scores.demandScore * 0.9), actions: ['Content marketing', 'Social ads'] },
      { stage: 'Consideration', score: Math.round(scores.growthScore * 0.85), actions: ['Case studies', 'Webinars'] },
      { stage: 'Decision', score: scores.conversionPotential, actions: ['Free trial', 'Demo calls'] },
      { stage: 'Retention', score: Math.round(scores.growthScore * 0.8), actions: ['Email nurture', 'Upsell'] },
    ],
    acquisitionFunnel: [
      { stage: 'Visitors', value: 10000, conversion: 100 },
      { stage: 'Leads', value: 2500, conversion: 25 },
      { stage: 'MQLs', value: 750, conversion: 30 },
      { stage: 'SQLs', value: 225, conversion: 30 },
      { stage: 'Customers', value: 68, conversion: 30 },
    ],
    revenueOpportunity: {
      estimate: `$${Math.round(scores.conversionPotential * 1200)}`,
      confidence: scores.conversionPotential >= 70 ? 'high' : 'medium',
    },
    marketPenetrationScore: Math.min(100, Math.round(scores.demandScore * 0.7)),
    audienceExpansion: asArray(pi.marketDiscovery?.expansionMarkets).slice(0, 4),
    growthForecast: {
      day30: `+${Math.round(scores.growthScore * 0.08)}%`,
      day60: `+${Math.round(scores.growthScore * 0.15)}%`,
      day90: `+${Math.round(scores.growthScore * 0.22)}%`,
    },
    predictiveAnalytics: {
      churnRisk: scores.demandScore < 60 ? 'medium' : 'low',
      expansionLikelihood: scores.growthScore >= 70 ? 'high' : 'medium',
    },
  };
}

function buildActionCenter(chat, opportunities, risks) {
  const actions = opportunities.slice(0, 5).map(o => ({
    task: o.title,
    priority: o.priority,
    impact: o.impact,
    difficulty: o.difficulty,
    category: o.category,
    confidence: o.confidence,
  }));

  const camp = chat.campaignIntelligence || {};
  asArray(camp.campaignGenerator?.nextActions).slice(0, 2).forEach(a => {
    actions.push({
      task: asText(a.action || a, 'Campaign action'),
      priority: 'high',
      impact: 'high',
      difficulty: 'medium',
      category: 'campaign',
      confidence: 'high',
    });
  });

  return { actions, riskMitigations: risks.slice(0, 3).map(r => ({ risk: r.title, mitigation: r.mitigation })) };
}

export default { buildExecutiveDashboard };
