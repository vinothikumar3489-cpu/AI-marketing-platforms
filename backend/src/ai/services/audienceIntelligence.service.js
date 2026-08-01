
import prisma from "../../config/prisma.js";
import { researchCompetitors } from "../../providers/tavily.service.js";
import { callAI } from "../../domains/ai/services/aiOrchestrator.service.js";

function buildPrompt(inputData, researchData) {
  const { productName, industry, targetCountry, ageGroup, targetAudience, businessStage } = inputData;
  const research = JSON.stringify(researchData || {}).slice(0, 2000);

  return `You are a Senior Audience Analyst. Analyze the target audience for the following product and provide comprehensive insights.

PRODUCT DETAILS:
- Product Name: ${productName}
- Industry: ${industry}
- Target Country: ${targetCountry}
- Age Group: ${ageGroup}
- Target Audience: ${targetAudience}
- Business Stage: ${businessStage}

TAVILY RESEARCH DATA (TRIMMED):
${research}

Return ONLY a valid JSON object with these exact fields (no markdown, no extra text):
{
  "customerPersonas": [{"name": "", "description": ""}, {"name": "", "description": ""}, {"name": "", "description": ""}],
  "demographics": ["", "", ""],
  "psychographics": ["", "", ""],
  "buyingMotivations": ["", "", ""],
  "painPoints": ["", "", ""],
  "preferredChannels": ["", "", ""],
  "messagingStrategy": "",
  "contentIdeas": ["", "", ""],
  "finalRecommendation": ""
}

RULES:
- Derive every persona and insight ONLY from the research data above and the provided audience details.
- Treat user-provided audience hints as starting points, never echo them verbatim as persona names.
- When evidence is insufficient, return empty arrays or empty strings. NEVER invent demographics, statistics, or motivations that are not grounded in the data.
- Return ONLY valid JSON.
`;
}

function getRuleBasedFallback(inputData) {
  const { productName, industry, targetAudience } = inputData;
  return {
    customerPersonas: [],
    demographics: [],
    psychographics: [],
    buyingMotivations: [],
    painPoints: [],
    preferredChannels: [],
    messagingStrategy: "",
    contentIdeas: [],
    finalRecommendation: "",
    fallbackNote: `Audience intelligence could not be generated for ${productName || "this product"} (${industry || "industry unknown"}). No AI provider was available and no verified audience research could be retrieved. Provide verified research sources or connect an AI provider to generate a full analysis.`
  };
}

export async function generateAudienceIntelligence(inputData) {
  let researchData = null;
  try {
    console.log("🔍 Researching audience via Tavily...");
    researchData = await researchCompetitors(
      inputData.productName,
      inputData.industry,
      inputData.targetAudience
    );
  } catch (e) {
    console.warn("⚠️ Tavily research failed:", e.message);
  }

  const prompt = buildPrompt(inputData, researchData);
  console.log("📝 Audience Intelligence prompt size (chars):", prompt.length);

  let result = await callAI(prompt);
  if (!result.success) {
    console.warn("⚠️ Audience Intelligence AI failed, returning verified-evidence-only fallback");
    result = { success: true, data: getRuleBasedFallback(inputData), provider: "rule-based", fallbackUsed: true };
  } else {
    result.fallbackUsed = false;
  }

  return result;
}
