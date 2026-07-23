import { trackAiUsage } from './aiAnalytics.service.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { getLatestEvidenceSnapshot } from '../../research/services/evidence.service.js';

// This is the Centralized AI Orchestrator
export class AIOrchestrator {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  async generateCompletion({
    userId,
    chatId,
    prompt,
    systemPrompt,
    preferredProvider = 'openai',
    model = 'gpt-4o-mini',
    schema = null, // Zod schema
  }) {
    let result = null;
    let usedProvider = preferredProvider;
    let usedModel = model;
    let finalSystemPrompt = systemPrompt;

    if (chatId && chatId !== 'system') {
      const evidenceReq = await getLatestEvidenceSnapshot(chatId);
      if (evidenceReq.success && evidenceReq.snapshot) {
        finalSystemPrompt += `\n\n### CANONICAL EVIDENCE BASE ###\nDo NOT hallucinate data. Ground your response in the following verified evidence:\n${JSON.stringify({
          website: evidenceReq.snapshot.websiteEvidence,
          content: evidenceReq.snapshot.contentEvidence,
          technical: evidenceReq.snapshot.technicalSeoEvidence
        })}`;
      }
    }

    try {
      if (preferredProvider === 'openai') {
        result = await this._callOpenAI({ prompt, systemPrompt: finalSystemPrompt, model, schema });
      } else if (preferredProvider === 'gemini') {
        result = await this._callGemini({ prompt, systemPrompt: finalSystemPrompt, model, schema });
      } else {
        throw new Error(`Unsupported provider: ${preferredProvider}`);
      }
    } catch (error) {
      console.warn(`[AI Orchestrator] Provider ${preferredProvider} failed. Falling back...`, error.message);
      // Fallback logic
      usedProvider = preferredProvider === 'openai' ? 'gemini' : 'openai';
      usedModel = usedProvider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash';
      
      if (usedProvider === 'openai') {
        result = await this._callOpenAI({ prompt, systemPrompt: finalSystemPrompt, model: usedModel, schema });
      } else {
        result = await this._callGemini({ prompt, systemPrompt: finalSystemPrompt, model: usedModel, schema });
      }
    }

    // Validate with Zod if schema provided
    let parsedData = result.content;
    if (schema) {
      try {
        if (typeof result.content === 'string') {
          // Attempt JSON parse
          const jsonMatch = result.content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (jsonMatch) {
            parsedData = JSON.parse(jsonMatch[0]);
          }
        }
        parsedData = schema.parse(parsedData);
      } catch (e) {
        console.error('[AI Orchestrator] Zod Validation Failed', e);
        throw new Error('AI output failed strict schema validation');
      }
    }

    // Track usage asynchronously
    trackAiUsage({
      userId,
      chatId,
      provider: usedProvider,
      model: usedModel,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens
    });

    return {
      success: true,
      data: parsedData,
      provider: usedProvider,
      model: usedModel,
      usage: result.usage
    };
  }

  async _callOpenAI({ prompt, systemPrompt, model, schema }) {
    const response = await this.openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ],
      response_format: schema ? { type: 'json_object' } : undefined,
    });
    
    return {
      content: response.choices[0].message.content,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0
      }
    };
  }

  async _callGemini({ prompt, systemPrompt, model, schema }) {
    const aiModel = this.genAI.getGenerativeModel({ model: model || 'gemini-1.5-flash' });
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
    
    const result = await aiModel.generateContent(schema ? `${fullPrompt}\n\nRETURN ONLY VALID JSON MATCHING THIS TASK.` : fullPrompt);
    const response = await result.response;
    
    // Gemini token counting is approximate if not explicit
    return {
      content: response.text(),
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0
      }
    };
  }
}

export const aiOrchestrator = new AIOrchestrator();

export function getAIProviderDiagnostics() {
  return [
    { provider: 'openai', configured: !!process.env.OPENAI_API_KEY, status: !!process.env.OPENAI_API_KEY ? 'AVAILABLE' : 'NOT_CONFIGURED', cooldownActive: false },
    { provider: 'gemini', configured: !!process.env.GEMINI_API_KEY, status: !!process.env.GEMINI_API_KEY ? 'AVAILABLE' : 'NOT_CONFIGURED', cooldownActive: false }
  ];
}

// Backward-compatible shim for legacy callAI imports
export async function callAI(prompt, options = {}) {
  const systemPrompt = options.systemPrompt || "You are a helpful AI assistant. Output JSON if requested.";
  try {
    const response = await aiOrchestrator.generateCompletion({
      userId: 'system',
      chatId: 'system',
      prompt,
      systemPrompt,
      preferredProvider: options.provider || 'openai',
      model: options.model || 'gpt-4o-mini',
      schema: null // Legacy usually parsed JSON manually
    });
    return { success: true, data: response.data, provider: response.provider };
  } catch (error) {
    console.error("callAI shim failed:", error);
    return { success: false, error: error.message };
  }
}

export async function generateProductAnalysis(data) {
  return callAI(`Analyze product: ${JSON.stringify(data)}`);
}
