import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

/**
 * PHASE 7: EXECUTIVE SEO DASHBOARD GENERATOR
 * 
 * Generates comprehensive executive-level SEO dashboard combining:
 * - Technical SEO
 * - Keyword Intelligence
 * - GEO Intelligence
 * - Competitor Intelligence
 * - Content Gap Analysis
 * - Blog Intelligence
 * 
 * Output: Executive-ready strategic dashboard with actionable insights
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ============================================
// SAFE NORMALIZERS
// ============================================

/**
 * Safely convert any value to an array
 * Handles: arrays, objects (converts values to array), strings (splits by comma), JSON strings, null/undefined
 */
function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  
  // If it's an object, convert its values to an array
  if (typeof value === 'object') {
    // Check if it has a missingKeywords property (keywordGaps structure)
    if (value.missingKeywords && Array.isArray(value.missingKeywords)) {
      return value.missingKeywords;
    }
    // Otherwise convert object values to array
    return Object.values(value).filter(v => v !== null && v !== undefined);
  }
  
  // If it's a string, try to parse as JSON
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === 'object') {
        if (parsed.missingKeywords && Array.isArray(parsed.missingKeywords)) {
          return parsed.missingKeywords;
        }
        return Object.values(parsed).filter(v => v !== null && v !== undefined);
      }
    } catch (e) {
      // Not JSON, split by comma if it looks like a list
      if (value.includes(',')) {
        return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
      // Return as single-item array
      return [value];
    }
  }
  
  return [];
}

/**
 * Safely convert any value to an object
 */
function asObject(value) {
  if (value === null || value === undefined) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return {};
    }
  }
  return {};
}

/**
 * Safely slice an array with limit
 */
function safeSlice(value, limit) {
  const arr = asArray(value);
  return arr.slice(0, limit);
}

/**
 * Safely convert to number
 */
function safeNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
}

// ============================================
// DATA COMPLETENESS ADJUSTMENT HELPER
// Separates measured technical score from data completeness.
// Never subtracts arbitrary points from measured PageSpeed values.
// ============================================

function calculateCompletenessAdjustment({
  technicalAvailable,
  keywordAvailable,
  geoAvailable,
  competitorAvailable,
  contentAvailable
}) {
  const availableCount = [
    technicalAvailable,
    keywordAvailable,
    geoAvailable,
    competitorAvailable,
    contentAvailable
  ].filter(Boolean).length;

  const completenessPercentage =
    Math.round((availableCount / 5) * 100);

  return {
    completenessPercentage,
    status:
      availableCount === 5
        ? 'COMPLETE'
        : availableCount >= 3
          ? 'PARTIAL'
          : 'INSUFFICIENT'
  };
}

/**
 * Safely convert to string
 */
function safeString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return String(value);
}

// ============================================
// TECHNICAL SCORES HELPER
// ============================================

/**
 * Safely extracts PageSpeed scores from all supported paths (mobile + desktop).
 * Returns null for each metric when input is unavailable.
 */
function getTechnicalScores(seoData) {
  const technicalAudit = seoData.technicalAudit || seoData.technicalAuditDetail || {};
  const scoreBreakdown = seoData.scoreBreakdown || {};
  const auditData = technicalAudit.auditData || technicalAudit.lighthouseResult || {};

  // Try multiple paths for mobile/desktop scores
  const mobileResult = auditData.mobileResult || auditData.mobile || {};
  const desktopResult = auditData.desktopResult || auditData.desktop || {};

  const performance = mobileResult.performanceScore ?? desktopResult.performanceScore ?? scoreBreakdown.performanceScore ?? null;
  const seo = mobileResult.seoScore ?? desktopResult.seoScore ?? scoreBreakdown.seoScore ?? scoreBreakdown.onPageScore ?? null;
  const accessibility = mobileResult.accessibilityScore ?? desktopResult.accessibilityScore ?? scoreBreakdown.accessibilityScore ?? null;
  const bestPractices = mobileResult.bestPracticesScore ?? desktopResult.bestPracticesScore ?? scoreBreakdown.bestPracticesScore ?? null;
  const mobilePerformance = mobileResult.performanceScore ?? null;
  const desktopPerformance = desktopResult.performanceScore ?? null;

  const hasAnyScore = performance !== null || seo !== null;

  return {
    performance,
    seo,
    accessibility,
    bestPractices,
    mobilePerformance,
    desktopPerformance,
    source: hasAnyScore ? 'GOOGLE_PAGESPEED' : null,
    measuredAt: technicalAudit.analyzedAt ?? scoreBreakdown.analyzedAt ?? null
  };
}

// ============================================
// MAIN EXECUTIVE DASHBOARD GENERATOR
// ============================================

export async function generateExecutiveDashboard(input = {}) {
  // Normalize input to fix seoData scope
  const seoData = input.seoData || {
    technicalAudit: input.technicalAudit,
    keywordIntelligence: input.keywordIntelligence,
    competitorIntelligence: input.competitorIntelligence,
    geoIntelligence: input.geoIntelligence,
    blogIntelligence: input.blogIntelligence,
    contentGapIntelligence: input.contentGapIntelligence,
    identity: input.identity,
    researchData: input.researchData
  };
  const seoIntelligenceId = input.seoIntelligenceId || null;
  const chatId = input.chatId || seoData.chatId;
  const userId = input.userId || seoData.userId;

  console.log('🎯 [Executive Dashboard] Starting generation for:', seoData.identity?.productName || 'Unknown');

  try {
    
    console.log('✅ [Executive Dashboard] Using verified data from orchestrator');

    // Step 2: Generate Executive Overview
    console.log('📊 [Executive Dashboard] Generating executive overview...');
    const executiveOverview = generateExecutiveOverview(seoData);

    // Step 3: Generate SEO Health Summary
    console.log('🏥 [Executive Dashboard] Generating SEO health summary...');
    const seoHealthSummary = generateSeoHealthSummary(seoData);

    // Step 4: Generate Key Opportunities
    console.log('💡 [Executive Dashboard] Identifying key opportunities...');
    const keyOpportunities = generateKeyOpportunities(seoData);

    // Step 5: Generate Competitor Snapshot
    console.log('🎯 [Executive Dashboard] Creating competitor snapshot...');
    const competitorSnapshot = generateCompetitorSnapshot(seoData);

    // Step 6: Generate AI Search Visibility
    console.log('🤖 [Executive Dashboard] Analyzing AI search visibility...');
    const aiSearchVisibility = generateAiSearchVisibility(seoData);

    // Step 7: Generate Content Strategy Summary
    console.log('📝 [Executive Dashboard] Compiling content strategy...');
    const contentStrategySummary = generateContentStrategySummary(seoData);

    // Step 8: Generate Executive Action Plan
    console.log('📋 [Executive Dashboard] Creating action plan...');
    const executiveActionPlan = generateExecutiveActionPlan(seoData);

    // Step 9: Assess measurement readiness
    console.log('📊 [Executive Dashboard] Assessing measurement readiness...');
    const measurementReadiness = generateMeasurementReadiness(seoData);

    // Step 10: Generate Executive Story (pass executiveOverview for verified scores)
    console.log('📖 [Executive Dashboard] Generating executive story...');
    const executiveStory = generateExecutiveStory(seoData, executiveOverview);

    // Step 11: Save to database
    console.log('💾 [Executive Dashboard] Saving to database...');
    
    // Log keys before saving (for debugging)
    console.log('🔍 [Executive Dashboard] Keys to save:', {
      executiveOverview: Object.keys(executiveOverview || {}),
      seoHealthSummary: Object.keys(seoHealthSummary || {}),
      keyOpportunities: Object.keys(keyOpportunities || {}),
      competitorSnapshot: Object.keys(competitorSnapshot || {}),
      aiSearchVisibility: Object.keys(aiSearchVisibility || {}),
      contentStrategySummary: Object.keys(contentStrategySummary || {}),
      executiveActionPlan: Object.keys(executiveActionPlan || {}),
      measurementReadiness: Object.keys(measurementReadiness || {}),
      executiveStory: Object.keys(executiveStory || {}),
      dataCompleteness: Object.keys(calculateDataCompleteness(seoData) || {})
    });

    console.log('[SEO Exec Save] executiveDashboard keys', Object.keys({
      executiveOverview, seoHealthSummary, keyOpportunities, competitorSnapshot,
      aiSearchVisibility, contentStrategySummary, executiveActionPlan, measurementReadiness
    }));
    console.log('[SEO Exec Save] executiveActionPlan keys', Object.keys(executiveActionPlan || {}));
    console.log('[SEO Exec Save] metadata keys', Object.keys({ generatedAt: new Date().toISOString(), dataCompleteness: calculateDataCompleteness(seoData), executiveStory }));
    console.log('[SEO Exec Save] executiveStory keys', Object.keys(executiveStory || {}));
    
    const dashboard = await prisma.executiveSeoDashboard.upsert({
      where: { seoIntelligenceId },
      create: {
        seoIntelligence: { connect: { id: seoIntelligenceId } },
        executiveOverview,
        seoHealthSummary,
        keyOpportunities,
        competitorSnapshot,
        aiSearchVisibility,
        contentStrategySummary,
        executiveActionPlan,
        measurementReadiness,
        roiForecast: Prisma.JsonNull,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataCompleteness: calculateDataCompleteness(seoData),
          executiveStory: executiveStory
        }
      },
      update: {
        executiveOverview,
        seoHealthSummary,
        keyOpportunities,
        competitorSnapshot,
        aiSearchVisibility,
        contentStrategySummary,
        executiveActionPlan,
        measurementReadiness,
        roiForecast: Prisma.JsonNull,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataCompleteness: calculateDataCompleteness(seoData),
          executiveStory: executiveStory
        },
        updatedAt: new Date()
      }
    });

    console.log('🎉 [Executive Dashboard] Generation complete!');

    return {
      success: true,
      data: dashboard
    };

  } catch (error) {
    console.error('❌ [Executive Dashboard] Error:', error);

    // Use safeSeoData to avoid ReferenceError
    const safeSeoData = seoData || {};

    // Return partial data with error information
    return {
      success: false,
      error: error.message,
      status: 'partial',
      availableModules: Object.keys(safeSeoData).filter(k => safeSeoData[k] !== null && safeSeoData[k] !== undefined)
    };
  }
}

// ============================================
// DATA FETCHING
// ============================================

async function fetchAllSeoData(seoIntelligenceId) {
  const seoIntelligence = await prisma.seoIntelligence.findUnique({
    where: { id: seoIntelligenceId },
    include: {
      technicalAuditDetail: true,
      scoreBreakdown: true,
      keywordIntelligence: true,
      geoIntelligence: true,
      competitorSeoRecord: true,
      contentGapRecord: true,
      blogIntelligenceRecord: true
    }
  });

  if (!seoIntelligence) return null;

  // Add identity from the SeoIntelligence record itself
  return {
    ...seoIntelligence,
    // Normalize to canonical keys for internal functions
    technicalAudit: seoIntelligence.technicalAuditDetail,
    keywordIntelligence: seoIntelligence.keywordIntelligence,
    geoIntelligence: seoIntelligence.geoIntelligence,
    competitorIntelligence: seoIntelligence.competitorSeoRecord,
    contentGapIntelligence: seoIntelligence.contentGapRecord,
    blogIntelligence: seoIntelligence.blogIntelligenceRecord,
    identity: {
      websiteUrl: seoIntelligence.websiteUrl,
      domain: seoIntelligence.domain,
      companyName: seoIntelligence.companyName,
      productName: seoIntelligence.productName,
      industry: 'Technology' // Default, can be enhanced later
    }
  };
}

// ============================================
// EXECUTIVE OVERVIEW GENERATOR
// ============================================

function generateExecutiveOverview(seoData) {
  const scoreBreakdown = seoData.scoreBreakdown || {};
  const keywordIntel = seoData.keywordIntelligence || {};
  const geoIntel = seoData.geoIntelligence || {};
  const competitorIntel = seoData.competitorIntelligence || {};
  const contentGaps = seoData.contentGapIntelligence || {};
  const blogIntel = seoData.blogIntelligence || {};
  const technicalAudit = seoData.technicalAudit || {};

  const sbOverallScore = scoreBreakdown.overallScore ?? scoreBreakdown.overall;
  const hasTechnicalData = sbOverallScore !== undefined && sbOverallScore !== null && scoreBreakdown.dataQuality?.isFallback !== true;

  // Check keyword data quality - count non-empty keywords
  const hasKeywordData = keywordIntel.primaryKeywords && keywordIntel.primaryKeywords.length > 0;
  
  const hasGeoData = geoIntel.aiVisibilityScore !== undefined && geoIntel.aiVisibilityScore !== null;
  const hasCompetitorData = competitorIntel.competitorProfiles &&
    competitorIntel.competitorProfiles.length > 0;
  const hasContentData = contentGaps.contentGaps && contentGaps.contentGaps.length > 0;

  // Data completeness calculated below via calculateCompletenessAdjustment

  // Define all score variables FIRST to avoid TDZ issues
  const technicalHealthValue = hasTechnicalData
    ? Math.round(((scoreBreakdown.onPageScore ?? scoreBreakdown.onPage ?? null) + (scoreBreakdown.performanceScore ?? scoreBreakdown.technical ?? null)) / 2)
    : null;

  const technicalHealth = {
    value: technicalHealthValue,
    status: hasTechnicalData ? null : 'NOT_MEASURED',
    source: hasTechnicalData ? 'Technical SEO Audit' : 'NOT_MEASURED',
    calculationMethod: hasTechnicalData ? 'Average of on-page and performance scores' : 'No technical data available',
    inputsUsed: hasTechnicalData ? ['onPageScore', 'performanceScore'] : [],
    confidence: null,
    evidence: hasTechnicalData ? `On-page: ${scoreBreakdown.onPageScore}, Performance: ${scoreBreakdown.performanceScore}` : 'Technical audit data unavailable',
    lastUpdated: technicalAudit.analyzedAt || new Date().toISOString()
  };

  const contentGapsCount = hasContentData ? contentGaps.contentGaps.length : 0;
  const blogIdeasCount = blogIntel.blogIdeas ? blogIntel.blogIdeas.length : 0;

  const contentAuthorityValue = hasContentData || blogIdeasCount > 0
    ? Math.max(0, Math.min(100, (blogIdeasCount * 10) + (hasContentData ? Math.max(30, 100 - (contentGapsCount * 5)) : 30)))
    : null;

  const contentAuthority = {
    value: contentAuthorityValue,
    status: hasContentData || blogIdeasCount > 0 ? null : 'NOT_MEASURED',
    source: hasContentData ? 'Content Gap + Blog Intelligence' : 'NOT_MEASURED',
    calculationMethod: hasContentData ? 'Base 100 minus gaps penalty plus blog ideas bonus' : 'No content data available',
    inputsUsed: hasContentData ? ['contentGaps', 'blogIdeas'] : [],
    confidence: null,
    evidence: hasContentData ? `${contentGapsCount} content gaps, ${blogIdeasCount} blog ideas available` : 'Content data unavailable',
    lastUpdated: contentGaps.analyzedAt || blogIntel.analyzedAt || new Date().toISOString()
  };

  const authorityScoreValue = hasCompetitorData
    ? (() => {
        const authorities = competitorIntel.competitorProfiles.map(c => c.domainAuthority).filter(v => v != null);
        return authorities.length > 0 ? Math.round(authorities.reduce((a, b) => a + b, 0) / authorities.length) : null;
      })()
    : null;

  const authorityScore = {
    value: authorityScoreValue,
    status: hasCompetitorData ? null : 'NOT_MEASURED',
    source: hasCompetitorData ? 'Competitor SEO Intelligence' : 'NOT_MEASURED',
    calculationMethod: hasCompetitorData ? 'Average domain authority from competitor analysis' : 'No competitor data available',
    inputsUsed: hasCompetitorData ? ['competitorProfiles', 'domainAuthority'] : [],
    confidence: null,
    evidence: hasCompetitorData ? `Based on ${competitorIntel.competitorProfiles.length} competitor profiles` : 'Competitor data unavailable',
    lastUpdated: competitorIntel.analyzedAt || new Date().toISOString()
  };

  const aiVisibilityValue = hasGeoData ? Math.round(geoIntel.aiVisibilityScore) : null;

  const aiVisibility = {
    value: aiVisibilityValue,
    status: hasGeoData ? null : 'NOT_MEASURED',
    section: 'AI Search Readiness',
    source: hasGeoData ? 'GEO Intelligence' : 'NOT_MEASURED',
    calculationMethod: hasGeoData ? 'AI search visibility score from entity analysis' : 'No GEO data available',
    inputsUsed: hasGeoData ? ['aiVisibilityScore', 'citationReadinessScore', 'answerabilityScore'] : [],
    confidence: null,
    evidence: hasGeoData ? `AI visibility: ${geoIntel.aiVisibilityScore}, Citation readiness: ${geoIntel.citationReadinessScore}` : 'GEO data unavailable',
    lastUpdated: geoIntel.analyzedAt || new Date().toISOString()
  };

  const keywordCount = hasKeywordData ? asArray(keywordIntel.primaryKeywords).length : 0;
  const opportunityScoreValue = hasKeywordData
    ? Math.min(100, Math.round((keywordCount / Math.max(1, keywordCount + 5)) * 100))
    : null;

  const opportunityScore = {
    value: opportunityScoreValue,
    status: hasKeywordData ? null : 'NOT_MEASURED',
    source: hasKeywordData ? 'Keyword Intelligence' : 'NOT_MEASURED',
    calculationMethod: hasKeywordData ? 'Percentage of available keywords vs target' : 'No keyword data available',
    inputsUsed: hasKeywordData ? ['primaryKeywords'] : [],
    confidence: null,
    evidence: hasKeywordData ? `${keywordCount} primary keywords identified` : 'Keyword data unavailable',
    lastUpdated: keywordIntel.analyzedAt || new Date().toISOString()
  };

  const technicalIssues = asArray(technicalAudit.criticalIssues).length;
  const competitorThreats = hasCompetitorData ? asArray(competitorIntel.competitorProfiles).length : 0;

  const riskScoreValue = (hasTechnicalData || hasCompetitorData)
    ? Math.min(100, Math.round((technicalIssues * 10) + (competitorThreats * 5)))
    : null;

  const riskScore = {
    value: riskScoreValue,
    status: (hasTechnicalData || hasCompetitorData) ? null : 'NOT_MEASURED',
    source: (hasTechnicalData || hasCompetitorData) ? 'Technical Audit + Competitor Intelligence' : 'NOT_MEASURED',
    calculationMethod: (hasTechnicalData || hasCompetitorData) ? 'Technical issues penalty plus competitor threat penalty' : 'No risk data available',
    inputsUsed: (hasTechnicalData || hasCompetitorData) ? ['criticalIssues', 'competitorProfiles'] : [],
    confidence: null,
    evidence: (hasTechnicalData || hasCompetitorData) ? `${technicalIssues} critical technical issues, ${competitorThreats} competitor threats` : 'Risk data unavailable',
    lastUpdated: technicalAudit.analyzedAt || competitorIntel.analyzedAt || new Date().toISOString()
  };

  // Separate measured technical score from data completeness assessment
  const completeness = calculateCompletenessAdjustment({
    technicalAvailable: hasTechnicalData,
    keywordAvailable: hasKeywordData,
    geoAvailable: hasGeoData,
    competitorAvailable: hasCompetitorData,
    contentAvailable: hasContentData
  });
  const dataCompletenessPercentage = completeness.completenessPercentage;

  const dataCompleteness = {
    technical: hasTechnicalData,
    keyword: hasKeywordData,
    geo: hasGeoData,
    competitor: hasCompetitorData,
    content: hasContentData
  };

  const hasSufficientData = dataCompletenessPercentage >= 20;

  console.log('🔍 [Executive Dashboard] Data completeness:', {
    percentage: dataCompletenessPercentage,
    status: completeness.status,
    breakdown: dataCompleteness,
    hasSufficientData
  });

  // Calculate base overall score from all available modules (measured values only)
  let baseOverallScore;
  if (hasTechnicalData) {
    baseOverallScore = Math.round(scoreBreakdown.overallScore ?? scoreBreakdown.overall);
  } else {
    const hasAnyModuleData = hasContentData || hasCompetitorData || hasGeoData || hasKeywordData || blogIdeasCount > 0;
    if (hasAnyModuleData) {
      baseOverallScore = Math.round(
        (contentAuthorityValue * 0.25) +
        (authorityScoreValue * 0.15) +
        (aiVisibilityValue * 0.25) +
        (opportunityScoreValue * 0.20) +
        ((100 - riskScoreValue) * 0.15)
      );
    } else {
      baseOverallScore = null;
    }
  }

  // Overall SEO score: never subtract completeness penalty from measured values
  let overallSeoScoreValue;
  let overallSeoScoreSource;
  if (hasTechnicalData) {
    overallSeoScoreValue = baseOverallScore;
    overallSeoScoreSource = 'Technical SEO Audit';
  } else if (baseOverallScore !== null) {
    overallSeoScoreValue = baseOverallScore;
    overallSeoScoreSource = 'Weighted Module Average';
  } else {
    overallSeoScoreValue = null;
    overallSeoScoreSource = 'NOT_MEASURED';
  }

  // Confidence reflects data completeness without contaminating measured scores
  const baseConfidence = hasTechnicalData ? 85 : baseOverallScore !== null ? 60 : null;
  const confidencePenalty = baseConfidence !== null ? Math.round((100 - dataCompletenessPercentage) * 0.5) : 0;

  let qualityPenalty = 0;
  if (baseConfidence !== null && (!hasKeywordData || keywordCount === 0)) {
    qualityPenalty += 10;
    console.log('⚠️ [Executive Dashboard] Confidence penalty: no keyword data (-10)');
  }

  const finalConfidence = baseConfidence !== null ? Math.max(30, baseConfidence - confidencePenalty - qualityPenalty) : null;

  const overallSeoScore = {
    value: overallSeoScoreValue,
    status: overallSeoScoreValue !== null ? null : 'NOT_MEASURED',
    source: overallSeoScoreSource,
    calculationMethod: hasTechnicalData
      ? 'Technical SEO audit score (measured)'
      : 'Weighted average of available modules (content, authority, AI visibility, opportunity, risk)',
    inputsUsed: hasTechnicalData ? ['onPageScore', 'performanceScore', 'mobileScore', 'securityScore'] : [],
    confidence: finalConfidence,
    evidence: hasTechnicalData
      ? `Based on ${Object.keys(scoreBreakdown).length} technical SEO factors. Measured score: ${overallSeoScoreValue}. Data completeness: ${dataCompletenessPercentage}%.`
      : 'Weighted from available module data. Data completeness: ' + dataCompletenessPercentage + '%',
    dataCompleteness: dataCompletenessPercentage,
    completenessStatus: completeness.status,
    baseScore: baseOverallScore,
    lastUpdated: technicalAudit.analyzedAt || new Date().toISOString(),
    warning: dataCompletenessPercentage < 70
      ? 'Low data completeness - score may not reflect true SEO performance'
      : dataCompletenessPercentage < 100
        ? 'Some data from fallback sources - scores are estimated'
        : null
  };

  // Priority Actions - derived from all data sources with detailed structure
  const priorityActions = [];
  const actionIds = new Set(); // Track IDs to prevent duplicates

  // Technical issues - add proper technical action fields
  if (technicalIssues > 0) {
    safeSlice(asArray(technicalAudit.criticalIssues), 3).forEach((issue, idx) => {
      const actionId = `tech-${issue.issue || issue}-${idx}`;
      if (!actionIds.has(actionId)) {
        actionIds.add(actionId);
        priorityActions.push({
          id: actionId,
          title: `Fix: ${issue.issue || issue}`,
          category: 'technical',
          priority: 'critical',
          sourceModule: 'Technical Audit',
          reason: 'Critical technical issues directly harm search rankings',
          expectedImpact: 'high',
          difficulty: issue.difficulty || 'medium',
          estimatedHours: issue.estimatedHours || 4,
          confidence: null,
          evidence: `${issue.issue || issue} - ${issue.severity || 'critical'}`,
          // Technical-specific fields for PriorityCard rendering
          severity: issue.severity || 'critical',
          source: 'Technical Audit',
          affectedMetric: issue.affectedMetric || 'Technical SEO',
          recommendation: issue.recommendation || 'Fix this technical issue',
          technicalImpact: 'Improved SEO performance and user experience',
          implementationDifficulty: issue.difficulty || 'medium'
        });
      }
    });
  }

  // High-opportunity keywords
  const highOpportunityKeywords = hasKeywordData ? asArray(keywordIntel.primaryKeywords).filter(k => k.opportunity === 'high').length : 0;
  if (hasKeywordData && highOpportunityKeywords > 0) {
    const highOppKws = asArray(keywordIntel.primaryKeywords).filter(k => k.opportunity === 'high');
    safeSlice(highOppKws, 3).forEach((kw, idx) => {
      const actionId = `kw-${kw.keyword}-${idx}`;
      if (!actionIds.has(actionId)) {
        actionIds.add(actionId);
        priorityActions.push({
          id: actionId,
          title: `Create content for: ${kw.keyword}`,
          category: 'keyword',
          priority: kw.searchVolume > 1000 ? 'high' : 'medium',
          sourceModule: 'Keyword Intelligence',
          reason: `High-opportunity keyword with ${kw.searchVolume} monthly searches`,
          expectedImpact: kw.searchVolume > 1000 ? 'high' : 'medium',
          difficulty: kw.difficulty < 50 ? 'low' : 'medium',
          estimatedHours: kw.difficulty < 50 ? 8 : 16,
          confidence: null,
          evidence: `Volume: ${kw.searchVolume}, Difficulty: ${kw.difficulty}, CPC: ${kw.cpc || 'N/A'}`
        });
      }
    });
  }

  // Content gaps
  if (hasContentData && contentGapsCount > 0) {
    const criticalGaps = asArray(contentGaps.contentGaps).filter(g => g.priority === 'critical' || g.priority === 'high');
    safeSlice(criticalGaps, 3).forEach((gap, idx) => {
      const actionId = `cg-${gap.targetKeyword || gap.title}-${idx}`;
      if (!actionIds.has(actionId)) {
        actionIds.add(actionId);
        priorityActions.push({
          id: actionId,
          title: `Create ${gap.pageType || 'content'}: ${gap.title || gap.targetKeyword}`,
          category: 'content',
          priority: gap.priority || 'high',
          sourceModule: 'Content Gap Analysis',
          reason: gap.evidence || `Missing content for high-value keyword`,
          expectedImpact: gap.businessImpact || 'high',
          difficulty: gap.estimatedImpact?.effort || 'medium',
          estimatedHours: gap.estimatedImpact?.hours || 12,
          confidence: null,
          evidence: `Keyword: ${gap.targetKeyword}, Competitors: ${gap.competitorCount || 0}`
        });
      }
    });
  }

  // AI visibility
  if (hasGeoData && geoIntel.aiVisibilityScore < 70) {
    const actionId = `geo-ai-visibility`;
    if (!actionIds.has(actionId)) {
      actionIds.add(actionId);
      priorityActions.push({
        id: actionId,
        title: 'Improve AI search visibility',
        category: 'ai_search',
        priority: geoIntel.aiVisibilityScore < 50 ? 'high' : 'medium',
        sourceModule: 'GEO Intelligence',
        reason: `Current AI visibility score (${geoIntel.aiVisibilityScore}) below target of 70`,
        expectedImpact: 'medium',
        difficulty: 'medium',
        estimatedHours: 20,
        confidence: null,
        evidence: `AI Visibility: ${geoIntel.aiVisibilityScore}, Citation Readiness: ${geoIntel.citationReadinessScore || 'N/A'}`
      });
    }
  }

  // Competitor gaps
  if (hasCompetitorData) {
    const competitorGaps = safeSlice(competitorIntel.keywordGaps, 2);
    competitorGaps.forEach((gap, idx) => {
      const actionId = `comp-${gap.keyword}-${idx}`;
      if (!actionIds.has(actionId)) {
        actionIds.add(actionId);
        priorityActions.push({
          id: actionId,
          title: `Target competitor keyword: ${gap.keyword}`,
          category: 'competitor',
          priority: gap.opportunity === 'high' ? 'high' : 'medium',
          sourceModule: 'Competitor SEO Intelligence',
          reason: `Competitors ranking for this keyword but you are not`,
          expectedImpact: gap.opportunity === 'high' ? 'high' : 'medium',
          difficulty: gap.difficulty < 50 ? 'medium' : 'high',
          estimatedHours: gap.difficulty < 50 ? 12 : 24,
          confidence: null,
          evidence: `Competitors: ${gap.competitorCount || 0}, Volume: ${gap.searchVolume || 'N/A'}`
        });
      }
    });
  }

  // Sort by priority (critical > high > medium > low) and return top 10
  const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  priorityActions.sort((a, b) => {
    const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    return (b.confidence || 0) - (a.confidence || 0);
  });

  return {
    overallSeoScore,
    technicalHealth,
    contentAuthority,
    aiVisibility,
    opportunityScore,
    riskScore,
    priorityActions: safeSlice(priorityActions, 5),
    dataCompleteness
  };
}

// ============================================
// SEO HEALTH SUMMARY GENERATOR
// ============================================

function generateSeoHealthSummary(seoData) {
  const scoreBreakdown = seoData.scoreBreakdown || {};
  const technicalAudit = seoData.technicalAudit || {};
  const geoIntel = seoData.geoIntelligence || {};
  const keywordIntel = seoData.keywordIntelligence || {};
  const contentGaps = seoData.contentGapIntelligence || {};
  const competitorIntel = seoData.competitorIntelligence || {};

  const hasTechnicalData = scoreBreakdown.overallScore !== undefined && scoreBreakdown.overallScore !== null;
  const hasGeoData = geoIntel.aiVisibilityScore !== undefined && geoIntel.aiVisibilityScore !== null;
  
  const hasValidKeywordData = keywordIntel.primaryKeywords && keywordIntel.primaryKeywords.length > 0;
  
  const hasContentData = contentGaps.contentGaps && contentGaps.contentGaps.length > 0;
  const hasCompetitorData = competitorIntel.competitorProfiles && competitorIntel.competitorProfiles.length > 0;

  // Calculate Local SEO score from geo intelligence (if available)
  const localSeoScore = (hasGeoData && geoIntel.localSeoScore != null) ? geoIntel.localSeoScore : null;

  const categories = [
    {
      name: 'Technical SEO',
      score: hasTechnicalData ? (scoreBreakdown.technicalScore ?? technicalAudit.overallScore ?? scoreBreakdown.overallScore ?? null) : null,
      source: hasTechnicalData ? 'Technical SEO Audit' : 'Unavailable',
      status: hasTechnicalData 
        ? ((scoreBreakdown.technicalScore ?? technicalAudit.overallScore ?? scoreBreakdown.overallScore ?? null) >= 80 ? 'excellent' : (scoreBreakdown.technicalScore ?? technicalAudit.overallScore ?? scoreBreakdown.overallScore ?? null) >= 60 ? 'good' : 'needs-improvement')
        : 'unavailable',
      criticalIssues: hasTechnicalData && technicalAudit.criticalIssues ? technicalAudit.criticalIssues.length : 0
    },
    {
      name: 'On-Page SEO',
      score: hasTechnicalData ? (scoreBreakdown.onPageScore ?? null) : null,
      source: hasTechnicalData ? 'Technical SEO Audit' : 'Unavailable',
      status: hasTechnicalData 
        ? ((scoreBreakdown.onPageScore ?? null) >= 80 ? 'excellent' : (scoreBreakdown.onPageScore ?? null) >= 60 ? 'good' : 'needs-improvement')
        : 'unavailable',
      criticalIssues: 0
    },
    {
      name: 'Content SEO',
      score: hasContentData ? Math.max(0, Math.min(100, 100 - (contentGaps.contentGaps.length * 5))) : null,
      source: hasContentData ? 'Content Gap Analysis' : 'Unavailable',
      status: hasContentData 
        ? (Math.max(0, Math.min(100, 100 - (contentGaps.contentGaps.length * 5))) >= 80 ? 'excellent' : Math.max(0, Math.min(100, 100 - (contentGaps.contentGaps.length * 5))) >= 60 ? 'good' : 'needs-improvement')
        : 'unavailable',
      criticalIssues: 0
    },
    {
      name: 'Authority',
      score: hasCompetitorData ? Math.round(competitorIntel.competitorProfiles.reduce((sum, c) => sum + (c.domainAuthority || 50), 0) / competitorIntel.competitorProfiles.length) : null,
      source: hasCompetitorData ? 'Competitor SEO Intelligence' : 'Unavailable',
      status: hasCompetitorData 
        ? (Math.round(competitorIntel.competitorProfiles.reduce((sum, c) => sum + (c.domainAuthority || 50), 0) / competitorIntel.competitorProfiles.length) >= 80 ? 'excellent' : Math.round(competitorIntel.competitorProfiles.reduce((sum, c) => sum + (c.domainAuthority || 50), 0) / competitorIntel.competitorProfiles.length) >= 60 ? 'good' : 'needs-improvement')
        : 'unavailable',
      criticalIssues: 0
    },
    {
      name: 'AI Visibility',
      score: hasGeoData ? (geoIntel.aiVisibilityScore ?? null) : null,
      source: hasGeoData ? 'GEO Intelligence' : 'Unavailable',
      status: hasGeoData 
        ? ((geoIntel.aiVisibilityScore ?? null) >= 80 ? 'excellent' : (geoIntel.aiVisibilityScore ?? null) >= 60 ? 'good' : 'needs-improvement')
        : 'unavailable',
      criticalIssues: 0
    },
    {
      name: 'Local SEO',
      score: localSeoScore,
      source: hasGeoData ? 'GEO Intelligence' : 'Unavailable',
      status: localSeoScore !== null 
        ? (localSeoScore >= 80 ? 'excellent' : localSeoScore >= 60 ? 'good' : 'needs-improvement')
        : 'unavailable',
      criticalIssues: 0
    },
    {
      name: 'Keyword Opportunity',
      score: hasValidKeywordData ? Math.min(100, Math.round((asArray(keywordIntel.primaryKeywords).filter(k => k.opportunity === 'high').length / asArray(keywordIntel.primaryKeywords).length) * 100)) : null,
      source: hasValidKeywordData ? 'Keyword Intelligence' : 'Unavailable',
      status: hasValidKeywordData 
        ? (Math.min(100, Math.round((asArray(keywordIntel.primaryKeywords).filter(k => k.opportunity === 'high').length / asArray(keywordIntel.primaryKeywords).length) * 100)) >= 70 ? 'excellent' : 'good')
        : 'unavailable',
      criticalIssues: 0
    }
  ];

  // Identify strengths and weaknesses
  const strengths = safeSlice(asArray(categories)
    .filter(c => c.score !== null && c.score >= 75)
    .sort((a, b) => b.score - a.score), 3)
    .map(c => ({ category: c.name, score: c.score, source: c.source, reason: `Strong ${c.name.toLowerCase()} performance` }));

  const weaknesses = safeSlice(asArray(categories)
    .filter(c => c.score !== null && c.score < 60)
    .sort((a, b) => a.score - b.score), 3)
    .map(c => ({ category: c.name, score: c.score, source: c.source, reason: `Requires immediate attention`, priority: c.score < 40 ? 'critical' : 'high' }));

  // Top issues
  const topIssues = [];
  if (hasTechnicalData && technicalAudit.criticalIssues) {
    safeSlice(technicalAudit.criticalIssues, 5).forEach(issue => {
      topIssues.push({
        category: 'Technical SEO',
        issue: issue.issue || issue,
        severity: 'critical',
        impact: 'high',
        source: 'Technical Audit'
      });
    });
  }

  if (hasGeoData && geoIntel.aiVisibilityScore < 50) {
    topIssues.push({
      category: 'AI Visibility',
      issue: 'Low AI search visibility',
      severity: 'high',
      impact: 'medium',
      source: 'GEO Intelligence'
    });
  }

  return {
    categories,
    strengths,
    weaknesses,
    topIssues,
    hasSufficientData: hasTechnicalData || hasGeoData || hasValidKeywordData
  };
}

// ============================================
// KEY OPPORTUNITIES GENERATOR
// ============================================

function generateKeyOpportunities(seoData) {
  const opportunities = [];

  const keywordIntel = seoData.keywordIntelligence || {};
  const geoIntel = seoData.geoIntelligence || {};
  const competitorIntel = seoData.competitorIntelligence || {};
  const contentGaps = seoData.contentGapIntelligence || {};
  const blogIntel = seoData.blogIntelligence || {};
  const technicalAudit = seoData.technicalAudit || {};

  const hasValidKeywordData = keywordIntel.primaryKeywords && keywordIntel.primaryKeywords.length > 0;

  const hasGeoData = geoIntel.aiContentOpportunities && geoIntel.aiContentOpportunities.length > 0;
  const hasContentData = contentGaps.contentGaps && contentGaps.contentGaps.length > 0;
  const hasBlogData = blogIntel.blogIdeas && blogIntel.blogIdeas.length > 0;
  const hasTechnicalData = technicalAudit.criticalIssues && technicalAudit.criticalIssues.length > 0;
  const hasCompetitorData = competitorIntel.competitorProfiles && competitorIntel.competitorProfiles.length > 0;

  // Keyword opportunities
  if (hasValidKeywordData) {
    const highOpportunityKeywords = asArray(keywordIntel.primaryKeywords)
      .filter(k => k.opportunity === 'high' || k.searchVolume > 500);
    safeSlice(highOpportunityKeywords, 5).forEach(kw => {
      opportunities.push({
        title: `Target keyword: ${kw.keyword}`,
        impact: kw.searchVolume > 1000 ? 'high' : 'medium',
        effort: kw.difficulty < 50 ? 'low' : kw.difficulty < 70 ? 'medium' : 'high',
        priority: kw.searchVolume > 1000 && kw.difficulty < 50 ? 'high' : 'medium',
        recommendation: `Create content targeting ${kw.keyword} (${kw.searchVolume} monthly searches)`,
        category: 'keyword',
        source: 'Keyword Intelligence',
        evidence: `Volume: ${kw.searchVolume}, Difficulty: ${kw.difficulty}`
      });
    });
  }

  // GEO opportunities
  if (hasGeoData) {
    const geoOpps = asArray(geoIntel.aiContentOpportunities)
      .filter(opp => opp.impact === 'high' || opp.priority >= 7);
    safeSlice(geoOpps, 3).forEach(opp => {
        opportunities.push({
          title: opp.opportunity || opp.type,
          impact: opp.impact === 'high' ? 'high' : 'medium',
          effort: 'medium',
          priority: opp.priority >= 8 ? 'high' : 'medium',
          recommendation: opp.reason || 'Optimize for AI search visibility',
          category: 'ai_search',
          source: 'GEO Intelligence',
          evidence: `Priority: ${opp.priority}, Impact: ${opp.impact}`
        });
      });
  }

  // Content gap opportunities
  if (hasContentData) {
    const contentGapOpps = asArray(contentGaps.contentGaps)
      .filter(g => g.priority === 'critical' || g.priority === 'high');
    safeSlice(contentGapOpps, 4).forEach(gap => {
        opportunities.push({
          title: gap.title || gap.pageTitle,
          impact: gap.businessImpact === 'high' || gap.priority === 'critical' ? 'high' : 'medium',
          effort: 'medium',
          priority: gap.priority,
          recommendation: `Create missing ${gap.pageType || 'content'} page`,
          category: 'content',
          source: 'Content Gap Analysis',
          evidence: gap.evidence || `Keyword: ${gap.targetKeyword}`
        });
      });
  }

  // Blog opportunities
  if (hasBlogData) {
    const blogOpps = asArray(blogIntel.blogIdeas)
      .filter(b => b.confidence > 70 && b.searchVolume > 100);
    safeSlice(blogOpps, 3).forEach(idea => {
        opportunities.push({
          title: `Blog: ${idea.title}`,
          impact: idea.searchVolume > 500 ? 'high' : 'medium',
          effort: 'medium',
          priority: idea.confidence > 85 ? 'high' : 'medium',
          recommendation: `Write blog post targeting ${idea.targetKeyword}`,
          category: 'content',
          source: 'Blog Intelligence',
          evidence: `Volume: ${idea.searchVolume}, Confidence: ${idea.confidence}%`
        });
      });
  }

  // Technical opportunities
  if (hasTechnicalData) {
    safeSlice(technicalAudit.criticalIssues, 2).forEach(issue => {
      opportunities.push({
        title: `Fix: ${issue.issue || issue}`,
        impact: 'critical',
        effort: 'low',
        priority: 'critical',
        recommendation: issue.fix || 'Address this technical issue immediately',
        category: 'technical',
        source: 'Technical Audit'
      });
    });
  }

  // Sort by priority and return top 10
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return safeSlice(asArray(opportunities)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]), 10);
}

// ============================================
// COMPETITOR SNAPSHOT GENERATOR
// ============================================

function generateCompetitorSnapshot(seoData) {
  const competitorIntel = seoData.competitorIntelligence || {};
  const competitorProfiles = asArray(competitorIntel.competitorProfiles);

  if (!competitorProfiles || competitorProfiles.length === 0) {
    return {
      topCompetitors: [],
      recommendations: [],
      summary: { totalCompetitors: 0, directCompetitors: 0, avgThreatScore: null },
      hasSufficientData: false,
      message: 'No competitor data available'
    };
  }

  const topCompetitors = safeSlice(competitorProfiles, 5)
    .map(comp => ({
      name: comp.name || comp.domain,
      website: comp.website || comp.domain,
      threatScore: comp.overallThreatScore || 50,
      marketPosition: determineMarketPosition(comp.overallThreatScore),
      keywordGapScore: comp.keywordStrength || 50,
      authorityGapScore: comp.authorityStrength || 50,
      weaknessToExploit: comp.weaknessToExploit || 'Not identified',
      recommendedStrategy: comp.recommendedStrategy || 'Monitor and analyze',
      source: 'Competitor Intelligence'
    }));

  const summary = {
    totalCompetitors: competitorProfiles.length,
    directCompetitors: competitorProfiles.length,
    avgThreatScore: topCompetitors.length > 0 
      ? Math.round(topCompetitors.reduce((sum, c) => sum + c.threatScore, 0) / topCompetitors.length)
      : null
  };

  return {
    topCompetitors,
    recommendations: [],
    summary,
    hasSufficientData: true
  };
}

function determineMarketPosition(threatScore) {
  if (threatScore >= 80) return 'Dominant';
  if (threatScore >= 60) return 'Strong';
  if (threatScore >= 40) return 'Moderate';
  return 'Weak';
}

// ============================================
// AI SEARCH VISIBILITY GENERATOR
// ============================================

function generateAiSearchVisibility(seoData) {
  const geoIntel = seoData.geoIntelligence || {};
  const hasGeoData = geoIntel.aiVisibilityScore !== undefined && geoIntel.aiVisibilityScore !== null;

  if (!hasGeoData) {
    return {
      platformScores: {
        chatGpt: null,
        gemini: null,
        claude: null,
        perplexity: null,
        googleAiOverview: null
      },
      componentScores: {
        entityCoverage: null,
        knowledgeGraphReadiness: null,
        citationReadiness: null,
        answerability: null,
        topicalAuthority: null
      },
      overallAiVisibility: null,
      recommendations: [],
      hasSufficientData: false,
      message: 'GEO data unavailable'
    };
  }

  const platformScores = {
    chatGpt: geoIntel.chatGptScore || null,
    gemini: geoIntel.geminiScore || null,
    claude: geoIntel.claudeScore || null,
    perplexity: geoIntel.perplexityScore || null,
    googleAiOverview: geoIntel.googleAiOverviewScore || null
  };

  const componentScores = {
    entityCoverage: geoIntel.entityCoverageScore || null,
    knowledgeGraphReadiness: geoIntel.knowledgeGraphReadinessScore || null,
    citationReadiness: geoIntel.citationReadinessScore || null,
    answerability: geoIntel.answerabilityScore || null,
    topicalAuthority: geoIntel.topicalAuthorityScore || null
  };

  const overallAiVisibility = geoIntel.aiVisibilityScore;

  return {
    platformScores,
    componentScores,
    overallAiVisibility,
    recommendations: [],
    hasSufficientData: true
  };
}

// ============================================
// CONTENT STRATEGY SUMMARY GENERATOR
// ============================================

function generateContentStrategySummary(seoData) {
  const contentGaps = seoData.contentGapIntelligence || {};
  const blogIntel = seoData.blogIntelligence || {};

  const hasContentData = contentGaps.contentGaps && contentGaps.contentGaps.length > 0;
  const hasBlogData = blogIntel.blogIdeas && blogIntel.blogIdeas.length > 0;

  if (!hasContentData && !hasBlogData) {
    return {
      missingPages: [],
      blogOpportunities: [],
      faqOpportunities: [],
      highPriorityContent: [],
      contentCalendarSummary: { day30: 0, day60: 0, day90: 0, totalPlanned: 0 },
      hasSufficientData: false,
      message: 'Content data unavailable'
    };
  }

  const missingPages = [];
  if (hasContentData) {
    const contentGapGaps = asArray(contentGaps.contentGaps)
      .filter(gap => gap.priority === 'critical' || gap.priority === 'high');
    safeSlice(contentGapGaps, 5).forEach(gap => {
        missingPages.push({
          title: gap.title || gap.pageTitle,
          type: gap.contentType || gap.pageType,
          priority: gap.priority,
          opportunityScore: gap.opportunityScore,
          source: 'Content Gap Analysis'
        });
      });
  }

  const blogOpportunities = [];
  if (hasBlogData) {
    const blogIdeas = asArray(blogIntel.blogIdeas)
      .filter(blog => blog.priority === 'high' || blog.confidence > 80);
    safeSlice(blogIdeas, 5).forEach(blog => {
        blogOpportunities.push({
          title: blog.title,
          keyword: blog.targetKeyword,
          difficulty: blog.keywordDifficulty,
          impact: blog.estimatedTrafficPotential || blog.estimatedImpact,
          source: 'Blog Intelligence'
        });
      });
  }

  const faqOpportunities = [];

  const highPriorityContent = [];
  if (hasContentData) {
    const criticalGaps = asArray(contentGaps.contentGaps).filter(g => g.priority === 'critical');
    safeSlice(criticalGaps, 3).forEach(g => highPriorityContent.push({ ...g, source: 'Content Gap Analysis' }));
  }
  if (hasBlogData) {
    const highPriorityBlogs = asArray(blogIntel.blogIdeas).filter(b => b.confidence > 85);
    safeSlice(highPriorityBlogs, 3).forEach(b => highPriorityContent.push({ ...b, source: 'Blog Intelligence' }));
  }

  const contentCalendarSummary = {
    day30: contentGaps.contentCalendar?.day30?.length || 0,
    day60: contentGaps.contentCalendar?.day60?.length || 0,
    day90: contentGaps.contentCalendar?.day90?.length || 0,
    totalPlanned: (contentGaps.contentCalendar?.day30?.length || 0) +
                  (contentGaps.contentCalendar?.day60?.length || 0) +
                  (contentGaps.contentCalendar?.day90?.length || 0)
  };

  return {
    missingPages,
    blogOpportunities,
    faqOpportunities,
    highPriorityContent: safeSlice(highPriorityContent, 10),
    contentCalendarSummary,
    hasSufficientData: true
  };
}

// ============================================
// EXECUTIVE ACTION PLAN GENERATOR
// ============================================

function generateExecutiveActionPlan(seoData) {
  const safeSeoData = seoData || {};
  const identity = safeSeoData.identity || safeSeoData.websiteIdentity || safeSeoData.researchData?.identity || {};
  const brandName = identity.brandName || identity.companyName || identity.productName || 'the company';
  const domain = identity.domain || identity.websiteUrl || '';

  const technicalAudit = safeSeoData.technicalAudit || {};
  const keywordIntel = safeSeoData.keywordIntelligence || {};
  const geoIntel = safeSeoData.geoIntelligence || {};
  const contentGaps = safeSeoData.contentGapIntelligence || {};
  const blogIntel = safeSeoData.blogIntelligence || {};
  const competitorIntel = safeSeoData.competitorIntelligence || {};

  const hasTechnicalData = technicalAudit.criticalIssues && technicalAudit.criticalIssues.length > 0;

  const hasValidKeywordData = keywordIntel.primaryKeywords && keywordIntel.primaryKeywords.length > 0;
  
  const hasGeoData = geoIntel.aiVisibilityScore !== undefined && geoIntel.aiVisibilityScore !== null;
  const hasContentData = contentGaps.contentGaps && contentGaps.contentGaps.length > 0;
  const hasBlogData = blogIntel.blogIdeas && blogIntel.blogIdeas.length > 0;
  const hasCompetitorData = competitorIntel.competitorProfiles && competitorIntel.competitorProfiles.length > 0;

  const day7 = [];
  const day30 = [];
  const day60 = [];
  const day90 = [];

  // Day 7: 7-day SEO fixes (Critical technical issues & low-hanging fruit)
  if (hasTechnicalData) {
    safeSlice(asArray(technicalAudit.criticalIssues), 5).forEach(issue => {
      day7.push({
        title: `Fix Critical Technical Issue: ${issue.issue || issue}`,
        why: 'Critical issues directly harm search rankings and must be fixed immediately.',
        owner: 'Technical Lead',
        dependencies: [],
        estimatedEffort: issue.estimatedHours || 4,
        seoImpact: 'high',
        businessImpact: 'high',
        confidence: null,
        source: 'Technical Audit',
        completionCriteria: `Issue resolved: ${issue.issue || issue}`
      });
    });
  } else {
    // If no critical issues but we have technical data, add a general audit action
    if (technicalAudit.auditData || (technicalAudit.scores && Object.keys(technicalAudit.scores).length > 0)) {
      day7.push({
        title: 'Review Technical SEO Audit',
        why: 'Review technical SEO findings and address any performance or optimization issues.',
        owner: 'SEO Specialist',
        dependencies: [],
        estimatedEffort: 2,
        seoImpact: 'medium',
        businessImpact: 'medium',
        confidence: null,
        source: 'Technical Audit',
        completionCriteria: 'All technical audit findings reviewed and prioritized'
      });
    }
  }

  // Day 7: GEO baseline (always add if GEO data available)
  if (hasGeoData) {
    day7.push({
      title: 'Review AI Search Visibility Baseline',
      why: 'Understand current AI search engine visibility and identify optimization opportunities.',
      owner: 'SEO Specialist',
      dependencies: [],
      estimatedEffort: 2,
      seoImpact: 'medium',
      businessImpact: 'medium',
       confidence: null,
       source: 'GEO Intelligence',
       completionCriteria: 'AI visibility baseline documented and optimization plan created'
    });
  }

  // Day 30: Content creation for high-opportunity keywords
  if (hasValidKeywordData) {
    const highOpportunityKeywords = asArray(keywordIntel.primaryKeywords)
      .filter(k => k.opportunity === 'high' && k.difficulty < 50);
    safeSlice(highOpportunityKeywords, 3).forEach(kw => {
      day30.push({
        title: `Create content for: ${kw.keyword}`,
        why: `High-opportunity keyword with ${kw.searchVolume} monthly searches and low difficulty (${kw.difficulty})`,
        owner: 'Content Writer',
        dependencies: ['Keyword research completed'],
        estimatedEffort: kw.difficulty < 30 ? 8 : 16,
        seoImpact: 'high',
        businessImpact: 'high',
        confidence: null,
        source: 'Keyword Intelligence',
        completionCriteria: `Content published targeting ${kw.keyword} with on-page optimization`
      });
    });
  }

  // Day 30: Critical content gaps
  if (hasContentData) {
    const criticalGaps = asArray(contentGaps.contentGaps).filter(g => g.priority === 'critical');
    safeSlice(criticalGaps, 2).forEach(gap => {
      day30.push({
        title: `Create missing page: ${gap.title || gap.pageTitle}`,
        why: gap.evidence || `Critical content gap for ${gap.targetKeyword}`,
        owner: 'Content Strategist',
        dependencies: ['Content outline approved'],
        estimatedEffort: gap.estimatedImpact?.hours || 12,
        seoImpact: 'high',
        businessImpact: 'high',
        confidence: null,
        source: 'Content Gap Analysis',
        completionCriteria: `Page created for ${gap.targetKeyword} with optimized content`
      });
    });
  }

  // Day 60: AI visibility improvements
  if (hasGeoData && geoIntel.aiVisibilityScore < 60) {
    day60.push({
      title: 'Improve AI search visibility',
      why: `Current AI visibility score is ${geoIntel.aiVisibilityScore}, below target of 70`,
      owner: 'SEO Specialist',
      dependencies: ['Entity audit completed'],
      estimatedEffort: 20,
      seoImpact: 'high',
      businessImpact: 'medium',
       confidence: null,
       source: 'GEO Intelligence',
       completionCriteria: `AI visibility score improved to at least 70`
    });
  }

  // Day 60: Competitor keyword targeting
  if (hasCompetitorData) {
    const competitorGaps = safeSlice(competitorIntel.keywordGaps, 2);
    competitorGaps.forEach(gap => {
      day60.push({
        title: `Target competitor keyword: ${gap.keyword}`,
        why: `Competitors ranking for this keyword but you are not`,
        owner: 'Content Writer',
        dependencies: ['Competitor analysis completed'],
        estimatedEffort: gap.difficulty < 50 ? 12 : 24,
        seoImpact: 'medium',
        businessImpact: 'medium',
        confidence: null,
        source: 'Competitor SEO Intelligence',
        completionCriteria: `Content published targeting ${gap.keyword} to compete with ${gap.competitorCount || 0} competitors`
      });
    });
  }

  // Day 90: Additional content gaps and blog content
  if (hasContentData) {
    const highPriorityGaps = asArray(contentGaps.contentGaps).filter(g => g.priority === 'high');
    safeSlice(highPriorityGaps, 3).forEach(gap => {
      day90.push({
        title: `Create high-priority page: ${gap.title || gap.pageTitle}`,
        why: gap.evidence || `High-priority content gap for ${gap.targetKeyword}`,
        owner: 'Content Strategist',
        dependencies: ['Content calendar approved'],
        estimatedEffort: gap.estimatedImpact?.hours || 16,
        seoImpact: 'medium',
        businessImpact: 'medium',
        confidence: null,
        source: 'Content Gap Analysis',
        completionCriteria: `Page created and indexed for ${gap.targetKeyword}`
      });
    });
  }

  // Day 90: Blog content from high-opportunity keywords
  if (hasBlogData) {
    const highPriorityBlogs = asArray(blogIntel.blogIdeas).filter(b => b.confidence > 80);
    safeSlice(highPriorityBlogs, 3).forEach(blog => {
      day90.push({
        title: `Write blog: ${blog.title}`,
        why: `High-confidence blog idea targeting ${blog.targetKeyword}`,
        owner: 'Content Writer',
        dependencies: ['Blog topic approved'],
        estimatedEffort: 8,
        seoImpact: 'medium',
        businessImpact: 'medium',
        confidence: blog.confidence ?? null,
        source: 'Blog Intelligence',
        completionCriteria: `Blog post published targeting ${blog.targetKeyword}`
      });
    });
  }

  // REMOVED: Hardcoded Canva-specific actions - all actions must be evidence-based
  // Previously injected hardcoded actions for Canva products without evidence validation
  // All actions now generated only from actual SEO intelligence data

  // Ensure at least some action items exist even if data is limited
  // Generate from available data sources to never return blank
  if (day7.length === 0 && day30.length === 0 && day60.length === 0 && day90.length === 0) {
    // If we have any data at all, generate appropriate actions
    if (hasTechnicalData) {
      day7.push({
        title: 'Review Technical SEO Audit',
        why: 'Review the technical SEO audit findings and prioritize critical issues.',
        owner: 'SEO Specialist',
        dependencies: [],
        estimatedEffort: 2,
        seoImpact: 'high',
        businessImpact: 'high',
        confidence: null,
        source: 'Technical Audit',
        completionCriteria: 'Technical audit reviewed with prioritized action items'
      });
    } else if (hasValidKeywordData) {
      day7.push({
        title: 'Analyze Keyword Opportunities',
        why: 'Review validated keyword opportunities and plan content strategy.',
        owner: 'SEO Specialist',
        dependencies: [],
        estimatedEffort: 4,
        seoImpact: 'high',
        businessImpact: 'high',
        confidence: null,
        source: 'Keyword Intelligence',
        completionCriteria: 'Keyword analysis completed with content calendar'
      });
    } else if (hasCompetitorData) {
      day7.push({
        title: 'Analyze Competitor Landscape',
        why: 'Review competitor profiles and identify strategic opportunities.',
        owner: 'SEO Specialist',
        dependencies: [],
        estimatedEffort: 4,
        seoImpact: 'medium',
        businessImpact: 'high',
        confidence: null,
        source: 'Competitor SEO Intelligence',
        completionCriteria: 'Competitor analysis completed with strategic recommendations'
      });
    } else if (hasGeoData) {
      day7.push({
        title: 'Improve AI Search Visibility',
        why: 'Optimize content for AI search engines and improve entity coverage.',
        owner: 'SEO Specialist',
        dependencies: [],
        estimatedEffort: 8,
        seoImpact: 'medium',
        businessImpact: 'medium',
        confidence: null,
        source: 'GEO Intelligence',
        completionCriteria: 'AI visibility optimization plan implemented'
      });
    } else {
      // Last resort - general recommendation
      day7.push({
        title: 'Run Complete SEO Audit',
        why: 'Start with a comprehensive technical SEO audit to identify foundational issues.',
        owner: 'SEO Specialist',
        dependencies: [],
        estimatedEffort: 4,
        seoImpact: 'high',
        businessImpact: 'high',
        confidence: null,
        source: 'General Recommendation',
        completionCriteria: 'Complete technical SEO audit completed with prioritized action items'
      });
    }
  }

  return {
    day7: safeSlice(day7, 5),
    day30: safeSlice(day30, 5),
    day60: safeSlice(day60, 5),
    day90: safeSlice(day90, 5),
    hasSufficientData: true, // Always return true if we have any data
    summary: {
      totalActions: day7.length + day30.length + day60.length + day90.length,
      criticalActions: [...day7, ...day30].filter(a => a.priority === 'critical').length,
      dataSourcesUsed: [
        hasTechnicalData ? 'Technical Audit' : null,
        hasValidKeywordData ? 'Keyword Intelligence' : null,
        hasContentData ? 'Content Gap Analysis' : null,
        hasGeoData ? 'GEO Intelligence' : null,
        hasBlogData ? 'Blog Intelligence' : null,
        hasCompetitorData ? 'Competitor SEO Intelligence' : null
      ].filter(Boolean)
    }
  };
}

// ============================================
// MEASUREMENT READINESS (ROI forecast replaced)
// ============================================

function generateMeasurementReadiness(seoData) {
  const keywordIntel = seoData.keywordIntelligence || {};
  
  const hasValidKeywordData = keywordIntel.primaryKeywords && keywordIntel.primaryKeywords.length > 0;

  const totalSearchVolume = hasValidKeywordData
    ? keywordIntel.primaryKeywords.reduce((sum, k) => sum + (k.searchVolume || 0), 0)
    : 0;

  if (!hasValidKeywordData) {
    return {
      potentialTrafficGain: null,
      estimatedRevenueImpact: null,
      timeToResults: null,
      hasSufficientData: false,
      message: 'Valid keyword data unavailable for ROI calculation'
    };
  }

  return {
    potentialTrafficGain: null,
    estimatedRevenueImpact: null,
    timeToResults: null,
    hasSufficientData: true,
    source: 'Keyword Intelligence',
    evidence: `Based on ${keywordIntel.primaryKeywords.length} keywords with ${totalSearchVolume.toLocaleString()} total monthly searches`
  };
}

// ============================================
// DATA COMPLETENESS CALCULATOR
// ============================================

function calculateDataCompleteness(seoData) {
  const keywordIntel = seoData.keywordIntelligence || {};
  const geoIntel = seoData.geoIntelligence || {};
  const competitorIntel = seoData.competitorIntelligence || {};
  const contentGaps = seoData.contentGapIntelligence || {};

  const isFallbackCheck = (module) => module?.metadata?.isFallback === true;

  const checks = {
    technical: seoData.scoreBreakdown && seoData.scoreBreakdown.overallScore !== undefined && !isFallbackCheck(seoData.technicalAudit),
    keyword: !isFallbackCheck(keywordIntel) && keywordIntel.primaryKeywords && keywordIntel.primaryKeywords.length > 0,
    geo: !isFallbackCheck(geoIntel) && geoIntel.aiVisibilityScore !== undefined && geoIntel.aiVisibilityScore !== null,
    competitor: !isFallbackCheck(competitorIntel) && competitorIntel.competitorProfiles && competitorIntel.competitorProfiles.length > 0,
    content: !isFallbackCheck(contentGaps) && contentGaps.contentGaps && contentGaps.contentGaps.length > 0
  };

  // Track partial completeness - if data exists from fallback sources, count as partial
  const partialChecks = {
    keywordPartial: keywordIntel && (
      (keywordIntel.primaryKeywords && keywordIntel.primaryKeywords.length > 0) ||
      (keywordIntel.secondaryKeywords && keywordIntel.secondaryKeywords.length > 0) ||
      (keywordIntel.longTailKeywords && keywordIntel.longTailKeywords.length > 0)
    ),
    competitorPartial: competitorIntel && competitorIntel.competitorProfiles && competitorIntel.competitorProfiles.length > 0
  };

  // Track fallback sources used
  const fallbackSources = {
    keywordFallback: keywordIntel?.primaryKeywords?.some(k => k.source && k.source !== 'DataForSEO') ?
      keywordIntel.primaryKeywords.filter(k => k.source && k.source !== 'DataForSEO').map(k => k.source) : [],
    competitorFallback: competitorIntel?.competitorProfiles?.some(c => c.isFallback || c.source !== 'DataForSEO_SERP') ?
      competitorIntel.competitorProfiles.filter(c => c.isFallback || c.source !== 'DataForSEO_SERP').map(c => c.source || 'fallback') : []
  };

  // Track unavailable sources
  const unavailableSources = [];
  if (!checks.technical) unavailableSources.push('technical');
  if (!checks.keyword && !partialChecks.keywordPartial) unavailableSources.push('keywords');
  if (!checks.competitor && !partialChecks.competitorPartial) unavailableSources.push('competitors');
  if (!checks.geo) unavailableSources.push('geo');
  if (!checks.content) unavailableSources.push('content');

  // Calculate base completeness (full modules)
  const available = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  let basePercentage = Math.round((available / total) * 100);

  // Add partial credit for modules with fallback data
  let partialBonus = 0;
  if (partialChecks.keywordPartial && !checks.keyword) partialBonus += 15;
  if (partialChecks.competitorPartial && !checks.competitor) partialBonus += 15;

  // Apply partial bonus but cap at 100%
  const adjustedPercentage = Math.min(100, basePercentage + partialBonus);

  // Define fallback sources used before using in message
  const fallbackSourcesUsed = {
    keywords: fallbackSources.keywordFallback,
    competitors: fallbackSources.competitorFallback
  };

  const anyFallbackUsed = Object.values(fallbackSourcesUsed).some(s => s.length > 0) ||
    isFallbackCheck(keywordIntel) ||
    isFallbackCheck(geoIntel) ||
    isFallbackCheck(competitorIntel) ||
    isFallbackCheck(contentGaps);

  return {
    percentage: adjustedPercentage,
    basePercentage,
    partialBonus,
    checks,
    partialChecks,
    available,
    total,
    unavailableSources,
    fallbackSourcesUsed,
    anyFallbackUsed,
    message: unavailableSources.length > 0 ?
      `Partial data available. Missing: ${unavailableSources.join(', ')}. Fallback sources used for: ${Object.keys(fallbackSourcesUsed).filter(k => fallbackSourcesUsed[k].length > 0).join(', ')}` :
      anyFallbackUsed ? 'All data modules available (some from fallback sources)' :
      'All data modules available'
  };
}

export default {
  generateExecutiveDashboard
};

// ============================================
// EXECUTIVE STORY GENERATOR
// ============================================

function generateExecutiveStory(seoData, executiveOverview = {}) {
  const scoreBreakdown = seoData.scoreBreakdown || {};
  const technicalAudit = seoData.technicalAudit || {};
  const keywordIntel = seoData.keywordIntelligence || {};
  const geoIntel = seoData.geoIntelligence || {};
  const competitorIntel = seoData.competitorIntelligence || {};
  const contentGaps = seoData.contentGapIntelligence || {};
  const blogIntel = seoData.blogIntelligence || {};
  const identity = seoData.identity || {};

  const companyName = identity.companyName || identity.productName || identity.brandName || 'Not specified';
  const domain = identity.domain || identity.websiteUrl || 'Not specified';
  const industry = identity.industry || 'Not specified';

  // Use verified scores from executiveOverview, not raw scoreBreakdown
  const hasVerifiedScores = executiveOverview.overallSeoScore?.value !== null;
  
  // Company Overview
  const companyOverview = {
    companyName,
    domain,
    industry,
    analysisDate: new Date().toISOString(),
    dataSources: []
  };

  if (technicalAudit.auditData) companyOverview.dataSources.push('Technical Audit');
  if (keywordIntel.primaryKeywords) companyOverview.dataSources.push('Keyword Intelligence');
  if (geoIntel.aiVisibilityScore !== undefined) companyOverview.dataSources.push('GEO Intelligence');
  if (competitorIntel.competitorProfiles) companyOverview.dataSources.push('Competitor Intelligence');
  if (contentGaps.contentGaps) companyOverview.dataSources.push('Content Gap Analysis');
  if (blogIntel.blogIdeas) companyOverview.dataSources.push('Blog Intelligence');

  // SEO Health Summary - use verified scores from executiveOverview
  const seoHealthSummary = {
    overallScore: hasVerifiedScores ? executiveOverview.overallSeoScore.value : null,
    technicalScore: hasVerifiedScores ? executiveOverview.technicalHealth?.value : null,
    contentScore: hasVerifiedScores ? executiveOverview.contentAuthority?.value : null,
    authorityScore: hasVerifiedScores ? executiveOverview.domainAuthority?.value : null,
    aiVisibilityScore: hasVerifiedScores ? executiveOverview.aiVisibility?.value : null,
    status: hasVerifiedScores 
      ? (executiveOverview.overallSeoScore.value >= 70 ? 'Strong' : executiveOverview.overallSeoScore.value >= 50 ? 'Moderate' : 'Needs Improvement')
      : 'Insufficient verified data'
  };

  // Technical Findings
  const technicalFindings = {
    criticalIssues: asArray(technicalAudit.criticalIssues).length,
    highIssues: asArray(technicalAudit.highIssues).length,
    performanceScore: technicalAudit.scores?.performance || null,
    seoScore: technicalAudit.scores?.seo || null,
    topIssues: safeSlice(asArray(technicalAudit.criticalIssues), 3).map((issue) => ({
      issue: issue.issue || issue,
      fix: issue.fix || 'Address this issue'
    }))
  };

  // Keyword Findings
  const primaryKwArray = asArray(keywordIntel.primaryKeywords);
  const keywordFindings = {
    totalKeywords: primaryKwArray.length + (asArray(keywordIntel.secondaryKeywords).length || 0) + (asArray(keywordIntel.longTailKeywords).length || 0),
    primaryKeywordsCount: primaryKwArray.length,
    opportunitiesCount: keywordIntel.opportunitiesCount || primaryKwArray.length,
    topKeywords: safeSlice(primaryKwArray, 5).map((kw) => ({
      keyword: kw.keyword,
      searchVolume: kw.searchVolume,
      difficulty: kw.difficulty,
      opportunity: kw.opportunity
    }))
  };

  // Competitor Findings - filter out low-relevance directory/research sites and fallback competitors
  const filteredCompetitors = asArray(competitorIntel.competitorProfiles).filter(c => {
    const competitorType = c.competitorType || 'unknown';
    const isFallback = c.isFallback || false;
    // Only use direct, serp, and emerging competitors - exclude directory/research and fallback
    return !isFallback && ['direct', 'serp', 'emerging'].includes(competitorType);
  });

  const competitorFindings = {
    totalCompetitors: filteredCompetitors.length,
    totalDiscovered: asArray(competitorIntel.competitorProfiles).length,
    avgThreatScore: filteredCompetitors.length > 0 
      ? Math.round(filteredCompetitors.reduce((sum, c) => sum + (c.overallThreatScore || 50), 0) / filteredCompetitors.length)
      : null,
    topCompetitors: safeSlice(filteredCompetitors, 3).map((comp) => ({
      name: comp.name || comp.domain,
      threatScore: comp.overallThreatScore || 50,
      weakness: comp.weaknessToExploit || 'Not identified'
    })),
    message: filteredCompetitors.length === 0 && (competitorIntel.competitorProfiles?.length || 0) > 0
      ? 'No verified direct competitors found from SERP data. Low-relevance directory/research sites and fallback competitors excluded.'
      : null
  };

  // Content Gap Findings
  const contentGapFindings = {
    totalGaps: asArray(contentGaps.contentGaps).length,
    criticalGaps: asArray(contentGaps.contentGaps).filter((g) => g.priority === 'critical').length,
    highGaps: asArray(contentGaps.contentGaps).filter((g) => g.priority === 'high').length,
    topGaps: safeSlice(asArray(contentGaps.contentGaps).filter((g) => g.priority === 'critical' || g.priority === 'high'), 5).map((gap) => ({
      title: gap.title || gap.pageTitle,
      priority: gap.priority,
      targetKeyword: gap.targetKeyword
    }))
  };

  // AI Visibility Findings
  const aiVisibilityFindings = {
    overallScore: geoIntel.aiVisibilityScore || null,
    chatGptScore: geoIntel.chatGptScore || null,
    geminiScore: geoIntel.geminiScore || null,
    claudeScore: geoIntel.claudeScore || null,
    perplexityScore: geoIntel.perplexityScore || null,
    topOpportunities: safeSlice(asArray(geoIntel.aiContentOpportunities), 3).map((opp) => ({
      opportunity: opp.opportunity || opp.type,
      impact: opp.impact,
      priority: opp.priority
    }))
  };

  // Main Risks
  const mainRisks = [];
  if (technicalAudit.criticalIssues?.length > 0) {
    mainRisks.push({
      category: 'Technical',
      risk: `${technicalAudit.criticalIssues.length} critical technical issues`,
      impact: 'High',
      recommendation: 'Address critical technical issues immediately'
    });
  }
  if (seoHealthSummary.overallScore < 50) {
    mainRisks.push({
      category: 'Overall SEO',
      risk: 'Low overall SEO score',
      impact: 'High',
      recommendation: 'Focus on improving technical and content SEO'
    });
  }
  if (competitorFindings.avgThreatScore > 60) {
    mainRisks.push({
      category: 'Competitive',
      risk: 'Strong competitor presence',
      impact: 'Medium',
      recommendation: 'Analyze competitor strategies and find gaps'
    });
  }
  if (aiVisibilityFindings.overallScore < 50) {
    mainRisks.push({
      category: 'AI Visibility',
      risk: 'Low AI search visibility',
      impact: 'Medium',
      recommendation: 'Optimize for AI search engines'
    });
  }

  // Main Opportunities
  const mainOpportunities = [];
  if (keywordIntel.opportunitiesCount > 10) {
    mainOpportunities.push({
      category: 'Keywords',
      opportunity: `${keywordIntel.opportunitiesCount} high-opportunity keywords`,
      potential: 'High',
      action: 'Create content targeting high-opportunity keywords'
    });
  }
  if (contentGapFindings.criticalGaps > 0) {
    mainOpportunities.push({
      category: 'Content',
      opportunity: `${contentGapFindings.criticalGaps} critical content gaps`,
      potential: 'High',
      action: 'Create missing critical content pages'
    });
  }
  if (aiVisibilityFindings.overallScore < 70) {
    mainOpportunities.push({
      category: 'AI Visibility',
      opportunity: 'Improve AI search visibility',
      potential: 'Medium',
      action: 'Optimize for AI search engines'
    });
  }
  if (blogIntel.blogIdeas?.length > 0) {
    mainOpportunities.push({
      category: 'Blog',
      opportunity: `${blogIntel.blogIdeas.length} blog content ideas`,
      potential: 'Medium',
      action: 'Publish blog content to drive organic traffic'
    });
  }

  // 7/30/60/90 Day SEO Plan
  const day7Plan = [];
  const day30Plan = [];
  const day60Plan = [];
  const day90Plan = [];

  if (asArray(technicalAudit.criticalIssues).length > 0) {
    safeSlice(technicalAudit.criticalIssues, 3).forEach((issue) => {
      day7Plan.push({
        action: `Fix: ${issue.issue || issue}`,
        priority: 'Critical',
        source: 'Technical Audit'
      });
    });
  }

  if (asArray(keywordIntel.primaryKeywords).length > 0) {
    const highOppKeywords = asArray(keywordIntel.primaryKeywords).filter((k) => k.opportunity === 'high' && k.difficulty < 50);
    safeSlice(highOppKeywords, 3).forEach((kw) => {
      day30Plan.push({
        action: `Create content for: ${kw.keyword}`,
        priority: 'High',
        source: 'Keyword Intelligence'
      });
    });
  }

  if (asArray(contentGaps.contentGaps).length > 0) {
    const criticalGaps = asArray(contentGaps.contentGaps).filter((g) => g.priority === 'critical');
    safeSlice(criticalGaps, 2).forEach((gap) => {
      day30Plan.push({
        action: `Create missing page: ${gap.title || gap.pageTitle}`,
        priority: 'Critical',
        source: 'Content Gap Analysis'
      });
    });
  }

  if (geoIntel.aiVisibilityScore < 60) {
    day60Plan.push({
      action: 'Improve AI search visibility',
      priority: 'High',
      source: 'GEO Intelligence'
    });
  }

  if (asArray(blogIntel.blogIdeas).length > 0) {
    safeSlice(blogIntel.blogIdeas, 3).forEach((blog) => {
      day90Plan.push({
        action: `Publish blog: ${blog.title}`,
        priority: 'Medium',
        source: 'Blog Intelligence'
      });
    });
  }

  // Final Executive Recommendation
  const executiveRecommendation = {
    summary: seoHealthSummary.overallScore >= 70 
      ? `${companyName} has a strong SEO foundation. Focus on content expansion and AI visibility optimization.`
      : seoHealthSummary.overallScore >= 50
      ? `${companyName} has moderate SEO performance. Address technical issues and content gaps to improve rankings.`
      : `${companyName} needs significant SEO improvement. Prioritize fixing critical technical issues and creating missing content.`,
    priorityActions: safeSlice(mainRisks, 3).map((r) => r.recommendation),
    expectedTimeline: '3-6 months for significant improvement',
    confidence: companyOverview.dataSources.length >= 4 ? 'High' : 'Medium'
  };

  return {
    companyOverview,
    seoHealthSummary,
    technicalFindings,
    keywordFindings,
    competitorFindings,
    contentGapFindings,
    aiVisibilityFindings,
    mainRisks,
    mainOpportunities,
    actionPlan: {
      day7: day7Plan,
      day30: day30Plan,
      day60: day60Plan,
      day90: day90Plan
    },
    executiveRecommendation,
    hasSufficientData: companyOverview.dataSources.length >= 2
  };
}
