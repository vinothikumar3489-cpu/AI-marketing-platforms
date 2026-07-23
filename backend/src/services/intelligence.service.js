import { aiOrchestrator } from "../domains/ai/services/aiOrchestrator.service.js";
import { z } from "zod";

export const analyzeProductIntelligence = async (productData, scrapedData) => {
  const schema = z.object({
    summary: z.string().optional(),
    features: z.array(z.string()).optional(),
    targetAudience: z.array(z.string()).optional(),
  });

  const prompt = `Analyze this product data: ${JSON.stringify(productData)} and scraped data: ${JSON.stringify(scrapedData)}`;
  
  try {
    const response = await aiOrchestrator.generateCompletion({
      userId: 'system',
      chatId: 'system',
      prompt,
      systemPrompt: "You are an AI analyst. Extract product summary, features, and targetAudience in JSON format.",
      preferredProvider: 'openai',
      model: 'gpt-4o-mini',
      schema
    });
    return response.data;
  } catch (err) {
    console.error("AI analysis failed:", err);
    return { summary: "Analysis failed", features: [], targetAudience: [] };
  }
};
