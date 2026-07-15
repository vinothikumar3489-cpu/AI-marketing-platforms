
import { prisma } from "../../config/prisma.js";

const getGeminiKey = () => process.env.GEMINI_API_KEY;
const getGeminiModel = () => process.env.GEMINI_MODEL || "gemini-2.0-flash";
const getGeminiUrl = () => process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta/models";

const getGroqKey = () => process.env.GROQ_API_KEY;
const getGroqModel = () => process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const getGroqUrl = () => "https://api.groq.com/openai/v1/chat/completions";

const getOpenAIKey = () => process.env.OPENAI_API_KEY;
const getOpenAIModel = () => process.env.OPENAI_MODEL || "gpt-4o-mini";
const getOpenAIUrl = () => "https://api.openai.com/v1/chat/completions";

const GEMINI_QUOTA_COOLDOWN_MS = 300000;
let geminiQuotaExhaustedUntil = 0;

const PROVIDER_STATUS = {};

function getStatus(provider) {
  if (PROVIDER_STATUS[provider] !== undefined) return PROVIDER_STATUS[provider];
  let status;
  switch (provider) {
    case 'groq':
      status = getGroqKey() ? 'AVAILABLE' : 'NOT_CONFIGURED';
      break;
    case 'gemini':
      status = getGeminiKey() ? 'AVAILABLE' : 'NOT_CONFIGURED';
      break;
    case 'openai':
      status = getOpenAIKey() ? 'AVAILABLE' : 'NOT_CONFIGURED';
      break;
    default:
      status = 'NOT_CONFIGURED';
  }
  PROVIDER_STATUS[provider] = status;
  return status;
}

function extractJsonFromText(text) {
  if (!text || typeof text !== "string") return null;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  let raw = jsonMatch[0];
  try {
    return JSON.parse(raw);
  } catch (e) {
    try {
      raw = raw.replace(/,\s*([}\]])/g, '$1');
      raw = raw.replace(/(?<!\\)\n/g, ' ');
      raw = raw.replace(/,\s*$/, '');
      return JSON.parse(raw);
    } catch (e2) {
      return null;
    }
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
  const { productName, description, targetMarket } = productData;
  const targetAudience = (targetMarket || "Job seekers, Professionals, Students").split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  
  return {
    productSummary: `${productName || "This product"} is a solution designed for ${targetAudience.join(", ") || "target users"}. ${description || "It offers key features to help users achieve their goals efficiently."}`,
    targetAudience: targetAudience.length >=3 ? targetAudience : ["Students", "Professionals", "Job Seekers"],
    painPoints: ["Time-consuming manual processes", "Lack of professional tools", "High costs of alternatives", "Difficulty standing out"],
    uniqueValueProposition: `${productName || "This product"} provides an easy-to-use, affordable solution that helps users save time and achieve better results.`,
    marketOpportunities: ["Growing demand for productivity tools", "Rising remote work trend", "Increasing focus on personal branding"],
    competitorIdeas: ["Established industry tools", "Free open-source alternatives", "Niche specialized solutions"],
    seoSuggestions: [`${productName || "product"} tool`, `best ${productName || "product"}`, `${productName || "product"} for ${targetAudience[0] || "users"}`, `free ${productName || "product"} alternative`],
    campaignIdeas: ["Social media content series", "Free trial offer", "User testimonials campaign", "Educational blog posts"],
    finalRecommendation: "Start with a free trial to attract initial users, then collect feedback to improve the product further. Focus on content marketing to build SEO authority."
  };
}

async function callGemini(prompt) {
  const key = getGeminiKey();
  if (!key) return { success: false, status: 'NOT_CONFIGURED' };
  if (Date.now() < geminiQuotaExhaustedUntil) return { success: false, status: 'QUOTA_EXHAUSTED' };
  try {
    const model = getGeminiModel();
    const apiUrl = getGeminiUrl();
    const response = await fetch(`${apiUrl}/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 4000,
          temperature: 0.4
        }
      }),
      signal: AbortSignal.timeout(45000)
    });

    if (response.status === 429) {
      geminiQuotaExhaustedUntil = Date.now() + GEMINI_QUOTA_COOLDOWN_MS;
      return { success: false, status: 'QUOTA_EXHAUSTED' };
    }

    if (response.status === 403 || response.status === 401) {
      PROVIDER_STATUS.gemini = 'NOT_CONFIGURED';
      return { success: false, status: 'NOT_CONFIGURED' };
    }

    if (!response.ok) {
      return { success: false, status: 'TEMPORARILY_UNAVAILABLE' };
    }
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return { success: false, status: 'TEMPORARILY_UNAVAILABLE' };
    const parsed = extractJsonFromText(content);
    if (!parsed) return { success: false, status: 'TEMPORARILY_UNAVAILABLE' };
    return { success: true, data: parsed, provider: "gemini" };
  } catch (e) {
    return { success: false, status: 'TEMPORARILY_UNAVAILABLE' };
  }
}

async function callGroq(prompt) {
  const key = getGroqKey();
  if (!key) return { success: false, status: 'NOT_CONFIGURED' };
  try {
    const apiUrl = getGroqUrl();
    const model = getGroqModel();
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
        temperature: 0.4
      }),
      signal: AbortSignal.timeout(45000)
    });

    if (response.status === 403 || response.status === 401) {
      PROVIDER_STATUS.groq = 'NOT_CONFIGURED';
      return { success: false, status: 'NOT_CONFIGURED' };
    }

    if (response.status === 429) {
      return { success: false, status: 'RATE_LIMITED' };
    }

    if (!response.ok) {
      return { success: false, status: 'TEMPORARILY_UNAVAILABLE' };
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { success: false, status: 'TEMPORARILY_UNAVAILABLE' };
    const parsed = extractJsonFromText(content);
    if (!parsed) return { success: false, status: 'TEMPORARILY_UNAVAILABLE' };
    return { success: true, data: parsed, provider: "groq" };
  } catch (e) {
    return { success: false, status: 'TEMPORARILY_UNAVAILABLE' };
  }
}

async function callOpenAI(prompt) {
  const key = getOpenAIKey();
  if (!key) return { success: false, status: 'NOT_CONFIGURED' };
  try {
    const apiUrl = getOpenAIUrl();
    const model = getOpenAIModel();
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
        temperature: 0.4
      }),
      signal: AbortSignal.timeout(45000)
    });

    if (response.status === 403 || response.status === 401) {
      PROVIDER_STATUS.openai = 'NOT_CONFIGURED';
      return { success: false, status: 'NOT_CONFIGURED' };
    }

    if (response.status === 429) {
      return { success: false, status: 'RATE_LIMITED' };
    }

    if (!response.ok) {
      return { success: false, status: 'TEMPORARILY_UNAVAILABLE' };
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { success: false, status: 'TEMPORARILY_UNAVAILABLE' };
    const parsed = extractJsonFromText(content);
    if (!parsed) return { success: false, status: 'TEMPORARILY_UNAVAILABLE' };
    return { success: true, data: parsed, provider: "openai" };
  } catch (e) {
    return { success: false, status: 'TEMPORARILY_UNAVAILABLE' };
  }
}

async function tryWithRetry(providerFn, prompt) {
  const result = await providerFn(prompt);
  if (result.success) return result;
  const retryPrompt = prompt + "\n\nReturn only a valid compact JSON object matching the requested schema. No markdown, no explanation.";
  const retryResult = await providerFn(retryPrompt);
  if (retryResult.success) return retryResult;
  return result;
}

export async function callAI(prompt) {
  const groqStatus = getStatus('groq');
  if (groqStatus === 'AVAILABLE' || groqStatus === 'RATE_LIMITED') {
    const result = await tryWithRetry(callGroq, prompt);
    if (result.success) return result;
    if (result.status === 'RATE_LIMITED') PROVIDER_STATUS.groq = 'RATE_LIMITED';
  }

  if (Date.now() < geminiQuotaExhaustedUntil) {
    PROVIDER_STATUS.gemini = 'QUOTA_EXHAUSTED';
  }
  const geminiStatus = getStatus('gemini');
  if ((geminiStatus === 'AVAILABLE' || geminiStatus === 'RATE_LIMITED') && Date.now() >= geminiQuotaExhaustedUntil) {
    const result = await tryWithRetry(callGemini, prompt);
    if (result.success) return result;
    if (result.status === 'QUOTA_EXHAUSTED' || result.status === 'RATE_LIMITED') {
      PROVIDER_STATUS.gemini = 'QUOTA_EXHAUSTED';
    }
  }

  const openaiStatus = getStatus('openai');
  if (openaiStatus === 'AVAILABLE') {
    const result = await tryWithRetry(callOpenAI, prompt);
    if (result.success) return result;
  }

  return { success: false };
}

export async function generateProductAnalysis(productData, scrapedData) {
  const prompt = buildPrompt(productData, scrapedData);

  let result = await callAI(prompt);
  if (result.success) {
    return { ...result, fallbackUsed: false };
  }

  const fallbackData = getRuleBasedFallback(productData);
  return {
    success: true,
    data: fallbackData,
    provider: "rule-based",
    fallbackUsed: true
  };
}
