
import { prisma } from "../../config/prisma.js";
import { scrapeWebsite } from "../../services/scraper.service.js";
import { callAI } from "./aiRouter.service.js";

const getPageSpeedKey = () => process.env.PAGESPEED_API_KEY || "";
const PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

function getRuleBasedFallback(inputData, pageSpeedScore = 0) {
  const productName = inputData?.productName || 'Product';
  return {
    seoScore: null,
    pageSpeedScore: pageSpeedScore,
    metaTitleAnalysis: "Check if title is 50-60 characters, includes main keyword, and is unique.",
    metaDescriptionAnalysis: "Check if description is 150-160 characters, includes main keyword, and is compelling.",
    headingStructure: ["Ensure one H1 per page", "Use H2-H3 for content hierarchy", "Include keywords in headings"],
    keywordSuggestions: [`${productName} features`, `${productName} pricing`, `${productName} vs alternatives`, `${productName} for teams`],
    technicalSeoIssues: ["Check mobile-friendliness", "Ensure fast page speed", "Verify SSL certificate"],
    contentImprovementIdeas: ["Create product-specific landing pages", "Add use-case documentation", "Build comparison content"],
    backlinkAuthorityNotes: "Backlink data not available — focus on content quality and internal linking.",
    priorityFixes: ["Verify meta tags across key pages", "Improve page speed", "Fix heading hierarchy"],
    finalRecommendation: "Build topical authority through product-specific content."
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
      scrapedData = await scrapeWebsite(websiteUrl);
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
      ...getRuleBasedFallback(inputData, pageSpeedData?.mobile?.seo ?? 0),
      pageSpeedData
    },
    provider: 'rule-based',
    fallbackUsed: true
  };
}
