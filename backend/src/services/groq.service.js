/**
 * Groq Service
 * Handles fallback product intelligence analysis via Groq API.
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_API_URL = process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";

export const buildGroqSystemPrompt = () => {
  return `You are a senior SaaS product marketing strategist and competitive intelligence analyst. Your job is to transform scraped website data and manual product information into professional business intelligence.

Core Rules:
1. Never copy raw website text verbatim.
2. Infer business insights from evidence.
3. Generate structured marketing intelligence.
4. Provide market positioning and competitive context.
5. Identify pain points, buyer personas, and market opportunities.
6. Always return valid JSON only.
7. Never include markdown, explanations, or preamble.

Return a JSON object with all required fields and arrays.`;
};

export const buildGroqUserPrompt = (productData, scrapedData, researchData) => {
  const { productName, description, industry, targetAudience, competitors, pricing } = productData || {};
  const { title, metaDescription, heroText, cleanedText, features, benefits, ctas, pricingText } = scrapedData || {};
  const { competitors: researchCompetitors, marketSignals } = researchData || {};

  return `Analyze this product and generate professional product intelligence in JSON format only.

PRODUCT INFORMATION:
Name: ${productName || "Unknown"}
Industry: ${industry || "General SaaS"}
Description: ${description || "No description provided"}
Target Audience: ${targetAudience || "Not specified"}
Pricing Model: ${pricing || "Not specified"}
Mentioned Competitors: ${competitors || "None"}

WEBSITE DATA:
Title: ${title || "N/A"}
Meta: ${metaDescription || "N/A"}
Hero Text: ${heroText ? heroText.slice(0, 500) : "N/A"}
Features: ${(features || []).slice(0, 5).join(", ") || "N/A"}
Benefits: ${(benefits || []).slice(0, 5).join(", ") || "N/A"}
CTAs: ${(ctas || []).slice(0, 3).join(", ") || "N/A"}
Pricing Info: ${pricingText ? pricingText.slice(0, 200) : "N/A"}
Website Copy: ${cleanedText ? cleanedText.slice(0, 1500) : "N/A"}

RESEARCH DATA:
Competitors Found: ${(researchCompetitors || []).slice(0, 5).join(", ") || "None"}
Market Signals: ${marketSignals || "None"}

Return this exact JSON structure with all fields populated (never leave arrays empty):
{
  "productSummary": "",
  "category": "",
  "confidenceScore": 0,
  "businessModel": "",
  "revenueModel": "",
  "marketSegment": "",
  "marketMaturity": "",
  "usp": "",
  "features": [],
  "benefits": [],
  "painPoints": [],
  "targetUsers": [],
  "buyerPersonas": [],
  "competitors": [],
  "directCompetitors": [],
  "indirectCompetitors": [],
  "emergingCompetitors": [],
  "pricingPosition": "",
  "marketingAngles": [],
  "seoOpportunities": [],
  "campaignIdeas": [],
  "recommendedChannels": [],
  "confidenceBreakdown": {
    "dataQuality": 0,
    "aiProvider": 0,
    "researchSignal": 0
  },
  "recommendedModules": []
}`;
};

const extractJsonFromGroqResponse = (text) => {
  if (!text || typeof text !== "string") return null;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.warn("Failed to parse JSON from Groq response:", e.message);
    return null;
  }
};

export const analyzeProductWithGroq = async (productData, scrapedData, researchData) => {
  if (!GROQ_API_KEY) {
    return {
      success: false,
      error: "GROQ_API_KEY not configured",
      code: "missing_key",
    };
  }

  const url = GROQ_API_URL;
  const systemPrompt = buildGroqSystemPrompt();
  const userPrompt = buildGroqUserPrompt(productData, scrapedData, researchData);

  try {
    let response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.4,
      }),
    });

    // If json_object fails, retry without it
    if (!response.ok && response.status === 400) {
      console.warn(`[Groq] JSON mode failed with 400. Retrying without JSON mode...`);
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 2000,
          temperature: 0.4,
        }),
      });
    }

    const data = await response.json();
    if (!response.ok) {
      const error = data.error || {};
      console.warn(`[Groq] API Error: model=${GROQ_MODEL}, status=${response.status}, message=${error.message}`);
      return {
        success: false,
        error: error.message || `Groq error: ${response.status}`,
        code: error.code || "api_error",
      };
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.warn(`[Groq] Missing content: model=${GROQ_MODEL}, status=${response.status}`);
      return {
        success: false,
        error: "Groq response missing content",
        code: "missing_content",
      };
    }

    const parsed = extractJsonFromGroqResponse(content);
    if (!parsed) {
      return {
        success: false,
        error: "Failed to parse JSON from Groq response",
        code: "parse_error",
        rawContent: content.slice(0, 500),
      };
    }

    return {
      success: true,
      data: parsed,
      model: GROQ_MODEL,
      provider: "groq",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: "api_error",
    };
  }
};
