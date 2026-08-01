/**
 * Production-Grade AI Provider Manager
 * 
 * Features:
 * - Health scoring for each provider
 * - Automatic failover with priority routing
 * - Retry with exponential backoff
 * - Circuit breaker pattern
 * - Provider cooldown on failures
 * - Daily quota monitoring
 * - Model selection
 * - Token budgeting
 * - Priority routing: OpenAI -> Claude -> Gemini -> Groq -> OpenRouter -> DeepSeek -> Cerebras
 */

const PROVIDER_PRIORITY = [
  'openai',
  'claude',
  'gemini',
  'groq',
  'openrouter',
  'deepseek',
  'cerebras'
];

const PROVIDER_CONFIG = {
  openai: {
    envKey: 'OPENAI_API_KEY',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    maxRetries: 3,
    cooldownMs: 60000,
  },
  claude: {
    envKey: 'ANTHROPIC_API_KEY',
    baseURL: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
    maxRetries: 3,
    cooldownMs: 60000,
  },
  gemini: {
    envKey: 'GEMINI_API_KEY',
    baseURL: null, // Uses Google Generative AI SDK
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    maxRetries: 3,
    cooldownMs: 60000,
  },
  groq: {
    envKey: 'GROQ_API_KEY',
    baseURL: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
    maxRetries: 3,
    cooldownMs: 60000,
  },
  openrouter: {
    envKey: 'OPENROUTER_API_KEY',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/auto',
    models: ['openrouter/auto', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o'],
    maxRetries: 3,
    cooldownMs: 60000,
  },
  deepseek: {
    envKey: 'DEEPSEEK_API_KEY',
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-coder'],
    maxRetries: 3,
    cooldownMs: 60000,
  },
  cerebras: {
    envKey: 'CEREBRAS_API_KEY',
    baseURL: 'https://api.cerebras.ai/v1',
    defaultModel: 'llama-3.3-70b',
    models: ['llama-3.3-70b', 'llama-3.1-70b'],
    maxRetries: 3,
    cooldownMs: 60000,
  },
};

// Provider health state
const providerHealth = new Map();

// Circuit breaker state
const circuitBreakers = new Map();

// Daily quota tracking
const dailyQuota = new Map();

// Token budget tracking
const tokenBudget = new Map();

/**
 * Initialize provider health state
 */
function initializeProviderHealth() {
  for (const provider of PROVIDER_PRIORITY) {
    if (!providerHealth.has(provider)) {
      providerHealth.set(provider, {
        successCount: 0,
        failureCount: 0,
        lastSuccess: null,
        lastFailure: null,
        healthScore: 100,
        inCooldown: false,
        cooldownUntil: null,
      });
    }
    if (!circuitBreakers.has(provider)) {
      circuitBreakers.set(provider, {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: null,
        openUntil: null,
      });
    }
    if (!dailyQuota.has(provider)) {
      dailyQuota.set(provider, {
        requestsToday: 0,
        tokensToday: 0,
        resetDate: new Date().toDateString(),
      });
    }
    if (!tokenBudget.has(provider)) {
      tokenBudget.set(provider, {
        tokensUsed: 0,
        dailyLimit: 1000000, // 1M tokens per day default
      });
    }
  }
}

/**
 * Check if provider is available
 */
function isProviderAvailable(provider) {
  const health = providerHealth.get(provider);
  const circuit = circuitBreakers.get(provider);
  const quota = dailyQuota.get(provider);
  const budget = tokenBudget.get(provider);

  // Check if API key is configured
  const apiKey = process.env[PROVIDER_CONFIG[provider].envKey];
  if (!apiKey) return false;

  // Check cooldown
  if (health?.inCooldown && health?.cooldownUntil && Date.now() < health.cooldownUntil) {
    return false;
  }

  // Check circuit breaker
  if (circuit?.isOpen && circuit?.openUntil && Date.now() < circuit.openUntil) {
    return false;
  }

  // Check daily quota reset
  if (quota?.resetDate !== new Date().toDateString()) {
    dailyQuota.set(provider, {
      requestsToday: 0,
      tokensToday: 0,
      resetDate: new Date().toDateString(),
    });
  }

  // Check token budget
  if (budget?.tokensUsed >= budget?.dailyLimit) {
    return false;
  }

  return true;
}

/**
 * Update provider health after request
 */
function updateProviderHealth(provider, success, tokensUsed = 0) {
  const health = providerHealth.get(provider);
  const circuit = circuitBreakers.get(provider);
  const quota = dailyQuota.get(provider);
  const budget = tokenBudget.get(provider);

  if (!health || !circuit || !quota || !budget) return;

  if (success) {
    health.successCount++;
    health.lastSuccess = new Date();
    health.inCooldown = false;
    health.cooldownUntil = null;

    // Reset circuit breaker on success
    if (circuit.isOpen) {
      circuit.isOpen = false;
      circuit.failureCount = 0;
      circuit.openUntil = null;
    }

    // Calculate health score (0-100)
    const total = health.successCount + health.failureCount;
    health.healthScore = Math.round((health.successCount / total) * 100);

    // Update quota
    quota.requestsToday++;
    quota.tokensToday += tokensUsed;
    budget.tokensUsed += tokensUsed;
  } else {
    health.failureCount++;
    health.lastFailure = new Date();

    // Update circuit breaker
    circuit.failureCount++;
    circuit.lastFailureTime = new Date();

    const config = PROVIDER_CONFIG[provider];
    if (circuit.failureCount >= 5) {
      // Open circuit breaker for 5 minutes
      circuit.isOpen = true;
      circuit.openUntil = Date.now() + 300000;
    }

    // Activate cooldown if failure rate is high
    const total = health.successCount + health.failureCount;
    const failureRate = health.failureCount / total;
    if (failureRate > 0.5 && total >= 3) {
      health.inCooldown = true;
      health.cooldownUntil = Date.now() + config.cooldownMs;
    }

    // Calculate health score
    health.healthScore = Math.round((health.successCount / total) * 100);
  }
}

/**
 * Get available providers in priority order
 */
function getAvailableProviders() {
  initializeProviderHealth();

  const available = PROVIDER_PRIORITY.filter(p => isProviderAvailable(p));

  // Sort by health score (descending)
  available.sort((a, b) => {
    const healthA = providerHealth.get(a)?.healthScore || 0;
    const healthB = providerHealth.get(b)?.healthScore || 0;
    return healthB - healthA;
  });

  return available;
}

/**
 * Execute request with retry and exponential backoff
 */
async function executeWithRetry(provider, requestFn, maxRetries = 3) {
  const config = PROVIDER_CONFIG[provider];
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await requestFn();
      updateProviderHealth(provider, true, result.tokensUsed || 0);
      return { success: true, data: result, provider, attempt };
    } catch (error) {
      lastError = error;
      console.warn(`[ProviderManager] ${provider} attempt ${attempt + 1} failed:`, error.message);

      if (attempt < maxRetries) {
        // Exponential backoff: 2^attempt * 1000ms
        const backoffMs = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  updateProviderHealth(provider, false);
  return {
    success: false,
    error: lastError?.message || 'Unknown error',
    provider,
    attempts: maxRetries + 1,
  };
}

/**
 * Main provider manager - tries providers in priority order
 */
export async function callAIWithProviderManager(prompt, options = {}) {
  const availableProviders = getAvailableProviders();

  if (availableProviders.length === 0) {
    return {
      success: false,
      reason: 'ALL_AI_PROVIDERS_UNAVAILABLE',
      failedProviders: PROVIDER_PRIORITY,
      retryAfter: 60,
      userMessage: 'AI generation temporarily unavailable. All providers are either unconfigured, in cooldown, or quota exceeded.',
    };
  }

  const preferredProvider = options.provider || availableProviders[0];
  const errors = [];

  // Try preferred provider first if available
  if (availableProviders.includes(preferredProvider)) {
    const result = await tryProvider(preferredProvider, prompt, options);
    if (result.success) return result;
    errors.push({ provider: preferredProvider, error: result.error });
  }

  // Try other available providers in priority order
  for (const provider of availableProviders) {
    if (provider === preferredProvider) continue;

    const result = await tryProvider(provider, prompt, options);
    if (result.success) return result;
    errors.push({ provider, error: result.error });
  }

  // All providers failed
  return {
    success: false,
    reason: 'ALL_AI_PROVIDERS_FAILED',
    failedProviders: errors,
    retryAfter: 60,
    userMessage: 'AI generation temporarily unavailable. All providers returned errors.',
  };
}

/**
 * Try a single provider
 */
async function tryProvider(provider, prompt, options) {
  const config = PROVIDER_CONFIG[provider];
  const apiKey = process.env[config.envKey];

  if (!apiKey) {
    return {
      success: false,
      error: `API key not configured for ${provider}`,
      provider,
    };
  }

  // Import provider-specific client
  try {
    if (provider === 'gemini') {
      return await callGemini(prompt, options, config);
    } else if (provider === 'claude') {
      return await callClaude(prompt, options, config);
    } else {
      return await callOpenAICompatible(prompt, options, config, provider);
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      provider,
    };
  }
}

/**
 * Call OpenAI-compatible provider (Groq, OpenRouter, DeepSeek, Cerebras)
 */
async function callOpenAICompatible(prompt, options, config, provider) {
  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey: process.env[config.envKey], baseURL: config.baseURL });

  const messages = [
    { role: 'system', content: options.systemPrompt || 'You are a helpful assistant. Always respond with valid JSON.' },
    { role: 'user', content: prompt + '\n\nRespond ONLY with valid JSON. No markdown, no explanation.' },
  ];

  const response = await client.chat.completions.create({
    model: options.model || config.defaultModel,
    messages,
    max_tokens: options.maxTokens || 2000,
    ...(options.schema ? { response_format: { type: 'json_object' } } : {}),
  });

  const tokensUsed = response.usage?.total_tokens || 0;

  return {
    success: true,
    data: response.choices[0].message.content,
    provider,
    model: response.model,
    tokensUsed,
  };
}

/**
 * Call Claude
 */
async function callClaude(prompt, options, config) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: process.env[config.envKey] });

  const response = await client.messages.create({
    model: options.model || config.defaultModel,
    max_tokens: options.maxTokens || 2000,
    system: options.systemPrompt || 'You are a helpful assistant. Always respond with valid JSON.',
    messages: [{ role: 'user', content: prompt }],
  });

  const tokensUsed = response.usage?.input_tokens + response.usage?.output_tokens || 0;

  return {
    success: true,
    data: response.content[0].text,
    provider: 'claude',
    model: response.model,
    tokensUsed,
  };
}

/**
 * Call Gemini
 */
async function callGemini(prompt, options, config) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const client = new GoogleGenerativeAI(process.env[config.envKey]);

  const model = client.getGenerativeModel({
    model: options.model || config.defaultModel,
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: options.maxTokens || 2000,
    },
  });

  const fullPrompt = `${options.systemPrompt || 'You are a helpful assistant. Always respond with valid JSON.'}\n\n${prompt}\n\nRespond ONLY with valid JSON. No markdown, no explanation.`;

  const result = await model.generateContent(fullPrompt);
  const response = await result.response;

  const tokensUsed = response.usageMetadata?.promptTokenCount + response.usageMetadata?.candidatesTokenCount || 0;

  return {
    success: true,
    data: response.text(),
    provider: 'gemini',
    model: options.model || config.defaultModel,
    tokensUsed,
  };
}

/**
 * Get provider diagnostics
 */
export function getProviderDiagnostics() {
  initializeProviderHealth();

  return PROVIDER_PRIORITY.map(provider => {
    const health = providerHealth.get(provider);
    const circuit = circuitBreakers.get(provider);
    const quota = dailyQuota.get(provider);
    const budget = tokenBudget.get(provider);
    const config = PROVIDER_CONFIG[provider];
    const apiKey = process.env[config.envKey];

    return {
      provider,
      configured: !!apiKey,
      available: isProviderAvailable(provider),
      healthScore: health?.healthScore || 0,
      successCount: health?.successCount || 0,
      failureCount: health?.failureCount || 0,
      inCooldown: health?.inCooldown || false,
      circuitOpen: circuit?.isOpen || false,
      requestsToday: quota?.requestsToday || 0,
      tokensToday: quota?.tokensToday || 0,
      tokensUsed: budget?.tokensUsed || 0,
      tokenBudget: budget?.dailyLimit || 0,
    };
  });
}

/**
 * Reset provider health (for testing or manual recovery)
 */
export function resetProviderHealth(provider) {
  if (provider) {
    providerHealth.delete(provider);
    circuitBreakers.delete(provider);
    dailyQuota.delete(provider);
    tokenBudget.delete(provider);
  } else {
    providerHealth.clear();
    circuitBreakers.clear();
    dailyQuota.clear();
    tokenBudget.clear();
  }
  initializeProviderHealth();
}
