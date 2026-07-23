
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

Ensure all arrays have at least 3 items. Return ONLY valid JSON.
`;
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
    console.warn("⚠️ Audience Intelligence AI failed, returning partial results");
    return { success: false, error: "Audience intelligence generation failed", provider: "ai", fallbackUsed: false };
  } else {
    result.fallbackUsed = false;
  }

  return result;
}
