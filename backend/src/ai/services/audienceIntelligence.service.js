
import { prisma } from "../../config/prisma.js";
import { researchCompetitors } from "../../services/tavily.service.js";
import { callAI } from "./aiRouter.service.js";

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

function getRuleBasedFallback(inputData) {
  const { productName, industry } = inputData;
  return {
    customerPersonas: [
      { name: "The Budget-Conscious Student", description: "Looking for affordable tools to help with their studies" },
      { name: "The Recent Graduate", description: "New to the job market, seeking tools to boost their career" },
      { name: "The Career Changer", description: "Switching fields, needing help to build new skills and resume" }
    ],
    demographics: ["Ages 18-25", "Students and recent graduates", "Located in urban and suburban areas"],
    psychographics: ["Tech-savvy", "Value-conscious", "Career-focused"],
    buyingMotivations: ["Save time", "Improve chances of getting hired", "Affordable pricing"],
    painPoints: ["Complex resume builders", "High subscription costs", "Lack of personalization"],
    preferredChannels: ["Instagram", "TikTok", "LinkedIn", "University career centers"],
    messagingStrategy: "Focus on simplicity, affordability, and real results from similar users",
    contentIdeas: ["Resume templates for students", "Interview tips for freshers", "Success stories from recent graduates"],
    finalRecommendation: "Start with a freemium model, partner with universities, and leverage user-generated content"
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
    console.log("⚠️ Using rule-based fallback for Audience Intelligence...");
    result = { success: true, data: getRuleBasedFallback(inputData), provider: "rule-based", fallbackUsed: true };
  } else {
    result.fallbackUsed = false;
  }

  return result;
}
