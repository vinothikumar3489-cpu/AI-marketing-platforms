/**
 * OpenAI Service
 * Handles structured product analysis via OpenAI API with proper error handling
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Build system prompt for product analysis
 */
export const buildSystemPrompt = () => {
  return `You are a senior SaaS product marketing strategist and competitive intelligence analyst. Your role is to transform scraped website data and manual product information into professional business intelligence comparable to Semrush, HubSpot AI, and Similarweb.

Core Requirements:
1. Never copy raw website text verbatim
2. Infer business insights from evidence
3. Generate actionable marketing intelligence
4. Provide market positioning and competitive context
5. Identify pain points, buyer personas, and market opportunities
6. Always return valid, parseable JSON only
7. Never include markdown, explanations, or preamble

Analysis Goals:
- Category: Classify the product into its market segment
- USP: Distill unique value proposition (1-2 sentences)
- Pain Points: List 5-7 problems the product solves (never empty)
- Buyer Personas: Define 4-6 detailed personas with goals and challenges
- Competitors: Identify direct, indirect, and emerging competitors
- Market Maturity: Classify market stage (Emerging, Growth, Mature Leader, Saturated)
- Business Model: Identify revenue model (SaaS, Freemium, One-time, Marketplace, etc.)
- Marketing Angles: Suggest 5-7 positioning angles for campaigns
- SEO Opportunities: Identify high-value keywords and content gaps
- Campaign Ideas: Suggest 3-5 marketing campaigns

Output ONLY valid JSON with no additional text.`;
};

/**
 * Build user prompt for analysis
 */
export const buildUserPrompt = (productData, scrapedData, researchData) => {
  const { productName, description, industry, targetAudience, competitors, pricing } = productData || {};
  const { title, metaDescription, heroText, cleanedText, features, benefits, ctas, pricingText } = scrapedData || {};
  const { competitors: researchCompetitors, marketSignals, trends } = researchData || {};

  return `Analyze this product and return professional business intelligence in JSON format only.

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
Features (top 5): ${(features || []).slice(0, 5).join(", ") || "N/A"}
Benefits (top 5): ${(benefits || []).slice(0, 5).join(", ") || "N/A"}
CTAs: ${(ctas || []).slice(0, 3).join(", ") || "N/A"}
Pricing Info: ${pricingText ? pricingText.slice(0, 200) : "N/A"}
Website Copy (cleaned): ${cleanedText ? cleanedText.slice(0, 1500) : "N/A"}

RESEARCH DATA:
Competitors Found: ${(researchCompetitors || []).slice(0, 5).join(", ") || "None"}
Market Signals: ${marketSignals || "None"}
Trends: ${trends || "None"}

Return this exact JSON structure (all fields required, never leave arrays empty):
{
  "productSummary": "Professional 2-3 sentence summary (no website text copy)",
  "category": "Market category (e.g., 'SEO Platform', 'CRM', 'Project Management')",
  "confidenceScore": 85,
  "businessModel": "SaaS/Freemium/One-time/Marketplace/etc",
  "revenueModel": "Subscription/Licensing/etc",
  "marketSegment": "Target market segment",
  "usp": "Unique value proposition (1-2 sentences)",
  "features": ["Feature 1", "Feature 2", ...],
  "benefits": ["Benefit 1", "Benefit 2", ...],
  "painPoints": ["Pain 1", "Pain 2", "Pain 3", "Pain 4", "Pain 5"],
  "targetUsers": ["User type 1", "User type 2", ...],
  "buyerPersonas": [
    {
      "name": "Persona Name",
      "title": "Job Title",
      "goal": "Primary goal",
      "challenge": "Main challenge",
      "department": "Department"
    }
  ],
  "competitors": [
    {
      "name": "Competitor",
      "type": "direct|indirect|emerging",
      "positioning": "Brief positioning"
    }
  ],
  "pricingPosition": "Competitive positioning on price",
  "marketMaturity": "Emerging/Growth/Mature Leader/Saturated",
  "marketingAngles": ["Angle 1", "Angle 2", ...],
  "seoOpportunities": ["Keyword/opportunity 1", "Keyword/opportunity 2", ...],
  "campaignIdeas": ["Campaign 1", "Campaign 2", "Campaign 3"],
  "recommendedModules": ["Module 1", "Module 2", ...]
}

Important:
- painPoints array must have at least 5 items (never empty)
- buyerPersonas must have at least 4 personas (never generic)
- marketMaturity: For established/recognized brands, use "Mature Leader" not "Unknown"
- Do not copy website text
- Return JSON only`;
};

/**
 * Parse OpenAI response
 */
const parseOpenAIResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    // Handle specific OpenAI errors
    const error = data.error || {};
    if (error.code === "insufficient_quota" || error.code === "rate_limit_exceeded") {
      const err = new Error(error.message || "OpenAI quota/rate limit exceeded");
      err.code = error.code;
      err.retryable = true;
      throw err;
    }
    throw new Error(error.message || `OpenAI error: ${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text;
  if (!content) throw new Error("OpenAI response missing content");
  return content;
};

/**
 * Parse JSON from text, handling common LLM formatting issues
 */
const extractJsonFromResponse = (text) => {
  if (!text || typeof text !== "string") return null;

  // Try to find JSON block
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.warn("Failed to parse JSON from OpenAI response:", e.message);
    return null;
  }
};

/**
 * Call OpenAI API with structured prompt
 */
export const analyzeProductWithOpenAI = async (productData, scrapedData, researchData) => {
  if (!OPENAI_API_KEY) {
    return {
      success: false,
      error: "OPENAI_API_KEY not configured",
      code: "missing_key",
    };
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(productData, scrapedData, researchData);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.4,
      }),
    });

    const content = await parseOpenAIResponse(response);
    const parsed = extractJsonFromResponse(content);

    if (!parsed) {
      return {
        success: false,
        error: "Failed to parse JSON from OpenAI response",
        code: "parse_error",
        rawContent: content.slice(0, 500),
      };
    }

    return {
      success: true,
      data: parsed,
      model: OPENAI_MODEL,
      provider: "openai",
    };
  } catch (error) {
    const retryable = error.retryable || error.code === "insufficient_quota" || error.code === "rate_limit_exceeded";
    return {
      success: false,
      error: error.message,
      code: error.code || "api_error",
      retryable,
    };
  }
};
