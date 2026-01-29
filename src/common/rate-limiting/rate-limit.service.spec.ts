import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RateLimitService } from './rate-limit.service';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let cache: jest.Mocked<Cache>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
    cache = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('consume', () => {
    it('should allow request when under limit', async () => {
      const key = 'user-123';
      const limit = 10;
      const windowSeconds = 60;

      cache.get.mockResolvedValue(null);

      const result = await service.consume(key, limit, windowSeconds);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
      expect(result.resetAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(cache.set).toHaveBeenCalledWith(
        'rate_limit:user-123',
        { count: 1, resetAt: expect.any(Number) },
        windowSeconds * 1000,
      );
    });

    it('should track multiple requests correctly', async () => {
      const key = 'user-123';
      const limit = 5;
      const windowSeconds = 60;
      const now = Math.floor(Date.now() / 1000);
      const resetAt = now + windowSeconds;

      // First request - count is 0
      cache.get.mockResolvedValue(null);
      const result1 = await service.consume(key, limit, windowSeconds);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(4);

      // Second request - count is 1
      cache.get.mockResolvedValue({ count: 1, resetAt });
      const result2 = await service.consume(key, limit, windowSeconds);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(3);

      // Third request - count is 2
      cache.get.mockResolvedValue({ count: 2, resetAt });
      const result3 = await service.consume(key, limit, windowSeconds);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(2);
    });

    it('should deny request when limit exceeded', async () => {
      const key = 'user-123';
      const limit = 5;
      const windowSeconds = 60;
      const now = Math.floor(Date.now() / 1000);
      const resetAt = now + windowSeconds;

      // Simulate 5 requests already made
      cache.get.mockResolvedValue({ count: 5, resetAt });

      const result = await service.consume(key, limit, windowSeconds);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.resetAt).toBe(resetAt);
      expect(cache.set).not.toHaveBeenCalled(); // Should not increment when denied
    });

    it('should reset count when window expires', async () => {
      const key = 'user-123';
      const limit = 5;
      const windowSeconds = 60;
      const now = Math.floor(Date.now() / 1000);
      const expiredResetAt = now - 10; // Window expired 10 seconds ago

      // Simulate expired window
      cache.get.mockResolvedValue({ count: 5, resetAt: expiredResetAt });

      const result = await service.consume(key, limit, windowSeconds);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // Fresh window
      expect(cache.set).toHaveBeenCalledWith(
        'rate_limit:user-123',
        { count: 1, resetAt: expect.any(Number) },
        windowSeconds * 1000,
      );
    });

    it('should allow request on cache error (fail-open)', async () => {
      const key = 'user-123';
      const limit = 10;
      const windowSeconds = 60;

      cache.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.consume(key, limit, windowSeconds);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
    });

    it('should handle different keys independently', async () => {
      const limit = 5;
      const windowSeconds = 60;
      const now = Math.floor(Date.now() / 1000);

      // User 1 - 2 requests
      cache.get.mockResolvedValue({ count: 2, resetAt: now + windowSeconds });
      const result1 = await service.consume('user-1', limit, windowSeconds);
      expect(result1.remaining).toBe(2);

      // User 2 - fresh (no requests)
      cache.get.mockResolvedValue(null);
      const result2 = await service.consume('user-2', limit, windowSeconds);
      expect(result2.remaining).toBe(4);
    });
  });

  describe('getStatus', () => {
    it('should return current status without consuming', async () => {
      const key = 'user-123';
      const limit = 10;
      const windowSeconds = 60;
      const now = Math.floor(Date.now() / 1000);
      const resetAt = now + windowSeconds;

      cache.get.mockResolvedValue({ count: 3, resetAt });

      const result = await service.getStatus(key, limit, windowSeconds);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(7);
      expect(result.limit).toBe(10);
      expect(cache.set).not.toHaveBeenCalled(); // Should not modify cache
    });

    it('should return full limit when no data exists', async () => {
      const key = 'user-123';
      const limit = 10;
      const windowSeconds = 60;

      cache.get.mockResolvedValue(null);

      const result = await service.getStatus(key, limit, windowSeconds);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('should show not allowed when limit reached', async () => {
      const key = 'user-123';
      const limit = 5;
      const windowSeconds = 60;
      const now = Math.floor(Date.now() / 1000);
      const resetAt = now + windowSeconds;

      cache.get.mockResolvedValue({ count: 5, resetAt });

      const result = await service.getStatus(key, limit, windowSeconds);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle expired window in status check', async () => {
      const key = 'user-123';
      const limit = 5;
      const windowSeconds = 60;
      const now = Math.floor(Date.now() / 1000);
      const expiredResetAt = now - 10;

      cache.get.mockResolvedValue({ count: 5, resetAt: expiredResetAt });

      const result = await service.getStatus(key, limit, windowSeconds);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5); // Full limit after expiry
    });

    it('should allow on cache error', async () => {
      const key = 'user-123';
      const limit = 10;
      const windowSeconds = 60;

      cache.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.getStatus(key, limit, windowSeconds);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
    });
  });

  describe('reset', () => {
    it('should reset rate limit for a key', async () => {
      const key = 'user-123';

      cache.del.mockResolvedValue(undefined);

      await service.reset(key);

      expect(cache.del).toHaveBeenCalledWith('rate_limit:user-123');
    });

    it('should handle reset errors gracefully', async () => {
      const key = 'user-123';

      cache.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.reset(key)).resolves.not.toThrow();
    });
  });

  describe('getUserKey', () => {
    it('should generate consistent user key', () => {
      const userId = 'user-123';
      const endpoint = 'transfer:create';

      const key = service.getUserKey(userId, endpoint);

      expect(key).toBe('user:user-123:transfer:create');
    });

    it('should handle different endpoints', () => {
      const userId = 'user-123';

      const key1 = service.getUserKey(userId, 'login');
      const key2 = service.getUserKey(userId, 'transfer');

      expect(key1).toBe('user:user-123:login');
      expect(key2).toBe('user:user-123:transfer');
      expect(key1).not.toBe(key2);
    });
  });

  describe('getIpKey', () => {
    it('should generate consistent IP key', () => {
      const ip = '192.168.1.1';
      const endpoint = 'login';

      const key = service.getIpKey(ip, endpoint);

      expect(key).toBe('ip:192.168.1.1:login');
    });

    it('should normalize IPv6 addresses', () => {
      const ipv6 = '::ffff:192.168.1.1';
      const endpoint = 'login';

      const key = service.getIpKey(ipv6, endpoint);

      expect(key).toBe('ip:192.168.1.1:login');
    });

    it('should keep pure IPv6 addresses', () => {
      const ipv6 = '2001:0db8:85a3::8a2e:0370:7334';
      const endpoint = 'login';

      const key = service.getIpKey(ipv6, endpoint);

      expect(key).toBe('ip:2001:0db8:85a3::8a2e:0370:7334:login');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle burst traffic correctly', async () => {
      const key = 'user-123';
      const limit = 3;
      const windowSeconds = 60;
      const now = Math.floor(Date.now() / 1000);
      const resetAt = now + windowSeconds;

      // First request
      cache.get.mockResolvedValue(null);
      const r1 = await service.consume(key, limit, windowSeconds);
      expect(r1.allowed).toBe(true);

      // Second request
      cache.get.mockResolvedValue({ count: 1, resetAt });
      const r2 = await service.consume(key, limit, windowSeconds);
      expect(r2.allowed).toBe(true);

      // Third request
      cache.get.mockResolvedValue({ count: 2, resetAt });
      const r3 = await service.consume(key, limit, windowSeconds);
      expect(r3.allowed).toBe(true);

      // Fourth request - should be blocked
      cache.get.mockResolvedValue({ count: 3, resetAt });
      const r4 = await service.consume(key, limit, windowSeconds);
      expect(r4.allowed).toBe(false);
      expect(r4.remaining).toBe(0);
    });

    it('should allow requests after window resets', async () => {
      const key = 'user-123';
      const limit = 2;
      const windowSeconds = 60;
      const now = Math.floor(Date.now() / 1000);

      // Exhaust limit
      cache.get.mockResolvedValue({ count: 2, resetAt: now + windowSeconds });
      const blocked = await service.consume(key, limit, windowSeconds);
      expect(blocked.allowed).toBe(false);

      // Window expires
      cache.get.mockResolvedValue({
        count: 2,
        resetAt: now - 1,
      }); // Expired
      const allowed = await service.consume(key, limit, windowSeconds);
      expect(allowed.allowed).toBe(true);
      expect(allowed.remaining).toBe(1);
    });
  });
});
