import { z } from "zod";
import { prisma } from "../config/prisma.js";

export async function getChatIntelligenceReadiness({ userId, chatId }) {
  const [productIntel, competitorIntel, campaignIntel, seoIntel, automationPlan] = await Promise.all([
    prisma.productIntelligence.findUnique({ where: { chatId } }),
    prisma.competitorIntelligence.findUnique({ where: { chatId } }),
    prisma.campaignIntelligence.findUnique({ where: { chatId } }),
    prisma.seoIntelligence.findUnique({ where: { chatId } }).catch(() => null),
    prisma.automationPlan.findUnique({ where: { chatId } }).catch(() => null),
  ]);

  return {
    hasProductIntelligence: !!productIntel,
    hasAudienceIntelligence: !!(productIntel?.audienceIntelligence && Object.keys(productIntel.audienceIntelligence).length > 0),
    hasCompetitorIntelligence: !!competitorIntel,
    hasCampaignIntelligence: !!campaignIntel,
    hasSeoIntelligence: !!seoIntel,
    hasAutomationPlan: !!automationPlan,
    contentGenerationReady: !!productIntel,
    campaignGenerationReady: !!productIntel && !!(productIntel?.audienceIntelligence || competitorIntel),
    automationGenerationReady: !!productIntel && !!campaignIntel,
  };
}

const chatSchema = z.object({
  title: z.string().min(1),
  productName: z.string().optional(),
});

export const createChat = async (req, res) => {
  try {
    const result = chatSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.errors[0].message });
    }

    const { title, productName } = result.data;
    const chat = await prisma.chat.create({
      data: {
        title,
        productName: productName || title,
        userId: req.user.id,
      },
    });

    return res.status(201).json(chat);
  } catch (error) {
    console.error(`[Controller] createChat error:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const listChats = async (req, res) => {
  try {
    const chats = await prisma.chat.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: { take: 1, orderBy: { createdAt: "desc" } },
        productIntelligence: { select: { inputJson: true, status: true } },
        seoIntelligence: { select: { websiteUrl: true, seoScore: true, updatedAt: true, scoreBreakdown: { select: { overallScore: true } } } },
      },
    });

    const enriched = chats.map(chat => {
      const input = chat.productIntelligence?.inputJson || {};
      const growthScore = chat.messages?.[0]?.analysisData?.summary?.overallGrowthScore || null;
      const seoScore = chat.seoIntelligence?.scoreBreakdown?.overallScore || chat.seoIntelligence?.seoScore || null;
      return {
        ...chat,
        companyName: input.companyName || null,
        websiteUrl: input.websiteUrl || chat.seoIntelligence?.websiteUrl || null,
        growthScore,
        seoScore,
        status: chat.productIntelligence?.status || chat.seoIntelligence ? 'analyzed' : 'draft',
      };
    });

    return res.json(enriched);
  } catch (error) {
    console.error(`[Controller] listChats error:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const getChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId: req.user.id },
      include: { messages: { orderBy: { createdAt: "asc" } }, analysis: true },
    });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }
    return res.json(chat);
  } catch (error) {
    console.error(`[Controller] getChat error:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const getFullChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    
    // Verify chat ownership first
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    const productAnalysisRecord = await prisma.productAnalysis.findUnique({ where: { chatId } });
    const productIntelligence = await prisma.productIntelligence.findUnique({ where: { chatId } });
    const competitorIntelligence = await prisma.competitorIntelligence.findUnique({ where: { chatId } });
    const seoIntelligence = await prisma.seoIntelligence.findUnique({ where: { chatId } });
    const campaignIntelligence = await prisma.campaignIntelligence.findUnique({ where: { chatId } });
    const assistantMessages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
    });

    return res.json({
      chat,
      productAnalysis: productAnalysisRecord?.outputJson || null,
      marketDiscovery: productIntelligence?.marketDiscovery || null,
      competitorAnalysis: competitorIntelligence?.competitorAnalysis || null,
      seoAnalysis: seoIntelligence?.seoAudit || null,
      campaignGenerator: campaignIntelligence?.campaignGenerator || null,
      audienceIntelligence: productIntelligence?.audienceIntelligence || null,
      assistantMessages
    });
  } catch (error) {
    console.error(`[Controller] getFullChat error:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

/**
 * GET /api/chats/:chatId/full-results
 * Returns all saved analysis results for a chat/project
 */
export const getFullResults = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    if (process.env.NODE_ENV !== 'production') {
      console.log('');
      console.log('[FullResults Request]');
      console.log('chatId:', chatId);
      console.log('userId:', userId);
      console.log('');
    }

    // Verify chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      return res.status(404).json({ 
        success: false,
        error: "Chat not found" 
      });
    }

    // Fetch all intelligence modules
    const productIntelligence = await prisma.productIntelligence.findUnique({ where: { chatId } });
    const competitorIntelligence = await prisma.competitorIntelligence.findUnique({ where: { chatId } });
    const campaignIntelligence = await prisma.campaignIntelligence.findUnique({ where: { chatId } });
  let seoIntelligence = await prisma.seoIntelligence.findUnique({ 
    where: { chatId },
    include: {
      technicalAuditDetail: true,
      scoreBreakdown: true,
      keywordIntelligence: true,
      geoIntelligence: true,
      competitorSeoRecord: true,
      contentGapRecord: true,
      blogIntelligenceRecord: true,
      executiveDashboard: true,
    }
  });

  // Fallback: try findFirst if findUnique fails (defensive)
  if (!seoIntelligence) {
    seoIntelligence = await prisma.seoIntelligence.findFirst({
      where: { chatId },
      include: {
        technicalAuditDetail: true,
        scoreBreakdown: true,
        keywordIntelligence: true,
        geoIntelligence: true,
        competitorSeoRecord: true,
        contentGapRecord: true,
        blogIntelligenceRecord: true,
        executiveDashboard: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  console.log('[FullResults DB]');
  console.log('chatId:', chatId);
  console.log('hasSeoIntelligence:', !!seoIntelligence);
  console.log('seoIntelligenceId:', seoIntelligence?.id || 'N/A');
  console.log('keywordCount:', (seoIntelligence?.keywordIntelligence?.primaryKeywords || []).length);
  console.log('competitorCount:', (seoIntelligence?.competitorSeoRecord?.competitorProfiles || []).length);
  console.log('contentGapCount:', (seoIntelligence?.contentGapRecord?.contentGaps || []).length);
  console.log('blogCount:', (seoIntelligence?.blogIntelligenceRecord?.blogIdeas || []).length);
  console.log('technicalHasAuditData:', !!seoIntelligence?.technicalAuditDetail?.auditData);
  console.log('');

  const agentRuns = await prisma.agentRun.findMany({
    where: { chatId },
    orderBy: { createdAt: 'desc' },
  });
  let automationPlan = null;
  try {
    automationPlan = await prisma.automationPlan.findUnique({
      where: { chatId },
      include: {
        assets: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  } catch (e) {
    console.warn('[FullResults] automationPlan query failed (DB schema may be out of sync):', e.message);
  }

  // Helper function to normalize SEO action plan to canonical shape
  function normalizeSeoActionPlan(executiveDashboard, seoIntelligence) {
    if (!executiveDashboard && !seoIntelligence) return { immediate: [], day7: [], day30: [], day60: [], day90: [] };
    
    const exec = executiveDashboard || {};
    const execActionPlan = exec.executiveActionPlan || exec.actionPlan;
    const execStory = exec.metadata?.executiveStory || exec.executiveStory;
    
    // Try to extract from executiveActionPlan
    if (execActionPlan && typeof execActionPlan === 'object') {
      return {
        immediate: Array.isArray(execActionPlan.immediate) ? execActionPlan.immediate : [],
        day7: Array.isArray(execActionPlan.day7) ? execActionPlan.day7 : 
              Array.isArray(execActionPlan.sevenDay) ? execActionPlan.sevenDay : [],
        day30: Array.isArray(execActionPlan.day30) ? execActionPlan.day30 : 
               Array.isArray(execActionPlan.thirtyDay) ? execActionPlan.thirtyDay : [],
        day60: Array.isArray(execActionPlan.day60) ? execActionPlan.day60 : 
               Array.isArray(execActionPlan.sixtyDay) ? execActionPlan.sixtyDay : [],
        day90: Array.isArray(execActionPlan.day90) ? execActionPlan.day90 : 
               Array.isArray(execActionPlan.ninetyDay) ? execActionPlan.ninetyDay : []
      };
    }
    
    // Try to extract from executiveStory.actionPlan
    if (execStory && execStory.actionPlan && typeof execStory.actionPlan === 'object') {
      return {
        immediate: Array.isArray(execStory.actionPlan.immediate) ? execStory.actionPlan.immediate : [],
        day7: Array.isArray(execStory.actionPlan.day7) ? execStory.actionPlan.day7 : 
              Array.isArray(execStory.actionPlan.sevenDay) ? execStory.actionPlan.sevenDay : [],
        day30: Array.isArray(execStory.actionPlan.day30) ? execStory.actionPlan.day30 : 
               Array.isArray(execStory.actionPlan.thirtyDay) ? execStory.actionPlan.thirtyDay : [],
        day60: Array.isArray(execStory.actionPlan.day60) ? execStory.actionPlan.day60 : 
               Array.isArray(execStory.actionPlan.sixtyDay) ? execStory.actionPlan.sixtyDay : [],
        day90: Array.isArray(execStory.actionPlan.day90) ? execStory.actionPlan.day90 : 
               Array.isArray(execStory.actionPlan.ninetyDay) ? execStory.actionPlan.ninetyDay : []
      };
    }
    
    // Try to extract from executiveStory day7/day30/day60/day90 directly
    if (execStory && typeof execStory === 'object') {
      return {
        immediate: [],
        day7: Array.isArray(execStory.day7) ? execStory.day7 : [],
        day30: Array.isArray(execStory.day30) ? execStory.day30 : [],
        day60: Array.isArray(execStory.day60) ? execStory.day60 : [],
        day90: Array.isArray(execStory.day90) ? execStory.day90 : []
      };
    }
    
    // Fallback: build from seoIntelligence's own actionPlan or recommendations
    if (seoIntelligence) {
      const techRecs = (seoIntelligence.technicalAuditDetail?.recommendations || seoIntelligence.technicalAudit?.recommendations || []).slice(0, 3);
      const contentRecs = (seoIntelligence.contentGapRecord?.contentGaps || seoIntelligence.contentGaps?.contentGaps || []).slice(0, 3);
      const blogRecs = (seoIntelligence.blogIntelligenceRecord?.blogIdeas || seoIntelligence.blogIdeas?.blogIdeas || []).slice(0, 3);
      
      return {
        immediate: techRecs.map(r => ({ title: r.recommendation || r.title || r.issue || String(r), priority: 'High', reason: r.impact || r.area || 'Technical improvement' })),
        day7: contentRecs.map(g => ({ title: g.title || g.topic || String(g), priority: g.severity || g.priority || 'Medium', reason: g.reason || g.description || 'Content gap to address' })),
        day30: blogRecs.map(b => ({ title: b.title || b.topic || String(b), priority: 'Medium', reason: b.reason || 'Blog opportunity' })),
        day60: [],
        day90: []
      };
    }
    
    return { immediate: [], day7: [], day30: [], day60: [], day90: [] };
  }

  // Helper function to normalize score values
  function normalizeScore(value) {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    if (n >= 0 && n <= 1) return Math.round(n * 100);
    return Math.round(n);
  }

  // Helper to convert any value to a 0–100 percent score
  function toPercentScore(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    if (Number.isNaN(n)) return null;
    return n <= 1 ? Math.round(n * 100) : Math.round(n);
  }

  // Canonical normalize: read PageSpeed scores from auditData.*Score, fallback to nested PageSpeed paths
  function normalizeTechnicalAudit(record) {
    if (!record) return null;
    const auditData = record.auditData || {};

    const performanceScore = toPercentScore(
      auditData.performanceScore ??
      auditData.pageSpeed?.mobile?.lighthouseScores?.performance ??
      auditData.pageSpeed?.desktop?.lighthouseScores?.performance ??
      auditData.pageSpeed?.mobile?.categories?.performance?.score ??
      auditData.pageSpeed?.desktop?.categories?.performance?.score
    );

    const seoScore = toPercentScore(
      auditData.seoScore ??
      auditData.pageSpeed?.mobile?.lighthouseScores?.seo ??
      auditData.pageSpeed?.desktop?.lighthouseScores?.seo ??
      auditData.pageSpeed?.mobile?.categories?.seo?.score ??
      auditData.pageSpeed?.desktop?.categories?.seo?.score
    );

    const accessibilityScore = toPercentScore(
      auditData.accessibilityScore ??
      auditData.pageSpeed?.mobile?.lighthouseScores?.accessibility ??
      auditData.pageSpeed?.desktop?.lighthouseScores?.accessibility ??
      auditData.pageSpeed?.mobile?.categories?.accessibility?.score ??
      auditData.pageSpeed?.desktop?.categories?.accessibility?.score
    );

    const bestPracticesScore = toPercentScore(
      auditData.bestPracticesScore ??
      auditData.pageSpeed?.mobile?.lighthouseScores?.bestPractices ??
      auditData.pageSpeed?.desktop?.lighthouseScores?.bestPractices ??
      auditData.pageSpeed?.mobile?.categories?.['best-practices']?.score ??
      auditData.pageSpeed?.desktop?.categories?.['best-practices']?.score
    );

    const mobileScore = toPercentScore(auditData.mobileScore ?? record.mobileScore);
    const desktopScore = toPercentScore(auditData.desktopScore);

    return {
      ...record,
      auditData,
      performanceScore,
      seoScore,
      accessibilityScore,
      bestPracticesScore,
      mobileScore,
      desktopScore,
      overallScore: toPercentScore(record.overallScore ?? auditData.overallScore ?? performanceScore),
      criticalIssues: record.criticalIssues || auditData.criticalIssues || [],
      highIssues: record.highIssues || auditData.highIssues || [],
      mediumIssues: record.mediumIssues || auditData.mediumIssues || [],
      recommendations: record.recommendations || auditData.recommendations || []
    };
  }

  // Helper function to extract PageSpeed score from multiple possible paths
  function extractPageSpeedScore(pageSpeedData, device, metric) {
    if (!pageSpeedData) return null;
    
    // Try direct device path first
    if (pageSpeedData[device]) {
      const deviceData = pageSpeedData[device];
      
      // Try multiple possible paths within device data
      const paths = [
        deviceData.lighthouseScores?.[metric],
        deviceData.scores?.[metric],
        deviceData.categories?.[metric]?.score,
        deviceData.categories?.[metric === 'bestPractices' ? 'best-practices' : metric]?.score,
        deviceData[metric]
      ];
      
      for (const path of paths) {
        const normalized = normalizeScore(path);
        if (normalized !== null) return normalized;
      }
    }
    
    // Try alternative paths: auditData.scores, auditData.mobile, auditData.pageMetrics
    if (pageSpeedData.scores && pageSpeedData.scores[metric]) {
      const normalized = normalizeScore(pageSpeedData.scores[metric]);
      if (normalized !== null) return normalized;
    }
    
    if (pageSpeedData[device] && pageSpeedData[device][metric]) {
      const normalized = normalizeScore(pageSpeedData[device][metric]);
      if (normalized !== null) return normalized;
    }
    
    if (pageSpeedData.pageMetrics && pageSpeedData.pageMetrics[metric]) {
      const normalized = normalizeScore(pageSpeedData.pageMetrics[metric]);
      if (normalized !== null) return normalized;
    }
    
    return null;
  }

  // Helper function to normalize technical audit scores to canonical shape
  function normalizeTechnicalAuditScores(auditData) {
    if (!auditData) {
      return {
        performanceScore: null,
        seoScore: null,
        accessibilityScore: null,
        bestPracticesScore: null,
        mobileScore: null,
        desktopScore: null
      };
    }

    const pageSpeed = auditData?.auditData?.pageSpeed || auditData?.pageSpeed || {};
    const auditDataInner = auditData?.auditData || {};
    
    // Extract scores from PageSpeed data
    const mobilePerf = extractPageSpeedScore(pageSpeed, 'mobile', 'performance');
    const mobileSeo = extractPageSpeedScore(pageSpeed, 'mobile', 'seo');
    const mobileA11y = extractPageSpeedScore(pageSpeed, 'mobile', 'accessibility');
    const mobileBP = extractPageSpeedScore(pageSpeed, 'mobile', 'bestPractices');
    
    const desktopPerf = extractPageSpeedScore(pageSpeed, 'desktop', 'performance');
    const desktopSeo = extractPageSpeedScore(pageSpeed, 'desktop', 'seo');
    const desktopA11y = extractPageSpeedScore(pageSpeed, 'desktop', 'accessibility');
    const desktopBP = extractPageSpeedScore(pageSpeed, 'desktop', 'bestPractices');
    
    // Extract scores from alternative paths (auditData.scores, auditData.mobile, auditData.pageMetrics)
    const scoresPerf = normalizeScore(auditDataInner.scores?.performance);
    const scoresSeo = normalizeScore(auditDataInner.scores?.seo);
    const scoresA11y = normalizeScore(auditDataInner.scores?.accessibility);
    const scoresBP = normalizeScore(auditDataInner.scores?.bestPractices);
    
    const mobilePerfAlt = normalizeScore(auditDataInner.mobile?.performance);
    const mobileSeoAlt = normalizeScore(auditDataInner.mobile?.seo);
    const mobileA11yAlt = normalizeScore(auditDataInner.mobile?.accessibility);
    const mobileBPAlt = normalizeScore(auditDataInner.mobile?.bestPractices);
    
    const pageMetricsPerf = normalizeScore(auditDataInner.pageMetrics?.performance);
    const pageMetricsSeo = normalizeScore(auditDataInner.pageMetrics?.seo);
    const pageMetricsA11y = normalizeScore(auditDataInner.pageMetrics?.accessibility);
    const pageMetricsBP = normalizeScore(auditDataInner.pageMetrics?.bestPractices);
    
    // Use PageSpeed extraction first, fallback to alternative paths
    const finalMobilePerf = mobilePerf ?? mobilePerfAlt ?? scoresPerf ?? pageMetricsPerf;
    const finalMobileSeo = mobileSeo ?? mobileSeoAlt ?? scoresSeo ?? pageMetricsSeo;
    const finalMobileA11y = mobileA11y ?? mobileA11yAlt ?? scoresA11y ?? pageMetricsA11y;
    const finalMobileBP = mobileBP ?? mobileBPAlt ?? scoresBP ?? pageMetricsBP;
    
    const finalDesktopPerf = desktopPerf ?? scoresPerf ?? pageMetricsPerf;
    const finalDesktopSeo = desktopSeo ?? scoresSeo ?? pageMetricsSeo;
    const finalDesktopA11y = desktopA11y ?? scoresA11y ?? pageMetricsA11y;
    const finalDesktopBP = desktopBP ?? scoresBP ?? pageMetricsBP;
    
    // Calculate canonical scores (average of mobile/desktop if both exist)
    const performanceScore = (finalMobilePerf !== null && finalDesktopPerf !== null) 
      ? Math.round((finalMobilePerf + finalDesktopPerf) / 2)
      : (finalMobilePerf !== null ? finalMobilePerf : finalDesktopPerf);
    
    const seoScore = (finalMobileSeo !== null && finalDesktopSeo !== null)
      ? Math.round((finalMobileSeo + finalDesktopSeo) / 2)
      : (finalMobileSeo !== null ? finalMobileSeo : finalDesktopSeo);
    
    const accessibilityScore = (finalMobileA11y !== null && finalDesktopA11y !== null)
      ? Math.round((finalMobileA11y + finalDesktopA11y) / 2)
      : (finalMobileA11y !== null ? finalMobileA11y : finalDesktopA11y);
    
    const bestPracticesScore = (finalMobileBP !== null && finalDesktopBP !== null)
      ? Math.round((finalMobileBP + finalDesktopBP) / 2)
      : (finalMobileBP !== null ? finalMobileBP : finalDesktopBP);
    
    const mobileScore = (finalMobilePerf !== null && finalMobileSeo !== null && finalMobileA11y !== null && finalMobileBP !== null)
      ? Math.round((finalMobilePerf + finalMobileSeo + finalMobileA11y + finalMobileBP) / 4)
      : null;
    
    const desktopScore = (finalDesktopPerf !== null && finalDesktopSeo !== null && finalDesktopA11y !== null && finalDesktopBP !== null)
      ? Math.round((finalDesktopPerf + finalDesktopSeo + finalDesktopA11y + finalDesktopBP) / 4)
      : null;
    
    return {
      performanceScore,
      seoScore,
      accessibilityScore,
      bestPracticesScore,
      mobileScore,
      desktopScore
    };
  }

  // Normalize SEO intelligence response structure
  const executiveDashboard = seoIntelligence?.executiveDashboard || {};
  const normalizedActionPlan = normalizeSeoActionPlan(executiveDashboard, seoIntelligence);
  const normalizedTechnicalAuditRecord = normalizeTechnicalAudit(seoIntelligence?.technicalAuditDetail);
  
  const executiveStory = 
    executiveDashboard?.metadata?.executiveStory ||
    executiveDashboard?.executiveStory ||
    seoIntelligence?.executiveStory ||
    // Build from dashboard top-level fields if story is in metadata
    (executiveDashboard?.executiveOverview ? {
      companyOverview: {
        domain: seoIntelligence?.domain || '',
        companyName: seoIntelligence?.companyName || ''
      },
      seoHealthSummary: {
        overallScore: executiveDashboard.executiveOverview?.overallSeoScore?.value || null,
        technicalScore: executiveDashboard.executiveOverview?.technicalHealth?.value || null,
        contentScore: executiveDashboard.executiveOverview?.contentAuthority?.value || null,
        aiVisibilityScore: executiveDashboard.executiveOverview?.aiVisibility?.value || null
      },
      technicalFindings: seoIntelligence?.technicalAuditDetail?.auditData ? {
        criticalIssues: (seoIntelligence.technicalAuditDetail.criticalIssues || []).length,
        highIssues: (seoIntelligence.technicalAuditDetail.highIssues || []).length,
        performanceScore: null,
        seoScore: null
      } : null,
      keywordFindings: seoIntelligence?.keywordIntelligence ? {
        totalKeywords: seoIntelligence.keywordIntelligence.totalKeywords || 0,
        primaryKeywordsCount: (seoIntelligence.keywordIntelligence.primaryKeywords || []).length,
        opportunitiesCount: seoIntelligence.keywordIntelligence.opportunitiesCount || 0,
        topKeywords: (seoIntelligence.keywordIntelligence.primaryKeywords || []).slice(0, 5).map(k => ({
          keyword: k.keyword || k,
          searchVolume: k.searchVolume || k.volume || 0,
          difficulty: k.difficulty || k.kd || 0
        }))
      } : null,
      mainOpportunities: (executiveDashboard.keyOpportunities || []).slice(0, 5).map(o => ({
        category: o.category || 'SEO',
        opportunity: o.title || o.opportunity || '',
        potential: o.impact || o.potential || 'Medium',
        action: o.recommendation || o.action || ''
      })),
      mainRisks: [],
      actionPlan: executiveDashboard.executiveActionPlan || {}
    } : null) ||
    null;

  const pageSpeedAudit = seoIntelligence?.technicalAuditDetail?.auditData?.pageSpeed || {};
  const pageSpeedMobileScore = pageSpeedAudit?.mobile?.lighthouseScores?.performance ?? null;
  const pageSpeedDesktopScore = pageSpeedAudit?.desktop?.lighthouseScores?.performance ?? null;

  const normalizedSeoIntelligence = seoIntelligence ? {
    // Canonical structure
    identity: seoIntelligence.identity || {},
    technicalAudit: normalizedTechnicalAuditRecord || {},
    keywordIntelligence: seoIntelligence.keywordIntelligence || (seoIntelligence.keywordOpportunities ? { primaryKeywords: (seoIntelligence.keywordOpportunities.primaryKeywords || seoIntelligence.keywordOpportunities || []) } : {}),
    competitorIntelligence: seoIntelligence.competitorSeoRecord || (seoIntelligence.competitorKeywords ? { competitorProfiles: (seoIntelligence.competitorKeywords.competitorProfiles || seoIntelligence.competitorKeywords.competitors || []), competitors: (seoIntelligence.competitorKeywords.competitors || []) } : {}),
    contentGapAnalysis: seoIntelligence.contentGapRecord || (seoIntelligence.contentGaps ? { contentGaps: (seoIntelligence.contentGaps.contentGaps || seoIntelligence.contentGaps.missingPages || []) } : {}),
    blogIntelligence: seoIntelligence.blogIntelligenceRecord || (seoIntelligence.blogIdeas ? { blogIdeas: (seoIntelligence.blogIdeas.blogIdeas || seoIntelligence.blogIdeas.ideas || []) } : {}),
    geoIntelligence: seoIntelligence.geoIntelligence || (seoIntelligence.aiVisibility ? { aiVisibilityScore: seoIntelligence.aiVisibility.aiVisibilityScore || seoIntelligence.aiVisibility.overall, entities: seoIntelligence.aiVisibility.entities || [] } : {}),
    executiveDashboard: executiveDashboard,
    executiveStory: executiveStory,
    actionPlan: normalizedActionPlan,
    scoreBreakdown: seoIntelligence.scoreBreakdown || {},
    // Top-level score fields for direct access (fixes SEO dashboard mapping)
    seoScore: seoIntelligence.seoScore ?? null,
    pageSpeedMobileScore,
    pageSpeedDesktopScore,
    // Legacy fields for backward compatibility (under _legacy)
    _legacy: {
      technicalAuditDetail: seoIntelligence.technicalAuditDetail,
      competitorSeoRecord: seoIntelligence.competitorSeoRecord,
      contentGapRecord: seoIntelligence.contentGapRecord,
      blogIntelligenceRecord: seoIntelligence.blogIntelligenceRecord
    }
  } : null;

  console.log('✅ [Chat] Full results fetched:', {
    hasProductIntelligence: !!productIntelligence,
    hasCompetitorIntelligence: !!competitorIntelligence,
    hasCampaignIntelligence: !!campaignIntelligence,
    hasSeoIntelligence: !!normalizedSeoIntelligence,
    hasSeoScoreBreakdown: !!seoIntelligence?.scoreBreakdown,
    hasTechnicalAudit: !!seoIntelligence?.technicalAuditDetail,
    agentRunsCount: agentRuns.length,
    hasAutomationPlan: !!automationPlan,
  });

  // Build canonical fullResults shape
  const hasGrowthWorkspace = !!(productIntelligence || competitorIntelligence || campaignIntelligence);
  const hasSeoIntelligence = !!normalizedSeoIntelligence;

  const canonicalResult = {
    success: true,
    chat,
    growth: hasGrowthWorkspace ? {
      identity: {
        websiteUrl: chat?.websiteUrl || productIntelligence?.inputJson?.websiteUrl || '',
        productName: chat?.productName || productIntelligence?.inputJson?.productName || '',
        companyName: chat?.title || productIntelligence?.inputJson?.companyName || '',
        industry: productIntelligence?.inputJson?.industry || '',
      },
      product: productIntelligence?.productAnalysis ?? null,
      market: productIntelligence?.marketDiscovery ?? null,
      audience: productIntelligence?.audienceIntelligence ?? null,
      competitor: competitorIntelligence?.competitorAnalysis ?? null,
      intent: competitorIntelligence?.intentPrediction ?? null,
      positioning: competitorIntelligence?.positioningEngine ?? null,
      campaign: campaignIntelligence?.campaignGenerator ?? null,
      channel: campaignIntelligence?.channelRecommendation ?? null,
      executiveStory: campaignIntelligence?.executiveStory || campaignIntelligence?.campaignGenerator?.executiveStory || campaignIntelligence?.campaignGenerator?.metadata?.executiveStory || null,
      actionPlan: campaignIntelligence?.actionPlan || campaignIntelligence?.campaignGenerator?.actionPlan || campaignIntelligence?.campaignGenerator?.metadata?.actionPlan || null,
      summary: campaignIntelligence?.campaignGenerator?.growthSummary || campaignIntelligence?.campaignGenerator?.metadata?.growthSummary || null
    } : null,
    seoIntelligence: hasSeoIntelligence ? {
      identity: {
        websiteUrl: seoIntelligence?.websiteUrl || '',
        domain: seoIntelligence?.domain || '',
        companyName: seoIntelligence?.companyName || '',
        productName: seoIntelligence?.productName || '',
      },
      technicalAudit: normalizedSeoIntelligence.technicalAudit || {},
      keywordIntelligence: normalizedSeoIntelligence.keywordIntelligence || {},
      competitorIntelligence: normalizedSeoIntelligence.competitorIntelligence || {},
      contentGapAnalysis: normalizedSeoIntelligence.contentGapAnalysis || {},
      blogIntelligence: normalizedSeoIntelligence.blogIntelligence || {},
      geoIntelligence: normalizedSeoIntelligence.geoIntelligence || {},
      executiveDashboard: normalizedSeoIntelligence.executiveDashboard || {},
      executiveStory: normalizedSeoIntelligence.executiveStory || null,
      actionPlan: normalizedSeoIntelligence.actionPlan || null,
      scoreBreakdown: normalizedSeoIntelligence.scoreBreakdown || {},
    } : {},
    hasGrowthWorkspace,
    hasProductIntelligence: !!productIntelligence,
    hasCompetitorIntelligence: !!competitorIntelligence,
    hasCampaignIntelligence: !!campaignIntelligence,
    hasSeoIntelligence,
    // Backward compatibility fields
    productIntelligence,
    competitorIntelligence,
    campaignIntelligence,
    // seoIntelligenceRaw removed - use seoIntelligence canonical keys above
    agentRuns,
    automationPlan,
  };

  if (process.env.NODE_ENV !== 'production') {
    console.log('[FullResults Response]');
    console.log('chatId:', chatId);
    console.log('seoKeys:', Object.keys(canonicalResult.seoIntelligence || {}));
    console.log('hasScoreBreakdown:', !!canonicalResult.seoIntelligence?.scoreBreakdown);
    console.log('hasTechnicalAudit:', !!canonicalResult.seoIntelligence?.technicalAudit);
    console.log('technicalPerformanceScore:', canonicalResult.seoIntelligence?.technicalAudit?.performanceScore ?? 'N/A');
    console.log('keywordPrimaryCount:', (canonicalResult.seoIntelligence?.keywordIntelligence?.primaryKeywords || []).length);
    console.log('competitorProfilesCount:', (canonicalResult.seoIntelligence?.competitorIntelligence?.competitorProfiles || []).length);
    console.log('');

    console.log('[FullResults] canonical keys', Object.keys(canonicalResult));
    console.log('[FullResults] growth keys', Object.keys(canonicalResult.growth || {}));
    console.log('[FullResults] seo keys', Object.keys(canonicalResult.seoIntelligence || {}));
    
    // ==== DEBUG: Full structure of response ====
    const seoIntel = canonicalResult.seoIntelligence || {};
    console.log('===== FULL RESULTS SEO DEBUG =====');
    console.log('hasSeoIntelligence:', hasSeoIntelligence);
    console.log('seoIntelligence is null?', canonicalResult.seoIntelligence === null);
    console.log('seoIntelligence.technicalAudit type:', typeof seoIntel.technicalAudit, seoIntel.technicalAudit ? 'keys: ' + Object.keys(seoIntel.technicalAudit).join(',') : 'MISSING');
    console.log('seoIntelligence.keywordIntelligence type:', typeof seoIntel.keywordIntelligence, seoIntel.keywordIntelligence ? 'primaryKeywords count: ' + ((seoIntel.keywordIntelligence.primaryKeywords || []).length) : 'MISSING');
    console.log('seoIntelligence.competitorIntelligence type:', typeof seoIntel.competitorIntelligence, seoIntel.competitorIntelligence ? 'competitorProfiles count: ' + ((seoIntel.competitorIntelligence.competitorProfiles || []).length) : 'MISSING');
    console.log('seoIntelligence.contentGapAnalysis type:', typeof seoIntel.contentGapAnalysis, seoIntel.contentGapAnalysis ? 'contentGaps count: ' + ((seoIntel.contentGapAnalysis.contentGaps || []).length) : 'MISSING');
    console.log('seoIntelligence.blogIntelligence type:', typeof seoIntel.blogIntelligence, seoIntel.blogIntelligence ? 'blogIdeas count: ' + ((seoIntel.blogIntelligence.blogIdeas || []).length) : 'MISSING');
    console.log('seoIntelligence.geoIntelligence type:', typeof seoIntel.geoIntelligence, seoIntel.geoIntelligence ? 'aiVisibilityScore: ' + seoIntel.geoIntelligence.aiVisibilityScore : 'MISSING');
    console.log('seoIntelligence.executiveDashboard type:', typeof seoIntel.executiveDashboard, seoIntel.executiveDashboard ? 'keys: ' + Object.keys(seoIntel.executiveDashboard).join(',') : 'MISSING');
    console.log('seoIntelligence.executiveStory type:', typeof seoIntel.executiveStory, seoIntel.executiveStory ? 'keys: ' + Object.keys(seoIntel.executiveStory).join(',') : 'MISSING/null');
    console.log('seoIntelligence.scoreBreakdown type:', typeof seoIntel.scoreBreakdown, seoIntel.scoreBreakdown ? 'keys: ' + Object.keys(seoIntel.scoreBreakdown).join(',') : 'MISSING/empty');
    console.log('seoIntelligence.actionPlan type:', typeof seoIntel.actionPlan, seoIntel.actionPlan ? 'keys: ' + Object.keys(seoIntel.actionPlan).join(',') : 'MISSING/null');
    console.log('===== END FULL RESULTS SEO DEBUG =====');
  }

  return res.json(canonicalResult);
  } catch (error) {
    console.error(`[Controller] getFullResults error:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const updateChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const result = chatSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.errors[0].message });
    }

    const { title, productName } = result.data;
    const chat = await prisma.chat.updateMany({
      where: { id: chatId, userId: req.user.id },
      data: { title, productName: productName || title },
    });

    if (chat.count === 0) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    const updatedChat = await prisma.chat.findUnique({ where: { id: chatId } });
    return res.json(updatedChat);
  } catch (error) {
    console.error(`[Controller] updateChat error:`, error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const deleteChat = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  console.log('🗑️ [Chat] Deleting chat and all related data:', { chatId, userId });

  // Verify chat ownership
  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId },
  });

  if (!chat) {
    return res.status(404).json({ 
      success: false,
      error: "Chat not found or you don't have permission to delete it" 
    });
  }

  try {
    // Use a transaction to ensure all deletions happen atomically
    await prisma.$transaction(async (tx) => {
      // Delete all related data (cascading deletes should handle most, but being explicit)
      await tx.message.deleteMany({ where: { chatId } });
      await tx.analysis.deleteMany({ where: { chatId } });
      await tx.productAnalysis.deleteMany({ where: { chatId } });
      await tx.productProfile.deleteMany({ where: { chatId } });
      await tx.productIntelligence.deleteMany({ where: { chatId } });
      await tx.competitorIntelligence.deleteMany({ where: { chatId } });
      await tx.campaignIntelligence.deleteMany({ where: { chatId } });
      await tx.agentRun.deleteMany({ where: { chatId } });
      
      // Automation models (cascade deletes automationAsset via AutomationPlan relation)
      await tx.automationLog.deleteMany({ where: { chatId } });
      await tx.automationPlan.deleteMany({ where: { chatId } });

      // SEO Intelligence has many related models - let Prisma cascade handle them
      await tx.seoIntelligence.deleteMany({ where: { chatId } });

      // Finally delete the chat itself
      await tx.chat.delete({ where: { id: chatId } });
    });

    console.log('✅ [Chat] Chat and all related data deleted');

    return res.json({ 
      success: true,
      message: 'Project and all analysis data deleted successfully'
    });
  } catch (error) {
    console.error('❌ [Chat] Error deleting chat:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to delete chat. Please try again.' 
    });
  }
};

/**
 * GET /api/chats/:chatId/evidence-readiness
 * Returns evidence readiness for all modules
 */
export const getEvidenceReadiness = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }

    const readiness = await getChatIntelligenceReadiness({ userId, chatId });
    const { hasProductIntelligence, hasAudienceIntelligence, hasCompetitorIntelligence, hasCampaignIntelligence, hasSeoIntelligence, hasAutomationPlan } = readiness;

    return res.json({
      success: true,
      data: {
        chatId,
        hasProductIntelligence,
        hasAudienceIntelligence,
        hasCompetitorIntelligence,
        hasCampaignIntelligence,
        hasSeoIntelligence,
        hasAutomationPlan,
        contentGenerationReady: hasProductIntelligence,
        campaignGenerationReady: hasProductIntelligence && (hasAudienceIntelligence || hasCompetitorIntelligence),
        automationGenerationReady: hasProductIntelligence && hasCampaignIntelligence,
      }
    });
  } catch (error) {
    console.error('[Evidence Readiness] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export const clearHistory = async (req, res) => {
  const userId = req.user.id;

  console.log('🗑️ [Chat] Clearing all chat history for user:', { userId });

  try {
    // Use a transaction to ensure all deletions happen atomically
    await prisma.$transaction(async (tx) => {
      // Get all chat IDs for this user
      const userChats = await tx.chat.findMany({
        where: { userId },
        select: { id: true }
      });

      const chatIds = userChats.map(c => c.id);

      if (chatIds.length === 0) {
        console.log('ℹ️ [Chat] No chats found for user');
        return;
      }

      console.log(`🗑️ [Chat] Deleting ${chatIds.length} chats and all related data`);

      // Delete all related records for all user's chats
      await tx.message.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.analysis.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.productAnalysis.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.productProfile.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.productIntelligence.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.competitorIntelligence.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.campaignIntelligence.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.agentRun.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.automationLog.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.automationPlan.deleteMany({ where: { chatId: { in: chatIds } } });
      await tx.seoIntelligence.deleteMany({ where: { chatId: { in: chatIds } } });

      // Finally delete all chats
      await tx.chat.deleteMany({ where: { userId } });
    });

    console.log('✅ [Chat] All chat history cleared successfully');

    return res.json({ 
      success: true,
      message: 'All chat history and analysis data cleared successfully'
    });
  } catch (error) {
    console.error('❌ [Chat] Error clearing chat history:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to clear chat history. Please try again.' 
    });
  }
};
