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
  backlinkData,
  pageSpeed,
  crux,
  serpAnalysis = null,
  aiVisibility = null
}) {
  const scData = searchConsoleData || searchConsole;
  const authorityScore = calculateAuthorityScore(backlinkData, geoIntelligence, competitorIntelligence);
  const authorityEvidence = buildAuthorityEvidence(backlinkData, geoIntelligence, competitorIntelligence);
  const overallScore = calculateOverallScore({
    technicalAudit,
    keywordIntelligence,
    geoIntelligence,
    competitorIntelligence,
    contentGapIntelligence,
    authorityScore
  });

  const technicalScore = extractScore(technicalAudit, 'overallScore');
  const contentScore = calculateContentScore(keywordIntelligence, contentGapIntelligence);
  const perfFromAudit = extractScore(technicalAudit, 'performanceScore') ?? extractScore(technicalAudit, 'performance');
  const perfFromPageSpeed = pageSpeed?.mobile?.lighthouseScores?.performance ?? pageSpeed?.mobile?.performance ?? null;
  const performanceScore = Number.isFinite(perfFromAudit) ? perfFromAudit : perfFromPageSpeed;
  const accessibilityScore = extractScore(technicalAudit, 'accessibilityScore') || pageSpeed?.mobile?.accessibility || null;
  const bestPracticesScore = extractScore(technicalAudit, 'bestPracticesScore') || pageSpeed?.mobile?.bestPractices || null;
  const coreWebVitals = extractCoreWebVitals(technicalAudit, pageSpeed, crux);
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
  const schemaAnalysis = buildSchemaAnalysis(technicalAudit);

  const topicClusters = buildTopicClusters(keywordIntelligence);
  const intentBreakdown = buildIntentBreakdown(keywordIntelligence);
  const confidenceObj = calculateConfidence({
    technicalAudit,
    keywordIntelligence,
    geoIntelligence,
    providers,
    pageSpeed,
    backlinkData,
    aiVisibility,
    serpAnalysis
  });
  const confidence = confidenceObj.score;
  const aiVisibilityData = buildAIVisibility(geoIntelligence, aiVisibility);

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
    authorityScore,
    authorityRating: scoreToRating(authorityScore),
    authorityEvidence,
    backlinks: backlinkData?.backlinks ? {
      totalBacklinks: backlinkData.backlinks.totalBacklinks,
      referringDomains: backlinkData.backlinks.referringDomains,
      referringPages: backlinkData.backlinks.referringPages,
      dofollowBacklinks: backlinkData.backlinks.dofollowBacklinks,
      nofollowBacklinks: backlinkData.backlinks.nofollowBacklinks ?? null,
      dofollowRatio: backlinkData.backlinks.dofollowRatio ?? null,
      domainRank: backlinkData.backlinks.domainRank,
      spamScore: backlinkData.backlinks.spamScore,
      source: 'DataForSEO Backlinks API',
      status: 'measured'
    } : {
      totalBacklinks: null,
      referringDomains: null,
      source: 'estimated',
      status: 'estimated',
      note: 'Backlink API unavailable — authority score is a conservative estimate'
    },
    coreWebVitals,
    keywordOpportunities,
    topicClusters,
    serpFeatures: serpFeaturesData,
    serpAnalysis: buildSerpAnalysisSection(serpAnalysis),
    aiVisibility: aiVisibilityData,
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
    intentBreakdown,
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
      schemaScore,
      schemaAnalysis,
      backlinkData,
      authorityScore,
      aiVisibility: aiVisibilityData,
      serpAnalysis,
      topicClusters,
      coreWebVitals,
      crux
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
    schemaAnalysis,
    aiVisibility: aiVisibilityData,
    confidence,
    confidenceBreakdown: confidenceObj
      ? {
          ...confidenceObj.breakdown,
          measuredSections: confidenceObj.measuredSections,
          estimatedSections: confidenceObj.estimatedSections
        }
      : null,
    confidenceLabel: confidence >= 80 ? 'Measured' : confidence >= 60 ? 'High Confidence' : confidence >= 40 ? 'Estimated' : 'Limited',
    providers: providers || {},
    retrievedAt: new Date().toISOString(),
    status: 'completed'
  };

  return report;
}

function calculateOverallScore(data) {
  const scores = [];
  if (Number.isFinite(data.technicalAudit?.overallScore)) scores.push(data.technicalAudit.overallScore);
  if (Number.isFinite(data.technicalAudit?.scores?.overall)) scores.push(data.technicalAudit.scores.overall);
  if (data.keywordIntelligence?.metadata?.totalKeywords != null) scores.push(Math.min(data.keywordIntelligence.metadata.totalKeywords * 5, 100));
  if (Number.isFinite(data.geoIntelligence?.aiVisibilityScore)) scores.push(data.geoIntelligence.aiVisibilityScore);
  if (data.competitorIntelligence?.metadata?.totalCompetitors != null) scores.push(Math.min(data.competitorIntelligence.metadata.totalCompetitors * 10, 100));
  if (Number.isFinite(data.authorityScore)) scores.push(data.authorityScore);

  // On-page component scores always computable from the audit object
  const ta = data.technicalAudit;
  if (ta) {
    const crawlability = calculateCrawlabilityScore(ta);
    if (Number.isFinite(crawlability)) scores.push(crawlability);
    const metadata = calculateMetadataScore(ta);
    if (Number.isFinite(metadata)) scores.push(metadata);
    const linking = calculateInternalLinkingScore(ta);
    if (Number.isFinite(linking)) scores.push(linking);
    const schema = calculateSchemaScore(ta);
    if (Number.isFinite(schema)) scores.push(schema);
  }
  const content = calculateContentScore(data.keywordIntelligence, data.contentGapIntelligence);
  if (Number.isFinite(content)) scores.push(content);

  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * Authority/backlink health score — DataForSEO backlinks when available,
 * else GEO entity signals, else conservative domain-age-free estimate (LOW confidence).
 * Component-weighted with spam and dofollow quality factors; never null.
 */
function calculateAuthorityScore(backlinkData, geoIntelligence, competitorIntelligence) {
  if (backlinkData?.backlinks) {
    const b = backlinkData.backlinks;
    let score = 0;
    const referringDomains = b.referringDomains;
    if (referringDomains != null) score += Math.min(referringDomains * 2, 50);
    const totalBacklinks = b.totalBacklinks;
    if (totalBacklinks != null) score += Math.min(totalBacklinks * 0.1, 20);
    const domainRank = b.domainRank;
    if (domainRank != null) score += Math.min(domainRank / 2, 25);
    const dofollowRatio = b.dofollowRatio != null ? Number(b.dofollowRatio) : null;
    if (dofollowRatio != null) score += dofollowRatio > 50 ? 5 : 2;
    const spamScore = b.spamScore != null ? Number(b.spamScore) : null;
    if (spamScore != null && spamScore > 30) score -= Math.min((spamScore - 30) * 0.5, 15);
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  if (geoIntelligence?.knowledgeGraphEntities?.length) {
    return Math.min(40 + geoIntelligence.knowledgeGraphEntities.length * 8, 80);
  }
  if (geoIntelligence?.entityCoverageScore != null) {
    return Math.round(geoIntelligence.entityCoverageScore * 0.8);
  }
  return 25; // conservative baseline — never null
}

function buildAuthorityEvidence(backlinkData, geoIntelligence, competitorIntelligence) {
  const evidence = { method: null, components: [], status: 'estimated', sources: [] };
  if (backlinkData?.backlinks) {
    const b = backlinkData.backlinks;
    evidence.method = 'DataForSEO Backlinks API';
    evidence.status = 'measured';
    evidence.sources.push('DataForSEO Backlinks API');
    if (b.referringDomains != null) evidence.components.push({ name: 'referringDomains', value: b.referringDomains, weight: 50, measured: true });
    if (b.totalBacklinks != null) evidence.components.push({ name: 'totalBacklinks', value: b.totalBacklinks, weight: 20, measured: true });
    if (b.domainRank != null) evidence.components.push({ name: 'domainRank', value: b.domainRank, weight: 25, measured: true });
    if (b.dofollowRatio != null) evidence.components.push({ name: 'dofollowRatio', value: Number(b.dofollowRatio), weight: 5, measured: true });
    if (b.spamScore != null) evidence.components.push({ name: 'spamScore', value: Number(b.spamScore), weight: -15, measured: true, note: 'Penalty applied above 30' });
  } else if (geoIntelligence?.knowledgeGraphEntities?.length || geoIntelligence?.entityCoverageScore != null) {
    evidence.method = 'GEO entity signals';
    evidence.status = 'estimated';
    evidence.sources.push('GEO entity coverage');
    if (geoIntelligence.entityCoverageScore != null) evidence.components.push({ name: 'entityCoverageScore', value: geoIntelligence.entityCoverageScore, weight: 80, measured: false });
  } else {
    evidence.method = 'Conservative baseline (no backlink or entity evidence)';
    evidence.status = 'estimated';
  }
  return evidence;
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

function extractCoreWebVitals(technicalAudit, pageSpeed, crux) {
  const audit = technicalAudit?.auditData || technicalAudit || {};
  // Prefer real-user field data (CrUX p75) over lab data when available —
  // field data is the stronger ranking evidence.
  const field = crux || {};
  const fieldLcp = field.lcp?.p75 ?? null;
  const fieldFcp = field.fcp?.p75 ?? null;
  const fieldCls = field.cls?.p75 ?? null;
  const fieldInp = field.inp?.p75 ?? null;
  const fieldTtfb = field.ttfb?.p75 ?? null;

  const lcp = fieldLcp ?? audit.lcp ?? audit.coreWebVitals?.lcp ?? pageSpeed?.lcp ?? null;
  const fcp = fieldFcp ?? audit.fcp ?? audit.coreWebVitals?.fcp ?? pageSpeed?.fcp ?? null;
  const tti = audit.tti ?? audit.coreWebVitals?.tti ?? null;
  const tbt = audit.tbt ?? audit.coreWebVitals?.tbt ?? null;
  const cls = fieldCls ?? audit.cls ?? audit.coreWebVitals?.cls ?? pageSpeed?.cls ?? null;
  const si = audit.si ?? audit.coreWebVitals?.si ?? null;
  const inp = fieldInp ?? audit.inp ?? audit.coreWebVitals?.inp ?? pageSpeed?.inp ?? null;
  const ttfb = fieldTtfb ?? audit.ttfb ?? audit.coreWebVitals?.ttfb ?? pageSpeed?.ttfb ?? null;

  const hasData = lcp || fcp || tti || tbt || cls || si || inp || ttfb;
  const source = field.status === 'measured' || (fieldLcp ?? fieldInp ?? fieldCls) != null
    ? 'Chrome UX Report (field data)'
    : hasData ? 'Measured' : 'Pending';

  function evaluateLCP(val) { return val != null ? (val <= 2500 ? 'good' : val <= 4000 ? 'needs-improvement' : 'poor') : null; }
  function evaluateFCP(val) { return val != null ? (val <= 1800 ? 'good' : val <= 3000 ? 'needs-improvement' : 'poor') : null; }
  function evaluateCLS(val) { return val != null ? (val <= 0.1 ? 'good' : val <= 0.25 ? 'needs-improvement' : 'poor') : null; }
  function evaluateINP(val) { return val != null ? (val <= 200 ? 'good' : val <= 500 ? 'needs-improvement' : 'poor') : null; }

  const metricRatings = [evaluateLCP(lcp), evaluateINP(inp), evaluateCLS(cls)].filter(Boolean);
  const hasCoreSet = lcp != null && cls != null && (inp != null || tbt != null);
  const goodCount = metricRatings.filter(r => r === 'good').length;
  const poorCount = metricRatings.filter(r => r === 'poor').length;
  const overallRating = metricRatings.length > 0
    ? (poorCount > 0 ? 'poor' : goodCount === metricRatings.length ? 'good' : 'needs-improvement')
    : null;

  return {
    lcp: { value: lcp, rating: evaluateLCP(lcp), unit: 'ms' },
    fcp: { value: fcp, rating: evaluateFCP(fcp), unit: 'ms' },
    tti: { value: tti, rating: tti != null ? (tti <= 3800 ? 'good' : tti <= 7300 ? 'needs-improvement' : 'poor') : null, unit: 'ms' },
    tbt: { value: tbt, rating: tbt != null ? (tbt <= 200 ? 'good' : tbt <= 600 ? 'needs-improvement' : 'poor') : null, unit: 'ms' },
    cls: { value: cls, rating: evaluateCLS(cls), unit: '' },
    si: { value: si, rating: si != null ? (si <= 3400 ? 'good' : si <= 5800 ? 'needs-improvement' : 'poor') : null, unit: 'ms' },
    inp: { value: inp, rating: evaluateINP(inp), unit: 'ms' },
    ttfb: { value: ttfb, rating: ttfb != null ? (ttfb <= 800 ? 'good' : ttfb <= 1800 ? 'needs-improvement' : 'poor') : null, unit: 'ms' },
    overallRating,
    passingCoreSet: hasCoreSet && goodCount === metricRatings.length,
    counts: { good: goodCount, needsImprovement: metricRatings.length - goodCount - poorCount, poor: poorCount },
    source,
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
  if (lower.includes('buy') || lower.includes('price') || lower.includes('pricing') || lower.includes('cost') || lower.includes('best') || lower.includes('top')) return 'commercial';
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

function buildAIVisibility(geoIntelligence, aiVisibilityModule) {
  // Evidence-backed per-platform scores from the AI Visibility module.
  // Falls back to GEO estimates ONLY when no measured platform data exists,
  // and every estimate remains labeled `estimated`.
  if (aiVisibilityModule && (aiVisibilityModule.platforms || []).length > 0) {
    const platforms = aiVisibilityModule.platforms;
    const measured = platforms.filter(p => p.status === 'measured');
    const overallScore = aiVisibilityModule.overallScore;

    return {
      overallScore,
      overallRating: scoreToRating(overallScore),
      platforms: platforms.map(p => ({
        platform: p.platform,
        score: p.score,
        status: p.status,
        confidence: p.confidence ?? null,
        method: p.method || null,
        note: p.note || null,
        evidence: p.evidence || null,
        findings: p.findings || []
      })),
      totalPlatformsMeasured: platforms.filter(p => p.status === 'measured').length,
      totalPlatforms: platforms.length,
      citationLikelihood: aiVisibilityModule.citationLikelihood ?? null,
      entityConfidence: measured.length >= 2 ? 'Moderate' : measured.length > 0 ? 'Limited' : null,
      llmDiscoverability: overallScore != null ? Math.round(overallScore * 0.9) : null,
      aiDiscoverabilityScore: overallScore != null ? Math.round(overallScore * 0.9) : null,
      knowledgeGraphReadiness: measured.length > 0 ? Math.round((overallScore ?? 0) * 0.75 + 10) : null,
      status: measured.length > 0 ? 'measured' : 'estimated',
      evidenceSummary: aiVisibilityModule.evidenceSummary || null,
      recommendations: buildAIVisibilityRecommendations(platforms, measured.length)
    };
  }

  // Legacy path: GEO on-page estimates only — labeled as estimates
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
    score: p.field != null && p.field !== 'Not measured' ? p.field : null,
    status: p.field != null && p.field !== 'Not measured' ? 'estimated' : 'pending',
    method: 'geo_onpage_estimate',
    note: 'Estimated from on-page AI-readiness signals — no live citation evidence',
    evidence: null,
    findings: ['Connect Tavily/Exa or a SERP provider for measured AI visibility evidence']
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
    totalPlatformsMeasured: 0,
    totalPlatforms: scores.length,
    citationLikelihood: avgScore != null ? (avgScore >= 70 ? 'High' : avgScore >= 40 ? 'Medium' : 'Low') : null,
    citationReadiness: avgScore != null ? (avgScore >= 70 ? 85 : avgScore >= 40 ? 55 : 25) : null,
    entityConfidence: avgScore != null ? (avgScore >= 70 ? 'Strong' : avgScore >= 40 ? 'Moderate' : 'Weak') : null,
    llmDiscoverability: llmScore,
    aiDiscoverabilityScore: llmScore,
    knowledgeGraphReadiness: avgScore != null ? Math.round(avgScore * 0.75 + 10) : 30,
    status: validScores.length > 0 ? 'estimated' : 'MEASUREMENT_PENDING',
    evidenceSummary: null,
    recommendations: buildAIVisibilityRecommendations(scores, 0)
  };
}

function buildAIVisibilityRecommendations(platforms, measuredCount) {
  const recs = [];
  const estimatedCount = platforms.filter(p => p.status === 'estimated').length;

  if (measuredCount === 0) {
    recs.push({
      priority: 'high',
      area: 'geo',
      message: 'Connect a live evidence provider (Tavily/Exa or DataForSEO/SerpAPI) to measure AI platform visibility',
      impact: 'AI visibility currently uses on-page estimates only',
      evidence: { finding: `${estimatedCount} platform score(s) are on-page estimates`, source: 'aiVisibility module' }
    });
  }

  for (const p of platforms) {
    if (p.status !== 'measured') continue;
    if (p.score != null && p.score < 30) {
      recs.push({
        priority: 'critical',
        area: 'geo',
        message: `${p.platform} visibility is critically low (${p.score}/100)`,
        impact: `${p.platform} is unlikely to cite the brand for related queries`,
        evidence: p.evidence ? {
          finding: p.findings?.[0] || `Score ${p.score}/100`,
          source: 'AI visibility evidence',
          data: { citingSources: p.evidence.citingSourceCount ?? null, queries: (p.evidence.queries || []).length }
        } : null
      });
    } else if (p.score != null && p.score < 50) {
      recs.push({
        priority: 'high',
        area: 'geo',
        message: `Improve ${p.platform} visibility (${p.score}/100) with entity-rich, citeable content`,
        impact: 'Stronger citations increase AI answer inclusion likelihood',
        evidence: p.evidence ? { finding: p.findings?.[0], source: 'AI visibility evidence' } : null
      });
    }
  }

  return recs;
}

/**
 * Schema detection analysis — enumerates detected Schema.org types, scores
 * coverage of high-value types, and never invents types that were not seen.
 */
const HIGH_VALUE_SCHEMA_TYPES = [
  'Organization', 'Product', 'SoftwareApplication', 'FAQPage', 'Article',
  'BreadcrumbList', 'LocalBusiness', 'Review', 'Event', 'VideoObject',
  'HowTo', 'WebSite', 'Service', 'Course', 'JobPosting', 'Person'
];

function buildSchemaAnalysis(technicalAudit) {
  const ta = technicalAudit || {};
  const types = (ta.schemaTypes || ta.schema?.types || ta.schemas || ta.structuredData?.types || []).map(t =>
    typeof t === 'string' ? t : (t?.type || t?.['@type'] || '')
  ).filter(Boolean);

  const seen = new Set();
  const uniqueTypes = types.filter(t => {
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });

  const presentHighValue = uniqueTypes.filter(t => HIGH_VALUE_SCHEMA_TYPES.includes(t));
  const missingHighValue = uniqueTypes.length > 0
    ? HIGH_VALUE_SCHEMA_TYPES.filter(t => !uniqueTypes.includes(t))
    : [];

  const typeDetails = uniqueTypes.map(t => ({
    type: t,
    highValue: HIGH_VALUE_SCHEMA_TYPES.includes(t),
    source: 'On-page crawl of the homepage',
    status: 'measured'
  }));

  const score = uniqueTypes.length > 0
    ? Math.min(20 + presentHighValue.length * 20, 100)
    : 0;

  return {
    score,
    rating: scoreToRating(score),
    detectedTypes: typeDetails,
    totalTypes: uniqueTypes.length,
    highValueTypes: presentHighValue,
    missingHighValueTypes: missingHighValue,
    status: uniqueTypes.length > 0 ? 'measured' : 'unavailable'
  };
}

function buildSerpAnalysisSection(serpAnalysis) {
  if (!serpAnalysis) {
    return {
      status: 'unavailable',
      reason: 'No live SERP provider available — run with DataForSEO or SerpAPI configured',
      features: [],
      aiOverview: null,
      ownDomainRank: null,
      peopleAlsoAsk: []
    };
  }
  return {
    status: serpAnalysis.status || 'measured',
    provider: serpAnalysis.provider || null,
    features: serpAnalysis.features || [],
    aiOverview: serpAnalysis.aiOverview ? {
      present: true,
      citedDomainCount: serpAnalysis.aiOverview.citedDomainCount ?? null,
      citedDomains: (serpAnalysis.aiOverview.citedDomains || []).slice(0, 10),
      snippet: (serpAnalysis.aiOverview.text || '').slice(0, 400)
    } : null,
    featuredSnippet: serpAnalysis.featuredSnippet ? {
      present: true,
      domain: serpAnalysis.featuredSnippet.domain || null,
      url: serpAnalysis.featuredSnippet.url || null
    } : null,
    ownDomainRank: serpAnalysis.ownDomainRank ?? null,
    ownDomain: serpAnalysis.ownDomain || null,
    organic: (serpAnalysis.organic || []).slice(0, 10),
    peopleAlsoAsk: (serpAnalysis.peopleAlsoAsk || []).slice(0, 8),
    relatedSearches: (serpAnalysis.relatedSearches || []).slice(0, 8)
  };
}

const CLUSTER_STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'for', 'and', 'or', 'to', 'in', 'on', 'with',
  'best', 'top', 'how', 'what', 'why', 'when', 'vs', 'versus', 'guide',
  'software', 'tool', 'tools', 'platform', 'service', 'services'
]);

function extractSignificantTokens(keyword) {
  if (!keyword) return [];
  return String(keyword).toLowerCase().split(/[^a-z0-9]+/).filter(t =>
    t.length >= 3 && !CLUSTER_STOPWORDS.has(t)
  );
}

/**
 * Topic clusters from MEASURED keywords only — each cluster carries real
 * volume/difficulty evidence. Keywords without metrics never inflate a
 * cluster (they are excluded or the cluster is labeled estimated).
 */
export function buildTopicClusters(keywordIntelligence) {
  const kw = keywordIntelligence || {};

  // Prefer real measured keywords (volume or difficulty present)
  const buckets = [
    ...asArray(kw.primaryKeywords),
    ...asArray(kw.secondaryKeywords),
    ...asArray(kw.longTailKeywords),
    ...asArray(kw.questionKeywords)
  ];
  const seen = new Set();
  const items = [];
  for (const raw of buckets) {
    const k = typeof raw === 'string' ? { keyword: raw } : raw || {};
    const keyword = k.keyword || k.term || k.name || '';
    if (!keyword || seen.has(keyword.toLowerCase())) continue;
    seen.add(keyword.toLowerCase());
    const volume = k.searchVolume ?? k.volume ?? k.monthlyVolume ?? null;
    const difficulty = k.keywordDifficulty ?? k.difficulty ?? null;
    const measured = (volume != null && volume >= 1) || (difficulty != null && difficulty >= 1);
    items.push({ keyword, volume, difficulty, measured, intent: k.intent || k.searchIntent || null });
  }

  const measuredItems = items.filter(i => i.measured);

  if (measuredItems.length === 0) {
    // No metrics: surface keyword-intelligence clusters (if any) as estimated,
    // otherwise an honest empty result.
    const existing = asArray(kw.clusters || []).map(c => ({
      name: c.name || c.clusterName || c.topic || 'Cluster',
      keywords: asArray(c.keywords || c.keywordList || []).map(x => typeof x === 'string' ? x : (x.keyword || x.name || x)),
      totalVolume: null,
      avgDifficulty: null,
      keywordCount: asArray(c.keywords || []).length,
      evidence: 'estimated',
      note: 'No keyword metrics available — cluster structure is estimated'
    }));
    return existing.slice(0, 15);
  }

  // Greedy overlap clustering on significant tokens
  const clusters = [];
  const assigned = new Set();
  const tokenize = (i) => new Set(extractSignificantTokens(i.keyword));

  for (let i = 0; i < measuredItems.length; i++) {
    if (assigned.has(i)) continue;
    const seed = tokenize(measuredItems[i]);
    const members = [measuredItems[i]];
    assigned.add(i);
    for (let j = i + 1; j < measuredItems.length; j++) {
      if (assigned.has(j)) continue;
      const other = tokenize(measuredItems[j]);
      const overlap = [...seed].filter(t => other.has(t)).length;
      if (overlap >= 1) {
        members.push(measuredItems[j]);
        assigned.add(j);
      }
    }
    clusters.push(members);
  }

  return clusters.map(members => {
    const keywordStrings = members.map(m => m.keyword);
    const totalVolume = members.reduce((sum, m) => sum + (m.volume || 0), 0);
    const withDifficulty = members.filter(m => m.difficulty != null);
    const avgDifficulty = withDifficulty.length > 0
      ? Math.round(withDifficulty.reduce((s, m) => s + m.difficulty, 0) / withDifficulty.length)
      : null;

    const tokenCount = new Map();
    for (const m of members) {
      for (const t of extractSignificantTokens(m.keyword)) {
        tokenCount.set(t, (tokenCount.get(t) || 0) + 1);
      }
    }
    const name = [...tokenCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || keywordStrings[0] || 'Cluster';

    return {
      name,
      keywords: keywordStrings.slice(0, 12),
      keywordCount: members.length,
      totalVolume: totalVolume > 0 ? totalVolume : null,
      avgDifficulty,
      intents: [...new Set(members.map(m => m.intent).filter(Boolean))],
      evidence: 'measured',
      opportunityScore: Math.min(10 + members.length * 8 + Math.round((totalVolume || 0) / 500), 100)
    };
  }).sort((a, b) => (b.totalVolume || 0) - (a.totalVolume || 0)).slice(0, 15);
}

/**
 * Search intent breakdown with measured-vs-estimated evidence counts.
 */
export function buildIntentBreakdown(keywordIntelligence) {
  const kw = keywordIntelligence || {};
  const buckets = [
    ...asArray(kw.primaryKeywords),
    ...asArray(kw.secondaryKeywords),
    ...asArray(kw.longTailKeywords),
    ...asArray(kw.questionKeywords)
  ];

  const counts = { informational: 0, commercial: 0, transactional: 0, navigational: 0 };
  let measured = 0;
  let estimated = 0;

  for (const raw of buckets) {
    const k = typeof raw === 'string' ? { keyword: raw } : raw || {};
    const keyword = k.keyword || k.term || k.name || '';
    if (!keyword) continue;
    const declared = k.intent || k.searchIntent || null;
    const intent = declared || classifyIntent(keyword);
    if (counts[intent] != null) counts[intent]++;
    if (declared) measured++;
    else estimated++;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const intentOrder = { commercial: 0, informational: 1, transactional: 2, navigational: 3 };
  const dominant = total > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1] || intentOrder[a[0]] - intentOrder[b[0]])[0][0]
    : null;

  return {
    distribution: {
      informational: { count: counts.informational, percentage: total > 0 ? Math.round(counts.informational / total * 100) : null },
      commercial: { count: counts.commercial, percentage: total > 0 ? Math.round(counts.commercial / total * 100) : null },
      transactional: { count: counts.transactional, percentage: total > 0 ? Math.round(counts.transactional / total * 100) : null },
      navigational: { count: counts.navigational, percentage: total > 0 ? Math.round(counts.navigational / total * 100) : null }
    },
    dominantIntent: dominant,
    measuredCount: measured,
    estimatedCount: estimated,
    total: total,
    status: measured > 0 ? 'partially_measured' : estimated > 0 ? 'estimated' : 'unavailable'
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
      schema: 'SEO',
      backlinks: 'SEO',
      aiVisibility: 'SEO'
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
    if (area === 'backlinks') return 'Medium';
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
  const criticalCount = (ta.issues?.critical || []).length;
  if (criticalCount > 0) {
    const top = ta.issues.critical[0];
    addRec({
      priority: 'critical', area: 'technical',
      message: `Fix ${criticalCount} critical technical issue(s) — ${top?.title || 'see issue list'}`,
      impact: 'Blocks search indexing and ranking',
      estimatedEffort: '1-3 days',
      estimatedImpact: 'High - critical for visibility',
      evidence: { finding: top?.title || `${criticalCount} critical issues detected`, source: top?.evidence || 'Technical SEO audit', data: { count: criticalCount } }
    });
  }
  if (ta.overallScore != null && ta.overallScore < 60) {
    addRec({
      priority: 'high', area: 'technical',
      message: `Improve overall technical SEO score (${ta.overallScore}/100)`,
      impact: 'Directly affects crawl efficiency and ranking potential',
      estimatedEffort: '1-2 weeks',
      estimatedImpact: 'High - foundational improvement',
      evidence: { finding: `Technical score ${ta.overallScore}/100`, source: ta.scoreMethod === 'estimated_from_onpage_signals' ? 'On-page signals (no lab data)' : 'Technical SEO audit' }
    });
  }

  const perf = data.performanceScore;
  if (perf != null && perf < 50) {
    addRec({
      priority: 'critical', area: 'performance',
      message: `Critical PageSpeed score (${perf}/100) — optimize Core Web Vitals`,
      impact: 'Google uses CWV as ranking factor; poor scores hurt rankings',
      estimatedEffort: '2-4 weeks',
      estimatedImpact: 'Critical - ranking factor',
      evidence: { finding: `Performance score ${perf}/100`, source: 'Lighthouse (PageSpeed Insights)' }
    });
  } else if (perf != null && perf < 70) {
    addRec({
      priority: 'high', area: 'performance',
      message: `Improve PageSpeed to 70+ (currently ${perf}/100)`,
      impact: 'Impacts bounce rate and mobile rankings',
      estimatedEffort: '1-2 weeks',
      estimatedImpact: 'High - UX and SEO',
      evidence: { finding: `Performance score ${perf}/100`, source: 'Lighthouse (PageSpeed Insights)' }
    });
  } else if (perf != null && perf < 90) {
    addRec({
      priority: 'medium', area: 'performance',
      message: `Fine-tune performance to reach 90+ (currently ${perf}/100)`,
      impact: 'Competitive advantage in mobile search',
      estimatedEffort: '3-5 days',
      estimatedImpact: 'Medium - optimization',
      evidence: { finding: `Performance score ${perf}/100`, source: 'Lighthouse (PageSpeed Insights)' }
    });
  }

  const cwv = data.coreWebVitals || {};
  if (cwv.overallRating === 'poor') {
    const bad = (cwv.counts?.poor || 0);
    const details = ['lcp', 'inp', 'cls'].filter(m => cwv[m]?.rating === 'poor')
      .map(m => `${m.toUpperCase()} ${Math.round(cwv[m].value)}${cwv[m].unit || ''}`).join(', ');
    addRec({
      priority: 'critical', area: 'performance',
      message: `${bad} Core Web Vital(s) rated poor (${details})`,
      impact: 'Field-measured CWV failure directly impacts ranking',
      estimatedEffort: '2-4 weeks',
      estimatedImpact: 'Critical - ranking factor',
      evidence: { finding: details, source: cwv.source || 'Core Web Vitals', data: { poor: bad, good: cwv.counts?.good ?? 0 } }
    });
  }

  const kw = data.keywordIntelligence || {};
  const primaryCount = (kw.primaryKeywords || []).length;
  const measuredPrimary = (kw.primaryKeywords || []).filter(k => (k.searchVolume ?? k.volume) != null).length;
  if (primaryCount < 5) {
    addRec({
      priority: 'critical', area: 'keywords',
      message: `Only ${primaryCount} primary keywords identified — target at least 15-20 core terms`,
      impact: 'Insufficient keyword coverage limits organic traffic potential',
      estimatedEffort: '1-2 weeks',
      estimatedImpact: 'Critical - traffic driver',
      evidence: { finding: `${primaryCount} primary keywords, ${measuredPrimary} with metrics`, source: 'Keyword Intelligence' }
    });
  } else if (primaryCount < 15) {
    addRec({
      priority: 'high', area: 'keywords',
      message: `Expand primary keywords from ${primaryCount} to 20+ for comprehensive coverage`,
      impact: 'Broader keyword coverage captures more search demand',
      estimatedEffort: '1 week',
      estimatedImpact: 'High - traffic growth',
      evidence: { finding: `${primaryCount} primary keywords`, source: 'Keyword Intelligence' }
    });
  }

  const comp = data.competitorIntelligence || {};
  if ((comp.keywordGaps?.missingKeywords || []).length > 0) {
    addRec({
      priority: 'high', area: 'competitors',
      message: `Target ${comp.keywordGaps.missingKeywords.length} keyword gaps identified from competitors`,
      impact: 'Capturing competitor keyword gaps drives market share growth',
      estimatedEffort: '2-4 weeks',
      estimatedImpact: 'High - competitive advantage',
      evidence: { finding: `${comp.keywordGaps.missingKeywords.length} missing keywords`, source: 'Competitor SEO Intelligence', data: { samples: comp.keywordGaps.missingKeywords.slice(0, 3) } }
    });
  }

  const geo = data.geoIntelligence || {};
  if (geo.aiVisibilityScore != null && geo.aiVisibilityScore < 30) {
    addRec({
      priority: 'critical', area: 'geo',
      message: `AI visibility critically low (${geo.aiVisibilityScore}/100) — implement structured data and entity SEO immediately`,
      impact: 'LLMs increasingly drive zero-click searches; low visibility means lost AI traffic',
      estimatedEffort: '2-3 weeks',
      estimatedImpact: 'Critical - future-proofing',
      evidence: { finding: `GEO score ${geo.aiVisibilityScore}/100`, source: 'GEO Intelligence (on-page estimate)' }
    });
  } else if (geo.aiVisibilityScore != null && geo.aiVisibilityScore < 50) {
    addRec({
      priority: 'high', area: 'geo',
      message: `Improve AI search visibility (${geo.aiVisibilityScore}/100) — build topical authority clusters`,
      impact: 'Higher AI visibility drives LLM citations and brand mentions',
      estimatedEffort: '4-6 weeks',
      estimatedImpact: 'High - AI presence',
      evidence: { finding: `GEO score ${geo.aiVisibilityScore}/100`, source: 'GEO Intelligence (on-page estimate)' }
    });
  }

  const aiVis = data.aiVisibility || {};
  if (aiVis.recommendations && aiVis.recommendations.length > 0) {
    for (const r of aiVis.recommendations) {
      addRec({
        priority: r.priority || 'medium', area: 'aiVisibility',
        message: r.message,
        impact: r.impact || 'AI platforms are an increasing share of organic discovery',
        estimatedEffort: '2-6 weeks',
        estimatedImpact: r.impact || 'Medium',
        evidence: r.evidence || { finding: 'Per-platform AI visibility evidence', source: 'AI Visibility module' }
      });
    }
  }

  if (data.contentScore != null && data.contentScore < 40) {
    addRec({
      priority: 'high', area: 'content',
      message: `Build content foundation (content score ${data.contentScore}/100) — create pillar pages and topic clusters`,
      impact: 'Comprehensive content strategy drives organic growth',
      estimatedEffort: '4-8 weeks',
      estimatedImpact: 'High - long-term growth',
      evidence: { finding: `Content score ${data.contentScore}/100`, source: 'Keyword + content gap intelligence' }
    });
  } else if (data.contentScore != null && data.contentScore < 70) {
    addRec({
      priority: 'medium', area: 'content',
      message: `Expand content with data-driven topic clusters (content score ${data.contentScore}/100)`,
      impact: 'Fills missing content opportunities identified by competitor analysis',
      estimatedEffort: '4-6 weeks',
      estimatedImpact: 'Medium - content depth',
      evidence: { finding: `Content score ${data.contentScore}/100`, source: 'Keyword + content gap intelligence' }
    });
  }

  const clusters = data.topicClusters || [];
  if (clusters.length === 0) {
    addRec({
      priority: 'medium', area: 'content',
      message: 'No topic clusters formed — connect keyword metrics to build evidence-backed clusters',
      impact: 'Topic clusters structure topical authority and internal linking',
      estimatedEffort: '1-2 weeks',
      estimatedImpact: 'Medium',
      evidence: { finding: '0 clusters from measured keywords', source: 'Keyword Intelligence' }
    });
  } else if (clusters.length < 3) {
    const top = clusters[0];
    addRec({
      priority: 'low', area: 'content',
      message: `Only ${clusters.length} topic cluster(s) formed — expand beyond "${top?.name || ''}"`,
      impact: 'Broader cluster coverage increases topical authority',
      estimatedEffort: 'Ongoing',
      estimatedImpact: 'Medium',
      evidence: { finding: `${clusters.length} clusters, largest "${top?.name || ''}" (${top?.keywordCount || 0} keywords)`, source: 'Keyword Intelligence' }
    });
  }

  const serp = data.serpAnalysis || {};
  if (serp.status === 'measured' && serp.ownDomainRank == null) {
    addRec({
      priority: 'high', area: 'geo',
      message: 'Domain does not rank in the top 10 for the primary query',
      impact: 'Zero organic visibility for the primary search query',
      estimatedEffort: '2-4 weeks',
      estimatedImpact: 'High - visibility',
      evidence: { finding: `No ranking for "${serp.ownDomain ? 'primary query' : ''}" in live SERP`, source: serp.provider || 'SERP Analysis' }
    });
  }
  if (serp.aiOverview) {
    if (serp.aiOverview.citedDomainCount != null && serp.aiOverview.citedDomainCount > 0 && !(serp.ownDomainRank != null)) {
      addRec({
        priority: 'high', area: 'geo',
        message: `AI Overview detected for the primary query citing ${serp.aiOverview.citedDomainCount} source(s) — brand not among them`,
        impact: 'AI Overviews capture a growing share of clicks; citation means visibility',
        estimatedEffort: '4-8 weeks',
        estimatedImpact: 'High - AI visibility',
        evidence: { finding: `AI Overview present with ${serp.aiOverview.citedDomainCount} citations`, source: serp.provider || 'SERP Analysis', data: { citedDomains: serp.aiOverview.citedDomains } }
      });
    }
  }

  if (data.metadataScore != null && data.metadataScore < 60) {
    addRec({
      priority: 'high', area: 'metadata',
      message: `Fix meta title and description issues across key pages (metadata score ${data.metadataScore}/100)`,
      impact: 'Meta tags directly influence CTR and search relevance',
      estimatedEffort: '1 week',
      estimatedImpact: 'High - CTR improvement',
      evidence: { finding: `Metadata score ${data.metadataScore}/100`, source: 'Technical SEO audit' }
    });
  }
  if (data.crawlabilityScore != null && data.crawlabilityScore < 50) {
    addRec({
      priority: 'critical', area: 'crawlability',
      message: `Fix crawl and indexation issues blocking search engines (${data.crawlabilityScore}/100)`,
      impact: 'Pages cannot rank if search engines cannot discover them',
      estimatedEffort: '1-2 weeks',
      estimatedImpact: 'Critical - discoverability',
      evidence: { finding: `Crawlability score ${data.crawlabilityScore}/100`, source: 'Technical SEO audit' }
    });
  }
  if (data.internalLinkingScore != null && data.internalLinkingScore < 40) {
    addRec({
      priority: 'medium', area: 'linking',
      message: `Improve internal linking structure (${data.internalLinkingScore}/100)`,
      impact: 'Proper internal linking distributes ranking power across pages',
      estimatedEffort: '1-2 weeks',
      estimatedImpact: 'Medium - authority distribution',
      evidence: { finding: `Internal linking score ${data.internalLinkingScore}/100`, source: 'Technical SEO audit' }
    });
  }

  const schema = data.schemaAnalysis || {};
  if (schema.status === 'measured' && schema.highValueTypes.length === 0) {
    addRec({
      priority: 'medium', area: 'schema',
      message: 'Structured data detected but no high-value types (Organization, Product, FAQPage, Article)',
      impact: 'High-value schema unlocks rich results and AI comprehension',
      estimatedEffort: '1-2 weeks',
      estimatedImpact: 'Medium - rich results',
      evidence: { finding: `Detected types: ${(schema.detectedTypes || []).map(t => t.type).join(', ') || 'none'}`, source: 'Technical SEO audit' }
    });
  } else if (schema.status === 'measured' && (schema.missingHighValueTypes || []).length >= 6) {
    addRec({
      priority: 'low', area: 'schema',
      message: `Add missing high-value schema types: ${schema.missingHighValueTypes.slice(0, 4).join(', ')}...`,
      impact: 'Wider schema coverage improves eligibility for rich results',
      estimatedEffort: '1-2 weeks',
      estimatedImpact: 'Medium',
      evidence: { finding: `${schema.missingHighValueTypes.length} high-value types missing`, source: 'Technical SEO audit' }
    });
  } else if (schema.status === 'unavailable') {
    addRec({
      priority: 'medium', area: 'schema',
      message: 'No structured data found on the homepage — implement Schema.org markup',
      impact: 'Schema enables rich snippets, knowledge panels, and AI comprehension',
      estimatedEffort: '1-2 weeks',
      estimatedImpact: 'Medium - rich results',
      evidence: { finding: 'No structured data detected', source: 'Technical SEO audit' }
    });
  }

  const backlinks = data.backlinkData?.backlinks;
  if (backlinks) {
    const spam = backlinks.spamScore != null ? Number(backlinks.spamScore) : null;
    if (spam != null && spam > 30) {
      addRec({
        priority: 'high', area: 'backlinks',
        message: `Backlink profile spam score is ${spam}/100 — disavow toxic links`,
        impact: 'High spam scores erode link equity and risk penalties',
        estimatedEffort: '2-4 weeks',
        estimatedImpact: 'High - link equity protection',
        evidence: { finding: `Spam score ${spam}/100`, source: 'DataForSEO Backlinks API' }
      });
    }
    const referring = backlinks.referringDomains;
    if (referring != null && referring < 20 && data.authorityScore != null && data.authorityScore < 40) {
      addRec({
        priority: 'medium', area: 'backlinks',
        message: `Only ${referring} referring domains — build an authority-earning backlink program`,
        impact: 'Referring domain diversity is the strongest ranking link signal',
        estimatedEffort: '1-3 months',
        estimatedImpact: 'High - authority growth',
        evidence: { finding: `${referring} referring domains, authority ${data.authorityScore}/100`, source: 'DataForSEO Backlinks API' }
      });
    }
  }

  const totalKeywords = kw.metadata?.totalKeywords || 0;
  if (totalKeywords > 50) {
    addRec({
      priority: 'low', area: 'keywords',
      message: `Consolidate ${totalKeywords} keywords into focused topic clusters`,
      impact: 'Organized keyword strategy improves content efficiency and topical authority',
      estimatedEffort: 'Ongoing',
      estimatedImpact: 'Low - organization',
      evidence: { finding: `${totalKeywords} tracked keywords`, source: 'Keyword Intelligence' }
    });
  }

  // De-duplicate identical messages across recommendation sources
  const seenMessages = new Set();
  const deduped = recs.filter(r => {
    const key = r.message.toLowerCase();
    if (seenMessages.has(key)) return false;
    seenMessages.add(key);
    return true;
  });

  return deduped.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.priority] || 99) - (order[b.priority] || 99);
  });
}

/**
 * Confidence scoring — per-section provenance-based. Each section reports
 * whether its data is measured (real provider evidence) or estimated, and
 * the global score is the weighted mean of measured sections. Never
 * returns a confidence of 100 for estimated data.
 */
function calculateConfidence(data) {
  const breakdown = {};

  const section = (key, status, base) => {
    const entry = {
      status,
      score: status === 'measured' ? Math.round(base || 85) : Math.round(base || 35)
    };
    if (status === 'estimated') entry.note = 'Based on estimates — connect the relevant data provider';
    breakdown[key] = entry;
    return entry;
  };

  if (data.technicalAudit?.overallScore != null) section('technicalSeo', 'measured', 90);
  else section('technicalSeo', 'estimated', 30);
  if (data.technicalAudit?.scores?.overall != null) breakdown.technicalSeo.score = Math.max(breakdown.technicalSeo.score, 92);

  const kw = data.keywordIntelligence || {};
  const measuredKeywords = [
    ...asArray(kw.primaryKeywords),
    ...asArray(kw.secondaryKeywords),
    ...asArray(kw.longTailKeywords)
  ].filter(k => {
    const v = k.searchVolume ?? k.volume ?? null;
    return v != null && v >= 1;
  }).length;
  const totalKeywords = measuredKeywords + [
    ...asArray(kw.primaryKeywords),
    ...asArray(kw.secondaryKeywords),
    ...asArray(kw.longTailKeywords)
  ].filter(k => {
    const v = k.searchVolume ?? k.volume ?? null;
    return !(v != null && v >= 1);
  }).length;
  if (measuredKeywords > 0) section('keywordIntelligence', 'measured', 70 + Math.min(measuredKeywords, 25));
  else if (totalKeywords > 0) section('keywordIntelligence', 'estimated', 40);
  else section('keywordIntelligence', 'unavailable', 0);

  if (data.geoIntelligence?.aiVisibilityScore != null) section('geoAiVisibility', 'measured', 80);
  else section('geoAiVisibility', 'estimated', 30);

  if (data.aiVisibility && (data.aiVisibility.platforms || []).some(p => p.status === 'measured')) {
    section('aiVisibility', 'measured', 80 + Math.min(data.aiVisibility.totalPlatformsMeasured * 4, 15));
  } else if (data.aiVisibility && (data.aiVisibility.platforms || []).length > 0) {
    section('aiVisibility', 'estimated', 25);
  } else {
    section('aiVisibility', 'unavailable', 0);
  }

  if (data.competitorIntelligence?.competitors?.length > 0) section('competitorIntelligence', 'measured', 80);
  else section('competitorIntelligence', 'estimated', 30);

  if (data.pageSpeed?.mobile?.performance != null) section('coreWebVitals', 'measured', 85);
  else if (data.crux?.lcp?.p75 != null) section('coreWebVitals', 'measured', 90);
  else section('coreWebVitals', 'estimated', 30);

  if (data.backlinkData?.backlinks?.referringDomains != null) section('backlinks', 'measured', 85);
  else section('backlinks', 'estimated', 25);

  if (data.serpAnalysis && data.serpAnalysis.status === 'measured') section('serpAnalysis', 'measured', 80);
  else section('serpAnalysis', 'unavailable', 0);

  if (data.providers?.serpapi?.available) breakdown.serpapi = { status: 'measured', score: 100 };
  if (data.providers?.dataforseo?.available) breakdown.dataforseo = { status: 'measured', score: 95 };

  const entries = Object.values(breakdown).filter(e => e.status !== 'unavailable');
  const measuredEntries = entries.filter(e => e.status === 'measured');
  const estimatedEntries = entries.filter(e => e.status === 'estimated');
  const total = entries.length > 0 ? entries.reduce((a, e) => a + e.score, 0) : 0;
  const score = entries.length > 0 ? Math.round(total / entries.length) : 0;

  return {
    score,
    breakdown,
    measuredSections: measuredEntries.length,
    estimatedSections: estimatedEntries.length,
    measuredSignalCount: measuredEntries.length
  };
}

function scoreToRating(score) {
  if (score == null) return 'unavailable';
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'average';
  if (score >= 30) return 'poor';
  return 'critical';
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}
