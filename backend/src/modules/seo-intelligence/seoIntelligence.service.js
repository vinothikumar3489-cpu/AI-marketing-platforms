import { prisma } from '../../config/prisma.js';
import fetch from 'node-fetch';
import { scrapeWebsite } from '../../services/scraping/unified-scraper.service.js';
import { analyzeTechnicalSeo } from '../../services/scraping/technical-seo-analyzer.service.js';
import { calculateSeoScores, generatePriorityRecommendations } from '../../services/scoring/seo-scorer.service.js';
import { generateKeywordIntelligence } from '../../services/seo/keyword-intelligence.service.js';
import { generateGeoIntelligence } from '../../services/seo/geo-intelligence.service.js';
import { generateCompetitorSeoIntelligence } from '../../services/seo/competitor-seo-intelligence.service.js';
import { generateContentGapIntelligence } from '../../services/seo/content-gap-engine.service.js';
import { generateBlogIntelligence } from '../../services/seo/blog-intelligence.service.js';
import { generateExecutiveDashboard } from '../../services/seo/executive-dashboard-generator.service.js';
import { deriveWebsiteIdentity } from '../../utils/seo-identity.util.js';
import { collectResearchData } from '../../services/intelligence/research-orchestrator.service.js';
import { asArray } from '../../utils/text.util.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

// ============================================
// MAIN SEO ANALYSIS FUNCTION
// ============================================

export async function generateCompleteSeoIntelligence({ chatId, userId, websiteUrl, chat }) {
  const runId = `seo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  console.log('');
  console.log('[SEO API] run started');
  console.log('[SEO API] runId:', runId);
  console.log('[SEO API] chatId:', chatId);
  console.log('[SEO API] websiteUrl:', websiteUrl);
  console.log('[SEO API] DataForSEO configured:', !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD));
  console.log('[SEO API] Tavily configured:', !!process.env.TAVILY_API_KEY);
  console.log('[SEO API] Exa configured:', !!process.env.EXA_API_KEY);
  console.log('[SEO API] Firecrawl configured:', !!process.env.FIRECRAWL_API_KEY);
  console.log('[SEO API] PageSpeed configured:', !!process.env.PAGESPEED_API_KEY);
  console.log('');

  // Add overall timeout to prevent hanging forever (5 minutes)
  const SEO_TIMEOUT = 5 * 60 * 1000;
  let timeoutHandle = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`SEO analysis timed out after ${SEO_TIMEOUT/1000}s`));
    }, SEO_TIMEOUT);
  });

  // Declare all variables in outer scope for use in catch block
  let parsedKeywordIntelligence = null;
  let parsedGeoIntelligence = null;
  let parsedCompetitorIntelligence = null;
  let parsedContentGapIntelligence = null;
  let parsedBlogIntelligence = null;
  let technicalAudit = null;
  let keywordIntelligence = null;
  let competitorIntelligence = null;
  let contentGapIntelligence = null;
  let blogIntelligence = null;
  let geoIntelligence = null;
  let executiveDashboard = null;
  let scoreBreakdown = null;
  let identity = null;
  let researchData = null;
  let websiteData = null;
  let seoScores = null;

  try {
    // Step 1: Collect research data using orchestrator (single source of truth)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [SEO Intelligence] Step 1: Collecting research data via orchestrator...');
    }
    researchData = await collectResearchData({
      websiteUrl,
      productName: chat?.productName || '',
      companyName: chat?.title || ''
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ [SEO Intelligence] Research data collected:', {
        hasWebsite: !!researchData.websiteContent,
        hasTechnical: !!researchData.technical,
        competitorsCount: researchData.competitors.length,
        keywordsCount: researchData.keywords.length
      });
    }
    console.log('[SEO API] Firecrawl:', researchData.websiteContent ? 'success' : 'fail');
    console.log('[SEO API] Tavily:', researchData.competitors.length > 0 ? 'success' : 'fail/empty');

    // Step 2: Scrape website if not already done by orchestrator
    if (researchData.websiteContent) {
      websiteData = researchData.websiteContent;
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ [SEO Intelligence] Using website content from orchestrator');
      }
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 [SEO Intelligence] Step 2: Scraping website...');
      }
      const scrapeResult = await scrapeWebsite(websiteUrl, {
        timeout: 30000,
        extractSchema: true,
        extractImages: true,
        extractLinks: true
      });

      if (!scrapeResult.success) {
        throw new Error('Failed to scrape website: ' + scrapeResult.error);
      }

      websiteData = scrapeResult.data;
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ [SEO Intelligence] Website scraped successfully');
      }
    }

    // Step 3: Derive true identity of the website
    identity = deriveWebsiteIdentity({ websiteUrl, scrapedData: websiteData, chat });
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ [SEO Identity] Derived identity:', identity);
    }

    // Step 4: Technical SEO Analysis (use orchestrator data if available)
    if (researchData.technical) {
      technicalAudit = researchData.technical;
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ [SEO Intelligence] Using technical audit from orchestrator');
      }
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 [SEO Intelligence] Step 4: Analyzing technical SEO...');
      }
      technicalAudit = await analyzeTechnicalSeo(websiteData, websiteUrl);
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ [SEO Intelligence] Technical audit complete. Score:', technicalAudit.scores.overall);
      }
    }
    console.log('[SEO API] PageSpeed:', technicalAudit?.scores?.overall ? 'success' : 'fail/timeout');

    // Step 5: Calculate multi-dimensional SEO scores
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [SEO Intelligence] Step 5: Calculating SEO scores...');
    }
    scoreBreakdown = calculateSeoScores({
      technicalAudit,
      scrapedData: websiteData,
      keywordData: researchData.keywords,
      competitorData: researchData.competitors,
      geoData: null,
      contentData: null
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ [SEO Intelligence] Score breakdown:', scoreBreakdown);
    }

    // Step 6: Generate keyword intelligence (use orchestrator keywords if available)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [SEO Intelligence] Step 6: Generating keyword intelligence...');
    }
    try {
      keywordIntelligence = await generateKeywordIntelligence({
        websiteData,
        competitorData: researchData.competitors || [],
        identity,
        orchestratorKeywords: researchData.keywords
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ [SEO Intelligence] Keyword intelligence generated:', {
          totalKeywords: keywordIntelligence?.metadata?.totalKeywords,
          clusters: keywordIntelligence?.metadata?.clustersCount,
          opportunities: keywordIntelligence?.metadata?.opportunitiesCount
        });
      }
    } catch (kwError) {
      console.error('❌ [SEO Intelligence] Keyword intelligence failed:', kwError);
      keywordIntelligence = { primaryKeywords: [], secondaryKeywords: [], longTailKeywords: [], questionKeywords: [], clusters: [], competitorKeywords: [], contentOpportunities: [], geoKeywords: [], metadata: { totalKeywords: 0, clustersCount: 0, opportunitiesCount: 0 } };
    }
    console.log('[SEO API] DataForSEO:', (keywordIntelligence?.metadata?.isFromDataForSEO || keywordIntelligence?.isFromDataForSEO) ? 'success' : 'fail/unavailable');
    console.log('[SEO API] Keyword primary count:', keywordIntelligence?.primaryKeywords?.length || 0, '| secondary:', keywordIntelligence?.secondaryKeywords?.length || 0, '| clusters:', keywordIntelligence?.clusters?.length || 0);
    if (process.env.NODE_ENV !== 'production') {
      // ==== DEBUG: Keyword Intel output ====
      console.log('===== KEYWORD INTELLIGENCE OUTPUT =====');
      const safeKW = asArray(keywordIntelligence?.primaryKeywords);
      console.log('primaryKeywords:', safeKW.length, safeKW.length > 0 ? '(sample: ' + JSON.stringify(safeKW[0]) + ')' : '(empty)');
      console.log('secondaryKeywords:', asArray(keywordIntelligence?.secondaryKeywords).length);
      console.log('longTailKeywords:', asArray(keywordIntelligence?.longTailKeywords).length);
      console.log('metadata:', JSON.stringify(keywordIntelligence?.metadata));
      console.log('All top-level keys:', Object.keys(keywordIntelligence || {}));
      console.log('===== END KEYWORD INTEL OUTPUT =====');
    }

    // Step 7: Generate GEO intelligence
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [SEO Intelligence] Step 7: Generating GEO intelligence...');
    }
    try {
      geoIntelligence = await generateGeoIntelligence({
        websiteData,
        technicalAudit,
        identity
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ [SEO Intelligence] GEO intelligence generated:', {
          aiVisibilityScore: geoIntelligence?.aiVisibilityScore,
          entities: geoIntelligence?.metadata?.totalEntities,
          opportunities: geoIntelligence?.metadata?.totalOpportunities
        });
      }
    } catch (geoError) {
      console.error('❌ [SEO Intelligence] GEO intelligence failed:', geoError);
      geoIntelligence = { aiVisibilityScore: 0, chatGptScore: 0, geminiScore: 0, claudeScore: 0, perplexityScore: 0, googleAiOverviewScore: 0, entityCoverageScore: 0, knowledgeGraphReadinessScore: 0, citationReadinessScore: 0, answerabilityScore: 0, topicalAuthorityScore: 0, entities: [], knowledgeGraphEntities: [], citationOpportunities: [], faqOpportunities: [], aiContentOpportunities: [], trustSignals: {}, recommendations: {}, metadata: { totalEntities: 0, totalOpportunities: 0 } };
    }
    if (process.env.NODE_ENV !== 'production') {
      // ==== DEBUG: GEO Intel output ====
      console.log('===== GEO INTELLIGENCE OUTPUT =====');
      console.log('aiVisibilityScore:', geoIntelligence?.aiVisibilityScore);
      console.log('entities count:', asArray(geoIntelligence?.entities).length);
      console.log('metadata:', JSON.stringify(geoIntelligence?.metadata));
      console.log('All top-level keys:', Object.keys(geoIntelligence || {}));
      console.log('===== END GEO INTEL OUTPUT =====');
    }

    // Step 8: Generate Competitor SEO intelligence (use orchestrator competitors)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [SEO Intelligence] Step 8: Generating competitor intelligence...');
    }
    try {
      competitorIntelligence = await generateCompetitorSeoIntelligence({
        keywordIntelligence,
        geoIntelligence,
        websiteData,
        identity,
        orchestratorCompetitors: researchData.competitors
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ [SEO Intelligence] Competitor intelligence generated:', {
          totalCompetitors: competitorIntelligence?.metadata?.totalCompetitors,
          keywordGaps: competitorIntelligence?.keywordGaps?.summary?.totalMissing || 0,
          contentGaps: competitorIntelligence?.contentGaps?.length || 0
        });
      }
    } catch (competitorError) {
      console.error('❌ [SEO Intelligence] Competitor intelligence failed:', competitorError);
      competitorIntelligence = {
        competitors: [],
        competitorProfiles: [],
        keywordGaps: {},
        contentGaps: [],
        authorityGaps: {},
        geoGaps: {},
        competitorMatrix: [],
        recommendations: {},
        metadata: {
          totalCompetitors: 0,
          directCompetitors: 0,
          analyzedAt: new Date().toISOString(),
          error: competitorError.message
        }
      };
    }
    console.log('[SEO API] Competitor SEO count:', competitorIntelligence?.metadata?.totalCompetitors || (competitorIntelligence?.competitorProfiles || []).length || (competitorIntelligence?.competitors || []).length || 0, '| profiles:', (competitorIntelligence?.competitorProfiles || []).length);
    if (process.env.NODE_ENV !== 'production') {
      // ==== DEBUG: Competitor Intel output ====
      console.log('===== COMPETITOR INTELLIGENCE OUTPUT =====');
      console.log('competitorProfiles:', (competitorIntelligence.competitorProfiles || []).length, (competitorIntelligence.competitorProfiles || []).length > 0 ? '(sample: ' + JSON.stringify(competitorIntelligence.competitorProfiles[0]) + ')' : '(empty)');
      console.log('competitors:', (competitorIntelligence.competitors || []).length);
      console.log('keywordGaps keys:', Object.keys(competitorIntelligence.keywordGaps || {}));
      console.log('metadata:', JSON.stringify(competitorIntelligence.metadata));
      console.log('All top-level keys:', Object.keys(competitorIntelligence));
      console.log('===== END COMPETITOR INTEL OUTPUT =====');
    }

    // Step 9: Generate Blog Intelligence (use orchestrator news/market signals)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [SEO Intelligence] Step 9: Generating blog intelligence...');
    }
    try {
      blogIntelligence = await generateBlogIntelligence({
        keywordIntelligence,
        competitorIntelligence,
        geoIntelligence,
        identity,
        orchestratorData: {
          newsSignals: researchData.newsSignals,
          marketSignals: researchData.marketSignals
        }
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ [SEO Intelligence] Blog intelligence generated:', {
          totalIdeas: blogIntelligence?.metadata?.totalIdeas || 0,
          clusters: blogIntelligence?.metadata?.clustersCount || 0
        });
      }
    } catch (blogError) {
      console.error('❌ [SEO Intelligence] Blog intelligence failed:', blogError);
      blogIntelligence = { blogIdeas: [], blogClusters: [], blogBriefs: [], publishingCalendar: {}, summary: { totalIdeas: 0, totalClusters: 0, highPriorityIdeas: 0 }, metadata: { analyzedAt: new Date().toISOString(), message: 'Blog intelligence unavailable' } };
    }
    console.log('[SEO API] Blog ideas generated count:', blogIntelligence?.summary?.totalIdeas || asArray(blogIntelligence?.blogIdeas).length || 0);
    if (process.env.NODE_ENV !== 'production') {
      // ==== DEBUG: Blog Intel output ====
      console.log('===== BLOG INTELLIGENCE OUTPUT =====');
      const safeBlogIdeas = asArray(blogIntelligence?.blogIdeas);
      console.log('blogIdeas:', safeBlogIdeas.length, safeBlogIdeas.length > 0 ? '(sample: ' + JSON.stringify(safeBlogIdeas[0]) + ')' : '(empty)');
      console.log('blogClusters:', asArray(blogIntelligence?.blogClusters).length);
      console.log('blogBriefs:', asArray(blogIntelligence?.blogBriefs).length);
      console.log('All top-level keys:', Object.keys(blogIntelligence || {}));
      console.log('===== END BLOG INTEL OUTPUT =====');
    }

    // Step 10: Generate Content Gap Intelligence
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [SEO Intelligence] Step 10: Generating content gap intelligence...');
    }
    try {
      contentGapIntelligence = await generateContentGapIntelligence({
        keywordIntelligence,
        competitorIntelligence,
        websiteData,
        identity
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ [SEO Intelligence] Content gap intelligence generated');
      }
    } catch (cgError) {
      console.error('❌ [SEO Intelligence] Content gap intelligence failed:', cgError);
      contentGapIntelligence = { contentGaps: [], landingPageIdeas: [], comparisonPageIdeas: [], faqOpportunities: [], geoContentIdeas: [], resourcePageIdeas: [], contentCalendar: {}, summary: { totalGaps: 0, totalOpportunities: 0, criticalPriority: 0, highPriority: 0 }, metadata: { analyzedAt: new Date().toISOString(), hasKeywordData: false, hasCompetitorData: false } };
    }
    console.log('[SEO API] Content gaps generated count:', contentGapIntelligence?.summary?.totalGaps || asArray(contentGapIntelligence?.contentGaps).length || 0);
    if (process.env.NODE_ENV !== 'production') {
      // ==== DEBUG: Content Gap output ====
      console.log('===== CONTENT GAP OUTPUT =====');
      const safeCG = asArray(contentGapIntelligence?.contentGaps);
      console.log('contentGaps:', safeCG.length, safeCG.length > 0 ? '(sample: ' + JSON.stringify(safeCG[0]) + ')' : '(empty)');
      console.log('landingPageIdeas:', asArray(contentGapIntelligence?.landingPageIdeas).length);
      console.log('All top-level keys:', Object.keys(contentGapIntelligence || {}));
      console.log('===== END CONTENT GAP OUTPUT =====');
    }

    // Deep parse everything before saving
    try {
      parsedKeywordIntelligence = deepParseJson(keywordIntelligence);
    } catch (e) { parsedKeywordIntelligence = keywordIntelligence || {}; }
    try {
      parsedGeoIntelligence = deepParseJson(geoIntelligence);
    } catch (e) { parsedGeoIntelligence = geoIntelligence || {}; }
    try {
      parsedCompetitorIntelligence = deepParseJson(competitorIntelligence);
    } catch (e) { parsedCompetitorIntelligence = competitorIntelligence || {}; }
    try {
      parsedBlogIntelligence = deepParseJson(blogIntelligence);
    } catch (e) { parsedBlogIntelligence = blogIntelligence || {}; }
    try {
      parsedContentGapIntelligence = deepParseJson(contentGapIntelligence);
    } catch (e) { parsedContentGapIntelligence = contentGapIntelligence || {}; }

    // Safe score mapping to prevent undefined property access
    const sb = scoreBreakdown || {};
    const safeSeoScores = {
      overall: Number(sb.overall ?? sb.overallScore ?? 0),
      technical: Number(sb.technical ?? sb.technicalScore ?? 0),
      onPage: Number(sb.onPage ?? sb.onPageScore ?? 0),
      content: Number(sb.content ?? sb.contentScore ?? 0),
      authority: Number(sb.authority ?? sb.authorityScore ?? 0),
      aiVisibility: Number(sb.aiVisibility ?? sb.aiVisibilityScore ?? 0),
      localSeo: Number(sb.localSeo ?? sb.localSeoScore ?? 0)
    };
    if (process.env.NODE_ENV !== 'production') {
      console.log('[SEO Save] safeSeoScores after fix:', safeSeoScores);
    }

    // Safe technical audit scores
    const safeTechnicalScores = technicalAudit?.scores || {};
    const safeTechnicalIssues = technicalAudit?.issues || {};

    if (process.env.NODE_ENV !== 'production') {
      console.log('[SEO Save] safeSeoScores', safeSeoScores);
      console.log('[SEO Save] safeTechnicalScores', safeTechnicalScores);
      console.log('[SEO Save] scoreBreakdown keys', Object.keys(scoreBreakdown || {}));

      // Step 12: Save to database with enhanced data
      console.log('');
      console.log('[SEO SAVE]');
      console.log('runId:', runId);
      console.log('chatId:', chatId);
      console.log('websiteUrl:', websiteUrl);
      console.log('hasTechnicalAudit:', !!technicalAudit);
      console.log('hasKeywordIntelligence:', !!(parsedKeywordIntelligence || keywordIntelligence));
      console.log('hasCompetitorIntelligence:', !!(parsedCompetitorIntelligence || competitorIntelligence));
      console.log('hasContentGapIntelligence:', !!(parsedContentGapIntelligence || contentGapIntelligence));
      console.log('hasBlogIntelligence:', !!(parsedBlogIntelligence || blogIntelligence));
      console.log('hasGeoIntelligence:', !!(parsedGeoIntelligence || geoIntelligence));
      console.log('hasExecutiveDashboard:', !!executiveDashboard);
      console.log('');
    }

    // Delete old child records BEFORE saving new ones (avoids stale/mixed data)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🧹 [SEO SAVE] Cleaning old child records for chat:', chatId);
    }
    try {
      const existingSeo = await prisma.seoIntelligence.findUnique({ where: { chatId }, select: { id: true } });
      if (existingSeo) {
        const oldId = existingSeo.id;
        await prisma.rawCrawlData.deleteMany({ where: { seoIntelligenceId: oldId } });
        await prisma.technicalSeoAudit.deleteMany({ where: { seoIntelligenceId: oldId } });
        await prisma.seoScoreBreakdown.deleteMany({ where: { seoIntelligenceId: oldId } });
        await prisma.keywordIntelligenceRecord.deleteMany({ where: { seoIntelligenceId: oldId } });
        await prisma.geoIntelligenceRecord.deleteMany({ where: { seoIntelligenceId: oldId } });
        await prisma.competitorSeoRecord.deleteMany({ where: { seoIntelligenceId: oldId } });
        await prisma.contentGapRecord.deleteMany({ where: { seoIntelligenceId: oldId } });
        await prisma.blogIntelligenceRecord.deleteMany({ where: { seoIntelligenceId: oldId } });
        await prisma.executiveSeoDashboard.deleteMany({ where: { seoIntelligenceId: oldId } });
        // Delete the main seoIntelligence record (cascade should handle children but we're being explicit)
        await prisma.seoIntelligence.deleteMany({ where: { id: oldId } });
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ [SEO SAVE] Deleted old SEO record and all children for chat:', chatId);
        }
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.log('ℹ️ [SEO SAVE] No existing SEO record found for chat:', chatId);
        }
      }
    } catch (cleanupError) {
      console.error('❌ [SEO SAVE] Cleanup error (non-fatal):', cleanupError.message);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('💾 [SEO Intelligence] Step 12: Saving to database...');
      
      // ==== SAVE AUDIT: Log every module before saving ====
      console.log('===== SAVE AUDIT =====');
      function auditModule(name, data) {
        const exists = data != null;
        const type = typeof data;
        const keys = exists && typeof data === 'object' ? Object.keys(data).join(',') : 'N/A';
        let count = 'N/A';
        if (exists && typeof data === 'object') {
          if (Array.isArray(data)) count = data.length;
          else if (data.length !== undefined) count = data.length;
          else count = Object.keys(data).length;
        }
        console.log(`  ${name}: exists=${exists} type=${type} keys=[${keys}] count=${count}`);
      }
      // Build descriptions for canonical modules
      auditModule('technical', technicalAudit);
      auditModule('keywords', parsedKeywordIntelligence || keywordIntelligence);
      auditModule('competitors', parsedCompetitorIntelligence || competitorIntelligence);
      auditModule('contentGap', parsedContentGapIntelligence || contentGapIntelligence);
      auditModule('blog', parsedBlogIntelligence || blogIntelligence);
      auditModule('geo', parsedGeoIntelligence || geoIntelligence);
      auditModule('executiveDashboard', executiveDashboard);
      auditModule('executiveStory', executiveDashboard?.metadata?.executiveStory || null);
      auditModule('scoreBreakdown', scoreBreakdown);
      auditModule('actionPlan', executiveDashboard?.executiveActionPlan || executiveDashboard?.actionPlan || null);
      console.log('===== END SAVE AUDIT =====');
      
      console.log('🔒 [SEO Intelligence] Using transactional save (old data preserved until success)');
    }
    
    const saved = await prisma.$transaction(async (tx) => {
      // First, upsert the main SEO intelligence record
      const seoRecord = await tx.seoIntelligence.upsert({
        where: { chatId },
        create: {
          chatId,
          userId,
          websiteUrl: identity.websiteUrl,
          domain: identity.domain,
          companyName: identity.companyName,
          productName: identity.productName,
          seoScore: safeSeoScores.overall,
          technicalAudit: technicalAudit,
          keywordOpportunities: keywordIntelligence,
          competitorKeywords: competitorIntelligence,
          contentGaps: contentGapIntelligence,
          aiVisibility: geoIntelligence,
          landingPageSuggestions: executiveDashboard?.landingPageOptimization || {},
          blogIdeas: blogIntelligence,
          actionPlan: executiveDashboard?.actionPlan || null,
          providers: researchData.sources,
          warnings: researchData.warnings,
          status: 'completed'
        },
        update: {
          websiteUrl: identity.websiteUrl,
          domain: identity.domain,
          companyName: identity.companyName,
          productName: identity.productName,
          seoScore: safeSeoScores.overall,
          technicalAudit: technicalAudit,
          keywordOpportunities: keywordIntelligence,
          competitorKeywords: competitorIntelligence,
        contentGaps: contentGapIntelligence,
        aiVisibility: geoIntelligence,
        landingPageSuggestions: executiveDashboard?.landingPageOptimization || {},
        blogIdeas: blogIntelligence,
        actionPlan: executiveDashboard?.actionPlan || null,
        providers: researchData.sources,
        warnings: researchData.warnings,
        status: 'completed',
        updatedAt: new Date()
      }
    });

    const savedId = seoRecord.id;

    // Save raw crawl data
    await tx.rawCrawlData.create({
      data: {
        seoIntelligenceId: savedId,
        url: websiteUrl,
        html: websiteData.html.substring(0, 100000), // Limit to 100KB
        text: websiteData.text.substring(0, 50000), // Limit to 50KB
        metadata: websiteData.metadata,
        technical: websiteData.technical,
        content: websiteData.content,
        structured: websiteData.structured,
        provider: 'orchestrator'
      }
    });

    // Save technical audit details
    await tx.technicalSeoAudit.upsert({
      where: { seoIntelligenceId: savedId },
      create: {
        seoIntelligenceId: savedId,
        auditData: technicalAudit,
        overallScore: safeTechnicalScores.overall ?? 0,
        titleScore: safeTechnicalScores.title ?? 0,
        metaScore: safeTechnicalScores.meta ?? 0,
        securityScore: safeTechnicalScores.security ?? 0,
        mobileScore: safeTechnicalScores.mobile ?? 0,
        headingScore: safeTechnicalScores.headings ?? 0,
        schemaScore: safeTechnicalScores.schema ?? 0,
        criticalIssues: safeTechnicalIssues.critical ?? [],
        highIssues: safeTechnicalIssues.high ?? [],
        mediumIssues: safeTechnicalIssues.medium ?? [],
        lowIssues: safeTechnicalIssues.low ?? [],
        recommendations: technicalAudit?.recommendations ?? []
      },
      update: {
        auditData: technicalAudit,
        overallScore: safeTechnicalScores.overall ?? 0,
        titleScore: safeTechnicalScores.title ?? 0,
        metaScore: safeTechnicalScores.meta ?? 0,
        securityScore: safeTechnicalScores.security ?? 0,
        mobileScore: safeTechnicalScores.mobile ?? 0,
        headingScore: safeTechnicalScores.headings ?? 0,
        schemaScore: safeTechnicalScores.schema ?? 0,
        criticalIssues: safeTechnicalIssues.critical ?? [],
        highIssues: safeTechnicalIssues.high ?? [],
        mediumIssues: safeTechnicalIssues.medium ?? [],
        lowIssues: safeTechnicalIssues.low ?? [],
        recommendations: technicalAudit?.recommendations ?? [],
        analyzedAt: new Date()
      }
    });

    // Save score breakdown
    await tx.seoScoreBreakdown.upsert({
      where: { seoIntelligenceId: savedId },
      create: {
        seoIntelligenceId: savedId,
        technicalScore: safeSeoScores.technical,
        onPageScore: safeSeoScores.onPage,
        contentScore: safeSeoScores.content,
        authorityScore: safeSeoScores.authority,
        aiVisibilityScore: safeSeoScores.aiVisibility,
        localSeoScore: safeSeoScores.localSeo,
        overallScore: safeSeoScores.overall,
        scoreHistory: JSON.stringify([{
          date: new Date().toISOString(),
          scores: safeSeoScores
        }])
      },
      update: {
        technicalScore: safeSeoScores.technical,
        onPageScore: safeSeoScores.onPage,
        contentScore: safeSeoScores.content,
        authorityScore: safeSeoScores.authority,
        aiVisibilityScore: safeSeoScores.aiVisibility,
        localSeoScore: safeSeoScores.localSeo,
        overallScore: safeSeoScores.overall,
        lastCalculated: new Date()
      }
    });

    // Save keyword intelligence
    await tx.keywordIntelligenceRecord.upsert({
      where: { seoIntelligenceId: savedId },
      create: {
        seoIntelligenceId: savedId,
        primaryKeywords: parsedKeywordIntelligence.primaryKeywords || [],
        secondaryKeywords: parsedKeywordIntelligence.secondaryKeywords || [],
        longTailKeywords: parsedKeywordIntelligence.longTailKeywords || [],
        questionKeywords: parsedKeywordIntelligence.questionKeywords || [],
        clusters: parsedKeywordIntelligence.clusters || [],
        competitorKeywords: parsedKeywordIntelligence.competitorKeywords || [],
        contentOpportunities: parsedKeywordIntelligence.contentOpportunities || [],
        geoKeywords: parsedKeywordIntelligence.geoKeywords || [],
        totalKeywords: parsedKeywordIntelligence.metadata.totalKeywords || 0,
        clustersCount: parsedKeywordIntelligence.metadata.clustersCount || 0,
        opportunitiesCount: parsedKeywordIntelligence.metadata.opportunitiesCount || 0
      },
      update: {
        primaryKeywords: parsedKeywordIntelligence.primaryKeywords || [],
        secondaryKeywords: parsedKeywordIntelligence.secondaryKeywords || [],
        longTailKeywords: parsedKeywordIntelligence.longTailKeywords || [],
        questionKeywords: parsedKeywordIntelligence.questionKeywords || [],
        clusters: parsedKeywordIntelligence.clusters || [],
        competitorKeywords: parsedKeywordIntelligence.competitorKeywords || [],
        contentOpportunities: parsedKeywordIntelligence.contentOpportunities || [],
        geoKeywords: parsedKeywordIntelligence.geoKeywords || [],
        totalKeywords: parsedKeywordIntelligence.metadata.totalKeywords || 0,
        clustersCount: parsedKeywordIntelligence.metadata.clustersCount || 0,
        opportunitiesCount: parsedKeywordIntelligence.metadata.opportunitiesCount || 0,
        updatedAt: new Date()
      }
    });

    // Save GEO intelligence
    await tx.geoIntelligenceRecord.upsert({
      where: { seoIntelligenceId: savedId },
      create: {
        seoIntelligenceId: savedId,
        aiVisibilityScore: parsedGeoIntelligence.aiVisibilityScore,
        chatGptScore: parsedGeoIntelligence.chatGptScore,
        geminiScore: parsedGeoIntelligence.geminiScore,
        claudeScore: parsedGeoIntelligence.claudeScore,
        perplexityScore: parsedGeoIntelligence.perplexityScore,
        googleAiOverviewScore: parsedGeoIntelligence.googleAiOverviewScore,
        entityCoverageScore: parsedGeoIntelligence.entityCoverageScore,
        knowledgeGraphReadinessScore: parsedGeoIntelligence.knowledgeGraphReadinessScore,
        citationReadinessScore: parsedGeoIntelligence.citationReadinessScore,
        answerabilityScore: parsedGeoIntelligence.answerabilityScore,
        topicalAuthorityScore: parsedGeoIntelligence.topicalAuthorityScore,
        entities: parsedGeoIntelligence.entities || [],
        knowledgeGraphEntities: parsedGeoIntelligence.knowledgeGraphEntities || [],
        citationOpportunities: parsedGeoIntelligence.citationOpportunities || [],
        faqOpportunities: parsedGeoIntelligence.faqOpportunities || [],
        aiContentOpportunities: parsedGeoIntelligence.aiContentOpportunities || [],
        trustSignals: parsedGeoIntelligence.trustSignals || {},
        recommendations: parsedGeoIntelligence.recommendations || {}
      },
      update: {
        aiVisibilityScore: parsedGeoIntelligence.aiVisibilityScore,
        chatGptScore: parsedGeoIntelligence.chatGptScore,
        geminiScore: parsedGeoIntelligence.geminiScore,
        claudeScore: parsedGeoIntelligence.claudeScore,
        perplexityScore: parsedGeoIntelligence.perplexityScore,
        googleAiOverviewScore: parsedGeoIntelligence.googleAiOverviewScore,
        entityCoverageScore: parsedGeoIntelligence.entityCoverageScore,
        knowledgeGraphReadinessScore: parsedGeoIntelligence.knowledgeGraphReadinessScore,
        citationReadinessScore: parsedGeoIntelligence.citationReadinessScore,
        answerabilityScore: parsedGeoIntelligence.answerabilityScore,
        topicalAuthorityScore: parsedGeoIntelligence.topicalAuthorityScore,
        entities: parsedGeoIntelligence.entities || [],
        knowledgeGraphEntities: parsedGeoIntelligence.knowledgeGraphEntities || [],
        citationOpportunities: parsedGeoIntelligence.citationOpportunities || [],
        faqOpportunities: parsedGeoIntelligence.faqOpportunities || [],
        aiContentOpportunities: parsedGeoIntelligence.aiContentOpportunities || [],
        trustSignals: parsedGeoIntelligence.trustSignals || {},
        recommendations: parsedGeoIntelligence.recommendations || {},
        updatedAt: new Date()
      }
    });

    // Save Competitor SEO intelligence
    await tx.competitorSeoRecord.upsert({
      where: { seoIntelligenceId: savedId },
      create: {
        seoIntelligenceId: savedId,
        competitors: parsedCompetitorIntelligence.competitors || [],
        competitorProfiles: parsedCompetitorIntelligence.competitorProfiles || [],
        keywordGaps: parsedCompetitorIntelligence.keywordGaps || {},
        contentGaps: parsedCompetitorIntelligence.contentGaps || [],
        authorityGaps: parsedCompetitorIntelligence.authorityGaps || {},
        geoGaps: parsedCompetitorIntelligence.geoGaps || {},
        competitorMatrix: parsedCompetitorIntelligence.competitorMatrix || [],
        recommendations: parsedCompetitorIntelligence.recommendations || {},
        metadata: parsedCompetitorIntelligence.metadata || {}
      },
      update: {
        competitors: parsedCompetitorIntelligence.competitors || [],
        competitorProfiles: parsedCompetitorIntelligence.competitorProfiles || [],
        keywordGaps: parsedCompetitorIntelligence.keywordGaps || {},
        contentGaps: parsedCompetitorIntelligence.contentGaps || [],
        authorityGaps: parsedCompetitorIntelligence.authorityGaps || {},
        geoGaps: parsedCompetitorIntelligence.geoGaps || {},
        competitorMatrix: parsedCompetitorIntelligence.competitorMatrix || [],
        recommendations: parsedCompetitorIntelligence.recommendations || {},
        metadata: parsedCompetitorIntelligence.metadata || {},
        updatedAt: new Date()
      }
    });

    // Step 4e: Content Gap Intelligence - use pre-generated data
    console.log('🔍 [SEO Intelligence] Step 4e: Saving content gap analysis...');

    await tx.contentGapRecord.upsert({
      where: { seoIntelligenceId: savedId },
      create: {
        seoIntelligenceId: savedId,
        contentGaps: parsedContentGapIntelligence.contentGaps || parsedContentGapIntelligence.missingPages || [],
        landingPageIdeas: parsedContentGapIntelligence.landingPageIdeas || [],
        comparisonPageIdeas: parsedContentGapIntelligence.comparisonPageIdeas || [],
        faqOpportunities: parsedContentGapIntelligence.faqOpportunities || [],
        geoContentIdeas: parsedContentGapIntelligence.geoContentIdeas || [],
        resourcePageIdeas: parsedContentGapIntelligence.resourcePageIdeas || [],
        contentCalendar: parsedContentGapIntelligence.contentCalendar || {},
        summary: parsedContentGapIntelligence.summary || {}
      },
      update: {
        contentGaps: parsedContentGapIntelligence.contentGaps || parsedContentGapIntelligence.missingPages || [],
        landingPageIdeas: parsedContentGapIntelligence.landingPageIdeas || [],
        comparisonPageIdeas: parsedContentGapIntelligence.comparisonPageIdeas || [],
        faqOpportunities: parsedContentGapIntelligence.faqOpportunities || [],
        geoContentIdeas: parsedContentGapIntelligence.geoContentIdeas || [],
        resourcePageIdeas: parsedContentGapIntelligence.resourcePageIdeas || [],
        contentCalendar: parsedContentGapIntelligence.contentCalendar || {},
        summary: parsedContentGapIntelligence.summary || {},
        updatedAt: new Date()
      }
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ [SEO Intelligence] Content gaps saved');
    }

    // Step 4f: Blog Intelligence - use pre-generated data
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [SEO Intelligence] Step 4f: Saving blog intelligence...');
    }

    await tx.blogIntelligenceRecord.upsert({
      where: { seoIntelligenceId: savedId },
      create: {
        seoIntelligenceId: savedId,
        blogIdeas: parsedBlogIntelligence.blogIdeas || [],
        blogClusters: parsedBlogIntelligence.blogClusters || [],
        blogBriefs: parsedBlogIntelligence.blogBriefs || [],
        publishingCalendar: parsedBlogIntelligence.publishingCalendar || {},
        summary: parsedBlogIntelligence.summary || {},
        metadata: parsedBlogIntelligence.metadata || {}
      },
      update: {
        blogIdeas: parsedBlogIntelligence.blogIdeas || [],
        blogClusters: parsedBlogIntelligence.blogClusters || [],
        blogBriefs: parsedBlogIntelligence.blogBriefs || [],
        publishingCalendar: parsedBlogIntelligence.publishingCalendar || {},
        summary: parsedBlogIntelligence.summary || {},
        metadata: parsedBlogIntelligence.metadata || {},
        updatedAt: new Date()
      }
    });
    console.log('✅ [SEO Intelligence] Blog intelligence saved:', parsedBlogIntelligence.blogIdeas?.length || 0, 'ideas');
    console.log('✅ [SEO Intelligence] All data saved to database');
    console.log('[SEO API] Final SEO save completed');

    return seoRecord;
  });

  // ==== DB VERIFICATION: Read back and verify every relation (AFTER transaction commits) ====
  let verifySaved = null;
  if (process.env.NODE_ENV !== 'production') {
    console.log('===== DB VERIFICATION (Reading back from database) =====');
  }
  try {
    verifySaved = await prisma.seoIntelligence.findFirst({
      where: { chatId, userId },
      include: {
        technicalAuditDetail: true,
        scoreBreakdown: true,
        keywordIntelligence: true,
        geoIntelligence: true,
        competitorSeoRecord: true,
        contentGapRecord: true,
        blogIntelligenceRecord: true,
        executiveDashboard: true
      }
    });
    if (verifySaved) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('DB VERIFICATION: SeoIntelligence id=' + verifySaved.id);
        console.log('DB VERIFICATION: technicalAuditDetail=' + (!!verifySaved.technicalAuditDetail) + ' count=' + JSON.stringify(asArray(verifySaved.technicalAuditDetail?.issues || verifySaved.technicalAuditDetail?.criticalIssues || []).length));
        console.log('DB VERIFICATION: scoreBreakdown=' + (!!verifySaved.scoreBreakdown) + ' overall=' + (verifySaved.scoreBreakdown?.overallScore ?? verifySaved.scoreBreakdown?.overall ?? 'N/A'));
        console.log('DB VERIFICATION: keywordIntelligence=' + (!!verifySaved.keywordIntelligence) + ' primary=' + asArray(verifySaved.keywordIntelligence?.primaryKeywords).length);
        console.log('DB VERIFICATION: geoIntelligence=' + (!!verifySaved.geoIntelligence) + ' aiVisibility=' + (verifySaved.geoIntelligence?.aiVisibilityScore ?? 'N/A'));
        console.log('DB VERIFICATION: competitorSeoRecord=' + (!!verifySaved.competitorSeoRecord) + ' profiles=' + asArray(verifySaved.competitorSeoRecord?.competitorProfiles).length);
        console.log('DB VERIFICATION: contentGapRecord=' + (!!verifySaved.contentGapRecord) + ' gaps=' + asArray(verifySaved.contentGapRecord?.contentGaps).length);
        console.log('DB VERIFICATION: blogIntelligenceRecord=' + (!!verifySaved.blogIntelligenceRecord) + ' ideas=' + asArray(verifySaved.blogIntelligenceRecord?.blogIdeas).length);
        console.log('DB VERIFICATION: executiveDashboard=' + (!!verifySaved.executiveDashboard) + ' keys=' + Object.keys(verifySaved.executiveDashboard || {}).join(','));
        console.log('DB VERIFICATION: executiveStory=' + (!!verifySaved.executiveDashboard?.metadata?.executiveStory));
        console.log('DB VERIFICATION: actionPlan=' + (!!verifySaved.executiveDashboard?.executiveActionPlan || !!verifySaved.executiveDashboard?.actionPlan));
        console.log('DB VERIFICATION: ✓ All relations verified');
      }
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.log('DB VERIFICATION: ✗ SeoIntelligence NOT FOUND after save!');
      }
    }
  } catch (verifyErr) {
    console.error('DB VERIFICATION: ✗ Query failed:', verifyErr.message);
  }
    if (process.env.NODE_ENV !== 'production') {
      console.log('===== END DB VERIFICATION =====');

      // ==== SEO SAVE VERIFY ====
      console.log('');
      console.log('[SEO SAVE VERIFY]');
      console.log('runId:', runId);
      console.log('chatId:', chatId);
      console.log('hasSeoIntelligence:', !!verifySaved);
      console.log('savedSeoId:', verifySaved?.id || 'N/A');
      console.log('savedKeywordCount:', (verifySaved?.keywordIntelligence?.primaryKeywords || []).length);
      console.log('savedCompetitorCount:', (verifySaved?.competitorSeoRecord?.competitorProfiles || []).length);
      console.log('savedContentGapCount:', (verifySaved?.contentGapRecord?.contentGaps || []).length);
      console.log('savedBlogCount:', (verifySaved?.blogIntelligenceRecord?.blogIdeas || []).length);
      console.log('');
    }

  // Step 4g: Executive Dashboard (AFTER transaction commits)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔍 [SEO Intelligence] Step 4g: Generating executive dashboard...');
  }

  let executiveDashboardStatus = 'failed';
  let executiveDashboardError = null;
  try {
    const executiveResult = await generateExecutiveDashboard({
      seoIntelligenceId: saved.id,
      seoData: {
        technicalAudit,
        keywordIntelligence,
        competitorIntelligence,
        geoIntelligence,
        blogIntelligence,
        contentGapIntelligence,
        identity,
        researchData,
        scoreBreakdown
      }
    });
    if (!executiveResult.success) {
      console.warn('⚠️ [SEO Intelligence] Executive dashboard generation failed:', executiveResult.error);
      executiveDashboardStatus = 'failed';
      executiveDashboardError = executiveResult.error || 'Executive dashboard generation returned unsuccessful';
      executiveDashboard = null;
    } else {
      executiveDashboard = executiveResult.data || null;
      if (executiveDashboard) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ [SEO Intelligence] Executive dashboard generated successfully');
        }
        executiveDashboardStatus = 'success';
      } else {
        console.warn('⚠️ [SEO Intelligence] Executive dashboard generation returned no data');
        executiveDashboardStatus = 'no_data';
        executiveDashboardError = 'No data returned from executive dashboard generator';
      }
    }
  } catch (execError) {
    console.error('❌ [SEO Intelligence] Executive dashboard generation failed:', execError.message);
    executiveDashboardStatus = 'failed';
    executiveDashboardError = execError.message;
    // Continue without dashboard - it's optional
    executiveDashboard = null;
  }

  // saved is now the seoRecord returned from the transaction

  // Step 7: Add message to chat (non-blocking)
  try {
    await prisma.message.create({
      data: {
        chatId,
        role: 'assistant',
        content: `SEO Intelligence analysis complete for ${websiteUrl}. Overall Score: ${safeSeoScores.overall}/100`,
        analysisData: {
          summary: researchData?.overview || researchData?.seoOverview || `SEO analysis for ${websiteUrl} — Overall: ${safeSeoScores.overall}/100`,
          scores: safeSeoScores,
          provider: 'orchestrator'
        }
      }
    });
  } catch (msgError) {
    console.error('⚠️ [SEO Intelligence] Failed to create message:', msgError.message);
    // Continue - message creation is optional
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('');
    console.log('[SEO RUN COMPLETE]');
    console.log('runId:', runId);
    console.log('chatId:', chatId);
    console.log('savedId:', saved?.id || 'N/A');
    console.log('overallScore:', safeSeoScores.overall);
    console.log('========================================');
    console.log('');
  }

  console.log('[SEO API] Return data summary:', {
    hasTechnicalAudit: !!executiveDashboard,
    hasKeywords: !!parsedKeywordIntelligence,
    hasCompetitors: !!parsedCompetitorIntelligence,
    hasContentGaps: !!parsedContentGapIntelligence,
    hasBlogIdeas: !!parsedBlogIntelligence,
    hasGeo: !!parsedGeoIntelligence,
    competitorsCount: parsedCompetitorIntelligence?.metadata?.totalCompetitors || (parsedCompetitorIntelligence?.competitorProfiles || []).length || 0,
    contentGapCount: parsedContentGapIntelligence?.summary?.totalGaps || 0,
    blogIdeaCount: parsedBlogIntelligence?.summary?.totalIdeas || 0
  });

  // Return successful analysis data with canonical structure
  return {
    success: true,
    data: {
      id: saved.id,
      identity: {
        brandName: identity.brandName || identity.productName,
        companyName: identity.companyName,
        domain: identity.domain,
        websiteUrl: identity.websiteUrl,
        industry: identity.industry,
        category: identity.category,
        websiteTitle: identity.websiteTitle,
        websiteDescription: identity.websiteDescription,
        source: 'orchestrator'
      },
      technicalAudit: {
        ...technicalAudit,
        overallScore: safeTechnicalScores.overall ?? technicalAudit?.auditData?.overallScore ?? null,
        performanceScore: safeTechnicalScores.performance ?? technicalAudit?.auditData?.performanceScore ?? null,
        seoScore: safeTechnicalScores.seo ?? technicalAudit?.auditData?.seoScore ?? null,
        accessibilityScore: safeTechnicalScores.accessibility ?? technicalAudit?.auditData?.accessibilityScore ?? null,
        bestPracticesScore: safeTechnicalScores.bestPractices ?? technicalAudit?.auditData?.bestPracticesScore ?? null,
        mobileScore: safeTechnicalScores.mobile ?? technicalAudit?.auditData?.mobileScore ?? null,
        desktopScore: safeTechnicalScores.desktop ?? technicalAudit?.auditData?.desktopScore ?? null,
        source: 'orchestrator'
      },
      keywordIntelligence: parsedKeywordIntelligence || {},
      competitorIntelligence: parsedCompetitorIntelligence || {},
      contentGapAnalysis: parsedContentGapIntelligence || {},
      blogIntelligence: parsedBlogIntelligence || {},
      geoIntelligence: parsedGeoIntelligence || {},
      executiveDashboard: executiveDashboard || {},
      executiveStory: executiveDashboard?.metadata?.executiveStory || executiveDashboard?.executiveStory || null,
      actionPlan: executiveDashboard?.executiveActionPlan || executiveDashboard?.actionPlan || null,
      scoreBreakdown: safeSeoScores,
      executiveDashboardStatus,
      executiveDashboardError,
      scrapingProvider: 'orchestrator'
    }
  };

  } catch (error) {
    console.error('❌ [SEO Intelligence] Error:', error);
    
    // Extract identity for fallback
    let fallbackProductName = 'Product';
    try {
      if (websiteUrl) {
        const domain = new URL(websiteUrl).hostname.replace(/^www\./, '');
        fallbackProductName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
      }
    } catch (e) {
      // Use default if URL parsing fails
    }
    
    // Return partial results with clear error status
    return {
      success: false,
      error: error.message,
      status: 'partial_failure',
      errorMessage: error.message,
      fallback: {
        websiteUrl,
        seoScore: 0,
        status: 'error',
        errorMessage: error.message,
        productName: fallbackProductName,
        recommendations: ['Fix technical issues and try again'],
        unavailableReason: `SEO analysis failed: ${error.message}`
      },
      // Include any partial data that was generated before the error
      partialData: {
        technicalAudit: technicalAudit || null,
        keywordIntelligence: parsedKeywordIntelligence || null,
        geoIntelligence: parsedGeoIntelligence || null,
        competitorIntelligence: parsedCompetitorIntelligence || null,
        contentGapRecord: parsedContentGapIntelligence || null,
        blogIntelligenceRecord: parsedBlogIntelligence || null
      }
    };
  }
}

// Note: scrapeWebsite is now imported from unified-scraper.service.js
// Old scraping functions removed to use new unified scraper

// ============================================
// SEO RESEARCH
// ============================================

async function conductSeoResearch(productName, industry, websiteUrl) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔍 [Research] Starting SEO research');
  }

  const results = {
    competitors: [],
    keywords: [],
    trends: [],
    blogTopics: []
  };

  if (TAVILY_API_KEY) {
    try {
      // Research competitors
      const competitorResults = await searchWithTavily(`${productName} SEO competitors alternatives`);
      results.competitors = competitorResults.slice(0, 5);

      // Research keywords
      const keywordResults = await searchWithTavily(`${productName} keywords SEO ${industry}`);
      results.keywords = keywordResults.slice(0, 10);

      // Research blog topics
      const blogResults = await searchWithTavily(`${industry} blog topics content ideas`);
      results.blogTopics = blogResults.slice(0, 10);

    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️ [Research] Tavily search failed:', error.message);
      }
    }
  }

  return results;
}

async function searchWithTavily(query) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      max_results: 5
    })
  });

  if (!response.ok) throw new Error('Tavily API error');

  const data = await response.json();
  return data.results || [];
}

// ============================================
// AI-POWERED SEO ANALYSIS
// ============================================

async function generateSeoAnalysis(websiteData, technicalAudit, researchData, productName, websiteUrl) {
  const prompt = buildSeoAnalysisPrompt(websiteData, technicalAudit, researchData, productName, websiteUrl);

  let aiResponse;
  
  // Try Groq first
  if (GROQ_API_KEY) {
    try {
      aiResponse = await callGroqForSeo(prompt);
      if (aiResponse) return parseAndEnrichAnalysis(aiResponse, websiteData, researchData);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️ [AI] Groq failed:', error.message);
      }
    }
  }

  // Fallback to rule-based analysis
  if (process.env.NODE_ENV !== 'production') {
    console.log('ℹ️ [AI] Using rule-based analysis');
  }
  return generateRuleBasedAnalysis(websiteData, technicalAudit, researchData, productName, websiteUrl);
}

function buildSeoAnalysisPrompt(websiteData, technicalAudit, researchData, productName, websiteUrl) {
  return `You are an expert SEO consultant. Analyze this website and provide comprehensive SEO recommendations based on REAL DATA.

Website: ${websiteUrl}
Product: ${productName}

TECHNICAL AUDIT RESULTS:
- Overall Technical Score: ${technicalAudit.scores.overall}/100
- Title Tag: ${technicalAudit.titleTag.status} (${technicalAudit.titleTag.length} chars, Score: ${technicalAudit.titleTag.score}/100)
- Meta Description: ${technicalAudit.metaDescription.status} (${technicalAudit.metaDescription.length} chars, Score: ${technicalAudit.metaDescription.score}/100)
- HTTPS: ${technicalAudit.security.hasHTTPS ? 'Enabled' : 'MISSING - CRITICAL'}
- Mobile Friendly: ${technicalAudit.mobile.isResponsive ? 'Yes' : 'No'}
- H1 Count: ${technicalAudit.headingStructure.h1Count}
- Schema Markup: ${technicalAudit.schemaMarkup.hasSchema ? `Present (${technicalAudit.schemaMarkup.count} schemas)` : 'Missing'}
- Word Count: ${websiteData.content.wordCount}
- Internal Links: ${websiteData.content.internalLinks?.length || 0}
- Images: ${websiteData.content.imageCount} (${technicalAudit.images.withoutAlt} missing alt text)

CRITICAL ISSUES (Fix Immediately):
${technicalAudit.issues.critical.map(i => `- ${i.issue}`).join('\n') || '- None'}

HIGH PRIORITY ISSUES:
${technicalAudit.issues.high.map(i => `- ${i.issue}`).join('\n') || '- None'}

COMPETITORS FOUND:
${researchData.competitors.slice(0, 5).map(c => `- ${c.title || c.url}`).join('\n') || '- None'}

Generate a complete SEO intelligence report in valid JSON format:

{
  "seoOverview": {
    "seoScore": <0-100>,
    "strengths": ["strength1", "strength2", "strength3"],
    "weaknesses": ["weakness1", "weakness2", "weakness3"],
    "overallAssessment": "brief assessment"
  },
  "technicalAudit": {
    "criticalIssues": ["issue1", "issue2"],
    "warnings": ["warning1", "warning2"],
    "passedChecks": ["check1", "check2"],
    "recommendations": ["rec1", "rec2"]
  },
  "keywordOpportunities": [
    { "keyword": "keyword1", "intent": "commercial", "difficulty": "medium", "opportunity": "high", "reason": "why" },
    { "keyword": "keyword2", "intent": "informational", "difficulty": "low", "opportunity": "high", "reason": "why" }
  ],
  "competitorIntelligence": {
    "directCompetitors": ["comp1", "comp2"],
    "keywordGaps": ["keyword1", "keyword2"],
    "contentGaps": ["topic1", "topic2"],
    "rankingAdvantages": ["adv1", "adv2"]
  },
  "contentGaps": {
    "missingTopics": ["topic1", "topic2"],
    "comparisonPages": ["vs page1", "vs page2"],
    "useCasePages": ["use case1", "use case2"],
    "educationalContent": ["guide1", "guide2"]
  },
  "aiVisibility": {
    "aiVisibilityScore": <0-100>,
    "chatgptOptimization": ["tip1", "tip2"],
    "geminiOptimization": ["tip1", "tip2"],
    "perplexityOptimization": ["tip1", "tip2"]
  },
  "landingPageOptimization": {
    "headlineSuggestions": ["headline1", "headline2", "headline3"],
    "ctaSuggestions": ["cta1", "cta2", "cta3"],
    "trustSignals": ["signal1", "signal2"],
    "conversionTips": ["tip1", "tip2"]
  },
  "blogOpportunities": [
    { "title": "Blog Title 1", "keyword": "target keyword", "intent": "informational", "difficulty": "easy" },
    { "title": "Blog Title 2", "keyword": "target keyword", "intent": "commercial", "difficulty": "medium" }
  ],
  "actionPlan": {
    "day30": ["action1", "action2", "action3"],
    "day60": ["action1", "action2", "action3"],
    "day90": ["action1", "action2", "action3"]
  }
}

Provide ONLY valid JSON. No markdown, no explanations.`;
}

async function callGroqForSeo(prompt) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000
    })
  });

  if (!response.ok) throw new Error('Groq API error');

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) throw new Error('No content in Groq response');

  // Try to parse JSON
  try {
    return JSON.parse(content);
  } catch {
    // Extract JSON from markdown if present
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Could not parse JSON from response');
  }
}

function deepParseJson(obj) {
  if (typeof obj === 'string') {
    try {
      const parsed = JSON.parse(obj);
      if (typeof parsed === 'object' && parsed !== null) {
        return deepParseJson(parsed);
      }
    } catch (e) {
      return obj;
    }
  } else if (Array.isArray(obj)) {
    return obj.map(item => deepParseJson(item));
  } else if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepParseJson(value);
    }
    return result;
  }
  return obj;
}

function parseAndEnrichAnalysis(aiResponse, websiteData, researchData) {
  const enriched = {
    ...aiResponse,
    metadata: {
      analyzedAt: new Date().toISOString(),
      websiteDataCollected: !!websiteData.title,
      researchDataCollected: researchData.competitors.length > 0,
      providers: {
        scraping: FIRECRAWL_API_KEY ? 'firecrawl' : 'basic',
        research: TAVILY_API_KEY ? 'tavily' : 'none',
        ai: 'groq'
      },
      warnings: []
    }
  };
  return deepParseJson(enriched);
}

// ============================================
// RULE-BASED FALLBACK ANALYSIS
// ============================================

function generateRuleBasedAnalysis(websiteData, technicalAudit, researchData, productName, websiteUrl) {
  // Use technical audit for accurate scoring
  const seoScore = technicalAudit.scores.overall;
  
  const titleLength = technicalAudit.titleTag.length || 0;
  const descLength = technicalAudit.metaDescription.length || 0;
  const contentLength = websiteData.content?.wordCount || 0;

  return {
    seoOverview: {
      seoScore,
      strengths: [
        technicalAudit.security.hasHTTPS ? 'Website secured with HTTPS' : null,
        technicalAudit.mobile.isResponsive ? 'Mobile-friendly design' : null,
        technicalAudit.headingStructure.hasH1 ? 'Proper H1 heading present' : null,
        technicalAudit.schemaMarkup.hasSchema ? 'Structured data implemented' : null,
        technicalAudit.titleTag.score >= 80 ? 'Well-optimized title tag' : null,
        technicalAudit.metaDescription.score >= 80 ? 'Good meta description' : null,
        contentLength >= 1000 ? 'Substantial content length' : null
      ].filter(Boolean).slice(0, 5),
      weaknesses: [
        ...technicalAudit.issues.critical.map(i => i.issue),
        ...technicalAudit.issues.high.map(i => i.issue)
      ].slice(0, 5),
      overallAssessment: `Technical SEO score of ${seoScore}/100. ${
        seoScore >= 80 ? 'Strong SEO foundation with minor optimizations needed.' :
        seoScore >= 60 ? 'Good foundation with significant optimization opportunities.' :
        seoScore >= 40 ? 'Needs substantial SEO improvements to compete effectively.' :
        'Critical SEO issues must be addressed immediately.'
      }`
    },
    technicalAudit: {
      criticalIssues: technicalAudit.issues.critical.map(i => i.issue),
      warnings: technicalAudit.issues.high.map(i => i.issue),
      passedChecks: [
        technicalAudit.security.hasHTTPS ? 'HTTPS enabled' : null,
        technicalAudit.mobile.isResponsive ? 'Mobile responsive' : null,
        technicalAudit.headingStructure.hasH1 ? 'H1 heading present' : null,
        technicalAudit.schemaMarkup.hasSchema ? 'Schema markup present' : null,
        technicalAudit.titleTag.score >= 80 ? 'Title tag optimized' : null,
        technicalAudit.images.altPercentage >= 80 ? 'Images have alt text' : null
      ].filter(Boolean),
      recommendations: technicalAudit.recommendations.slice(0, 10).map(r => r.recommendation)
    },
    keywordOpportunities: generateKeywordOpportunities(productName, researchData),
    competitorIntelligence: {
      directCompetitors: researchData.competitors.slice(0, 3).map(c => c.title || c.url),
      keywordGaps: [
        `${productName} alternative`,
        `best ${productName} features`,
        `${productName} vs competitors`,
        `${productName} pricing`
      ],
      contentGaps: [
        'Product comparison pages',
        'Use case documentation',
        'Integration guides',
        'Customer success stories'
      ],
      rankingAdvantages: [
        'Focus on long-tail keywords',
        'Create comprehensive guides',
        'Build backlink profile'
      ]
    },
    contentGaps: {
      missingTopics: [
        `How to use ${productName}`,
        `${productName} best practices`,
        `${productName} tutorials`,
        `${productName} case studies`
      ],
      comparisonPages: [
        `${productName} vs [Competitor A]`,
        `${productName} vs [Competitor B]`,
        `${productName} alternatives`
      ],
      useCasePages: [
        `${productName} for small businesses`,
        `${productName} for enterprises`,
        `${productName} for [industry]`
      ],
      educationalContent: [
        `Complete ${productName} guide`,
        `${productName} FAQ`,
        `${productName} troubleshooting`
      ]
    },
    aiVisibility: {
      aiVisibilityScore: 45,
      chatgptOptimization: [
        'Create FAQ sections for common queries',
        'Write clear, structured content',
        'Add specific facts and figures'
      ],
      geminiOptimization: [
        'Optimize for conversational queries',
        'Include comparison data',
        'Add product specifications'
      ],
      perplexityOptimization: [
        'Cite sources and data',
        'Create detailed technical content',
        'Build authority pages'
      ]
    },
    landingPageOptimization: {
      headlineSuggestions: [
        `Transform Your [Problem] with ${productName}`,
        `The Smart Way to [Benefit]`,
        `${productName}: [Unique Value Proposition]`
      ],
      ctaSuggestions: [
        'Start Free Trial',
        'See How It Works',
        'Get Started in 60 Seconds'
      ],
      trustSignals: [
        'Add customer testimonials',
        'Display security badges',
        'Show client logos',
        'Include social proof numbers'
      ],
      conversionTips: [
        'Place CTA above the fold',
        'Reduce form fields to 3 or less',
        'Add urgency indicators',
        'Include money-back guarantee'
      ]
    },
    blogOpportunities: generateBlogOpportunities(productName),
    actionPlan: {
      day30: [
        'Fix critical technical SEO issues (title, meta, headings)',
        'Create 3-5 core product pages with optimized content',
        'Set up Google Search Console and Analytics',
        'Research and document target keywords',
        'Write first 2 blog posts targeting long-tail keywords'
      ],
      day60: [
        'Publish 4-6 more SEO-optimized blog posts',
        'Create 2-3 comparison pages',
        'Build internal linking structure',
        'Start link building campaign',
        'Optimize images and page speed'
      ],
      day90: [
        'Publish 6-8 additional blog posts',
        'Create comprehensive guides and resources',
        'Launch content promotion campaign',
        'Monitor rankings and adjust strategy',
        'Analyze competitors and fill content gaps'
      ]
    },
    metadata: {
      analyzedAt: new Date().toISOString(),
      websiteDataCollected: !!websiteData.title,
      researchDataCollected: researchData.competitors.length > 0,
      providers: {
        scraping: FIRECRAWL_API_KEY ? 'firecrawl' : 'basic',
        research: TAVILY_API_KEY ? 'tavily' : 'none',
        ai: 'rule-based'
      },
      warnings: [
        !GROQ_API_KEY ? 'AI analysis unavailable - using rule-based fallback' : null,
        !TAVILY_API_KEY ? 'Research limited - no Tavily API' : null
      ].filter(Boolean)
    }
  };
}

function generateKeywordOpportunities(productName, researchData) {
  return [
    { keyword: `${productName} tutorial`, intent: 'informational', difficulty: 'easy', opportunity: 'high', reason: 'Low competition, high search volume' },
    { keyword: `best ${productName} alternative`, intent: 'commercial', difficulty: 'medium', opportunity: 'high', reason: 'Captures competitor traffic' },
    { keyword: `${productName} pricing`, intent: 'commercial', difficulty: 'easy', opportunity: 'high', reason: 'High purchase intent' },
    { keyword: `how to use ${productName}`, intent: 'informational', difficulty: 'easy', opportunity: 'medium', reason: 'Existing user searches' },
    { keyword: `${productName} vs [competitor]`, intent: 'commercial', difficulty: 'medium', opportunity: 'high', reason: 'Comparison searches' },
    { keyword: `${productName} review`, intent: 'commercial', difficulty: 'medium', opportunity: 'medium', reason: 'Research phase traffic' },
    { keyword: `${productName} features`, intent: 'informational', difficulty: 'easy', opportunity: 'medium', reason: 'Product research' },
    { keyword: `${productName} for small business`, intent: 'commercial', difficulty: 'medium', opportunity: 'high', reason: 'Niche targeting' }
  ];
}

function generateBlogOpportunities(productName) {
  return [
    { title: `The Complete ${productName} Guide for Beginners`, keyword: `${productName} guide`, intent: 'informational', difficulty: 'easy' },
    { title: `10 Ways to Get More Value from ${productName}`, keyword: `${productName} tips`, intent: 'informational', difficulty: 'easy' },
    { title: `${productName} vs Top 5 Alternatives: Detailed Comparison`, keyword: `${productName} alternatives`, intent: 'commercial', difficulty: 'medium' },
    { title: `How [Company] Achieved [Result] Using ${productName}`, keyword: `${productName} case study`, intent: 'commercial', difficulty: 'easy' },
    { title: `${productName} Pricing Guide: Which Plan is Right for You?`, keyword: `${productName} pricing`, intent: 'commercial', difficulty: 'easy' },
    { title: `Common ${productName} Mistakes and How to Avoid Them`, keyword: `${productName} mistakes`, intent: 'informational', difficulty: 'easy' },
    { title: `${productName} Integration Guide: Connect Your Favorite Tools`, keyword: `${productName} integrations`, intent: 'informational', difficulty: 'easy' },
    { title: `Advanced ${productName} Techniques for Power Users`, keyword: `${productName} advanced`, intent: 'informational', difficulty: 'medium' },
    { title: `${productName} ROI Calculator: Measure Your Returns`, keyword: `${productName} roi`, intent: 'commercial', difficulty: 'medium' },
    { title: `Why Teams are Switching from [Competitor] to ${productName}`, keyword: `switch to ${productName}`, intent: 'commercial', difficulty: 'medium' },
    { title: `${productName} Security and Compliance: Everything You Need to Know`, keyword: `${productName} security`, intent: 'informational', difficulty: 'easy' },
    { title: `${productName} Mobile App: Features and Benefits`, keyword: `${productName} mobile`, intent: 'informational', difficulty: 'easy' },
    { title: `How to Migrate from [Competitor] to ${productName} in 5 Steps`, keyword: `migrate to ${productName}`, intent: 'commercial', difficulty: 'medium' },
    { title: `${productName} Keyboard Shortcuts to Boost Your Productivity`, keyword: `${productName} shortcuts`, intent: 'informational', difficulty: 'easy' },
    { title: `${productName} Updates: What's New in the Latest Release`, keyword: `${productName} updates`, intent: 'informational', difficulty: 'easy' },
    { title: `Building a Workflow with ${productName}: Step-by-Step Tutorial`, keyword: `${productName} workflow`, intent: 'informational', difficulty: 'easy' },
    { title: `${productName} for Remote Teams: Best Practices`, keyword: `${productName} remote work`, intent: 'informational', difficulty: 'easy' },
    { title: `${productName} API Documentation and Examples`, keyword: `${productName} api`, intent: 'informational', difficulty: 'medium' },
    { title: `${productName} Customer Success Stories and Results`, keyword: `${productName} success stories`, intent: 'commercial', difficulty: 'easy' },
    { title: `The Ultimate ${productName} Checklist for Getting Started`, keyword: `${productName} checklist`, intent: 'informational', difficulty: 'easy' }
  ];
}

function generateFallbackAnalysis(websiteUrl, productName) {
  // Create minimal fallback data structures
  const fallbackWebsiteData = {
    title: productName,
    description: '',
    html: '',
    text: '',
    metadata: { title: productName, description: '' },
    technical: {
      titleTag: productName,
      metaDescription: '',
      canonicalUrl: '',
      robotsMeta: '',
      openGraph: {},
      twitterCard: {}
    },
    content: {
      headings: [],
      wordCount: 0,
      paragraphCount: 0,
      imageCount: 0,
      linkCount: 0,
      internalLinks: [],
      externalLinks: [],
      images: []
    },
    structured: {
      jsonLd: [],
      microdata: [],
      rdfa: []
    }
  };

  // Create minimal technical audit
  const fallbackTechnicalAudit = {
    scores: {
      overall: 0,
      title: 0,
      meta: 0,
      security: 0,
      mobile: 0,
      headings: 0,
      schema: 0
    },
    titleTag: { score: 0, status: 'missing', issue: 'Could not analyze', recommendation: 'Manually review site', priority: 'high' },
    metaDescription: { score: 0, status: 'missing', issue: 'Could not analyze', recommendation: 'Manually review site', priority: 'high' },
    security: { hasHTTPS: websiteUrl.startsWith('https://'), status: 'unknown' },
    mobile: { isResponsive: false, status: 'unknown' },
    headingStructure: { h1Count: 0, hasH1: false },
    schemaMarkup: { hasSchema: false, count: 0 },
    images: { withoutAlt: 0, altPercentage: 0 },
    issues: { critical: [], high: [], medium: [], low: [] },
    recommendations: []
  };

  const fallbackResearchData = {
    competitors: [],
    keywords: [],
    trends: [],
    blogTopics: []
  };

  return generateRuleBasedAnalysis(
    fallbackWebsiteData,
    fallbackTechnicalAudit,
    fallbackResearchData,
    productName,
    websiteUrl
  );
}
