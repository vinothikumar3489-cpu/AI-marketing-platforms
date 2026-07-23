export const MODEL_COSTS = {
  'gpt-4o': { input: 5.0, output: 15.0 }, // per 1M tokens
  'gpt-4o-mini': { input: 0.150, output: 0.600 },
  'claude-3-5-sonnet-20240620': { input: 3.0, output: 15.0 },
  'gemini-1.5-pro': { input: 3.5, output: 10.5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.300 },
};

export async function trackAiUsage({ userId, chatId, provider, model, promptTokens, completionTokens }) {
  try {
    const costConfig = MODEL_COSTS[model] || { input: 0, output: 0 };
    const costUsd = (promptTokens / 1000000) * costConfig.input + (completionTokens / 1000000) * costConfig.output;

    console.log(`[AI Analytics] ${provider} | ${model} | Tokens: ${promptTokens + completionTokens} | Cost: $${costUsd.toFixed(6)}`);

    // In the future, this can be inserted into an AiUsage logs table.
    return costUsd;
  } catch (error) {
    console.error('Failed to track AI usage:', error);
    return 0;
  }
}
