import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as bcrypt from 'bcrypt';
import { VerifyPinUseCase, VerifyPinInput } from './verify-pin.use-case';
import { UserRepository } from '../../../user/infrastructure/repositories';
import {
  createMockRepository,
  createMockCacheManager,
  createTestUser,
} from '../../../../test/helpers/test-utils';

// Mock bcrypt
jest.mock('bcrypt');

describe('VerifyPinUseCase', () => {
  let useCase: VerifyPinUseCase;
  let userRepository: ReturnType<typeof createMockRepository>;
  let cacheManager: ReturnType<typeof createMockCacheManager>;

  const userId = 'test-user-id';
  const correctPin = '1234';
  const hashedPin = 'hashed_1234';

  beforeEach(async () => {
    userRepository = createMockRepository();
    cacheManager = createMockCacheManager();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifyPinUseCase,
        { provide: UserRepository, useValue: userRepository },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    useCase = module.get<VerifyPinUseCase>(VerifyPinUseCase);

    // Reset bcrypt mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful PIN verification', () => {
    it('should return valid: true for correct PIN', async () => {
      // Arrange
      const user = createTestUser({
        id: userId,
        hasPin: true,
        pinHash: hashedPin,
        pinAttempts: 0,
      });
      userRepository.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const input: VerifyPinInput = {
        userId,
        pin: correctPin,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.message).toBe('PIN verified successfully');
    });

    it('should include PIN token in response', async () => {
      // Arrange
      const user = createTestUser({
        id: userId,
        hasPin: true,
        pinHash: hashedPin,
        pinAttempts: 0,
      });
      userRepository.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const input: VerifyPinInput = {
        userId,
        pin: correctPin,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.pinToken).toBeDefined();
      expect(result.pinToken).toMatch(/^[a-f0-9]{64}$/); // 32-byte hex = 64 chars
    });
  });

  describe('Generate PIN token (32-byte hex) with 5-minute TTL', () => {
    it('should generate 32-byte hex token', async () => {
      // Arrange
      const user = createTestUser({
        id: userId,
        hasPin: true,
        pinHash: hashedPin,
      });
      userRepository.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const input: VerifyPinInput = {
        userId,
        pin: correctPin,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.pinToken).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should store token in cache with 5-minute TTL', async () => {
      // Arrange
      const user = createTestUser({
        id: userId,
        hasPin: true,
        pinHash: hashedPin,
      });
      userRepository.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const input: VerifyPinInput = {
        userId,
        pin: correctPin,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(cacheManager.set).toHaveBeenCalledWith(
        `pin_token:${userId}:${result.pinToken}`,
        expect.objectContaining({ verified: true }),
        300, // 5 minutes in seconds
      );
    });

    it('should include expiresIn in response', async () => {
      // Arrange
      const user = createTestUser({
        id: userId,
        hasPin: true,
        pinHash: hashedPin,
      });
      userRepository.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const input: VerifyPinInput = {
        userId,
        pin: correctPin,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.expiresIn).toBe(300); // 5 minutes
    });
  });

  describe('Track failed attempts', () => {
    it('should record failed attempt on wrong PIN', async () => {
      // Arrange
      const user = createTestUser({
        id: userId,
        hasPin: true,
        pinHash: hashedPin,
        pinAttempts: 0,
      });
      userRepository.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const input: VerifyPinInput = {
        userId,
        pin: 'wrongpin',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);

      // Verify recordFailedPinAttempt was called (via save)
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should return remaining attempts after failure', async () => {
      // Arrange
      const user = createTestUser({
        id: userId,
        hasPin: true,
        pinHash: hashedPin,
        pinAttempts: 2, // Already 2 attempts
      });
      userRepository.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const input: VerifyPinInput = {
        userId,
        pin: 'wrongpin',
      };

      // Act & Assert
      try {
        await useCase.execute(input);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response).toEqual(
          expect.objectContaining({
            remainingAttempts: expect.any(Number),
          }),
        );
      }
    });
  });

  describe('Lock account after 5 failed attempts', () => {
    it('should throw ForbiddenException after 5 failed attempts', async () => {
      // Arrange
      const user = createTestUser({
        id: userId,
        hasPin: true,
        pinHash: hashedPin,
        pinAttempts: 4, // 4 attempts, this will be the 5th
      });

      // Mock recordFailedPinAttempt to trigger lock
      user.recordFailedPinAttempt = jest.fn().mockImplementation(() => {
        user.pinAttempts = 5;
        user.pinLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      });

      // Mock isPinLocked to return true after recording attempt
      Object.defineProperty(user, 'isPinLocked', {
        get: jest.fn().mockReturnValue(true),
      });

      userRepository.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const input: VerifyPinInput = {
        userId,
        pin: 'wrongpin',
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Reject when PIN not set', () => {
    it('should throw BadRequestException when user has no PIN', async () => {
      // Arrange
      const user = createTestUser({
        id: userId,
        hasPin: false,
      });
      userRepository.findById.mockResolvedValue(user);

      const input: VerifyPinInput = {
        userId,
        pin: correctPin,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow(
        'PIN not set. Please set your PIN first.',
      );
    });
  });

  describe('Reject during lockout period', () => {
    it('should throw ForbiddenException when PIN is locked', async () => {
      // Arrange
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 mins from now
      const user = createTestUser({
        id: userId,
        hasPin: true,
        pinHash: hashedPin,
        pinAttempts: 5,
        pinLockedUntil: lockUntil,
      });

      userRepository.findById.mockResolvedValue(user);

      const input: VerifyPinInput = {
        userId,
        pin: correctPin,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ForbiddenException);
      await expect(useCase.execute(input)).rejects.toThrow(
        /PIN is locked due to too many failed attempts/,
      );
    });

    it('should include lockedUntil timestamp in error', async () => {
      // Arrange
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      const user = createTestUser({
        id: userId,
        hasPin: true,
        pinHash: hashedPin,
        pinAttempts: 5,
        pinLockedUntil: lockUntil,
      });

      userRepository.findById.mockResolvedValue(user);

      const input: VerifyPinInput = {
        userId,
        pin: correctPin,
      };

      // Act & Assert
      try {
        await useCase.execute(input);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.response).toEqual(
          expect.objectContaining({
            lockedUntil: lockUntil,
          }),
        );
      }
    });
  });

  describe('Reset attempts on successful verification', () => {
    it('should reset pin attempts after successful verification', async () => {
      // Arrange
      const user = createTestUser({
        id: userId,
        hasPin: true,
        pinHash: hashedPin,
        pinAttempts: 3, // Had some failed attempts
      });
      userRepository.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const input: VerifyPinInput = {
        userId,
        pin: correctPin,
      };

      // Act
      await useCase.execute(input);

      // Assert - user.resetPinAttempts() should have been called
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pinAttempts: 0,
          pinLockedUntil: null,
        }),
      );
    });
  });

  describe('User not found', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      userRepository.findById.mockResolvedValue(null);

      const input: VerifyPinInput = {
        userId: 'non-existent-user',
        pin: correctPin,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
      await expect(useCase.execute(input)).rejects.toThrow('User not found');
    });
  });

  describe('PIN comparison', () => {
    it('should use bcrypt.compare for PIN verification', async () => {
      // Arrange
      const user = createTestUser({
        id: userId,
        hasPin: true,
        pinHash: hashedPin,
      });
      userRepository.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const input: VerifyPinInput = {
        userId,
        pin: correctPin,
      };

      // Act
      await useCase.execute(input);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(correctPin, hashedPin);
    });
  });

  describe('Invalid PIN response', () => {
    it('should throw BadRequestException with message for invalid PIN', async () => {
      // Arrange
      const user = createTestUser({
        id: userId,
        hasPin: true,
        pinHash: hashedPin,
        pinAttempts: 0,
      });
      userRepository.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const input: VerifyPinInput = {
        userId,
        pin: 'wrongpin',
      };

      // Act & Assert
      try {
        await useCase.execute(input);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response).toEqual(
          expect.objectContaining({
            message: 'Invalid PIN',
          }),
        );
      }
    });
  });

  describe('Token uniqueness', () => {
    it('should generate unique tokens for multiple verifications', async () => {
      // Arrange
      const user = createTestUser({
        id: userId,
        hasPin: true,
        pinHash: hashedPin,
      });
      userRepository.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const input: VerifyPinInput = {
        userId,
        pin: correctPin,
      };

      // Act
      const result1 = await useCase.execute(input);
      const result2 = await useCase.execute(input);

      // Assert
      expect(result1.pinToken).not.toBe(result2.pinToken);
    });
  });

  describe('Cache key format', () => {
    it('should use correct cache key format', async () => {
      // Arrange
      const user = createTestUser({
        id: userId,
        hasPin: true,
        pinHash: hashedPin,
      });
      userRepository.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const input: VerifyPinInput = {
        userId,
        pin: correctPin,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^pin_token:${userId}:[a-f0-9]{64}$`)),
        expect.any(Object),
        expect.any(Number),
      );
    });
  });
});
