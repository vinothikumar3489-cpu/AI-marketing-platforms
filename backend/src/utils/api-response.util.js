/**
 * Unified API Response Standard
 * 
 * Every endpoint MUST return this standardized response format:
 * 
 * Success Response:
 * {
 *   success: true,
 *   data: any,
 *   meta: {
 *     timestamp: string,
 *     requestId?: string,
 *     version?: string
 *   },
 *   errors: null,
 *   warnings?: string[]
 * }
 * 
 * Error Response:
 * {
 *   success: false,
 *   data: null,
 *   meta: {
 *     timestamp: string,
 *     requestId?: string,
 *     version?: string
 *   },
 *   errors: {
 *     code: string,
 *     message: string,
 *     retryable: boolean,
 *     stage?: string,
 *     details?: any
 *   },
 *   warnings?: string[]
 * }
 */

export function successResponse(data, meta = {}, warnings = []) {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    },
    errors: null,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

export function errorResponse(code, message, retryable = false, stage = 'UNKNOWN', details = null, meta = {}, warnings = []) {
  return {
    success: false,
    data: null,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    },
    errors: {
      code,
      message,
      retryable,
      stage,
      details
    },
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

export function validationErrorResponse(validationErrors, meta = {}) {
  return errorResponse(
    'VALIDATION_FAILED',
    'Request validation failed',
    false,
    'VALIDATION',
    validationErrors,
    meta
  );
}

export function notFoundErrorResponse(resource, meta = {}) {
  return errorResponse(
    'NOT_FOUND',
    `${resource} not found`,
    false,
    'RESOURCE_LOOKUP',
    null,
    meta
  );
}

export function unauthorizedErrorResponse(meta = {}) {
  return errorResponse(
    'UNAUTHORIZED',
    'Authentication required',
    false,
    'AUTHENTICATION',
    null,
    meta
  );
}

export function forbiddenErrorResponse(meta = {}) {
  return errorResponse(
    'FORBIDDEN',
    'Access denied',
    false,
    'AUTHORIZATION',
    null,
    meta
  );
}

export function internalErrorResponse(message, details = null, meta = {}) {
  return errorResponse(
    'INTERNAL_ERROR',
    message || 'An internal error occurred',
    true,
    'UNKNOWN',
    details,
    meta
  );
}

export function serviceUnavailableErrorResponse(service, meta = {}) {
  return errorResponse(
    'SERVICE_UNAVAILABLE',
    `${service} service is currently unavailable`,
    true,
    'EXTERNAL_SERVICE',
    null,
    meta
  );
}

export function rateLimitErrorResponse(retryAfter, meta = {}) {
  return errorResponse(
    'RATE_LIMITED',
    'Too many requests',
    true,
    'RATE_LIMIT',
    { retryAfter },
    meta
  );
}

export function aiProviderErrorResponse(provider, details = null, meta = {}) {
  return errorResponse(
    'AI_PROVIDER_UNAVAILABLE',
    `AI provider ${provider} is unavailable`,
    true,
    'AI_ORCHESTRATION',
    details,
    meta
  );
}

export function prerequisiteErrorResponse(missing, reason = 'Complete prerequisite analysis first', meta = {}) {
  return errorResponse(
    'PREREQUISITE_MISSING',
    reason,
    false,
    'PREREQUISITE_CHECK',
    { missing },
    meta
  );
}

export function persistenceErrorResponse(operation, details = null, meta = {}) {
  return errorResponse(
    'PERSISTENCE_FAILED',
    `Failed to ${operation} data`,
    true,
    'PERSISTENCE',
    details,
    meta
  );
}
