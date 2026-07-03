import { callAI } from "../ai/services/aiRouter.service.js";

export async function callLLMWithFallbacks(prompt, fallbackGenerator, fallbackArgs = []) {
  const errors = [];

  const result = await callAI(prompt);
  if (result.success) {
    return { ...result.data, provider: result.provider };
  }

  errors.push("All AI providers failed (Gemini, Groq, OpenAI)");
  console.log("🛡️ [AI Orchestrator] All AI providers failed. Using local fallback generator.");
  if (typeof fallbackGenerator === "function") {
    const fallbackData = fallbackGenerator(...fallbackArgs);
    fallbackData.provider = "fallback";
    fallbackData.errors = errors;
    return fallbackData;
  }

  throw new Error(`All LLM providers failed and no valid fallback was provided. Errors: ${errors.join(", ")}`);
}
