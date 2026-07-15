
const toNullableScore = (value) => {
  if (value === undefined || value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
};

function extractTechnicalAudit(source) {
  if (!source) return null;
  const tech = typeof source === 'object' ? source : {};
  return {
    source: tech.source || 'GOOGLE_PAGESPEED',
    measuredAt: tech.measuredAt || tech.measured_at || null,
    mobile: {
      performance: toNullableScore(tech.mobile?.performance ?? tech.mobile_performance),
      accessibility: toNullableScore(tech.mobile?.accessibility ?? tech.mobile_accessibility),
      bestPractices: toNullableScore(tech.mobile?.bestPractices ?? tech.mobile_best_practices ?? tech.mobile?.best_practices),
      seo: toNullableScore(tech.mobile?.seo ?? tech.mobile_seo),
      coreWebVitals: tech.mobile?.coreWebVitals ?? tech.mobile_core_web_vitals ?? null
    },
    desktop: {
      performance: toNullableScore(tech.desktop?.performance ?? tech.desktop_performance),
      accessibility: toNullableScore(tech.desktop?.accessibility ?? tech.desktop_accessibility),
      bestPractices: toNullableScore(tech.desktop?.bestPractices ?? tech.desktop_best_practices ?? tech.desktop?.best_practices),
      seo: toNullableScore(tech.desktop?.seo ?? tech.desktop_seo),
      coreWebVitals: tech.desktop?.coreWebVitals ?? tech.desktop_core_web_vitals ?? null
    },
    checks: (tech.checks || []).map(c => ({
      name: c.name || c.title || 'Unknown check',
      status: c.status || 'NOT_MEASURED',
      evidence: c.evidence || c.details || null,
      recommendation: c.recommendation || null
    }))
  };
}

function extractKeywords(source) {
  if (!source) return [];
  const items = Array.isArray(source) ? source : (source.items || source.keywords || []);
  return items.filter(k => k && k.keyword).map(k => ({
    keyword: k.keyword,
    type: k.type || k.keywordType || k.classification || 'UNCLASSIFIED',
    searchVolume: k.searchVolume ?? k.volume ?? null,
    cpc: k.cpc ?? null,
    competition: k.competition ?? null,
    competitionIndex: k.competitionIndex ?? k.competition_index ?? null,
    keywordDifficulty: k.keywordDifficulty ?? k.difficulty ?? null,
    searchIntent: k.searchIntent ?? k.intent ?? null,
    source: k.source || 'UNKNOWN',
    measuredAt: k.measuredAt || k.measured_at || null
  }));
}

function extractCompetitors(source) {
  if (!source) return [];
  const items = Array.isArray(source) ? source : (source.competitors || []);
  return items.filter(c => c && c.name && c.domain).map(c => ({
    name: c.name,
    domain: c.domain,
    sourceUrl: c.sourceUrl || c.source_url || null,
    category: c.category || null,
    sharedUseCase: c.sharedUseCase || c.shared_use_case || null,
    competitorType: c.competitorType || c.type || 'UNVERIFIED',
    validationStatus: c.validationStatus || c.status || 'UNVERIFIED',
    evidence: c.evidence || null,
    discoveredAt: c.discoveredAt || c.discovered_at || null,
    positioning: c.positioning || null,
    overlappingKeywords: c.overlappingKeywords || c.keywords || [],
    contentThemes: c.contentThemes || c.themes || [],
    authority: c.authority ?? null,
    technicalObservations: c.technicalObservations || null
  }));
}

function extractContentOpportunities(source) {
  if (!source) return [];
  const items = Array.isArray(source) ? source : (source.opportunities || source.contentGaps || []);
  return items.filter(o => o && o.title).map(o => ({
    title: o.title,
    gapType: o.gapType || o.type || 'CONTENT_OPPORTUNITY',
    targetKeyword: o.targetKeyword || o.keyword || null,
    audience: o.audience || null,
    searchIntent: o.searchIntent || o.intent || null,
    recommendedFormat: o.recommendedFormat || o.format || null,
    reason: o.reason || o.description || null,
    evidence: o.evidence || null,
    inferenceStatus: o.inferenceStatus || 'AI_INFERRED',
    priority: o.priority || 'MEDIUM',
    effort: o.effort || 'MEDIUM'
  }));
}

function extractBlogIdeas(source) {
  if (!source) return [];
  const items = Array.isArray(source) ? source : (source.ideas || []);
  return items.filter(b => b && b.title).map(b => ({
    title: b.title,
    primaryKeyword: b.primaryKeyword || b.keyword || null,
    secondaryKeywords: b.secondaryKeywords || b.keywords || [],
    audience: b.audience || null,
    funnelStage: b.funnelStage || b.stage || null,
    searchIntent: b.searchIntent || b.intent || null,
    angle: b.angle || null,
    outline: b.outline || null,
    evidence: b.evidence || null,
    inferenceStatus: b.inferenceStatus || 'AI_INFERRED'
  }));
}

function extractAiSearchReadiness(source) {
  if (!source) return null;
  const s = typeof source === 'object' ? source : {};
  return {
    entityClarity: s.entityClarity ?? s.entity_clarity ?? null,
    answerability: s.answerability ?? null,
    structuredDataReadiness: s.structuredDataReadiness ?? s.structured_data_readiness ?? null,
    citationReadiness: s.citationReadiness ?? s.citation_readiness ?? null,
    topicalAuthority: s.topicalAuthority ?? s.topical_authority ?? null,
    trustSignals: s.trustSignals ?? s.trust_signals ?? null,
    platformVisibility: {
      chatGPT: s.platformVisibility?.chatGPT ?? 'Not measured',
      gemini: s.platformVisibility?.gemini ?? 'Not measured',
      claude: s.platformVisibility?.claude ?? 'Not measured',
      perplexity: s.platformVisibility?.perplexity ?? 'Not measured',
      googleAIO: s.platformVisibility?.googleAIO ?? s.platformVisibility?.google_ai_overview ?? 'Not measured'
    },
    inferenceStatus: 'AI_INFERRED'
  };
}

function extractActionPlan(source) {
  if (!source) return [];
  const items = Array.isArray(source) ? source : (source.actions || source.recommendations || []);
  return items.filter(a => a && a.title).map(a => ({
    title: a.title,
    category: a.category || 'Content',
    priority: a.priority || 'MEDIUM',
    effort: a.effort || 'MEDIUM',
    owner: a.owner || 'Marketing',
    reason: a.reason || a.description || null,
    evidence: a.evidence || null,
    expectedOutcome: a.expectedOutcome || a.outcome || null,
    status: a.status || 'NOT_STARTED',
    inferenceStatus: a.inferenceStatus || 'AI_INFERRED',
    dependencies: a.dependencies || []
  }));
}

function extractExecutiveDashboard(source) {
  if (!source) return null;
  const d = typeof source === 'object' ? source : {};
  const hasPartialData = !d.overallSeoScore && d.overallSeoScore !== 0;
  return {
    overallSeoScore: toNullableScore(d.overallSeoScore ?? d.seo_score),
    status: hasPartialData ? 'PARTIAL_DATA' : (d.status || 'COMPLETED'),
    assessmentStatus: d.assessmentStatus || d.assessment_status || null,
    technicalHealth: d.technicalHealth ?? d.technical_health ?? null,
    keywordCoverage: d.keywordCoverage ?? d.keyword_coverage ?? null,
    contentCoverage: d.contentCoverage ?? d.content_coverage ?? null,
    competitorCoverage: d.competitorCoverage ?? d.competitor_coverage ?? null,
    aiSearchReadiness: d.aiSearchReadiness ?? d.ai_search_readiness ?? null,
    dataCompleteness: d.dataCompleteness ?? d.data_completeness ?? null,
    topPriorities: (d.topPriorities || d.priorities || []).slice(0, 3),
    keyRisks: d.keyRisks || d.risks || [],
    keyOpportunities: d.keyOpportunities || d.opportunities || [],
    missingIntegrations: d.missingIntegrations || []
  };
}

export function buildSeoFrontendPayload({
  seoIntelligence,
  executiveDashboard,
  technicalAudit,
  pageSpeedData,
  keywordIntelligence,
  competitorIntelligence,
  contentGapIntelligence,
  blogIntelligence,
  aiSearchReadiness,
  actionPlan,
  productIdentity,
  warnings = [],
  metadata = {}
}) {
  const status = 'COMPLETED';

  const overview = executiveDashboard ? extractExecutiveDashboard(executiveDashboard) : null;

  return {
    status,
    productIdentity: productIdentity || null,
    overview,
    technicalAudit: technicalAudit ? extractTechnicalAudit(technicalAudit) : extractTechnicalAudit(pageSpeedData),
    keywordIntelligence: {
      keywords: extractKeywords(keywordIntelligence),
      totalCount: 0,
      productSpecificCount: 0,
      verifiedMetrics: false
    },
    competitorSeo: (() => {
      const competitors = extractCompetitors(competitorIntelligence);
      const verified = competitors.filter(c => c.validationStatus === 'VERIFIED' || c.competitorType === 'DIRECT');
      if (verified.length === 0) {
        return {
          status: 'NO_VERIFIED_COMPETITORS',
          message: 'No verified SEO competitors were identified from available evidence.',
          competitors: []
        };
      }
      return { status: 'COMPLETED', competitors: verified };
    })(),
    contentOpportunities: extractContentOpportunities(contentGapIntelligence),
    contentGaps: extractContentOpportunities(contentGapIntelligence).filter(o => o.gapType === 'CONTENT_GAP' || o.gapType === 'TOPICAL_GAP'),
    blogIdeas: extractBlogIdeas(blogIntelligence),
    aiSearchReadiness: extractAiSearchReadiness(aiSearchReadiness),
    actionPlan: extractActionPlan(actionPlan),
    dataCompleteness: overview?.dataCompleteness || null,
    warnings: warnings.length > 0 ? warnings : undefined,
    metadata: {
      generatedAt: new Date().toISOString(),
      ...metadata
    }
  };
}

export function normalizeDataForSEOKeywords(rawData) {
  if (!rawData) return [];
  const tasks = Array.isArray(rawData) ? rawData : (rawData.tasks || []);
  const results = [];
  for (const task of tasks) {
    const taskResults = task.result || [];
    for (const r of taskResults) {
      if (r.keyword) {
        results.push({
          keyword: r.keyword,
          searchVolume: r.keyword_data?.search_volume ?? r.search_volume ?? null,
          cpc: r.keyword_data?.cpc ?? r.cpc ?? null,
          competition: r.keyword_data?.competition ?? r.competition ?? null,
          competitionIndex: r.keyword_data?.competition_index ?? r.competition_index ?? null,
          monthlySearches: r.keyword_data?.monthly_searches ?? r.monthly_searches ?? null,
          source: 'DATAFORSEO',
          measuredAt: new Date().toISOString(),
          location: r.location || null,
          language: r.language || null
        });
      }
    }
  }
  return results;
}

export const SEO_KEYWORD_TYPES = ['BRAND', 'CATEGORY', 'FEATURE', 'USE_CASE', 'PAIN_POINT', 'QUESTION', 'LONG_TAIL', 'BROAD'];

export function classifyKeyword(keyword, productName, brandName) {
  if (!keyword) return 'BROAD';
  const kw = keyword.toLowerCase().trim();
  const product = (productName || '').toLowerCase();
  const brand = (brandName || '').toLowerCase();

  if (product && kw.includes(product)) return 'BRAND';
  if (brand && kw.includes(brand)) return 'BRAND';

  if (kw.includes(' vs ') || kw.includes(' vs. ')) return 'COMPARISON';
  if (kw.includes(' vs ')) return 'COMPARISON';

  if (kw.startsWith('how ') || kw.startsWith('what ') || kw.startsWith('why ') ||
      kw.startsWith('when ') || kw.startsWith('where ') || kw.startsWith('which ') ||
      kw.startsWith('can ') || kw.startsWith('does ') || kw.startsWith('is ')) return 'QUESTION';

  if (kw.includes(' for ') || kw.includes(' best ') || kw.includes(' top ')) return 'LONG_TAIL';

  if (kw.split(/\s+/).length >= 4) return 'LONG_TAIL';

  if (kw.split(/\s+/).length <= 2) return 'BROAD';

  return 'CATEGORY';
}
