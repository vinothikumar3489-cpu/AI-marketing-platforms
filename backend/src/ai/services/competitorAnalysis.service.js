
import prisma from "../../config/prisma.js";
import { researchCompetitors } from "../../providers/tavily.service.js";
import { scrapeWebsite } from "../../domains/research/services/scraper.service.js";
import { callAI } from "../../domains/ai/services/aiOrchestrator.service.js";

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

RULES:
- Derive every competitor, insight, and figure ONLY from the research and scraped data above.
- When evidence is insufficient, return empty arrays or empty strings. NEVER invent competitor names, pricing, or statistics that are not present in the data.
- Return ONLY valid JSON.`;
}

function getRuleBasedFallback(inputData) {
  const { productName, industry } = inputData;
  return {
    competitorList: [],
    competitorStrengths: [],
    competitorWeaknesses: [],
    pricingInsights: [],
    positioningComparison: "",
    featureGapAnalysis: [],
    opportunitiesToBeatCompetitors: [],
    recommendedStrategy: "",
    finalRecommendation: "",
    fallbackNote: `Competitor analysis could not be generated for ${productName || "this product"} (${industry || "industry unknown"}). No AI provider was available and no verified competitor data could be retrieved. Provide competitor URLs or connect an AI provider to generate a full analysis.`
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
        const scraped = await scrapeWebsite({ websiteUrl: inputData.competitorUrls[i] });
        const content = scraped?.scrapedData || scraped || {};
        scrapedData.push({
          url: inputData.competitorUrls[i],
          title: content.title || "",
          description: content.metaDescription || "",
          headings: content.headings || [],
          cleanedText: (content.cleanedText || "").slice(0, 1000)
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
    console.log("⚠️ Using rule-based fallback for Competitor Analysis...");
    result = { success: true, data: getRuleBasedFallback(inputData), provider: "rule-based", fallbackUsed: true };
  } else {
    result.fallbackUsed = false;
  }

  return result;
}

