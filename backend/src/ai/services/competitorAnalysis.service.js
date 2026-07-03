
import { prisma } from "../../config/prisma.js";
import { researchCompetitors } from "../../services/tavily.service.js";
import { scrapeWebsite } from "../../services/scraper.service.js";
import { callAI } from "./aiRouter.service.js";

function buildPrompt(inputData, researchData, scrapedData) {
  const { productName, industry, targetCountry, targetAudience } = inputData;
  const research = JSON.stringify(researchData || {}).slice(0, 1500);
  const scraped = JSON.stringify(scrapedData || []).slice(0, 1500);

  return `You are a Senior Competitor Analyst. Analyze competitors for the following product and provide comprehensive insights.

PRODUCT DETAILS:
- Product Name: ${productName}
- Industry: ${industry}
- Target Country: ${targetCountry}
- Target Audience: ${targetAudience}

TAVILY RESEARCH DATA (TRIMMED):
${research}

SCRAPED COMPETITOR DATA (TRIMMED):
${scraped}

Return ONLY a valid JSON object with these exact fields (no markdown, no extra text):
{
  "competitorList": ["Competitor 1", "Competitor 2", "Competitor 3"],
  "competitorStrengths": ["Strength 1", "Strength 2", "Strength 3"],
  "competitorWeaknesses": ["Weakness 1", "Weakness 2", "Weakness 3"],
  "pricingInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "positioningComparison": "Detailed comparison of how your product is positioned vs competitors",
  "featureGapAnalysis": ["Gap 1", "Gap 2", "Gap 3"],
  "opportunitiesToBeatCompetitors": ["Opportunity 1", "Opportunity 2", "Opportunity 3"],
  "recommendedStrategy": "Your recommended go-to-market strategy to beat competitors",
  "finalRecommendation": "Your final actionable recommendation"
}

Ensure all arrays have at least 3 items. Return ONLY valid JSON.`;
}

function getRuleBasedFallback(inputData) {
  return {
    hasVerifiedData: false,
    confidenceScore: 0,
    provider: 'fallback_evidence',
    warnings: ['Module: Insufficient verified data - AI providers unavailable'],
    dataSources: [],
    note: 'No verified competitor data available'
  };
}

export async function generateCompetitorAnalysis(inputData) {
  let researchData = null;
  let scrapedData = [];

  // Step 1: If competitorUrls are provided, scrape them
  if (inputData.competitorUrls && inputData.competitorUrls.length > 0) {
    console.log("🔍 Scraping provided competitor URLs...");
    for (let i = 0; i < Math.min(inputData.competitorUrls.length, 3); i++) {
      try {
        const scraped = await scrapeWebsite(inputData.competitorUrls[i]);
        scrapedData.push({
          url: inputData.competitorUrls[i],
          title: scraped?.title || "",
          description: scraped?.metaDescription || "",
          headings: scraped?.headings || [],
          cleanedText: (scraped?.cleanedText || "").slice(0, 1000)
        });
      } catch (e) {
        console.warn(`⚠️ Failed to scrape ${inputData.competitorUrls[i]}:`, e.message);
      }
    }
  } else {
    // Step 2: If no competitorUrls, use Tavily to discover competitors
    try {
      console.log("🔍 Using Tavily to discover competitors...");
      researchData = await researchCompetitors(
        inputData.productName,
        inputData.industry,
        inputData.productName
      );
    } catch (e) {
      console.warn("⚠️ Tavily research failed:", e.message);
    }
  }

  // Step 3: Build prompt
  const prompt = buildPrompt(inputData, researchData, scrapedData);
  console.log("📝 Competitor Analysis prompt size (chars):", prompt.length);

  // Step 4: Call AI providers via canonical router
  let result = await callAI(prompt);
  if (!result.success) {
    console.log("⚠️ AI providers unavailable for Competitor Analysis...");
    result = { success: true, data: getRuleBasedFallback(inputData), provider: "fallback_evidence", fallbackUsed: true };
  } else {
    result.fallbackUsed = false;
  }

  return result;
}

