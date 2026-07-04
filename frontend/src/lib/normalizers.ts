export const asArray = (value: any): any[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    if (!value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      return asArray(parsed);
    } catch {
      return value.includes(',') ? value.split(',').map(v => v.trim()).filter(Boolean) : [value.trim()];
    }
  }
  if (typeof value === 'object') return Object.values(value).filter(Boolean);
  return [value];
};

export const asText = (value: any, fallback = 'Not available') => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    const filtered = value.filter(Boolean);
    if (filtered.length === 0) return fallback;
    const joined = filtered.map(v => asText(v, '')).filter(Boolean).join(', ');
    return joined || fallback;
  }
  if (typeof value === 'object') {
    const candidate = value?.value || value?.title || value?.name || value?.summary || value?.keyword || value?.opportunity || value?.description || value?.label;
    if (candidate && typeof candidate === 'string') return candidate.trim();
    if (candidate && typeof candidate === 'number') return String(candidate);
    return fallback;
  }
  return fallback;
};

export const asInsight = (value: any, fallbackTitle?: string) => {
  // Always return an object, never null
  if (!value) {
    return {
      value: fallbackTitle || 'No data',
      title: fallbackTitle,
      confidence: 0,
      impact: 'Low' as 'Low' | 'Medium' | 'High'
    };
  }
  
  if (typeof value === 'string') {
    return {
      value: value.trim() || fallbackTitle || 'No data',
      title: fallbackTitle,
      confidence: 70,
      impact: 'Medium' as 'Low' | 'Medium' | 'High'
    };
  }
  
  const impactValue = value.impact || value.priority || 'Medium';
  const validImpact = ['Low', 'Medium', 'High'].includes(impactValue) ? impactValue : 'Medium';
  
  return {
    value: value.value || value.description || value.summary || asText(value, 'No data'),
    confidence: value.confidence || value.confidenceScore || 70,
    evidence: value.evidence || value.proof || '',
    source: value.source || value.url || '',
    impact: validImpact as 'Low' | 'Medium' | 'High',
    title: value.title || value.name || fallbackTitle || '',
    recommendedAction: value.recommendedAction || value.action || value.recommendation || ''
  };
};

export const asNumber = (value: any, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const firstOf = (obj: any, keys: string[], fallback: any = undefined) => {
  if (!obj) return fallback;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return fallback;
};

// Safe JSON parser for stringified nested fields (recursive)
export const safeParse = (value: any, fallback: any = {}): any => {
  if (!value) return fallback;
  
  // If it's already an object/array, check if any values are stringified JSON
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(item => safeParse(item, item));
    }
    
    // Recursively parse all object values
    const result: any = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = safeParse(val, val);
    }
    return result;
  }
  
  // If it's a string, try to parse it
  if (typeof value === 'string') {
    const trimmed = value.trim();
    
    // Check if it looks like JSON (starts with { or [)
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        // Recursively parse the result in case there are nested stringified objects
        return safeParse(parsed, parsed);
      } catch {
        return fallback;
      }
    }
    
    // Not JSON-like, return as-is
    return value;
  }
  
  // Primitive values (number, boolean, etc.) return as-is
  return value;
};

// GROWTH WORKSPACE NORMALIZATION
export function normalizeFullResults(data: any) {
  const root = data?.data || data || {};

  // Handle canonical shape from backend
  if (root.growth && Object.keys(root.growth).length > 0) {
    // Canonical shape: growth object already has nested structure
    const growth = root.growth;

    // Only mark completed if at least one real section has content (non-empty keys)
    const growthModuleKeys = ['product', 'market', 'audience', 'competitor', 'intent', 'positioning', 'campaign', 'channel', 'executiveStory', 'actionPlan'];
    const hasRealGrowthContent = growthModuleKeys.some(k => {
      const v = growth[k];
      return v && typeof v === 'object' && Object.keys(v).length > 0;
    });

    return {
      chat: root.chat || {},
      growth: {
        identity: growth.identity || {},
        product: safeParse(growth.product, growth.product),
        market: safeParse(growth.market, growth.market),
        audience: safeParse(growth.audience, growth.audience),
        competitor: safeParse(growth.competitor, growth.competitor),
        intent: safeParse(growth.intent, growth.intent),
        positioning: safeParse(growth.positioning, growth.positioning),
        campaign: safeParse(growth.campaign, growth.campaign),
        channel: safeParse(growth.channel, growth.channel),
        executiveStory: safeParse(growth.executiveStory, growth.executiveStory),
        actionPlan: safeParse(growth.actionPlan, growth.actionPlan),
        summary: growth.summary || null,
      },
      seoIntelligence: normalizeSeo(root.seoIntelligence || root.seo || {}),
      seo: normalizeSeo(root.seoIntelligence || root.seo || {}), // Legacy compatibility
      agents: asArray(root.agentRuns || []),
      automation: root.automationPlan || {},
      hasGrowthWorkspace: root.hasGrowthWorkspace === false ? false : hasRealGrowthContent,
      hasSeoIntelligence: root.hasSeoIntelligence || !!root.seoIntelligence,
    };
  }

  // Backward compatibility: handle old flattened structure
  const productIntel = root.productIntelligence || root.growthWorkspace?.results?.product || {};
  const competitorIntel = root.competitorIntelligence || root.growthWorkspace?.results?.competitor || {};
  const campaignIntel = root.campaignIntelligence || root.growthWorkspace?.results?.campaign || {};
  const channelIntel = root.channelRecommendation || root.growthWorkspace?.results?.channel || {};
  const growth = root.growthWorkspace || root.growth || {};

  // Fallback for executiveStory and actionPlan from multiple possible paths
  const execStory = campaignIntel.executiveStory || campaignIntel.campaignGenerator?.executiveStory || channelIntel.executiveStory || channelIntel.channelRecommendation?.executiveStory || growth.executiveStory;
  const actPlan = campaignIntel.actionPlan || campaignIntel.campaignGenerator?.actionPlan || channelIntel.actionPlan || channelIntel.channelRecommendation?.actionPlan || growth.actionPlan;

  return {
    chat: root.chat || {},
    growth: {
      identity: {
        websiteUrl: root.chat?.websiteUrl || productIntel?.inputJson?.websiteUrl || '',
        productName: root.chat?.productName || productIntel?.inputJson?.productName || '',
        companyName: root.chat?.title || productIntel?.inputJson?.companyName || '',
        industry: productIntel?.inputJson?.industry || '',
      },
      product: safeParse(productIntel.productAnalysis, productIntel.productAnalysis),
      market: safeParse(productIntel.marketDiscovery, productIntel.marketDiscovery),
      audience: safeParse(productIntel.audienceIntelligence, productIntel.audienceIntelligence),
      competitor: safeParse(competitorIntel.competitorAnalysis, competitorIntel.competitorAnalysis),
      intent: safeParse(competitorIntel.intentPrediction, competitorIntel.intentPrediction),
      positioning: safeParse(competitorIntel.positioningEngine, competitorIntel.positioningEngine),
      campaign: safeParse(campaignIntel.campaignGenerator, campaignIntel.campaignGenerator),
      channel: safeParse(campaignIntel.channelRecommendation, campaignIntel.channelRecommendation),
      executiveStory: safeParse(execStory, execStory),
      actionPlan: safeParse(actPlan, actPlan),
      summary: growth.summary || safeParse(growth.summary, growth.summary) || null,
    },
    seoIntelligence: normalizeSeo(root.seoIntelligence || root.seo || {}),
    seo: normalizeSeo(root.seoIntelligence || root.seo || {}), // Legacy compatibility
    agents: asArray(root.agentRuns || []),
    automation: root.automationPlan || root.automationPlans || root.automation || {},
    hasGrowthWorkspace: !!(productIntel?.productAnalysis || competitorIntel?.competitorAnalysis || campaignIntel?.campaignGenerator),
    hasSeoIntelligence: !!root.seoIntelligence,
  };
}

// SEO INTELLIGENCE NORMALIZATION
export function normalizeSeo(data: any) {
  const seo = data?.seo || data?.seoIntelligence || data?.data || data || {};
  
  // Return empty when no real data — prevents false hasData in pages
  if (!seo || Object.keys(seo).length === 0) return {};

  // Normalize executive story from canonical and legacy paths
  const execStory = seo.executiveStory || 
                   seo.executiveDashboard?.metadata?.executiveStory || 
                   seo.executiveDashboard?.executiveStory ||
                   seo.executive?.executiveStory;
  
  // Normalize action plan from canonical and legacy paths
  const execActionPlan = seo.actionPlan || 
                        seo.executiveDashboard?.executiveActionPlan || 
                        seo.executiveDashboard?.actionPlan ||
                        seo.executiveDashboard?.metadata?.executiveStory?.actionPlan ||
                        seo.executiveDashboard?.metadata?.executiveStory?.actionPlan?.day7 ||
                        seo.executiveDashboard?.metadata?.executiveStory?.actionPlan?.day30 ||
                        seo.executiveDashboard?.metadata?.executiveStory?.actionPlan?.day60 ||
                        seo.executiveDashboard?.metadata?.executiveStory?.actionPlan?.day90 ||
                        seo.executiveStory?.actionPlan ||
                        seo.executiveStory?.actionPlan?.day7 ||
                        seo.executiveStory?.actionPlan?.day30 ||
                        seo.executiveStory?.actionPlan?.day60 ||
                        seo.executiveStory?.actionPlan?.day90;
  
  // Ensure action plan has canonical shape with multiple fallback paths
  const normalizedActionPlan = {
    immediate: asArray(
      execActionPlan?.immediate || 
      execStory?.actionPlan?.immediate ||
      execStory?.immediate
    ),
    day7: asArray(
      execActionPlan?.day7 || 
      execActionPlan?.sevenDay ||
      execStory?.actionPlan?.day7 ||
      execStory?.actionPlan?.sevenDay ||
      execStory?.day7
    ),
    day30: asArray(
      execActionPlan?.day30 || 
      execActionPlan?.thirtyDay ||
      execStory?.actionPlan?.day30 ||
      execStory?.actionPlan?.thirtyDay ||
      execStory?.day30
    ),
    day60: asArray(
      execActionPlan?.day60 || 
      execActionPlan?.sixtyDay ||
      execStory?.actionPlan?.day60 ||
      execStory?.actionPlan?.sixtyDay ||
      execStory?.day60
    ),
    day90: asArray(
      execActionPlan?.day90 || 
      execActionPlan?.ninetyDay ||
      execStory?.actionPlan?.day90 ||
      execStory?.actionPlan?.ninetyDay ||
      execStory?.day90
    ),
    summary: execActionPlan?.summary || execStory?.summary || null
  };
  
  // Helper to resolve a dotted path on an object (e.g., 'auditData.performanceScore')
  const getDeep = (obj: any, path: string): any => {
    if (!obj) return undefined;
    return path.split('.').reduce((acc, key) => {
      if (acc === null || acc === undefined) return undefined;
      return acc[key];
    }, obj);
  };

  // Helper to extract and normalize a technical score from multiple dot-separated paths
  const getScore = (obj: any, paths: string[]): number | null => {
    for (const p of paths) {
      const raw = getDeep(obj, p);
      if (raw === null || raw === undefined || raw === '') continue;
      const n = Number(raw);
      if (!Number.isNaN(n) && Number.isFinite(n)) {
        return n <= 1 ? Math.round(n * 100) : Math.round(n);
      }
    }
    return null;
  };

  // Helper to extract and normalize technical scores from multiple paths
  const extractScore = (paths: any[]) => {
    for (const path of paths) {
      const value = typeof path === 'number' ? path : null;
      if (value !== null && !isNaN(value)) {
        // Convert 0-1 to 0-100 if needed
        return value <= 1 ? Math.round(value * 100) : Math.round(value);
      }
    }
    return null;
  };

  const technicalData = seo.technicalAuditDetail || seo.technicalAudit || seo.technicalSeoAudit || {};
  
  // Robust technical score extraction using both evaluated-paths and dot-path helpers
  const scoreObj = technicalData;
  const getS = (paths: string[]) => getScore(scoreObj, paths);
  const perfScore = extractScore([
    seo.performanceScore,
    technicalData.performanceScore,
    technicalData.auditData?.performanceScore,
    technicalData.auditData?.pageSpeed?.mobile?.lighthouseScores?.performance,
    technicalData.auditData?.pageSpeed?.desktop?.lighthouseScores?.performance,
    technicalData.auditData?.pageSpeed?.mobile?.scores?.performance,
    technicalData.auditData?.pageSpeed?.desktop?.scores?.performance,
    technicalData.auditData?.scores?.performance,
    technicalData.auditData?.mobile?.performance,
    technicalData.overallScore
  ]) ?? getS([
    'performanceScore',
    'auditData.performanceScore',
    'auditData.pageSpeed.mobile.lighthouseScores.performance',
    'auditData.pageSpeed.desktop.lighthouseScores.performance',
    'auditData.pageSpeed.mobile.categories.performance.score',
    'auditData.pageSpeed.desktop.categories.performance.score',
    'overallScore'
  ]);

  const seoScore = extractScore([
    seo.seoScore,
    technicalData.seoScore,
    technicalData.auditData?.seoScore,
    technicalData.auditData?.pageSpeed?.mobile?.lighthouseScores?.seo,
    technicalData.auditData?.pageSpeed?.desktop?.lighthouseScores?.seo,
    technicalData.auditData?.pageSpeed?.mobile?.scores?.seo,
    technicalData.auditData?.pageSpeed?.desktop?.scores?.seo,
    technicalData.auditData?.scores?.seo,
    technicalData.auditData?.mobile?.seo
  ]) ?? getS([
    'seoScore',
    'auditData.seoScore',
    'auditData.pageSpeed.mobile.lighthouseScores.seo',
    'auditData.pageSpeed.desktop.lighthouseScores.seo',
    'auditData.pageSpeed.mobile.categories.seo.score',
    'auditData.pageSpeed.desktop.categories.seo.score'
  ]);

  const accessibilityScore = extractScore([
    seo.accessibilityScore,
    technicalData.accessibilityScore,
    technicalData.auditData?.accessibilityScore,
    technicalData.auditData?.pageSpeed?.mobile?.lighthouseScores?.accessibility,
    technicalData.auditData?.pageSpeed?.desktop?.lighthouseScores?.accessibility,
    technicalData.auditData?.pageSpeed?.mobile?.scores?.accessibility,
    technicalData.auditData?.pageSpeed?.desktop?.scores?.accessibility,
    technicalData.auditData?.scores?.accessibility,
    technicalData.auditData?.mobile?.accessibility
  ]) ?? getS([
    'accessibilityScore',
    'auditData.accessibilityScore',
    'auditData.pageSpeed.mobile.lighthouseScores.accessibility',
    'auditData.pageSpeed.desktop.lighthouseScores.accessibility',
    'auditData.pageSpeed.mobile.categories.accessibility.score',
    'auditData.pageSpeed.desktop.categories.accessibility.score'
  ]);

  const bestPracticesScore = extractScore([
    seo.bestPracticesScore,
    technicalData.bestPracticesScore,
    technicalData.auditData?.bestPracticesScore,
    technicalData.auditData?.pageSpeed?.mobile?.lighthouseScores?.bestPractices,
    technicalData.auditData?.pageSpeed?.desktop?.lighthouseScores?.bestPractices,
    technicalData.auditData?.pageSpeed?.mobile?.scores?.bestPractices,
    technicalData.auditData?.pageSpeed?.desktop?.scores?.bestPractices,
    technicalData.auditData?.scores?.bestPractices,
    technicalData.auditData?.mobile?.bestPractices
  ]) ?? getS([
    'bestPracticesScore',
    'auditData.bestPracticesScore',
    'auditData.pageSpeed.mobile.lighthouseScores.bestPractices',
    'auditData.pageSpeed.desktop.lighthouseScores.bestPractices',
    'auditData.pageSpeed.mobile.categories.best-practices.score',
    'auditData.pageSpeed.desktop.categories.best-practices.score'
  ]);

  const mobileScore = extractScore([
    seo.mobileScore,
    technicalData.mobileScore,
    technicalData.auditData?.mobileScore,
    technicalData.auditData?.pageSpeed?.mobile?.lighthouseScores?.overall,
    technicalData.auditData?.pageSpeed?.mobile?.scores?.overall
  ]) ?? getS([
    'mobileScore',
    'auditData.mobileScore',
    'auditData.pageSpeed.mobile.lighthouseScores.overall',
    'auditData.pageSpeed.mobile.scores.overall'
  ]);

  const desktopScore = extractScore([
    seo.desktopScore,
    technicalData.desktopScore,
    technicalData.auditData?.desktopScore,
    technicalData.auditData?.pageSpeed?.desktop?.lighthouseScores?.overall,
    technicalData.auditData?.pageSpeed?.desktop?.scores?.overall
  ]) ?? getS([
    'desktopScore',
    'auditData.desktopScore',
    'auditData.pageSpeed.desktop.lighthouseScores.overall',
    'auditData.pageSpeed.desktop.scores.overall'
  ]);

  const performanceScore = perfScore;

  // Normalize content gaps from multiple paths
  const contentGapData = seo.contentGapRecord || seo.contentGaps || seo.contentGapAnalysis || {};
  const normalizedContentGaps = {
    ...contentGapData,
    contentGaps: asArray(contentGapData.contentGaps || contentGapData.gaps || contentGapData.missingPages),
    landingPageIdeas: asArray(contentGapData.landingPageIdeas || contentGapData.landingPages),
    comparisonPages: asArray(contentGapData.comparisonPages || contentGapData.comparisons),
    resourcePages: asArray(contentGapData.resourcePages || contentGapData.resources),
    totalGaps: asArray(contentGapData.contentGaps || contentGapData.gaps || contentGapData.missingPages).length
  };

  // Build API-compatible key aliases for tab components
  // IMPORTANT: Prefer JSON columns (full service output format) over structured relations (subset fields).
  // JSON columns store the EXACT format that tabs expect (competitors[], competitorProfiles[], etc.).
  // Relations store structured subsets — only use as fallback.
  
  const tabTechnical = safeParse(seo.technicalAuditDetail || seo.technicalAudit || seo.technicalSeoAudit || {});

  // Keywords: JSON column = keywordOpportunities (exact service format), relation = keywordIntelligenceRecord
  const tabKeywords = safeParse(
    seo.keywordOpportunities ||
    seo.keywordIntelligenceRecord ||
    seo.keywordIntelligence ||
    seo.keywords ||
    {}
  );

  // Competitors: JSON column = competitorKeywords (exact raw format), relation = competitorSeoRecord (partial subset)
  const rawCompetitorJson = seo.competitorKeywords;
  const rawCompetitorRelation = seo.competitorSeoRecord;
  const tabCompetitors = safeParse(
    rawCompetitorJson ||
    rawCompetitorRelation ||
    seo.competitors ||
    seo.competitorIntelligence ||
    {}
  );

  // Content gaps: JSON column = contentGaps (exact format), relation = contentGapRecord
  const rawContentGapJson = seo.contentGaps;
  const rawContentGapRelation = seo.contentGapRecord;
  const tabContentGaps = safeParse(
    rawContentGapJson ||
    rawContentGapRelation ||
    seo.contentGapAnalysis ||
    normalizedContentGaps ||
    {}
  );

  // GEO: JSON column = geoIntelligence (exact format), relation = geoIntelligenceRecord
  const tabGeo = safeParse(
    seo.geoIntelligence ||
    seo.geoIntelligenceRecord ||
    seo.aiVisibility ||
    {}
  );

  // Blogs: JSON column = blogIdeas (exact format), relation = blogIntelligenceRecord
  const rawBlogJson = seo.blogIdeas;
  const rawBlogRelation = seo.blogIntelligenceRecord;
  const blogWeakKeywords = ['general', 'account', 'semrush', 'competitors', 'alternatives'];
  const tabBlogs = (() => {
    const blogData = safeParse(
      rawBlogJson ||
      rawBlogRelation ||
      seo.blogIntelligence ||
      {}
    );
    const filteredBlogs = asArray(blogData.blogIdeas || blogData.ideas || blogData).filter((idea: any) => {
      const keyword = (idea.targetKeyword || idea.keyword || '').toLowerCase();
      return !blogWeakKeywords.some(weak => keyword === weak || keyword.startsWith(weak + ' '));
    });
    return { ...blogData, blogIdeas: filteredBlogs, ideas: filteredBlogs };
  })();

  const normalizedSeo = {
    ...seo,
    // API-compatible key aliases (tabs expect these exact names)
    technicalAudit: tabTechnical,
    keywordIntelligence: tabKeywords,
    competitorIntelligence: tabCompetitors,
    contentGapAnalysis: tabContentGaps,
    geoIntelligence: tabGeo,
    blogIntelligence: tabBlogs,
    // Normalized keys
    scoreBreakdown: safeParse(seo.scoreBreakdown || seo.seoScoreBreakdown || seo.score_breakdown || {}),
    technical: tabTechnical,
    keywords: tabKeywords,
    geo: tabGeo,
    competitors: tabCompetitors,
    contentGaps: tabContentGaps,
    blogs: tabBlogs,
    executiveDashboard: safeParse(seo.executiveDashboard || seo.executiveSeoDashboard || seo.dashboard || {}),
    executive: safeParse(seo.executiveDashboard || seo.executiveSeoDashboard || seo.dashboard || {}),
    // Canonical paths
    executiveStory: safeParse(execStory, execStory),
    actionPlan: normalizedActionPlan,
    // Canonical technical scores with enhanced extraction
    performanceScore,
    seoScore,
    accessibilityScore,
    bestPracticesScore,
    mobileScore,
    desktopScore
  };

  if (import.meta.env.DEV && false) {
    // Dev debug logs removed for production safety
  }

  return normalizedSeo;
}

// DASHBOARD NORMALIZATION
export function normalizeDashboard(data: any) {
  const root = data?.data || data || {};
  const summaries = asArray(root.summaries || root.recentProjects || []);
  
  return {
    kpis: root.kpis || root.overview || {},
    projects: summaries.map(s => ({
      id: s.id,
      productName: s.productName || s.title || 'Unknown Project',
      companyName: s.companyName || s.website || '',
      growthScore: asNumber(s.growthScore),
      seoScore: asNumber(s.seoScore),
      lastUpdated: s.lastUpdated || s.updatedAt || new Date().toISOString(),
      status: s.status || 'Draft',
    })),
  };
}
