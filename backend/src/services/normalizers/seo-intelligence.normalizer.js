/**
 * Canonical SEO Intelligence Normalizer
 * Normalizes all SEO JSON shapes across legacy and current data formats
 * Used by Content Brief, Content Studio, Campaign Intelligence, Automation Plan, Email Automation, CRM
 */

import { asArray, takeArray } from './array-helpers.js';

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
  
  return {
    keyword: keyword || 'unknown',
    volume: k.volume ?? k.searchVolume ?? k.monthlyVolume ?? k.searches ?? null,
    cpc: k.cpc ?? k.costPerClick ?? null,
    competition: k.competition ?? k.paidCompetition ?? null,
    competitionIndex: k.competitionIndex ?? null,
    keywordDifficulty: k.keywordDifficulty ?? k.difficulty ?? k.kd ?? null,
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
  if (!seoInfo || typeof seoInfo !== 'object') {
    return {
      available: false,
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
      warnings: ['SEO intelligence not available']
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
    seoInfo.contentGaps?.gaps ?? 
    seoInfo.contentGaps?.items ?? 
    seoInfo.contentGaps?.missingPages ?? 
    seoInfo.contentGaps?.contentOpportunities ?? 
    seoInfo.contentGaps?.topGaps ?? [];

  const blogIdeasRaw = seoInfo.blogIdeas ?? 
    seoInfo.contentIdeas ?? 
    seoInfo.topicIdeas ?? 
    seoInfo.blogTopics ?? [];

  // Normalize all keyword arrays
  const normalizedNested = asArray(nestedKeywords).map(normalizeKeywordItem);
  const normalizedPrimary = asArray(primaryKeywordsRaw).map(normalizeKeywordItem);
  const normalizedSecondary = asArray(secondaryKeywordsRaw).map(normalizeKeywordItem);
  const normalizedLongTail = asArray(longTailKeywordsRaw).map(normalizeKeywordItem);
  const normalizedQuestion = asArray(questionKeywordsRaw).map(normalizeKeywordItem);
  const normalizedCompetitor = asArray(competitorKeywordsRaw).map(normalizeKeywordItem);

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
    keywords: asArray(cluster.keywords).map(normalizeKeywordItem),
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

export default { normalizeSeoForExecution };
