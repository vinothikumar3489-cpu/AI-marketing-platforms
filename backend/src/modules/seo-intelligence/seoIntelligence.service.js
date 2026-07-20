import { prisma } from '../../config/prisma.js';
import { collectResearchData } from '../../services/intelligence/research-orchestrator.service.js';
import { scrapeWebsite } from '../../services/scraping/unified-scraper.service.js';
import { deriveWebsiteIdentity } from '../../utils/seo-identity.util.js';
import {
  resolveKeywordMetrics, resolveSerpData, resolveCompetitors,
  resolveAutocomplete, resolveTrends, getSEOProviderStatus,
  selectSeoSearchProvider
} from '../../services/seo/seo-provider-router.service.js';
import { getDesktopAndMobilePageSpeed } from '../../services/pagespeed.service.js';
import { generateMergedTechnicalSEO, getChromeUXReport } from '../../services/seo/technical-seo-merged.service.js';
import { extractCandidatePhrases, validateKeyword, deduplicateKeywords, scoreKeywordRelevance, classifyKeyword, buildKeywordSources } from '../../services/seo/keyword-pipeline.service.js';
import { discoverCompetitorsViaSerpAPI } from '../../services/seo/competitor-pipeline.service.js';
import { buildSEOReport } from '../../services/seo/seo-report-builder.service.js';
import { getSearchConsoleStatus } from '../../services/googleSearchConsole.service.js';

const toNullableScore = (v) => {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};

export async function generateCompleteSeoIntelligence({ chatId, userId, websiteUrl, chat }) {
  const runId = `seo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const warnings = [];
  const modules = {};

  console.log('[SEO RUN START]', { runId, chatId, userId, websiteUrl });

  let providers;
  try {
    providers = await getSEOProviderStatus();
  } catch (e) {
    console.warn('[SEO PROVIDER FALLBACK] getSEOProviderStatus failed:', e.message);
    providers = null;
  }

  const providerSelection = providers?.selection || selectSeoSearchProvider(
    providers?.serpapi || { status: 'FAILED' },
    { status: 'DISABLED' },
    null
  );
  console.log('[SEO CONFIG CHECK]', {
    serpapiConfigured: providers?.serpapi?.configured,
    serpapiStatus: providers?.serpapi?.status,
    dataforseoEnabled: providers?.dataforseo?.enabled,
    dataforseoStatus: providers?.dataforseo?.status,
    selectedProvider: providerSelection?.selectedProvider
  });

  // == MODULE 1: Website crawl & identity ==
  modules.crawl = { status: 'PENDING' };
  try {
    const researchData = await collectResearchData({ websiteUrl, productName: chat?.productName || '', companyName: chat?.title || '' }).catch(() => null);
    let websiteData = researchData?.websiteContent || null;

    if (!websiteData) {
      const scrapeResult = await scrapeWebsite(websiteUrl, { timeout: 30000, extractSchema: true, extractImages: false, extractLinks: true, extractMeta: true }).catch(() => ({ success: false, error: 'scrape threw' }));
      if (scrapeResult?.success) websiteData = scrapeResult.data;
    }

    let identity = null;
    try {
      identity = deriveWebsiteIdentity({ websiteUrl, scrapedData: websiteData, chat });
    } catch (e) {
      identity = { websiteUrl, productName: chat?.productName || '', companyName: chat?.title || '' };
    }

    modules.crawl = { status: websiteData ? 'SUCCESS' : 'PARTIAL', websiteData, identity, researchData };
  } catch (e) {
    warnings.push({ code: 'CRAWL_FAILED', message: `Website extraction failed: ${e.message}` });
    modules.crawl = { status: 'FAILED', identity: { websiteUrl, productName: chat?.productName || '', companyName: chat?.title || '' } };
  }

  const identity = modules.crawl.identity;

  // == MODULE 2: Technical SEO (Firecrawl/Jina merge) ==
  modules.technicalSeo = { status: 'PENDING' };
  try {
    const techResult = await generateMergedTechnicalSEO(websiteUrl);
    modules.technicalSeo = { status: techResult ? 'SUCCESS' : 'UNAVAILABLE', data: techResult };
  } catch (e) {
    warnings.push({ code: 'TECHNICAL_SEO_FAILED', message: `Technical SEO audit failed: ${e.message}` });
    modules.technicalSeo = { status: 'FAILED' };
  }

  // == MODULE 3: PageSpeed mobile + desktop ==
  modules.pageSpeed = { status: 'PENDING' };
  try {
    const psResult = await getDesktopAndMobilePageSpeed(websiteUrl);
    const mobileOk = psResult?.success && psResult?.data?.mobile;
    const desktopOk = psResult?.success && psResult?.data?.desktop;
    modules.pageSpeed = {
      status: mobileOk || desktopOk ? 'SUCCESS' : 'UNAVAILABLE',
      mobile: mobileOk ? psResult.data.mobile : null,
      desktop: desktopOk ? psResult.data.desktop : null
    };
    console.log('[SEO MODULE RESULT]', { module: 'PageSpeed', status: modules.pageSpeed.status, mobile: !!mobileOk, desktop: !!desktopOk });
  } catch (e) {
    warnings.push({ code: 'PAGESPEED_FAILED', message: `PageSpeed audit failed: ${e.message}` });
    modules.pageSpeed = { status: 'FAILED' };
  }

  // == MODULE 4: CrUX ==
  modules.crux = { status: 'PENDING' };
  try {
    const cruxResult = await getChromeUXReport(websiteUrl);
    if (cruxResult?.success && cruxResult?.data) {
      modules.crux = { status: 'SUCCESS', data: cruxResult.data };
      console.log('[SEO MODULE RESULT]', { module: 'CrUX', status: 'SUCCESS', scope: cruxResult.data.scope || 'origin' });
    } else {
      modules.crux = { status: 'NO_DATA', reason: cruxResult?.error || 'No CrUX data' };
      console.log('[SEO MODULE RESULT]', { module: 'CrUX', status: 'NO_DATA', reason: cruxResult?.error });
    }
  } catch (e) {
    modules.crux = { status: 'FAILED', reason: e.message };
    console.log('[SEO MODULE RESULT]', { module: 'CrUX', status: 'FAILED', reason: e.message });
  }

  // == MODULE 5: Search Console ==
  modules.searchConsole = { status: 'NOT_APPLICABLE' };
  try {
    const scStatus = getSearchConsoleStatus();
    if (scStatus.configured && scStatus.authenticated && scStatus.enabled) {
      const domain = identity?.domain || new URL(websiteUrl).hostname;
      const { getSiteMetrics, getListSites } = await import('../../services/googleSearchConsole.service.js');
      const sites = await getListSites().catch(() => []);
      const matchedSite = (sites || []).find(s => domain.includes(s.siteUrl?.replace('sc_domain:', '')?.replace('https://', '')?.replace('www.', '')?.split('/')[0] || ''));
      if (matchedSite) {
        const metrics = await getSiteMetrics(matchedSite.siteUrl).catch(() => null);
        if (metrics) {
          modules.searchConsole = { status: 'SUCCESS', data: metrics };
          console.log('[SEO MODULE RESULT]', { module: 'SearchConsole', status: 'SUCCESS' });
        } else {
          modules.searchConsole = { status: 'PARTIAL', reason: 'Site matched but metrics unavailable' };
        }
      } else {
        modules.searchConsole = { status: 'NOT_APPLICABLE', reason: 'No connected Search Console property matches this website' };
        console.log('[SEO MODULE RESULT]', { module: 'SearchConsole', status: 'NOT_APPLICABLE', reason: 'domain mismatch' });
      }
    } else {
      modules.searchConsole = { status: 'NOT_APPLICABLE', reason: scStatus.authenticated ? 'Search Console not enabled' : 'Search Console not authenticated' };
    }
  } catch (e) {
    modules.searchConsole = { status: 'FAILED', reason: e.message };
  }

  // == MODULE 6: On-page keywords (from crawl evidence only) ==
  modules.onPageKeywords = { status: 'PENDING' };
  let validatedKeywords = [];
  let topicCandidates = [];
  try {
    const websiteData = modules.crawl.websiteData;
    if (websiteData) {
      const keywordSources = buildKeywordSources(websiteData);
      let rawCandidates = extractCandidatePhrases(keywordSources);
      rawCandidates = deduplicateKeywords(rawCandidates);

      validatedKeywords = rawCandidates
        .filter(c => validateKeyword(c.phrase, identity?.productName, identity?.companyName))
        .map(c => ({
          keyword: c.phrase, priority: c.priority, frequency: c.frequency,
          sources: Array.from(c.sources),
          relevanceScore: scoreKeywordRelevance(c.phrase, identity?.productName, identity?.companyName, identity?.industry),
          intent: classifyKeyword(c.phrase)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

      const researchKW = (modules.crawl.researchData?.keywords || []).map(k => ({
        keyword: k.keyword, priority: 50, frequency: k.confidence || 1,
        sources: ['research_orchestrator'],
        relevanceScore: scoreKeywordRelevance(k.keyword, identity?.productName, identity?.companyName, identity?.industry),
        intent: classifyKeyword(k.keyword)
      }));
      const validatedSet = new Set(validatedKeywords.map(k => k.keyword.toLowerCase()));
      for (const rk of researchKW) {
        if (!validatedSet.has(rk.keyword.toLowerCase())) {
          validatedKeywords.push(rk);
          validatedSet.add(rk.keyword.toLowerCase());
        }
      }
      validatedKeywords.sort((a, b) => b.relevanceScore - a.relevanceScore);

      topicCandidates = validatedKeywords.map(k => ({
        phrase: k.keyword, source: 'WEBSITE_CONTENT',
        validation: 'ON_PAGE_ONLY',
        searchDemand: { value: null, status: 'UNAVAILABLE' }
      }));

      console.log('[SEO MODULE RESULT]', { module: 'OnPageKeywords', status: 'SUCCESS', candidateCount: topicCandidates.length, researchKeywordsMerged: researchKW.length });
    } else {
      const researchKW = (modules.crawl.researchData?.keywords || []).map(k => ({
        keyword: k.keyword, priority: 50, frequency: k.confidence || 1,
        sources: ['research_orchestrator'],
        relevanceScore: scoreKeywordRelevance(k.keyword, identity?.productName, identity?.companyName, identity?.industry),
        intent: classifyKeyword(k.keyword)
      }));
      validatedKeywords = researchKW.sort((a, b) => b.relevanceScore - a.relevanceScore);
      topicCandidates = validatedKeywords.map(k => ({
        phrase: k.keyword, source: 'WEBSITE_CONTENT',
        validation: 'ON_PAGE_ONLY',
        searchDemand: { value: null, status: 'UNAVAILABLE' }
      }));
      console.log('[SEO MODULE RESULT]', { module: 'OnPageKeywords', status: 'PARTIAL', reason: 'No crawl data, using research keywords', count: researchKW.length });
    }
    modules.onPageKeywords = { status: websiteData ? 'SUCCESS' : 'PARTIAL', count: topicCandidates.length };
  } catch (e) {
    warnings.push({ code: 'KEYWORD_EXTRACTION_FAILED', message: `On-page keyword extraction failed: ${e.message}` });
    modules.onPageKeywords = { status: 'FAILED' };
  }

  // == MODULE 7: Search provider enrichment (SerpAPI/DataForSEO) ==
  modules.searchEnrichment = { status: 'PENDING' };
  let keywordIntelligence = null;
  let competitorIntelligence = null;
  let serpFeatures = null;
  let peopleAlsoAsk = null;
  let trendAnalysis = null;
  try {
    if (providerSelection.selectedProvider === 'SERPAPI' || providerSelection.selectedProvider === 'DATAFORSEO') {
      const keywordMetrics = await resolveKeywordMetrics(validatedKeywords.slice(0, 20).map(k => k.keyword));
      keywordIntelligence = buildKeywordIntelligence(validatedKeywords, keywordMetrics, identity);

      const [competitorResult, serpResult, autoResult, trendResult] = await Promise.allSettled([
        discoverCompetitorsViaSerpAPI(identity?.productName || '', identity?.industry || '', websiteUrl),
        resolveSerpData(identity?.productName || identity?.companyName || '', { num: 10 }),
        resolveAutocomplete(identity?.productName || ''),
        resolveTrends(identity?.productName || '')
      ]);

      if (competitorResult.status === 'fulfilled' && competitorResult.value?.length > 0) {
        competitorIntelligence = buildCompetitorIntelligence(competitorResult.value, keywordIntelligence);
      } else if (modules.crawl.researchData?.competitors?.length > 0) {
        const rComp = modules.crawl.researchData.competitors.map(c => ({
          name: c.name || c.domain, domain: c.domain, url: c.url || `https://${c.domain}`,
          snippet: c.snippet || '', title: c.name || c.domain,
          competitorType: 'serp', relevanceScore: 50, keyword: c.name || c.domain
        }));
        competitorIntelligence = buildCompetitorIntelligence(rComp, keywordIntelligence);
        console.log('[SEO MODULE RESULT]', { module: 'Competitors', status: 'FALLBACK', source: 'research_orchestrator', count: rComp.length });
      }
      if (serpResult.status === 'fulfilled' && serpResult.value?.success) {
        serpFeatures = serpResult.value.data?.features || {};
        peopleAlsoAsk = serpFeatures?.peopleAlsoAsk || [];
      }
      if (autoResult.status === 'fulfilled' && autoResult.value?.success) {
        if (keywordIntelligence) keywordIntelligence.autocompleteSuggestions = autoResult.value.data?.suggestions || [];
      }
      if (trendResult.status === 'fulfilled' && trendResult.value?.success) {
        trendAnalysis = trendResult.value.data;
      }

      modules.searchEnrichment = { status: 'SUCCESS' };
      console.log('[SEO MODULE RESULT]', { module: 'SearchEnrichment', status: 'SUCCESS', provider: providerSelection.selectedProvider });
    } else {
      keywordIntelligence = buildKeywordIntelligence(validatedKeywords, { data: [] }, identity);
      modules.searchEnrichment = { status: 'UNAVAILABLE', reason: providerSelection.reason };
      console.log('[SEO MODULE RESULT]', { module: 'SearchEnrichment', status: 'UNAVAILABLE', reason: providerSelection.reason });
    }
  } catch (e) {
    warnings.push({ code: 'SEARCH_ENRICHMENT_FAILED', message: `Search enrichment failed: ${e.message}` });
    keywordIntelligence = buildKeywordIntelligence(validatedKeywords, { data: [] }, identity);
    modules.searchEnrichment = { status: 'FAILED' };
  }

  // == Score calculation with weighted renormalization ==
  const measuredModules = [];
  const unavailableModules = [];

  const pageSpeedMobileScore = modules.pageSpeed?.mobile?.lighthouseScores?.performance ?? null;
  const pageSpeedDesktopScore = modules.pageSpeed?.desktop?.lighthouseScores?.performance ?? null;
  const techScore = modules.technicalSeo?.data?.scores?.overall ?? null;
  const pageSpeedMobileAccessibility = modules.pageSpeed?.mobile?.lighthouseScores?.accessibility ?? null;
  const pageSpeedDesktopAccessibility = modules.pageSpeed?.desktop?.lighthouseScores?.accessibility ?? null;
  const pageSpeedMobileSeo = modules.pageSpeed?.mobile?.lighthouseScores?.seo ?? null;
  const pageSpeedDesktopSeo = modules.pageSpeed?.desktop?.lighthouseScores?.seo ?? null;

  if (pageSpeedMobileScore !== null) measuredModules.push('PAGESPEED_MOBILE');
  else unavailableModules.push('PAGESPEED_MOBILE');
  if (pageSpeedDesktopScore !== null) measuredModules.push('PAGESPEED_DESKTOP');
  else unavailableModules.push('PAGESPEED_DESKTOP');
  if (techScore !== null) measuredModules.push('TECHNICAL_AUDIT');
  else unavailableModules.push('TECHNICAL_AUDIT');
  if (modules.crawl.status === 'SUCCESS') measuredModules.push('CRAWL');
  else unavailableModules.push('CRAWL');
  if (modules.searchEnrichment.status === 'SUCCESS') measuredModules.push('SERP');
  else unavailableModules.push('SERP');
  if (modules.searchConsole.status === 'SUCCESS') measuredModules.push('SEARCH_CONSOLE');
  else unavailableModules.push('SEARCH_CONSOLE');

  const coverage = measuredModules.length / (measuredModules.length + unavailableModules.length);

  let overallScore = null;
  let confidence = 'LOW';
  if (measuredModules.length > 0) {
    const weights = { PAGESPEED_MOBILE: 20, PAGESPEED_DESKTOP: 15, TECHNICAL_AUDIT: 25, CRAWL: 15, SERP: 15, SEARCH_CONSOLE: 10 };
    const availableWeights = measuredModules.reduce((sum, m) => sum + (weights[m] || 10), 0);
    const renormalized = measuredModules.reduce((sum, m) => {
      const w = weights[m] || 10;
      switch (m) {
        case 'PAGESPEED_MOBILE': return sum + (pageSpeedMobileScore * w);
        case 'PAGESPEED_DESKTOP': return sum + (pageSpeedDesktopScore * w);
        case 'TECHNICAL_AUDIT': return sum + (techScore * w);
        case 'CRAWL': return sum + (65 * w);
        case 'SERP': return sum + (50 * w);
        case 'SEARCH_CONSOLE': return sum + (50 * w);
        default: return sum + (50 * w);
      }
    }, 0);
    overallScore = Math.round(renormalized / availableWeights);
    if (coverage >= 0.8) confidence = 'HIGH';
    else if (coverage >= 0.5) confidence = 'MEDIUM';
    else confidence = 'LOW';
  }

  console.log('[SEO PARTIAL MODE]', {
    overallScore, confidence, coverage,
    measuredModules, unavailableModules,
    warningsCount: warnings.length
  });

  // == Build report ==
  let seoReport = null;
  try {
    seoReport = buildSEOReport({
      identity, technicalAudit: modules.technicalSeo?.data,
      keywordIntelligence, competitorIntelligence,
      geoIntelligence: buildGeoIntelligence(modules.technicalSeo?.data, modules.crux?.data),
      contentGapIntelligence: buildContentGapIntelligence(keywordIntelligence, competitorIntelligence, modules.crawl?.websiteData),
      blogIntelligence: buildBlogIntelligence(keywordIntelligence, competitorIntelligence, trendAnalysis),
      serpFeatures, peopleAlsoAsk, trendAnalysis,
      providers, pageSpeed: { mobile: modules.pageSpeed?.mobile, desktop: modules.pageSpeed?.desktop },
      crux: modules.crux?.data, searchConsoleData: modules.searchConsole?.data
    });
    if (overallScore !== null) {
      seoReport.overallScore = overallScore;
      seoReport.scoreConfidence = confidence;
      seoReport.scoreCoverage = coverage;
      seoReport.measuredModules = measuredModules;
      seoReport.unavailableModules = unavailableModules;
    }
  } catch (e) {
    warnings.push({ code: 'REPORT_BUILD_FAILED', message: `SEO report build failed: ${e.message}` });
  }

  // == Persist (always, even partial) ==
  let persistedSeoRecordId = null;
  let persistStatus = 'attempted';
  try {
    persistedSeoRecordId = await saveSEOData({
      chatId, userId, identity, websiteUrl,
      technicalAudit: modules.technicalSeo?.data,
      chromeUXData: modules.crux?.data,
      pageSpeedMobile: modules.pageSpeed?.mobile,
      pageSpeedDesktop: modules.pageSpeed?.desktop,
      keywordIntelligence, competitorIntelligence,
      geoIntelligence: buildGeoIntelligence(modules.technicalSeo?.data, modules.crux?.data),
      contentGapIntelligence: buildContentGapIntelligence(keywordIntelligence, competitorIntelligence, modules.crawl?.websiteData),
      blogIntelligence: buildBlogIntelligence(keywordIntelligence, competitorIntelligence, trendAnalysis),
      topicCandidates, seoReport, researchData: modules.crawl?.researchData, runId,
      overallScore, confidence, coverage,
      measuredModules, unavailableModules, providers,
      providerSelection, warnings
    });
    persistStatus = 'persisted';
    console.log('[SEO PERSIST SUCCESS]', { seoIntelligenceId: persistedSeoRecordId, status: 'changed' });
  } catch (e) {
    persistStatus = 'failed';
    warnings.push({ code: 'PERSIST_FAILED', message: `Failed to persist SEO data: ${e.message}` });
    console.error('[SEO PERSIST START] failed:', e.message);
  }

  console.log('[SEO RUN COMPLETE]', {
    runId, status: 'completed', persisted: persistStatus === 'persisted',
    seoIntelligenceId: persistedSeoRecordId,
    provider: providerSelection?.selectedProvider,
    technicalAuditAvailable: modules.technicalSeo?.status === 'SUCCESS',
    pageSpeedAvailable: modules.pageSpeed?.status === 'SUCCESS',
    cruxStatus: modules.crux?.status,
    searchConsoleStatus: modules.searchConsole?.status,
    topicCandidateCount: topicCandidates.length,
    keywordOpportunityCount: keywordIntelligence?.metadata?.totalKeywords || 0,
    competitorCount: competitorIntelligence?.competitors?.length || 0,
    warningCount: warnings.length
  });

  return {
    success: true,
    status: providerSelection?.selectedProvider === 'PARTIAL' ? 'PARTIAL' : 'completed',
    data: {
      id: persistedSeoRecordId,
      status: providerSelection?.selectedProvider === 'PARTIAL' ? 'PARTIAL' : 'completed',
      warnings, identity,
      technicalAudit: modules.technicalSeo?.data,
      pageSpeed: { mobile: modules.pageSpeed?.mobile, desktop: modules.pageSpeed?.desktop },
      crux: modules.crux?.data,
      searchConsole: modules.searchConsole?.data,
      keywordIntelligence,
      competitorIntelligence,
      geoIntelligence: buildGeoIntelligence(modules.technicalSeo?.data, modules.crux?.data),
      contentGapAnalysis: buildContentGapIntelligence(keywordIntelligence, competitorIntelligence, modules.crawl?.websiteData),
      blogIntelligence: buildBlogIntelligence(keywordIntelligence, competitorIntelligence, trendAnalysis),
      seoReport, providers, providerSelection,
      topicCandidates,
      overallScore, scoreConfidence: confidence,
      scoreCoverage: coverage,
      measuredModules, unavailableModules
    },
    warnings
  };
}

function buildKeywordIntelligence(validatedKeywords, keywordMetrics, identity) {
  const kwMetrics = keywordMetrics?.data || [];
  const metricsMap = new Map(kwMetrics.map(m => [m.keyword?.toLowerCase(), m]));

  const enrich = (kw) => {
    const metric = metricsMap.get(kw.keyword.toLowerCase());
    return {
      ...kw,
      searchVolume: null,
      displayVolume: 'Estimated',
      opportunityScore: metric?.opportunityScore ?? kw.relevanceScore,
      confidence: metric?.confidence ?? null,
      status: metric ? 'measured' : 'estimated',
      source: metric?.provider || 'SerpAPI'
    };
  };

  const primary = validatedKeywords.filter(k => k.relevanceScore >= 65 && k.intent !== 'long_tail').slice(0, 10).map(enrich);
  const secondary = validatedKeywords.filter(k => k.relevanceScore >= 45 && k.relevanceScore < 65).slice(0, 20).map(enrich);
  const longTail = validatedKeywords.filter(k => k.intent === 'long_tail' || k.relevanceScore < 45).slice(0, 30).map(enrich);
  const questions = validatedKeywords.filter(k => k.intent === 'question').slice(0, 15).map(enrich);

  return {
    primaryKeywords: primary,
    secondaryKeywords: secondary,
    longTailKeywords: longTail,
    questionKeywords: questions,
    competitorKeywords: [],
    contentOpportunities: [],
    geoKeywords: [],
    autocompleteSuggestions: [],
    metadata: {
      totalKeywords: primary.length + secondary.length + longTail.length + questions.length,
      primaryCount: primary.length,
      secondaryCount: secondary.length,
      longTailCount: longTail.length,
      questionCount: questions.length,
      clustersCount: 0,
      opportunitiesCount: primary.filter(k => k.opportunityScore >= 70).length,
      analyzedAt: new Date().toISOString(),
      serpapiConfigured: !!process.env.SERPAPI_API_KEY,
      dataforseoConfigured: !!process.env.DATAFORSEO_LOGIN
    }
  };
}

function buildCompetitorIntelligence(competitors) {
  return {
    competitors: competitors || [],
    competitorProfiles: (competitors || []).map(c => ({
      name: c.name, domain: c.domain, website: c.url,
      competitorType: c.competitorType || 'serp',
      title: c.title, metaDescription: c.snippet,
      mainKeywords: c.keyword ? [c.keyword] : [],
      relevanceScore: c.relevanceScore || 50
    })),
    keywordGaps: {}, contentGaps: [],
    authorityGaps: {}, geoGaps: {},
    competitorMatrix: [], recommendations: {},
    metadata: {
      totalCompetitors: competitors?.length || 0,
      directCompetitors: competitors?.filter(c => c.competitorType === 'direct' || c.relevanceScore >= 70).length || 0,
      analyzedAt: new Date().toISOString()
    }
  };
}

function buildGeoIntelligence(technicalAudit, chromeUXData) {
  return {
    aiVisibilityScore: null, chatGptScore: null, geminiScore: null,
    claudeScore: null, perplexityScore: null, googleAiOverviewScore: null,
    entityCoverageScore: null, knowledgeGraphReadinessScore: null,
    citationReadinessScore: null, answerabilityScore: null,
    topicalAuthorityScore: null, entities: [], knowledgeGraphEntities: [],
    citationOpportunities: [], faqOpportunities: [], aiContentOpportunities: [],
    trustSignals: {
      score: technicalAudit?.scores?.overall ? Math.round(technicalAudit.scores.overall * 0.7) : null,
      signals: {
        hasHTTPS: technicalAudit?.meta?.title ? true : false,
        hasStructuredData: (technicalAudit?.structuredData?.count || 0) > 0,
        hasOpenGraph: technicalAudit?.openGraph?.status === 'measured'
      }
    },
    metadata: {
      totalEntities: 0, totalOpportunities: 0, rawScore: null,
      confidenceLevel: 'unavailable',
      reason: 'GEO scoring requires AI platform analysis which is not yet integrated'
    }
  };
}

function buildContentGapIntelligence(keywordIntelligence, competitorIntelligence, websiteData) {
  const gaps = [];
  const text = (websiteData?.text || websiteData?.content?.text || '').toLowerCase();
  if (!text.includes('faq') && !text.includes('frequently asked')) gaps.push({ gapType: 'faq', title: 'FAQ Section', opportunityScore: 85, priority: 'high', reason: 'No FAQ content found' });
  if (!text.includes('case study') && !text.includes('customer story') && !text.includes('success story')) gaps.push({ gapType: 'use_case', title: 'Case Studies / Customer Stories', opportunityScore: 80, priority: 'high', reason: 'No case study content found' });
  if (!text.includes('vs ') && !text.includes('versus') && !text.includes('comparison') && !text.includes('alternative')) gaps.push({ gapType: 'comparison', title: 'Comparison Pages', opportunityScore: 75, priority: 'high', reason: 'No comparison content found' });
  if (!text.includes('pricing') && !text.includes('price') && !text.includes('plan')) gaps.push({ gapType: 'pricing', title: 'Pricing Page', opportunityScore: 90, priority: 'critical', reason: 'No pricing information found' });
  if (competitorIntelligence?.competitors?.length > 0) {
    competitorIntelligence.competitors.slice(0, 3).forEach(c => {
      gaps.push({ gapType: 'comparison', title: `${keywordIntelligence?.metadata?.productName || 'Product'} vs ${c.name}`, opportunityScore: 70, priority: 'medium', reason: `Competitor ${c.name} ranks for comparison keywords` });
    });
  }
  return {
    contentGaps: gaps.sort((a, b) => b.opportunityScore - a.opportunityScore),
    landingPageIdeas: [], comparisonPageIdeas: [], faqOpportunities: [],
    geoContentIdeas: [], resourcePageIdeas: [], contentCalendar: {},
    summary: { totalGaps: gaps.length, totalOpportunities: gaps.filter(g => g.opportunityScore >= 70).length, criticalPriority: gaps.filter(g => g.priority === 'critical').length, highPriority: gaps.filter(g => g.priority === 'high').length }
  };
}

function buildBlogIntelligence(keywordIntelligence, competitorIntelligence, trendAnalysis) {
  const ideas = [];
  const kw = keywordIntelligence || {};
  const allKW = [...(kw.primaryKeywords || []), ...(kw.secondaryKeywords || []), ...(kw.questionKeywords || [])];
  allKW.slice(0, 15).forEach(k => {
    const keyword = k.keyword || k;
    ideas.push({
      title: `How to ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}: Complete Guide`,
      targetKeyword: keyword, searchIntent: k.intent || 'informational',
      difficulty: k.relevanceScore >= 70 ? 'medium' : 'easy',
      opportunity: k.opportunityScore >= 70 ? 'high' : 'medium',
      estimatedImpact: k.opportunityScore >= 70 ? 'high' : 'medium',
      priority: k.opportunityScore >= 70 ? 'high' : 'medium'
    });
  });
  return { blogIdeas: ideas, blogClusters: [], blogBriefs: [], publishingCalendar: {}, summary: { totalIdeas: ideas.length, totalClusters: 0, highPriorityIdeas: ideas.filter(i => i.priority === 'high').length } };
}

async function saveSEOData({ chatId, userId, identity, websiteUrl, technicalAudit, chromeUXData, pageSpeedMobile, pageSpeedDesktop, keywordIntelligence, competitorIntelligence, geoIntelligence, contentGapIntelligence, blogIntelligence, topicCandidates, seoReport, researchData, runId, overallScore, confidence, coverage, measuredModules, unavailableModules, providers, providerSelection, warnings }) {
  const seoStatus = providerSelection?.selectedProvider === 'PARTIAL' ? 'PARTIAL' : 'completed';

  const seoIntelligencePayload = {
    chatId, userId,
    websiteUrl: identity?.websiteUrl || websiteUrl,
    domain: identity?.domain || '',
    companyName: identity?.companyName || '',
    productName: identity?.productName || '',
    seoScore: overallScore ?? null,
    analyzedAt: new Date(),
    fallbackUsed: providerSelection?.selectedProvider === 'PARTIAL' || !providerSelection?.selectedProvider,
    status: seoStatus,
    technicalAudit: {
      audit: technicalAudit,
      chromeUX: chromeUXData,
      pageSpeed: { mobile: pageSpeedMobile, desktop: pageSpeedDesktop }
    },
    keywordOpportunities: keywordIntelligence,
    competitorKeywords: competitorIntelligence,
    contentGaps: contentGapIntelligence,
    aiVisibility: geoIntelligence,
    blogIdeas: blogIntelligence,
    actionPlan: { recommendations: seoReport?.recommendations || [] },
    landingPageSuggestions: seoReport?.landingPageSuggestions || [],
    providers: providers || {},
    warnings: warnings || [],
    inputJson: { runId, chatId, userId, websiteUrl, measuredModules, unavailableModules, topicCandidates }
  };

  console.log('[SEO PERSIST SEINTELLIGENCE]', {
    chatId, userId, seoScore: overallScore, status: seoStatus,
    hasTechnicalAudit: !!technicalAudit,
    keywordCount: keywordIntelligence?.metadata?.totalKeywords || 0,
    competitorCount: competitorIntelligence?.competitors?.length || 0,
    contentGapCount: contentGapIntelligence?.contentGaps?.length || 0,
    warningsCount: warnings.length,
    fallbackUsed: seoIntelligencePayload.fallbackUsed,
    provider: providerSelection?.selectedProvider
  });

  const seoRecord = await prisma.seoIntelligence.upsert({
    where: { chatId },
    create: seoIntelligencePayload,
    update: { ...seoIntelligencePayload, updatedAt: new Date() }
  });

  const savedId = seoRecord.id;

  await prisma.$transaction(async (tx) => {
    const websiteData = null;

    const techMobileScore = pageSpeedMobile?.lighthouseScores?.performance ?? null;
    const techDesktopScore = pageSpeedDesktop?.lighthouseScores?.performance ?? null;

    console.log('[SEO PERSIST TECH AUDIT]', {
      hasTechnicalAudit: !!technicalAudit,
      scores: technicalAudit?.scores,
      metaTitle: technicalAudit?.meta?.title,
      hasStructuredData: technicalAudit?.structuredData?.count,
      pageSpeedMobileScore: techMobileScore,
      pageSpeedDesktopScore: techDesktopScore,
      issues: {
        critical: technicalAudit?.issues?.critical?.length || 0,
        high: technicalAudit?.issues?.high?.length || 0,
        medium: technicalAudit?.issues?.medium?.length || 0,
        low: technicalAudit?.issues?.low?.length || 0
      },
      recommendations: technicalAudit?.recommendations?.length || 0
    });

    await tx.technicalSeoAudit.upsert({
      where: { seoIntelligenceId: savedId },
      create: {
        seoIntelligenceId: savedId,
        auditData: {
          audit: technicalAudit,
          chromeUX: chromeUXData,
          pageSpeed: { mobile: pageSpeedMobile, desktop: pageSpeedDesktop }
        },
        overallScore: toNullableScore(technicalAudit?.scores?.overall),
        titleScore: toNullableScore(technicalAudit?.meta?.title ? 85 : 0),
        metaScore: toNullableScore(technicalAudit?.meta?.description ? 80 : 0),
        securityScore: technicalAudit?.meta?.title ? 100 : 0,
        mobileScore: toNullableScore(techMobileScore),
        headingScore: toNullableScore(technicalAudit?.headings?.count > 0 ? 85 : 30),
        schemaScore: toNullableScore((technicalAudit?.structuredData?.count || 0) > 0 ? 80 : 0),
        criticalIssues: technicalAudit?.issues?.critical || [],
        highIssues: technicalAudit?.issues?.high || [],
        mediumIssues: technicalAudit?.issues?.medium || [],
        lowIssues: technicalAudit?.issues?.low || [],
        recommendations: technicalAudit?.recommendations || []
      },
      update: {
        auditData: {
          audit: technicalAudit,
          chromeUX: chromeUXData,
          pageSpeed: { mobile: pageSpeedMobile, desktop: pageSpeedDesktop }
        },
        overallScore: toNullableScore(technicalAudit?.scores?.overall),
        titleScore: toNullableScore(technicalAudit?.meta?.title ? 85 : 0),
        metaScore: toNullableScore(technicalAudit?.meta?.description ? 80 : 0),
        securityScore: technicalAudit?.meta?.title ? 100 : 0,
        mobileScore: toNullableScore(techMobileScore),
        headingScore: toNullableScore(technicalAudit?.headings?.count > 0 ? 85 : 30),
        schemaScore: toNullableScore((technicalAudit?.structuredData?.count || 0) > 0 ? 80 : 0),
        criticalIssues: technicalAudit?.issues?.critical || [],
        highIssues: technicalAudit?.issues?.high || [],
        mediumIssues: technicalAudit?.issues?.medium || [],
        lowIssues: technicalAudit?.issues?.low || [],
        recommendations: technicalAudit?.recommendations || [],
        analyzedAt: new Date()
      }
    });

    const psMobile = pageSpeedMobile?.lighthouseScores;
    const psDesktop = pageSpeedDesktop?.lighthouseScores;

    const psMobilePerf = psMobile?.performance;
    const psDesktopPerf = psDesktop?.performance;
    const hasPerfData = psMobilePerf != null || psDesktopPerf != null;
    const perfAvg = hasPerfData
      ? Math.round(((psMobilePerf || 0) + (psDesktopPerf || 0)) / ((psMobilePerf != null ? 1 : 0) + (psDesktopPerf != null ? 1 : 0)))
      : null;

    const psMobileA11y = psMobile?.accessibility;
    const psDesktopA11y = psDesktop?.accessibility;
    const hasA11yData = psMobileA11y != null || psDesktopA11y != null;
    const a11yAvg = hasA11yData
      ? Math.round(((psMobileA11y || 0) + (psDesktopA11y || 0)) / ((psMobileA11y != null ? 1 : 0) + (psDesktopA11y != null ? 1 : 0)))
      : null;

    const psMobileBP = psMobile?.bestPractices;
    const psDesktopBP = psDesktop?.bestPractices;
    const hasBPData = psMobileBP != null || psDesktopBP != null;
    const bpAvg = hasBPData
      ? Math.round(((psMobileBP || 0) + (psDesktopBP || 0)) / ((psMobileBP != null ? 1 : 0) + (psDesktopBP != null ? 1 : 0)))
      : null;

    const psMobileSeo = psMobile?.seo;
    const psDesktopSeo = psDesktop?.seo;
    const hasSeoData = psMobileSeo != null || psDesktopSeo != null;
    const seoAvg = hasSeoData
      ? Math.round(((psMobileSeo || 0) + (psDesktopSeo || 0)) / ((psMobileSeo != null ? 1 : 0) + (psDesktopSeo != null ? 1 : 0)))
      : null;

    const techOverall = toNullableScore(technicalAudit?.scores?.overall);
    const reportTechScore = toNullableScore(seoReport?.technicalScore);
    const reportContentScore = toNullableScore(seoReport?.contentScore);

    await tx.seoScoreBreakdown.upsert({
      where: { seoIntelligenceId: savedId },
      create: {
        seoIntelligenceId: savedId,
        overallScore: toNullableScore(overallScore),
        technicalScore: techOverall ?? perfAvg ?? null,
        onPageScore: reportTechScore ?? null,
        contentScore: reportContentScore ?? null,
        authorityScore: null,
        aiVisibilityScore: null,
        localSeoScore: null,
        scoreHistory: {}
      },
      update: {
        overallScore: toNullableScore(overallScore),
        technicalScore: techOverall ?? perfAvg ?? null,
        onPageScore: reportTechScore ?? null,
        contentScore: reportContentScore ?? null,
        authorityScore: null,
        aiVisibilityScore: null,
        localSeoScore: null,
        scoreHistory: {},
        lastCalculated: new Date()
      }
    });

    console.log('[SEO PERSIST KEYWORDS]', {
      primaryCount: keywordIntelligence?.primaryKeywords?.length || 0,
      secondaryCount: keywordIntelligence?.secondaryKeywords?.length || 0,
      longTailCount: keywordIntelligence?.longTailKeywords?.length || 0,
      questionCount: keywordIntelligence?.questionKeywords?.length || 0,
      totalKeywords: keywordIntelligence?.metadata?.totalKeywords || 0,
      researchKeywordCount: (researchData?.keywords || []).length
    });

    await tx.keywordIntelligenceRecord.upsert({
      where: { seoIntelligenceId: savedId },
      create: {
        seoIntelligenceId: savedId,
        primaryKeywords: keywordIntelligence?.primaryKeywords || [],
        secondaryKeywords: keywordIntelligence?.secondaryKeywords || [],
        longTailKeywords: keywordIntelligence?.longTailKeywords || [],
        questionKeywords: keywordIntelligence?.questionKeywords || [],
        clusters: keywordIntelligence?.clusters || [],
        competitorKeywords: keywordIntelligence?.competitorKeywords || [],
        contentOpportunities: keywordIntelligence?.contentOpportunities || [],
        geoKeywords: keywordIntelligence?.geoKeywords || [],
        totalKeywords: keywordIntelligence?.metadata?.totalKeywords || 0,
        clustersCount: keywordIntelligence?.metadata?.clustersCount || 0,
        opportunitiesCount: keywordIntelligence?.metadata?.opportunitiesCount || 0
      },
      update: {
        primaryKeywords: keywordIntelligence?.primaryKeywords || [],
        secondaryKeywords: keywordIntelligence?.secondaryKeywords || [],
        longTailKeywords: keywordIntelligence?.longTailKeywords || [],
        questionKeywords: keywordIntelligence?.questionKeywords || [],
        clusters: keywordIntelligence?.clusters || [],
        competitorKeywords: keywordIntelligence?.competitorKeywords || [],
        contentOpportunities: keywordIntelligence?.contentOpportunities || [],
        geoKeywords: keywordIntelligence?.geoKeywords || [],
        totalKeywords: keywordIntelligence?.metadata?.totalKeywords || 0,
        clustersCount: keywordIntelligence?.metadata?.clustersCount || 0,
        opportunitiesCount: keywordIntelligence?.metadata?.opportunitiesCount || 0,
        updatedAt: new Date()
      }
    });

    console.log('[SEO PERSIST COMPETITORS]', {
      competitorCount: competitorIntelligence?.competitors?.length || 0,
      profileCount: competitorIntelligence?.competitorProfiles?.length || 0,
      researchCompetitorCount: (researchData?.competitors || []).length,
      keywordGaps: Object.keys(competitorIntelligence?.keywordGaps || {}).length,
      contentGaps: competitorIntelligence?.contentGaps?.length || 0
    });

    await tx.competitorSeoRecord.upsert({
      where: { seoIntelligenceId: savedId },
      create: {
        seoIntelligenceId: savedId,
        competitors: competitorIntelligence?.competitors || [],
        competitorProfiles: competitorIntelligence?.competitorProfiles || [],
        keywordGaps: competitorIntelligence?.keywordGaps || {},
        contentGaps: competitorIntelligence?.contentGaps || [],
        authorityGaps: competitorIntelligence?.authorityGaps || {},
        geoGaps: competitorIntelligence?.geoGaps || {},
        competitorMatrix: competitorIntelligence?.competitorMatrix || [],
        recommendations: competitorIntelligence?.recommendations || {},
        metadata: competitorIntelligence?.metadata || {}
      },
      update: {
        competitors: competitorIntelligence?.competitors || [],
        competitorProfiles: competitorIntelligence?.competitorProfiles || [],
        keywordGaps: competitorIntelligence?.keywordGaps || {},
        contentGaps: competitorIntelligence?.contentGaps || [],
        authorityGaps: competitorIntelligence?.authorityGaps || {},
        geoGaps: competitorIntelligence?.geoGaps || {},
        competitorMatrix: competitorIntelligence?.competitorMatrix || [],
        recommendations: competitorIntelligence?.recommendations || {},
        metadata: competitorIntelligence?.metadata || {},
        updatedAt: new Date()
      }
    });

    await tx.contentGapRecord.upsert({
      where: { seoIntelligenceId: savedId },
      create: {
        seoIntelligenceId: savedId,
        contentGaps: contentGapIntelligence?.contentGaps || [],
        landingPageIdeas: contentGapIntelligence?.landingPageIdeas || [],
        comparisonPageIdeas: contentGapIntelligence?.comparisonPageIdeas || [],
        faqOpportunities: contentGapIntelligence?.faqOpportunities || [],
        geoContentIdeas: contentGapIntelligence?.geoContentIdeas || [],
        resourcePageIdeas: contentGapIntelligence?.resourcePageIdeas || [],
        contentCalendar: contentGapIntelligence?.contentCalendar || {},
        summary: contentGapIntelligence?.summary || { totalGaps: 0, totalOpportunities: 0, criticalPriority: 0, highPriority: 0 }
      },
      update: {
        contentGaps: contentGapIntelligence?.contentGaps || [],
        landingPageIdeas: contentGapIntelligence?.landingPageIdeas || [],
        comparisonPageIdeas: contentGapIntelligence?.comparisonPageIdeas || [],
        faqOpportunities: contentGapIntelligence?.faqOpportunities || [],
        geoContentIdeas: contentGapIntelligence?.geoContentIdeas || [],
        resourcePageIdeas: contentGapIntelligence?.resourcePageIdeas || [],
        contentCalendar: contentGapIntelligence?.contentCalendar || {},
        summary: contentGapIntelligence?.summary || { totalGaps: 0, totalOpportunities: 0, criticalPriority: 0, highPriority: 0 },
        updatedAt: new Date()
      }
    });

    console.log('[SEO PERSIST CONTENT GAPS]', {
      contentGaps: contentGapIntelligence?.contentGaps?.length || 0,
      landingPageIdeas: contentGapIntelligence?.landingPageIdeas?.length || 0,
      comparisonPageIdeas: contentGapIntelligence?.comparisonPageIdeas?.length || 0,
      faqOpportunities: contentGapIntelligence?.faqOpportunities?.length || 0,
      summary: contentGapIntelligence?.summary
    });
  });

  return savedId;
}
