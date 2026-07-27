/**
 * PART 11: SEO Score Mapping with Safe Helpers
 * Supports multiple persisted data paths with regression fixtures
 */

/**
 * Safe helper to extract score from multiple possible data paths
 * Returns null if no valid score found (never returns 0 for missing data)
 */
function safeExtractScore(data, paths) {
  if (!data || !paths || !Array.isArray(paths)) return null;
  
  for (const path of paths) {
    try {
      const value = path.split('.').reduce((obj, key) => obj?.[key], data);
      if (value !== null && value !== undefined && value !== '') {
        const num = Number(value);
        if (Number.isFinite(num) && !isNaN(num)) {
          return num;
        }
      }
    } catch (e) {
      // Invalid path, continue to next
    }
  }
  
  return null;
}

/**
 * Convert score to percentage (0-100)
 * Handles both 0-1 and 0-100 ranges
 */
function toPercentScore(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

/**
 * Regression fixture for test data validation
 */
export const SEO_SCORE_FIXTURES = {
  // Test fixture: Google Meet data (chatId: cmrti35re000112sq1e0ky4d4)
  googleMeet: {
    overallScore: 72,
    performance: 65,
    accessibility: 85,
    bestPractices: 90,
    lighthouseSeo: 75,
    mobilePerformance: 60,
    desktopPerformance: 70,
    technicalScore: 68,
    contentScore: 75,
    metadataScore: 80,
    crawlabilityScore: 85,
  }
};

export function buildSeoViewModel(data) {
  const ta = data?.technicalAudit || data?.technicalAuditDetail || {};
  const ps = ta?.auditData?.pageSpeed || {};

  // PART 11: Use safe helpers with multiple data paths
  const overallScore = safeExtractScore(data, [
    'seoScore',
    'technicalAudit.overallScore',
    'technicalAuditDetail.overallScore',
    'overall'
  ]) ?? null;
  
  const performance = toPercentScore(
    safeExtractScore(ps, [
      'mobile.lighthouseScores.performance',
      'desktop.lighthouseScores.performance',
      'mobile.performance',
      'desktop.performance'
    ]) ??
    safeExtractScore(ta, [
      'performanceScore',
      'lighthouse.performance'
    ]) ??
    null
  );
  
  const accessibility = toPercentScore(
    safeExtractScore(ps, [
      'mobile.lighthouseScores.accessibility',
      'desktop.lighthouseScores.accessibility',
      'mobile.accessibility',
      'desktop.accessibility'
    ]) ??
    safeExtractScore(ta, [
      'accessibilityScore',
      'lighthouse.accessibility'
    ]) ??
    null
  );
  
  const bestPractices = toPercentScore(
    safeExtractScore(ps, [
      'mobile.lighthouseScores.bestPractices',
      'desktop.lighthouseScores.bestPractices',
      'mobile.bestPractices',
      'desktop.bestPractices'
    ]) ??
    safeExtractScore(ta, [
      'bestPracticesScore',
      'lighthouse.bestPractices'
    ]) ??
    null
  );
  
  const lighthouseSeo = toPercentScore(
    safeExtractScore(ps, [
      'mobile.lighthouseScores.seo',
      'desktop.lighthouseScores.seo',
      'mobile.seo',
      'desktop.seo'
    ]) ??
    safeExtractScore(ta, [
      'seoScore',
      'lighthouse.seo'
    ]) ??
    null
  );
  
  const mobilePerf = toPercentScore(
    safeExtractScore(ps, ['mobile.performance']) ??
    safeExtractScore(ta, ['mobileScore']) ??
    null
  );
  
  const desktopPerf = toPercentScore(
    safeExtractScore(ps, ['desktop.performance']) ??
    safeExtractScore(ta, ['desktopScore']) ??
    null
  );

  return {
    overallScore,
    performance,
    accessibility,
    bestPractices,
    lighthouseSeo,
    mobilePerformance: mobilePerf,
    desktopPerformance: desktopPerf,
    technicalScore: safeExtractScore(ta, ['technicalScore']) ?? null,
    contentScore: safeExtractScore(data, ['contentScore']) ?? null,
    metadataScore: safeExtractScore(ta, ['metadataScore']) ?? null,
    crawlabilityScore: safeExtractScore(ta, ['crawlabilityScore']) ?? null,
    confidence: safeExtractScore(data, ['confidence']) ?? null,
    coverage: safeExtractScore(data, ['coverage']) ?? null,
    crux: ta?.coreWebVitals ?? ta?.chromeUX ?? null,
    scoreBreakdown: data?.scoreBreakdown ?? {},

    // Legacy aliases for backward compatibility (used by templates)
    seoScore: overallScore,
    overall: overallScore,
    performanceScore: performance,
    accessibilityScore: accessibility,
    bestPracticesScore: bestPractices,
    mobileScore: mobilePerf,
    desktopScore: desktopPerf,
  };
}

// PART 19: Canonical View Model for Report Quality
/**
 * Builds a canonical view model that normalizes all report data
 * into a consistent structure for report generation across formats
 */
export function buildCanonicalReportViewModel(data) {
  const seoViewModel = buildSeoViewModel(data);
  const ta = data?.technicalAudit || data?.technicalAuditDetail || {};
  const intelligence = data?.businessIntelligence || data?.intelligence || {};
  const growthData = data?.growthWorkspaceData || {};
  
  return {
    // Canonical metadata
    metadata: {
      reportId: data?.reportId || data?.chatId || null,
      generatedAt: new Date().toISOString(),
      dataSource: data?.dataSource || 'mixed',
      confidence: seoViewModel.confidence ?? data?.confidence ?? null,
      coverage: seoViewModel.coverage ?? data?.coverage ?? null
    },
    
    // Canonical SEO scores (normalized)
    seo: {
      overall: seoViewModel.overallScore,
      performance: seoViewModel.performance,
      accessibility: seoViewModel.accessibility,
      bestPractices: seoViewModel.bestPractices,
      lighthouseSeo: seoViewModel.lighthouseSeo,
      mobilePerformance: seoViewModel.mobilePerformance,
      desktopPerformance: seoViewModel.desktopPerformance,
      technicalScore: seoViewModel.technicalScore,
      contentScore: seoViewModel.contentScore,
      metadataScore: seoViewModel.metadataScore,
      crawlabilityScore: seoViewModel.crawlabilityScore,
      coreWebVitals: seoViewModel.crux
    },
    
    // Canonical product identity
    product: {
      name: data?.productName ?? data?.identity?.productName ?? growthData?.productName ?? null,
      companyName: data?.companyName ?? data?.identity?.companyName ?? growthData?.companyName ?? null,
      industry: data?.industry ?? data?.identity?.industry ?? growthData?.industry ?? null,
      category: data?.category ?? data?.identity?.category ?? null,
      businessModel: data?.businessModel ?? data?.identity?.businessModel ?? null,
      websiteUrl: data?.websiteUrl ?? data?.identity?.websiteUrl ?? null,
      domain: data?.domain ?? data?.identity?.domain ?? null,
      description: data?.description ?? data?.identity?.websiteDescription ?? null
    },
    
    // Canonical competitor data
    competitors: {
      direct: normalizeCompetitors(data?.competitors?.direct ?? data?.competitorAnalysis?.directCompetitors ?? []),
      indirect: normalizeCompetitors(data?.competitors?.indirect ?? data?.competitorAnalysis?.indirectCompetitors ?? []),
      total: (data?.competitors?.all?.length ?? data?.competitorAnalysis?.directCompetitors?.length ?? 0)
    },
    
    // Canonical market intelligence
    market: {
      tam: intelligence?.marketIntelligence?.tam ?? data?.market?.tam ?? null,
      sam: intelligence?.marketIntelligence?.sam ?? data?.market?.sam ?? null,
      som: intelligence?.marketIntelligence?.som ?? data?.market?.som ?? null,
      growthRate: intelligence?.marketIntelligence?.growthRate ?? data?.market?.growthRate ?? null,
      trends: intelligence?.marketIntelligence?.trends ?? data?.market?.trends ?? []
    },
    
    // Canonical audience data
    audience: {
      personas: normalizePersonas(intelligence?.audienceIntelligence?.personas ?? growthData?.audience?.buyerPersonas ?? []),
      segments: intelligence?.audienceIntelligence?.segments ?? growthData?.audience?.segments ?? [],
      channels: intelligence?.audienceIntelligence?.channels ?? growthData?.audience?.bestChannels ?? []
    },
    
    // Canonical positioning data
    positioning: {
      statement: growthData?.positioning?.positioningStatement ?? data?.positioning?.statement ?? null,
      pillars: growthData?.positioning?.messagingPillars ?? data?.positioning?.pillars ?? [],
      usp: growthData?.product?.usp ?? data?.positioning?.usp ?? null
    },
    
    // Canonical campaign data
    campaign: {
      angles: growthData?.campaign?.creativeAngles ?? data?.campaign?.angles ?? [],
      hooks: growthData?.campaign?.copyHooks ?? data?.campaign?.hooks ?? [],
      channels: growthData?.channel?.recommendedChannels ?? data?.campaign?.channels ?? []
    },
    
    // Canonical action plan
    actionPlan: {
      day7: intelligence?.actionPlan?.day7 ?? data?.actionPlan?.day7 ?? [],
      day30: intelligence?.actionPlan?.day30 ?? data?.actionPlan?.day30 ?? [],
      day60: intelligence?.actionPlan?.day60 ?? data?.actionPlan?.day60 ?? [],
      day90: intelligence?.actionPlan?.day90 ?? data?.actionPlan?.day90 ?? []
    },
    
    // Quality indicators
    quality: {
      hasSeoData: seoViewModel.overallScore !== null,
      hasCompetitorData: (data?.competitors?.direct?.length ?? 0) > 0,
      hasMarketData: intelligence?.marketIntelligence?.tam !== null,
      hasAudienceData: (intelligence?.audienceIntelligence?.personas?.length ?? 0) > 0,
      hasPositioningData: growthData?.positioning?.positioningStatement !== null,
      hasCampaignData: (growthData?.campaign?.creativeAngles?.length ?? 0) > 0,
      dataCompleteness: calculateDataCompleteness(data, seoViewModel)
    }
  };
}

// PART 19: Helper to normalize competitor data
function normalizeCompetitors(competitors) {
  if (!Array.isArray(competitors)) return [];
  
  return competitors.map(comp => ({
    name: comp?.name ?? comp?.companyName ?? null,
    domain: comp?.domain ?? comp?.website ?? null,
    url: comp?.url ?? comp?.website ?? null,
    similarityScore: comp?.similarityScore ?? comp?.relevanceScore ?? null,
    marketShare: comp?.marketShare ?? null,
    strengths: comp?.strengths ?? [],
    weaknesses: comp?.weaknesses ?? [],
    status: comp?.status ?? 'unknown'
  })).filter(c => c.name !== null);
}

// PART 19: Helper to normalize persona data
function normalizePersonas(personas) {
  if (!Array.isArray(personas)) return [];
  
  return personas.map(persona => ({
    name: persona?.name ?? null,
    role: persona?.role ?? persona?.jobTitle ?? null,
    demographics: persona?.demographics ?? {},
    painPoints: persona?.painPoints ?? persona?.challenges ?? [],
    goals: persona?.goals ?? persona?.objectives ?? [],
    buyingTriggers: persona?.buyingTriggers ?? []
  })).filter(p => p.name !== null && p.name !== 'Target Persona' && p.name !== 'Persona Name');
}

// PART 19: Calculate data completeness score
function calculateDataCompleteness(data, seoViewModel) {
  let score = 0;
  let maxScore = 0;
  
  // SEO data (20 points)
  maxScore += 20;
  if (seoViewModel.overallScore !== null) score += 20;
  
  // Competitor data (20 points)
  maxScore += 20;
  const competitorCount = data?.competitors?.direct?.length ?? data?.competitorAnalysis?.directCompetitors?.length ?? 0;
  if (competitorCount >= 3) score += 20;
  else if (competitorCount >= 1) score += 10;
  
  // Market data (20 points)
  maxScore += 20;
  if (data?.businessIntelligence?.marketIntelligence?.tam !== null) score += 20;
  
  // Audience data (20 points)
  maxScore += 20;
  const personaCount = data?.businessIntelligence?.audienceIntelligence?.personas?.length ?? 0;
  if (personaCount >= 2) score += 20;
  else if (personaCount >= 1) score += 10;
  
  // Positioning data (20 points)
  maxScore += 20;
  if (data?.growthWorkspaceData?.positioning?.positioningStatement !== null) score += 20;
  
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

