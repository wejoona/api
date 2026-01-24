import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpService } from './otp.service';
import { SMS_GATEWAY, ISmsGateway } from '../../../../shared/domain/gateways/sms.gateway';
import {
  createMockSmsGateway,
  createMockConfigService,
  createMockRedisClient,
  MockRedisClient,
} from '../../../../../test/helpers/test-utils';

// Mock ioredis with proper default export
jest.mock('ioredis', () => {
  const mockRedis = jest.fn().mockImplementation(() => createMockRedisClient());
  return { default: mockRedis, __esModule: true };
});

describe('OtpService', () => {
  let otpService: OtpService;
  let smsGateway: jest.Mocked<ISmsGateway>;
  let configService: ReturnType<typeof createMockConfigService>;
  let mockRedisClient: MockRedisClient;

  const testPhone = '+2250123456789';

  beforeEach(async () => {
    smsGateway = createMockSmsGateway();
    configService = createMockConfigService();
    mockRedisClient = createMockRedisClient();

    // Mock Redis constructor
    const Redis = require('ioredis').default;
    Redis.mockImplementation(() => {
      // Simulate connected state
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
        OtpService,
        { provide: ConfigService, useValue: configService },
        { provide: SMS_GATEWAY, useValue: smsGateway },
      ],
    }).compile();

    otpService = module.get<OtpService>(OtpService);

    // Manually set connected state for tests
    (otpService as any).isRedisConnected = true;
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await otpService.onModuleDestroy();
  });

  describe('Generate cryptographically secure OTP', () => {
    it('should generate 6-digit OTP', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null); // No rate limit hit

      // Act
      await otpService.sendOtp(testPhone);

      // Assert
      expect(mockRedisClient.setex).toHaveBeenCalled();
      const setexCall = mockRedisClient.setex.mock.calls[0];
      const otp = setexCall[2]; // Third argument is the OTP

      expect(otp).toMatch(/^\d{6}$/);
      expect(otp.length).toBe(6);
    });

    it('should generate different OTPs for multiple calls', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);

      const otps: string[] = [];
      for (let i = 0; i < 5; i++) {
        await otpService.sendOtp(testPhone);
        const setexCall = mockRedisClient.setex.mock.calls[i];
        otps.push(setexCall[2]);
      }

      // At least some should be different (probabilistically)
      const uniqueOtps = new Set(otps);
      expect(uniqueOtps.size).toBeGreaterThan(1);
    });
  });

  describe('Store OTP with 5-minute expiry in Redis', () => {
    it('should store OTP with correct TTL', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'otp.expiresIn') return 300; // 5 minutes
        return defaultValue;
      });

      // Act
      await otpService.sendOtp(testPhone);

      // Assert
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `otp:${testPhone}`,
        300, // 5 minute TTL
        expect.any(String),
      );
    });

    it('should reset attempts counter when sending new OTP', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);

      // Act
      await otpService.sendOtp(testPhone);

      // Assert - should set attempts to 0
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `otp:${testPhone}:attempts`,
        expect.any(Number),
        '0',
      );
    });
  });

  describe('Enforce rate limiting (5 requests/hour)', () => {
    it('should allow requests under rate limit', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue('4'); // 4 requests made

      // Act & Assert - should not throw
      await expect(otpService.sendOtp(testPhone)).resolves.not.toThrow();
    });

    it('should throw BadRequestException when rate limit exceeded', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue('5'); // 5 requests made (at limit)

      // Act & Assert
      await expect(otpService.sendOtp(testPhone)).rejects.toThrow(BadRequestException);
      await expect(otpService.sendOtp(testPhone)).rejects.toThrow(
        'Too many OTP requests. Please try again later.',
      );
    });

    it('should increment rate limit counter on each request', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue('2');

      // Act
      await otpService.sendOtp(testPhone);

      // Assert - pipeline incr should be called
      const pipeline = mockRedisClient.pipeline();
      expect(pipeline.incr).toHaveBeenCalledWith(`otp_rate:${testPhone}`);
    });
  });

  describe('Track failed attempts with exponential backoff', () => {
    it('should apply 5-second lockout after 1st failed attempt', async () => {
      // Arrange
      const storedOtp = '123456';
      mockRedisClient.get
        .mockResolvedValueOnce(null) // No lockout
        .mockResolvedValueOnce('0') // Attempts counter
        .mockResolvedValueOnce(storedOtp); // Stored OTP

      mockRedisClient.incr.mockResolvedValue(1); // First failed attempt

      // Act
      const result = await otpService.verifyOtp(testPhone, '000000'); // Wrong OTP

      // Assert
      expect(result).toBe(false);
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `otp:${testPhone}:lockout`,
        expect.any(Number),
        expect.any(String),
      );
    });

    it('should apply 15-second lockout after 2nd failed attempt', async () => {
      // Arrange
      const storedOtp = '123456';
      mockRedisClient.get
        .mockResolvedValueOnce(null) // No lockout
        .mockResolvedValueOnce('1') // 1 previous attempt
        .mockResolvedValueOnce(storedOtp);

      mockRedisClient.incr.mockResolvedValue(2); // Second failed attempt

      // Act
      await otpService.verifyOtp(testPhone, '000000');

      // Assert - exponential backoff: 5 * 3^1 = 15 seconds
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `otp:${testPhone}:lockout`,
        expect.any(Number), // TTL = backoff + 60
        expect.any(String),
      );
    });

    it('should reject verification during lockout period', async () => {
      // Arrange
      const futureTime = Date.now() + 30000; // 30 seconds from now
      mockRedisClient.get.mockResolvedValueOnce(futureTime.toString()); // Locked

      // Act & Assert
      await expect(otpService.verifyOtp(testPhone, '123456')).rejects.toThrow(
        /Please wait \d+ seconds before trying again/,
      );
    });

    it('should clear lockout after expiry', async () => {
      // Arrange
      const pastTime = Date.now() - 1000; // 1 second ago (expired)
      const storedOtp = '123456';
      mockRedisClient.get
        .mockResolvedValueOnce(pastTime.toString()) // Expired lockout
        .mockResolvedValueOnce('0') // Attempts
        .mockResolvedValueOnce(storedOtp);

      // Act
      const result = await otpService.verifyOtp(testPhone, storedOtp);

      // Assert
      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith(`otp:${testPhone}:lockout`);
    });
  });

  describe('Verify OTP with timing-safe comparison', () => {
    it('should return true for correct OTP', async () => {
      // Arrange
      const storedOtp = '123456';
      mockRedisClient.get
        .mockResolvedValueOnce(null) // No lockout
        .mockResolvedValueOnce('0') // Attempts
        .mockResolvedValueOnce(storedOtp);

      // Act
      const result = await otpService.verifyOtp(testPhone, storedOtp);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for incorrect OTP', async () => {
      // Arrange
      mockRedisClient.get
        .mockResolvedValueOnce(null) // No lockout
        .mockResolvedValueOnce('0') // Attempts
        .mockResolvedValueOnce('123456'); // Stored OTP

      mockRedisClient.incr.mockResolvedValue(1);

      // Act
      const result = await otpService.verifyOtp(testPhone, '654321');

      // Assert
      expect(result).toBe(false);
      expect(mockRedisClient.incr).toHaveBeenCalled();
    });

    it('should return false for OTP with wrong length', async () => {
      // Arrange
      mockRedisClient.get
        .mockResolvedValueOnce(null) // No lockout
        .mockResolvedValueOnce('0') // Attempts
        .mockResolvedValueOnce('123456'); // 6-digit stored OTP

      mockRedisClient.incr.mockResolvedValue(1);

      // Act - provide 4-digit OTP
      const result = await otpService.verifyOtp(testPhone, '1234');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Handle Redis connection failures gracefully', () => {
    it('should throw error when Redis is not connected (sendOtp)', async () => {
      // Arrange
      (otpService as any).isRedisConnected = false;

      // Act & Assert
      await expect(otpService.sendOtp(testPhone)).rejects.toThrow(
        'Redis connection unavailable. Please try again later.',
      );
    });

    it('should throw error when Redis is not connected (verifyOtp)', async () => {
      // Arrange
      (otpService as any).isRedisConnected = false;

      // Act & Assert
      await expect(otpService.verifyOtp(testPhone, '123456')).rejects.toThrow(
        'Redis connection unavailable. Please try again later.',
      );
    });
  });

  describe('Reject expired OTPs', () => {
    it('should return false when OTP not found (expired)', async () => {
      // Arrange
      mockRedisClient.get
        .mockResolvedValueOnce(null) // No lockout
        .mockResolvedValueOnce('0') // Attempts
        .mockResolvedValueOnce(null); // No OTP stored (expired)

      // Act
      const result = await otpService.verifyOtp(testPhone, '123456');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Clear OTP after successful verification', () => {
    it('should delete OTP, attempts, and lockout after success', async () => {
      // Arrange
      const storedOtp = '123456';
      mockRedisClient.get
        .mockResolvedValueOnce(null) // No lockout
        .mockResolvedValueOnce('0') // Attempts
        .mockResolvedValueOnce(storedOtp);

      // Act
      await otpService.verifyOtp(testPhone, storedOtp);

      // Assert
      expect(mockRedisClient.del).toHaveBeenCalledWith(`otp:${testPhone}`);
      expect(mockRedisClient.del).toHaveBeenCalledWith(`otp:${testPhone}:attempts`);
      expect(mockRedisClient.del).toHaveBeenCalledWith(`otp:${testPhone}:lockout`);
    });
  });

  describe('Resend OTP', () => {
    it('should delete existing OTP and send new one', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);

      // Act
      await otpService.resendOtp(testPhone);

      // Assert
      expect(mockRedisClient.del).toHaveBeenCalledWith(`otp:${testPhone}`);
      expect(mockRedisClient.setex).toHaveBeenCalled();
      expect(smsGateway.sendOtp).toHaveBeenCalled();
    });
  });

  describe('Max attempts exceeded', () => {
    it('should throw BadRequestException when max attempts exceeded', async () => {
      // Arrange
      mockRedisClient.get
        .mockResolvedValueOnce(null) // No lockout
        .mockResolvedValueOnce('3'); // Max attempts reached (configurable, default 3)

      // Act & Assert
      await expect(otpService.verifyOtp(testPhone, '123456')).rejects.toThrow(
        'Too many failed attempts. Please request a new OTP.',
      );
    });
  });

  describe('SMS sending', () => {
    it('should call SMS gateway to send OTP', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);

      // Act
      await otpService.sendOtp(testPhone);

      // Assert
      expect(smsGateway.sendOtp).toHaveBeenCalledWith(testPhone, expect.any(String));
    });

    it('should not throw even if SMS sending fails', async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);
      smsGateway.sendOtp.mockRejectedValue(new Error('SMS provider down'));

      // Act & Assert - should not throw
      await expect(otpService.sendOtp(testPhone)).resolves.not.toThrow();
    });
  });

  describe('Module lifecycle', () => {
    it('should close Redis connection on module destroy', async () => {
      // Act
      await otpService.onModuleDestroy();

      // Assert
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });
});
