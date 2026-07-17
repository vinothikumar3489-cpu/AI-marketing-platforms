import { prisma } from "../../config/prisma.js";
import { isConfigured } from "../../services/provider-health.service.js";

const getGeminiKey = () => process.env.GEMINI_API_KEY;
const getGeminiModel = () => process.env.GEMINI_MODEL || "gemini-2.0-flash";
const getGeminiUrl = () => process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta/models";

const getGroqKey = () => process.env.GROQ_API_KEY;
const getGroqModel = () => process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const getGroqUrl = () => "https://api.groq.com/openai/v1/chat/completions";

const getOpenRouterKey = () => process.env.OPENROUTER_API_KEY;
const getOpenRouterModel = () => process.env.OPENROUTER_MODEL || "anthropic/claude-3-haiku";
const getOpenRouterUrl = () => "https://api.openrouter.ai/v1/chat/completions";

const getOpenAIKey = () => process.env.OPENAI_API_KEY;
const getOpenAIModel = () => process.env.OPENAI_MODEL || "gpt-4o-mini";
const getOpenAIUrl = () => "https://api.openai.com/v1/chat/completions";

const PROVIDER_COOLDOWN_MS = 300000; // 5 minutes cooldown for rate limits
const providerCooldowns = {
  groq: 0,
  gemini: 0,
  openrouter: 0,
  openai: 0
};

const PROVIDER_STATUS = {};

function getStatus(provider) {
  if (PROVIDER_STATUS[provider] !== undefined) return PROVIDER_STATUS[provider];
  let status;
  switch (provider) {
    case 'groq':
      status = isConfigured(getGroqKey()) ? 'AVAILABLE' : 'NOT_CONFIGURED';
      break;
    case 'gemini':
      status = isConfigured(getGeminiKey()) ? 'AVAILABLE' : 'NOT_CONFIGURED';
      break;
    case 'openrouter':
      status = isConfigured(getOpenRouterKey()) ? 'AVAILABLE' : 'NOT_CONFIGURED';
      break;
    case 'openai':
      status = isConfigured(getOpenAIKey()) ? 'AVAILABLE' : 'NOT_CONFIGURED';
      break;
    default:
      status = 'NOT_CONFIGURED';
  }
  PROVIDER_STATUS[provider] = status;
  return status;
}

function isProviderInCooldown(provider) {
  const cooldownUntil = providerCooldowns[provider] || 0;
  const now = Date.now();
  if (now < cooldownUntil) {
    return true;
  }
  // Cooldown expired, clear it
  if (cooldownUntil > 0) {
    providerCooldowns[provider] = 0;
    if (PROVIDER_STATUS[provider] === 'RATE_LIMITED' || PROVIDER_STATUS[provider] === 'QUOTA_EXHAUSTED') {
      PROVIDER_STATUS[provider] = 'AVAILABLE';
    }
  }
  return false;
}

function setProviderCooldown(provider, durationMs = PROVIDER_COOLDOWN_MS) {
  providerCooldowns[provider] = Date.now() + durationMs;
  PROVIDER_STATUS[provider] = 'RATE_LIMITED';
}

export function clearProviderCooldown(provider) {
  providerCooldowns[provider] = 0;
  PROVIDER_STATUS[provider] = 'AVAILABLE';
}

export function getProviderDiagnostics() {
  return {
    groq: { status: getStatus('groq'), model: getGroqModel(), configured: isConfigured(getGroqKey()), cooldownRemainingMs: Math.max(0, providerCooldowns.groq - Date.now()) },
    gemini: { status: getStatus('gemini'), model: getGeminiModel(), configured: isConfigured(getGeminiKey()), cooldownRemainingMs: Math.max(0, providerCooldowns.gemini - Date.now()) },
    openrouter: { status: getStatus('openrouter'), model: getOpenRouterModel(), configured: isConfigured(getOpenRouterKey()), cooldownRemainingMs: Math.max(0, providerCooldowns.openrouter - Date.now()) },
    openai: { status: getStatus('openai'), model: getOpenAIModel(), configured: isConfigured(getOpenAIKey()), cooldownRemainingMs: Math.max(0, providerCooldowns.openai - Date.now()) },
  };
}

function extractJsonFromText(text) {
  if (!text || typeof text !== "string") return null;
  
  // Remove markdown fences if present
  let cleaned = text;
  cleaned = cleaned.replace(/```json\s*/g, '');
  cleaned = cleaned.replace(/```\s*/g, '');
  cleaned = cleaned.trim();
  
  // Extract JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  
  let raw = jsonMatch[0];
  
  // First attempt: parse as-is
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.log('[JSON Parser] First parse attempt failed, attempting repair:', e.message);
  }
  
  // Second attempt: repair common JSON issues
  try {
    // Remove trailing commas
    raw = raw.replace(/,\s*([}\]])/g, '$1');
    // Remove newlines within JSON
    raw = raw.replace(/(?<!\\)\n/g, ' ');
    // Remove trailing comma at end
    raw = raw.replace(/,\s*$/, '');
    // Fix unquoted property names (non-standard but sometimes returned by AI)
    raw = raw.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    return JSON.parse(raw);
  } catch (e2) {
    console.log('[JSON Parser] Repair attempt failed:', e2.message);
    console.log('[JSON Parser] Failed content preview:', raw.substring(0, 200));
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

function logDiagnostics(stage, provider, result, durationMs) {
  console.log(`[AI][${stage}][${provider}]`, JSON.stringify({
    provider,
    configured: isConfigured(provider === 'groq' ? getGroqKey() : provider === 'gemini' ? getGeminiKey() : getOpenAIKey()),
    model: provider === 'groq' ? getGroqModel() : provider === 'gemini' ? getGeminiModel() : getOpenAIModel(),
    statusCode: result._statusCode || 0,
    failureType: result.status || 'UNKNOWN',
    responseReceived: result._responseReceived || false,
    jsonParsed: result._jsonParsed || false,
    schemaValidated: result._schemaValidated || false,
    durationMs,
  }));
}

async function callGemini(prompt) {
  const key = getGeminiKey();
  if (!isConfigured(key)) return { success: false, status: 'NOT_CONFIGURED' };
  if (Date.now() < geminiQuotaExhaustedUntil) return { success: false, status: 'QUOTA_EXHAUSTED' };
  const start = Date.now();
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

    const statusCode = response.status;
    const result = { _statusCode: statusCode, _responseReceived: true, _jsonParsed: false, _schemaValidated: false };

    if (statusCode === 429) {
      geminiQuotaExhaustedUntil = Date.now() + GEMINI_QUOTA_COOLDOWN_MS;
      result.status = 'QUOTA_EXHAUSTED';
      logDiagnostics('callGemini', 'gemini', result, Date.now() - start);
      return { success: false, status: 'QUOTA_EXHAUSTED' };
    }

    if (statusCode === 403 || statusCode === 401) {
      PROVIDER_STATUS.gemini = 'NOT_CONFIGURED';
      result.status = 'AUTH_FAILED';
      logDiagnostics('callGemini', 'gemini', result, Date.now() - start);
      return { success: false, status: 'AUTH_FAILED' };
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      if (body.includes('quota') || body.includes('quotaExceeded') || body.includes('RATE_LIMIT')) {
        geminiQuotaExhaustedUntil = Date.now() + GEMINI_QUOTA_COOLDOWN_MS;
        result.status = 'QUOTA_EXHAUSTED';
      } else if (body.includes('not found') || body.includes('notFound') || body.includes('MODEL_NOT_FOUND')) {
        result.status = 'MODEL_NOT_FOUND';
      } else {
        result.status = 'API_ERROR';
      }
      logDiagnostics('callGemini', 'gemini', result, Date.now() - start);
      return { success: false, status: result.status };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      result.status = 'INVALID_RESPONSE';
      logDiagnostics('callGemini', 'gemini', result, Date.now() - start);
      return { success: false, status: 'INVALID_RESPONSE' };
    }
    result._responseReceived = true;
    const parsed = extractJsonFromText(content);
    result._jsonParsed = !!parsed;
    if (!parsed) {
      result.status = 'JSON_PARSE_FAILED';
      logDiagnostics('callGemini', 'gemini', result, Date.now() - start);
      return { success: false, status: 'JSON_PARSE_FAILED' };
    }
    result._schemaValidated = true;
    result.status = 'AVAILABLE';
    logDiagnostics('callGemini', 'gemini', result, Date.now() - start);
    return { success: true, data: parsed, provider: "gemini" };
  } catch (e) {
    const duration = Date.now() - start;
    logDiagnostics('callGemini', 'gemini', { status: e.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_FAILED', _statusCode: 0, _responseReceived: false, _jsonParsed: false, _schemaValidated: false }, duration);
    return { success: false, status: e.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_FAILED' };
  }
}

async function callGroq(prompt) {
  const key = getGroqKey();
  if (!isConfigured(key)) return { success: false, status: 'NOT_CONFIGURED' };
  const start = Date.now();
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

    const statusCode = response.status;
    const result = { _statusCode: statusCode, _responseReceived: true, _jsonParsed: false, _schemaValidated: false };

    if (statusCode === 403 || statusCode === 401) {
      PROVIDER_STATUS.groq = 'NOT_CONFIGURED';
      result.status = 'AUTH_FAILED';
      logDiagnostics('callGroq', 'groq', result, Date.now() - start);
      return { success: false, status: 'AUTH_FAILED' };
    }

    if (statusCode === 429) {
      result.status = 'RATE_LIMITED';
      logDiagnostics('callGroq', 'groq', result, Date.now() - start);
      return { success: false, status: 'RATE_LIMITED' };
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      if (body.includes('model_not_found') || body.includes('not found') || body.includes('does not exist')) {
        result.status = 'MODEL_NOT_FOUND';
      } else if (body.includes('quota') || body.includes('exceeded') || statusCode === 402) {
        result.status = 'QUOTA_EXHAUSTED';
      } else {
        result.status = `HTTP_${statusCode}`;
      }
      logDiagnostics('callGroq', 'groq', result, Date.now() - start);
      return { success: false, status: result.status };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    result._responseReceived = true;
    if (!content) {
      result.status = 'INVALID_RESPONSE';
      logDiagnostics('callGroq', 'groq', result, Date.now() - start);
      return { success: false, status: 'INVALID_RESPONSE' };
    }
    const parsed = extractJsonFromText(content);
    result._jsonParsed = !!parsed;
    if (!parsed) {
      result.status = 'JSON_PARSE_FAILED';
      logDiagnostics('callGroq', 'groq', result, Date.now() - start);
      return { success: false, status: 'JSON_PARSE_FAILED' };
    }
    result._schemaValidated = true;
    result.status = 'AVAILABLE';
    logDiagnostics('callGroq', 'groq', result, Date.now() - start);
    return { success: true, data: parsed, provider: "groq" };
  } catch (e) {
    const duration = Date.now() - start;
    logDiagnostics('callGroq', 'groq', { status: e.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_FAILED', _statusCode: 0, _responseReceived: false, _jsonParsed: false, _schemaValidated: false }, duration);
    return { success: false, status: e.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_FAILED' };
  }
}

async function callOpenRouter(prompt) {
  const key = getOpenRouterKey();
  if (!isConfigured(key)) return { success: false, status: 'NOT_CONFIGURED' };
  const start = Date.now();
  try {
    const apiUrl = getOpenRouterUrl();
    const model = getOpenRouterModel();
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "AI-Marketing-Platform"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
        temperature: 0.4
      }),
      signal: AbortSignal.timeout(45000)
    });

    const statusCode = response.status;
    const result = { _statusCode: statusCode, _responseReceived: true, _jsonParsed: false, _schemaValidated: false };

    if (statusCode === 403 || statusCode === 401) {
      PROVIDER_STATUS.openrouter = 'NOT_CONFIGURED';
      result.status = 'AUTH_FAILED';
      logDiagnostics('callOpenRouter', 'openrouter', result, Date.now() - start);
      return { success: false, status: 'AUTH_FAILED' };
    }

    if (statusCode === 429) {
      result.status = 'RATE_LIMITED';
      logDiagnostics('callOpenRouter', 'openrouter', result, Date.now() - start);
      return { success: false, status: 'RATE_LIMITED' };
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      if (body.includes('not found') || body.includes('does not exist') || body.includes('model_not_found')) {
        result.status = 'MODEL_NOT_FOUND';
      } else if (body.includes('quota') || body.includes('insufficient') || body.includes('credits')) {
        result.status = 'QUOTA_EXHAUSTED';
      } else {
        result.status = `HTTP_${statusCode}`;
      }
      logDiagnostics('callOpenRouter', 'openrouter', result, Date.now() - start);
      return { success: false, status: result.status };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    result._responseReceived = true;
    if (!content) {
      result.status = 'INVALID_RESPONSE';
      logDiagnostics('callOpenRouter', 'openrouter', result, Date.now() - start);
      return { success: false, status: 'INVALID_RESPONSE' };
    }
    const parsed = extractJsonFromText(content);
    result._jsonParsed = !!parsed;
    if (!parsed) {
      result.status = 'JSON_PARSE_FAILED';
      logDiagnostics('callOpenRouter', 'openrouter', result, Date.now() - start);
      return { success: false, status: 'JSON_PARSE_FAILED' };
    }
    result._schemaValidated = true;
    result.status = 'AVAILABLE';
    logDiagnostics('callOpenRouter', 'openrouter', result, Date.now() - start);
    return { success: true, data: parsed, provider: "openrouter" };
  } catch (e) {
    const duration = Date.now() - start;
    logDiagnostics('callOpenRouter', 'openrouter', { status: e.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_FAILED', _statusCode: 0, _responseReceived: false, _jsonParsed: false, _schemaValidated: false }, duration);
    return { success: false, status: e.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_FAILED' };
  }
}

async function callOpenAI(prompt) {
  const key = getOpenAIKey();
  if (!isConfigured(key)) return { success: false, status: 'NOT_CONFIGURED' };
  const start = Date.now();
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

    const statusCode = response.status;
    const result = { _statusCode: statusCode, _responseReceived: true, _jsonParsed: false, _schemaValidated: false };

    if (statusCode === 403 || statusCode === 401) {
      PROVIDER_STATUS.openai = 'NOT_CONFIGURED';
      result.status = 'AUTH_FAILED';
      logDiagnostics('callOpenAI', 'openai', result, Date.now() - start);
      return { success: false, status: 'AUTH_FAILED' };
    }

    if (statusCode === 429) {
      result.status = 'RATE_LIMITED';
      logDiagnostics('callOpenAI', 'openai', result, Date.now() - start);
      return { success: false, status: 'RATE_LIMITED' };
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      if (body.includes('not found') || body.includes('does not exist') || body.includes('model_not_found')) {
        result.status = 'MODEL_NOT_FOUND';
      } else if (body.includes('quota') || body.includes('insufficient') || body.includes('billing')) {
        result.status = 'QUOTA_EXHAUSTED';
      } else {
        result.status = `HTTP_${statusCode}`;
      }
      logDiagnostics('callOpenAI', 'openai', result, Date.now() - start);
      return { success: false, status: result.status };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    result._responseReceived = true;
    if (!content) {
      result.status = 'INVALID_RESPONSE';
      logDiagnostics('callOpenAI', 'openai', result, Date.now() - start);
      return { success: false, status: 'INVALID_RESPONSE' };
    }
    const parsed = extractJsonFromText(content);
    result._jsonParsed = !!parsed;
    if (!parsed) {
      result.status = 'JSON_PARSE_FAILED';
      logDiagnostics('callOpenAI', 'openai', result, Date.now() - start);
      return { success: false, status: 'JSON_PARSE_FAILED' };
    }
    result._schemaValidated = true;
    result.status = 'AVAILABLE';
    logDiagnostics('callOpenAI', 'openai', result, Date.now() - start);
    return { success: true, data: parsed, provider: "openai" };
  } catch (e) {
    const duration = Date.now() - start;
    logDiagnostics('callOpenAI', 'openai', { status: e.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_FAILED', _statusCode: 0, _responseReceived: false, _jsonParsed: false, _schemaValidated: false }, duration);
    return { success: false, status: e.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_FAILED' };
  }
}

async function tryWithRetry(providerFn, prompt) {
  const result = await providerFn(prompt);
  if (result.success) return result;
  if (result.status === 'JSON_PARSE_FAILED' || result.status === 'INVALID_RESPONSE') {
    const retryPrompt = prompt + "\n\nReturn only a valid compact JSON object matching the requested schema. No markdown, no explanation.";
    const retryResult = await providerFn(retryPrompt);
    if (retryResult.success) return retryResult;
  }
  return result;
}

export async function callAI(prompt) {
  const diagnostics = [];

  // Provider fallback order: Groq → Gemini → OpenRouter → OpenAI → deterministic fallback
  // Skip providers that are: not configured, in cooldown, or known unavailable

  // 1. Try Groq
  if (!isProviderInCooldown('groq')) {
    const groqStatus = getStatus('groq');
    if (groqStatus === 'AVAILABLE') {
      const result = await tryWithRetry(callGroq, prompt);
      diagnostics.push({ provider: 'groq', status: result.status || (result.success ? 'AVAILABLE' : 'FAILED') });
      if (result.success) return result;
      if (result.status === 'RATE_LIMITED' || result.status === 'QUOTA_EXHAUSTED') {
        setProviderCooldown('groq');
      }
      if (result.status === 'AUTH_FAILED' || result.status === 'NOT_CONFIGURED') PROVIDER_STATUS.groq = 'NOT_CONFIGURED';
    } else {
      diagnostics.push({ provider: 'groq', status: groqStatus, skipped: true });
    }
  } else {
    diagnostics.push({ provider: 'groq', status: 'RATE_LIMITED', skipped: true, cooldownMs: Math.max(0, providerCooldowns.groq - Date.now()) });
  }

  // 2. Try Gemini (if configured and not in cooldown)
  if (!isProviderInCooldown('gemini')) {
    const geminiStatus = getStatus('gemini');
    if (geminiStatus === 'AVAILABLE') {
      const result = await tryWithRetry(callGemini, prompt);
      diagnostics.push({ provider: 'gemini', status: result.status || (result.success ? 'AVAILABLE' : 'FAILED') });
      if (result.success) return result;
      if (result.status === 'QUOTA_EXHAUSTED' || result.status === 'RATE_LIMITED') {
        setProviderCooldown('gemini');
      }
      if (result.status === 'AUTH_FAILED' || result.status === 'NOT_CONFIGURED') PROVIDER_STATUS.gemini = 'NOT_CONFIGURED';
    } else {
      diagnostics.push({ provider: 'gemini', status: geminiStatus, skipped: true });
    }
  } else {
    diagnostics.push({ provider: 'gemini', status: 'RATE_LIMITED', skipped: true, cooldownMs: Math.max(0, providerCooldowns.gemini - Date.now()) });
  }

  // 3. Try OpenRouter
  if (!isProviderInCooldown('openrouter')) {
    const openrouterStatus = getStatus('openrouter');
    if (openrouterStatus === 'AVAILABLE') {
      const result = await tryWithRetry(callOpenRouter, prompt);
      diagnostics.push({ provider: 'openrouter', status: result.status || (result.success ? 'AVAILABLE' : 'FAILED') });
      if (result.success) return result;
      if (result.status === 'AUTH_FAILED' || result.status === 'NOT_CONFIGURED') PROVIDER_STATUS.openrouter = 'NOT_CONFIGURED';
      if (result.status === 'RATE_LIMITED' || result.status === 'QUOTA_EXHAUSTED') {
        setProviderCooldown('openrouter');
      }
    } else {
      diagnostics.push({ provider: 'openrouter', status: openrouterStatus, skipped: true });
    }
  } else {
    diagnostics.push({ provider: 'openrouter', status: 'RATE_LIMITED', skipped: true, cooldownMs: Math.max(0, providerCooldowns.openrouter - Date.now()) });
  }

  // 4. Try OpenAI
  if (!isProviderInCooldown('openai')) {
    const openaiStatus = getStatus('openai');
    if (openaiStatus === 'AVAILABLE') {
      const result = await tryWithRetry(callOpenAI, prompt);
      diagnostics.push({ provider: 'openai', status: result.status || (result.success ? 'AVAILABLE' : 'FAILED') });
      if (result.success) return result;
      if (result.status === 'AUTH_FAILED' || result.status === 'NOT_CONFIGURED') PROVIDER_STATUS.openai = 'NOT_CONFIGURED';
      if (result.status === 'RATE_LIMITED' || result.status === 'QUOTA_EXHAUSTED') {
        setProviderCooldown('openai');
      }
    } else {
      diagnostics.push({ provider: 'openai', status: openaiStatus, skipped: true });
    }
  } else {
    diagnostics.push({ provider: 'openai', status: 'RATE_LIMITED', skipped: true, cooldownMs: Math.max(0, providerCooldowns.openai - Date.now()) });
  }

  console.log('[AI Router] All providers failed:', JSON.stringify(diagnostics));
  return { success: false, diagnostics };
}

export async function generateProductAnalysis(productData, scrapedData) {
  const prompt = buildPrompt(productData, scrapedData);

  let result = await callAI(prompt);
  if (result.success) {
    return { ...result, fallbackUsed: false };
  }

  console.log('[AI Router] Product analysis AI failed, using rule-based fallback. Diagnostics:', JSON.stringify(result.diagnostics));
  const fallbackData = getRuleBasedFallback(productData);
  return {
    success: true,
    data: fallbackData,
    provider: "rule-based",
    fallbackUsed: true,
    diagnostics: result.diagnostics,
  };
}
