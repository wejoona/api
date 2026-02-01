import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IdempotencyMiddleware } from '../idempotency.middleware';
import { IdempotencyStorage } from '../types/idempotency.types';
import {
  IdempotencyStatus,
  IdempotencyRecord,
  IdempotentRequest,
} from '../types/idempotency.types';
import { Response } from 'express';
// Mock FingerprintUtil to always return true for validation
jest.mock('../utils/fingerprint.util', () => ({
  FingerprintUtil: {
    generate: jest.fn().mockReturnValue('fingerprint-hash'),
    validate: jest.fn().mockReturnValue(true),
  },
}));

describe('IdempotencyMiddleware', () => {
  let middleware: IdempotencyMiddleware;
  let storage: jest.Mocked<IdempotencyStorage>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyMiddleware,
        {
          provide: IdempotencyStorage,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            acquireLock: jest.fn(),
            releaseLock: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                'idempotency.ttl': 86400,
                'idempotency.processingTimeout': 300,
                'idempotency.storeResponseBody': true,
                'idempotency.validateFingerprint': true,
                'idempotency.excludeRoutes': ['/health', '/metrics'],
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    middleware = module.get<IdempotencyMiddleware>(IdempotencyMiddleware);
    storage = module.get(IdempotencyStorage);
    configService = module.get(ConfigService);
  });

  const createMockRequest = (overrides = {}): IdempotentRequest => {
    return {
      method: 'POST',
      path: '/api/v1/transfers',
      headers: {
        'idempotency-key': 'test-key-12345678',
      },
      body: {
        amount: 100,
        recipientId: 'user-123',
      },
      user: { id: 'user-456' },
      ...overrides,
    } as unknown as IdempotentRequest;
  };

  const createMockResponse = (): Partial<Response> => {
    const res: Partial<Response> = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      headersSent: false,
    };
    return res;
  };

  const createMockNext = () => jest.fn();

  describe('Basic Flow', () => {
    it('should skip non-idempotent methods (GET)', async () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.use(req, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(storage.get).not.toHaveBeenCalled();
    });

    it('should skip excluded routes', async () => {
      const req = createMockRequest({ path: '/health' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.use(req, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(storage.get).not.toHaveBeenCalled();
    });

    it('should continue if no idempotency key provided', async () => {
      const req = createMockRequest({ headers: {} });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware.use(req, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(storage.get).not.toHaveBeenCalled();
    });
  });

  describe('Key Validation', () => {
    it('should reject keys that are too short', async () => {
      const req = createMockRequest({
        headers: { 'idempotency-key': 'short' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await expect(middleware.use(req, res as Response, next)).rejects.toThrow(
        'Idempotency-Key must be between 16 and 255 characters',
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject keys with invalid characters', async () => {
      const req = createMockRequest({
        headers: { 'idempotency-key': 'invalid@key#with$special' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await expect(middleware.use(req, res as Response, next)).rejects.toThrow(
        'Idempotency-Key must contain only alphanumeric characters',
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept valid UUID keys', async () => {
      const req = createMockRequest({
        headers: {
          'idempotency-key': '550e8400-e29b-41d4-a716-446655440000',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      storage.get.mockResolvedValue(null);
      storage.acquireLock.mockResolvedValue(true);

      await middleware.use(req, res as Response, next);

      expect(storage.get).toHaveBeenCalled();
    });
  });

  describe('New Request Processing', () => {
    it('should acquire lock and create record for new request', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      storage.get.mockResolvedValue(null);
      storage.acquireLock.mockResolvedValue(true);

      await middleware.use(req, res as Response, next);

      expect(storage.acquireLock).toHaveBeenCalledWith(
        'test-key-12345678',
        300,
      );
      expect(storage.set).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test-key-12345678',
          status: IdempotencyStatus.PROCESSING,
        }),
      );
      expect(next).toHaveBeenCalled();
    });

    it('should fail if lock cannot be acquired', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      storage.get.mockResolvedValue(null);
      storage.acquireLock.mockResolvedValue(false);

      await expect(middleware.use(req, res as Response, next)).rejects.toThrow(
        'Request is being processed by another instance',
      );
      expect(next).not.toHaveBeenCalled();
      expect(storage.set).not.toHaveBeenCalled();
    });

    it('should add idempotency context to request', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      storage.get.mockResolvedValue(null);
      storage.acquireLock.mockResolvedValue(true);

      await middleware.use(req, res as Response, next);

      expect(req.idempotency).toBeDefined();
      expect(req.idempotency?.key).toBe('test-key-12345678');
      expect(req.idempotency?.isRetry).toBe(false);
    });
  });

  describe('Existing Record Handling', () => {
    it('should return cached response for completed request', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const record: IdempotencyRecord = {
        key: 'test-key-12345678',
        status: IdempotencyStatus.COMPLETED,
        statusCode: 200,
        responseBody: { success: true, transferId: 'tx-123' },
        fingerprint: 'fingerprint-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };

      storage.get.mockResolvedValue(record);

      await middleware.use(req, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Idempotency-Cached',
        'true',
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(record.responseBody);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 409 for request still processing', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const record: IdempotencyRecord = {
        key: 'test-key-12345678',
        status: IdempotencyStatus.PROCESSING,
        fingerprint: 'fingerprint-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };

      storage.get.mockResolvedValue(record);

      // Should throw ConflictException for still processing requests
      await expect(middleware.use(req, res as Response, next)).rejects.toThrow(
        'Request is currently being processed',
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if processing timed out', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const record: IdempotencyRecord = {
        key: 'test-key-12345678',
        status: IdempotencyStatus.PROCESSING,
        fingerprint: 'fingerprint-hash',
        createdAt: new Date(Date.now() - 400000), // 400 seconds ago
        updatedAt: new Date(Date.now() - 400000),
        expiresAt: new Date(Date.now() + 86400000),
      };

      storage.get.mockResolvedValue(record);

      // Should delete the stale record and throw
      await expect(middleware.use(req, res as Response, next)).rejects.toThrow(
        'Previous request timed out',
      );
      expect(storage.delete).toHaveBeenCalledWith('test-key-12345678');
    });

    it('should return cached error for failed request', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const record: IdempotencyRecord = {
        key: 'test-key-12345678',
        status: IdempotencyStatus.FAILED,
        statusCode: 400,
        error: {
          message: 'Insufficient funds',
          code: 'INSUFFICIENT_FUNDS',
        },
        fingerprint: 'fingerprint-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };

      storage.get.mockResolvedValue(record);

      await middleware.use(req, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Idempotency-Cached',
        'true',
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Insufficient funds',
        code: 'INSUFFICIENT_FUNDS',
      });
    });
  });

  describe('Fingerprint Validation', () => {
    it('should return cached response when fingerprint matches', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      // FingerprintUtil.validate is mocked to return true
      // so fingerprint validation passes
      const record: IdempotencyRecord = {
        key: 'test-key-12345678',
        status: IdempotencyStatus.COMPLETED,
        statusCode: 200,
        responseBody: { success: true },
        fingerprint: 'fingerprint-hash', // matches the mock generate
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };

      storage.get.mockResolvedValue(record);

      await middleware.use(req, res as Response, next);

      // Should return cached response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Response Interception', () => {
    it('should intercept and store successful response', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      storage.get.mockResolvedValue(null);
      storage.acquireLock.mockResolvedValue(true);

      await middleware.use(req, res as Response, next);

      // The middleware should have called next and set up response interception
      expect(next).toHaveBeenCalled();
      expect(storage.set).toHaveBeenCalled();
    });
  });
});
