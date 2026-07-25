export async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 8000,
    onRetry = null,
    context = 'operation',
  } = options;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn(attempt);
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        if (onRetry) onRetry(attempt, error, delay);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || `${context} failed after ${maxAttempts} attempts`,
    attempts: maxAttempts,
  };
}

export function buildRetryPrompt(basePrompt, attempt, errors) {
  if (attempt === 1) return basePrompt;

  const strategies = {
    2: `SIMPLIFIED REQUEST: Return ONLY valid JSON. No markdown, no code blocks, no explanation.\n\n${basePrompt}\n\nIMPORTANT: Respond with raw JSON only, no formatting.`,
    3: `CRITICAL: You MUST return valid JSON. Previous attempt failed with: ${errors.join('; ')}\n\nUse only these exact fields. Return ONLY the JSON object, nothing else.\n\n${basePrompt}`,
  };

  return strategies[attempt] || basePrompt;
}

export async function retryAiGeneration(fn, basePrompt, options = {}) {
  const { maxAttempts = 3, validateFn = null } = options;
  const errors = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const prompt = buildRetryPrompt(basePrompt, attempt, errors);
      const result = await fn(prompt);

      if (result?.success && result?.data) {
        if (validateFn) {
          const validation = validateFn(result.data);
          if (validation.valid) {
            return { success: true, data: result.data, provider: result.provider, attempts };
          }
          errors.push(`Validation failed: ${validation.errors?.join(', ')}`);
          continue;
        }
        return { success: true, data: result.data, provider: result.provider, attempts };
      }
      errors.push(result?.error || 'AI returned empty result');
    } catch (e) {
      errors.push(e.message);
    }
  }

  return {
    success: false,
    error: errors.join('; '),
    attempts: maxAttempts,
  };
}
