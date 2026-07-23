import prisma from "../../../config/prisma.js";
import { generateCompleteSeoIntelligence } from '../services/seoIntelligence.service.js';
import { scrapingQueue } from '../../../jobs/queues.js';
import { buildSEOReport } from "../../../services/seo/seo-report-builder.service.js";
import { getSEOProviderStatus, getCachedSEOProviderStatus, clearSEOCache, getCacheStats } from "../../../services/seo/seo-provider-router.service.js";
import { getSearchConsoleStatus } from "../../../providers/googleSearchConsole.service.js";

export const runSeoHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;
  const input = req.body || {};

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing chatId or user' });
  }

  let websiteUrl = input.websiteUrl || input.url;
  let chat = null;

  if (chatId && !websiteUrl) {
    try {
      chat = await prisma.chat.findUnique({ where: { id: chatId } });
      const profile = await prisma.productProfile.findUnique({ where: { chatId } });
      websiteUrl = profile?.websiteUrl;
    } catch (e) {
      console.error('Error fetching chat data:', e);
    }
  }

  if (!websiteUrl) {
    return res.status(400).json({
      success: false,
      error: 'Website URL required. Please provide websiteUrl or create a product profile first.'
    });
  }

  try {
    const job = await scrapingQueue.add('seo-audit', { chatId, userId, websiteUrl });
    
    return res.status(202).json({
      success: true,
      message: 'SEO Analysis started in the background.',
      jobId: job.id,
      statusUrl: `/api/jobs/scraping/${job.id}/status`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to start SEO background job' });
  }
};

export const getSeoHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing chatId or user' });
  }

  try {
    const seo = await prisma.seoIntelligence.findUnique({
      where: { chatId },
      include: {
        scoreBreakdown: true,
        technicalAuditDetail: true,
        keywordIntelligence: true,
        geoIntelligence: true,
        competitorSeoRecord: true,
        contentGapRecord: true,
        blogIntelligenceRecord: true,
        executiveDashboard: true
      }
    });

    if (!seo || seo.userId !== userId) {
      return res.json({ success: true, seoIntelligence: null });
    }

    const keywordData = seo.keywordIntelligence || seo.keywordOpportunities || {};
    const competitorData = seo.competitorSeoRecord || seo.competitorKeywords || {};
    const contentGapData = seo.contentGapRecord || seo.contentGaps || {};
    const blogData = seo.blogIntelligenceRecord || seo.blogIdeas || {};
    const geoData = seo.geoIntelligence || seo.aiVisibility || {};

    let reportProviders;
    try { reportProviders = await getSEOProviderStatus(); } catch (e) { reportProviders = getCachedSEOProviderStatus(); }

    const report = buildSEOReport({
      identity: { websiteUrl: seo.websiteUrl, domain: seo.domain, companyName: seo.companyName, productName: seo.productName },
      technicalAudit: seo.technicalAuditDetail?.auditData || seo.technicalAudit || {},
      keywordIntelligence: keywordData,
      competitorIntelligence: competitorData,
      geoIntelligence: geoData,
      contentGapIntelligence: contentGapData,
      blogIntelligence: blogData,
      providers: reportProviders
    });

    let metadataProviders;
    try { metadataProviders = await getSEOProviderStatus(); } catch (e) { metadataProviders = getCachedSEOProviderStatus(); }

    const topicCandidates = seo.inputJson?.topicCandidates || [];
    const inputMeta = seo.inputJson || {};

    return res.json({
      success: true,
      seoIntelligence: {
        id: seo.id,
        websiteUrl: seo.websiteUrl,
        domain: seo.domain,
        companyName: seo.companyName,
        productName: seo.productName,
        seoScore: seo.seoScore,
        seoReport: report,
        technicalAuditDetail: seo.technicalAuditDetail?.auditData || seo.technicalAudit || null,
        keywordIntelligence: keywordData,
        competitorIntelligence: competitorData,
        geoIntelligence: geoData,
        contentGapRecord: contentGapData,
        blogIntelligenceRecord: blogData,
        executiveDashboard: seo.executiveDashboard || null,
        topicCandidates,
        measuredModules: inputMeta.measuredModules || [],
        unavailableModules: inputMeta.unavailableModules || [],
        metadata: {
          analyzedAt: seo.updatedAt,
          providers: seo.providers || metadataProviders,
          warnings: seo.warnings,
          status: seo.status,
          scoreConfidence: report?.confidenceLabel || null,
          coverage: (inputMeta.measuredModules?.length || 0) / ((inputMeta.measuredModules?.length || 0) + (inputMeta.unavailableModules?.length || 1))
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getKeywordIntelligence = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;

    if (!chatId || !userId) return res.status(400).json({ success: false, error: 'Missing chatId or user' });

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

    const seo = await prisma.seoIntelligence.findUnique({ where: { chatId }, include: { keywordIntelligence: true } });
    if (!seo) return res.status(404).json({ success: false, error: 'SEO Intelligence not found. Run SEO analysis first.' });

    return res.json({
      success: true,
      data: {
        ...(seo.keywordIntelligence || seo.keywordOpportunities || {}),
        websiteUrl: seo.websiteUrl
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getGeoIntelligenceHandler = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;

    if (!chatId || !userId) return res.status(400).json({ success: false, error: 'Missing chatId or user' });

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

    const seo = await prisma.seoIntelligence.findUnique({ where: { chatId }, include: { geoIntelligence: true } });
    if (!seo) return res.status(404).json({ success: false, error: 'SEO Intelligence not found' });

    return res.json({
      success: true,
      data: { ...(seo.geoIntelligence || seo.aiVisibility || {}), websiteUrl: seo.websiteUrl }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getCompetitorSeoHandler = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;

    if (!chatId || !userId) return res.status(400).json({ success: false, error: 'Missing chatId or user' });

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

    const seo = await prisma.seoIntelligence.findUnique({ where: { chatId }, include: { competitorSeoRecord: true } });
    if (!seo) return res.status(404).json({ success: false, error: 'SEO Intelligence not found' });

    return res.json({
      success: true,
      data: { ...(seo.competitorSeoRecord || seo.competitorKeywords || {}), websiteUrl: seo.websiteUrl }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getContentGapsHandler = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;

    if (!chatId || !userId) return res.status(400).json({ success: false, error: 'Missing chatId or user' });

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

    const seo = await prisma.seoIntelligence.findUnique({ where: { chatId }, include: { contentGapRecord: true } });
    if (!seo) return res.status(404).json({ success: false, error: 'SEO Intelligence not found' });

    return res.json({
      success: true,
      data: { ...(seo.contentGapRecord || seo.contentGaps || {}) }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getDashboardHandler = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;

    if (!chatId || !userId) return res.status(400).json({ success: false, error: 'Missing chatId or user' });

    const seo = await prisma.seoIntelligence.findUnique({
      where: { chatId },
      include: {
        scoreBreakdown: true, technicalAuditDetail: true,
        keywordIntelligence: true, competitorSeoRecord: true,
        geoIntelligence: true, contentGapRecord: true,
        blogIntelligenceRecord: true, executiveDashboard: true
      }
    });

    if (!seo) return res.status(404).json({ success: false, error: 'SEO Intelligence not found' });

    let dashboardProviders;
    try { dashboardProviders = await getSEOProviderStatus(); } catch (e) { dashboardProviders = getCachedSEOProviderStatus(); }

    const report = buildSEOReport({
      identity: { websiteUrl: seo.websiteUrl, domain: seo.domain, companyName: seo.companyName, productName: seo.productName },
      technicalAudit: seo.technicalAuditDetail?.auditData || seo.technicalAudit || {},
      keywordIntelligence: seo.keywordIntelligence || seo.keywordOpportunities || {},
      competitorIntelligence: seo.competitorSeoRecord || seo.competitorKeywords || {},
      geoIntelligence: seo.geoIntelligence || seo.aiVisibility || {},
      contentGapIntelligence: seo.contentGapRecord || seo.contentGaps || {},
      blogIntelligence: seo.blogIntelligenceRecord || seo.blogIdeas || {},
      providers: dashboardProviders
    });

    return res.json({ success: true, data: { report, executiveDashboard: seo.executiveDashboard || null } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getSEOProviderStatusHandler = async (req, res) => {
  let providers;
  try {
    providers = await getSEOProviderStatus();
  } catch (e) {
    providers = getCachedSEOProviderStatus();
  }
  return res.json({
    success: true,
    data: {
      providers,
      cache: getCacheStats(),
      searchConsole: getSearchConsoleStatus()
    }
  });
};

export const clearSEOCacheHandler = async (req, res) => {
  const { chatId } = req.params;
  clearSEOCache(chatId);
  return res.json({ success: true, message: 'SEO cache cleared' });
};
