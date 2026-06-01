import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoginUserUsecase, LoginUserInput } from './login-user.usecase';
import { UserRepository } from '../../../infrastructure/repositories';
import { VerificationFacadeService } from '../../../../verification/application/services/verification-facade.service';

describe('LoginUserUsecase', () => {
  let usecase: LoginUserUsecase;
  let userRepository: jest.Mocked<UserRepository>;
  let verificationFacade: jest.Mocked<VerificationFacadeService>;
  let eventEmitter: { emit: jest.Mock };

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
    eventEmitter = { emit: jest.fn() };

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
          provide: VerificationFacadeService,
          useValue: {
            sendOtp: jest.fn(),
            verifyOtp: jest.fn(),
            resendOtp: jest.fn(),
            createVerification: jest.fn(),
            checkVerification: jest.fn(),
          },
        },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    usecase = module.get<LoginUserUsecase>(LoginUserUsecase);
    userRepository = module.get(UserRepository);
    verificationFacade = module.get(VerificationFacadeService);
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
      verificationFacade.sendOtp.mockResolvedValue(undefined);

      const result = await usecase.execute(input);

      expect(userRepository.findByPhone).toHaveBeenCalledWith('+225123456789');
      expect(verificationFacade.sendOtp).toHaveBeenCalledWith('+225123456789');
      expect(result).toEqual({
        success: true,
        otpExpiresIn: 300,
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'user.login.requested',
        expect.objectContaining({
          userId: 'user-123',
          phone: '+225123456789',
        }),
      );
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
      expect(verificationFacade.sendOtp).not.toHaveBeenCalled();
    });

    it('should handle different phone formats', async () => {
      const input: LoginUserInput = {
        phone: '+2250123456789',
      };

      userRepository.findByPhone.mockResolvedValue(mockUser as any);
      verificationFacade.sendOtp.mockResolvedValue(undefined);

      await usecase.execute(input);

      expect(userRepository.findByPhone).toHaveBeenCalledWith('+2250123456789');
    });

    it('should propagate OTP service errors', async () => {
      const input: LoginUserInput = {
        phone: '+225123456789',
      };

      userRepository.findByPhone.mockResolvedValue(mockUser as any);
      verificationFacade.sendOtp.mockRejectedValue(
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
      expect(verificationFacade.sendOtp).not.toHaveBeenCalled();
    });
  });
});
