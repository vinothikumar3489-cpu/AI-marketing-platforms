
import prisma from "../../config/prisma.js";
import { researchCompetitors } from "../../providers/tavily.service.js";
import { callAI } from "../../domains/ai/services/aiOrchestrator.service.js";

function buildPrompt(inputData, researchData) {
  const { productName, industry, targetCountry, targetAudience, businessStage } = inputData;
  const research = JSON.stringify(researchData || {}).slice(0, 2500);

  return `You are a Senior Market Research Analyst. Analyze the market for this product and provide comprehensive insights.

PRODUCT DETAILS:
- Product Name: ${productName}
- Industry: ${industry}
- Target Country: ${targetCountry}
- Target Audience: ${targetAudience}
- Business Stage: ${businessStage}

TAVILY RESEARCH DATA (TRIMMED):
${research}

Return ONLY a valid JSON object with these exact fields (no markdown, no extra text):
{
  "marketOverview": "Brief overview of the market size and key players",
  "marketDemand": "Current market demand and growth rate",
  "currentTrends": ["Trend 1", "Trend 2", "Trend 3"],
  "targetCustomerSegments": ["Segment 1", "Segment 2", "Segment 3"],
  "growthOpportunities": ["Opportunity 1", "Opportunity 2", "Opportunity 3"],
  "risks": ["Risk 1", "Risk 2", "Risk 3"],
  "recommendedMarketEntryStrategy": "Step-by-step entry strategy",
  "pricingSuggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"],
  "finalRecommendation": "Actionable final recommendation"
}

RULES:
- Derive every trend, segment, and figure ONLY from the research data above.
- Do NOT invent market size numbers (TAM/SAM/SOM), growth rates, or statistics that are not present in the research data.
- When evidence is insufficient, return empty arrays or empty strings.
- Return ONLY valid JSON.`;
}

function getRuleBasedFallback(inputData) {
  const { productName, industry, targetCountry } = inputData;
  return {
    marketOverview: "",
    marketDemand: "",
    currentTrends: [],
    targetCustomerSegments: [],
    growthOpportunities: [],
    risks: [],
    recommendedMarketEntryStrategy: "",
    pricingSuggestions: [],
    finalRecommendation: "",
    fallbackNote: `Market discovery could not be generated for ${productName || "this product"} (${industry || "industry unknown"}, ${targetCountry || "country unknown"}). No AI provider was available and no verified market research could be retrieved. Connect an AI provider or retry with verified market sources to generate a full analysis.`
  };
}

export async function generateMarketDiscovery(inputData) {
  // Step 1: Do Tavily research
  let researchData = null;
  try {
    console.log("🔍 Researching market via Tavily...");
    const researchResult = await researchCompetitors(
      inputData.productName,
      inputData.industry,
      inputData.productName
    );
    if (researchResult) {
      researchData = {
        competitors: researchResult.competitors,
        marketSignals: researchResult.marketSignals,
        seoOpportunities: researchResult.seoOpportunities
      };
      console.log("✅ Tavily research complete");
    }
  } catch (e) {
    console.warn("⚠️ Tavily research failed:", e.message);
  }

  // Step 2: Build prompt
  const prompt = buildPrompt(inputData, researchData);
  console.log("📝 Market Discovery prompt size (chars):", prompt.length);

  // Step 3: Call AI providers via canonical router
  let result = await callAI(prompt);
  if (!result.success) {
    console.log("⚠️ Using rule-based fallback for Market Discovery...");
    result = { success: true, data: getRuleBasedFallback(inputData), provider: "rule-based", fallbackUsed: true };
  } else {
    result.fallbackUsed = false;
  }

  return result;
}

