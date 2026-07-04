const extractJsonFromText = (content) => {
  if (!content || typeof content !== "string") return null;
  const jsonMatch = content.match(/\{[\s\S]*\}/m);
  if (!jsonMatch) return null;

  const candidate = jsonMatch[0]
    .replace(/\n/g, " ")
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]");

  try {
    return JSON.parse(candidate);
  } catch (error) {
    try {
      return JSON.parse(candidate.replace(/\"/g, '"'));
    } catch {
      return null;
    }
  }
};

const buildProductPrompt = ({ productName, manualDescription, targetAudience, industry, websiteTitle, websiteMeta, cleanedWebsiteText, researchSummary = "" }) => {
  return `You are a senior SaaS product marketing strategist. Analyze the product using manual details, scraped website data, and real-time research. Do not copy raw website text. Convert information into clean business insights. Always infer pain points, buyer personas, USP, benefits, and marketing angles. Return valid JSON only.

Product Name: ${productName}
Industry: ${industry || "General SaaS"}
Target Audience: ${targetAudience || "Professionals"}
Manual Description: ${manualDescription || "N/A"}
Website Title: ${websiteTitle || "N/A"}
Website Meta Description: ${websiteMeta || "N/A"}

Research Evidence (summarize external research, competitor signals, market cues):
${researchSummary || "None"}

Cleaned Website Content (use as evidence only, do not copy):
${cleanedWebsiteText || "N/A"}

Return JSON only with the exact keys below:
{
  "productSummary":"",
  "category":"",
  "confidenceScore":0,
  "usp":"",
  "features":[],
  "benefits":[],
  "painPoints":[],
  "targetUsers":[],
  "buyerPersonas":[],
  "competitorTypes":[],
  "competitors":[],
  "pricingPosition":"",
  "marketMaturity":"",
  "marketingAngles":[],
  "seoOpportunities":[],
  "campaignIdeas":[],
  "recommendedModules":[],
  "dataSourcesUsed":[],
  "warnings":[]
}

Pain points and buyerPersonas must never be empty. If the product is a CRM/Marketing platform, follow the provided pain point and buyer persona rules. Use professional marketing language and do not output markdown or explanatory text — only valid JSON.`;
};

const parseOpenAIResponse = async (response) => {
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text;
  if (!content) {
    throw new Error("OpenAI response missing content");
  }
  return content;
};

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return extractJsonFromText(value);
  }
};

export const generateAnalysis = async ({ manualData = {}, scrapedData = {} } = {}) => {
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;

  // Attempt Tavily research for competitor and market signals
  let researchSummary = "";
  const providerStatus = { tavily: "skipped", openai: "skipped", gemini: "skipped" };
  const warnings = [];

  if (tavilyKey) {
    try {
      // Placeholder Tavily API call - expected to return short research summary
      const tavilyResp = await fetch(process.env.TAVILY_API_URL || "https://api.tavily.com/v1/research", {
        method: "POST",
        headers: { Authorization: `Bearer ${tavilyKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: `${manualData.productName || "Product"} ${manualData.industry || ""} competitors market overview`, limit: 6 }),
      });
      if (tavilyResp.ok) {
        const tavilyJson = await tavilyResp.json();
        researchSummary = (tavilyJson.summary || tavilyJson.data || JSON.stringify(tavilyJson)).toString().slice(0, 2000);
        providerStatus.tavily = "success";
      } else {
        providerStatus.tavily = `failed:${tavilyResp.status}`;
        warnings.push("Tavily research failed or returned non-OK status.");
      }
    } catch (err) {
      providerStatus.tavily = "failed:exception";
      warnings.push("Tavily research exception: " + (err.message || "unknown"));
    }
  } else {
    providerStatus.tavily = "missing_key";
  }

  const prompt = buildProductPrompt({
    productName: manualData.productName || "Product",
    manualDescription: manualData.description || "",
    targetAudience: manualData.targetAudience || "",
    industry: manualData.industry || "",
    websiteTitle: scrapedData?.title || "",
    websiteMeta: scrapedData?.metaDescription || "",
    cleanedWebsiteText: scrapedData?.cleanedText || "",
    researchSummary,
  });

  // If no OpenAI API key, provide heuristic fallback
  if (!openAiKey) {
    providerStatus.openai = "missing_key";
    const fallback = {
      productSummary: `Professional business intelligence for ${manualData.productName || "this product"}.`,
      category: manualData.industry || "General SaaS",
      confidenceScore: 55,
      usp: `A modern solution designed to improve business outcomes for ${manualData.targetAudience || "target users"}.`,
      features: scrapedData?.features || [],
      benefits: scrapedData?.benefits || [],
      painPoints: [
        "Unclear product differentiation",
        "Lack of concise buyer personas",
        "Difficulty measuring pricing value",
        "Insufficient marketing messaging",
      ],
      buyerPersonas: [],
      targetUsers: (manualData.targetAudience || "").split(/,|;|\s+and\s+/).map((v) => v.trim()).filter(Boolean),
      competitorTypes: [],
      competitors: [],
      marketingAngles: [],
      pricingPosition: manualData.pricing || "Competitive market pricing",
      marketMaturity: "Emerging",
      seoOpportunities: [],
      campaignIdeas: [],
      recommendedModules: [],
      dataSourcesUsed: [],
      warnings: ["AI key not configured. Using heuristic analysis."],
    };

    return { message: "heuristic", structured: fallback, providerStatus, warnings };
  }

  // Try OpenAI first
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a senior SaaS product marketing strategist. Analyze products and return JSON only." },
          { role: "user", content: prompt },
        ],
        max_tokens: 1600,
        temperature: 0.3,
      }),
    });

    if (response.ok) {
      const content = await parseOpenAIResponse(response);
      const parsed = safeJsonParse(content);
      providerStatus.openai = "success";
      if (parsed) {
        return { message: "openai", structured: parsed, providerStatus, warnings };
      }
      warnings.push("OpenAI returned content that could not be parsed as JSON.");
    } else {
      const errText = await response.text();
      providerStatus.openai = `failed:${response.status}`;
      warnings.push(`OpenAI failed: ${response.status} ${errText.slice(0, 200)}`);
      // If rate limit/quota, mark so Gemini can be attempted
      if (response.status === 429) warnings.push("OpenAI quota exceeded.");
    }
  } catch (err) {
    providerStatus.openai = "failed:exception";
    warnings.push("OpenAI exception: " + (err.message || "unknown"));
  }

  // OpenAI failed, try Gemini if available
  if (geminiKey && process.env.GEMINI_API_URL) {
    try {
      const gemResp = await fetch(process.env.GEMINI_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${geminiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, max_tokens: 1600 }),
      });
      if (gemResp.ok) {
        const gemText = await gemResp.text();
        const parsed = safeJsonParse(gemText);
        providerStatus.gemini = "success";
        if (parsed) return { message: "gemini", structured: parsed, providerStatus, warnings };
        warnings.push("Gemini returned content that could not be parsed as JSON.");
      } else {
        providerStatus.gemini = `failed:${gemResp.status}`;
        warnings.push(`Gemini failed: ${gemResp.status}`);
      }
    } catch (err) {
      providerStatus.gemini = "failed:exception";
      warnings.push("Gemini exception: " + (err.message || "unknown"));
    }
  } else if (geminiKey && !process.env.GEMINI_API_URL) {
    providerStatus.gemini = "missing_url";
  } else {
    providerStatus.gemini = "missing_key";
  }

  // If all AI failed, return a heuristic structured result but include warnings and providerStatus
  const fallbackStructured = {
    productSummary: `Professional business intelligence for ${manualData.productName || "this product"}.`,
    category: manualData.industry || "General SaaS",
    confidenceScore: 50,
    usp: `A modern solution designed to improve business outcomes for ${manualData.targetAudience || "target users"}.`,
    features: scrapedData?.features || [],
    benefits: scrapedData?.benefits || [],
    painPoints: ["Unable to run AI analysis; returning heuristic insights."],
    buyerPersonas: [],
    targetUsers: (manualData.targetAudience || "").split(/,|;|\s+and\s+/).map((v) => v.trim()).filter(Boolean),
    competitorTypes: [],
    competitors: [],
    marketingAngles: [],
    pricingPosition: manualData.pricing || "Competitive market pricing",
    marketMaturity: "Unknown",
    seoOpportunities: [],
    campaignIdeas: [],
    recommendedModules: [],
    dataSourcesUsed: [],
    warnings,
  };

  return { message: "fallback", structured: fallbackStructured, providerStatus, warnings };
};
