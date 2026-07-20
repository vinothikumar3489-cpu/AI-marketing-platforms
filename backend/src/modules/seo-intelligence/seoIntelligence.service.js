import { prisma } from '../../config/prisma.js';
import { collectResearchData } from '../../services/intelligence/research-orchestrator.service.js';
import { scrapeWebsite } from '../../services/scraping/unified-scraper.service.js';
import { deriveWebsiteIdentity } from '../../utils/seo-identity.util.js';
import { getLatestEvidenceSnapshot } from '../evidence/evidence.service.js';
import { buildSEOEvidenceData } from '../evidence/evidence.normalizer.js';
import { asArray } from '../../utils/text.util.js';
import {
  resolveKeywordMetrics, resolveSerpData, resolveCompetitors,
  resolveAutocomplete, resolveTrends, getSEOProviderStatus
} from '../../services/seo/seo-provider-router.service.js';
import { generateMergedTechnicalSEO, getChromeUXReport } from '../../services/seo/technical-seo-merged.service.js';
import { extractCandidatePhrases, validateKeyword, deduplicateKeywords, scoreKeywordRelevance, classifyKeyword, buildKeywordSources } from '../../services/seo/keyword-pipeline.service.js';
import { discoverCompetitorsViaSerpAPI } from '../../services/seo/competitor-pipeline.service.js';
import { buildSEOReport } from '../../services/seo/seo-report-builder.service.js';
import { getSearchConsoleStatus } from '../../services/googleSearchConsole.service.js';

const toNullableScore = (value) => {
  if (value === undefined || value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
};

export async function generateCompleteSeoIntelligence({ chatId, userId, websiteUrl, chat }) {
  const runId = `seo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  console.log('[SEO RUN START]', { runId, chatId, userId, websiteUrl });

  let identity = null, websiteData = null, researchData = null;
  let technicalAudit = null, chromeUXData = null;
  let keywordIntelligence = null, competitorIntelligence = null;
  let contentGapIntelligence = null, blogIntelligence = null;
  let geoIntelligence = null, serpFeatures = null;
  let peopleAlsoAsk = null, trendAnalysis = null;
  let seoReport = null, providers = null;
  let persistedSeoRecordId = null;

  try {
    providers = getSEOProviderStatus();

    researchData = await collectResearchData({ websiteUrl, productName: chat?.productName || '', companyName: chat?.title || '' });
    websiteData = researchData.websiteContent;

    if (!websiteData) {
      const scrapeResult = await scrapeWebsite(websiteUrl, { timeout: 30000, extractSchema: true, extractImages: false, extractLinks: true, extractMeta: true });
      if (!scrapeResult.success) throw new Error('Failed to scrape website: ' + scrapeResult.error);
      websiteData = scrapeResult.data;
    }

    identity = deriveWebsiteIdentity({ websiteUrl, scrapedData: websiteData, chat });

    const [techResult, cruxResult] = await Promise.allSettled([
      generateMergedTechnicalSEO(websiteUrl),
      getChromeUXReport(websiteUrl)
    ]);

    if (techResult.status === 'fulfilled') technicalAudit = techResult.value;
    if (cruxResult.status === 'fulfilled' && cruxResult.value?.success) chromeUXData = cruxResult.value.data;

    const keywordBuildStart = Date.now();
    const keywordSources = buildKeywordSources(websiteData);
    let rawCandidates = extractCandidatePhrases(keywordSources);

    rawCandidates = deduplicateKeywords(rawCandidates);

    const validatedKeywords = rawCandidates
      .filter(c => validateKeyword(c.phrase, identity?.productName, identity?.companyName))
      .map(c => ({
        keyword: c.phrase,
        priority: c.priority,
        frequency: c.frequency,
        sources: Array.from(c.sources),
        relevanceScore: scoreKeywordRelevance(c.phrase, identity?.productName, identity?.companyName, identity?.industry),
        intent: classifyKeyword(c.phrase)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    const keywordMetrics = await resolveKeywordMetrics(
      validatedKeywords.slice(0, 20).map(k => k.keyword)
    );

    keywordIntelligence = buildKeywordIntelligence(validatedKeywords, keywordMetrics, identity);

    const [competitorResult, serpResult, autoResult, trendResult] = await Promise.allSettled([
      discoverCompetitorsViaSerpAPI(identity?.productName || '', identity?.industry || '', websiteUrl),
      resolveSerpData(identity?.productName || identity?.companyName || '', { num: 10 }),
      resolveAutocomplete(identity?.productName || ''),
      resolveTrends(identity?.productName || '')
    ]);

    if (competitorResult.status === 'fulfilled' && competitorResult.value) {
      competitorIntelligence = buildCompetitorIntelligence(competitorResult.value, keywordIntelligence);
    }

    if (serpResult.status === 'fulfilled' && serpResult.value?.success) {
      serpFeatures = serpResult.value.data?.features || {};
      peopleAlsoAsk = serpFeatures?.peopleAlsoAsk || [];
    }

    if (autoResult.status === 'fulfilled' && autoResult.value?.success) {
      keywordIntelligence.autocompleteSuggestions = autoResult.value.data?.suggestions || [];
    }

    if (trendResult.status === 'fulfilled' && trendResult.value?.success) {
      trendAnalysis = trendResult.value.data;
    }

    geoIntelligence = buildGeoIntelligence(technicalAudit, chromeUXData);
    contentGapIntelligence = buildContentGapIntelligence(keywordIntelligence, competitorIntelligence, websiteData);
    blogIntelligence = buildBlogIntelligence(keywordIntelligence, competitorIntelligence, trendAnalysis);
    seoReport = buildSEOReport({
      identity, technicalAudit, keywordIntelligence,
      competitorIntelligence, geoIntelligence, contentGapIntelligence,
      blogIntelligence, serpFeatures, peopleAlsoAsk, trendAnalysis, providers
    });

    persistedSeoRecordId = await saveSEOData({
      chatId, userId, identity, websiteUrl,
      technicalAudit, chromeUXData, keywordIntelligence,
      competitorIntelligence, geoIntelligence, contentGapIntelligence,
      blogIntelligence, seoReport, researchData, runId
    });

    await prisma.message.create({
      data: {
        chatId, role: 'assistant',
        content: `SEO Intelligence analysis complete for ${websiteUrl}. Overall Score: ${seoReport?.overallScore != null ? `${seoReport.overallScore}/100` : 'Pending evidence collection'}`,
        analysisData: {
          summary: seoReport ? `Overall SEO Score: ${seoReport.overallScore}/100, Technical: ${seoReport.technicalScore}/100, Content: ${seoReport.contentScore}/100` : `SEO analysis for ${websiteUrl}`,
          scores: seoReport ? { overall: seoReport.overallScore, technical: seoReport.technicalScore, content: seoReport.contentScore, performance: seoReport.performanceScore } : null,
          provider: 'orchestrator'
        }
      }
    }).catch(() => {});

    console.log('[SEO RUN COMPLETE]', { runId, chatId, overallScore: seoReport?.overallScore });

    return {
      success: true,
      status: 'completed',
      data: {
        id: persistedSeoRecordId,
        status: 'completed',
        identity,
        technicalAudit,
        keywordIntelligence,
        competitorIntelligence,
        geoIntelligence,
        contentGapAnalysis: contentGapIntelligence,
        blogIntelligence,
        seoReport,
        providers,
        warnings: researchData?.warnings || []
      }
    };

  } catch (error) {
    console.error('[SEO RUN FAILED]', { runId, error: error.message });

    if (persistedSeoRecordId) {
      await prisma.seoIntelligence.update({ where: { id: persistedSeoRecordId }, data: { status: 'FAILED' } }).catch(() => {});
    }

    return {
      success: false,
      error: error.message,
      status: 'failed',
      data: seoReport ? { identity, technicalAudit, keywordIntelligence, seoReport } : null
    };
  }
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

function buildCompetitorIntelligence(competitors, keywordIntelligence) {
  return {
    competitors: competitors || [],
    competitorProfiles: (competitors || []).map(c => ({
      name: c.name,
      domain: c.domain,
      website: c.url,
      competitorType: c.competitorType || 'serp',
      title: c.title,
      metaDescription: c.snippet,
      mainKeywords: c.keyword ? [c.keyword] : [],
      relevanceScore: c.relevanceScore || 50
    })),
    keywordGaps: {},
    contentGaps: [],
    authorityGaps: {},
    geoGaps: {},
    competitorMatrix: [],
    recommendations: {},
    metadata: {
      totalCompetitors: competitors?.length || 0,
      directCompetitors: competitors?.filter(c => c.competitorType === 'direct' || c.relevanceScore >= 70).length || 0,
      analyzedAt: new Date().toISOString()
    }
  };
}

function buildGeoIntelligence(technicalAudit, chromeUXData) {
  return {
    aiVisibilityScore: null,
    chatGptScore: null,
    geminiScore: null,
    claudeScore: null,
    perplexityScore: null,
    googleAiOverviewScore: null,
    entityCoverageScore: null,
    knowledgeGraphReadinessScore: null,
    citationReadinessScore: null,
    answerabilityScore: null,
    topicalAuthorityScore: null,
    entities: [],
    knowledgeGraphEntities: [],
    citationOpportunities: [],
    faqOpportunities: [],
    aiContentOpportunities: [],
    trustSignals: {
      score: technicalAudit?.scores?.overall ? Math.round(technicalAudit.scores.overall * 0.7) : null,
      signals: {
        hasHTTPS: technicalAudit?.meta?.title ? true : false,
        hasStructuredData: (technicalAudit?.structuredData?.count || 0) > 0,
        hasOpenGraph: technicalAudit?.openGraph?.status === 'measured'
      }
    },
    metadata: {
      totalEntities: 0,
      totalOpportunities: 0,
      rawScore: null,
      confidenceLevel: 'unavailable',
      reason: 'GEO scoring requires AI platform analysis which is not yet integrated'
    }
  };
}

function buildContentGapIntelligence(keywordIntelligence, competitorIntelligence, websiteData) {
  const gaps = [];
  const text = (websiteData?.text || websiteData?.content?.text || '').toLowerCase();

  if (!text.includes('faq') && !text.includes('frequently asked')) {
    gaps.push({ gapType: 'faq', title: 'FAQ Section', opportunityScore: 85, priority: 'high', reason: 'No FAQ content found' });
  }
  if (!text.includes('case study') && !text.includes('customer story') && !text.includes('success story')) {
    gaps.push({ gapType: 'use_case', title: 'Case Studies / Customer Stories', opportunityScore: 80, priority: 'high', reason: 'No case study content found' });
  }
  if (!text.includes('vs ') && !text.includes('versus') && !text.includes('comparison') && !text.includes('alternative')) {
    gaps.push({ gapType: 'comparison', title: 'Comparison Pages', opportunityScore: 75, priority: 'high', reason: 'No comparison content found' });
  }
  if (!text.includes('pricing') && !text.includes('price') && !text.includes('plan')) {
    gaps.push({ gapType: 'pricing', title: 'Pricing Page', opportunityScore: 90, priority: 'critical', reason: 'No pricing information found' });
  }

  if (competitorIntelligence?.competitors?.length > 0) {
    competitorIntelligence.competitors.slice(0, 3).forEach(c => {
      gaps.push({ gapType: 'comparison', title: `${keywordIntelligence?.metadata?.productName || 'Product'} vs ${c.name}`, opportunityScore: 70, priority: 'medium', reason: `Competitor ${c.name} ranks for comparison keywords` });
    });
  }

  return {
    contentGaps: gaps.sort((a, b) => b.opportunityScore - a.opportunityScore),
    landingPageIdeas: [],
    comparisonPageIdeas: [],
    faqOpportunities: [],
    geoContentIdeas: [],
    resourcePageIdeas: [],
    contentCalendar: {},
    summary: {
      totalGaps: gaps.length,
      totalOpportunities: gaps.filter(g => g.opportunityScore >= 70).length,
      criticalPriority: gaps.filter(g => g.priority === 'critical').length,
      highPriority: gaps.filter(g => g.priority === 'high').length
    }
  };
}

function buildBlogIntelligence(keywordIntelligence, competitorIntelligence, trendAnalysis) {
  const ideas = [];
  const kw = keywordIntelligence || {};

  const allKW = [
    ...(kw.primaryKeywords || []),
    ...(kw.secondaryKeywords || []),
    ...(kw.questionKeywords || [])
  ];

  allKW.slice(0, 15).forEach(k => {
    const keyword = k.keyword || k;
    ideas.push({
      title: `How to ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}: Complete Guide`,
      targetKeyword: keyword,
      searchIntent: k.intent || 'informational',
      difficulty: k.relevanceScore >= 70 ? 'medium' : 'easy',
      opportunity: k.opportunityScore >= 70 ? 'high' : 'medium',
      estimatedImpact: k.opportunityScore >= 70 ? 'high' : 'medium',
      priority: k.opportunityScore >= 70 ? 'high' : 'medium'
    });
  });

  return {
    blogIdeas: ideas,
    blogClusters: [],
    blogBriefs: [],
    publishingCalendar: {},
    summary: { totalIdeas: ideas.length, totalClusters: 0, highPriorityIdeas: ideas.filter(i => i.priority === 'high').length }
  };
}

async function saveSEOData({ chatId, userId, identity, websiteUrl, technicalAudit, chromeUXData, keywordIntelligence, competitorIntelligence, geoIntelligence, contentGapIntelligence, blogIntelligence, seoReport, researchData, runId }) {
  const seoRecord = await prisma.seoIntelligence.upsert({
    where: { chatId },
    create: {
      chatId, userId,
      websiteUrl: identity?.websiteUrl || websiteUrl,
      domain: identity?.domain || '',
      companyName: identity?.companyName || '',
      productName: identity?.productName || '',
      seoScore: seoReport?.overallScore ?? null,
      technicalAudit: { ...technicalAudit, chromeUX: chromeUXData },
      keywordOpportunities: keywordIntelligence,
      competitorKeywords: competitorIntelligence,
      contentGaps: contentGapIntelligence,
      aiVisibility: geoIntelligence,
      blogIdeas: blogIntelligence,
      actionPlan: { recommendations: seoReport?.recommendations || [] },
      providers: researchData?.sources || [],
      warnings: researchData?.warnings || [],
      status: 'completed'
    },
    update: {
      websiteUrl: identity?.websiteUrl || websiteUrl,
      domain: identity?.domain || '',
      companyName: identity?.companyName || '',
      productName: identity?.productName || '',
      seoScore: seoReport?.overallScore ?? null,
      technicalAudit: { ...technicalAudit, chromeUX: chromeUXData },
      keywordOpportunities: keywordIntelligence,
      competitorKeywords: competitorIntelligence,
      contentGaps: contentGapIntelligence,
      aiVisibility: geoIntelligence,
      blogIdeas: blogIntelligence,
      actionPlan: { recommendations: seoReport?.recommendations || [] },
      providers: researchData?.sources || [],
      warnings: researchData?.warnings || [],
      status: 'completed',
      updatedAt: new Date()
    }
  });

  const savedId = seoRecord.id;

  await prisma.$transaction(async (tx) => {
    if (websiteData) {
      await tx.rawCrawlData.deleteMany({ where: { seoIntelligenceId: savedId } });
      await tx.rawCrawlData.create({
        data: {
          seoIntelligenceId: savedId,
          url: websiteUrl || '',
          html: (websiteData?.html || '').substring(0, 100000),
          text: (websiteData?.text || '').substring(0, 50000),
          metadata: websiteData?.metadata || {},
          technical: websiteData?.technical || {},
          content: websiteData?.content || {},
          structured: websiteData?.structured || {},
          provider: 'orchestrator'
        }
      });
    }

    await tx.technicalSeoAudit.upsert({
      where: { seoIntelligenceId: savedId },
      create: {
        seoIntelligenceId: savedId, auditData: { ...technicalAudit, chromeUX: chromeUXData },
        overallScore: toNullableScore(technicalAudit?.scores?.overall),
        criticalIssues: technicalAudit?.issues?.critical || [],
        highIssues: technicalAudit?.issues?.high || [],
        mediumIssues: technicalAudit?.issues?.medium || [],
        lowIssues: technicalAudit?.issues?.low || [],
        recommendations: technicalAudit?.recommendations || []
      },
      update: {
        auditData: { ...technicalAudit, chromeUX: chromeUXData },
        overallScore: toNullableScore(technicalAudit?.scores?.overall),
        criticalIssues: technicalAudit?.issues?.critical || [],
        highIssues: technicalAudit?.issues?.high || [],
        mediumIssues: technicalAudit?.issues?.medium || [],
        lowIssues: technicalAudit?.issues?.low || [],
        recommendations: technicalAudit?.recommendations || [],
        analyzedAt: new Date()
      }
    });

    await tx.seoScoreBreakdown.upsert({
      where: { seoIntelligenceId: savedId },
      create: {
        seoIntelligenceId: savedId,
        overallScore: toNullableScore(seoReport?.overallScore),
        technicalScore: toNullableScore(seoReport?.technicalScore),
        onPageScore: toNullableScore(seoReport?.contentScore),
        contentScore: toNullableScore(seoReport?.contentScore)
      },
      update: {
        overallScore: toNullableScore(seoReport?.overallScore),
        technicalScore: toNullableScore(seoReport?.technicalScore),
        onPageScore: toNullableScore(seoReport?.contentScore),
        contentScore: toNullableScore(seoReport?.contentScore),
        lastCalculated: new Date()
      }
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
  });

  return savedId;
}
