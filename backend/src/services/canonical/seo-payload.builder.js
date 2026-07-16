import { isLowQualityKeyword } from '../execution/keyword-quality.filter.js';
import { extractValidCompetitors, normalizeCompetitorForSeo } from './validated-competitors.js';

function safeArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [];
}

function safeScore(val) {
  if (val === null || val === undefined || val === '' || val === 'Not measured') return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  if (n >= 0 && n <= 1) return Math.round(n * 100);
  return Math.round(n);
}

export function buildCanonicalSeoPayload({
  chat,
  productIdentity,
  seoIntelligence,
  seoScoreBreakdown,
  technicalAuditDetail,
  keywordIntelligence,
  contentGapRecord,
  competitorSeoAnalysis,
  blogIntelligence,
  validatedGrowthCompetitors,
}) {
  const warnings = [];

  const technicalAudit = normalizeTechnicalAudit(technicalAuditDetail, warnings);
  const keywords = buildValidKeywords(keywordIntelligence, productIdentity, warnings);
  const contentGaps = buildValidContentGaps(contentGapRecord, keywords, productIdentity, warnings);
  const competitors = buildSeoCompetitors(competitorSeoAnalysis, validatedGrowthCompetitors, productIdentity, warnings);
  const blogOpportunities = buildBlogOpportunities(blogIntelligence, warnings);
  const aiSearchReadiness = buildAiSearchReadiness(seoIntelligence?.geoIntelligence, seoIntelligence?.aiVisibility, warnings);
  const actionPlan = buildValidActionPlan(seoIntelligence, technicalAudit, keywords, contentGaps, warnings);
  const scoreBreakdown = normalizeScoreBreakdown(seoScoreBreakdown, technicalAudit, warnings);
  const executiveSummary = buildExecutiveSummary(scoreBreakdown, technicalAudit, keywords, competitors);

  return {
    chatId: chat?.id,
    status: 'COMPLETED',
    productIdentity: productIdentity || {},
    executiveSummary,
    technicalAudit,
    keywords,
    competitors,
    contentGaps,
    aiSearchReadiness,
    blogOpportunities,
    actionPlan,
    dataCompleteness: {
      hasKeywords: keywords.length > 0,
      hasCompetitors: competitors.length > 0,
      hasContentGaps: contentGaps.length > 0,
      hasTechnicalAudit: technicalAudit.available,
      hasBlogOpportunities: blogOpportunities.length > 0,
      hasActionPlan: actionPlan.length > 0,
      hasAiSearchReadiness: aiSearchReadiness.available,
    },
    warnings,
    updatedAt: seoIntelligence?.updatedAt || chat?.updatedAt || new Date().toISOString(),
  };
}

function normalizeTechnicalAudit(record, warnings) {
  if (!record) {
    return { available: false, measuredAt: null, source: null, mobile: null, desktop: null, checks: [], issues: [] };
  }

  const auditData = record.auditData || {};

  const pageSpeed = auditData.pageSpeed || auditData.pagespeed || {};
  const mobileData = pageSpeed.mobile || {};
  const desktopData = pageSpeed.desktop || {};

  function extractScore(deviceData, metric) {
    const paths = [
      deviceData.lighthouseScores?.[metric],
      deviceData.categories?.[metric]?.score,
      deviceData.categories?.[metric === 'bestPractices' ? 'best-practices' : metric]?.score,
      deviceData.scores?.[metric],
      deviceData[metric],
    ];
    for (const p of paths) {
      const n = safeScore(p);
      if (n !== null) return n;
    }
    return null;
  }

  const mobile = {
    performance: extractScore(mobileData, 'performance'),
    seo: extractScore(mobileData, 'seo'),
    accessibility: extractScore(mobileData, 'accessibility'),
    bestPractices: extractScore(mobileData, 'bestPractices'),
  };

  const desktop = {
    performance: extractScore(desktopData, 'performance'),
    seo: extractScore(desktopData, 'seo'),
    accessibility: extractScore(desktopData, 'accessibility'),
    bestPractices: extractScore(desktopData, 'bestPractices'),
  };

  const hasAnyScore = Object.values(mobile).some(s => s !== null) || Object.values(desktop).some(s => s !== null);
  const checks = safeArray(auditData.checks || record.checks || []);
  const criticalIssues = safeArray(auditData.criticalIssues || record.criticalIssues || []);
  const highIssues = safeArray(auditData.highIssues || record.highIssues || []);

  const available = hasAnyScore || checks.length > 0 || criticalIssues.length > 0 || highIssues.length > 0;
  const hasUsableData = hasAnyScore || checks.length > 0 || criticalIssues.length > 0;

  const measuredAt = auditData.measuredAt || record.analyzedAt || record.measuredAt || null;

  return {
    available: hasUsableData,
    measuredAt,
    source: record.source || auditData.source || 'pagespeed',
    mobile: hasMobileData(mobile) ? mobile : null,
    desktop: hasMobileData(desktop) ? desktop : null,
    checks,
    issues: [...criticalIssues, ...highIssues].slice(0, 20),
  };

  function hasMobileData(d) {
    return Object.values(d).some(s => s !== null);
  }
}

function buildValidKeywords(keywordIntel, productIdentity, warnings) {
  if (!keywordIntel) return [];

  const allSources = [];

  function extractItems(obj, key) {
    if (Array.isArray(obj?.[key])) {
      for (const item of obj[key]) {
        allSources.push(item);
      }
    }
  }

  extractItems(keywordIntel, 'primaryKeywords');
  extractItems(keywordIntel, 'secondaryKeywords');
  extractItems(keywordIntel, 'longTailKeywords');
  extractItems(keywordIntel, 'questionKeywords');
  extractItems(keywordIntel, 'competitorKeywords');

  if (Array.isArray(keywordIntel)) {
    for (const item of keywordIntel) {
      allSources.push(item);
    }
  }

  const valid = [];

  for (const item of allSources) {
    if (typeof item === 'string') {
      if (!isLowQualityKeyword(item)) {
        valid.push({ keyword: item, type: 'flat', source: 'keyword_intelligence' });
      }
      continue;
    }

    if (!item || typeof item !== 'object') continue;

    const keyword = item.keyword || item.term || item.name || item.topic || item.value || '';
    if (!keyword || typeof keyword !== 'string') continue;
    if (isLowQualityKeyword(keyword)) continue;

    const canonical = {
      keyword,
      type: item.type || item.classification || 'organic',
      intent: item.intent || item.searchIntent || null,
      source: item.source || item.dataSource || 'keyword_intelligence',
      volume: safeScore(item.volume ?? item.searchVolume ?? item.monthlyVolume ?? item.searches),
      difficulty: safeScore(item.difficulty ?? item.keywordDifficulty ?? item.kd),
      cpc: item.cpc ?? item.costPerClick ?? null,
      competition: item.competition ?? item.paidCompetition ?? null,
      metricStatus: 'UNMEASURED',
      evidence: item.evidence || null,
    };

    if (canonical.volume !== null && (item.source === 'dataforseo' || item.provider === 'dataforseo')) {
      canonical.metricStatus = 'MEASURED';
    }

    valid.push(canonical);
  }

  const seen = new Set();
  const deduped = valid.filter(k => {
    const lower = k.keyword.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });

  const productCandidates = deduped.filter(k => {
    const lower = k.keyword.toLowerCase();
    const brand = (productIdentity?.brandName || '').toLowerCase();
    const product = (productIdentity?.productName || '').toLowerCase();
    if (brand && lower.includes(brand) && lower !== brand) return true;
    if (product && lower.includes(product) && lower !== product) return true;
    if (lower.includes(' vs ') || lower.includes(' alternative') || lower.includes(' competitor')) return true;
    if (lower.includes('how to') || lower.includes('what is') || lower.includes('best ')) return true;
    return false;
  });

  if (productCandidates.length > 3) {
    return productCandidates;
  }

  return deduped.slice(0, 30);
}

function buildValidContentGaps(contentGapRecord, validKeywords, productIdentity, warnings) {
  if (!contentGapRecord) return [];

  const gaps = [];

  function extractFromField(obj, key) {
    if (Array.isArray(obj?.[key])) {
      for (const item of obj[key]) {
        if (typeof item === 'string') {
          if (!isLowQualityKeyword(item)) {
            gaps.push({ topic: item, gapType: 'content', source: key });
          }
        } else if (item && typeof item === 'object') {
          const topic = item.topic || item.title || item.opportunity || item.name || item.value || '';
          if (topic && !isLowQualityKeyword(topic)) {
            gaps.push({
              topic,
              targetKeyword: item.targetKeyword || item.keyword || '',
              gapType: item.gapType || item.type || 'content',
              searchIntent: item.searchIntent || item.intent || null,
              audience: item.audience || null,
              reason: item.reason || item.description || item.gap || null,
              evidence: item.evidence || null,
              recommendedFormat: item.recommendedFormat || item.contentType || item.suggestedPage || null,
              priority: item.priority || item.opportunityScore || null,
              inferenceStatus: 'INFERRED',
            });
          }
        }
      }
    }
  }

  extractFromField(contentGapRecord, 'contentGaps');
  extractFromField(contentGapRecord, 'landingPageIdeas');
  extractFromField(contentGapRecord, 'comparisonPageIdeas');
  extractFromField(contentGapRecord, 'faqOpportunities');
  extractFromField(contentGapRecord, 'geoContentIdeas');
  extractFromField(contentGapRecord, 'resourcePageIdeas');

  if (gaps.length === 0) {
    warnings.push('No valid content gaps could be derived from available data');
  }

  return gaps.slice(0, 20);
}

function buildSeoCompetitors(competitorSeoAnalysis, validatedGrowthCompetitors, productIdentity, warnings) {
  const competitors = [];

  const productDomain = (productIdentity?.domain || '').toLowerCase();

  if (validatedGrowthCompetitors && Array.isArray(validatedGrowthCompetitors)) {
    for (const comp of validatedGrowthCompetitors) {
      const normalized = normalizeCompetitorForSeo(comp, productDomain);
      if (normalized) competitors.push(normalized);
    }
  }

  if (competitorSeoAnalysis) {
    const seoCompetitors = [];

    if (Array.isArray(competitorSeoAnalysis.competitors)) {
      for (const c of competitorSeoAnalysis.competitors) {
        if (typeof c === 'string') {
          if (!isLowQualityKeyword(c)) {
            seoCompetitors.push({ name: c, domain: '', type: 'direct', source: 'seo_competitor_record' });
          }
        } else if (c && typeof c === 'object') {
          const name = c.name || c.brand || '';
          const domain = c.website || c.domain || '';
          if (name && !isLowQualityKeyword(name)) {
            seoCompetitors.push({
              name,
              domain: domain || '',
              type: c.type || c.competitorType || 'direct',
              source: 'seo_competitor_record',
              evidence: c.reason || c.description || '',
            });
          }
        }
      }
    }

    if (Array.isArray(competitorSeoAnalysis.competitorProfiles)) {
      for (const c of competitorSeoAnalysis.competitorProfiles) {
        const name = c.name || c.brand || '';
        const domain = c.domain || c.website || '';
        if (name && !isLowQualityKeyword(name)) {
          seoCompetitors.push({
            name,
            domain: domain || '',
            type: c.type || 'direct',
            source: 'seo_competitor_profile',
            evidence: c.description || c.reason || '',
          });
        }
      }
    }

    const seen = new Set(competitors.map(c => c.name.toLowerCase()));
    for (const sc of seoCompetitors) {
      const key = sc.name.toLowerCase();
      if (!seen.has(key)) {
        const normalized = normalizeCompetitorForSeo(sc, productDomain);
        if (normalized) {
          competitors.push(normalized);
          seen.add(key);
        }
      }
    }
  }

  const validated = competitors.filter(c => c.validationStatus === 'VALIDATED');

  if (validated.length === 0) {
    warnings.push('No validated SEO competitors found');
  }

  return validated;
}

function buildBlogOpportunities(blogIntelligence, warnings) {
  if (!blogIntelligence) return [];

  const blogs = [];

  if (Array.isArray(blogIntelligence.blogIdeas)) {
    for (const item of blogIntelligence.blogIdeas) {
      if (typeof item === 'string') {
        if (!isLowQualityKeyword(item)) {
          blogs.push({ title: item, keyword: item });
        }
      } else if (item && typeof item === 'object') {
        const title = item.title || item.topic || item.idea || '';
        const keyword = item.keyword || item.targetKeyword || title;
        if (title && !isLowQualityKeyword(title) && title.length > 5) {
          blogs.push({
            title,
            keyword,
            intent: item.searchIntent || item.intent || null,
            difficulty: item.difficulty || null,
            opportunity: item.opportunity || null,
            estimatedImpact: item.estimatedImpact || item.impact || null,
            outline: item.outline || null,
            metaDescription: item.metaDescription || null,
          });
        }
      }
    }
  }

  if (blogs.length === 0) {
    warnings.push('No valid blog opportunities available');
  }

  return blogs.slice(0, 15);
}

function buildAiSearchReadiness(geoIntelligence, aiVisibility, warnings) {
  if (!geoIntelligence && !aiVisibility) {
    return { available: false, inferenceStatus: 'AI_INFERRED' };
  }

  const geo = geoIntelligence || aiVisibility || {};

  const hasMeasured = (geo.aiVisibilityScore !== null && geo.aiVisibilityScore !== undefined) ||
    geo.chatGptScore !== undefined || geo.geminiScore !== undefined;

  if (!hasMeasured) {
    const entityCoverage = safeScore(geo.entityCoverageScore || geo.entityCoverage);
    const knowledgeGraph = safeScore(geo.knowledgeGraphReadinessScore || geo.knowledgeGraphReadiness);
    const citationReadiness = safeScore(geo.citationReadinessScore || geo.citationReadiness);
    const answerability = safeScore(geo.answerabilityScore || geo.answerability);
    const topicalAuthority = safeScore(geo.topicalAuthorityScore || geo.topicalAuthority);

    return {
      available: entityCoverage !== null || knowledgeGraph !== null || citationReadiness !== null || answerability !== null || topicalAuthority !== null,
      inferenceStatus: 'AI_INFERRED',
      dimensions: {
        entityClarity: entityCoverage,
        answerability,
        structuredDataReadiness: knowledgeGraph,
        citationReadiness,
        topicalCoverage: topicalAuthority,
      },
      entities: safeArray(geo.entities),
      recommendations: null,
    };
  }

  return {
    available: true,
    inferenceStatus: 'MEASURED',
    overallScore: safeScore(geo.aiVisibilityScore),
    platforms: {
      chatGpt: safeScore(geo.chatGptScore),
      gemini: safeScore(geo.geminiScore),
      claude: safeScore(geo.claudeScore),
      perplexity: safeScore(geo.perplexityScore),
      googleAiOverview: safeScore(geo.googleAiOverviewScore),
    },
    dimensions: {
      entityClarity: safeScore(geo.entityCoverageScore),
      answerability: safeScore(geo.answerabilityScore),
      structuredDataReadiness: safeScore(geo.knowledgeGraphReadinessScore),
      citationReadiness: safeScore(geo.citationReadinessScore),
      topicalCoverage: safeScore(geo.topicalAuthorityScore),
    },
    entities: safeArray(geo.entities),
    recommendations: geo.recommendations || null,
  };
}

function buildValidActionPlan(seoIntelligence, technicalAudit, keywords, contentGaps, warnings) {
  const actions = [];

  const rawPlan = seoIntelligence?.actionPlan || seoIntelligence?.executiveDashboard?.executiveActionPlan || {};

  const phases = ['immediate', 'day7', 'day30', 'day60', 'day90'];
  const genericPhrases = [
    'review technical seo audit', 'review ai search visibility baseline',
    'improve ai search visibility', 'review technical',
    'set up google', 'launch campaign', 'generic',
  ];

  function isGenericAction(title) {
    const lower = (title || '').toLowerCase().trim();
    if (lower.length < 10) return true;
    return genericPhrases.some(g => lower.includes(g));
  }

  for (const phase of phases) {
    const items = safeArray(rawPlan[phase]);
    for (const item of items) {
      const title = item.title || item.action || item.task || item.recommendation || '';
      if (!title || isGenericAction(title)) continue;

      actions.push({
        title,
        findingId: item.findingId || '',
        category: item.category || phase,
        priority: item.priority || 'medium',
        effort: item.effort || item.difficulty || null,
        reason: item.reason || item.impact || item.description || '',
        evidence: item.evidence || null,
        owner: item.owner || null,
        dependencies: safeArray(item.dependencies),
        expectedQualitativeOutcome: item.expectedOutcome || item.expectedQualitativeOutcome || null,
        inferenceStatus: 'INFERRED',
      });
    }
  }

  if (actions.length === 0 && technicalAudit?.available) {
    for (const issue of technicalAudit.issues || []) {
      const title = typeof issue === 'string' ? issue : (issue.title || issue.issue || issue.recommendation || '');
      if (title && !isGenericAction(title)) {
        actions.push({
          title,
          findingId: typeof issue === 'object' ? issue.id || '' : '',
          category: 'technical',
          priority: typeof issue === 'object' ? (issue.severity || issue.priority || 'medium') : 'medium',
          reason: typeof issue === 'object' ? (issue.description || issue.impact || '') : '',
          inferenceStatus: 'EVIDENCE_BASED',
        });
      }
    }
  }

  if (actions.length === 0) {
    warnings.push('No valid evidence-backed action plan items available');
  }

  return actions.slice(0, 15);
}

function normalizeScoreBreakdown(seoScoreBreakdown, technicalAudit, warnings) {
  if (!seoScoreBreakdown) {
    if (technicalAudit?.available) {
      return {
        technical: null,
        onPage: null,
        content: null,
        authority: null,
        aiVisibility: null,
        overall: null,
      };
    }
    return null;
  }

  return {
    technical: safeScore(seoScoreBreakdown.technicalScore ?? seoScoreBreakdown.technical),
    onPage: safeScore(seoScoreBreakdown.onPageScore ?? seoScoreBreakdown.onPage),
    content: safeScore(seoScoreBreakdown.contentScore ?? seoScoreBreakdown.content),
    authority: safeScore(seoScoreBreakdown.authorityScore ?? seoScoreBreakdown.authority),
    aiVisibility: safeScore(seoScoreBreakdown.aiVisibilityScore ?? seoScoreBreakdown.aiVisibility),
    overall: safeScore(seoScoreBreakdown.overallScore ?? seoScoreBreakdown.overall),
  };
}

function buildExecutiveSummary(scoreBreakdown, technicalAudit, keywords, competitors) {
  const overallSeo = scoreBreakdown?.overall || scoreBreakdown?.technical || null;

  return {
    overallScore: overallSeo,
    keywordCount: keywords.length,
    competitorCount: competitors.length,
    technicalAuditAvailable: technicalAudit?.available || false,
    summary: '',
  };
}
