/**
 * Canonical SEO Intelligence Normalizer
 * Normalizes all SEO JSON shapes across legacy and current data formats
 * Used by Content Brief, Content Studio, Campaign Intelligence, Automation Plan, Email Automation, CRM
 */

import { asArray, takeArray } from './array-helpers.js';
import { isLowQualityKeyword } from '../../services/execution/keyword-quality.filter.js';

/**
 * Extract keyword text from various object shapes
 */
function extractKeywordText(k) {
  if (typeof k === 'string') return k;
  if (!k || typeof k !== 'object') return null;
  return k.keyword || k.term || k.name || k.topic || k.value || null;
}

/**
 * Normalize a single keyword item to canonical shape
 * Supports all known field variations and preserves real DataForSEO values
 */
function normalizeKeywordItem(k) {
  const keyword = extractKeywordText(k);
  if (isLowQualityKeyword(keyword)) return null;
  const difficulty = k.keywordDifficulty ?? k.difficulty ?? k.kd ?? null;
  const competition = k.competition ?? k.paidCompetition ?? k.competitionIndex ?? null;
  
  // Derive opportunity score: low difficulty + decent volume = high opportunity
  let opportunity = k.opportunity ?? null;
  if (opportunity === null && difficulty !== null) {
    const vol = k.volume ?? k.searchVolume ?? k.monthlyVolume ?? k.searches ?? 0;
    if (difficulty <= 30 && vol > 100) opportunity = 90;
    else if (difficulty <= 50 && vol > 50) opportunity = 70;
    else if (difficulty <= 70) opportunity = 50;
    else opportunity = 30;
  }

  return {
    keyword: keyword || 'unknown',
    volume: k.volume ?? k.searchVolume ?? k.monthlyVolume ?? k.searches ?? null,
    difficulty,
    opportunity,
    trend: k.trend ?? k.trendDirection ?? null,
    cpc: k.cpc ?? k.costPerClick ?? null,
    competition,
    competitionIndex: k.competitionIndex ?? null,
    keywordDifficulty: difficulty,
    intent: k.intent ?? k.searchIntent ?? null,
    source: k.source ?? k.dataSource ?? null,
    evidence: k.evidence ?? null
  };
}

/**
 * Deduplicate keywords case-insensitively
 */
function deduplicateKeywords(keywords) {
  const seen = new Set();
  return keywords.filter(k => {
    const lower = k.keyword.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

/**
 * Extract and flatten nested keyword arrays from keywordOpportunities object
 */
function extractNestedKeywords(keywordOpportunities) {
  if (!keywordOpportunities || typeof keywordOpportunities !== 'object') {
    return [];
  }

  // If it's an array, process directly
  if (Array.isArray(keywordOpportunities)) {
    return keywordOpportunities;
  }

  // Extract from nested structure
  const allKeywords = [];
  
  if (keywordOpportunities.primaryKeywords) {
    allKeywords.push(...asArray(keywordOpportunities.primaryKeywords));
  }
  if (keywordOpportunities.secondaryKeywords) {
    allKeywords.push(...asArray(keywordOpportunities.secondaryKeywords));
  }
  if (keywordOpportunities.longTailKeywords) {
    allKeywords.push(...asArray(keywordOpportunities.longTailKeywords));
  }
  if (keywordOpportunities.questionKeywords) {
    allKeywords.push(...asArray(keywordOpportunities.questionKeywords));
  }
  if (keywordOpportunities.competitorKeywords) {
    allKeywords.push(...asArray(keywordOpportunities.competitorKeywords));
  }
  if (keywordOpportunities.geoKeywords) {
    allKeywords.push(...asArray(keywordOpportunities.geoKeywords));
  }
  if (keywordOpportunities.contentOpportunities) {
    allKeywords.push(...asArray(keywordOpportunities.contentOpportunities));
  }
  if (keywordOpportunities.clusters) {
    // Flatten clusters
    keywordOpportunities.clusters.forEach(cluster => {
      if (cluster.keywords) {
        allKeywords.push(...asArray(cluster.keywords));
      }
    });
  }

  return allKeywords;
}

/**
 * Normalize SEO intelligence for execution modules
 * Handles all known legacy and current data shapes
 */
export function normalizeSeoForExecution(seoInfo) {
  if (!seoInfo || typeof seoInfo !== 'object' || seoInfo.exists === false || seoInfo.status === 'NOT_RUN') {
    return {
      available: false,
      status: seoInfo?.status || 'NOT_RUN',
      keywords: [],
      keywordOpportunities: [],
      primaryKeywords: [],
      secondaryKeywords: [],
      longTailKeywords: [],
      questionKeywords: [],
      competitorKeywords: [],
      allKeywords: [],
      contentOpportunities: [],
      contentGaps: [],
      clusters: [],
      technicalAudit: null,
      seoScore: null,
      actionPlan: [],
      warnings: seoInfo?.exists === false ? [] : ['SEO intelligence not available']
    };
  }

  const warnings = [];

  // Extract keywords from various possible locations
  const keywordOpportunitiesRaw = seoInfo.keywordOpportunities ?? 
    seoInfo.keywordIntelligence?.opportunities ?? 
    seoInfo.keywordIntelligence?.keywords ?? 
    seoInfo.keywords ?? 
    seoInfo.keywordData ?? [];

  // Extract nested keywords from keywordOpportunities object
  const nestedKeywords = extractNestedKeywords(keywordOpportunitiesRaw);

  // Extract top-level keyword arrays
  const primaryKeywordsRaw = seoInfo.primaryKeywords ?? 
    seoInfo.keywordIntelligence?.primary ?? 
    seoInfo.keywordIntelligence?.primaryKeywords ?? 
    keywordOpportunitiesRaw?.primaryKeywords ?? [];

  const secondaryKeywordsRaw = seoInfo.secondaryKeywords ?? 
    seoInfo.keywordIntelligence?.secondary ?? 
    seoInfo.keywordIntelligence?.secondaryKeywords ?? 
    keywordOpportunitiesRaw?.secondaryKeywords ?? [];

  const longTailKeywordsRaw = seoInfo.longTailKeywords ?? 
    seoInfo.keywordIntelligence?.longTail ?? 
    keywordOpportunitiesRaw?.longTailKeywords ?? [];

  const questionKeywordsRaw = seoInfo.questionKeywords ?? 
    keywordOpportunitiesRaw?.questionKeywords ?? [];

  const competitorKeywordsRaw = seoInfo.competitorKeywords ?? 
    keywordOpportunitiesRaw?.competitorKeywords ?? [];

  // Extract content opportunities
  const contentOpportunitiesRaw = seoInfo.contentOpportunities ?? 
    keywordOpportunitiesRaw?.contentOpportunities ?? [];

  const clustersRaw = seoInfo.clusters ?? 
    keywordOpportunitiesRaw?.clusters ?? [];

  // Extract content gaps from all known shapes
  const contentGapsRaw = seoInfo.contentGaps ?? 
    seoInfo.gapAnalysis ?? 
    seoInfo.contentGapRecord?.contentGaps ?? 
    seoInfo.contentGaps?.gaps ?? 
    seoInfo.contentGaps?.items ?? 
    seoInfo.contentGaps?.missingPages ?? 
    seoInfo.contentGaps?.contentOpportunities ?? 
    seoInfo.contentGaps?.topGaps ?? [];

  const blogIdeasRaw = seoInfo.blogIdeas ?? 
    seoInfo.contentIdeas ?? 
    seoInfo.topicIdeas ?? 
    seoInfo.blogTopics ?? [];

  // Normalize all keyword arrays, filtering out low-quality entries
  const normalizedNested = asArray(nestedKeywords).map(normalizeKeywordItem).filter(Boolean);
  const normalizedPrimary = asArray(primaryKeywordsRaw).map(normalizeKeywordItem).filter(Boolean);
  const normalizedSecondary = asArray(secondaryKeywordsRaw).map(normalizeKeywordItem).filter(Boolean);
  const normalizedLongTail = asArray(longTailKeywordsRaw).map(normalizeKeywordItem).filter(Boolean);
  const normalizedQuestion = asArray(questionKeywordsRaw).map(normalizeKeywordItem).filter(Boolean);
  const normalizedCompetitor = asArray(competitorKeywordsRaw).map(normalizeKeywordItem).filter(Boolean);

  // Combine all keywords and deduplicate
  const allKeywordsRaw = [
    ...normalizedNested,
    ...normalizedPrimary,
    ...normalizedSecondary,
    ...normalizedLongTail,
    ...normalizedQuestion,
    ...normalizedCompetitor
  ];
  const allKeywords = deduplicateKeywords(allKeywordsRaw);

  // Normalize content opportunities
  const normalizedContentOpportunities = asArray(contentOpportunitiesRaw).map(opp => ({
    topic: opp.topic || opp.opportunity || opp.title || opp,
    reason: opp.reason || opp.description || null,
    priority: opp.priority ?? opp.importance ?? null,
    contentType: opp.contentType ?? 'content'
  }));

  // Normalize clusters
  const normalizedClusters = asArray(clustersRaw).map(cluster => ({
    name: cluster.name || cluster.topic || 'Cluster',
    keywords: asArray(cluster.keywords).map(normalizeKeywordItem).filter(Boolean),
    volume: cluster.volume ?? null,
    difficulty: cluster.difficulty ?? null
  }));

  // Normalize content gaps
  const normalizedContentGaps = asArray(contentGapsRaw).map(gap => ({
    topic: gap.topic || gap.opportunity || gap.title || gap,
    reason: gap.reason || gap.gap || gap.description || null,
    priority: gap.priority ?? gap.importance ?? null
  }));

  // Normalize blog ideas
  const normalizedBlogIdeas = asArray(blogIdeasRaw).map(idea => ({
    topic: idea.topic || idea.title || idea.idea || idea,
    reason: idea.reason || idea.description || null,
    contentType: idea.contentType ?? idea.type ?? 'blog'
  }));

  // Extract technical audit
  const technicalAudit = seoInfo.technicalAudit ?? seoInfo.audit ?? seoInfo.technicalAnalysis ?? null;

  // Extract SEO score
  const seoScore = seoInfo.seoScore ?? seoInfo.score ?? seoInfo.overallScore ?? null;

  // Add warnings for missing critical data
  if (allKeywords.length === 0) {
    warnings.push('No keyword data available in SEO intelligence');
  }

  if (normalizedContentGaps.length === 0 && normalizedContentOpportunities.length === 0) {
    warnings.push('No content gap analysis available');
  }

  return {
    available: true,
    keywords: allKeywords.slice(0, 50),
    keywordOpportunities: normalizedNested.slice(0, 20),
    primaryKeywords: normalizedPrimary.slice(0, 10),
    secondaryKeywords: normalizedSecondary.slice(0, 10),
    longTailKeywords: normalizedLongTail.slice(0, 15),
    questionKeywords: normalizedQuestion.slice(0, 10),
    competitorKeywords: normalizedCompetitor.slice(0, 10),
    allKeywords: allKeywords.slice(0, 100),
    contentOpportunities: normalizedContentOpportunities.slice(0, 15),
    contentGaps: normalizedContentGaps.slice(0, 10),
    clusters: normalizedClusters.slice(0, 10),
    blogIdeas: normalizedBlogIdeas.slice(0, 10),
    technicalAudit,
    seoScore,
    warnings
  };
}

/**
 * Normalize SEO intelligence for frontend display.
 * Returns cleaner output suitable for rendering in UI components.
 */
export function normalizeSeoForFrontend(seoInfo) {
  const exec = normalizeSeoForExecution(seoInfo);

  return {
    available: exec.available,
    status: exec.status || (exec.available ? 'COMPLETED' : 'NOT_RUN'),
    technicalAudit: exec.technicalAudit || null,
    primaryKeywords: exec.primaryKeywords,
    secondaryKeywords: exec.secondaryKeywords,
    longTailKeywords: exec.longTailKeywords,
    questionKeywords: exec.questionKeywords,
    allKeywords: exec.allKeywords,
    contentOpportunities: exec.contentOpportunities,
    contentGaps: exec.contentGaps,
    blogIdeas: exec.blogIdeas || [],
    competitors: null,
    aiSearchReadiness: null,
    actionPlan: exec.actionPlan || null,
    dataCompleteness: {
      hasKeywords: exec.allKeywords.length > 0,
      hasContentGaps: exec.contentGaps.length > 0 || exec.contentOpportunities.length > 0,
      hasTechnicalAudit: !!exec.technicalAudit,
      hasCompetitors: false,
    },
    warnings: exec.warnings,
  };
}

/**
 * Normalize SEO intelligence for consumers (frontend, PDF, report builder).
 * Splits keywords into measuredKeywords (with DataForSEO metrics) and topicCandidates (topic_idea_only).
 * Returns unified counts object so all consumers agree.
 */
export function normalizeSeoIntelligenceForConsumers(seoInfo) {
  if (!seoInfo || typeof seoInfo !== 'object') {
    return {
      measuredKeywords: [],
      topicCandidates: [],
      contentGaps: [],
      blogIdeas: [],
      technicalAudit: null,
      counts: { measured: 0, topicCandidates: 0, contentGaps: 0, blogIdeas: 0, competitors: 0, total: 0 }
    };
  }

  // Collect ALL keyword items from all possible locations
  const allItems = [];

  const keywordOpportunitiesRaw = seoInfo.keywordOpportunities ??
    seoInfo.keywordIntelligence?.opportunities ??
    seoInfo.keywordIntelligence?.keywords ??
    seoInfo.keywords ??
    seoInfo.keywordData ?? [];

  const nestedItems = extractNestedKeywords(keywordOpportunitiesRaw);
  allItems.push(...asArray(nestedItems));

  const topLevelArrays = [
    seoInfo.primaryKeywords,
    seoInfo.secondaryKeywords,
    seoInfo.longTailKeywords,
    seoInfo.questionKeywords,
    seoInfo.competitorKeywords,
    keywordOpportunitiesRaw?.primaryKeywords,
    keywordOpportunitiesRaw?.secondaryKeywords,
    keywordOpportunitiesRaw?.longTailKeywords,
    keywordOpportunitiesRaw?.questionKeywords,
    keywordOpportunitiesRaw?.competitorKeywords,
    keywordOpportunitiesRaw?.geoKeywords,
    keywordOpportunitiesRaw?.contentOpportunities,
  ];

  for (const arr of topLevelArrays) {
    allItems.push(...asArray(arr));
  }

  // Also flatten clusters
  const clustersRaw = seoInfo.clusters ?? keywordOpportunitiesRaw?.clusters ?? [];
  for (const cluster of asArray(clustersRaw)) {
    allItems.push(...asArray(cluster.keywords));
  }

  // Normalize all items
  const normalizedItems = allItems.map(normalizeKeywordItem).filter(Boolean);

  // Deduplicate by keyword text
  const seen = new Set();
  const deduped = normalizedItems.filter(k => {
    const lower = k.keyword.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  // Split by metric availability: measuredKeywords have real volume/difficulty/cpc ≥ 1
  const measuredKeywords = deduped.filter(k =>
    k.source !== 'topic_idea_only' &&
    k.source !== 'ai_extracted' &&
    k.source !== 'topic_candidate' &&
    ((k.volume !== null && k.volume >= 1) ||
     (k.difficulty !== null && k.difficulty >= 1) ||
     (k.cpc !== null && k.cpc >= 1))
  );

  const topicCandidates = deduped.filter(k =>
    !measuredKeywords.includes(k) &&
    k.volume === null &&
    k.difficulty === null &&
    k.cpc === null
  );

  // Normalize content gaps
  const contentGapsRaw = seoInfo.contentGaps ??
    seoInfo.gapAnalysis ??
    seoInfo.contentGapRecord?.contentGaps ??
    seoInfo.contentGaps?.gaps ??
    seoInfo.contentGaps?.items ??
    seoInfo.contentGaps?.missingPages ??
    seoInfo.contentGaps?.contentOpportunities ??
    seoInfo.contentGaps?.topGaps ?? [];

  const normalizedContentGaps = asArray(contentGapsRaw).map(gap => ({
    topic: gap.topic || gap.opportunity || gap.title || (typeof gap === 'string' ? gap : ''),
    targetKeyword: gap.targetKeyword || null,
    reason: gap.reason || gap.gap || gap.description || null,
    priority: gap.priority ?? gap.importance ?? null,
    contentType: gap.contentType || gap.recommendedType || 'content',
    evidence: gap.evidence || null,
    recommendedSections: gap.recommendedSections || null
  })).filter(g => g.topic);

  // Normalize blog ideas
  const blogIdeasRaw = seoInfo.blogIdeas ??
    seoInfo.contentIdeas ??
    seoInfo.topicIdeas ??
    seoInfo.blogTopics ?? [];

  const normalizedBlogIdeas = asArray(blogIdeasRaw).map(idea => ({
    topic: idea.topic || idea.title || idea.idea || (typeof idea === 'string' ? idea : ''),
    targetKeyword: idea.targetKeyword || idea.keyword || null,
    reason: idea.reason || idea.description || null,
    evidence: idea.evidence || null,
    contentType: idea.contentType ?? idea.type ?? 'blog',
    intent: idea.intent || null,
    priority: idea.priority ?? idea.importance ?? null
  })).filter(b => b.topic);

  // Normalize technical audit
  const technicalAudit = normalizeTechnicalAuditForConsumers(
    seoInfo.technicalAudit ?? seoInfo.audit ?? seoInfo.technicalAnalysis ?? null
  );

  // Build unified counts
  const counts = {
    measured: measuredKeywords.length,
    topicCandidates: topicCandidates.length,
    contentGaps: normalizedContentGaps.length,
    blogIdeas: normalizedBlogIdeas.length,
    competitors: (seoInfo.competitorKeywords && asArray(seoInfo.competitorKeywords).length) || 0,
    total: measuredKeywords.length + topicCandidates.length + normalizedContentGaps.length + normalizedBlogIdeas.length
  };

  return {
    measuredKeywords: measuredKeywords.slice(0, 50),
    topicCandidates: topicCandidates.slice(0, 100),
    contentGaps: normalizedContentGaps.slice(0, 20),
    blogIdeas: normalizedBlogIdeas.slice(0, 20),
    technicalAudit,
    counts
  };
}

/**
 * Normalize technical audit data for consumers (frontend, PDF, report builder).
 * Maps from actual stored database paths to a normalized consumer shape.
 * Database stores technical audit data in json columns with variable structures:
 * - auditData { mobile, desktop, scores, issues, pageSpeed }
 * - lighthouse { categories, audits, performance, accessibility, best-practices, seo }
 * - pageSpeed { mobile, desktop }
 * - cores { webVitals, mobile, desktop }
 * - scores { performance, accessibility, seo, bestPractices }
 * - issues { critical, major, minor }
 */
export function normalizeTechnicalAuditForConsumers(audit) {
  if (!audit || typeof audit !== 'object') return null;

  // Walk through all common access paths
  const ad = audit.auditData || audit;

  // Lighthouse data (from PageSpeed Insights / Lighthouse API)
  const lighthouse = ad.lighthouse || ad.lighthouseResult || null;

  // PageSpeed data (mobile/desktop split)
  const pageSpeed = ad.pageSpeed || ad.pageSpeedInsights || ad.lighthouse?.pageSpeed || null;

  // Extract mobile and desktop data from various locations
  const mobData = ad.mobile || pageSpeed?.mobile || audit.mobile || null;
  const deskData = ad.desktop || pageSpeed?.desktop || audit.desktop || null;

  // Core Web Vitals
  const cores = ad.cores || audit.cores || null;

  // Scores from various locations
  const scores = ad.scores || audit.scores || lighthouse?.categories || null;

  // Issues
  const issues = ad.issues || ad.auditIssues || audit.issues || lighthouse?.audits || null;

  // Normalize performance score from multiple paths
  const getDeviceScore = (deviceData, metric) => {
    if (!deviceData) return null;
    // Common paths: lighthouseScores.performance, performance, performanceScore, scores.performance
    const ls = deviceData.lighthouseScores;
    if (ls) {
      const v = ls[metric] ?? ls[metric === 'bestPractices' ? 'bestPractices' : metric] ?? null;
      if (v !== null && v !== undefined) return v;
    }
    const v = deviceData[metric] ?? deviceData[metric + 'Score'] ?? deviceData.scores?.[metric] ?? null;
    if (v !== null && v !== undefined) return v;
    return null;
  };

  const extractScore = (source, key) => {
    if (!source) return null;
    const val = source[key] ?? source.score ?? source[key + 'Score'] ?? null;
    if (typeof val === 'number') return val;
    if (typeof val === 'object' && val !== null) return val.score ?? val.value ?? null;
    return null;
  };

  const performance = mobData ? getDeviceScore(mobData, 'performance')
    : deskData ? getDeviceScore(deskData, 'performance')
    : scores ? (scores.performance?.score ?? null)
    : null;

  const accessibility = mobData ? getDeviceScore(mobData, 'accessibility')
    : deskData ? getDeviceScore(deskData, 'accessibility')
    : scores?.accessibility?.score ?? null;

  const bestPractices = mobData ? getDeviceScore(mobData, 'bestPractices')
    : deskData ? getDeviceScore(deskData, 'bestPractices')
    : scores?.['best-practices']?.score ?? scores?.bestPractices?.score ?? null;

  const seo = mobData ? getDeviceScore(mobData, 'seo')
    : deskData ? getDeviceScore(deskData, 'seo')
    : scores?.seo?.score ?? null;

  // Count issues
  const criticalIssues = asArray(issues?.critical || issues?.errors || []).length;
  const majorIssues = asArray(issues?.major || issues?.warnings || []).length;
  const minorIssues = asArray(issues?.minor || issues?.info || issues?.notices || []).length;
  const totalIssues = criticalIssues + majorIssues + minorIssues;

  const buildDeviceDetail = (deviceData) => {
    if (!deviceData) return null;
    const ls = deviceData.lighthouseScores || {};
    const pa = deviceData.performanceAudits || {};
    const cv = deviceData.coreWebVitals || {};
    return {
      score: getDeviceScore(deviceData, 'performance') ?? null,
      fcp: pa.firstContentfulPaint ?? deviceData.firstContentfulPaint ?? deviceData.fcp ?? cv.fcp ?? null,
      lcp: pa.largestContentfulPaint ?? deviceData.largestContentfulPaint ?? deviceData.lcp ?? cv.lcp ?? null,
      tbt: pa.totalBlockingTime ?? deviceData.totalBlockingTime ?? deviceData.tbt ?? null,
      cls: pa.cumulativeLayoutShift ?? deviceData.cumulativeLayoutShift ?? deviceData.cls ?? cv.cls ?? null,
      si: pa.speedIndex ?? deviceData.speedIndex ?? deviceData.si ?? null,
    };
  };

  // Normalize score: 0-1 range to 0-100
  const toPercent = (v) => v !== null && v !== undefined ? Math.round(v * (v > 1 ? 1 : 100)) : null;

  return {
    available: performance !== null || accessibility !== null || bestPractices !== null || seo !== null ||
               !!(mobData && Object.keys(mobData).length > 0) ||
               !!(deskData && Object.keys(deskData).length > 0),
    source: 'PageSpeed',
    performance: toPercent(performance),
    accessibility: toPercent(accessibility),
    bestPractices: toPercent(bestPractices),
    seo: toPercent(seo),
    mobile: buildDeviceDetail(mobData),
    desktop: buildDeviceDetail(deskData),
    coreWebVitals: cores ? {
      lcp: cores.lcp || cores.largestContentfulPaint || null,
      fid: cores.fid || cores.firstInputDelay || null,
      cls: cores.cls || cores.cumulativeLayoutShift || null,
      inp: cores.inp || cores.interactionToNextPaint || null,
    } : null,
    issues: {
      critical: criticalIssues,
      major: majorIssues,
      minor: minorIssues,
      total: totalIssues,
      items: [
        ...asArray(issues?.critical || issues?.errors || []).slice(0, 10),
        ...asArray(issues?.major || issues?.warnings || []).slice(0, 10),
        ...asArray(issues?.minor || issues?.info || issues?.notices || []).slice(0, 10),
      ].map(i => ({
        title: i.title || i.message || i.description || '',
        severity: i.severity || i.level || 'info',
        category: i.category || i.type || 'other',
        description: i.description || i.message || '',
        impact: i.impact || null
      }))
    }
  };
}

export default { normalizeSeoForExecution, normalizeSeoForFrontend, normalizeSeoIntelligenceForConsumers, normalizeTechnicalAuditForConsumers };
