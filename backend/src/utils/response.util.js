/**
 * Centralized API Response Utilities
 * Ensures consistent response structure across all endpoints
 */

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
  };
  
  return res.status(statusCode).json(response);
}

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {Object} details - Additional error details (only in development)
 */
export function errorResponse(res, error, statusCode = 500, details = null) {
  const isDev = process.env.NODE_ENV === 'development';
  
  const response = {
    success: false,
    error: error || 'An error occurred',
    ...(isDev && details && { details }),
  };
  
  // Log error server-side with full context
  console.error(`❌ API Error [${statusCode}]:`, {
    error,
    details,
    timestamp: new Date().toISOString(),
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
    validationErrors,
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
      errorResponse(res, error.message || 'Internal server error', error.status || 500, {
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
    
    return { success: false, error: error.message };
  }
}
