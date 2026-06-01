import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LogoutAllUsecase } from './logout-all.usecase';
import {
  createMockJwtService,
  createMockConfigService,
  createMockRedisClient,
  MockRedisClient,
} from '../../../../../test/helpers/test-utils';

// Mock ioredis with proper default export
jest.mock('ioredis', () => {
  const mockRedis = jest.fn().mockImplementation(() => createMockRedisClient());
  return { default: mockRedis, __esModule: true };
});

describe('LogoutAllUsecase', () => {
  let usecase: LogoutAllUsecase;
  let jwtService: ReturnType<typeof createMockJwtService>;
  let configService: ReturnType<typeof createMockConfigService>;
  let mockRedisClient: MockRedisClient;
  let eventEmitter: { emit: jest.Mock };

  const mockUserId = 'user-123';
  const mockRefreshToken = 'valid.refresh.token';

  beforeEach(async () => {
    jwtService = createMockJwtService();
    configService = createMockConfigService({
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.refreshExpiresIn': '7d',
    });
    mockRedisClient = createMockRedisClient();
    eventEmitter = { emit: jest.fn() };

    // Mock Redis constructor
    const Redis = require('ioredis').default;
    Redis.mockImplementation(() => {
      setTimeout(() => {
        const connectHandler = mockRedisClient.on.mock.calls.find(
          ([event]) => event === 'connect',
        );
        if (connectHandler && connectHandler[1]) {
          connectHandler[1]();
        }
      }, 0);
      return mockRedisClient;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutAllUsecase,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    usecase = module.get<LogoutAllUsecase>(LogoutAllUsecase);

    // Manually set connected state for tests
    (usecase as any).isRedisConnected = true;
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await usecase.onModuleDestroy();
  });

  describe('execute', () => {
    it('should successfully invalidate all tokens for a user', async () => {
      const result = await usecase.execute({
        userId: mockUserId,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('All devices logged out successfully');
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `user:${mockUserId}:token_invalidation`,
        expect.any(Number),
        expect.any(String),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('user.logged_out_all', {
        userId: mockUserId,
        timestamp: expect.any(Date),
      });
    });

    it('should preserve current session when currentRefreshToken is provided', async () => {
      jwtService.verify.mockReturnValue({
        sub: mockUserId,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      });

      const result = await usecase.execute({
        userId: mockUserId,
        currentRefreshToken: mockRefreshToken,
      });

      expect(result.success).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith(mockRefreshToken, {
        secret: 'test-refresh-secret',
      });
      expect(mockRedisClient.sadd).toHaveBeenCalledWith(
        `user:${mockUserId}:whitelisted_tokens`,
        mockRefreshToken,
      );
      expect(mockRedisClient.expire).toHaveBeenCalled();
    });

    it('should not fail if current token preservation fails', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await usecase.execute({
        userId: mockUserId,
        currentRefreshToken: 'invalid.token',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('All devices logged out successfully');
    });

    it('should not whitelist token if it belongs to different user', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'different-user-id',
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      });

      const result = await usecase.execute({
        userId: mockUserId,
        currentRefreshToken: mockRefreshToken,
      });

      expect(result.success).toBe(true);
      expect(mockRedisClient.sadd).not.toHaveBeenCalled();
    });

    it('should calculate correct TTL from duration string (7d)', async () => {
      const result = await usecase.execute({
        userId: mockUserId,
      });

      expect(result.success).toBe(true);
      // 7d = 7 * 24 * 60 * 60 = 604800 seconds
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.any(String),
        604800,
        expect.any(String),
      );
    });

    it('should throw error when Redis connection is unavailable', async () => {
      // Manually set disconnected state
      (usecase as any).isRedisConnected = false;

      await expect(usecase.execute({ userId: mockUserId })).rejects.toThrow(
        'Redis connection unavailable',
      );
    });
  });

  describe('isTokenInvalidated', () => {
    it('should return false when no global invalidation exists', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      jwtService.decode.mockReturnValue({
        iat: Math.floor(Date.now() / 1000),
        sub: mockUserId,
      });

      const result = await usecase.isTokenInvalidated(
        mockUserId,
        mockRefreshToken,
      );

      expect(result).toBe(false);
    });

    it('should return false when token is whitelisted', async () => {
      const invalidationTimestamp = Date.now().toString();
      mockRedisClient.get.mockResolvedValue(invalidationTimestamp);
      mockRedisClient.sismember.mockResolvedValue(1);

      const result = await usecase.isTokenInvalidated(
        mockUserId,
        mockRefreshToken,
      );

      expect(result).toBe(false);
    });

    it('should return true when token was issued before invalidation', async () => {
      const now = Date.now();
      const tokenIssuedAt = Math.floor((now - 10000) / 1000); // 10 seconds ago
      const invalidationTimestamp = now.toString();

      mockRedisClient.get.mockResolvedValue(invalidationTimestamp);
      mockRedisClient.sismember.mockResolvedValue(0);
      jwtService.decode.mockReturnValue({
        iat: tokenIssuedAt,
        sub: mockUserId,
      });

      const result = await usecase.isTokenInvalidated(
        mockUserId,
        mockRefreshToken,
      );

      expect(result).toBe(true);
    });

    it('should return false when token was issued after invalidation', async () => {
      const now = Date.now();
      const tokenIssuedAt = Math.floor((now + 10000) / 1000); // 10 seconds in future
      const invalidationTimestamp = now.toString();

      mockRedisClient.get.mockResolvedValue(invalidationTimestamp);
      mockRedisClient.sismember.mockResolvedValue(0);
      jwtService.decode.mockReturnValue({
        iat: tokenIssuedAt,
        sub: mockUserId,
      });

      const result = await usecase.isTokenInvalidated(
        mockUserId,
        mockRefreshToken,
      );

      expect(result).toBe(false);
    });

    it('should return true when token format is invalid', async () => {
      const invalidationTimestamp = Date.now().toString();
      mockRedisClient.get.mockResolvedValue(invalidationTimestamp);
      mockRedisClient.sismember.mockResolvedValue(0);
      jwtService.decode.mockReturnValue(null);

      const result = await usecase.isTokenInvalidated(
        mockUserId,
        mockRefreshToken,
      );

      expect(result).toBe(true);
    });

    it('should return false on error (fail safe)', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await usecase.isTokenInvalidated(
        mockUserId,
        mockRefreshToken,
      );

      expect(result).toBe(false);
    });
  });
});
