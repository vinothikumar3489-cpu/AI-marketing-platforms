import prisma from "../../../config/prisma.js";
import { generateCompleteSeoIntelligence as orchestratorGenerateSeo } from "../../../services/seo/seo-orchestrator.service.js";
import { logEvidenceInfo, logEvidenceError } from "../../../utils/evidence-logger.js";

const toNullableScore = (v) => {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};

export { generateCompleteSeoIntelligence };

async function generateCompleteSeoIntelligence({ chatId, userId, websiteUrl, chat }) {
  logEvidenceInfo('seo.intelligence', 'Starting SEO intelligence generation', { chatId, websiteUrl });

  const orchestratorResult = await orchestratorGenerateSeo({ chatId, userId, websiteUrl, chat });

  if (!orchestratorResult.success) {
    return { success: false, error: orchestratorResult.error || 'SEO intelligence generation failed' };
  }

  const { data: report, modules, warnings, provider, providers, runId } = orchestratorResult;

  const overallScore = report?.overallScore ?? null;
  const confidence = report?.scoreConfidence ?? 'LOW';
  const coverage = report?.scoreCoverage ?? 0;
  const measuredModules = report?.measuredModules || [];
  const unavailableModules = report?.unavailableModules || [];

  const seoStatus = provider === 'AI_FALLBACK' || provider === 'CACHE' ? 'ESTIMATED' : 'completed';

  const identity = modules?.crawl?.identity || {};

  const keywordIntelligence = report?.keywordIntelligence || null;
  const competitorIntelligence = report?.competitorIntelligence || null;
  const contentGapIntelligence = report?.contentGapIntelligence || null;
  const geoIntelligence = report?.geoIntelligence || null;
  const blogIntelligence = report?.blogIntelligence || null;

  const technicalAuditModule = modules?.technicalSeo || {};
  const pageSpeedModule = technicalAuditModule.data?.pageSpeed || null;
  const cruxModule = technicalAuditModule.data?.crux || null;
  const techAuditData = {
    meta: technicalAuditModule.data?.meta || null,
    canonical: technicalAuditModule.data?.canonical || null,
    robots: technicalAuditModule.data?.robots || null,
    headings: technicalAuditModule.data?.headings || null,
    openGraph: technicalAuditModule.data?.openGraph || null,
    twitterCard: technicalAuditModule.data?.twitterCard || null,
    structuredData: technicalAuditModule.data?.structuredData || null,
    images: technicalAuditModule.data?.images || null,
    links: technicalAuditModule.data?.links || null,
    performance: technicalAuditModule.data?.performance || null,
    overallScore: technicalAuditModule.data?.overallScore ?? null,
  };

  console.log('[SEO RESULT]', {
    runId, status: seoStatus, provider,
    hasTechnicalAudit: !!technicalAuditModule.data,
    hasPageSpeed: !!pageSpeedModule,
    hasCrux: !!cruxModule,
    keywordCount: keywordIntelligence?.metadata?.totalKeywords || 0,
    competitorCount: competitorIntelligence?.competitors?.length || 0,
    contentGapCount: contentGapIntelligence?.contentGaps?.length || 0,
    warnings: warnings?.length || 0
  });

  let persistedSeoRecordId = null;
  try {
    persistedSeoRecordId = await saveSEOData({
      chatId, userId, identity, websiteUrl,
      technicalAudit: techAuditData,
      chromeUXData: cruxModule,
      pageSpeedMobile: pageSpeedModule?.mobile || null,
      pageSpeedDesktop: pageSpeedModule?.desktop || null,
      keywordIntelligence,
      competitorIntelligence,
      geoIntelligence,
      contentGapIntelligence,
      blogIntelligence,
      seoReport: report,
      runId,
      overallScore, confidence, coverage,
      measuredModules, unavailableModules,
      providers, provider, warnings
    });
    logEvidenceInfo('seo.persist', 'SEO data persisted', { seoIntelligenceId: persistedSeoRecordId });
  } catch (e) {
    logEvidenceError('seo.persist', chatId, e);
    warnings.push({ code: 'PERSIST_FAILED', message: `Failed to persist SEO data: ${e.message}` });
  }

  return {
    success: true,
    status: seoStatus,
    data: {
      id: persistedSeoRecordId,
      status: seoStatus,
      warnings,
      identity,
      technicalAudit: techAuditData,
      pageSpeed: { mobile: pageSpeedModule?.mobile || null, desktop: pageSpeedModule?.desktop || null },
      crux: cruxModule,
      keywordIntelligence,
      competitorIntelligence,
      geoIntelligence,
      contentGapAnalysis: contentGapIntelligence,
      blogIntelligence,
      seoReport: report,
      providers,
      providerSelection: { selectedProvider: provider },
      overallScore,
      scoreConfidence: confidence,
      scoreCoverage: coverage,
      measuredModules,
      unavailableModules
    },
    warnings
  };
}

async function saveSEOData({ chatId, userId, identity, websiteUrl, technicalAudit, chromeUXData, pageSpeedMobile, pageSpeedDesktop, keywordIntelligence, competitorIntelligence, geoIntelligence, contentGapIntelligence, blogIntelligence, seoReport, runId, overallScore, confidence, coverage, measuredModules, unavailableModules, providers, provider, warnings }) {
  const seoIntelligencePayload = {
    chatId, userId,
    websiteUrl: identity?.websiteUrl || websiteUrl,
    domain: identity?.domain || '',
    companyName: identity?.companyName || '',
    productName: identity?.productName || '',
    seoScore: overallScore ?? null,
    analyzedAt: new Date(),
    fallbackUsed: provider !== 'SERPAPI',
    status: provider === 'AI_FALLBACK' || provider === 'CACHE' ? 'ESTIMATED' : 'completed',
    technicalAudit: technicalAudit || {},
    keywordOpportunities: keywordIntelligence || {},
    competitorKeywords: competitorIntelligence || {},
    contentGaps: contentGapIntelligence || {},
    aiVisibility: geoIntelligence || {},
    blogIdeas: blogIntelligence || {},
    actionPlan: { recommendations: seoReport?.recommendations || [] },
    landingPageSuggestions: seoReport?.landingPageSuggestions || [],
    providers: providers || {},
    warnings: warnings || [],
    inputJson: { runId, chatId, userId, websiteUrl, measuredModules, unavailableModules }
  };

  const seoRecord = await prisma.seoIntelligence.upsert({
    where: { chatId },
    create: seoIntelligencePayload,
    update: { ...seoIntelligencePayload, updatedAt: new Date() }
  });

  const savedId = seoRecord.id;

  await prisma.$transaction(async (tx) => {
    const techMobileScore = pageSpeedMobile?.lighthouseScores?.performance ?? null;
    const techDesktopScore = pageSpeedDesktop?.lighthouseScores?.performance ?? null;

    await tx.technicalSeoAudit.upsert({
      where: { seoIntelligenceId: savedId },
      create: {
        seoIntelligenceId: savedId,
        auditData: {
          audit: technicalAudit,
          chromeUX: chromeUXData,
          pageSpeed: { mobile: pageSpeedMobile, desktop: pageSpeedDesktop }
        },
        overallScore: toNullableScore(technicalAudit?.performance?.mobile ?? technicalAudit?.overallScore),
        titleScore: technicalAudit?.meta?.title ? 85 : null,
        metaScore: technicalAudit?.meta?.description ? 80 : null,
        securityScore: technicalAudit?.https?.status === 'enabled' ? 100 : null,
        mobileScore: toNullableScore(techMobileScore),
        headingScore: (technicalAudit?.headings?.h1?.length || 0) > 0 ? 85 : null,
        schemaScore: (technicalAudit?.structuredData?.count || 0) > 0 ? 80 : null,
        criticalIssues: [],
        highIssues: [],
        mediumIssues: [],
        lowIssues: [],
        recommendations: []
      },
      update: {
        auditData: {
          audit: technicalAudit,
          chromeUX: chromeUXData,
          pageSpeed: { mobile: pageSpeedMobile, desktop: pageSpeedDesktop }
        },
        overallScore: toNullableScore(technicalAudit?.performance?.mobile ?? technicalAudit?.overallScore),
        titleScore: technicalAudit?.meta?.title ? 85 : null,
        metaScore: technicalAudit?.meta?.description ? 80 : null,
        securityScore: technicalAudit?.https?.status === 'enabled' ? 100 : null,
        mobileScore: toNullableScore(techMobileScore),
        headingScore: (technicalAudit?.headings?.h1?.length || 0) > 0 ? 85 : null,
        schemaScore: (technicalAudit?.structuredData?.count || 0) > 0 ? 80 : null,
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

    await tx.seoScoreBreakdown.upsert({
      where: { seoIntelligenceId: savedId },
      create: {
        seoIntelligenceId: savedId,
        overallScore: toNullableScore(overallScore),
        technicalScore: techMobileScore ?? perfAvg ?? null,
        onPageScore: null,
        contentScore: null,
        authorityScore: null,
        aiVisibilityScore: null,
        localSeoScore: null,
        scoreHistory: {}
      },
      update: {
        overallScore: toNullableScore(overallScore),
        technicalScore: techMobileScore ?? perfAvg ?? null,
        onPageScore: null,
        contentScore: null,
        authorityScore: null,
        aiVisibilityScore: null,
        localSeoScore: null,
        scoreHistory: {},
        lastCalculated: new Date()
      }
    });

    if (keywordIntelligence) {
      await tx.keywordIntelligenceRecord.upsert({
        where: { seoIntelligenceId: savedId },
        create: {
          seoIntelligenceId: savedId,
          primaryKeywords: keywordIntelligence.primaryKeywords || [],
          secondaryKeywords: keywordIntelligence.secondaryKeywords || [],
          longTailKeywords: keywordIntelligence.longTailKeywords || [],
          questionKeywords: keywordIntelligence.questionKeywords || [],
          clusters: keywordIntelligence.clusters || [],
          competitorKeywords: keywordIntelligence.competitorKeywords || [],
          contentOpportunities: keywordIntelligence.contentOpportunities || [],
          geoKeywords: keywordIntelligence.geoKeywords || [],
          totalKeywords: keywordIntelligence.metadata?.totalKeywords || 0,
          clustersCount: keywordIntelligence.metadata?.clustersCount || 0,
          opportunitiesCount: keywordIntelligence.metadata?.opportunitiesCount || 0
        },
        update: {
          primaryKeywords: keywordIntelligence.primaryKeywords || [],
          secondaryKeywords: keywordIntelligence.secondaryKeywords || [],
          longTailKeywords: keywordIntelligence.longTailKeywords || [],
          questionKeywords: keywordIntelligence.questionKeywords || [],
          clusters: keywordIntelligence.clusters || [],
          competitorKeywords: keywordIntelligence.competitorKeywords || [],
          contentOpportunities: keywordIntelligence.contentOpportunities || [],
          geoKeywords: keywordIntelligence.geoKeywords || [],
          totalKeywords: keywordIntelligence.metadata?.totalKeywords || 0,
          clustersCount: keywordIntelligence.metadata?.clustersCount || 0,
          opportunitiesCount: keywordIntelligence.metadata?.opportunitiesCount || 0,
          updatedAt: new Date()
        }
      });
    }

    if (competitorIntelligence) {
      await tx.competitorSeoRecord.upsert({
        where: { seoIntelligenceId: savedId },
        create: {
          seoIntelligenceId: savedId,
          competitors: competitorIntelligence.competitors || [],
          competitorProfiles: competitorIntelligence.competitorProfiles || [],
          keywordGaps: competitorIntelligence.keywordGaps || {},
          contentGaps: competitorIntelligence.contentGaps || [],
          authorityGaps: competitorIntelligence.authorityGaps || {},
          geoGaps: competitorIntelligence.geoGaps || {},
          competitorMatrix: competitorIntelligence.competitorMatrix || [],
          recommendations: competitorIntelligence.recommendations || {},
          metadata: competitorIntelligence.metadata || {}
        },
        update: {
          competitors: competitorIntelligence.competitors || [],
          competitorProfiles: competitorIntelligence.competitorProfiles || [],
          keywordGaps: competitorIntelligence.keywordGaps || {},
          contentGaps: competitorIntelligence.contentGaps || [],
          authorityGaps: competitorIntelligence.authorityGaps || {},
          geoGaps: competitorIntelligence.geoGaps || {},
          competitorMatrix: competitorIntelligence.competitorMatrix || [],
          recommendations: competitorIntelligence.recommendations || {},
          metadata: competitorIntelligence.metadata || {},
          updatedAt: new Date()
        }
      });
    }

    if (contentGapIntelligence) {
      await tx.contentGapRecord.upsert({
        where: { seoIntelligenceId: savedId },
        create: {
          seoIntelligenceId: savedId,
          contentGaps: contentGapIntelligence.contentGaps || [],
          landingPageIdeas: contentGapIntelligence.landingPageIdeas || [],
          comparisonPageIdeas: contentGapIntelligence.comparisonPageIdeas || [],
          faqOpportunities: contentGapIntelligence.faqOpportunities || [],
          geoContentIdeas: contentGapIntelligence.geoContentIdeas || [],
          resourcePageIdeas: contentGapIntelligence.resourcePageIdeas || [],
          contentCalendar: contentGapIntelligence.contentCalendar || {},
          summary: contentGapIntelligence.summary || { totalGaps: 0, totalOpportunities: 0, criticalPriority: 0, highPriority: 0 }
        },
        update: {
          contentGaps: contentGapIntelligence.contentGaps || [],
          landingPageIdeas: contentGapIntelligence.landingPageIdeas || [],
          comparisonPageIdeas: contentGapIntelligence.comparisonPageIdeas || [],
          faqOpportunities: contentGapIntelligence.faqOpportunities || [],
          geoContentIdeas: contentGapIntelligence.geoContentIdeas || [],
          resourcePageIdeas: contentGapIntelligence.resourcePageIdeas || [],
          contentCalendar: contentGapIntelligence.contentCalendar || {},
          summary: contentGapIntelligence.summary || { totalGaps: 0, totalOpportunities: 0, criticalPriority: 0, highPriority: 0 },
          updatedAt: new Date()
        }
      });
    }
  });

  return savedId;
}
