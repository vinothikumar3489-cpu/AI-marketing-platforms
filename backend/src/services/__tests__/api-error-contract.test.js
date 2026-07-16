/**
 * Tests for API Error Contract (Phase 23)
 * Validates standardized error responses and error codes
 */

import { 
  ErrorCodes,
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  invalidProductIdentityResponse,
  aiProviderErrorResponse
} from '../../utils/response.util.js';

// Mock Express response object
const mockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return res;
};

describe('API Error Contract', () => {
  describe('ErrorCodes', () => {
    it('should have all required error codes', () => {
      expect(ErrorCodes.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
      expect(ErrorCodes.MISSING_REQUIRED_FIELD).toBe('MISSING_REQUIRED_FIELD');
      expect(ErrorCodes.INVALID_INPUT).toBe('INVALID_INPUT');
      expect(ErrorCodes.INVALID_PRODUCT_IDENTITY).toBe('INVALID_PRODUCT_IDENTITY');
      expect(ErrorCodes.UNSUPPORTED_FORMAT).toBe('UNSUPPORTED_FORMAT');
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCodes.RESOURCE_NOT_FOUND).toBe('RESOURCE_NOT_FOUND');
      expect(ErrorCodes.CHAT_NOT_FOUND).toBe('CHAT_NOT_FOUND');
      expect(ErrorCodes.INTERNAL_SERVER_ERROR).toBe('INTERNAL_SERVER_ERROR');
      expect(ErrorCodes.AI_PROVIDER_ERROR).toBe('AI_PROVIDER_ERROR');
      expect(ErrorCodes.DATABASE_ERROR).toBe('DATABASE_ERROR');
    });
  });

  describe('successResponse', () => {
    it('should return success response with data', () => {
      const res = mockRes();
      const data = { test: 'value' };
      
      successResponse(res, data);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
        timestamp: expect.any(String)
      });
    });

    it('should return success response with message', () => {
      const res = mockRes();
      const data = { test: 'value' };
      const message = 'Success message';
      
      successResponse(res, data, message);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message,
        data,
        timestamp: expect.any(String)
      });
    });

    it('should return success response with custom status code', () => {
      const res = mockRes();
      const data = { test: 'value' };
      
      successResponse(res, data, null, 201);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
        timestamp: expect.any(String)
      });
    });
  });

  describe('errorResponse', () => {
    it('should return error response with default code', () => {
      const res = mockRes();
      const error = 'Test error';
      
      errorResponse(res, error);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error,
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String)
      });
    });

    it('should return error response with custom code', () => {
      const res = mockRes();
      const error = 'Test error';
      const code = ErrorCodes.VALIDATION_FAILED;
      
      errorResponse(res, error, code, 400);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error,
        code,
        timestamp: expect.any(String)
      });
    });

    it('should include details in development mode', () => {
      const res = mockRes();
      const error = 'Test error';
      const details = { field: 'test' };
      
      // Mock NODE_ENV
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      errorResponse(res, error, ErrorCodes.INTERNAL_SERVER_ERROR, 500, details);
      
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error,
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        details,
        timestamp: expect.any(String)
      });
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('validationErrorResponse', () => {
    it('should return validation error response', () => {
      const res = mockRes();
      const validationErrors = [{ field: 'email', message: 'Invalid email' }];
      
      validationErrorResponse(res, validationErrors);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        code: ErrorCodes.VALIDATION_FAILED,
        validationErrors,
        timestamp: expect.any(String)
      });
    });
  });

  describe('notFoundResponse', () => {
    it('should return not found response', () => {
      const res = mockRes();
      const resource = 'Chat';
      
      notFoundResponse(res, resource);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Chat not found',
        code: ErrorCodes.RESOURCE_NOT_FOUND,
        timestamp: expect.any(String)
      });
    });
  });

  describe('unauthorizedResponse', () => {
    it('should return unauthorized response', () => {
      const res = mockRes();
      
      unauthorizedResponse(res);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        code: ErrorCodes.UNAUTHORIZED,
        timestamp: expect.any(String)
      });
    });

    it('should return unauthorized response with custom message', () => {
      const res = mockRes();
      const message = 'Custom unauthorized message';
      
      unauthorizedResponse(res, message);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: message,
        code: ErrorCodes.UNAUTHORIZED,
        timestamp: expect.any(String)
      });
    });
  });

  describe('forbiddenResponse', () => {
    it('should return forbidden response', () => {
      const res = mockRes();
      
      forbiddenResponse(res);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
        code: ErrorCodes.FORBIDDEN,
        timestamp: expect.any(String)
      });
    });
  });

  describe('invalidProductIdentityResponse', () => {
    it('should return invalid product identity response', () => {
      const res = mockRes();
      const productName = 'Invalid Product';
      
      invalidProductIdentityResponse(res, productName);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: `Invalid product identity: "${productName}" — requires verified product`,
        code: ErrorCodes.INVALID_PRODUCT_IDENTITY,
        timestamp: expect.any(String)
      });
    });

    it('should return invalid product identity response with default name', () => {
      const res = mockRes();
      
      invalidProductIdentityResponse(res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid product identity: "none" — requires verified product',
        code: ErrorCodes.INVALID_PRODUCT_IDENTITY,
        timestamp: expect.any(String)
      });
    });
  });

  describe('aiProviderErrorResponse', () => {
    it('should return AI provider error response', () => {
      const res = mockRes();
      const provider = 'OpenAI';
      
      aiProviderErrorResponse(res, provider);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: `${provider} request failed`,
        code: ErrorCodes.AI_PROVIDER_ERROR,
        timestamp: expect.any(String)
      });
    });

    it('should include details in development mode', () => {
      const res = mockRes();
      const provider = 'OpenAI';
      const details = { error: 'Rate limit exceeded' };
      
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      aiProviderErrorResponse(res, provider, details);
      
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: `${provider} request failed`,
        code: ErrorCodes.AI_PROVIDER_ERROR,
        details,
        timestamp: expect.any(String)
      });
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Response Structure Consistency', () => {
    it('should always include timestamp in responses', () => {
      const res = mockRes();
      
      successResponse(res, { data: 'test' });
      const successCall = res.json.mock.calls[0][0];
      expect(successCall.timestamp).toBeDefined();
      expect(typeof successCall.timestamp).toBe('string');
      
      res.status.mockClear();
      res.json.mockClear();
      
      errorResponse(res, 'Test error');
      const errorCall = res.json.mock.calls[0][0];
      expect(errorCall.timestamp).toBeDefined();
      expect(typeof errorCall.timestamp).toBe('string');
    });

    it('should always include success boolean in responses', () => {
      const res = mockRes();
      
      successResponse(res, { data: 'test' });
      const successCall = res.json.mock.calls[0][0];
      expect(successCall.success).toBe(true);
      
      res.status.mockClear();
      res.json.mockClear();
      
      errorResponse(res, 'Test error');
      const errorCall = res.json.mock.calls[0][0];
      expect(errorCall.success).toBe(false);
    });
  });
});
