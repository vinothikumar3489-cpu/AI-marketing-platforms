export function buildSEOReport({
  identity,
  technicalAudit,
  keywordIntelligence,
  competitorIntelligence,
  geoIntelligence,
  contentGapIntelligence,
  blogIntelligence,
  searchConsoleData,
  serpFeatures,
  peopleAlsoAsk,
  trendAnalysis,
  providers
}) {
  const overallScore = calculateOverallScore({
    technicalAudit,
    keywordIntelligence,
    geoIntelligence,
    competitorIntelligence
  });

  const technicalScore = extractScore(technicalAudit, 'overallScore');
  const contentScore = calculateContentScore(keywordIntelligence, contentGapIntelligence);
  const performanceScore = extractScore(technicalAudit, 'performanceScore');
  const coreWebVitals = extractCoreWebVitals(technicalAudit);
  const keywordOpportunities = buildKeywordOpportunities(keywordIntelligence);
  const serpFeaturesData = serpFeatures || [];
  const competitors = competitorIntelligence?.competitors || competitorIntelligence?.competitorProfiles || [];
  const paak = peopleAlsoAsk || [];
  const trends = trendAnalysis || {};

  const confidence = calculateConfidence({
    technicalAudit,
    keywordIntelligence,
    geoIntelligence,
    providers
  });

  return {
    overallScore,
    overallRating: scoreToRating(overallScore),
    technicalScore,
    technicalRating: scoreToRating(technicalScore),
    contentScore,
    contentRating: scoreToRating(contentScore),
    performanceScore,
    performanceRating: scoreToRating(performanceScore),
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
        relevance: c.relevanceScore || 0
      }))
    },
    searchIntent: keywordIntelligence?.metadata?.searchIntent || detectSearchIntent(keywordIntelligence),
    contentGaps: buildContentGapSummary(contentGapIntelligence),
    recommendations: buildRecommendations({
      technicalAudit,
      keywordIntelligence,
      competitorIntelligence,
      geoIntelligence,
      contentGapIntelligence
    }),
    searchConsole: searchConsoleData ? {
      clicks: searchConsoleData.clicks ?? null,
      impressions: searchConsoleData.impressions ?? null,
      ctr: searchConsoleData.ctr ?? null,
      avgPosition: searchConsoleData.avgPosition ?? null,
      topQueries: (searchConsoleData.topQueries || []).slice(0, 10),
      topPages: (searchConsoleData.topPages || []).slice(0, 10),
      countries: searchConsoleData.countries || [],
      devices: searchConsoleData.devices || [],
      source: 'Google Search Console',
      status: 'measured'
    } : null,
    peopleAlsoAsk: paak.slice(0, 10),
    trendAnalysis: {
      direction: trends.direction || 'stable',
      momentum: trends.momentum || 0,
      seasonality: trends.seasonality || null,
      recentData: (trends.interest || []).slice(-6)
    },
    confidence,
    confidenceLabel: confidence >= 80 ? 'Measured' : confidence >= 50 ? 'Estimated' : 'Limited',
    providers: providers || {},
    retrievedAt: new Date().toISOString(),
    status: 'completed'
  };
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

function extractCoreWebVitals(technicalAudit) {
  if (!technicalAudit) return null;
  const audit = technicalAudit.auditData || technicalAudit;
  return {
    lcp: audit.lcp || audit.coreWebVitals?.lcp || null,
    fcp: audit.fcp || audit.coreWebVitals?.fcp || null,
    tti: audit.tti || audit.coreWebVitals?.tti || null,
    tbt: audit.tbt || audit.coreWebVitals?.tbt || null,
    cls: audit.cls || audit.coreWebVitals?.cls || null,
    si: audit.si || audit.coreWebVitals?.si || null,
    source: 'Measured',
    status: audit.lcp || audit.coreWebVitals ? 'measured' : 'unavailable'
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

  for (const k of primary.slice(0, 10)) {
    opportunities.push({
      keyword: k.keyword || k,
      type: 'primary',
      searchVolume: null,
      displayVolume: 'Estimated',
      opportunityScore: k.relevanceScore || k.confidence || 70,
      intent: k.intent || classifyIntent(k.keyword || k),
      source: k.source || 'topic_idea',
      confidence: k.confidence ?? null,
      status: k.confidence ? 'measured' : 'estimated'
    });
  }

  for (const k of secondary.slice(0, 15)) {
    opportunities.push({
      keyword: k.keyword || k,
      type: 'secondary',
      searchVolume: null,
      displayVolume: 'Estimated',
      opportunityScore: k.relevanceScore || k.confidence || 50,
      intent: k.intent || classifyIntent(k.keyword || k),
      source: k.source || 'topic_idea',
      confidence: k.confidence ?? null,
      status: 'estimated'
    });
  }

  return opportunities;
}

function classifyIntent(keyword) {
  if (!keyword) return 'informational';
  const lower = keyword.toLowerCase();
  if (lower.startsWith('how') || lower.startsWith('what') || lower.startsWith('why')) return 'informational';
  if (lower.includes('buy') || lower.includes('price') || lower.includes('best') || lower.includes('top')) return 'commercial';
  if (lower.includes('vs') || lower.includes('versus') || lower.includes('compare')) return 'commercial';
  if (lower.includes('guide') || lower.includes('tutorial') || lower.includes('example')) return 'informational';
  return 'informational';
}

function buildContentGapSummary(contentGapIntelligence) {
  if (!contentGapIntelligence) return null;
  const cg = contentGapIntelligence;
  return {
    totalGaps: cg.contentGaps?.length || cg.summary?.totalGaps || 0,
    highPriority: cg.contentGaps?.filter(g => g.priority === 'high' || g.opportunityScore >= 80).length || 0,
    mediumPriority: cg.contentGaps?.filter(g => g.priority === 'medium' || (g.opportunityScore >= 50 && g.opportunityScore < 80)).length || 0,
    topGaps: (cg.contentGaps || []).slice(0, 5).map(g => ({
      title: g.title || g.gapType,
      type: g.gapType || g.contentType,
      opportunityScore: g.opportunityScore || 0,
      priority: g.priority || 'medium'
    }))
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

  const ta = data.technicalAudit || {};
  if (ta.overallScore != null && ta.overallScore < 60) {
    recs.push({ priority: 'high', area: 'technical', message: 'Improve technical SEO score', score: ta.overallScore });
  }
  if (ta.issues?.critical?.length > 0) {
    recs.push({ priority: 'critical', area: 'technical', message: `Fix ${ta.issues.critical.length} critical technical issues` });
  }

  const kw = data.keywordIntelligence || {};
  if ((kw.primaryKeywords?.length || 0) < 5) {
    recs.push({ priority: 'high', area: 'keywords', message: 'Expand keyword targets - too few primary keywords identified' });
  }

  const comp = data.competitorIntelligence || {};
  if (comp.keywordGaps?.missingKeywords?.length > 0) {
    recs.push({ priority: 'high', area: 'competitors', message: `Target ${comp.keywordGaps.missingKeywords.length} keyword gaps identified from competitors` });
  }

  const geo = data.geoIntelligence || {};
  if (geo.aiVisibilityScore != null && geo.aiVisibilityScore < 50) {
    recs.push({ priority: 'high', area: 'geo', message: 'Improve AI search visibility - score below 50' });
  }

  return recs;
}

function calculateConfidence(data) {
  let total = 0;
  let factors = 0;

  if (data.technicalAudit?.overallScore != null) { total += 100; factors++; }
  if (data.technicalAudit?.scores?.overall != null) { total += 100; factors++; }
  if (data.keywordIntelligence?.primaryKeywords?.length > 0) { total += 80; factors++; }
  if (data.geoIntelligence?.aiVisibilityScore != null) { total += 90; factors++; }
  if (data.competitorIntelligence?.competitors?.length > 0) { total += 85; factors++; }

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
