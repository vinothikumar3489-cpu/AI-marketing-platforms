import { generateCompleteSeoIntelligence } from './seoIntelligence.service.js';
import { prisma } from '../../config/prisma.js';
import { buildSeoFrontendPayload, normalizeDataForSEOKeywords } from '../../services/seo/seo-frontend-payload.service.js';
import { generateSeoActionPlan } from '../../services/seo/seo-action-plan.service.js';
import { runOnPageSeoChecks } from '../../services/seo/onpage-seo-checks.service.js';
import { analyzeAiSearchReadiness } from '../../services/seo/ai-search-readiness.service.js';
import {
  getContentGapsByChat,
  runContentGapAnalysis,
  getBlogsByChat,
  runBlogAnalysis,
  getExecutiveDashboardByChat,
  runExecutiveDashboardAnalysis
} from '../../services/seo.service.js';

export const runSeoHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;
  const input = req.body || {};

  if (process.env.NODE_ENV !== 'production') {
    console.log('🚀 [SEO Run] Request:', { chatId, userId, websiteUrl: input.websiteUrl });
  }

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: "Missing chatId or user" });
  }

  // Get websiteUrl from input
  let websiteUrl = input.websiteUrl || input.url;

  // Try to get website from product profile or chat if not provided
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
      error: "Website URL required. Please provide websiteUrl or create a product profile first." 
    });
  }

  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [SEO Run] Starting analysis for URL:', websiteUrl);
    }
    
    const result = await generateCompleteSeoIntelligence({
      chatId,
      userId,
      websiteUrl,
      chat
    });

    if (!result.success) {
      console.error('❌ [SEO Run] Service reported failure:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'SEO analysis failed',
        warning: 'Analysis failed and was not saved to database. Please try again.'
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ [SEO Run] Analysis complete');
      
      console.log('[SEO Run Response]', {
        requestChatId: chatId,
        responseChatId: result.data?.chatId || chatId,
        hasData: !!result.data,
        hasTechnical: !!result.data?.technicalAudit
      });
    }

    const payload = result.data || {};

    const execDash = payload.executiveDashboard?.dashboardData || payload.executiveDashboard;
    const techAuditData = payload.technicalAuditDetail?.auditData || payload.technicalAudit;
    const kwData = payload.keywordIntelligence?.keywordData || payload.keywordIntelligence;
    const compData = payload.competitorSeoRecord?.competitorData || payload.competitorSeoRecord;
    const gapData = payload.contentGapRecord?.gapData || payload.contentGapRecord;
    const blogData = payload.blogIntelligenceRecord?.blogData || payload.blogIntelligenceRecord;

    const computedActionPlan = payload.actionPlan || generateSeoActionPlan({
      technicalAudit: techAuditData,
      keywords: kwData?.primaryKeywords || kwData?.keywords || [],
      contentGaps: gapData?.contentGaps || [],
      competitors: compData?.competitors || [],
      identity: {
        websiteUrl: payload.websiteUrl,
        domain: payload.domain,
        companyName: payload.companyName,
        productName: payload.productName
      }
    });

    const canonicalPayload = buildSeoFrontendPayload({
      seoIntelligence: payload,
      executiveDashboard: execDash,
      technicalAudit: techAuditData,
      keywordIntelligence: kwData,
      competitorIntelligence: compData,
      contentGapIntelligence: gapData,
      blogIntelligence: blogData,
      actionPlan: computedActionPlan,
      productIdentity: {
        websiteUrl: payload.websiteUrl,
        domain: payload.domain,
        companyName: payload.companyName,
        productName: payload.productName
      }
    });

    return res.json({
      success: true,
      chatId,
      seoIntelligence: {
        ...payload,
        canonical: canonicalPayload,
        actionPlan: computedActionPlan
      }
    });

  } catch (error) {
    console.error('❌ [SEO Run] Error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || "Failed to run SEO analysis" 
    });
  }
};

export const getSeoHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  if (process.env.NODE_ENV !== 'production') {
    console.log('🔍 [SEO Get] Request:', { chatId, userId });
  }

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: "Missing chatId or user" });
  }

  try {
    const seoIntelligence = await prisma.seoIntelligence.findUnique({ 
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

    if (!seoIntelligence || seoIntelligence.userId !== userId) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('ℹ️ [SEO Get] No data found');
      }
      return res.json({ success: true, seoIntelligence: null });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ [SEO Get] Data found');
    }

    // Extract sub-records
    const execDash = seoIntelligence.executiveDashboard?.dashboardData || seoIntelligence.executiveDashboard;
    const techAuditData = seoIntelligence.technicalAuditDetail?.auditData || seoIntelligence.technicalAudit;
    const kwData = seoIntelligence.keywordIntelligence?.keywordData || seoIntelligence.keywordIntelligence;
    const compData = seoIntelligence.competitorSeoRecord?.competitorData || seoIntelligence.competitorSeoRecord;
    const gapData = seoIntelligence.contentGapRecord?.gapData || seoIntelligence.contentGapRecord;
    const blogData = seoIntelligence.blogIntelligenceRecord?.blogData || seoIntelligence.blogIntelligenceRecord;

    // Build on-page checks and AI Search Readiness from available data
    const allKeywords = [
      ...(kwData?.primaryKeywords || []),
      ...(kwData?.secondaryKeywords || []),
      ...(kwData?.longTailKeywords || [])
    ];
    const onPageChecks = runOnPageSeoChecks(techAuditData?.websiteData || seoIntelligence.technicalAudit);
    const aiSearchReadiness = analyzeAiSearchReadiness(
      techAuditData?.websiteData || seoIntelligence.technicalAudit,
      allKeywords,
      {
        websiteUrl: seoIntelligence.websiteUrl,
        productName: seoIntelligence.productName
      }
    );

    // Build action plan from available data
    const storedActionPlan = seoIntelligence.actionPlan;
    const computedActionPlan = storedActionPlan || generateSeoActionPlan({
      technicalAudit: techAuditData,
      keywords: allKeywords,
      contentGaps: gapData?.contentGaps || [],
      competitors: compData?.competitors || [],
      aiSearchReadiness,
      identity: {
        websiteUrl: seoIntelligence.websiteUrl,
        domain: seoIntelligence.domain,
        companyName: seoIntelligence.companyName,
        productName: seoIntelligence.productName
      }
    });

    // Build canonical payload
    const canonicalPayload = buildSeoFrontendPayload({
      seoIntelligence,
      executiveDashboard: execDash,
      technicalAudit: techAuditData,
      keywordIntelligence: kwData,
      competitorIntelligence: compData,
      contentGapIntelligence: gapData,
      blogIntelligence: blogData,
      actionPlan: computedActionPlan,
      productIdentity: {
        websiteUrl: seoIntelligence.websiteUrl,
        domain: seoIntelligence.domain,
        companyName: seoIntelligence.companyName,
        productName: seoIntelligence.productName
      }
    });

    // Backward-compatible legacy response
    const response = {
      id: seoIntelligence.id,
      websiteUrl: seoIntelligence.websiteUrl,
      domain: seoIntelligence.domain,
      companyName: seoIntelligence.companyName,
      productName: seoIntelligence.productName,
      seoScore: seoIntelligence.seoScore,
      performanceScore: techAuditData?.mobile?.performance ?? null,
      seoPerformanceScore: techAuditData?.mobile?.seo ?? null,
      accessibilityScore: techAuditData?.mobile?.accessibility ?? null,
      bestPracticesScore: techAuditData?.mobile?.bestPractices ?? null,
      mobileScore: techAuditData?.mobile?.performance ?? null,
      desktopScore: techAuditData?.desktop?.performance ?? null,
      cwvScore: techAuditData?.mobile?.coreWebVitals?.largestContentfulPaint?.score ?? null,
      
      technicalAudit: seoIntelligence.technicalAudit,
      keywordOpportunities: seoIntelligence.keywordOpportunities,
      competitorIntelligence: seoIntelligence.competitorKeywords,
      contentGaps: seoIntelligence.contentGaps,
      aiVisibility: seoIntelligence.aiVisibility,
      landingPageOptimization: seoIntelligence.landingPageSuggestions,
      blogOpportunities: seoIntelligence.blogIdeas,
      actionPlan: computedActionPlan,
      
      scoreBreakdown: seoIntelligence.scoreBreakdown || null,
      technicalAuditDetail: seoIntelligence.technicalAuditDetail?.auditData || null,
      keywordIntelligence: kwData,
      geoIntelligence: seoIntelligence.geoIntelligence || null,
      competitorSeoRecord: compData,
      contentGapRecord: gapData,
      blogIntelligenceRecord: blogData,
      executiveDashboard: execDash,
      scrapingProvider: seoIntelligence.providers?.scraping || 'unknown',
      
      onPageChecks,
      aiSearchReadiness,
      
      metadata: {
        analyzedAt: seoIntelligence.updatedAt,
        providers: seoIntelligence.providers,
        warnings: seoIntelligence.warnings
      },
      
      canonical: canonicalPayload
    };

    return res.json({ 
      success: true, 
      seoIntelligence: response
    });

  } catch (error) {
    console.error('❌ [SEO Get] Error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || "Failed to get SEO intelligence" 
    });
  }
};

// Get keyword intelligence for a chat
export const getKeywordIntelligence = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;

    if (!chatId || !userId) {
      return res.status(400).json({ success: false, error: 'Missing chatId or user' });
    }

    // Validate chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    // Get SEO Intelligence with keyword intelligence
    const seoIntelligence = await prisma.seoIntelligence.findUnique({
      where: { chatId },
      include: {
        keywordIntelligence: true
      }
    });

    if (!seoIntelligence) {
      return res.status(404).json({ 
        success: false, 
        error: 'SEO Intelligence not found. Run SEO analysis first.' 
      });
    }

    if (!seoIntelligence.keywordIntelligence) {
      return res.status(404).json({ 
        success: false, 
        error: 'Keyword intelligence not found. It will be generated in the next SEO analysis run.' 
      });
    }

    return res.json({
      success: true,
      data: {
        ...seoIntelligence.keywordIntelligence,
        websiteUrl: seoIntelligence.websiteUrl
      }
    });

  } catch (error) {
    console.error('Error getting keyword intelligence:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get keyword intelligence' 
    });
  }
};

// Regenerate keyword intelligence
export const regenerateKeywordIntelligence = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;

    if (!chatId || !userId) {
      return res.status(400).json({ success: false, error: 'Missing chatId or user' });
    }

    // Validate chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    // Get SEO Intelligence with all data
    const seoIntelligence = await prisma.seoIntelligence.findUnique({
      where: { chatId },
      include: {
        rawCrawlData: { take: 1, orderBy: { scrapedAt: 'desc' } }
      }
    });

    if (!seoIntelligence) {
      return res.status(404).json({ 
        success: false, 
        error: 'SEO Intelligence not found. Run SEO analysis first.' 
      });
    }

    if (!seoIntelligence.rawCrawlData || seoIntelligence.rawCrawlData.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No crawl data available. Run SEO analysis first.' 
      });
    }

    // Reconstruct website data from raw crawl
    const rawData = seoIntelligence.rawCrawlData[0];
    const websiteData = {
      text: rawData.text || '',
      html: rawData.html || '',
      metadata: rawData.metadata || {},
      technical: rawData.technical || {},
      content: rawData.content || {},
      structured: rawData.structured || {}
    };

    // Get competitor data if available
    const competitorData = seoIntelligence.competitorKeywords || [];

    // Generate keyword intelligence
    const { generateKeywordIntelligence } = await import('../../services/seo/keyword-intelligence.service.js');
    const keywordIntelligence = await generateKeywordIntelligence({
      websiteData,
      competitorData: Array.isArray(competitorData) ? competitorData : [],
      identity: {
        productName: req.body.productName || 'Product',
        companyName: req.body.companyName || '',
        brandName: req.body.brandName || '',
        industry: req.body.industry || 'general',
        category: req.body.category || ''
      }
    });

    // Save to database
    await prisma.keywordIntelligenceRecord.upsert({
      where: { seoIntelligenceId: seoIntelligence.id },
      create: {
        seoIntelligenceId: seoIntelligence.id,
        primaryKeywords: keywordIntelligence.primaryKeywords || [],
        secondaryKeywords: keywordIntelligence.secondaryKeywords || [],
        longTailKeywords: keywordIntelligence.longTailKeywords || [],
        questionKeywords: keywordIntelligence.questionKeywords || [],
        clusters: keywordIntelligence.clusters || [],
        competitorKeywords: keywordIntelligence.competitorKeywords || [],
        contentOpportunities: keywordIntelligence.contentOpportunities || [],
        geoKeywords: keywordIntelligence.geoKeywords || [],
        totalKeywords: keywordIntelligence.metadata.totalKeywords || 0,
        clustersCount: keywordIntelligence.metadata.clustersCount || 0,
        opportunitiesCount: keywordIntelligence.metadata.opportunitiesCount || 0
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
        totalKeywords: keywordIntelligence.metadata.totalKeywords || 0,
        clustersCount: keywordIntelligence.metadata.clustersCount || 0,
        opportunitiesCount: keywordIntelligence.metadata.opportunitiesCount || 0,
        updatedAt: new Date()
      }
    });

    return res.json({
      success: true,
      data: keywordIntelligence
    });

  } catch (error) {
    console.error('Error regenerating keyword intelligence:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to regenerate keyword intelligence' 
    });
  }
};

// ============================================
// GEO INTELLIGENCE ENDPOINTS
// ============================================

// Get GEO intelligence for a chat
export const getGeoIntelligence = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;

    if (!chatId || !userId) {
      return res.status(400).json({ success: false, error: 'Missing chatId or user' });
    }

    // Validate chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    // Get SEO Intelligence with GEO intelligence
    const seoIntelligence = await prisma.seoIntelligence.findUnique({
      where: { chatId },
      include: {
        geoIntelligence: true
      }
    });

    if (!seoIntelligence) {
      return res.status(404).json({ 
        success: false, 
        error: 'SEO Intelligence not found. Run SEO analysis first.' 
      });
    }

    if (!seoIntelligence.geoIntelligence) {
      return res.status(404).json({ 
        success: false, 
        error: 'GEO intelligence not found. It will be generated in the next SEO analysis run.' 
      });
    }

    return res.json({
      success: true,
      data: {
        ...seoIntelligence.geoIntelligence,
        websiteUrl: seoIntelligence.websiteUrl
      }
    });

  } catch (error) {
    console.error('Error getting GEO intelligence:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get GEO intelligence' 
    });
  }
};

// Regenerate GEO intelligence
export const regenerateGeoIntelligence = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const { productName, industry } = req.body || {};

    if (!chatId || !userId) {
      return res.status(400).json({ success: false, error: 'Missing chatId or user' });
    }

    // Validate chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    // Get SEO Intelligence with all data
    const seoIntelligence = await prisma.seoIntelligence.findUnique({
      where: { chatId },
      include: {
        rawCrawlData: { take: 1, orderBy: { scrapedAt: 'desc' } },
        technicalAuditDetail: true
      }
    });

    if (!seoIntelligence) {
      return res.status(404).json({ 
        success: false, 
        error: 'SEO Intelligence not found. Run SEO analysis first.' 
      });
    }

    if (!seoIntelligence.rawCrawlData || seoIntelligence.rawCrawlData.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No crawl data available. Run SEO analysis first.' 
      });
    }

    // Reconstruct website data from raw crawl
    const rawData = seoIntelligence.rawCrawlData[0];
    const websiteData = {
      text: rawData.text || '',
      html: rawData.html || '',
      metadata: rawData.metadata || {},
      technical: rawData.technical || {},
      content: rawData.content || {},
      structured: rawData.structured || {}
    };

    // Get technical audit
    const technicalAudit = seoIntelligence.technicalAuditDetail?.auditData || {};

    // Import GEO intelligence service
    const { generateGeoIntelligence } = await import('../../services/seo/geo-intelligence.service.js');

    // Generate GEO intelligence
    const geoIntelligence = await generateGeoIntelligence({
      websiteData,
      technicalAudit,
      productName: productName || chat.productName || 'Product',
      industry: industry || 'Technology',
      websiteUrl: seoIntelligence.websiteUrl
    });

    // Save to database
    await prisma.geoIntelligenceRecord.upsert({
      where: { seoIntelligenceId: seoIntelligence.id },
      create: {
        seoIntelligenceId: seoIntelligence.id,
        aiVisibilityScore: geoIntelligence.aiVisibilityScore,
        chatGptScore: geoIntelligence.chatGptScore,
        geminiScore: geoIntelligence.geminiScore,
        claudeScore: geoIntelligence.claudeScore,
        perplexityScore: geoIntelligence.perplexityScore,
        googleAiOverviewScore: geoIntelligence.googleAiOverviewScore,
        entityCoverageScore: geoIntelligence.entityCoverageScore,
        knowledgeGraphReadinessScore: geoIntelligence.knowledgeGraphReadinessScore,
        citationReadinessScore: geoIntelligence.citationReadinessScore,
        answerabilityScore: geoIntelligence.answerabilityScore,
        topicalAuthorityScore: geoIntelligence.topicalAuthorityScore,
        entities: geoIntelligence.entities || [],
        knowledgeGraphEntities: geoIntelligence.knowledgeGraphEntities || [],
        citationOpportunities: geoIntelligence.citationOpportunities || [],
        faqOpportunities: geoIntelligence.faqOpportunities || [],
        aiContentOpportunities: geoIntelligence.aiContentOpportunities || [],
        trustSignals: geoIntelligence.trustSignals || {},
        recommendations: geoIntelligence.recommendations || {}
      },
      update: {
        aiVisibilityScore: geoIntelligence.aiVisibilityScore,
        chatGptScore: geoIntelligence.chatGptScore,
        geminiScore: geoIntelligence.geminiScore,
        claudeScore: geoIntelligence.claudeScore,
        perplexityScore: geoIntelligence.perplexityScore,
        googleAiOverviewScore: geoIntelligence.googleAiOverviewScore,
        entityCoverageScore: geoIntelligence.entityCoverageScore,
        knowledgeGraphReadinessScore: geoIntelligence.knowledgeGraphReadinessScore,
        citationReadinessScore: geoIntelligence.citationReadinessScore,
        answerabilityScore: geoIntelligence.answerabilityScore,
        topicalAuthorityScore: geoIntelligence.topicalAuthorityScore,
        entities: geoIntelligence.entities || [],
        knowledgeGraphEntities: geoIntelligence.knowledgeGraphEntities || [],
        citationOpportunities: geoIntelligence.citationOpportunities || [],
        faqOpportunities: geoIntelligence.faqOpportunities || [],
        aiContentOpportunities: geoIntelligence.aiContentOpportunities || [],
        trustSignals: geoIntelligence.trustSignals || {},
        recommendations: geoIntelligence.recommendations || {},
        updatedAt: new Date()
      }
    });

    return res.json({
      success: true,
      data: geoIntelligence
    });

  } catch (error) {
    console.error('Error regenerating GEO intelligence:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to regenerate GEO intelligence' 
    });
  }
};

// ============================================
// COMPETITOR SEO INTELLIGENCE ENDPOINTS
// ============================================

// Get competitor SEO intelligence for a chat
export const getCompetitorIntelligence = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;

    if (!chatId || !userId) {
      return res.status(400).json({ success: false, error: 'Missing chatId or user' });
    }

    // Validate chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    // Get SEO Intelligence with competitor intelligence
    const seoIntelligence = await prisma.seoIntelligence.findUnique({
      where: { chatId },
      include: {
        competitorSeoRecord: true
      }
    });

    if (!seoIntelligence) {
      return res.status(404).json({ 
        success: false, 
        error: 'SEO Intelligence not found. Run SEO analysis first.' 
      });
    }

    if (!seoIntelligence.competitorSeoRecord) {
      return res.status(404).json({ 
        success: false, 
        error: 'Competitor intelligence not found. It will be generated in the next SEO analysis run.' 
      });
    }

    return res.json({
      success: true,
      data: {
        ...seoIntelligence.competitorSeoRecord,
        websiteUrl: seoIntelligence.websiteUrl
      }
    });

  } catch (error) {
    console.error('Error getting competitor intelligence:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get competitor intelligence' 
    });
  }
};

// Regenerate competitor SEO intelligence
export const regenerateCompetitorIntelligence = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const { productName, industry } = req.body || {};

    if (!chatId || !userId) {
      return res.status(400).json({ success: false, error: 'Missing chatId or user' });
    }

    // Validate chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    // Get SEO Intelligence with all necessary data
    const seoIntelligence = await prisma.seoIntelligence.findUnique({
      where: { chatId },
      include: {
        rawCrawlData: { take: 1, orderBy: { scrapedAt: 'desc' } },
        keywordIntelligence: true,
        geoIntelligence: true
      }
    });

    if (!seoIntelligence) {
      return res.status(404).json({ 
        success: false, 
        error: 'SEO Intelligence not found. Run SEO analysis first.' 
      });
    }

    if (!seoIntelligence.rawCrawlData || seoIntelligence.rawCrawlData.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No crawl data available. Run SEO analysis first.' 
      });
    }

    // Reconstruct website data from raw crawl
    const rawData = seoIntelligence.rawCrawlData[0];
    const websiteData = {
      text: rawData.text || '',
      html: rawData.html || '',
      metadata: rawData.metadata || {},
      technical: rawData.technical || {},
      content: rawData.content || {},
      structured: rawData.structured || {}
    };

    // Get keyword and GEO intelligence
    const keywordIntelligence = seoIntelligence.keywordIntelligence || {};
    const geoIntelligence = seoIntelligence.geoIntelligence || {};

    // Import competitor SEO intelligence service
    const { generateCompetitorSeoIntelligence } = await import('../../services/seo/competitor-seo-intelligence.service.js');

    // Generate competitor intelligence
    const competitorIntelligence = await generateCompetitorSeoIntelligence({
      websiteUrl: seoIntelligence.websiteUrl,
      productName: productName || chat.productName || 'Product',
      industry: industry || 'Technology',
      keywordIntelligence,
      geoIntelligence,
      websiteData
    });

    // Save to database
    await prisma.competitorSeoRecord.upsert({
      where: { seoIntelligenceId: seoIntelligence.id },
      create: {
        seoIntelligenceId: seoIntelligence.id,
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

    return res.json({
      success: true,
      data: competitorIntelligence
    });

  } catch (error) {
    console.error('Error regenerating competitor intelligence:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to regenerate competitor intelligence' 
    });
  }
};

// ============================================
// CONTENT GAP INTELLIGENCE ENDPOINTS
// ============================================

export const getContentGapsHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing chatId or user' });
  }

  try {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    const contentGaps = await getContentGapsByChat(chatId);
    return res.json({ success: true, data: contentGaps });
  } catch (error) {
    console.error('Error getting content gaps:', error);
    return res.status(500).json({ success: false, error: 'Failed to get content gaps' });
  }
};

export const runContentGapsHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing chatId or user' });
  }

  try {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    const contentGaps = await runContentGapAnalysis({ chatId, userId });
    return res.json({ success: true, data: contentGaps });
  } catch (error) {
    console.error('Error running content gap analysis:', error);
    return res.status(500).json({ success: false, error: 'Failed to run content gap analysis' });
  }
};

// ============================================
// BLOG INTELLIGENCE ENDPOINTS
// ============================================

export const getBlogsHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing chatId or user' });
  }

  try {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    const blogs = await getBlogsByChat(chatId);
    return res.json({ success: true, data: blogs });
  } catch (error) {
    console.error('Error getting blog intelligence:', error);
    return res.status(500).json({ success: false, error: 'Failed to get blog intelligence' });
  }
};

export const runBlogsHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing chatId or user' });
  }

  try {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    const blogs = await runBlogAnalysis({ chatId, userId });
    return res.json({ success: true, data: blogs });
  } catch (error) {
    console.error('Error running blog analysis:', error);
    return res.status(500).json({ success: false, error: 'Failed to run blog analysis' });
  }
};

// ============================================
// EXECUTIVE DASHBOARD ENDPOINTS
// ============================================

export const getDashboardHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing chatId or user' });
  }

  try {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    const dashboard = await getExecutiveDashboardByChat(chatId);
    return res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Error getting executive dashboard:', error);
    return res.status(500).json({ success: false, error: 'Failed to get executive dashboard' });
  }
};

export const runDashboardHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: 'Missing chatId or user' });
  }

  try {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });

    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    const dashboard = await runExecutiveDashboardAnalysis({ chatId, userId });
    return res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Error running executive dashboard analysis:', error);
    return res.status(500).json({ success: false, error: 'Failed to run executive dashboard analysis' });
  }
};
