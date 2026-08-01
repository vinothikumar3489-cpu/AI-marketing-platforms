export type ErrorType = 
  | 'validation_failure'
  | 'missing_evidence'
  | 'provider_unavailable'
  | 'rate_limit'
  | 'quota_exceeded'
  | 'authentication_failure'
  | 'internal_error'
  | 'network_error'
  | 'unknown';

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  userMessage: string;
  retryable: boolean;
  code?: string;
  details?: any;
}

export function getApiErrorMessage(error: unknown): string {
  const errorInfo = getErrorInfo(error);
  return errorInfo.userMessage;
}

export function getErrorInfo(error: unknown): ErrorInfo {
  if (typeof error === 'string') {
    return {
      type: 'unknown',
      message: error,
      userMessage: error,
      retryable: false,
    };
  }

  // Handle our custom ApiError (used by fetch-based api client)
  if (
    error &&
    typeof error === 'object' &&
    'data' in error &&
    'status' in error
  ) {
    const apiErr = error as { data: any; message: any; status: number };
    const data = apiErr.data;

    // Backend error object: { code, message, missing, retryable }
    if (data?.error) {
      if (typeof data.error === 'string') {
        return classifyError(data.error, apiErr.status);
      }
      if (typeof data.error?.message === 'string') {
        return classifyError(data.error.message, apiErr.status, data.error.code);
      }
    }
    if (data?.message && typeof data.message === 'string') {
      return classifyError(data.message, apiErr.status, data.code);
    }
    if (typeof apiErr.message === 'string') {
      return classifyError(apiErr.message, apiErr.status);
    }
    if (typeof apiErr.message === 'object' && apiErr.message?.message) {
      return classifyError(apiErr.message.message, apiErr.status, apiErr.message.code);
    }
  }

  // Handle AxiosError (legacy)
  const axiosError = error as any;
  if (axiosError?.isAxiosError || axiosError?.response?.data) {
    const responseData = axiosError.response?.data;
    const backendError =
      responseData?.error ??
      responseData?.message;

    if (typeof backendError === 'string') {
      return classifyError(backendError, axiosError.response?.status);
    }
    if (backendError && typeof backendError === 'object' && typeof backendError.message === 'string') {
      return classifyError(backendError.message, axiosError.response?.status, backendError.code);
    }
  }

  if (error instanceof Error) {
    return classifyError(error.message, 500);
  }

  try {
    const s = String(error);
    if (s && s !== '[object Object]') {
      return classifyError(s, 500);
    }
  } catch {}

  return {
    type: 'unknown',
    message: 'An unexpected error occurred.',
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: true,
  };
}

function classifyError(message: string, status?: number, code?: string): ErrorInfo {
  const lowerMessage = message.toLowerCase();
  const lowerCode = code?.toLowerCase() || '';

  // Provider unavailable / all providers failed
  if (lowerMessage.includes('all ai providers') || lowerMessage.includes('no ai providers') || lowerCode.includes('all_ai_providers')) {
    return {
      type: 'provider_unavailable',
      message,
      userMessage: 'AI generation temporarily unavailable. All AI providers are currently unavailable. Please try again in a few minutes.',
      retryable: true,
      code,
    };
  }

  // Rate limit
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('429') || lowerCode.includes('rate_limit')) {
    return {
      type: 'rate_limit',
      message,
      userMessage: 'Rate limit exceeded. Please wait a moment before trying again.',
      retryable: true,
      code,
    };
  }

  // Quota exceeded
  if (lowerMessage.includes('quota') || lowerMessage.includes('limit exceeded') || lowerCode.includes('quota_exceeded')) {
    return {
      type: 'quota_exceeded',
      message,
      userMessage: 'Daily quota exceeded. Please try again tomorrow or upgrade your plan.',
      retryable: false,
      code,
    };
  }

  // Authentication failure
  if (status === 401 || lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication') || lowerCode.includes('auth')) {
    return {
      type: 'authentication_failure',
      message,
      userMessage: 'Authentication failed. Please log in again.',
      retryable: false,
      code,
    };
  }

  // Validation failure
  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid') || lowerCode.includes('validation')) {
    return {
      type: 'validation_failure',
      message,
      userMessage: 'Invalid input. Please check your data and try again.',
      retryable: false,
      code,
    };
  }

  // Missing evidence / prerequisites
  if (lowerMessage.includes('missing') || lowerMessage.includes('required') || lowerMessage.includes('evidence') || lowerCode.includes('missing_evidence')) {
    return {
      type: 'missing_evidence',
      message,
      userMessage: 'Required information is missing. Please complete the analysis first.',
      retryable: false,
      code,
    };
  }

  // Network error
  if (status === 502 || status === 503 || status === 504 || lowerMessage.includes('network') || lowerMessage.includes('unreachable')) {
    return {
      type: 'network_error',
      message,
      userMessage: 'Network error. Please check your connection and try again.',
      retryable: true,
      code,
    };
  }

  // Internal server error
  if (status === 500 || lowerMessage.includes('internal') || lowerCode.includes('internal')) {
    return {
      type: 'internal_error',
      message,
      userMessage: 'Server error. Our team has been notified. Please try again.',
      retryable: true,
      code,
    };
  }

  // Default
  return {
    type: 'unknown',
    message,
    userMessage: message || 'An unexpected error occurred. Please try again.',
    retryable: true,
    code,
  };
}

export function getApiErrorCode(error: unknown): string | null {
  const data = (error as any)?.data || (error as any)?.response?.data;
  if (data?.error?.code) return data.error.code;
  if (data?.code) return data.code;
  return null;
}

export function getApiMissingRequirements(error: unknown): string[] {
  const data = (error as any)?.data || (error as any)?.response?.data;
  if (data?.error?.missing && Array.isArray(data.error.missing)) return data.error.missing;
  if (data?.missing && Array.isArray(data.missing)) return data.missing;
  return [];
}
