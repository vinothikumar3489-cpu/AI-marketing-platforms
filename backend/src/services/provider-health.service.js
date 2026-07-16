export function isConfigured(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed === '') return false;
  if (trimmed === 'undefined' || trimmed === 'null' || trimmed === 'your_key_here') return false;
  return true;
}

function maskKey(key) {
  if (!key || key.length < 8) return null;
  return key.substring(0, 4) + '...' + key.substring(key.length - 4);
}

export function logProviderConfig() {
  const providers = [
    { name: 'Groq', key: process.env.GROQ_API_KEY, prefix: 'gsk_' },
    { name: 'Gemini', key: process.env.GEMINI_API_KEY, prefix: null },
    { name: 'OpenRouter', key: process.env.OPENROUTER_API_KEY, prefix: 'sk-or-' },
    { name: 'OpenAI', key: process.env.OPENAI_API_KEY, prefix: 'sk-proj-' },
    { name: 'Cerebras', key: process.env.CEREBRAS_API_KEY, prefix: 'csk-' },
    { name: 'DeepSeek', key: process.env.DEEPSEEK_API_KEY, prefix: 'sk-' },
    { name: 'DataForSEO', key: process.env.DATAFORSEO_LOGIN, prefix: null, isLogin: true, password: process.env.DATAFORSEO_PASSWORD },
    { name: 'Firecrawl', key: process.env.FIRECRAWL_API_KEY, prefix: 'fc-' },
    { name: 'PageSpeed', key: process.env.PAGESPEED_API_KEY, prefix: 'AIza' },
    { name: 'Tavily', key: process.env.TAVILY_API_KEY, prefix: 'tvly-' },
    { name: 'Exa', key: process.env.EXA_API_KEY, prefix: null },
    { name: 'Jina', key: process.env.JINA_API_KEY, prefix: 'jina_' },
  ];

  const configs = providers.map(p => {
    const configured = isConfigured(p.key);
    const keyLength = configured ? p.key.length : 0;
    const prefixValid = configured && p.prefix ? p.key.startsWith(p.prefix) : null;
    const passwordConfigured = p.password ? isConfigured(p.password) : null;
    return {
      provider: p.name,
      configured,
      keyLength,
      prefixValid,
      masked: configured ? maskKey(p.key) : null,
      passwordConfigured,
    };
  });

  console.log('[Provider Config]', JSON.stringify(configs, null, 2));
}

async function smokeTestFetch(url, options, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

export async function checkGroqHealth() {
  const key = process.env.GROQ_API_KEY;
  if (!isConfigured(key)) {
    return { provider: 'Groq', configured: false, authenticated: false, endpointValid: false, modelValid: false, responseValid: false, statusCode: 0, failureType: 'NOT_CONFIGURED', message: 'GROQ_API_KEY is not configured' };
  }
  try {
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const response = await smokeTestFetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Return JSON: {"ok":true}' }],
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });
    if (response.status === 401 || response.status === 403) {
      return { provider: 'Groq', configured: true, authenticated: false, endpointValid: true, modelValid: false, responseValid: false, statusCode: response.status, failureType: 'AUTH_FAILED', message: 'Groq API key is invalid or unauthorized' };
    }
    if (response.status === 429) {
      return { provider: 'Groq', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: false, statusCode: 429, failureType: 'RATE_LIMITED', message: 'Groq rate limit exceeded' };
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      if (body.includes('model_not_found') || body.includes('not found') || body.includes('does not exist')) {
        return { provider: 'Groq', configured: true, authenticated: true, endpointValid: true, modelValid: false, responseValid: false, statusCode: response.status, failureType: 'MODEL_NOT_FOUND', message: `Groq model "${model}" not found: ${body.substring(0, 200)}` };
      }
      if (body.includes('quota') || body.includes('exceeded') || response.status === 402) {
        return { provider: 'Groq', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: false, statusCode: response.status, failureType: 'QUOTA_EXHAUSTED', message: `Groq quota exhausted: ${body.substring(0, 200)}` };
      }
      return { provider: 'Groq', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: false, statusCode: response.status, failureType: 'INVALID_RESPONSE', message: `Groq returned status ${response.status}: ${body.substring(0, 200)}` };
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { provider: 'Groq', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: false, statusCode: 200, failureType: 'INVALID_RESPONSE', message: 'Groq response missing choices[0].message.content' };
    }
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = null; }
    if (!parsed || !parsed.ok) {
      return { provider: 'Groq', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: false, statusCode: 200, failureType: 'JSON_PARSE_FAILED', message: `Groq response did not contain valid JSON: ${content.substring(0, 200)}` };
    }
    return { provider: 'Groq', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: true, statusCode: 200, failureType: 'AVAILABLE', message: 'Groq API is available and authenticated.' };
  } catch (e) {
    if (e.name === 'AbortError') {
      return { provider: 'Groq', configured: true, authenticated: false, endpointValid: false, modelValid: false, responseValid: false, statusCode: 0, failureType: 'TIMEOUT', message: 'Groq request timed out after 15s' };
    }
    return { provider: 'Groq', configured: true, authenticated: false, endpointValid: false, modelValid: false, responseValid: false, statusCode: 0, failureType: 'NETWORK_FAILED', message: `Groq network error: ${e.message}` };
  }
}

export async function checkGeminiHealth() {
  const key = process.env.GEMINI_API_KEY;
  if (!isConfigured(key)) {
    return { provider: 'Gemini', configured: false, authenticated: false, endpointValid: false, modelValid: false, responseValid: false, statusCode: 0, failureType: 'NOT_CONFIGURED', message: 'GEMINI_API_KEY is not configured' };
  }
  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const apiUrl = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
    const response = await smokeTestFetch(`${apiUrl}/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Return JSON: {"ok":true}' }] }],
        generationConfig: { maxOutputTokens: 400, temperature: 0 },
      }),
    });
    if (response.status === 401 || response.status === 403) {
      return { provider: 'Gemini', configured: true, authenticated: false, endpointValid: true, modelValid: false, responseValid: false, statusCode: response.status, failureType: 'AUTH_FAILED', message: 'Gemini API key is invalid or unauthorized' };
    }
    if (response.status === 429) {
      return { provider: 'Gemini', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: false, statusCode: 429, failureType: 'RATE_LIMITED', message: 'Gemini rate limit exceeded' };
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      if (body.includes('not found') || body.includes('notFound') || body.includes('MODEL_NOT_FOUND')) {
        return { provider: 'Gemini', configured: true, authenticated: true, endpointValid: true, modelValid: false, responseValid: false, statusCode: response.status, failureType: 'MODEL_NOT_FOUND', message: `Gemini model "${model}" not found: ${body.substring(0, 200)}` };
      }
      if (body.includes('quota') || body.includes('quotaExceeded') || body.includes('RATE_LIMIT')) {
        return { provider: 'Gemini', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: false, statusCode: response.status, failureType: 'QUOTA_EXHAUSTED', message: `Gemini quota exhausted: ${body.substring(0, 200)}` };
      }
      return { provider: 'Gemini', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: false, statusCode: response.status, failureType: 'INVALID_RESPONSE', message: `Gemini returned status ${response.status}: ${body.substring(0, 200)}` };
    }
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      return { provider: 'Gemini', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: false, statusCode: 200, failureType: 'INVALID_RESPONSE', message: 'Gemini response missing candidates[0].content.parts[0].text' };
    }
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = null; }
    if (!parsed || !parsed.ok) {
      return { provider: 'Gemini', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: false, statusCode: 200, failureType: 'JSON_PARSE_FAILED', message: `Gemini response did not contain valid JSON: ${content.substring(0, 200)}` };
    }
    return { provider: 'Gemini', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: true, statusCode: 200, failureType: 'AVAILABLE', message: 'Gemini API is available and authenticated.' };
  } catch (e) {
    if (e.name === 'AbortError') {
      return { provider: 'Gemini', configured: true, authenticated: false, endpointValid: false, modelValid: false, responseValid: false, statusCode: 0, failureType: 'TIMEOUT', message: 'Gemini request timed out after 15s' };
    }
    return { provider: 'Gemini', configured: true, authenticated: false, endpointValid: false, modelValid: false, responseValid: false, statusCode: 0, failureType: 'NETWORK_FAILED', message: `Gemini network error: ${e.message}` };
  }
}

export async function checkOpenRouterHealth() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!isConfigured(key)) {
    return { provider: 'OpenRouter', configured: false, authenticated: false, endpointValid: false, modelValid: false, responseValid: false, statusCode: 0, failureType: 'NOT_CONFIGURED', message: 'OPENROUTER_API_KEY is not configured' };
  }
  try {
    const model = process.env.OPENROUTER_MODEL || 'qwen-7b-chat';
    const response = await smokeTestFetch('https://api.openrouter.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:5000', 'X-Title': 'AI-Marketing-Platform' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Return JSON: {"ok":true}' }],
        temperature: 0,
        max_tokens: 100,
      }),
    });
    if (response.status === 401 || response.status === 403) {
      return { provider: 'OpenRouter', configured: true, authenticated: false, endpointValid: true, modelValid: false, responseValid: false, statusCode: response.status, failureType: 'AUTH_FAILED', message: 'OpenRouter API key is invalid or unauthorized' };
    }
    if (response.status === 429) {
      return { provider: 'OpenRouter', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: false, statusCode: 429, failureType: 'RATE_LIMITED', message: 'OpenRouter rate limit exceeded' };
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      if (body.includes('not found') || body.includes('does not exist')) {
        return { provider: 'OpenRouter', configured: true, authenticated: true, endpointValid: true, modelValid: false, responseValid: false, statusCode: response.status, failureType: 'MODEL_NOT_FOUND', message: `OpenRouter model "${model}" not found: ${body.substring(0, 200)}` };
      }
      if (body.includes('quota') || body.includes('credits') || body.includes('insufficient')) {
        return { provider: 'OpenRouter', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: false, statusCode: response.status, failureType: 'QUOTA_EXHAUSTED', message: `OpenRouter quota/credits exhausted: ${body.substring(0, 200)}` };
      }
      return { provider: 'OpenRouter', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: false, statusCode: response.status, failureType: 'INVALID_RESPONSE', message: `OpenRouter returned status ${response.status}: ${body.substring(0, 200)}` };
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { provider: 'OpenRouter', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: false, statusCode: 200, failureType: 'INVALID_RESPONSE', message: 'OpenRouter response missing choices[0].message.content' };
    }
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = null; }
    if (!parsed || !parsed.ok) {
      return { provider: 'OpenRouter', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: false, statusCode: 200, failureType: 'JSON_PARSE_FAILED', message: `OpenRouter response did not contain valid JSON: ${content.substring(0, 200)}` };
    }
    return { provider: 'OpenRouter', configured: true, authenticated: true, endpointValid: true, modelValid: true, responseValid: true, statusCode: 200, failureType: 'AVAILABLE', message: 'OpenRouter API is available and authenticated.' };
  } catch (e) {
    if (e.name === 'AbortError') {
      return { provider: 'OpenRouter', configured: true, authenticated: false, endpointValid: false, modelValid: false, responseValid: false, statusCode: 0, failureType: 'TIMEOUT', message: 'OpenRouter request timed out after 15s' };
    }
    return { provider: 'OpenRouter', configured: true, authenticated: false, endpointValid: false, modelValid: false, responseValid: false, statusCode: 0, failureType: 'NETWORK_FAILED', message: `OpenRouter network error: ${e.message}` };
  }
}

export async function checkFirecrawlHealth() {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!isConfigured(key)) {
    return { provider: 'Firecrawl', configured: false, authenticated: false, endpointValid: false, modelValid: null, responseValid: false, statusCode: 0, failureType: 'NOT_CONFIGURED', message: 'FIRECRAWL_API_KEY is not configured' };
  }
  try {
    const response = await smokeTestFetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com', formats: ['markdown'] }),
    });
    if (response.status === 401 || response.status === 403) {
      return { provider: 'Firecrawl', configured: true, authenticated: false, endpointValid: true, modelValid: null, responseValid: false, statusCode: response.status, failureType: 'AUTH_FAILED', message: 'Firecrawl API key is invalid' };
    }
    if (!response.ok) {
      return { provider: 'Firecrawl', configured: true, authenticated: true, endpointValid: true, modelValid: null, responseValid: false, statusCode: response.status, failureType: 'QUOTA_EXHAUSTED', message: `Firecrawl returned status ${response.status}` };
    }
    const data = await response.json();
    if (data.success) {
      return { provider: 'Firecrawl', configured: true, authenticated: true, endpointValid: true, modelValid: null, responseValid: true, statusCode: 200, failureType: 'AVAILABLE', message: 'Firecrawl API is available and authenticated.' };
    }
    return { provider: 'Firecrawl', configured: true, authenticated: true, endpointValid: true, modelValid: null, responseValid: false, statusCode: 200, failureType: 'INVALID_RESPONSE', message: 'Firecrawl returned success=false' };
  } catch (e) {
    if (e.name === 'AbortError') {
      return { provider: 'Firecrawl', configured: true, authenticated: false, endpointValid: false, modelValid: null, responseValid: false, statusCode: 0, failureType: 'TIMEOUT', message: 'Firecrawl request timed out after 15s' };
    }
    return { provider: 'Firecrawl', configured: true, authenticated: false, endpointValid: false, modelValid: null, responseValid: false, statusCode: 0, failureType: 'NETWORK_FAILED', message: `Firecrawl network error: ${e.message}` };
  }
}

export async function checkDataForSeoHealth() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!isConfigured(login) || !isConfigured(password)) {
    return { provider: 'DataForSEO', configured: false, authenticated: false, endpointValid: false, modelValid: null, responseValid: false, statusCode: 0, failureType: 'NOT_CONFIGURED', message: 'DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD is not configured' };
  }
  try {
    const auth = Buffer.from(`${login}:${password}`).toString('base64');
    const baseUrl = process.env.DATAFORSEO_BASE_URL || 'https://api.dataforseo.com/v3';
    const response = await smokeTestFetch(`${baseUrl}/serp/google/organic/live`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ keyword: 'test', language_code: 'en', location_code: 2840 }]),
    });
    if (response.status === 401 || response.status === 403) {
      return { provider: 'DataForSEO', configured: true, authenticated: false, endpointValid: true, modelValid: null, responseValid: false, statusCode: response.status, failureType: 'AUTH_FAILED', message: 'DataForSEO credentials are invalid or unauthorized' };
    }
    if (response.status === 404) {
      return { provider: 'DataForSEO', configured: true, authenticated: true, endpointValid: false, modelValid: null, responseValid: false, statusCode: 404, failureType: 'ENDPOINT_NOT_FOUND', message: `DataForSEO endpoint not found: ${baseUrl}/serp/google/organic/live` };
    }
    if (response.status === 429) {
      return { provider: 'DataForSEO', configured: true, authenticated: true, endpointValid: true, modelValid: null, responseValid: false, statusCode: 429, failureType: 'RATE_LIMITED', message: 'DataForSEO rate limit exceeded' };
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      if (body.includes('quota') || body.includes('credits') || body.includes('insufficient')) {
        return { provider: 'DataForSEO', configured: true, authenticated: true, endpointValid: true, modelValid: null, responseValid: false, statusCode: response.status, failureType: 'QUOTA_EXHAUSTED', message: `DataForSEO quota/credits exhausted: ${body.substring(0, 200)}` };
      }
      return { provider: 'DataForSEO', configured: true, authenticated: true, endpointValid: true, modelValid: null, responseValid: false, statusCode: response.status, failureType: 'INVALID_RESPONSE', message: `DataForSEO returned status ${response.status}: ${body.substring(0, 200)}` };
    }
    const data = await response.json();
    if (data.status_code === 20000) {
      return { provider: 'DataForSEO', configured: true, authenticated: true, endpointValid: true, modelValid: null, responseValid: true, statusCode: 200, failureType: 'AVAILABLE', message: 'DataForSEO API is available and authenticated.' };
    }
    return { provider: 'DataForSEO', configured: true, authenticated: true, endpointValid: true, modelValid: null, responseValid: false, statusCode: 200, failureType: 'INVALID_RESPONSE', message: `DataForSEO returned status_code ${data.status_code}` };
  } catch (e) {
    if (e.name === 'AbortError') {
      return { provider: 'DataForSEO', configured: true, authenticated: false, endpointValid: false, modelValid: null, responseValid: false, statusCode: 0, failureType: 'TIMEOUT', message: 'DataForSEO request timed out after 15s' };
    }
    return { provider: 'DataForSEO', configured: true, authenticated: false, endpointValid: false, modelValid: null, responseValid: false, statusCode: 0, failureType: 'NETWORK_FAILED', message: `DataForSEO network error: ${e.message}` };
  }
}

export async function checkPageSpeedHealth() {
  const key = process.env.PAGESPEED_API_KEY;
  if (!isConfigured(key)) {
    return { provider: 'PageSpeed', configured: false, authenticated: false, endpointValid: false, modelValid: null, responseValid: false, statusCode: 0, failureType: 'NOT_CONFIGURED', message: 'PAGESPEED_API_KEY is not configured' };
  }
  try {
    const url = 'https://example.com';
    const response = await smokeTestFetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${key}&strategy=mobile`, {
      method: 'GET',
    });
    if (response.status === 401 || response.status === 403) {
      return { provider: 'PageSpeed', configured: true, authenticated: false, endpointValid: true, modelValid: null, responseValid: false, statusCode: response.status, failureType: 'AUTH_FAILED', message: 'PageSpeed API key is invalid' };
    }
    if (response.status === 429) {
      return { provider: 'PageSpeed', configured: true, authenticated: true, endpointValid: true, modelValid: null, responseValid: false, statusCode: 429, failureType: 'RATE_LIMITED', message: 'PageSpeed API rate limit exceeded' };
    }
    if (!response.ok) {
      return { provider: 'PageSpeed', configured: true, authenticated: true, endpointValid: true, modelValid: null, responseValid: false, statusCode: response.status, failureType: 'QUOTA_EXHAUSTED', message: `PageSpeed returned status ${response.status}` };
    }
    const data = await response.json();
    if (data.lighthouseResult?.categories?.performance?.score !== undefined) {
      return { provider: 'PageSpeed', configured: true, authenticated: true, endpointValid: true, modelValid: null, responseValid: true, statusCode: 200, failureType: 'AVAILABLE', message: 'PageSpeed API is available and authenticated.' };
    }
    return { provider: 'PageSpeed', configured: true, authenticated: true, endpointValid: true, modelValid: null, responseValid: false, statusCode: 200, failureType: 'INVALID_RESPONSE', message: 'PageSpeed response missing lighthouseResult.categories.performance.score' };
  } catch (e) {
    if (e.name === 'AbortError') {
      return { provider: 'PageSpeed', configured: true, authenticated: false, endpointValid: false, modelValid: null, responseValid: false, statusCode: 0, failureType: 'TIMEOUT', message: 'PageSpeed request timed out after 15s' };
    }
    return { provider: 'PageSpeed', configured: true, authenticated: false, endpointValid: false, modelValid: null, responseValid: false, statusCode: 0, failureType: 'NETWORK_FAILED', message: `PageSpeed network error: ${e.message}` };
  }
}
