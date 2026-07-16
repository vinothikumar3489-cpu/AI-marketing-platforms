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
    if (candidate) {
      if (typeof candidate === 'string') return candidate.trim();
      if (typeof candidate === 'number') return String(candidate);
      return renderSafeValue(candidate);
    }
    return fallback;
  }
  return fallback;
};

// Type guard: a real plain object (not null, not array)
export const isPlainObject = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

// Display-safe adapter: coerce any value into a human-readable string WITHOUT
// dumping raw JSON. Preserves the most meaningful field of structured objects.
// Returns the fallback for empty/missing values (never fabricates data).
export const toDisplayText = (value: unknown, fallback = 'Not available'): string => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const joined = value.map(v => toDisplayText(v, '')).filter(Boolean).join(', ');
    return joined || fallback;
  }
  if (isPlainObject(value)) {
    const candidate =
      value.label ??
      value.title ??
      value.name ??
      value.action ??
      value.recommendation ??
      value.opportunity ??
      value.issue ??
      value.text ??
      value.value ??
      value.description ??
      value.summary ??
      value.reason ??
      value.keyword;
    if (candidate !== undefined && candidate !== null && candidate !== '') {
      return toDisplayText(candidate, fallback);
    }
    return fallback;
  }
  return fallback;
};

// Structured SEO item adapter for score-style objects.
// Preserves ALL useful fields (score/reason/source/category/priority/...) and
// adds a display-safe `label`. Never removes fields, never converts null -> 0.
export const normalizeSeoItem = (value: unknown): Record<string, any> => {
  if (isPlainObject(value)) {
    return { ...value, label: toDisplayText(value, '') };
  }
  return { label: value !== null && value !== undefined ? String(value) : 'Not available' };
};

export const asInsight = (value: any, fallbackTitle?: string) => {
  // Always return an object, never null
  if (!value) {
    return {
      value: fallbackTitle || 'No data',
      title: fallbackTitle,
      confidence: null,
      impact: null
    };
  }
  
  if (typeof value === 'string') {
    return {
      value: value.trim() || fallbackTitle || 'No data',
      title: fallbackTitle,
      confidence: null,
      impact: null
    };
  }
  
  const impactValue = value.impact || value.priority || 'Medium';
  const validImpact = ['Low', 'Medium', 'High'].includes(impactValue) ? impactValue : 'Medium';
  
  return {
    value: value.value || value.description || value.summary || asText(value, 'No data'),
    confidence: value.confidence ?? value.confidenceScore ?? null,
    evidence: value.evidence || value.proof || '',
    source: value.source || value.url || '',
    impact: validImpact as 'Low' | 'Medium' | 'High',
    title: value.title || value.name || fallbackTitle || '',
    recommendedAction: value.recommendedAction || value.action || value.recommendation || ''
  };
};

export const asNumber = (value: any, fallback = null) => {
  if (value === null || value === undefined) return fallback;
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

export const renderSafeValue = (value: any): string => {
  if (value === null || value === undefined) return "Not available";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => renderSafeValue(item)).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    if ("value" in value || "impact" in value || "confidence" in value) {
      return [
        value.value !== undefined ? `Value: ${renderSafeValue(value.value)}` : null,
        value.impact !== undefined ? `Impact: ${renderSafeValue(value.impact)}` : null,
        value.confidence !== undefined ? `Confidence: ${renderSafeValue(value.confidence)}` : null,
      ].filter(Boolean).join(" | ");
    }
    if ("score" in value || "reason" in value || "source" in value || "category" in value || "priority" in value) {
      return [
        value.score !== undefined ? `Score: ${renderSafeValue(value.score)}` : null,
        value.reason !== undefined ? `Reason: ${renderSafeValue(value.reason)}` : null,
        value.source !== undefined ? `Source: ${renderSafeValue(value.source)}` : null,
        value.category !== undefined ? `Category: ${renderSafeValue(value.category)}` : null,
        value.priority !== undefined ? `Priority: ${renderSafeValue(value.priority)}` : null,
      ].filter(Boolean).join(" | ");
    }
    if ("title" in value) return renderSafeValue(value.title);
    if ("name" in value) return renderSafeValue(value.name);
    if ("label" in value) return renderSafeValue(value.label);
    if ("description" in value) return renderSafeValue(value.description);
    return Object.entries(value)
      .map(([key, val]) => `${key}: ${renderSafeValue(val)}`)
      .join(" | ");
  }
  return String(value);
};

export const isRenderable = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return true;
  if (typeof value === 'object') return true;
  return false;
};

export const sanitizeForReact = (value: any): any => {
  if (value === null || value === undefined) return value;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) return value;

  if (Array.isArray(value)) {
    return value.map(sanitizeForReact);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, sanitizeForReact(val)])
    );
  }

  return String(value);
};

// Backend-safe frontend normalizer for SEO objects
// Normalizes objects with {score, reason, source, category, priority} structure
export const normalizeSeoDisplay = (value: any): any => {
  if (value === null || value === undefined) return value;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) return value;

  if (Array.isArray(value)) return value.map(normalizeSeoDisplay);

  if (typeof value === "object") {
    // Detect SEO score objects and normalize them
    if ("score" in value && "reason" in value && "source" in value && "category" in value) {
      return {
        score: value.score ?? "Not available",
        reason: value.reason ?? "Not available",
        source: value.source ?? "Not available",
        category: value.category ?? "Not available",
        priority: value.priority ?? "Not available",
      };
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, normalizeSeoDisplay(val)])
    );
  }

  return String(value);
};

export const seoSafeText = (value: any): string => {
  if (value === null || value === undefined) return "Not available";

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(seoSafeText).join(", ");
  }

  if (typeof value === "object") {
    if ("score" in value || "reason" in value || "source" in value || "category" in value || "priority" in value) {
      return [
        value.score !== undefined ? `Score: ${seoSafeText(value.score)}` : null,
        value.reason !== undefined ? `Reason: ${seoSafeText(value.reason)}` : null,
        value.source !== undefined ? `Source: ${seoSafeText(value.source)}` : null,
        value.category !== undefined ? `Category: ${seoSafeText(value.category)}` : null,
        value.priority !== undefined ? `Priority: ${seoSafeText(value.priority)}` : null,
      ].filter(Boolean).join(" | ");
    }

    if ("value" in value || "impact" in value || "confidence" in value) {
      return [
        value.value !== undefined ? `Value: ${seoSafeText(value.value)}` : null,
        value.impact !== undefined ? `Impact: ${seoSafeText(value.impact)}` : null,
        value.confidence !== undefined ? `Confidence: ${seoSafeText(value.confidence)}` : null,
      ].filter(Boolean).join(" | ");
    }

    return Object.entries(value)
      .map(([key, val]) => `${key}: ${seoSafeText(val)}`)
      .join(" | ");
  }

  return String(value);
};

export const sanitizeSeoForDisplay = (value: any): any => {
  if (value === null || value === undefined) return value;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeSeoForDisplay);
  }

  if (typeof value === "object") {
    if ("score" in value || "reason" in value || "source" in value || "category" in value || "priority" in value) {
      return seoSafeText(value);
    }

    if ("value" in value || "impact" in value || "confidence" in value) {
      return seoSafeText(value);
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, sanitizeSeoForDisplay(val)])
    );
  }

  return String(value);
};

export const normalizeDeep = (value: any): any => {
  if (value === null || value === undefined) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(normalizeDeep);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, normalizeDeep(val)])
    );
  }
  return String(value);
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

  const growthStatus = root.growthStatus || 'NOT_RUN';
  const seoStatus = root.seoStatus || 'NOT_RUN';

  const growthWorkspace = root.growthWorkspace || null;
  const seoIntelligence = root.seoIntelligence || null;

  const hasGrowthWorkspace = !!growthWorkspace && growthWorkspace.status === 'COMPLETED';
  const hasSeoIntelligence = !!seoIntelligence && seoIntelligence.status === 'COMPLETED';

  // Derive legacy growth shape from canonical growthWorkspace
  const deriveGrowth = (gw: any) => {
    if (!gw) return null;
    return {
      product: safeParse(gw.product, gw.product),
      market: safeParse(gw.market, gw.market),
      audience: safeParse(gw.audience, gw.audience),
      competitor: gw.competitors ? { directCompetitors: gw.competitors, competitors: gw.competitors } : null,
      intent: null,
      positioning: safeParse(gw.positioning, gw.positioning),
      campaign: safeParse(gw.campaign, gw.campaign),
      channel: gw.channels ? { recommendedChannels: gw.channels, channels: gw.channels } : null,
      executiveStory: null,
      actionPlan: gw.roadmap || null,
      summary: gw.scores || null,
    };
  };

  // Derive legacy SEO shape from canonical seoIntelligence
  const deriveSeo = (si: any) => {
    if (!si) return null;
    return {
      executiveSummary: si.executiveSummary || null,
      technicalAudit: si.technicalAudit || null,
      keywords: si.keywords || [],
      competitors: si.competitors || [],
      contentGaps: si.contentGaps || [],
      aiSearchReadiness: si.aiSearchReadiness || null,
      blogOpportunities: si.blogOpportunities || [],
      actionPlan: si.actionPlan || [],
      dataCompleteness: si.dataCompleteness || null,
      warnings: si.warnings || [],
    };
  };

  const result = {
    chat: root.chat || root.chatId ? { id: root.chatId } : {},
    chatId: root.chatId || root.chat?.id || '',
    growthStatus,
    seoStatus,
    productIdentity: growthWorkspace?.productIdentity || null,
    growthWorkspace,
    seoIntelligence: hasSeoIntelligence ? seoIntelligence : null,
    growth: deriveGrowth(growthWorkspace),
    seo: deriveSeo(seoIntelligence),
    agents: asArray(root.agentRuns || root.agents || []),
    automation: root.automationPlan || null,
    hasGrowthWorkspace,
    hasSeoIntelligence,
    hasProductIntelligence: !!root.persistence?.productIntelligence || hasGrowthWorkspace,
    hasCompetitorIntelligence: !!root.persistence?.competitorIntelligence || !!(growthWorkspace?.competitors?.length),
    hasCampaignIntelligence: !!root.persistence?.campaignIntelligence || !!growthWorkspace?.campaign,
  };

  // Fallback for legacy response shapes (no data wrapper)
  if (!root.growthWorkspace && !root.seoIntelligence) {
    const legacyGrowth = root.growth || root.growthWorkspace || {};
    const legacySeo = root.seoIntelligence || root.seo || root.seoData || root.seoAnalysis || {};

    if (Object.keys(legacyGrowth).length > 0 || Object.keys(legacySeo).length > 0) {
      result.growthWorkspace = null;
      result.seoIntelligence = null;
      result.growth = legacyGrowth;
      result.seo = normalizeSeo(legacySeo);
      result.hasGrowthWorkspace = Object.keys(legacyGrowth).length > 0;
      result.hasSeoIntelligence = Object.keys(legacySeo).length > 0;
    }
  }

  return result;
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
  const tabKeywordsRaw = safeParse(
    seo.keywordOpportunities ||
    seo.keywordIntelligenceRecord ||
    seo.keywordIntelligence ||
    seo.keywords ||
    {}
  );
  // Handle case where keywordOpportunities is a flat array (AI fallback) vs object with categories
  const tabKeywords = Array.isArray(tabKeywordsRaw)
    ? { primaryKeywords: tabKeywordsRaw, secondaryKeywords: [], longTailKeywords: [], questionKeywords: [], clusters: [], competitorKeywords: [], contentOpportunities: [], geoKeywords: [], metadata: { totalKeywords: tabKeywordsRaw.length } }
    : tabKeywordsRaw;

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
    desktopScore,
    // Identity aliases at top level for easy access
    websiteUrl: seo.identity?.websiteUrl || seo.websiteUrl || '',
    domain: seo.identity?.domain || seo.domain || '',
    companyName: seo.identity?.companyName || seo.companyName || '',
    productName: seo.identity?.productName || seo.productName || '',
    // Extract technical issues from the audit
    technicalIssues: tabTechnical?.criticalIssues || tabTechnical?.highIssues || tabTechnical?.mediumIssues || tabTechnical?.issues || [],
    // Extract content opportunities from keyword intelligence
    contentOpportunities: tabKeywords?.contentOpportunities || [],
    // Evidence source summary
    sourceSummary: seo.sourceSummary || seo.identity?.sourceSummary || {},
  };

  if (import.meta.env.DEV) {
    console.debug('[normalizeSeo] input keys:', Object.keys(seo));
    console.debug('[normalizeSeo] hasScoreBreakdown:', !!seo.scoreBreakdown);
    console.debug('[normalizeSeo] hasTechnicalAudit:', !!tabTechnical);
    console.debug('[normalizeSeo] keywordPrimaryCount:', (tabKeywords?.primaryKeywords || []).length);
    console.debug('[normalizeSeo] blogIdeasCount:', (tabBlogs?.blogIdeas || []).length);
    console.debug('[normalizeSeo] hasExecutiveDashboard:', !!seo.executiveDashboard);
    console.debug('[normalizeSeo] hasExecutiveStory:', !!execStory);
    console.debug('[normalizeSeo] hasActionPlan:', !!normalizedActionPlan);
    console.debug('[normalizeSeo] output keys:', Object.keys(normalizedSeo));
    console.debug('[normalizeSeo] hasRealSeoData check:', {
      websiteUrl: normalizedSeo.websiteUrl,
      technicalIssues: normalizedSeo.technicalIssues?.length,
      contentOpportunities: normalizedSeo.contentOpportunities?.length,
      performanceScore: normalizedSeo.performanceScore,
      seoScore: normalizedSeo.seoScore,
    });
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
