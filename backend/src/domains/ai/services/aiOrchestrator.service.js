import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

const AI_PROVIDER_CONFIG = {
  openai: {
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
  },
  gemini: {
    envKey: 'GEMINI_API_KEY',
    defaultModel: 'gemini-1.5-flash',
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
      if (name === 'openai') {
        this._providers[name] = { client: new OpenAI({ apiKey }), cfg };
      } else if (name === 'gemini') {
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
    preferredProvider = 'openai',
    model,
    schema = null,
  }) {
    const available = this.getAvailableProviders();
    if (available.length === 0) {
      return { success: false, error: 'No AI providers configured. Set at least one of: OPENAI_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY, DEEPSEEK_API_KEY, OPENROUTER_API_KEY' };
    }

    if (!available.includes(preferredProvider)) {
      preferredProvider = available[0];
    }

    const cfg = AI_PROVIDER_CONFIG[preferredProvider];
    const usedModel = model || cfg.defaultModel;

    try {
      const provider = this._initProvider(preferredProvider);
      if (!provider) {
        return { success: false, error: `Provider ${preferredProvider} failed to initialize` };
      }

      let result;
      if (preferredProvider === 'gemini') {
        result = await this._callGemini(provider.client, { prompt, systemPrompt, model: usedModel, schema });
      } else {
        result = await this._callOpenAI(provider.client, { prompt, systemPrompt, model: usedModel, schema });
      }

      return {
        success: true,
        data: result.content,
        provider: preferredProvider,
        model: usedModel,
        usage: result.usage,
      };
    } catch (error) {
      console.warn(`[AI Orchestrator] Provider ${preferredProvider} failed:`, error.message);
      const fallback = available.find(p => p !== preferredProvider);
      if (fallback) {
        console.log(`[AI Orchestrator] Falling back to ${fallback}`);
        const fallbackCfg = AI_PROVIDER_CONFIG[fallback];
        const fallbackModel = fallbackCfg.defaultModel;
        try {
          const provider = this._initProvider(fallback);
          if (provider) {
            let result;
            if (fallback === 'gemini') {
              result = await this._callGemini(provider.client, { prompt, systemPrompt, model: fallbackModel, schema });
            } else {
              result = await this._callOpenAI(provider.client, { prompt, systemPrompt, model: fallbackModel, schema });
            }
            return {
              success: true,
              data: result.content,
              provider: fallback,
              model: fallbackModel,
              usage: result.usage,
            };
          }
        } catch (fallbackError) {
          console.error(`[AI Orchestrator] Fallback ${fallback} also failed:`, fallbackError.message);
        }
      }
      return { success: false, error: `All AI providers failed. Last error: ${error.message}` };
    }
  }

  async _callOpenAI(client, { prompt, systemPrompt, model, schema }) {
    const response = await client.chat.completions.create({
      model: model || 'gpt-4o-mini',
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
    const response = await getAIOrchestrator().generateCompletion({
      userId: 'system',
      chatId: 'system',
      prompt,
      systemPrompt,
      preferredProvider: options.provider || 'openai',
      model: options.model || 'gpt-4o-mini',
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
