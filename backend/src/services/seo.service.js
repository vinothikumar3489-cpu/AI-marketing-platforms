import { prisma } from "../config/prisma.js";
import gsc from "./googleSearchConsole.service.js";
import semrush from "./semrush.service.js";
import ahrefs from "./ahrefs.service.js";
import { generateContentGapIntelligence } from "./seo/content-gap-engine.service.js";
import { generateBlogIntelligence } from "./seo/blog-intelligence.service.js";
import { generateExecutiveDashboard } from "./seo/executive-dashboard-generator.service.js";

const WEAK_KEYWORDS = new Set([
  'founder', 'generate', 'carousel', 'english', 'hero',
  'login', 'signup', 'home', 'page', 'click here',
  'read more', 'learn more', 'contact us', 'about us',
  'get started', 'free trial', 'download', 'submit',
  'example', 'test', 'sample', 'demo', 'coming soon'
]);

const GENERIC_BLOG_PATTERNS = [
  /^Competitor:/i,
  /^How to (use|get|start|make|do)/i,
  / vs /i,
  /: (What|Why|How|When|Where)/i,
  /^5 (ways|tips|reasons|steps|things)/i,
  /^Top \d+/i,
  /^The (Ultimate|Complete|Definitive)/i,
  /^Your (Guide|Manual|Handbook)/i,
  /^Everything You/i,
];

function isWeakKeyword(kw) {
  const text = (typeof kw === 'string' ? kw : (kw.keyword || kw.value || '')).toLowerCase().trim();
  if (!text || text.length < 4) return true;
  return WEAK_KEYWORDS.has(text);
}

function isGenericBlogTopic(title) {
  if (!title) return true;
  return GENERIC_BLOG_PATTERNS.some(pattern => pattern.test(title));
}

function filterSeoResults(result, domain) {
  if (!result) return result;

  // Filter self-domain competitors
  if (result.competitorKeywords && domain) {
    result.competitorKeywords = result.competitorKeywords.filter(c => {
      const cDomain = c.domain || c.name || '';
      return !cDomain.includes(domain) && !domain.includes(cDomain);
    });
  }

  // Filter weak keywords
  if (result.topKeywords) {
    result.topKeywords = result.topKeywords.filter(k => !isWeakKeyword(k));
    result.keywordCount = result.topKeywords.length;
  }

  // Filter generic blog topics
  if (result.contentSuggestions) {
    result.contentSuggestions = result.contentSuggestions.filter(s => !isGenericBlogTopic(s.title || s.value));
  }

  return result;
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function calculateSeoScore(data) {
  // Components: keyword 25%, traffic 20%, backlink 20%, technical 20%, content 15%
  const keywordScore = data.keywordScore ?? 50;
  const trafficScore = data.trafficScore ?? 50;
  const backlinkScore = data.backlinkScore ?? 50;
  const technicalScore = data.technicalScore ?? 50;
  const contentScore = data.contentScore ?? 50;

  const score =
    keywordScore * 0.25 +
    trafficScore * 0.2 +
    backlinkScore * 0.2 +
    technicalScore * 0.2 +
    contentScore * 0.15;

  return Math.round(clamp(score));
}

function predictSeoGrowth(metrics) {
  // Basic heuristic prediction
  const expectedTrafficGrowth = Math.round((metrics.keywordTrend ?? 0.05) * (metrics.organicTraffic ?? 1000));
  const rankingImprovementChance = clamp(50 + (metrics.keywordTrend ?? 0) * 100);
  const highOpportunityKeywords = (metrics.topKeywords || []).slice(0, 5);
  const riskLevel = rankingImprovementChance > 60 ? "low" : "medium";
  const nextBestActions = [
    "Optimize top opportunity keywords in titles and headings",
    "Improve page speed and mobile UX",
    "Build high-quality backlinks from relevant sites",
  ];

  return {
    expectedTrafficGrowth,
    rankingImprovementChance,
    highOpportunityKeywords,
    riskLevel,
    nextBestActions,
  };
}

function generateFallbackSeo(productName, websiteUrl) {
  return {
    websiteUrl: websiteUrl || "",
    seoScore: 0,
    visibilityScore: 0,
    organicTraffic: 0,
    keywordCount: 0,
    backlinkCount: 0,
    avgPosition: 0,
    ctr: 0,
    topKeywords: [],
    competitorKeywords: [],
    backlinks: { total: 0, referringDomains: 0, authority: 0 },
    trafficEstimate: { monthlyOrganic: 0, trend: [] },
    technicalIssues: { pageSpeed: "unknown" },
    contentSuggestions: [],
    prediction: {
      expectedTrafficGrowth: 0,
      rankingImprovementChance: 0,
      highOpportunityKeywords: [],
      riskLevel: "unknown",
      nextBestActions: ["No verified data available. Connect Google Search Console or a SEO tool to generate insights."],
    },
    source: "unavailable",
    note: "No verified SEO data available. Run a URL analysis with an active SEO provider connection."
  };
}

export async function getSeoByChat(chatId) {
  return prisma.seoAnalysis.findUnique({ where: { chatId } });
}

export async function runSeoAnalysis({ chatId, userId, websiteUrl, productName }) {
  // Try to fetch data from integrations
  const domain = websiteUrl?.replace(/^https?:\/\//, "").split("/")[0];

  const [gscData, semrushData, ahrefsData] = await Promise.all([
    gsc.fetchGSCData(websiteUrl),
    semrush.fetchSemrushData(domain),
    ahrefs.fetchAhrefsData(domain),
  ]);

  let result;
  if (gscData || semrushData || ahrefsData) {
    // Merge available data into result (simplified)
    const topKeywords = (semrushData?.topKeywords || ahrefsData?.topKeywords || gscData?.topQueries || []).slice(0, 10);
    const backlinks = ahrefsData?.backlinks || { total: 0, referringDomains: 0 };
    const trafficEstimate = semrushData?.trafficEstimate || { monthlyOrganic: 0 };

    const scores = {
      keywordScore: 60,
      trafficScore: 60,
      backlinkScore: 60,
      technicalScore: 60,
      contentScore: 60,
    };

    const seoScore = calculateSeoScore(scores);

    result = {
      websiteUrl,
      seoScore,
      visibilityScore: 60,
      organicTraffic: trafficEstimate.monthlyOrganic || 0,
      keywordCount: topKeywords.length,
      backlinkCount: backlinks.total || 0,
      avgPosition: topKeywords.reduce((s, k) => s + (k.position || 50), 0) / Math.max(1, topKeywords.length),
      ctr: gscData?.ctr || 0,
      topKeywords,
      competitorKeywords: semrushData?.competitors || [],
      backlinks,
      trafficEstimate,
      technicalIssues: { pageSpeed: "unknown" },
      contentSuggestions: [],
      prediction: predictSeoGrowth({ keywordTrend: 0.02, organicTraffic: trafficEstimate.monthlyOrganic || 0, topKeywords }),
      source: "integrations",
    };
  } else {
    result = generateFallbackSeo(productName || domain || "product", websiteUrl || "");
  }

  // Apply SEO quality filters
  result = filterSeoResults(result, domain);

  // Upsert into DB
  const saved = await prisma.seoAnalysis.upsert({
    where: { chatId },
    update: {
      websiteUrl: result.websiteUrl,
      seoScore: result.seoScore,
      visibilityScore: result.visibilityScore,
      organicTraffic: result.organicTraffic,
      keywordCount: result.keywordCount,
      backlinkCount: result.backlinkCount,
      avgPosition: result.avgPosition,
      ctr: result.ctr,
      topKeywords: result.topKeywords,
      competitorKeywords: result.competitorKeywords,
      backlinks: result.backlinks,
      trafficEstimate: result.trafficEstimate,
      technicalIssues: result.technicalIssues,
      contentSuggestions: result.contentSuggestions,
      prediction: result.prediction,
      source: result.source,
      userId,
    },
    create: {
      chatId,
      userId,
      websiteUrl: result.websiteUrl,
      seoScore: result.seoScore,
      visibilityScore: result.visibilityScore,
      organicTraffic: result.organicTraffic,
      keywordCount: result.keywordCount,
      backlinkCount: result.backlinkCount,
      avgPosition: result.avgPosition,
      ctr: result.ctr,
      topKeywords: result.topKeywords,
      competitorKeywords: result.competitorKeywords,
      backlinks: result.backlinks,
      trafficEstimate: result.trafficEstimate,
      technicalIssues: result.technicalIssues,
      contentSuggestions: result.contentSuggestions,
      prediction: result.prediction,
      source: result.source,
    },
  });

  return saved;
}

// ============================================
// CONTENT GAP INTELLIGENCE
// ============================================

export async function getContentGapsByChat(chatId) {
  const seoIntelligence = await prisma.seoIntelligence.findUnique({
    where: { chatId },
    include: {
      contentGapRecord: true
    }
  });

  return seoIntelligence?.contentGapRecord || null;
}

export async function runContentGapAnalysis({ chatId, userId }) {
  console.log('🚀 [SEO Service] Running Content Gap Analysis for chat:', chatId);

  try {
    // Get SEO Intelligence record
    let seoIntelligence = await prisma.seoIntelligence.findUnique({
      where: { chatId },
      include: {
        rawCrawlData: true,
        keywordIntelligence: true,
        geoIntelligence: true,
        competitorSeoRecord: true
      }
    });

    // If no SEO Intelligence exists, create one
    if (!seoIntelligence) {
      console.log('📝 [SEO Service] Creating new SEO Intelligence record...');
      seoIntelligence = await prisma.seoIntelligence.create({
        data: {
          chatId,
          userId,
          status: 'in_progress'
        },
        include: {
          rawCrawlData: true,
          keywordIntelligence: true,
          geoIntelligence: true,
          competitorSeoRecord: true
        }
      });
    }

    // Get website data from raw crawl
    const websiteData = seoIntelligence.rawCrawlData?.[0] || {};
    const keywordIntelligence = seoIntelligence.keywordIntelligence || {};
    const geoIntelligence = seoIntelligence.geoIntelligence || {};
    const competitorIntelligence = seoIntelligence.competitorSeoRecord || {};

    // Get product name from chat
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    const productName = chat?.productName || seoIntelligence.websiteUrl || 'Product';
    const industry = extractIndustryFromContext(productName, websiteData);

    console.log('🔍 [SEO Service] Generating content gap intelligence...');

    // Generate content gap intelligence
    const contentGapData = await generateContentGapIntelligence({
      websiteData,
      keywordIntelligence,
      geoIntelligence,
      competitorIntelligence,
      productName,
      industry
    });

    // Save to database
    console.log('💾 [SEO Service] Saving content gap data to database...');
    const saved = await prisma.contentGapRecord.upsert({
      where: { seoIntelligenceId: seoIntelligence.id },
      update: {
        contentGaps: contentGapData.contentGaps,
        landingPageIdeas: contentGapData.landingPageIdeas,
        comparisonPageIdeas: contentGapData.comparisonPageIdeas,
        faqOpportunities: contentGapData.faqOpportunities,
        geoContentIdeas: contentGapData.geoContentIdeas,
        resourcePageIdeas: contentGapData.resourcePageIdeas,
        contentCalendar: contentGapData.contentCalendar,
        summary: contentGapData.summary,
        metadata: contentGapData.metadata
      },
      create: {
        seoIntelligenceId: seoIntelligence.id,
        contentGaps: contentGapData.contentGaps,
        landingPageIdeas: contentGapData.landingPageIdeas,
        comparisonPageIdeas: contentGapData.comparisonPageIdeas,
        faqOpportunities: contentGapData.faqOpportunities,
        geoContentIdeas: contentGapData.geoContentIdeas,
        resourcePageIdeas: contentGapData.resourcePageIdeas,
        contentCalendar: contentGapData.contentCalendar,
        summary: contentGapData.summary,
        metadata: contentGapData.metadata
      }
    });

    console.log('✅ [SEO Service] Content gap analysis complete');
    return saved;

  } catch (error) {
    console.error('❌ [SEO Service] Error in content gap analysis:', error);
    throw error;
  }
}

// ============================================
// BLOG INTELLIGENCE
// ============================================

export async function getBlogsByChat(chatId) {
  const seoIntelligence = await prisma.seoIntelligence.findUnique({
    where: { chatId },
    include: {
      blogIntelligenceRecord: true
    }
  });

  return seoIntelligence?.blogIntelligenceRecord || null;
}

export async function runBlogAnalysis({ chatId, userId }) {
  console.log('🚀 [SEO Service] Running Blog Intelligence Analysis for chat:', chatId);

  try {
    // Get SEO Intelligence record
    let seoIntelligence = await prisma.seoIntelligence.findUnique({
      where: { chatId },
      include: {
        rawCrawlData: true,
        keywordIntelligence: true,
        geoIntelligence: true,
        competitorSeoRecord: true
      }
    });

    // If no SEO Intelligence exists, create one
    if (!seoIntelligence) {
      console.log('📝 [SEO Service] Creating new SEO Intelligence record...');
      seoIntelligence = await prisma.seoIntelligence.create({
        data: {
          chatId,
          userId,
          status: 'in_progress'
        },
        include: {
          rawCrawlData: true,
          keywordIntelligence: true,
          geoIntelligence: true,
          competitorSeoRecord: true
        }
      });
    }

    const keywordIntelligence = seoIntelligence.keywordIntelligence || {};
    const geoIntelligence = seoIntelligence.geoIntelligence || {};
    const competitorIntelligence = seoIntelligence.competitorSeoRecord || {};

    // Get product name from chat
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    const productName = chat?.productName || seoIntelligence.websiteUrl || 'Product';
    const websiteData = seoIntelligence.rawCrawlData?.[0] || {};
    const industry = extractIndustryFromContext(productName, websiteData);

    console.log('🔍 [SEO Service] Generating blog intelligence...');

    // Generate blog intelligence
    const blogData = await generateBlogIntelligence({
      keywordIntelligence,
      competitorIntelligence,
      geoIntelligence,
      productName,
      industry
    });

    // Save to database
    console.log('💾 [SEO Service] Saving blog intelligence data to database...');
    const saved = await prisma.blogIntelligenceRecord.upsert({
      where: { seoIntelligenceId: seoIntelligence.id },
      update: {
        blogIdeas: blogData.blogIdeas,
        blogClusters: blogData.blogClusters,
        blogBriefs: blogData.blogBriefs,
        publishingCalendar: blogData.publishingCalendar,
        summary: blogData.summary,
        metadata: blogData.metadata
      },
      create: {
        seoIntelligenceId: seoIntelligence.id,
        blogIdeas: blogData.blogIdeas,
        blogClusters: blogData.blogClusters,
        blogBriefs: blogData.blogBriefs,
        publishingCalendar: blogData.publishingCalendar,
        summary: blogData.summary,
        metadata: blogData.metadata
      }
    });

    console.log('✅ [SEO Service] Blog intelligence analysis complete');
    return saved;

  } catch (error) {
    console.error('❌ [SEO Service] Error in blog intelligence analysis:', error);
    throw error;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractIndustryFromContext(productName, websiteData) {
  const text = (websiteData.text || '').toLowerCase();
  const productLower = productName.toLowerCase();

  // Try to detect industry from content
  if (text.includes('marketing') || productLower.includes('marketing')) return 'Marketing';
  if (text.includes('ecommerce') || productLower.includes('ecommerce')) return 'E-commerce';
  if (text.includes('saas') || text.includes('software')) return 'SaaS';
  if (text.includes('finance') || text.includes('fintech')) return 'Finance';
  if (text.includes('healthcare') || text.includes('health')) return 'Healthcare';
  if (text.includes('education') || text.includes('learning')) return 'Education';
  if (text.includes('real estate') || text.includes('property')) return 'Real Estate';

  return 'Technology'; // Default
}

export default { 
  getSeoByChat, 
  runSeoAnalysis,
  getContentGapsByChat,
  runContentGapAnalysis,
  getBlogsByChat,
  runBlogAnalysis
};


// ============================================
// EXECUTIVE DASHBOARD
// ============================================

export async function getExecutiveDashboardByChat(chatId) {
  const seoIntelligence = await prisma.seoIntelligence.findUnique({
    where: { chatId },
    include: {
      executiveDashboard: true
    }
  });

  return seoIntelligence?.executiveDashboard || null;
}

export async function runExecutiveDashboardAnalysis({ chatId, userId }) {
  console.log('🚀 [SEO Service] Running Executive Dashboard Analysis for chat:', chatId);

  try {
    // Get SEO Intelligence record with all related data
    let seoIntelligence = await prisma.seoIntelligence.findUnique({
      where: { chatId },
      include: {
        technicalAuditDetail: true,
        scoreBreakdown: true,
        keywordIntelligence: true,
        geoIntelligence: true,
        competitorSeoRecord: true,
        contentGapRecord: true,
        blogIntelligenceRecord: true
      }
    });

    // If no SEO Intelligence exists, throw error
    if (!seoIntelligence) {
      throw new Error('No SEO analysis found. Please run SEO analysis first.');
    }

    // Check if we have enough data
    const hasMinimumData = 
      seoIntelligence.scoreBreakdown || 
      seoIntelligence.keywordIntelligence || 
      seoIntelligence.geoIntelligence;

    if (!hasMinimumData) {
      throw new Error('Insufficient SEO data. Please run complete SEO analysis first.');
    }

    console.log('🔍 [SEO Service] Generating executive dashboard...');

    // Generate executive dashboard
    const dashboardResult = await generateExecutiveDashboard({
      seoIntelligenceId: seoIntelligence.id
    });

    if (!dashboardResult.success) {
      throw new Error(dashboardResult.error || 'Failed to generate executive dashboard');
    }

    console.log('✅ [SEO Service] Executive dashboard analysis complete');
    return dashboardResult.data;

  } catch (error) {
    console.error('❌ [SEO Service] Error in executive dashboard analysis:', error);
    throw error;
  }
}
