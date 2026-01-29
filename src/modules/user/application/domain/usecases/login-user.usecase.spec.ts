import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LoginUserUsecase, LoginUserInput } from './login-user.usecase';
import { UserRepository } from '../../../infrastructure/repositories';
import { OtpService } from '../services';

describe('LoginUserUsecase', () => {
  let usecase: LoginUserUsecase;
  let userRepository: jest.Mocked<UserRepository>;
  let otpService: jest.Mocked<OtpService>;

  const mockUser = {
    id: 'user-123',
    phone: '+225123456789',
    email: 'test@example.com',
    isPhoneVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUserUsecase,
        {
          provide: UserRepository,
          useValue: {
            findByPhone: jest.fn(),
            findById: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: OtpService,
          useValue: {
            sendOtp: jest.fn(),
            verifyOtp: jest.fn(),
            generateOtp: jest.fn(),
          },
        },
      ],
    }).compile();

    usecase = module.get<LoginUserUsecase>(LoginUserUsecase);
    userRepository = module.get(UserRepository);
    otpService = module.get(OtpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should send OTP for existing user', async () => {
      const input: LoginUserInput = {
        phone: '+225123456789',
      };

      userRepository.findByPhone.mockResolvedValue(mockUser as any);
      otpService.sendOtp.mockResolvedValue(undefined);

      const result = await usecase.execute(input);

      expect(userRepository.findByPhone).toHaveBeenCalledWith('+225123456789');
      expect(otpService.sendOtp).toHaveBeenCalledWith('+225123456789');
      expect(result).toEqual({
        success: true,
        otpExpiresIn: 300,
      });
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const input: LoginUserInput = {
        phone: '+225123456789',
      };

      userRepository.findByPhone.mockResolvedValue(null);

      await expect(usecase.execute(input)).rejects.toThrow(NotFoundException);
      await expect(usecase.execute(input)).rejects.toThrow(
        'User not found. Please register first.',
      );
      expect(otpService.sendOtp).not.toHaveBeenCalled();
    });

    it('should handle different phone formats', async () => {
      const input: LoginUserInput = {
        phone: '+2250123456789',
      };

      userRepository.findByPhone.mockResolvedValue(mockUser as any);
      otpService.sendOtp.mockResolvedValue(undefined);

      await usecase.execute(input);

      expect(userRepository.findByPhone).toHaveBeenCalledWith('+2250123456789');
    });

    it('should propagate OTP service errors', async () => {
      const input: LoginUserInput = {
        phone: '+225123456789',
      };

      userRepository.findByPhone.mockResolvedValue(mockUser as any);
      otpService.sendOtp.mockRejectedValue(
        new Error('SMS service unavailable'),
      );

      await expect(usecase.execute(input)).rejects.toThrow(
        'SMS service unavailable',
      );
    });

    it('should handle repository errors', async () => {
      const input: LoginUserInput = {
        phone: '+225123456789',
      };

      userRepository.findByPhone.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(usecase.execute(input)).rejects.toThrow(
        'Database connection failed',
      );
      expect(otpService.sendOtp).not.toHaveBeenCalled();
    });
  });
});
