/**
 * Centralized API Response Utilities
 * Ensures consistent response structure across all endpoints
 * Phase 23: API Error Contract
 */

/**
 * Standard error codes for consistent error handling
 */
export const ErrorCodes = {
  // Validation errors (400)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_PRODUCT_IDENTITY: 'INVALID_PRODUCT_IDENTITY',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CHAT_NOT_FOUND: 'CHAT_NOT_FOUND',
  
  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (500)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // Service unavailable (503)
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
};

/**
 * Success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Optional success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export function successResponse(res, data, message = null, statusCode = 200) {
  const response = {
    success: true,
    ...(message && { message }),
    data,
    timestamp: new Date().toISOString(),
  };
  
  return res.status(statusCode).json(response);
}

/**
 * Error response with standardized error contract
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 * @param {string} code - Error code from ErrorCodes
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {Object} details - Additional error details (only in development)
 */
export function errorResponse(res, error, code = ErrorCodes.INTERNAL_SERVER_ERROR, statusCode = 500, details = null) {
  const isDev = process.env.NODE_ENV === 'development';
  
  const response = {
    success: false,
    error: error || 'An error occurred',
    code,
    ...(isDev && details && { details }),
    timestamp: new Date().toISOString(),
  };
  
  // Log error server-side with full context
  console.error(`❌ API Error [${code} - ${statusCode}]:`, {
    error,
    code,
    details,
    timestamp: response.timestamp,
  });
  
  return res.status(statusCode).json(response);
}

/**
 * Validation error response
 * @param {Object} res - Express response object
 * @param {Array|Object} validationErrors - Validation error details
 */
export function validationErrorResponse(res, validationErrors) {
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    code: ErrorCodes.VALIDATION_FAILED,
    validationErrors,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Not found response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name that was not found
 */
export function notFoundResponse(res, resource = 'Resource') {
  return res.status(404).json({
    success: false,
    error: `${resource} not found`,
    code: ErrorCodes.RESOURCE_NOT_FOUND,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Optional custom message
 */
export function unauthorizedResponse(res, message = 'Unauthorized') {
  return res.status(401).json({
    success: false,
    error: message,
    code: ErrorCodes.UNAUTHORIZED,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Optional custom message
 */
export function forbiddenResponse(res, message = 'Forbidden') {
  return res.status(403).json({
    success: false,
    error: message,
    code: ErrorCodes.FORBIDDEN,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Invalid product identity response (Phase 18/19)
 * @param {Object} res - Express response object
 * @param {string} productName - The invalid product name
 */
export function invalidProductIdentityResponse(res, productName = 'none') {
  return res.status(400).json({
    success: false,
    error: `Invalid product identity: "${productName}" — requires verified product`,
    code: ErrorCodes.INVALID_PRODUCT_IDENTITY,
    timestamp: new Date().toISOString(),
  });
}

/**
 * AI provider error response
 * @param {Object} res - Express response object
 * @param {string} provider - AI provider name
 * @param {string} details - Error details
 */
export function aiProviderErrorResponse(res, provider = 'AI Provider', details = null) {
  return res.status(500).json({
    success: false,
    error: `${provider} request failed`,
    code: ErrorCodes.AI_PROVIDER_ERROR,
    ...(process.env.NODE_ENV === 'development' && details && { details }),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * @param {Function} fn - Async route handler function
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('❌ Async handler error:', error);
      errorResponse(res, error.message || 'Internal server error', ErrorCodes.INTERNAL_SERVER_ERROR, error.status || 500, {
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    });
  };
}

/**
 * Safe AI call wrapper with timeout and error handling
 * @param {Function} aiFunction - AI API call function
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {*} fallbackData - Fallback data if AI fails
 */
export async function safeAICall(aiFunction, timeoutMs = 30000, fallbackData = null) {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI request timeout')), timeoutMs);
    });
    
    const result = await Promise.race([aiFunction(), timeoutPromise]);
    return { success: true, data: result, source: 'ai' };
  } catch (error) {
    console.error('❌ AI call failed:', error.message);
    
    if (fallbackData) {
      return { success: true, data: fallbackData, source: 'fallback', warning: error.message };
    }
    
    return { success: false, error: error.message, code: ErrorCodes.AI_PROVIDER_ERROR };
  }
}
