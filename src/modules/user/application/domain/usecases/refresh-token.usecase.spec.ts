import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  RefreshTokenUsecase,
  RefreshTokenInput,
} from './refresh-token.usecase';
import { UserRepository } from '../../../infrastructure/repositories';
import {
  createMockRepository,
  createMockJwtService,
  createMockConfigService,
  createMockRedisClient,
  createTestUser,
  MockRedisClient,
} from '../../../../../test/helpers/test-utils';

// Mock ioredis with proper default export
jest.mock('ioredis', () => {
  const mockRedis = jest.fn().mockImplementation(() => createMockRedisClient());
  return { default: mockRedis, __esModule: true };
});

describe('RefreshTokenUsecase', () => {
  let useCase: RefreshTokenUsecase;
  let userRepository: ReturnType<typeof createMockRepository>;
  let jwtService: ReturnType<typeof createMockJwtService>;
  let configService: ReturnType<typeof createMockConfigService>;
  let mockRedisClient: MockRedisClient;

  const userId = 'test-user-id';
  const validRefreshToken = 'valid.refresh.token';

  beforeEach(async () => {
    userRepository = createMockRepository();
    jwtService = createMockJwtService();
    configService = createMockConfigService({
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.refreshExpiresIn': '7d',
    });
    mockRedisClient = createMockRedisClient();

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
        RefreshTokenUsecase,
        { provide: UserRepository, useValue: userRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    useCase = module.get<RefreshTokenUsecase>(RefreshTokenUsecase);

    // Manually set connected state for tests
    (useCase as any).isRedisConnected = true;
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await useCase.onModuleDestroy();
  });

  describe('Successful token refresh with rotation', () => {
    it('should return new access and refresh tokens', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      userRepository.findById.mockResolvedValue(user);
      mockRedisClient.get.mockResolvedValue(null); // Not blacklisted

      jwtService.verify.mockReturnValue({
        sub: userId,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      jwtService.sign
        .mockReturnValueOnce('new.access.token')
        .mockReturnValueOnce('new.refresh.token');

      const input: RefreshTokenInput = {
        refreshToken: validRefreshToken,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('new.access.token');
      expect(result.refreshToken).toBe('new.refresh.token');
      expect(result.user).toBe(user);
    });
  });

  describe('Blacklist old token after issuing new one', () => {
    it('should blacklist the old refresh token', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      userRepository.findById.mockResolvedValue(user);
      mockRedisClient.get.mockResolvedValue(null);

      const expirationTimestamp = Math.floor(Date.now() / 1000) + 3600;
      jwtService.verify.mockReturnValue({
        sub: userId,
        type: 'refresh',
        exp: expirationTimestamp,
      });

      const input: RefreshTokenInput = {
        refreshToken: validRefreshToken,
      };

      // Act
      await useCase.execute(input);

      // Assert
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `blacklist:${validRefreshToken}`,
        '1',
        'EX',
        expect.any(Number),
      );
    });

    it('should calculate TTL from token expiration', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      userRepository.findById.mockResolvedValue(user);
      mockRedisClient.get.mockResolvedValue(null);

      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      jwtService.verify.mockReturnValue({
        sub: userId,
        type: 'refresh',
        exp: futureExp,
      });

      const input: RefreshTokenInput = {
        refreshToken: validRefreshToken,
      };

      // Act
      await useCase.execute(input);

      // Assert
      const setCall = mockRedisClient.set.mock.calls[0];
      const ttl = setCall[3]; // EX value
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(3600);
    });
  });

  describe('Reject blacklisted tokens', () => {
    it('should throw UnauthorizedException for blacklisted token', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue('1'); // Token is blacklisted

      const input: RefreshTokenInput = {
        refreshToken: validRefreshToken,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(useCase.execute(input)).rejects.toThrow(
        'Token has been revoked',
      );
    });
  });

  describe('Validate token type', () => {
    it('should reject access tokens used as refresh tokens', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);

      jwtService.verify.mockReturnValue({
        sub: userId,
        type: 'access', // Wrong type
      });

      const input: RefreshTokenInput = {
        refreshToken: validRefreshToken,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(useCase.execute(input)).rejects.toThrow(
        'Invalid token type',
      );
    });

    it('should accept tokens with type "refresh"', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      userRepository.findById.mockResolvedValue(user);
      mockRedisClient.get.mockResolvedValue(null);

      jwtService.verify.mockReturnValue({
        sub: userId,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const input: RefreshTokenInput = {
        refreshToken: validRefreshToken,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('Handle expired refresh tokens', () => {
    it('should throw UnauthorizedException for expired token', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);

      jwtService.verify.mockImplementation(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const input: RefreshTokenInput = {
        refreshToken: 'expired.refresh.token',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(useCase.execute(input)).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });
  });

  describe('Reject inactive users', () => {
    it('should throw UnauthorizedException for suspended user', async () => {
      // Arrange
      const user = createTestUser({ id: userId, isActive: false });
      userRepository.findById.mockResolvedValue(user);
      mockRedisClient.get.mockResolvedValue(null);

      jwtService.verify.mockReturnValue({
        sub: userId,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const input: RefreshTokenInput = {
        refreshToken: validRefreshToken,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(useCase.execute(input)).rejects.toThrow(
        'User account is not active',
      );
    });
  });

  describe('Handle non-existent users', () => {
    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      userRepository.findById.mockResolvedValue(null);
      mockRedisClient.get.mockResolvedValue(null);

      jwtService.verify.mockReturnValue({
        sub: userId,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const input: RefreshTokenInput = {
        refreshToken: validRefreshToken,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
      await expect(useCase.execute(input)).rejects.toThrow('User not found');
    });
  });

  describe('Generate refresh token', () => {
    it('should generate refresh token with correct payload', () => {
      // Act
      const token = useCase.generateRefreshToken(userId);

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: userId,
          type: 'refresh',
          jti: expect.any(String),
        }),
        expect.objectContaining({
          secret: 'test-refresh-secret',
          expiresIn: '7d',
        }),
      );
      expect(token).toBeDefined();
    });
  });

  describe('Blacklist token method', () => {
    it('should blacklist token with calculated TTL', async () => {
      // Arrange
      const expirationTimestamp = Math.floor(Date.now() / 1000) + 7200; // 2 hours

      // Act
      await useCase.blacklistToken(validRefreshToken, expirationTimestamp);

      // Assert
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `blacklist:${validRefreshToken}`,
        '1',
        'EX',
        expect.any(Number),
      );
    });

    it('should use default 7-day TTL when expiration unknown', async () => {
      // Act
      await useCase.blacklistToken(validRefreshToken);

      // Assert
      const setCall = mockRedisClient.set.mock.calls[0];
      const ttl = setCall[3];
      expect(ttl).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });

    it('should not blacklist if TTL is 0 or negative', async () => {
      // Arrange - expired token
      const pastTimestamp = Math.floor(Date.now() / 1000) - 100;

      // Act
      await useCase.blacklistToken(validRefreshToken, pastTimestamp);

      // Assert - should not call set (TTL would be negative)
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });
  });

  describe('Redis connection handling', () => {
    it('should return session-store unavailable when Redis is not connected', async () => {
      // Arrange
      (useCase as any).isRedisConnected = false;

      const input: RefreshTokenInput = {
        refreshToken: validRefreshToken,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toMatchObject({
        code: 'E1009',
        message:
          'Session store is temporarily unavailable. Please try again later.',
      });
      expect(jwtService.verify).not.toHaveBeenCalled();
    });
  });

  describe('Module lifecycle', () => {
    it('should close Redis connection on module destroy', async () => {
      // Act
      await useCase.onModuleDestroy();

      // Assert
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });

  describe('JWT verification errors', () => {
    it('should throw UnauthorizedException for malformed token', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);

      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const input: RefreshTokenInput = {
        refreshToken: 'malformed.token',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid signature', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);

      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      const input: RefreshTokenInput = {
        refreshToken: 'invalid.signature.token',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Token payload validation', () => {
    it('should use sub claim as user ID', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      userRepository.findById.mockResolvedValue(user);
      mockRedisClient.get.mockResolvedValue(null);

      jwtService.verify.mockReturnValue({
        sub: userId,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const input: RefreshTokenInput = {
        refreshToken: validRefreshToken,
      };

      // Act
      await useCase.execute(input);

      // Assert
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
    });
  });
});
