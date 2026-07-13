/**
 * Canonical SEO Intelligence Normalizer
 * Normalizes all SEO JSON shapes across legacy and current data formats
 * Used by Content Brief, Content Studio, Campaign Intelligence, Automation Plan, Email Automation, CRM
 */

import { asArray, takeArray } from './array-helpers.js';

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
      contentGaps: [],
      blogIdeas: [],
      technicalAudit: null,
      seoScore: null,
      warnings: ['SEO intelligence not available']
    };
  }

  const warnings = [];

  // Extract keywords from various possible locations
  const keywordOpportunities = takeArray(
    seoInfo.keywordOpportunities ??
    seoInfo.keywordIntelligence?.opportunities ??
    seoInfo.keywordIntelligence?.keywords ??
    seoInfo.keywords ??
    seoInfo.keywordData ??
    [],
    20
  );

  const primaryKeywords = takeArray(
    seoInfo.primaryKeywords ??
    seoInfo.keywordIntelligence?.primary ??
    seoInfo.keywordIntelligence?.primaryKeywords ??
    [],
    10
  );

  const secondaryKeywords = takeArray(
    seoInfo.secondaryKeywords ??
    seoInfo.keywordIntelligence?.secondary ??
    seoInfo.keywordIntelligence?.secondaryKeywords ??
    [],
    10
  );

  const longTailKeywords = takeArray(
    seoInfo.longTailKeywords ??
    seoInfo.keywordIntelligence?.longTail ??
    [],
    15
  );

  // Extract content opportunities
  const contentGaps = takeArray(
    seoInfo.contentGaps ??
    seoInfo.contentOpportunities ??
    seoInfo.gapAnalysis ??
    [],
    10
  );

  const blogIdeas = takeArray(
    seoInfo.blogIdeas ??
    seoInfo.contentIdeas ??
    seoInfo.topicIdeas ??
    [],
    10
  );

  // Extract technical audit
  const technicalAudit = seoInfo.technicalAudit ?? seoInfo.audit ?? seoInfo.technicalAnalysis ?? null;

  // Extract SEO score
  const seoScore = seoInfo.seoScore ?? seoInfo.score ?? seoInfo.overallScore ?? null;

  // Normalize keyword objects to standard shape
  const normalizedKeywords = asArray(keywordOpportunities).map(k => ({
    keyword: k.keyword || k.term || k.name || k,
    volume: k.volume ?? k.searchVolume ?? k.monthlyVolume ?? null,
    difficulty: k.difficulty ?? k.keywordDifficulty ?? k.competition ?? null,
    opportunity: k.opportunity ?? k.potential ?? null,
    trend: k.trend ?? null
  }));

  const normalizedPrimary = asArray(primaryKeywords).map(k => ({
    keyword: k.keyword || k.term || k.name || k,
    volume: k.volume ?? k.searchVolume ?? null,
    difficulty: k.difficulty ?? k.keywordDifficulty ?? null
  }));

  const normalizedSecondary = asArray(secondaryKeywords).map(k => ({
    keyword: k.keyword || k.term || k.name || k,
    volume: k.volume ?? k.searchVolume ?? null,
    difficulty: k.difficulty ?? k.keywordDifficulty ?? null
  }));

  const normalizedLongTail = asArray(longTailKeywords).map(k => ({
    keyword: k.keyword || k.term || k.name || k,
    volume: k.volume ?? k.searchVolume ?? null,
    difficulty: k.difficulty ?? k.keywordDifficulty ?? null
  }));

  // Normalize content gaps
  const normalizedContentGaps = asArray(contentGaps).map(gap => ({
    topic: gap.topic || gap.opportunity || gap.title || gap,
    reason: gap.reason || gap.gap || gap.description || null,
    priority: gap.priority ?? gap.importance ?? null
  }));

  // Normalize blog ideas
  const normalizedBlogIdeas = asArray(blogIdeas).map(idea => ({
    topic: idea.topic || idea.title || idea.idea || idea,
    reason: idea.reason || idea.description || null,
    contentType: idea.contentType ?? idea.type ?? 'blog'
  }));

  // Add warnings for missing critical data
  if (normalizedKeywords.length === 0 && normalizedPrimary.length === 0) {
    warnings.push('No keyword data available in SEO intelligence');
  }

  if (normalizedContentGaps.length === 0) {
    warnings.push('No content gap analysis available');
  }

  return {
    available: true,
    keywords: normalizedKeywords,
    keywordOpportunities: normalizedKeywords,
    primaryKeywords: normalizedPrimary,
    secondaryKeywords: normalizedSecondary,
    longTailKeywords: normalizedLongTail,
    contentGaps: normalizedContentGaps,
    blogIdeas: normalizedBlogIdeas,
    technicalAudit,
    seoScore,
    warnings
  };
}

export default { normalizeSeoForExecution };
