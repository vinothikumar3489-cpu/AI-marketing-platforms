export function buildSEOReport({
  identity,
  technicalAudit,
  keywordIntelligence,
  competitorIntelligence,
  geoIntelligence,
  contentGapIntelligence,
  blogIntelligence,
  searchConsoleData,
  searchConsole,
  serpFeatures,
  peopleAlsoAsk,
  trendAnalysis,
  providers,
  pageSpeed,
  crux
}) {
  const scData = searchConsoleData || searchConsole;
  const overallScore = calculateOverallScore({
    technicalAudit,
    keywordIntelligence,
    geoIntelligence,
    competitorIntelligence
  });

  const technicalScore = extractScore(technicalAudit, 'overallScore');
  const contentScore = calculateContentScore(keywordIntelligence, contentGapIntelligence);
  const performanceScore = extractScore(technicalAudit, 'performanceScore') || pageSpeed?.mobile?.performance || null;
  const accessibilityScore = extractScore(technicalAudit, 'accessibilityScore') || pageSpeed?.mobile?.accessibility || null;
  const bestPracticesScore = extractScore(technicalAudit, 'bestPracticesScore') || pageSpeed?.mobile?.bestPractices || null;
  const coreWebVitals = extractCoreWebVitals(technicalAudit, pageSpeed);
  const keywordOpportunities = buildKeywordOpportunities(keywordIntelligence);
  const serpFeaturesData = serpFeatures || [];
  let competitors = competitorIntelligence?.competitorProfiles || [];
  if (competitors.length === 0 && competitorIntelligence?.competitors?.length > 0) {
    competitors = competitorIntelligence.competitors.map(c => ({
      name: c.name,
      domain: c.domain,
      type: c.type || 'direct',
      relevance: c.relevance || 50,
      estimatedTraffic: null,
      seoAuthority: null,
      topKeywordOverlap: [],
      source: 'COMPETITOR_INTELLIGENCE',
      validation: 'ESTIMATED',
      confidence: 'MEDIUM',
    }));
  }
  const paak = peopleAlsoAsk || [];
  const trends = trendAnalysis || {};

  const crawlabilityScore = calculateCrawlabilityScore(technicalAudit);
  const metadataScore = calculateMetadataScore(technicalAudit);
  const internalLinkingScore = calculateInternalLinkingScore(technicalAudit);
  const schemaScore = calculateSchemaScore(technicalAudit);

  const confidence = calculateConfidence({
    technicalAudit,
    keywordIntelligence,
    geoIntelligence,
    providers,
    pageSpeed
  });

  const report = {
    overallScore,
    overallRating: scoreToRating(overallScore),
    technicalScore,
    technicalRating: scoreToRating(technicalScore),
    contentScore,
    contentRating: scoreToRating(contentScore),
    performanceScore,
    performanceRating: scoreToRating(performanceScore),
    accessibilityScore,
    accessibilityRating: scoreToRating(accessibilityScore),
    bestPracticesScore,
    bestPracticesRating: scoreToRating(bestPracticesScore),
    crawlabilityScore,
    crawlabilityRating: scoreToRating(crawlabilityScore),
    metadataScore,
    metadataRating: scoreToRating(metadataScore),
    internalLinkingScore,
    internalLinkingRating: scoreToRating(internalLinkingScore),
    schemaScore,
    schemaRating: scoreToRating(schemaScore),
    coreWebVitals,
    keywordOpportunities,
    serpFeatures: serpFeaturesData,
    competitorsSummary: {
      total: competitors.length || 0,
      direct: competitors.filter(c => c.competitorType === 'direct' || c.relevanceScore >= 70).length,
      list: competitors.slice(0, 10).map(c => ({
        name: c.name || c.domain,
        domain: c.domain,
        type: c.competitorType || 'unknown',
        relevance: c.relevanceScore || 0,
        estimatedTraffic: c.estimatedTraffic || null,
        seoAuthority: c.seoAuthority || c.estimatedAuthority || null,
        topKeywordOverlap: (c.sharedKeywords || c.keywordOverlap || []).slice(0, 5)
      }))
    },
    searchIntent: keywordIntelligence?.metadata?.searchIntent || detectSearchIntent(keywordIntelligence),
    contentGaps: buildContentGapSummary(contentGapIntelligence, keywordIntelligence),
    recommendations: buildRecommendations({
      technicalAudit,
      keywordIntelligence,
      competitorIntelligence,
      geoIntelligence,
      contentGapIntelligence,
      pageSpeed,
      performanceScore,
      contentScore,
      metadataScore,
      crawlabilityScore,
      internalLinkingScore,
      schemaScore
    }),
    searchConsole: scData ? {
      clicks: scData.clicks ?? null,
      impressions: scData.impressions ?? null,
      ctr: scData.ctr ?? null,
      avgPosition: scData.avgPosition ?? null,
      topQueries: (scData.topQueries || []).slice(0, 10),
      topPages: (scData.topPages || []).slice(0, 10),
      countries: scData.countries || [],
      devices: scData.devices || [],
      source: 'Google Search Console',
      status: 'measured'
    } : searchConsole?.status === 'NOT_APPLICABLE' ? {
      status: 'NOT_APPLICABLE',
      reason: 'No connected Search Console property matches this website'
    } : {
      status: 'NOT_AVAILABLE',
      reason: 'Connect Google Search Console for click, impression, and CTR data',
      suggestion: 'Set up Search Console integration in Settings > Integrations'
    },
    peopleAlsoAsk: paak.slice(0, 10),
    trendAnalysis: {
      direction: trends.direction || 'stable',
      momentum: trends.momentum || 0,
      seasonality: trends.seasonality || null,
      recentData: (trends.interest || []).slice(-6),
      note: trends.direction ? 'Based on keyword trend analysis' : 'Connect keyword data source for trend analysis'
    },
    pagespeed: pageSpeed ? {
      mobile: pageSpeed.mobile ? {
        performance: pageSpeed.mobile.performance ?? null,
        accessibility: pageSpeed.mobile.accessibility ?? null,
        bestPractices: pageSpeed.mobile.bestPractices ?? null,
        seo: pageSpeed.mobile.seo ?? null
      } : null,
      desktop: pageSpeed.desktop ? {
        performance: pageSpeed.desktop.performance ?? null,
        accessibility: pageSpeed.desktop.accessibility ?? null,
        bestPractices: pageSpeed.desktop.bestPractices ?? null,
        seo: pageSpeed.desktop.seo ?? null
      } : null,
      source: 'Google PageSpeed Insights',
      measuredAt: pageSpeed.measuredAt || null,
      status: pageSpeed ? 'measured' : 'unavailable'
    } : { status: 'MEASUREMENT_PENDING', note: 'Run SEO audit to capture PageSpeed scores' },
    crux: crux || { status: 'UNAVAILABLE', note: 'Chrome UX Report data requires CrUX API key' },
    aiVisibility: buildAIVisibility(geoIntelligence),
    confidence,
    confidenceLabel: confidence >= 80 ? 'Measured' : confidence >= 60 ? 'High Confidence' : confidence >= 40 ? 'Estimated' : 'Limited',
    providers: providers || {},
    retrievedAt: new Date().toISOString(),
    status: 'completed'
  };

  return report;
}

function calculateOverallScore(data) {
  const scores = [];
  if (data.technicalAudit?.overallScore != null) scores.push(data.technicalAudit.overallScore);
  if (data.technicalAudit?.scores?.overall != null) scores.push(data.technicalAudit.scores.overall);
  if (data.keywordIntelligence?.metadata?.totalKeywords != null) scores.push(Math.min(data.keywordIntelligence.metadata.totalKeywords * 5, 100));
  if (data.geoIntelligence?.aiVisibilityScore != null) scores.push(data.geoIntelligence.aiVisibilityScore);
  if (data.competitorIntelligence?.metadata?.totalCompetitors != null) scores.push(Math.min(data.competitorIntelligence.metadata.totalCompetitors * 10, 100));

  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function extractScore(obj, field) {
  if (!obj) return null;
  if (obj[field] != null) return obj[field];
  if (obj.scores?.[field] != null) return obj.scores[field];
  if (obj.auditData?.scores?.[field] != null) return obj.auditData.scores[field];
  return null;
}

function calculateContentScore(keywordIntelligence, contentGapIntelligence) {
  let score = 0;
  let factors = 0;

  const kw = keywordIntelligence || {};
  const totalKW = kw.metadata?.totalKeywords || 0;
  if (totalKW > 0) {
    score += Math.min(totalKW * 3, 60);
    factors++;
  }

  const clusters = kw.metadata?.clustersCount || 0;
  if (clusters > 0) {
    score += Math.min(clusters * 10, 20);
    factors++;
  }

  const cg = contentGapIntelligence || {};
  const gaps = cg.contentGaps?.length || cg.summary?.totalGaps || 0;
  if (gaps > 0) {
    score += Math.min(gaps * 5, 20);
    factors++;
  }

  return factors > 0 ? Math.round(score / factors) : null;
}

function calculateCrawlabilityScore(technicalAudit) {
  if (!technicalAudit) return null;
  let score = 50;
  const issues = technicalAudit.issues || {};
  const crawlIssues = (issues.critical || []).filter(i =>
    /crawl|index|robots|sitemap|canonical/i.test(i.title || i.message || i)
  ).length;
  score -= crawlIssues * 10;
  if (technicalAudit.hasSitemap !== false) score += 15;
  if (technicalAudit.hasRobotsTxt !== false) score += 10;
  return Math.max(0, Math.min(100, score));
}

function calculateMetadataScore(technicalAudit) {
  if (!technicalAudit) return null;
  let score = 50;
  const issues = technicalAudit.issues || {};
  const metaIssues = (issues.critical || []).filter(i =>
    /title|meta|description|heading/i.test(i.title || i.message || i)
  ).length;
  score -= metaIssues * 15;
  if (technicalAudit.hasTitleTag) score += 20;
  if (technicalAudit.hasMetaDescription) score += 15;
  return Math.max(0, Math.min(100, score));
}

function calculateInternalLinkingScore(technicalAudit) {
  if (!technicalAudit) return null;
  let score = 50;
  const linkCount = technicalAudit.internalLinks?.length || 0;
  score += Math.min(linkCount * 5, 30);
  const brokenLinks = (technicalAudit.brokenLinks || []).length;
  score -= brokenLinks * 10;
  return Math.max(0, Math.min(100, score));
}

function calculateSchemaScore(technicalAudit) {
  if (!technicalAudit) return null;
  const schemas = technicalAudit.schemas || technicalAudit.structuredData || [];
  const schemaCount = Array.isArray(schemas) ? schemas.length : 0;
  return Math.min(schemaCount * 20, 100);
}

function extractCoreWebVitals(technicalAudit, pageSpeed) {
  const audit = technicalAudit?.auditData || technicalAudit || {};
  const lcp = audit.lcp || audit.coreWebVitals?.lcp || pageSpeed?.lcp || null;
  const fcp = audit.fcp || audit.coreWebVitals?.fcp || pageSpeed?.fcp || null;
  const tti = audit.tti || audit.coreWebVitals?.tti || null;
  const tbt = audit.tbt || audit.coreWebVitals?.tbt || null;
  const cls = audit.cls || audit.coreWebVitals?.cls || pageSpeed?.cls || null;
  const si = audit.si || audit.coreWebVitals?.si || null;

  const hasData = lcp || fcp || tti || tbt || cls || si;

  function evaluateLCP(val) { return val != null ? (val <= 2500 ? 'good' : val <= 4000 ? 'needs-improvement' : 'poor') : null; }
  function evaluateFCP(val) { return val != null ? (val <= 1800 ? 'good' : val <= 3000 ? 'needs-improvement' : 'poor') : null; }
  function evaluateCLS(val) { return val != null ? (val <= 0.1 ? 'good' : val <= 0.25 ? 'needs-improvement' : 'poor') : null; }

  return {
    lcp: { value: lcp, rating: evaluateLCP(lcp), unit: 'ms' },
    fcp: { value: fcp, rating: evaluateFCP(fcp), unit: 'ms' },
    tti: { value: tti, rating: tti != null ? (tti <= 3800 ? 'good' : tti <= 7300 ? 'needs-improvement' : 'poor') : null, unit: 'ms' },
    tbt: { value: tbt, rating: tbt != null ? (tbt <= 200 ? 'good' : tbt <= 600 ? 'needs-improvement' : 'poor') : null, unit: 'ms' },
    cls: { value: cls, rating: evaluateCLS(cls), unit: '' },
    si: { value: si, rating: si != null ? (si <= 3400 ? 'good' : si <= 5800 ? 'needs-improvement' : 'poor') : null, unit: 'ms' },
    source: hasData ? 'Measured' : 'Pending',
    status: hasData ? 'measured' : 'unavailable'
  };
}

function buildKeywordOpportunities(keywordIntelligence) {
  if (!keywordIntelligence) return [];

  const kw = keywordIntelligence;
  const opportunities = [];

  const primary = kw.primaryKeywords || [];
  const secondary = kw.secondaryKeywords || [];
  const longTail = kw.longTailKeywords || [];
  const questions = kw.questionKeywords || [];
  const transactional = kw.transactionalKeywords || [];
  const commercial = kw.commercialKeywords || [];

  const addOpportunity = (k, type, baseScore) => {
    const keyword = k.keyword || k;
    const categories = k.categories || [];
    const categoriesStr = Array.isArray(categories) ? categories.join(', ') : categories;
    opportunities.push({
      keyword,
      type,
      searchVolume: k.searchVolume || null,
      displayVolume: k.searchVolume ? `${k.searchVolume}` : 'Estimated',
      opportunityScore: k.relevanceScore || k.confidence || baseScore,
      intent: k.intent || classifyIntent(keyword),
      categories: categoriesStr || type,
      source: k.source || 'topic_idea',
      confidence: k.confidence ?? null,
      status: k.confidence ? 'measured' : 'estimated'
    });
  };

  for (const k of primary.slice(0, 10)) addOpportunity(k, 'primary', 70);
  for (const k of secondary.slice(0, 15)) addOpportunity(k, 'secondary', 50);
  for (const k of longTail.slice(0, 10)) addOpportunity(k, 'long_tail', 60);
  for (const k of questions.slice(0, 10)) addOpportunity(k, 'question', 55);
  if (transactional.length > 0) for (const k of transactional.slice(0, 5)) addOpportunity(k, 'transactional', 75);
  if (commercial.length > 0) for (const k of commercial.slice(0, 5)) addOpportunity(k, 'commercial', 65);

  return opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

function classifyIntent(keyword) {
  if (!keyword) return 'informational';
  const lower = keyword.toLowerCase();
  if (lower.startsWith('how') || lower.startsWith('what') || lower.startsWith('why')) return 'informational';
  if (lower.includes('buy') || lower.includes('price') || lower.includes('best') || lower.includes('top')) return 'commercial';
  if (lower.includes('vs') || lower.includes('versus') || lower.includes('compare')) return 'commercial';
  if (lower.includes('guide') || lower.includes('tutorial') || lower.includes('example')) return 'informational';
  if (lower.includes('sign') || lower.includes('login') || lower.includes('app')) return 'navigational';
  return 'informational';
}

function buildContentGapSummary(contentGapIntelligence, keywordIntelligence) {
  if (!contentGapIntelligence && !keywordIntelligence) return [];
  const cg = contentGapIntelligence || {};
  const kw = keywordIntelligence || {};
  let extracted = cg.contentGaps || [];
  if (extracted.length === 0) extracted = cg.contentGapAnalysis?.gaps || [];
  if (extracted.length === 0) extracted = cg.contentOpportunities || [];
  if (extracted.length === 0) extracted = kw.contentOpportunities || [];
  if (extracted.length === 0) return [];

  const gaps = extracted;
  return {
    totalGaps: gaps.length + (cg.summary?.totalGaps || 0),
    highPriority: gaps.filter(g => g.priority === 'high' || g.opportunityScore >= 80).length || 0,
    mediumPriority: gaps.filter(g => g.priority === 'medium' || (g.opportunityScore >= 50 && g.opportunityScore < 80)).length || 0,
    lowPriority: gaps.filter(g => g.priority === 'low' || g.opportunityScore < 50).length || 0,
    topGaps: gaps.slice(0, 5).map(g => ({
      title: g.title || g.gapType,
      type: g.gapType || g.contentType,
      opportunityScore: g.opportunityScore || 0,
      priority: g.priority || 'medium',
      estimatedImpact: g.opportunityScore >= 80 ? 'High' : g.opportunityScore >= 50 ? 'Medium' : 'Low'
    }))
  };
}

function buildAIVisibility(geoIntelligence) {
  const geo = geoIntelligence || {};
  const platforms = [
    { key: 'chatGptScore', label: 'ChatGPT', field: geo.chatGptScore ?? geo.chatGpt },
    { key: 'geminiScore', label: 'Gemini', field: geo.geminiScore ?? geo.gemini },
    { key: 'claudeScore', label: 'Claude', field: geo.claudeScore ?? geo.claude },
    { key: 'perplexityScore', label: 'Perplexity', field: geo.perplexityScore ?? geo.perplexity },
    { key: 'googleAiOverviewScore', label: 'Google AI Overview', field: geo.googleAiOverviewScore ?? geo.googleAiOverview }
  ];

  const scores = platforms.map(p => ({
    platform: p.label,
    score: p.field != null ? p.field : null,
    status: p.field != null ? 'measured' : 'pending'
  }));

  const validScores = scores.filter(s => s.score != null);
  const avgScore = validScores.length > 0
    ? Math.round(validScores.reduce((a, s) => a + s.score, 0) / validScores.length)
    : null;

  const llmScore = avgScore != null ? Math.round(avgScore * 0.85) : null;

  return {
    overallScore: avgScore,
    overallRating: scoreToRating(avgScore),
    platforms: scores,
    totalPlatformsMeasured: validScores.length,
    citationLikelihood: avgScore != null ? (avgScore >= 70 ? 'High' : avgScore >= 40 ? 'Medium' : 'Low') : null,
    citationReadiness: avgScore != null ? (avgScore >= 70 ? 85 : avgScore >= 40 ? 55 : 25) : null,
    entityConfidence: avgScore != null ? (avgScore >= 70 ? 'Strong' : avgScore >= 40 ? 'Moderate' : 'Weak') : null,
    llmDiscoverability: llmScore,
    aiDiscoverabilityScore: llmScore,
    knowledgeGraphReadiness: avgScore != null ? Math.round(avgScore * 0.75 + 10) : 30,
    recommendations: avgScore != null && avgScore < 50 ? [
      'Create authoritative, citeable content with clear entity definitions',
      'Implement structured data (Schema.org) for better AI comprehension',
      'Build topical authority clusters for improved LLM recognition',
      'Earn citations from high-authority domains in your industry'
    ] : avgScore != null && avgScore < 70 ? [
      'Continue building topical authority with comprehensive content clusters',
      'Strengthen entity signals with structured data and internal linking'
    ] : avgScore != null ? [
      'Maintain current AI visibility through consistent content publishing'
    ] : [
      'Run GEO analysis to measure AI platform visibility',
      'Implement structured data and entity markup for AI comprehension'
    ],
    status: validScores.length > 0 ? 'measured' : 'MEASUREMENT_PENDING'
  };
}

function detectSearchIntent(keywordIntelligence) {
  const kw = keywordIntelligence || {};
  const all = [
    ...(kw.primaryKeywords || []),
    ...(kw.secondaryKeywords || []),
    ...(kw.longTailKeywords || [])
  ];
  const intents = all.map(k => classifyIntent(k.keyword || k));
  const commercial = intents.filter(i => i === 'commercial').length;
  const informational = intents.filter(i => i === 'informational').length;
  if (commercial > informational) return 'commercial';
  if (informational > commercial) return 'informational';
  return 'mixed';
}

function buildRecommendations(data) {
  const recs = [];

  const deriveOwner = (area) => {
    const map = {
      technical: 'Engineering',
      performance: 'Engineering',
      keywords: 'Content',
      competitors: 'Marketing',
      geo: 'SEO',
      content: 'Content',
      metadata: 'SEO',
      crawlability: 'Engineering',
      linking: 'SEO',
      schema: 'SEO'
    };
    return map[area] || 'SEO';
  };

  const deriveDifficulty = (priority, area) => {
    if (area === 'technical' || area === 'performance' || area === 'crawlability') {
      if (priority === 'critical') return 'Hard';
      if (priority === 'high') return 'Medium';
      return 'Easy';
    }
    if (area === 'keywords' || area === 'content' || area === 'competitors') {
      return 'Medium';
    }
    if (area === 'schema' || area === 'metadata' || area === 'linking') {
      return 'Easy';
    }
    return 'Medium';
  };

  const addRec = (rec) => {
    recs.push({
      ...rec,
      difficulty: deriveDifficulty(rec.priority, rec.area),
      owner: deriveOwner(rec.area)
    });
  };

  const ta = data.technicalAudit || {};
  if (ta.issues?.critical?.length > 0) {
    addRec({ priority: 'critical', area: 'technical', message: `Fix ${ta.issues.critical.length} critical technical issues immediately`, impact: 'Blocks search indexing and ranking', estimatedEffort: '1-3 days', estimatedImpact: 'High - critical for visibility' });
  }
  if (ta.overallScore != null && ta.overallScore < 60) {
    addRec({ priority: 'high', area: 'technical', message: 'Improve overall technical SEO score', impact: 'Directly affects crawl efficiency and ranking potential', estimatedEffort: '1-2 weeks', estimatedImpact: 'High - foundational improvement' });
  }
  if (data.performanceScore != null && data.performanceScore < 50) {
    addRec({ priority: 'critical', area: 'performance', message: 'Critical PageSpeed score — optimize Core Web Vitals', impact: 'Google uses CWV as ranking factor; poor scores hurt rankings', estimatedEffort: '2-4 weeks', estimatedImpact: 'Critical - ranking factor' });
  } else if (data.performanceScore != null && data.performanceScore < 70) {
    addRec({ priority: 'high', area: 'performance', message: 'Improve PageSpeed to 70+ for better user experience and rankings', impact: 'Impacts bounce rate and mobile rankings', estimatedEffort: '1-2 weeks', estimatedImpact: 'High - UX and SEO' });
  } else if (data.performanceScore != null && data.performanceScore < 90) {
    addRec({ priority: 'medium', area: 'performance', message: 'Fine-tune performance to reach 90+ score', impact: 'Competitive advantage in mobile search', estimatedEffort: '3-5 days', estimatedImpact: 'Medium - optimization' });
  }

  const kw = data.keywordIntelligence || {};
  const primaryCount = (kw.primaryKeywords || []).length;
  if (primaryCount < 5) {
    addRec({ priority: 'critical', area: 'keywords', message: `Only ${primaryCount} primary keywords identified — target at least 15-20 core terms`, impact: 'Insufficient keyword coverage limits organic traffic potential', estimatedEffort: '1-2 weeks', estimatedImpact: 'Critical - traffic driver' });
  } else if (primaryCount < 15) {
    addRec({ priority: 'high', area: 'keywords', message: `Expand primary keywords from ${primaryCount} to 20+ for comprehensive coverage`, impact: 'Broader keyword coverage captures more search demand', estimatedEffort: '1 week', estimatedImpact: 'High - traffic growth' });
  } else {
    addRec({ priority: 'low', area: 'keywords', message: `Maintain ${primaryCount}+ primary keyword targets — monitor rankings quarterly`, impact: 'Sustained organic traffic requires ongoing keyword refinement', estimatedEffort: 'Ongoing', estimatedImpact: 'Medium - maintenance' });
  }

  const comp = data.competitorIntelligence || {};
  if (comp.keywordGaps?.missingKeywords?.length > 0) {
    addRec({ priority: 'high', area: 'competitors', message: `Target ${comp.keywordGaps.missingKeywords.length} keyword gaps identified from competitors`, impact: 'Capturing competitor keyword gaps drives market share growth', estimatedEffort: '2-4 weeks', estimatedImpact: 'High - competitive advantage' });
  }

  const geo = data.geoIntelligence || {};
  if (geo.aiVisibilityScore != null && geo.aiVisibilityScore < 30) {
    addRec({ priority: 'critical', area: 'geo', message: 'AI visibility critically low — implement structured data and entity SEO immediately', impact: 'LLMs increasingly drive zero-click searches; low visibility means lost AI traffic', estimatedEffort: '2-3 weeks', estimatedImpact: 'Critical - future-proofing' });
  } else if (geo.aiVisibilityScore != null && geo.aiVisibilityScore < 50) {
    addRec({ priority: 'high', area: 'geo', message: 'Improve AI search visibility — build topical authority clusters', impact: 'Higher AI visibility drives LLM citations and brand mentions', estimatedEffort: '4-6 weeks', estimatedImpact: 'High - AI presence' });
  } else if (geo.aiVisibilityScore != null && geo.aiVisibilityScore < 70) {
    addRec({ priority: 'medium', area: 'geo', message: 'Strengthen AI visibility with entity-rich content and schema markup', impact: 'Continued improvement in AI platform citations', estimatedEffort: '2-4 weeks', estimatedImpact: 'Medium - optimization' });
  }

  if (data.contentScore != null && data.contentScore < 40) {
    addRec({ priority: 'high', area: 'content', message: 'Build content foundation — create pillar pages and topic clusters', impact: 'Comprehensive content strategy drives organic growth', estimatedEffort: '4-8 weeks', estimatedImpact: 'High - long-term growth' });
  } else if (data.contentScore != null && data.contentScore < 70) {
    addRec({ priority: 'medium', area: 'content', message: 'Expand content with data-driven topic clusters and content gaps', impact: 'Fills missing content opportunities identified by competitor analysis', estimatedEffort: '4-6 weeks', estimatedImpact: 'Medium - content depth' });
  }

  if (data.metadataScore != null && data.metadataScore < 60) {
    addRec({ priority: 'high', area: 'metadata', message: 'Fix meta title and description issues across key pages', impact: 'Meta tags directly influence CTR and search relevance', estimatedEffort: '1 week', estimatedImpact: 'High - CTR improvement' });
  }
  if (data.crawlabilityScore != null && data.crawlabilityScore < 50) {
    addRec({ priority: 'critical', area: 'crawlability', message: 'Fix crawl and indexation issues blocking search engines', impact: 'Pages cannot rank if search engines cannot discover them', estimatedEffort: '1-2 weeks', estimatedImpact: 'Critical - discoverability' });
  }
  if (data.internalLinkingScore != null && data.internalLinkingScore < 40) {
    addRec({ priority: 'medium', area: 'linking', message: 'Improve internal linking structure for better authority flow', impact: 'Proper internal linking distributes ranking power across pages', estimatedEffort: '1-2 weeks', estimatedImpact: 'Medium - authority distribution' });
  }
  if (data.schemaScore != null && data.schemaScore < 40) {
    addRec({ priority: 'medium', area: 'schema', message: 'Implement structured data markup for rich results eligibility', impact: 'Schema enables rich snippets, knowledge panels, and AI comprehension', estimatedEffort: '1-2 weeks', estimatedImpact: 'Medium - rich results' });
  }

  const totalKeywords = kw.metadata?.totalKeywords || 0;
  if (totalKeywords > 50) {
    addRec({ priority: 'low', area: 'keywords', message: `Consolidate ${totalKeywords} keywords into focused topic clusters`, impact: 'Organized keyword strategy improves content efficiency and topical authority', estimatedEffort: 'Ongoing', estimatedImpact: 'Low - organization' });
  }

  return recs.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.priority] || 99) - (order[b.priority] || 99);
  });
}

function calculateConfidence(data) {
  let total = 0;
  let factors = 0;

  if (data.technicalAudit?.overallScore != null) { total += 100; factors++; }
  if (data.technicalAudit?.scores?.overall != null) { total += 100; factors++; }
  if (data.keywordIntelligence?.primaryKeywords?.length > 0) { total += 80; factors++; }
  if (data.geoIntelligence?.aiVisibilityScore != null) { total += 90; factors++; }
  if (data.competitorIntelligence?.competitors?.length > 0) { total += 85; factors++; }
  if (data.pageSpeed?.mobile?.performance != null) { total += 95; factors++; }

  if (data.providers?.serpapi?.available) { total += 100; factors++; }
  if (data.providers?.dataforseo?.available) { total += 95; factors++; }

  return factors > 0 ? Math.round(total / factors) : 0;
}

function scoreToRating(score) {
  if (score == null) return 'unavailable';
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'average';
  if (score >= 30) return 'poor';
  return 'critical';
}
