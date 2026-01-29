import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitService } from './rate-limit.service';
import { RateLimitConfig } from './rate-limit.decorator';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let rateLimitService: jest.Mocked<RateLimitService>;
  let reflector: jest.Mocked<Reflector>;

  const mockRequest = {
    ip: '192.168.1.1',
    headers: {},
    socket: { remoteAddress: '192.168.1.1' },
    user: null,
  };

  const mockResponse = {
    setHeader: jest.fn(),
  };

  const createMockContext = (_config?: RateLimitConfig): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getHandler: () => ({ name: 'testHandler' }),
      getClass: () => ({ name: 'TestController' }),
    } as any;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        {
          provide: RateLimitService,
          useValue: {
            consume: jest.fn(),
            getUserKey: jest.fn(
              (userId, endpoint) => `user:${userId}:${endpoint}`,
            ),
            getIpKey: jest.fn((ip, endpoint) => `ip:${ip}:${endpoint}`),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    rateLimitService = module.get(RateLimitService);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow request when under limit', async () => {
      const context = createMockContext();

      reflector.getAllAndOverride.mockReturnValue({
        limit: 10,
        windowSeconds: 60,
        byIp: false,
      });

      rateLimitService.consume.mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        resetAt: Math.floor(Date.now() / 1000) + 60,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Limit',
        '10',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        '9',
      );
    });

    it('should deny request when limit exceeded', async () => {
      const context = createMockContext();
      const now = Math.floor(Date.now() / 1000);

      reflector.getAllAndOverride.mockReturnValue({
        limit: 10,
        windowSeconds: 60,
        byIp: false,
      });

      rateLimitService.consume.mockResolvedValue({
        allowed: false,
        limit: 10,
        remaining: 0,
        resetAt: now + 30,
      });

      await expect(guard.canActivate(context)).rejects.toMatchObject({
        response: {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          error: 'Too Many Requests',
          retryAfter: expect.any(Number),
        },
        status: HttpStatus.TOO_MANY_REQUESTS,
      });

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Retry-After',
        expect.any(String),
      );
    });

    it('should use default config when no decorator present', async () => {
      const context = createMockContext();

      reflector.getAllAndOverride.mockReturnValue(null);

      rateLimitService.consume.mockResolvedValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        resetAt: Math.floor(Date.now() / 1000) + 60,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rateLimitService.consume).toHaveBeenCalledWith(
        expect.any(String),
        100, // Default limit
        60, // Default window
      );
    });

    it('should skip rate limiting when config.skip is true', async () => {
      const context = createMockContext();

      reflector.getAllAndOverride.mockReturnValue({
        limit: 10,
        windowSeconds: 60,
        skip: true,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rateLimitService.consume).not.toHaveBeenCalled();
    });

    it('should use IP-based rate limiting when byIp is true', async () => {
      const context = createMockContext();

      reflector.getAllAndOverride.mockReturnValue({
        limit: 10,
        windowSeconds: 60,
        byIp: true,
      });

      rateLimitService.consume.mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        resetAt: Math.floor(Date.now() / 1000) + 60,
      });

      await guard.canActivate(context);

      expect(rateLimitService.getIpKey).toHaveBeenCalledWith(
        '192.168.1.1',
        expect.any(String),
      );
      expect(rateLimitService.getUserKey).not.toHaveBeenCalled();
    });

    it('should use user-based rate limiting when user is authenticated', async () => {
      const context = createMockContext();
      mockRequest.user = { id: 'user-123', phone: '+225123456789' };

      reflector.getAllAndOverride.mockReturnValue({
        limit: 10,
        windowSeconds: 60,
        byIp: false,
      });

      rateLimitService.consume.mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        resetAt: Math.floor(Date.now() / 1000) + 60,
      });

      await guard.canActivate(context);

      expect(rateLimitService.getUserKey).toHaveBeenCalledWith(
        'user-123',
        expect.any(String),
      );
    });

    it('should fall back to IP when user not authenticated', async () => {
      const context = createMockContext();
      mockRequest.user = null;

      reflector.getAllAndOverride.mockReturnValue({
        limit: 10,
        windowSeconds: 60,
        byIp: false,
      });

      rateLimitService.consume.mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        resetAt: Math.floor(Date.now() / 1000) + 60,
      });

      await guard.canActivate(context);

      expect(rateLimitService.getIpKey).toHaveBeenCalledWith(
        '192.168.1.1',
        expect.any(String),
      );
    });

    it('should extract IP from X-Forwarded-For header', async () => {
      const context = createMockContext();
      mockRequest.headers['x-forwarded-for'] = '203.0.113.1, 198.51.100.1';

      reflector.getAllAndOverride.mockReturnValue({
        limit: 10,
        windowSeconds: 60,
        byIp: true,
      });

      rateLimitService.consume.mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        resetAt: Math.floor(Date.now() / 1000) + 60,
      });

      await guard.canActivate(context);

      expect(rateLimitService.getIpKey).toHaveBeenCalledWith(
        '203.0.113.1',
        expect.any(String),
      );
    });

    it('should extract IP from X-Real-IP header', async () => {
      const context = createMockContext();
      mockRequest.headers['x-real-ip'] = '203.0.113.5';

      reflector.getAllAndOverride.mockReturnValue({
        limit: 10,
        windowSeconds: 60,
        byIp: true,
      });

      rateLimitService.consume.mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        resetAt: Math.floor(Date.now() / 1000) + 60,
      });

      await guard.canActivate(context);

      expect(rateLimitService.getIpKey).toHaveBeenCalledWith(
        '203.0.113.5',
        expect.any(String),
      );
    });

    it('should use custom keyPrefix when provided', async () => {
      const context = createMockContext();

      reflector.getAllAndOverride.mockReturnValue({
        limit: 5,
        windowSeconds: 300,
        keyPrefix: 'custom:endpoint',
      });

      rateLimitService.consume.mockResolvedValue({
        allowed: true,
        limit: 5,
        remaining: 4,
        resetAt: Math.floor(Date.now() / 1000) + 300,
      });

      await guard.canActivate(context);

      expect(rateLimitService.getIpKey).toHaveBeenCalledWith(
        expect.any(String),
        'custom:endpoint',
      );
    });

    it('should set all rate limit headers', async () => {
      const context = createMockContext();
      const now = Math.floor(Date.now() / 1000);

      reflector.getAllAndOverride.mockReturnValue({
        limit: 100,
        windowSeconds: 60,
      });

      rateLimitService.consume.mockResolvedValue({
        allowed: true,
        limit: 100,
        remaining: 75,
        resetAt: now + 60,
      });

      await guard.canActivate(context);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Limit',
        '100',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        '75',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        (now + 60).toString(),
      );
    });

    it('should handle unknown IP gracefully', async () => {
      const context = createMockContext();
      mockRequest.ip = undefined;
      mockRequest.socket.remoteAddress = undefined;

      reflector.getAllAndOverride.mockReturnValue({
        limit: 10,
        windowSeconds: 60,
        byIp: true,
      });

      rateLimitService.consume.mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        resetAt: Math.floor(Date.now() / 1000) + 60,
      });

      await guard.canActivate(context);

      expect(rateLimitService.getIpKey).toHaveBeenCalledWith(
        'unknown',
        expect.any(String),
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle resetAt in the past', async () => {
      const context = createMockContext();
      const now = Math.floor(Date.now() / 1000);

      reflector.getAllAndOverride.mockReturnValue({
        limit: 10,
        windowSeconds: 60,
      });

      rateLimitService.consume.mockResolvedValue({
        allowed: false,
        limit: 10,
        remaining: 0,
        resetAt: now - 10, // Already passed
      });

      await expect(guard.canActivate(context)).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });

      // Retry-After should be 0 or positive
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Retry-After',
        expect.stringMatching(/^\d+$/),
      );
    });

    it('should use endpoint key as default', async () => {
      const context = createMockContext();

      reflector.getAllAndOverride.mockReturnValue({
        limit: 10,
        windowSeconds: 60,
      });

      rateLimitService.consume.mockResolvedValue({
        allowed: true,
        limit: 10,
        remaining: 9,
        resetAt: Math.floor(Date.now() / 1000) + 60,
      });

      await guard.canActivate(context);

      expect(rateLimitService.getIpKey).toHaveBeenCalledWith(
        expect.any(String),
        'TestController:testHandler',
      );
    });
  });
});
