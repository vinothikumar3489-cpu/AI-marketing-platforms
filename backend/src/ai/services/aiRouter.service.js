
import { prisma } from "../../config/prisma.js";

const PROVIDER_ORDER = ['groq', 'gemini', 'openrouter', 'openai'];

const PROVIDER_CONFIG = {
  groq: {
    key: () => process.env.GROQ_API_KEY,
    model: () => process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    url: () => "https://api.groq.com/openai/v1/chat/completions",
  },
  gemini: {
    key: () => process.env.GEMINI_API_KEY,
    model: () => process.env.GEMINI_MODEL || "gemini-2.0-flash",
    url: () => process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta/models",
  },
  openrouter: {
    key: () => process.env.OPENROUTER_API_KEY,
    model: () => process.env.OPENROUTER_MODEL || "anthropic/claude-3-haiku",
    url: () => "https://openrouter.ai/api/v1/chat/completions",
  },
  openai: {
    key: () => process.env.OPENAI_API_KEY,
    model: () => process.env.OPENAI_MODEL || "gpt-4o-mini",
    url: () => "https://api.openai.com/v1/chat/completions",
  },
};

const COOLDOWN_DURATION_MS = 300000;
const providerCooldowns = new Map();
const PROVIDER_STATUS = {};

function getStatus(provider) {
  if (PROVIDER_STATUS[provider] !== undefined) return PROVIDER_STATUS[provider];
  const config = PROVIDER_CONFIG[provider];
  if (!config) {
    PROVIDER_STATUS[provider] = 'NOT_CONFIGURED';
    return 'NOT_CONFIGURED';
  }
  PROVIDER_STATUS[provider] = config.key() ? 'AVAILABLE' : 'NOT_CONFIGURED';
  return PROVIDER_STATUS[provider];
}

function getProviderCooldown(provider) {
  return providerCooldowns.get(provider) || 0;
}

function setProviderCooldown(provider, durationMs, reason) {
  const until = Date.now() + (durationMs || COOLDOWN_DURATION_MS);
  providerCooldowns.set(provider, until);
  PROVIDER_STATUS[provider] = 'COOLDOWN';
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

function classifyFailure(response, error) {
  if (!response && !error) return 'PROVIDER_UNAVAILABLE';
  if (error) {
    if (error.name === 'AbortError') return 'TIMEOUT';
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ERR_NETWORK') return 'NETWORK_ERROR';
    if (error instanceof TypeError && error.message?.includes('fetch')) return 'NETWORK_ERROR';
    if (error instanceof ReferenceError || error instanceof TypeError) return 'INTERNAL_ROUTER_ERROR';
    return 'PROVIDER_UNAVAILABLE';
  }
  if (!response) return 'PROVIDER_UNAVAILABLE';
  const status = response.status;
  if (status === 429) return 'RATE_LIMITED';
  if (status === 401 || status === 403) return 'AUTHENTICATION_FAILED';
  if (status >= 500) return 'PROVIDER_UNAVAILABLE';
  return 'PROVIDER_UNAVAILABLE';
}

async function callGroq(prompt) {
  const key = PROVIDER_CONFIG.groq.key();
  if (!key) return { success: false, failureType: 'AUTHENTICATION_FAILED', provider: 'groq' };
  const cooldownUntil = getProviderCooldown('groq');
  if (Date.now() < cooldownUntil) return { success: false, failureType: 'RATE_LIMITED', provider: 'groq', cooldownRemainingMs: cooldownUntil - Date.now() };
  const start = Date.now();
  try {
    const response = await fetch(PROVIDER_CONFIG.groq.url(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: PROVIDER_CONFIG.groq.model(),
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
        temperature: 0.4
      }),
      signal: AbortSignal.timeout(45000)
    });

    const durationMs = Date.now() - start;

    if (response.status === 429) {
      setProviderCooldown('groq', COOLDOWN_DURATION_MS, 'RATE_LIMITED');
      return { success: false, failureType: 'RATE_LIMITED', provider: 'groq', statusCode: 429, durationMs };
    }

    if (response.status === 401 || response.status === 403) {
      PROVIDER_STATUS.groq = 'NOT_CONFIGURED';
      return { success: false, failureType: 'AUTHENTICATION_FAILED', provider: 'groq', statusCode: response.status, durationMs };
    }

    if (!response.ok) {
      return { success: false, failureType: 'PROVIDER_UNAVAILABLE', provider: 'groq', statusCode: response.status, durationMs };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { success: false, failureType: 'INVALID_JSON', provider: 'groq', durationMs: Date.now() - start };

    const parsed = extractJsonFromText(content);
    if (!parsed) return { success: false, failureType: 'INVALID_JSON', provider: 'groq', durationMs: Date.now() - start };

    return { success: true, data: parsed, provider: "groq", durationMs: Date.now() - start };
  } catch (e) {
    const failureType = classifyFailure(null, e);
    return { success: false, failureType, provider: 'groq', durationMs: Date.now() - start, message: e.message };
  }
}

async function callGemini(prompt) {
  const key = PROVIDER_CONFIG.gemini.key();
  if (!key) return { success: false, failureType: 'AUTHENTICATION_FAILED', provider: 'gemini' };
  const cooldownUntil = getProviderCooldown('gemini');
  if (Date.now() < cooldownUntil) return { success: false, failureType: 'RATE_LIMITED', provider: 'gemini', cooldownRemainingMs: cooldownUntil - Date.now() };
  const start = Date.now();
  try {
    const model = PROVIDER_CONFIG.gemini.model();
    const apiUrl = PROVIDER_CONFIG.gemini.url();
    const response = await fetch(`${apiUrl}/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4000, temperature: 0.4 }
      }),
      signal: AbortSignal.timeout(45000)
    });

    const durationMs = Date.now() - start;

    if (response.status === 429) {
      setProviderCooldown('gemini', COOLDOWN_DURATION_MS, 'RATE_LIMITED');
      return { success: false, failureType: 'RATE_LIMITED', provider: 'gemini', statusCode: 429, durationMs };
    }

    if (response.status === 403 || response.status === 401) {
      PROVIDER_STATUS.gemini = 'NOT_CONFIGURED';
      return { success: false, failureType: 'AUTHENTICATION_FAILED', provider: 'gemini', statusCode: response.status, durationMs };
    }

    if (!response.ok) {
      return { success: false, failureType: 'PROVIDER_UNAVAILABLE', provider: 'gemini', statusCode: response.status, durationMs };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return { success: false, failureType: 'INVALID_JSON', provider: 'gemini', durationMs: Date.now() - start };

    const parsed = extractJsonFromText(content);
    if (!parsed) return { success: false, failureType: 'INVALID_JSON', provider: 'gemini', durationMs: Date.now() - start };

    return { success: true, data: parsed, provider: "gemini", durationMs: Date.now() - start };
  } catch (e) {
    const failureType = classifyFailure(null, e);
    return { success: false, failureType, provider: 'gemini', durationMs: Date.now() - start, message: e.message };
  }
}

async function callOpenRouter(prompt) {
  const key = PROVIDER_CONFIG.openrouter.key();
  if (!key) return { success: false, failureType: 'AUTHENTICATION_FAILED', provider: 'openrouter' };
  const cooldownUntil = getProviderCooldown('openrouter');
  if (Date.now() < cooldownUntil) return { success: false, failureType: 'RATE_LIMITED', provider: 'openrouter', cooldownRemainingMs: cooldownUntil - Date.now() };
  const start = Date.now();
  try {
    const response = await fetch(PROVIDER_CONFIG.openrouter.url(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "https://ai-marketing-platforms.onrender.com"
      },
      body: JSON.stringify({
        model: PROVIDER_CONFIG.openrouter.model(),
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
        temperature: 0.4
      }),
      signal: AbortSignal.timeout(45000)
    });

    const durationMs = Date.now() - start;

    if (response.status === 429) {
      setProviderCooldown('openrouter', COOLDOWN_DURATION_MS, 'RATE_LIMITED');
      return { success: false, failureType: 'RATE_LIMITED', provider: 'openrouter', statusCode: 429, durationMs };
    }

    if (response.status === 401 || response.status === 403) {
      PROVIDER_STATUS.openrouter = 'NOT_CONFIGURED';
      return { success: false, failureType: 'AUTHENTICATION_FAILED', provider: 'openrouter', statusCode: response.status, durationMs };
    }

    if (!response.ok) {
      return { success: false, failureType: 'PROVIDER_UNAVAILABLE', provider: 'openrouter', statusCode: response.status, durationMs };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { success: false, failureType: 'INVALID_JSON', provider: 'openrouter', durationMs: Date.now() - start };

    const parsed = extractJsonFromText(content);
    if (!parsed) return { success: false, failureType: 'INVALID_JSON', provider: 'openrouter', durationMs: Date.now() - start };

    return { success: true, data: parsed, provider: "openrouter", durationMs: Date.now() - start };
  } catch (e) {
    const failureType = classifyFailure(null, e);
    return { success: false, failureType, provider: 'openrouter', durationMs: Date.now() - start, message: e.message };
  }
}

async function callOpenAI(prompt) {
  const key = PROVIDER_CONFIG.openai.key();
  if (!key) return { success: false, failureType: 'AUTHENTICATION_FAILED', provider: 'openai' };
  const cooldownUntil = getProviderCooldown('openai');
  if (Date.now() < cooldownUntil) return { success: false, failureType: 'RATE_LIMITED', provider: 'openai', cooldownRemainingMs: cooldownUntil - Date.now() };
  const start = Date.now();
  try {
    const response = await fetch(PROVIDER_CONFIG.openai.url(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: PROVIDER_CONFIG.openai.model(),
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
        temperature: 0.4
      }),
      signal: AbortSignal.timeout(45000)
    });

    const durationMs = Date.now() - start;

    if (response.status === 429) {
      setProviderCooldown('openai', COOLDOWN_DURATION_MS, 'RATE_LIMITED');
      return { success: false, failureType: 'RATE_LIMITED', provider: 'openai', statusCode: 429, durationMs };
    }

    if (response.status === 401 || response.status === 403) {
      PROVIDER_STATUS.openai = 'NOT_CONFIGURED';
      return { success: false, failureType: 'AUTHENTICATION_FAILED', provider: 'openai', statusCode: response.status, durationMs };
    }

    if (!response.ok) {
      return { success: false, failureType: 'PROVIDER_UNAVAILABLE', provider: 'openai', statusCode: response.status, durationMs };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { success: false, failureType: 'INVALID_JSON', provider: 'openai', durationMs: Date.now() - start };

    const parsed = extractJsonFromText(content);
    if (!parsed) return { success: false, failureType: 'INVALID_JSON', provider: 'openai', durationMs: Date.now() - start };

    return { success: true, data: parsed, provider: "openai", durationMs: Date.now() - start };
  } catch (e) {
    const failureType = classifyFailure(null, e);
    return { success: false, failureType, provider: 'openai', durationMs: Date.now() - start, message: e.message };
  }
}

const PROVIDER_CALLS = { groq: callGroq, gemini: callGemini, openrouter: callOpenRouter, openai: callOpenAI };

function tryWithRetry(providerFn, prompt) {
  return providerFn(prompt);
}

export async function callAI(prompt) {
  const diagnostics = [];

  for (const provider of PROVIDER_ORDER) {
    const status = getStatus(provider);
    const cooldownUntil = getProviderCooldown(provider);

    if (cooldownUntil > 0 && Date.now() < cooldownUntil) {
      diagnostics.push({
        provider,
        attempted: true,
        success: false,
        failureType: 'RATE_LIMITED',
        cooldownRemainingMs: cooldownUntil - Date.now(),
        message: 'Provider in cooldown'
      });
      continue;
    }

    if (status === 'NOT_CONFIGURED') {
      diagnostics.push({
        provider,
        attempted: false,
        success: false,
        failureType: 'AUTHENTICATION_FAILED',
        message: 'Provider not configured'
      });
      continue;
    }

    const callFn = PROVIDER_CALLS[provider];
    if (!callFn) continue;

    try {
      const result = await callFn(prompt);

      diagnostics.push({
        provider,
        attempted: true,
        success: result.success,
        failureType: result.failureType || (result.success ? null : 'PROVIDER_UNAVAILABLE'),
        statusCode: result.statusCode || null,
        durationMs: result.durationMs || null,
        message: result.message || null,
      });

      if (result.success && result.data) {
        return {
          success: true,
          data: result.data,
          provider: result.provider,
          diagnostics
        };
      }
    } catch (e) {
      diagnostics.push({
        provider,
        attempted: true,
        success: false,
        failureType: 'INTERNAL_ROUTER_ERROR',
        message: e.message,
      });
    }
  }

  return {
    success: false,
    diagnostics
  };
}

export function getAIProviderDiagnostics() {
  return PROVIDER_ORDER.map(provider => {
    const config = PROVIDER_CONFIG[provider];
    const status = getStatus(provider);
    const cooldownUntil = getProviderCooldown(provider);
    const cooldownRemainingMs = cooldownUntil > Date.now() ? cooldownUntil - Date.now() : 0;
    return {
      provider,
      configured: !!config?.key(),
      status,
      model: config?.model() || null,
      cooldownActive: cooldownRemainingMs > 0,
      cooldownRemainingMs,
    };
  });
}

export async function generateProductAnalysis(productData, scrapedData) {
  const prompt = buildPrompt(productData, scrapedData);

  const result = await callAI(prompt);
  if (result.success && result.data) {
    return {
      success: true,
      data: result.data,
      provider: result.provider,
      fallbackUsed: false,
      diagnostics: result.diagnostics,
    };
  }

  const fallbackData = getRuleBasedFallback(productData);
  fallbackData._status = 'UNAVAILABLE';
  fallbackData._reason = 'All AI providers failed to return a valid response';

  return {
    success: true,
    data: fallbackData,
    provider: null,
    fallbackUsed: true,
    diagnostics: result.diagnostics,
  };
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
  const targetAudience = (targetMarket || "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);

  return {
    _status: 'UNAVAILABLE',
    _reason: 'Deterministic fallback — no AI provider returned valid data',
    productSummary: `${productName || "This product"} — analysis unavailable due to provider failure.`,
    targetAudience: targetAudience.length >= 1 ? targetAudience : ["Unknown — AI provider unavailable"],
    painPoints: ["Unavailable — analysis could not be completed"],
    uniqueValueProposition: "Unavailable — AI provider returned no data",
    marketOpportunities: ["Unavailable"],
    competitorIdeas: ["Unavailable"],
    seoSuggestions: ["Unavailable"],
    campaignIdeas: ["Unavailable"],
    finalRecommendation: "Unable to generate recommendation. All AI providers failed."
  };
}
