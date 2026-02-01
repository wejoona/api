import { Request } from 'express';
import {
  withCorrelationId,
  withCorrelationIdFromRequest,
  createCorrelatedHttpClient,
  extractCorrelationIdFromHeaders,
} from './http-client.helper';

describe('HTTP Client Helper', () => {
  const testCorrelationId = '550e8400-e29b-41d4-a716-446655440000';

  describe('withCorrelationId', () => {
    it('should add correlation ID to empty config', () => {
      const config = withCorrelationId(testCorrelationId);

      expect(config.headers).toEqual({
        'X-Correlation-ID': testCorrelationId,
      });
    });

    it('should merge correlation ID with existing headers', () => {
      const existingConfig = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        },
      };

      const config = withCorrelationId(testCorrelationId, existingConfig);

      expect(config.headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
        'X-Correlation-ID': testCorrelationId,
      });
    });

    it('should preserve other config properties', () => {
      const existingConfig = {
        timeout: 5000,
        baseURL: 'https://api.example.com',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const config = withCorrelationId(testCorrelationId, existingConfig);

      expect(config).toEqual({
        timeout: 5000,
        baseURL: 'https://api.example.com',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': testCorrelationId,
        },
      });
    });

    it('should override existing X-Correlation-ID', () => {
      const existingConfig = {
        headers: {
          'X-Correlation-ID': 'old-id',
        },
      };

      const config = withCorrelationId(testCorrelationId, existingConfig);

      expect(config.headers['X-Correlation-ID']).toBe(testCorrelationId);
    });
  });

  describe('withCorrelationIdFromRequest', () => {
    it('should extract correlation ID from request', () => {
      const mockRequest = {
        correlationId: testCorrelationId,
      } as Request;

      const config = withCorrelationIdFromRequest(mockRequest);

      expect(config.headers).toEqual({
        'X-Correlation-ID': testCorrelationId,
      });
    });

    it('should use "unknown" if request has no correlation ID', () => {
      const mockRequest = {} as Request;

      const config = withCorrelationIdFromRequest(mockRequest);

      expect(config.headers).toEqual({
        'X-Correlation-ID': 'unknown',
      });
    });

    it('should merge with existing config', () => {
      const mockRequest = {
        correlationId: testCorrelationId,
      } as Request;

      const existingConfig = {
        timeout: 10000,
        headers: {
          Authorization: 'Bearer token',
        },
      };

      const config = withCorrelationIdFromRequest(mockRequest, existingConfig);

      expect(config).toEqual({
        timeout: 10000,
        headers: {
          Authorization: 'Bearer token',
          'X-Correlation-ID': testCorrelationId,
        },
      });
    });
  });

  describe('createCorrelatedHttpClient', () => {
    it('should create axios instance with correlation ID interceptor', () => {
      const client = createCorrelatedHttpClient(testCorrelationId);

      expect(client).toBeDefined();
      expect(client.interceptors.request).toBeDefined();
    });

    it('should include correlation ID in request config', async () => {
      const client = createCorrelatedHttpClient(testCorrelationId, {
        baseURL: 'https://api.example.com',
      });

      // Get the interceptor handler that was added
      const handlers = (client.interceptors.request as any).handlers;
      expect(handlers).toBeDefined();
      expect(handlers.length).toBeGreaterThan(0);

      // Trigger the first interceptor (correlation ID interceptor)
      const config = { headers: {} } as any;
      if (handlers && handlers[0] && handlers[0].fulfilled) {
        const result = await handlers[0].fulfilled(config);
        expect(result.headers['X-Correlation-ID']).toBe(testCorrelationId);
      }
    });

    it('should preserve base URL in config', () => {
      const client = createCorrelatedHttpClient(testCorrelationId, {
        baseURL: 'https://api.example.com',
        timeout: 5000,
      });

      expect(client.defaults.baseURL).toBe('https://api.example.com');
      expect(client.defaults.timeout).toBe(5000);
    });
  });

  describe('extractCorrelationIdFromHeaders', () => {
    it('should extract x-correlation-id (lowercase)', () => {
      const headers = {
        'x-correlation-id': testCorrelationId,
      };

      const result = extractCorrelationIdFromHeaders(headers);

      expect(result).toBe(testCorrelationId);
    });

    it('should extract X-Correlation-ID (uppercase)', () => {
      const headers = {
        'X-Correlation-ID': testCorrelationId,
      };

      const result = extractCorrelationIdFromHeaders(headers);

      expect(result).toBe(testCorrelationId);
    });

    it('should extract x-request-id as fallback', () => {
      const headers = {
        'x-request-id': testCorrelationId,
      };

      const result = extractCorrelationIdFromHeaders(headers);

      expect(result).toBe(testCorrelationId);
    });

    it('should extract X-Request-ID (uppercase) as fallback', () => {
      const headers = {
        'X-Request-ID': testCorrelationId,
      };

      const result = extractCorrelationIdFromHeaders(headers);

      expect(result).toBe(testCorrelationId);
    });

    it('should prioritize x-correlation-id over x-request-id', () => {
      const headers = {
        'x-correlation-id': testCorrelationId,
        'x-request-id': 'different-id',
      };

      const result = extractCorrelationIdFromHeaders(headers);

      expect(result).toBe(testCorrelationId);
    });

    it('should return undefined if no correlation header exists', () => {
      const headers = {
        'content-type': 'application/json',
      };

      const result = extractCorrelationIdFromHeaders(headers);

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty headers', () => {
      const headers = {};

      const result = extractCorrelationIdFromHeaders(headers);

      expect(result).toBeUndefined();
    });
  });
});
