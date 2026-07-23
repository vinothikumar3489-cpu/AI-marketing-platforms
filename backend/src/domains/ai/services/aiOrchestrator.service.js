import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

const AI_PROVIDER_CONFIG = {
  gemini: {
    envKey: 'GEMINI_API_KEY',
    defaultModel: GEMINI_MODELS[0],
    modelFallbacks: GEMINI_MODELS,
  },
  groq: {
    envKey: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile',
    baseURL: 'https://api.groq.com/openai/v1',
  },
  cerebras: {
    envKey: 'CEREBRAS_API_KEY',
    defaultModel: 'llama-3.3-70b',
    baseURL: 'https://api.cerebras.ai/v1',
  },
  deepseek: {
    envKey: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com/v1',
  },
  openrouter: {
    envKey: 'OPENROUTER_API_KEY',
    defaultModel: 'openrouter/auto',
    baseURL: 'https://openrouter.ai/api/v1',
  },
};

let instance = null;

export class AIOrchestrator {
  constructor() {
    this._providers = {};
    this._initialized = false;
  }

  _initProvider(name) {
    if (this._providers[name]) return this._providers[name];

    const cfg = AI_PROVIDER_CONFIG[name];
    if (!cfg) return null;

    const apiKey = process.env[cfg.envKey];
    if (!apiKey) return null;

    try {
      if (name === 'gemini') {
        this._providers[name] = { client: new GoogleGenerativeAI(apiKey), cfg };
      } else if (['groq', 'cerebras', 'deepseek', 'openrouter'].includes(name)) {
        this._providers[name] = { client: new OpenAI({ apiKey, baseURL: cfg.baseURL }), cfg };
      }
    } catch {
      return null;
    }

    return this._providers[name];
  }

  getAvailableProviders() {
    return Object.keys(AI_PROVIDER_CONFIG).filter(p => {
      const apiKey = process.env[AI_PROVIDER_CONFIG[p].envKey];
      return !!apiKey;
    });
  }

  getProviderDiagnostics() {
    const diagnostics = [];
    for (const [name, cfg] of Object.entries(AI_PROVIDER_CONFIG)) {
      const apiKey = process.env[cfg.envKey];
      diagnostics.push({
        provider: name,
        enabled: !!apiKey,
        configured: !!apiKey,
        warning: apiKey ? null : `Missing ${cfg.envKey}`,
        defaultModel: cfg.defaultModel,
      });
    }
    return diagnostics;
  }

  async generateCompletion({
    userId,
    chatId,
    prompt,
    systemPrompt,
    preferredProvider = 'gemini',
    model,
    schema = null,
  }) {
    const available = this.getAvailableProviders();
    if (available.length === 0) {
      return { success: false, error: 'No AI providers configured. Set at least one of: GEMINI_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY, DEEPSEEK_API_KEY, OPENROUTER_API_KEY' };
    }

    if (!available.includes(preferredProvider)) {
      preferredProvider = available[0];
    }

    const cfg = AI_PROVIDER_CONFIG[preferredProvider];
    const modelsToTry = preferredProvider === 'gemini' ? GEMINI_MODELS : [model || cfg.defaultModel];
    const usedModel = model || cfg.defaultModel;

    const tryProvider = async (providerName, modelName) => {
      const pcfg = AI_PROVIDER_CONFIG[providerName];
      const prov = this._initProvider(providerName);
      if (!prov) return null;
      if (providerName === 'gemini') {
        return await this._callGemini(prov.client, { prompt, systemPrompt, model: modelName, schema });
      }
      return await this._callOpenAICompatible(prov.client, { prompt, systemPrompt, model: modelName, schema });
    };

    let lastError;
    for (const modelName of modelsToTry) {
      try {
        const result = await tryProvider(preferredProvider, modelName);
        return {
          success: true,
          data: result.content,
          provider: preferredProvider,
          model: modelName,
          usage: result.usage,
        };
      } catch (error) {
        lastError = error;
        console.warn(`[AI Orchestrator] ${preferredProvider}/${modelName} failed:`, error.message);
      }
    }

    console.warn(`[AI Orchestrator] Provider ${preferredProvider} failed on all models, falling back`);
    const fallbacks = available.filter(p => p !== preferredProvider);
    for (const fallback of fallbacks) {
      try {
        const fallbackCfg = AI_PROVIDER_CONFIG[fallback];
        const result = await tryProvider(fallback, fallbackCfg.defaultModel);
        console.log(`[AI Orchestrator] Fell back to ${fallback}/${fallbackCfg.defaultModel}`);
        return {
          success: true,
          data: result.content,
          provider: fallback,
          model: fallbackCfg.defaultModel,
          usage: result.usage,
        };
      } catch (fbError) {
        console.warn(`[AI Orchestrator] Fallback ${fallback} also failed:`, fbError.message);
        lastError = fbError;
      }
    }
    return { success: false, error: `All AI providers failed. Last error: ${lastError?.message || 'Unknown'}` };
  }

  async _callOpenAICompatible(client, { prompt, systemPrompt, model, schema }) {
    const response = await client.chat.completions.create({
      model: model || 'gemini-1.5-flash',
      messages: [
        { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      response_format: schema ? { type: 'json_object' } : undefined,
    });
    return {
      content: response.choices[0].message.content,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
      },
    };
  }

  async _callGemini(client, { prompt, systemPrompt, model, schema }) {
    const aiModel = client.getGenerativeModel({ model: model || 'gemini-1.5-flash' });
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
    const result = await aiModel.generateContent(schema ? `${fullPrompt}\n\nRETURN ONLY VALID JSON MATCHING THIS TASK.` : fullPrompt);
    const response = await result.response;
    return {
      content: response.text(),
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
      },
    };
  }
}

export function getAIOrchestrator() {
  if (!instance) {
    instance = new AIOrchestrator();
  }
  return instance;
}

export const aiOrchestrator = getAIOrchestrator();

export function getAIProviderDiagnostics() {
  return getAIOrchestrator().getProviderDiagnostics();
}

export async function callAI(prompt, options = {}) {
  const systemPrompt = options.systemPrompt || 'You are a helpful AI assistant. Output JSON if requested.';
  try {
    const preferredProvider = options.provider || 'groq';
    const response = await getAIOrchestrator().generateCompletion({
      userId: 'system',
      chatId: 'system',
      prompt,
      systemPrompt,
      preferredProvider,
      model: options.model || undefined,
      schema: null,
    });
    return { success: response.success, data: response.success ? response.data : null, provider: response.provider, error: response.error };
  } catch (error) {
    console.error('callAI shim failed:', error);
    return { success: false, error: error.message };
  }
}

export async function generateProductAnalysis(data) {
  return callAI(`Analyze product: ${JSON.stringify(data)}`);
}
