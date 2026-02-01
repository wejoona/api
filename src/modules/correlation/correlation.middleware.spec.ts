import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { CorrelationIdMiddleware } from './correlation.middleware';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CorrelationIdMiddleware],
    }).compile();

    middleware = module.get<CorrelationIdMiddleware>(CorrelationIdMiddleware);

    mockRequest = {
      headers: {},
      method: 'GET',
      path: '/test',
      url: '/test',
      ip: '127.0.0.1',
    };

    mockResponse = {
      setHeader: jest.fn(),
      json: jest.fn(),
    };

    nextFunction = jest.fn();
  });

  describe('Correlation ID Generation', () => {
    it('should generate a new correlation ID if none provided', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest['correlationId']).toBeDefined();
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Correlation-ID',
        mockRequest['correlationId'],
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should generate a valid UUID v4', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      const correlationId = mockRequest['correlationId'];
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(correlationId).toMatch(uuidPattern);
    });
  });

  describe('Correlation ID Propagation', () => {
    it('should use existing X-Correlation-ID from request header', () => {
      const existingId = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.headers = {
        'x-correlation-id': existingId,
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest['correlationId']).toBe(existingId);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Correlation-ID',
        existingId,
      );
    });

    it('should accept X-Request-ID as fallback', () => {
      const existingId = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.headers = {
        'x-request-id': existingId,
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest['correlationId']).toBe(existingId);
    });

    it('should handle case-insensitive header names', () => {
      const existingId = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.headers = {
        'X-Correlation-ID': existingId,
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest['correlationId']).toBe(existingId);
    });
  });

  describe('Correlation ID Validation', () => {
    it('should accept valid UUID v4', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.headers = {
        'x-correlation-id': validUUID,
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest['correlationId']).toBe(validUUID);
    });

    it('should accept alphanumeric strings with hyphens and underscores', () => {
      const validId = 'mobile-app-12345_request';
      mockRequest.headers = {
        'x-correlation-id': validId,
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest['correlationId']).toBe(validId);
    });

    it('should reject invalid correlation ID and generate new one', () => {
      const invalidId = '<script>alert("xss")</script>';
      mockRequest.headers = {
        'x-correlation-id': invalidId,
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest['correlationId']).not.toBe(invalidId);
      expect(mockRequest['correlationId']).toBeDefined();
    });

    it('should reject correlation ID longer than 255 characters', () => {
      const longId = 'a'.repeat(256);
      mockRequest.headers = {
        'x-correlation-id': longId,
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest['correlationId']).not.toBe(longId);
    });

    it('should reject empty correlation ID', () => {
      mockRequest.headers = {
        'x-correlation-id': '',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest['correlationId']).not.toBe('');
      expect(mockRequest['correlationId']).toBeDefined();
    });
  });

  describe('Response Headers', () => {
    it('should add correlation ID to response headers', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Correlation-ID',
        expect.any(String),
      );
    });

    it('should use same correlation ID in request and response', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      const requestId = mockRequest['correlationId'];
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Correlation-ID',
        requestId,
      );
    });
  });

  describe('Next Function', () => {
    it('should call next() to continue middleware chain', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should call next() with no arguments', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalledWith();
    });
  });
});
