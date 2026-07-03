/**
 * Gemini Service
 * Handles fallback product analysis via Google Gemini API
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_API_URL = process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Build system context for Gemini
 */
export const buildGeminiSystemContext = () => {
  return `You are a professional SaaS product marketing strategist and competitive intelligence analyst. Transform product information into business intelligence for professional analysis platforms.

Core Rules:
1. Never copy raw website text
2. Generate structured marketing insights
3. Return valid JSON only
4. Never include markdown or explanations
5. All arrays must have content (never empty)
6. For established brands, never return "Unknown" for market maturity`;
};

/**
 * Build user message for Gemini
 */
export const buildGeminiUserMessage = (productData, scrapedData, researchData) => {
  const { productName, description, industry, targetAudience, pricing } = productData || {};
  const { title, heroText, cleanedText, features, benefits, ctas } = scrapedData || {};

  return `Analyze this product and generate marketing intelligence:

PRODUCT: ${productName || "Unknown"} | Industry: ${industry || "SaaS"}
Description: ${description || "N/A"}
Audience: ${targetAudience || "N/A"}
Pricing: ${pricing || "N/A"}

WEBSITE DATA:
Title: ${title || "N/A"}
Features: ${(features || []).slice(0, 5).join(", ") || "N/A"}
Benefits: ${(benefits || []).slice(0, 5).join(", ") || "N/A"}
CTAs: ${(ctas || []).slice(0, 3).join(", ") || "N/A"}
Copy: ${cleanedText ? cleanedText.slice(0, 1000) : "N/A"}

Generate this JSON (all fields required):
{
  "productSummary": "2-3 sentence summary",
  "category": "Product category",
  "confidenceScore": 80,
  "businessModel": "SaaS or other model",
  "usp": "Unique value proposition",
  "features": ["Feature 1", "Feature 2", "Feature 3"],
  "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
  "painPoints": ["Pain 1", "Pain 2", "Pain 3", "Pain 4", "Pain 5"],
  "buyerPersonas": [
    {"name": "Persona 1", "title": "Title", "goal": "Goal", "challenge": "Challenge"}
  ],
  "competitors": [
    {"name": "Competitor", "type": "direct", "positioning": "Their positioning"}
  ],
  "marketMaturity": "Growth or Mature Leader (not Unknown)",
  "marketingAngles": ["Angle 1", "Angle 2", "Angle 3"],
  "seoOpportunities": ["Keyword 1", "Keyword 2"],
  "campaignIdeas": ["Campaign 1", "Campaign 2"]
}

Important: All arrays must have content. Never return empty arrays. Return JSON only.`;
};

/**
 * Extract JSON from Gemini response
 */
const extractJsonFromGeminiResponse = (text) => {
  if (!text || typeof text !== "string") return null;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.warn("Failed to parse JSON from Gemini response:", e.message);
    return null;
  }
};

/**
 * Call Gemini API with structured prompt
 */
export const analyzeProductWithGemini = async (productData, scrapedData, researchData) => {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      error: "GEMINI_API_KEY not configured",
      code: "missing_key",
    };
  }

  // Build the API URL properly
  const url = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const systemContext = buildGeminiSystemContext();
  const userMessage = buildGeminiUserMessage(productData, scrapedData, researchData);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemContext },
              { text: userMessage },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.4,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error = errorData.error || {};
      return {
        success: false,
        error: error.message || `Gemini error: ${response.status}`,
        code: error.code || "api_error",
      };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return {
        success: false,
        error: "Gemini response missing content",
        code: "missing_content",
      };
    }

    const parsed = extractJsonFromGeminiResponse(content);
    if (!parsed) {
      return {
        success: false,
        error: "Failed to parse JSON from Gemini response",
        code: "parse_error",
        rawContent: content.slice(0, 500),
      };
    }

    return {
      success: true,
      data: parsed,
      model: GEMINI_MODEL,
      provider: "gemini",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: "api_error",
    };
  }
};
