
import prisma from "../../config/prisma.js";
import { scrapeWebsite } from "../../domains/research/services/scraper.service.js";
import { callAI } from "../../domains/ai/services/aiOrchestrator.service.js";

const getPageSpeedKey = () => process.env.PAGESPEED_API_KEY || "";
const PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

function getRuleBasedFallback(inputData, pageSpeedScore = 0, scrapedData = null) {
  const productName = inputData?.productName || 'Product';
  const content = scrapedData?.scrapedData || scrapedData || {};
  const hasTitleEvidence = content.title || content.metaDescription;
  const keywordEvidence = content.features || [];
  return {
    seoScore: null,
    pageSpeedScore: pageSpeedScore,
    // Analysis of the actual page is only provided when scraped evidence
    // exists; otherwise it would be fabricated. Generic guidance is kept
    // in clearly-labeled guidance fields, not presented as page analysis.
    metaTitleAnalysis: hasTitleEvidence ? `Title tag present on page: "${content.title}" (${(content.title || '').length} chars).` : null,
    metaDescriptionAnalysis: hasTitleEvidence ? `Meta description present on page (${(content.metaDescription || '').length} chars).` : null,
    headingStructure: [],
    keywordSuggestions: keywordEvidence.slice(0, 10),
    technicalSeoIssues: [],
    contentImprovementIdeas: [],
    backlinkAuthorityNotes: "Backlink data not available — focus on content quality and internal linking.",
    priorityFixes: [],
    finalRecommendation: "No verified SEO evidence was available to analyze. Connect SEO data sources (PageSpeed, scraping) and retry for a full analysis.",
    fallbackNote: "SEO AI analysis unavailable. Only verified page evidence (title, meta description, PageSpeed scores, extracted keywords) is included; unverifiable fields are null/empty.",
    guidance: {
      metaTitleGuidance: "Check if title is 50-60 characters, includes main keyword, and is unique.",
      metaDescriptionGuidance: "Check if description is 150-160 characters, includes main keyword, and is compelling.",
      headingGuidance: ["Ensure one H1 per page", "Use H2-H3 for content hierarchy", "Include keywords in headings"],
      technicalGuidance: ["Check mobile-friendliness", "Ensure fast page speed", "Verify SSL certificate"],
      contentGuidance: ["Create product-specific landing pages", "Add use-case documentation", "Build comparison content"],
      priorityGuidance: ["Verify meta tags across key pages", "Improve page speed", "Fix heading hierarchy"],
    },
  };
}

async function getPageSpeedData(url) {
  try {
    const key = getPageSpeedKey();
    const mobileUrl = `${PAGESPEED_API_URL}?url=${encodeURIComponent(url)}&key=${key}&strategy=MOBILE`;
    const desktopUrl = `${PAGESPEED_API_URL}?url=${encodeURIComponent(url)}&key=${key}&strategy=DESKTOP`;

    const [mobileRes, desktopRes] = await Promise.allSettled([
      key ? fetch(mobileUrl) : Promise.reject(new Error('No API key')),
      key ? fetch(desktopUrl) : Promise.reject(new Error('No API key'))
    ]);

    const extract = (resp) => {
      if (resp.status !== 'fulfilled' || !resp.value.ok) return null;
      return resp.value.json().then(d => {
        const lh = d.lighthouseResult;
        return {
          performance: Math.round((lh?.categories?.performance?.score || 0) * 100),
          accessibility: Math.round((lh?.categories?.accessibility?.score || 0) * 100),
          bestPractices: Math.round((lh?.categories?.['best-practices']?.score || 0) * 100),
          seo: Math.round((lh?.categories?.seo?.score || 0) * 100)
        };
      }).catch(() => null);
    };

    const mobile = mobileRes.status === 'fulfilled' ? await extract(mobileRes) : null;
    const desktop = desktopRes.status === 'fulfilled' ? await extract(desktopRes) : null;

    return {
      source: 'GOOGLE_PAGESPEED',
      measuredAt: new Date().toISOString(),
      mobile,
      desktop
    };
  } catch (e) {
    return null;
  }
}

function buildPrompt(inputData, scrapedData, pageSpeedData) {
  const { productName, targetKeywords } = inputData || {};
  const scrapedText = JSON.stringify(scrapedData || {}).slice(0, 2500);
  const speedInfo = pageSpeedData ? `Mobile: ${pageSpeedData.mobile?.seo ?? 'N/A'}, Desktop: ${pageSpeedData.desktop?.seo ?? 'N/A'}` : 'Not measured';

  return `You are a Senior SEO Analyst analyzing ${productName || 'a product'}.

WEBSITE DATA:
${scrapedText}

PAGESPEED SCORES:
${speedInfo}

PRODUCT: ${productName || 'Unknown'}
KEYWORDS: ${targetKeywords || 'Not specified'}

Return ONLY valid JSON:
{
  "seoScore": null,
  "metaTitleAnalysis": "string — analysis of current title tag",
  "metaDescriptionAnalysis": "string — analysis of current meta description",
  "headingStructure": ["string"],
  "keywordSuggestions": ["string"],
  "technicalSeoIssues": ["string"],
  "contentImprovementIdeas": ["string"],
  "backlinkAuthorityNotes": "string",
  "priorityFixes": ["string"],
  "finalRecommendation": "string"
}`;
}

export async function generateSeoIntelligence(inputData) {
  const { websiteUrl } = inputData || {};
  let scrapedData = null;
  let pageSpeedData = null;

  if (websiteUrl) {
    try {
      scrapedData = await scrapeWebsite({ websiteUrl });
    } catch (e) { /* continue */ }

    try {
      pageSpeedData = await getPageSpeedData(websiteUrl);
    } catch (e) { /* continue */ }
  }

  const prompt = buildPrompt(inputData, scrapedData, pageSpeedData);
  const aiResult = await callAI(prompt);

  if (aiResult.success) {
    return {
      success: true,
      data: {
        ...aiResult.data,
        pageSpeedData
      },
      provider: aiResult.provider,
      fallbackUsed: false
    };
  }

  return {
    success: true,
    data: {
      ...getRuleBasedFallback(inputData, pageSpeedData?.mobile?.seo ?? 0, scrapedData),
      pageSpeedData
    },
    provider: 'rule-based',
    fallbackUsed: true
  };
}
