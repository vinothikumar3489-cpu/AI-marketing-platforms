
import { prisma } from "../../config/prisma.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_API_URL = process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta/models";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

function extractJsonFromText(text) {
  if (!text || typeof text !== "string") return null;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.warn("Failed to parse JSON from AI response:", e.message);
    return null;
  }
}

function buildPrompt(productData, scrapedData) {
  const { productName, description, targetMarket } = productData;
  const { title, metaDescription, headings, features, benefits, cleanedText } = scrapedData || {};

  return `You are a Senior Product Marketing Analyst. Analyze this product and generate comprehensive marketing insights.

PRODUCT DETAILS:
- Name: ${productName}
- Description: ${description || "Not provided"}
- Target Market: ${targetMarket || "Not specified"}

WEBSITE DATA (if available):
- Title: ${title || "Not found"}
- Meta Description: ${metaDescription || "Not found"}
- Headings: ${(headings || []).join(", ")}
- Key Features: ${(features || []).join(", ")}
- Key Benefits: ${(benefits || []).join(", ")}
- Cleaned Page Content (first 2000 chars): ${cleanedText || "Not available"}

Return ONLY a valid JSON object with these exact fields (no markdown, no extra text):
{
  "productSummary": "Brief 2-3 sentence product overview",
  "targetAudience": ["Audience 1", "Audience 2", "Audience 3"],
  "painPoints": ["Pain 1", "Pain 2", "Pain 3", "Pain 4"],
  "uniqueValueProposition": "Clear statement of what makes this product unique",
  "marketOpportunities": ["Opportunity 1", "Opportunity 2", "Opportunity 3"],
  "competitorIdeas": ["Competitor 1", "Competitor 2", "Competitor 3"],
  "seoSuggestions": ["Keyword 1", "Keyword 2", "Keyword 3", "Keyword 4"],
  "campaignIdeas": ["Campaign 1", "Campaign 2", "Campaign 3"],
  "finalRecommendation": "Actionable recommendation for next steps"
}

Ensure all arrays have at least 3 items. Return ONLY valid JSON.`;
}

function getRuleBasedFallback(productData) {
  return {
    hasVerifiedData: false,
    confidenceScore: 0,
    provider: 'fallback_evidence',
    warnings: ['Module: Insufficient verified data - AI providers unavailable'],
    dataSources: [],
    note: 'No verified market data available'
  };
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    console.log("⚠️ GEMINI_API_KEY not found");
    return { success: false };
  }
  try {
    console.log("🤖 Calling Gemini API...");
    const response = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 1500,
          temperature: 0.4
        }
      }),
      signal: AbortSignal.timeout(45000)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.warn("❌ Gemini API error:", response.status, errorData);
      return { success: false };
    }
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      console.warn("❌ Gemini response missing content");
      return { success: false };
    }
    const parsed = extractJsonFromText(content);
    if (!parsed) {
      console.warn("❌ Failed to parse JSON from Gemini response");
      return { success: false };
    }
    console.log("✅ Gemini API successful");
    return { success: true, data: parsed, provider: "gemini" };
  } catch (e) {
    console.warn("❌ Gemini API failed:", e.message);
    return { success: false };
  }
}

async function callGroq(prompt) {
  if (!GROQ_API_KEY) {
    console.log("⚠️ GROQ_API_KEY not found");
    return { success: false };
  }
  try {
    console.log("🤖 Calling Groq API...");
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500,
        temperature: 0.4
      }),
      signal: AbortSignal.timeout(45000)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.warn("❌ Groq API error:", response.status, errorData);
      return { success: false };
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.warn("❌ Groq response missing content");
      return { success: false };
    }
    const parsed = extractJsonFromText(content);
    if (!parsed) {
      console.warn("❌ Failed to parse JSON from Groq response");
      return { success: false };
    }
    console.log("✅ Groq API successful");
    return { success: true, data: parsed, provider: "groq" };
  } catch (e) {
    console.warn("❌ Groq API failed:", e.message);
    return { success: false };
  }
}

async function callOpenAI(prompt) {
  if (!OPENAI_API_KEY) {
    console.log("⚠️ OPENAI_API_KEY not found");
    return { success: false };
  }
  try {
    console.log("🤖 Calling OpenAI API...");
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500,
        temperature: 0.4,
        response_format: { type: "json_object" }
      }),
      signal: AbortSignal.timeout(45000)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.warn("❌ OpenAI API error:", response.status, errorData);
      return { success: false };
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.warn("❌ OpenAI response missing content");
      return { success: false };
    }
    const parsed = extractJsonFromText(content);
    if (!parsed) {
      console.warn("❌ Failed to parse JSON from OpenAI response");
      return { success: false };
    }
    console.log("✅ OpenAI API successful");
    return { success: true, data: parsed, provider: "openai" };
  } catch (e) {
    console.warn("❌ OpenAI API failed:", e.message);
    return { success: false };
  }
}

/**
 * Generic AI caller: tries Gemini → Groq → OpenAI → returns { success, data?, provider? }
 */
export async function callAI(prompt) {
  let result = await callGemini(prompt);
  if (result.success) return result;
  result = await callGroq(prompt);
  if (result.success) return result;
  result = await callOpenAI(prompt);
  if (result.success) return result;
  return { success: false };
}

export async function generateProductAnalysis(productData, scrapedData) {
  const prompt = buildPrompt(productData, scrapedData);
  console.log("📝 Prompt size (chars):", prompt.length);
  console.log("📊 Scraped content length (chars):", (scrapedData?.cleanedText || "").length);

  let result = await callAI(prompt);
  if (result.success) {
    return { ...result, fallbackUsed: false };
  }

  // No verified data available
  console.log("⚠️ AI providers unavailable, returning no-verified-data response...");
  const fallbackData = getRuleBasedFallback(productData);
  return {
    success: true,
    data: fallbackData,
    provider: "fallback_evidence",
    fallbackUsed: true
  };
}
