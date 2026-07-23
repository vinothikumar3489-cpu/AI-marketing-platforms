
import { prisma } from "../../../config/prisma.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

function buildContextFromModules(modules) {
  let contextParts = [];
  let usedModules = [];

  if (modules.productAnalysis && Object.keys(modules.productAnalysis).length > 0) {
    contextParts.push(`## Product Analysis\n` + JSON.stringify(modules.productAnalysis, null, 2));
    usedModules.push('Product Analysis');
  }
  if (modules.marketDiscovery && Object.keys(modules.marketDiscovery).length > 0) {
    contextParts.push(`## Market Discovery\n` + JSON.stringify(modules.marketDiscovery, null, 2));
    usedModules.push('Market Discovery');
  }
  if (modules.competitorAnalysis && Object.keys(modules.competitorAnalysis).length > 0) {
    contextParts.push(`## Competitor Analysis\n` + JSON.stringify(modules.competitorAnalysis, null, 2));
    usedModules.push('Competitor Analysis');
  }
  if (modules.seoAnalysis && Object.keys(modules.seoAnalysis).length > 0) {
    contextParts.push(`## SEO Intelligence\n` + JSON.stringify(modules.seoAnalysis, null, 2));
    usedModules.push('SEO Intelligence');
  }
  if (modules.campaignGenerator && Object.keys(modules.campaignGenerator).length > 0) {
    contextParts.push(`## Campaign Generator\n` + JSON.stringify(modules.campaignGenerator, null, 2));
    usedModules.push('Campaign Generator');
  }
  if (modules.audienceIntelligence && Object.keys(modules.audienceIntelligence).length > 0) {
    contextParts.push(`## Audience Intelligence\n` + JSON.stringify(modules.audienceIntelligence, null, 2));
    usedModules.push('Audience Intelligence');
  }

  return {
    context: contextParts.join('\n\n'),
    usedModules
  };
}

function buildPrompt(context, userMessage) {
  return `You are a marketing AI assistant for MarketForm AI. Answer questions based on the saved module results provided.

### Saved Module Results:
${context}

### User Question:
${userMessage}

Return JSON with:
- answer: concise answer to question
- usedContextModules: list of modules used to answer
- suggestedNextActions: 3-5 actionable next steps
- provider: always "gemini" or "groq"
- fallbackUsed: false

Only return JSON, no extra text.
`;
}

function getRuleBasedFallback(userMessage) {
  const suggestedNextActions = [
    "Run Product Analysis if you haven't yet",
    "Explore Market Discovery for more insights",
    "Generate a Campaign Plan if you're ready to launch"
  ];
  return {
    answer: "I don't have enough saved module data to answer that question. Please run some analysis modules first and then try asking questions based on those results.",
    usedContextModules: [],
    suggestedNextActions,
    provider: 'rule-based',
    fallbackUsed: true
  };
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) return { success: false };
  try {
    const response = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1500, temperature: 0.4 }
      })
    });
    if (!response.ok) {
      console.warn('Gemini API error:', response.status);
      return { success: false };
    }
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { success: false };
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { success: false };
    const parsed = JSON.parse(jsonMatch[0]);
    return { success: true, data: { ...parsed, provider: 'gemini', fallbackUsed: false } };
  } catch (e) {
    console.error('Gemini failed:', e);
    return { success: false };
  }
}

async function callGroq(prompt) {
  if (!GROQ_API_KEY) return { success: false };
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.4
      })
    });
    if (!response.ok) {
      console.warn('Groq API error:', response.status);
      return { success: false };
    }
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return { success: false };
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { success: false };
    const parsed = JSON.parse(jsonMatch[0]);
    return { success: true, data: { ...parsed, provider: 'groq', fallbackUsed: false } };
  } catch (e) {
    console.error('Groq failed:', e);
    return { success: false };
  }
}

export async function runAIAssistant({ chatId, userId, userMessage }) {
  try {
    // Verify chat ownership
    let finalChat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });
    if (!finalChat) {
      return { success: false, error: "Chat not found or not owned by user" };
    }

    const finalChatId = finalChat.id;
    
    const productAnalysis = (await prisma.productAnalysis.findUnique({ where: { chatId: finalChatId } }))?.productAnalysis;
    const productIntelligence = await prisma.productIntelligence.findUnique({ where: { chatId: finalChatId } });
    const competitorIntelligence = await prisma.competitorIntelligence.findUnique({ where: { chatId: finalChatId } });
    const seoIntelligence = await prisma.seoIntelligence.findUnique({ where: { chatId: finalChatId } });
    const campaignIntelligence = await prisma.campaignIntelligence.findUnique({ where: { chatId: finalChatId } });

    const modules = {
      productAnalysis: productAnalysis || {},
      marketDiscovery: productIntelligence?.marketDiscovery || {},
      competitorAnalysis: competitorIntelligence?.competitorAnalysis || {},
      seoAnalysis: seoIntelligence?.seoAudit || {},
      campaignGenerator: campaignIntelligence?.campaignGenerator || {},
      audienceIntelligence: productIntelligence?.audienceIntelligence || {}
    };

    const { context, usedModules } = buildContextFromModules(modules);
    const prompt = buildPrompt(context, userMessage);
    console.log('AI Assistant prompt built, context used:', usedModules);

    let aiResult = await callGemini(prompt);
    if (!aiResult.success) {
      aiResult = await callGroq(prompt);
    }
    if (!aiResult.success) {
      aiResult = { success: true, data: getRuleBasedFallback(userMessage) };
    }
    aiResult.data.usedContextModules = [...(aiResult.data.usedContextModules || usedModules)];

    await prisma.message.create({
      data: {
        chatId: finalChatId,
        role: 'user',
        content: userMessage
      }
    });
    await prisma.message.create({
      data: {
        chatId: finalChatId,
        role: 'assistant',
        content: aiResult.data.answer,
        analysisData: aiResult.data
      }
    });

    return { success: true, data: aiResult.data };

  } catch (e) {
    console.error('AI Assistant error:', e);
    return { success: false, error: e.message };
  }
}
