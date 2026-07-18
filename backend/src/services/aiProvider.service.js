import { researchCompetitors, generateFallbackCompetitorInsights } from "./tavily.service.js";
import { sanitizeText } from '../utils/text.util.js';

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const OPENROUTER_API_URL = "https://api.openrouter.ai/v1/chat/completions";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const CEREBRAS_MODEL = process.env.CEREBRAS_MODEL || "cerebras-c1-mini";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-business-intel";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "qwen-7b-chat";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const MAX_PROMPT_LENGTH = 3200;

function limitArray(value, max) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).slice(0, max).map((item) => (typeof item === "string" ? sanitizeText(item) : item));
  if (typeof value === "string") {
    return value.split(/[;,\n]/).map((item) => sanitizeText(item)).filter(Boolean).slice(0, max);
  }
  return [];
}

function flattenString(value) {
  if (!value) return "";
  if (Array.isArray(value)) return value.map(flattenString).filter(Boolean).join(" ");
  if (typeof value === "object") return flattenString(JSON.stringify(value));
  return String(value);
}

function buildPrompt({ productData = {}, scrapedData = {}, researchData = {} }) {
  const features = limitArray(scrapedData.features, 10);
  const benefits = limitArray(scrapedData.benefits, 10);
  const researchCompetitors = limitArray(researchData.competitors, 6);
  const marketSignals = limitArray(researchData.marketSignals || [], 5);
  const researchQueries = limitArray(researchData.queries, 6);

  const websiteEvidence = [
    sanitizeText(scrapedData.title),
    sanitizeText(scrapedData.metaDescription),
    sanitizeText(scrapedData.heroText),
    sanitizeText(scrapedData.pricingText),
    sanitizeText(scrapedData.cleanedText).slice(0, 1600),
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are a senior SaaS product marketing strategist and competitive intelligence analyst. Use the product profile, website evidence, and market research to produce a clean, professional product intelligence report.

Do not include markdown, tables, code fences, or raw HTML. Return valid JSON only. Use the exact schema fields and do not use “Unknown” for mature brands.

PRODUCT PROFILE:
Name: ${sanitizeText(productData.productName) || "Product"}
Company: ${sanitizeText(productData.companyName) || "N/A"}
Industry: ${sanitizeText(productData.industry) || "General SaaS"}
Description: ${sanitizeText(productData.description) || "Not provided"}
Target audience: ${sanitizeText(productData.targetAudience) || "Not specified"}
Pricing: ${sanitizeText(productData.pricing) || "Not specified"}
Competitors: ${sanitizeText(productData.competitors) || "Not provided"}
Business goal: ${sanitizeText(productData.businessGoal) || "Not provided"}

WEBSITE EVIDENCE:
${websiteEvidence || "No website evidence available"}

RESEARCH FOUND:
Competitors: ${researchCompetitors.join(", ") || "None"}
Market signals: ${marketSignals.join("; ") || "None"}
Research queries: ${researchQueries.join("; ") || "None"}

Return valid JSON only with these fields:
{
  "productSummary": "",
  "category": "",
  "marketSegment": "",
  "businessModel": "",
  "revenueModel": "",
  "marketMaturity": "",
  "usp": [],
  "features": [],
  "benefits": [],
  "painPoints": [],
  "targetUsers": [],
  "buyerPersonas": [],
  "directCompetitors": [],
  "indirectCompetitors": [],
  "emergingCompetitors": [],
  "pricingPosition": "",
  "seoOpportunities": [],
  "marketingAngles": [],
  "campaignIdeas": [],
  "recommendedChannels": [],
  "marketDiscovery": {
    "marketSizeEstimate": "",
    "marketTrends": [],
    "growthOpportunity": "",
    "marketRisks": [],
    "demandScore": ""
  },
  "audienceIntelligence": {
    "customerSegments": [],
    "buyingTriggers": [],
    "objections": [],
    "decisionMakers": [],
    "customerProfiles": []
  },
  "confidenceBreakdown": {
    "scrapingQuality": 0,
    "aiAnalysisQuality": 0,
    "competitorConfidence": 0,
    "seoConfidence": 0,
    "overallConfidence": 0
  }
}`;

  return prompt.slice(0, MAX_PROMPT_LENGTH);
}

function extractJsonFromText(text) {
  if (!text || typeof text !== "string") return null;
  const cleaned = text
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```/g, "")
    .replace(/\r/g, "\n")
    .replace(/\s+\n\s+/g, "\n")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    try {
      const relaxed = jsonMatch[0]
        .replace(/(['"])?([a-zA-Z0-9_]+)\1\s*:/g, '"$2":')
        .replace(/\"'/g, '"')
        .replace(/\'([^']*)\'/g, '"$1"');
      return JSON.parse(relaxed);
    } catch {
      return null;
    }
  }
}

function extractFirstText(payload) {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return null;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const text = extractFirstText(item);
      if (text) return text;
    }
    return null;
  }
  if (payload.text) return extractFirstText(payload.text);
  if (payload.output) return extractFirstText(payload.output);
  if (payload.content) return extractFirstText(payload.content);
  if (payload.message) return extractFirstText(payload.message);
  if (payload.choices) return extractFirstText(payload.choices);
  if (payload.data) return extractFirstText(payload.data);
  for (const key of Object.keys(payload)) {
    const text = extractFirstText(payload[key]);
    if (text) return text;
  }
  return null;
}

function normalizeArray(value, max = 10) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => sanitizeText(String(item))).slice(0, max);
  if (typeof value === "string") return value.split(/[,;\n]/).map((item) => sanitizeText(item)).filter(Boolean).slice(0, max);
  return [];
}

function normalizePersonas(value) {
  const items = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return items
    .map((persona) => {
      if (!persona) return null;
      if (typeof persona === "string") {
        return { name: persona, title: "Buyer Persona", goal: "Improve outcomes", challenge: "Needs more clarity", department: "Marketing" };
      }
      return {
        name: sanitizeText(persona.name) || persona.name || "Buyer Persona",
        title: sanitizeText(persona.title) || persona.title || "Role",
        goal: sanitizeText(persona.goal) || persona.goal || "Goal",
        challenge: sanitizeText(persona.challenge) || persona.challenge || "Challenge",
        department: sanitizeText(persona.department) || persona.department || "Marketing",
      };
    })
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeCompetitors(value, type = "direct") {
  return normalizeArray(value, 6).map((name) => ({ name: sanitizeText(name), type, positioning: type === "direct" ? "Core competitor" : type === "indirect" ? "Adjacent competitor" : "Emerging competitor" }));
}

function normalizeMarketDiscovery(rawAnalysis = {}, productData = {}, researchData = {}) {
  return {
    marketSizeEstimate: sanitizeText(rawAnalysis.marketDiscovery?.marketSizeEstimate) || `Estimated market size for ${sanitizeText(productData.industry) || "this category"}`,
    marketTrends: normalizeArray(rawAnalysis.marketDiscovery?.marketTrends, 5),
    growthOpportunity: sanitizeText(rawAnalysis.marketDiscovery?.growthOpportunity) || `Strengths in product-market fit for ${sanitizeText(productData.productName) || "this product"}`,
    marketRisks: normalizeArray(rawAnalysis.marketDiscovery?.marketRisks, 5),
    demandScore: Number(rawAnalysis.marketDiscovery?.demandScore) || (researchData?.marketSignals?.length ? 70 : 45),
  };
}

function normalizeAudienceIntelligence(rawAnalysis = {}) {
  return {
    customerSegments: normalizeArray(rawAnalysis.audienceIntelligence?.customerSegments, 6),
    buyingTriggers: normalizeArray(rawAnalysis.audienceIntelligence?.buyingTriggers, 6),
    objections: normalizeArray(rawAnalysis.audienceIntelligence?.objections, 6),
    decisionMakers: normalizeArray(rawAnalysis.audienceIntelligence?.decisionMakers, 6),
    customerProfiles: normalizeArray(rawAnalysis.audienceIntelligence?.customerProfiles, 6),
  };
}

function normalizeResearchSources(rawAnalysis = {}, scrapedData = {}) {
  return {
    scrapingSource: rawAnalysis.researchSources?.scrapingSource || scrapedData?.scrapeQuality?.source || "scrape",
    marketResearch: rawAnalysis.researchSources?.marketResearch || "tavily",
    aiProvider: rawAnalysis.researchSources?.aiProvider || "unknown",
    dataQuality: rawAnalysis.researchSources?.dataQuality || "standard",
  };
}

function normalizeAnalysis(rawAnalysis = {}, productData = {}, scrapedData = {}, researchData = {}, usedProvider = "heuristic") {
  const features = normalizeArray(rawAnalysis.features, 10);
  const benefits = normalizeArray(rawAnalysis.benefits, 10);
  const painPoints = normalizeArray(rawAnalysis.painPoints, 10);
  const targetUsers = normalizeArray(rawAnalysis.targetUsers, 6);
  const buyerPersonas = normalizePersonas(rawAnalysis.buyerPersonas);
  const seoOpportunities = normalizeArray(rawAnalysis.seoOpportunities, 6);
  const marketingAngles = normalizeArray(rawAnalysis.marketingAngles, 6);
  const campaignIdeas = normalizeArray(rawAnalysis.campaignIdeas, 6);
  const recommendedChannels = normalizeArray(rawAnalysis.recommendedChannels, 6);
  const usp = normalizeArray(rawAnalysis.usp, 5);
  const directCompetitors = Array.isArray(rawAnalysis.directCompetitors)
    ? rawAnalysis.directCompetitors.map((c) => (typeof c === "string" ? { name: sanitizeText(c), type: "direct", positioning: "Direct competitor" } : c))
    : normalizeCompetitors(rawAnalysis.directCompetitors, "direct");

  const indirectCompetitors = Array.isArray(rawAnalysis.indirectCompetitors)
    ? rawAnalysis.indirectCompetitors.map((c) => (typeof c === "string" ? { name: sanitizeText(c), type: "indirect", positioning: "Indirect competitor" } : c))
    : normalizeCompetitors(rawAnalysis.indirectCompetitors, "indirect");

  const emergingCompetitors = Array.isArray(rawAnalysis.emergingCompetitors)
    ? rawAnalysis.emergingCompetitors.map((c) => (typeof c === "string" ? { name: sanitizeText(c), type: "emerging", positioning: "Emerging competitor" } : c))
    : normalizeCompetitors(rawAnalysis.emergingCompetitors, "emerging");

  const fallbackCompetitors = normalizeArray(researchData?.competitors, 6);

  const confidenceBreakdown = {
    scrapingQuality: Number(rawAnalysis.confidenceBreakdown?.scrapingQuality) || null,
    aiAnalysisQuality: Number(rawAnalysis.confidenceBreakdown?.aiAnalysisQuality) || null,
    competitorConfidence: Number(rawAnalysis.confidenceBreakdown?.competitorConfidence) || null,
    seoConfidence: Number(rawAnalysis.confidenceBreakdown?.seoConfidence) || null,
    overallConfidence: null,
  };
  const scores = [confidenceBreakdown.scrapingQuality, confidenceBreakdown.aiAnalysisQuality, confidenceBreakdown.competitorConfidence, confidenceBreakdown.seoConfidence].filter(n => n !== null);
  confidenceBreakdown.overallConfidence = scores.length ? Math.min(100, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)) : null;

  return {
    productSummary: sanitizeText(rawAnalysis.productSummary) || null,
    category: sanitizeText(rawAnalysis.category) || sanitizeText(productData.industry) || null,
    marketSegment: sanitizeText(rawAnalysis.marketSegment) || sanitizeText(productData.industry) || null,
    businessModel: sanitizeText(rawAnalysis.businessModel) || null,
    revenueModel: sanitizeText(rawAnalysis.revenueModel) || null,
    marketMaturity: sanitizeText(rawAnalysis.marketMaturity) || null,
    usp,
    features,
    benefits,
    painPoints,
    targetUsers,
    buyerPersonas,
    directCompetitors: directCompetitors.length ? directCompetitors : normalizeCompetitors(fallbackCompetitors.slice(0, 3), "direct"),
    indirectCompetitors: indirectCompetitors.length ? indirectCompetitors : normalizeCompetitors(fallbackCompetitors.slice(3, 5), "indirect"),
    emergingCompetitors: emergingCompetitors.length ? emergingCompetitors : normalizeCompetitors(fallbackCompetitors.slice(5, 6), "emerging"),
    pricingPosition: sanitizeText(rawAnalysis.pricingPosition) || null,
    seoOpportunities,
    marketingAngles,
    campaignIdeas,
    recommendedChannels,
    marketDiscovery: normalizeMarketDiscovery(rawAnalysis, productData, researchData),
    audienceIntelligence: normalizeAudienceIntelligence(rawAnalysis),
    researchSources: normalizeResearchSources(rawAnalysis, scrapedData),
    confidenceBreakdown,
  };
}

function buildSystemPrompt() {
  return `You are a senior SaaS product marketing strategist and commercial intelligence analyst. Convert product evidence into professional business insights. Return valid JSON only.`;
}

function friendlyStatus(provider, code) {
  if (provider === "cerebras" && code === "parse_error") return "Cerebras analysis returned an unexpected format.";
  if (provider === "deepseek" && code === "parse_error") return "DeepSeek response could not be parsed cleanly.";
  if (provider === "openrouter" && code === "parse_error") return "OpenRouter analysis returned a malformed JSON response.";
  if (provider === "groq" && code === "parse_error") return "Groq response parse failed.";
  if (provider === "gemini" && code === "parse_error") return "Gemini response parse failed.";
  if (code === "missing_key") return `${provider.charAt(0).toUpperCase() + provider.slice(1)} key not configured.`;
  if (code === "rate_limit_exceeded") return `${provider.charAt(0).toUpperCase() + provider.slice(1)} quota unavailable.`;
  if (code === "api_error") return `${provider.charAt(0).toUpperCase() + provider.slice(1)} API returned an error.`;
  if (code === "network_error") return `${provider.charAt(0).toUpperCase() + provider.slice(1)} request failed.`;
  return `${provider.charAt(0).toUpperCase() + provider.slice(1)} analysis unavailable.`;
}

async function parseProviderResponse(rawText) {
  const cleaned = String(rawText || "").replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  return extractJsonFromText(cleaned);
}

async function generateWithCerebras(prompt, strict = false) {
  if (!CEREBRAS_API_KEY) return { success: false, error: friendlyStatus("cerebras", "missing_key"), code: "missing_key" };

  const systemPrompt = buildSystemPrompt();
  const payload = {
    model: CEREBRAS_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: strict ? `${prompt}\n\nReturn raw JSON only with no markdown or explanation.` : prompt },
    ],
    max_tokens: 1500,
    temperature: 0.2,
  };

  try {
    const response = await fetch(CEREBRAS_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CEREBRAS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const code = response.status === 429 ? "rate_limit_exceeded" : "api_error";
      return { success: false, error: friendlyStatus("cerebras", code), code };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || extractFirstText(data);
    const parsed = await parseProviderResponse(content);

    if (!parsed) {
      return { success: false, error: friendlyStatus("cerebras", "parse_error"), code: "parse_error" };
    }

    return { success: true, data: parsed, provider: "cerebras" };
  } catch {
    return { success: false, error: friendlyStatus("cerebras", "network_error"), code: "network_error" };
  }
}

async function generateWithDeepSeek(prompt, strict = false) {
  if (!DEEPSEEK_API_KEY) return { success: false, error: friendlyStatus("deepseek", "missing_key"), code: "missing_key" };

  const systemPrompt = buildSystemPrompt();
  const payload = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: strict ? `${prompt}\n\nReturn raw JSON only with no markdown or explanation.` : prompt },
    ],
    max_tokens: 1500,
    temperature: 0.2,
  };

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const code = response.status === 429 ? "rate_limit_exceeded" : "api_error";
      return { success: false, error: friendlyStatus("deepseek", code), code };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || extractFirstText(data);
    const parsed = await parseProviderResponse(content);

    if (!parsed) {
      return { success: false, error: friendlyStatus("deepseek", "parse_error"), code: "parse_error" };
    }

    return { success: true, data: parsed, provider: "deepseek" };
  } catch {
    return { success: false, error: friendlyStatus("deepseek", "network_error"), code: "network_error" };
  }
}

async function generateWithOpenRouter(prompt, strict = false) {
  if (!OPENROUTER_API_KEY) return { success: false, error: friendlyStatus("openrouter", "missing_key"), code: "missing_key" };

  try {
    const body = {
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: strict ? `${prompt}\n\nReturn raw JSON only with no markdown or explanation.` : prompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    };

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const code = response.status === 429 ? "rate_limit_exceeded" : "api_error";
      return { success: false, error: friendlyStatus("openrouter", code), code };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || extractFirstText(data);
    const parsed = await parseProviderResponse(content);

    if (!parsed) {
      return { success: false, error: friendlyStatus("openrouter", "parse_error"), code: "parse_error" };
    }

    return { success: true, data: parsed, provider: "openrouter" };
  } catch {
    return { success: false, error: friendlyStatus("openrouter", "network_error"), code: "network_error" };
  }
}

async function generateWithGroq(prompt, strict = false) {
  if (!GROQ_API_KEY) return { success: false, error: friendlyStatus("groq", "missing_key"), code: "missing_key" };

  const systemPrompt = buildSystemPrompt();

  try {
    const promptText = strict ? `${prompt}\n\nReturn raw JSON only with no markdown or explanation.` : prompt;
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptText },
        ],
        temperature: 0.2,
        max_tokens: 1800,
      }),
    });

    if (!response.ok) {
      return { success: false, error: friendlyStatus("groq", "api_error"), code: "api_error" };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || extractFirstText(data);
    const parsed = await parseProviderResponse(content);

    if (!parsed) {
      return { success: false, error: friendlyStatus("groq", "parse_error"), code: "parse_error" };
    }

    return { success: true, data: parsed, provider: "groq" };
  } catch {
    return { success: false, error: friendlyStatus("groq", "network_error"), code: "network_error" };
  }
}

async function generateWithGemini(prompt, strict = false) {
  if (!GEMINI_API_KEY) return { success: false, error: friendlyStatus("gemini", "missing_key"), code: "missing_key" };

  try {
    const url = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const body = {
      contents: [{
        parts: [{ text: strict ? `${prompt}\n\nReturn raw JSON only with no markdown or explanation.` : prompt }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1400,
      }
    };
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const code = response.status === 429 ? "rate_limit_exceeded" : "api_error";
      return { success: false, error: friendlyStatus("gemini", code), code };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || extractFirstText(data);
    const parsed = await parseProviderResponse(text);

    if (!parsed) {
      return { success: false, error: friendlyStatus("gemini", "parse_error"), code: "parse_error" };
    }

    return { success: true, data: parsed, provider: "gemini" };
  } catch {
    return { success: false, error: friendlyStatus("gemini", "network_error"), code: "network_error" };
  }
}

async function executeProvider(providerName, providerFn, prompt) {
  const firstAttempt = await providerFn(prompt, false);
  if (firstAttempt.success) return firstAttempt;
  if (firstAttempt.code === "parse_error") {
    const retry = await providerFn(prompt, true);
    if (retry.success) return retry;
  }
  return firstAttempt;
}

export async function generateProductIntelligence({ productData = {}, scrapedData = {} } = {}) {
  const warnings = [];
  const providerStatus = {
    cerebras: "skipped",
    deepseek: "skipped",
    openrouter: "skipped",
    groq: "skipped",
    gemini: "skipped",
    usedProvider: "heuristic",
  };

  let researchData = null;
  try {
    const researchResult = await researchCompetitors(
      productData.productName || "Product",
      productData.industry || "SaaS",
      productData.industry || "General"
    );

    if (researchResult.success) {
      researchData = researchResult;
    } else {
      warnings.push("Market research is limited. Using fallback competitor data.");
      researchData = generateFallbackCompetitorInsights(productData.productName, productData.industry, productData.industry);
    }
  } catch {
    warnings.push("Market research failed. Using fallback competitor insights.");
    researchData = generateFallbackCompetitorInsights(productData.productName, productData.industry, productData.industry);
  }

  const prompt = buildPrompt({ productData, scrapedData, researchData });

  let analysisResult = await executeProvider("cerebras", generateWithCerebras, prompt);
  if (analysisResult.success) {
    providerStatus.cerebras = "success";
    providerStatus.usedProvider = "cerebras";
  } else {
    providerStatus.cerebras = analysisResult.code || "failed";
    warnings.push(friendlyStatus("cerebras", analysisResult.code));

    analysisResult = await executeProvider("deepseek", generateWithDeepSeek, prompt);
    if (analysisResult.success) {
      providerStatus.deepseek = "success";
      providerStatus.usedProvider = "deepseek";
    } else {
      providerStatus.deepseek = analysisResult.code || "failed";
      warnings.push(friendlyStatus("deepseek", analysisResult.code));

      analysisResult = await executeProvider("openrouter", generateWithOpenRouter, prompt);
      if (analysisResult.success) {
        providerStatus.openrouter = "success";
        providerStatus.usedProvider = "openrouter";
      } else {
        providerStatus.openrouter = analysisResult.code || "failed";
        warnings.push(friendlyStatus("openrouter", analysisResult.code));

        analysisResult = await executeProvider("groq", generateWithGroq, prompt);
        if (analysisResult.success) {
          providerStatus.groq = "success";
          providerStatus.usedProvider = "groq";
        } else {
          providerStatus.groq = analysisResult.code || "failed";
          warnings.push(friendlyStatus("groq", analysisResult.code));

          analysisResult = await executeProvider("gemini", generateWithGemini, prompt);
          if (analysisResult.success) {
            providerStatus.gemini = "success";
            providerStatus.usedProvider = "gemini";
          } else {
            providerStatus.gemini = analysisResult.code || "failed";
            warnings.push(friendlyStatus("gemini", analysisResult.code));
          }
        }
      }
    }
  }

  let analysis = null;
  if (analysisResult.success) {
    analysis = normalizeAnalysis(analysisResult.data || {}, productData, scrapedData, researchData, providerStatus.usedProvider);
  } else {
    providerStatus.usedProvider = "heuristic";
    warnings.push("AI providers did not return valid intelligence. Generated fallback analysis.");
    analysis = normalizeAnalysis(
      {
        productSummary: `Product intelligence summary for ${sanitizeText(productData.productName) || "this product"}.`,
        category: sanitizeText(productData.industry) || "General SaaS",
        marketSegment: sanitizeText(productData.industry) || "General",
        businessModel: "SaaS",
        revenueModel: "Subscription",
        marketMaturity: "Growth Stage Leader",
        usp: [
          `Clear value messaging that positions ${sanitizeText(productData.productName) || "the product"} as a strong market choice.`,
        ],
        features: limitArray(scrapedData.features, 10),
        benefits: limitArray(scrapedData.benefits, 10),
        painPoints: [
          "Unclear product differentiation",
          "Weak buyer persona definition",
          "Lack of competitive positioning",
          "Low SEO and market visibility",
          "Unfocused feature messaging",
        ],
        targetUsers: normalizeArray(productData.targetAudience, 6),
        buyerPersonas: normalizePersonas(productData.targetAudience),
        directCompetitors: normalizeCompetitors(researchData.competitors || [], "direct"),
        pricingPosition: sanitizeText(productData.pricing) || "Competitive pricing",
        seoOpportunities: ["Create SEO pillar pages", "Target buyer intent keywords", "Build competitor comparison content"],
        marketingAngles: ["Promote AI-driven efficiency", "Highlight revenue acceleration", "Position as a modern market leader"],
        campaignIdeas: ["AI visibility audit", "Competitor outrank sprint", "Demand generation webinar series"],
        recommendedChannels: ["SEO", "Google Search", "LinkedIn", "Webinars"],
        marketDiscovery: {
          marketSizeEstimate: `Estimated audience for ${sanitizeText(productData.industry) || "this category"}.`,
          marketTrends: ["Growing demand for AI-enabled marketing", "More buyers seeking faster ROI"],
          growthOpportunity: "Position against legacy tools with faster intelligence.",
          marketRisks: ["Competitive incumbent platforms", "Shifting SEO algorithm updates"],
          demandScore: 62,
        },
        audienceIntelligence: {
          customerSegments: normalizeArray(productData.targetAudience || "", 5),
          buyingTriggers: ["Need for faster insights", "Pressure to improve ROI", "Demand for better automation"],
          objections: ["Budget uncertainty", "Integration complexity", "Feature overlap"],
          decisionMakers: ["Marketing Manager", "Growth Lead", "CMO"],
          customerProfiles: ["Mid-market marketing teams", "SEO agencies", "B2B SaaS growth teams"],
        },
        confidenceBreakdown: {
          scrapingQuality: 45,
          aiAnalysisQuality: 60,
          competitorConfidence: 55,
          seoConfidence: 50,
          overallConfidence: 53,
        },
      },
      productData,
      scrapedData,
      researchData,
      "heuristic"
    );
  }

  return {
    success: true,
    analysis,
    research: researchData,
    providerStatus,
    providers: providerStatus,
    warnings: Array.from(new Set(warnings.filter(Boolean))),
  };
}
