import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm';
import { InternalTransferUseCase, InternalTransferInput } from './internal-transfer.use-case';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';
import { UserRepository } from '../../../user/infrastructure/repositories/user.repository';
import { PAYMENT_GATEWAY, IPaymentGateway } from '../../../shared/domain/gateways';
import {
  createMockRepository,
  createMockPaymentGateway,
  createMockDataSource,
  createTestUser,
  createTestWallet,
  MockDataSource,
} from '../../../../test/helpers/test-utils';

describe('InternalTransferUseCase', () => {
  let useCase: InternalTransferUseCase;
  let walletRepository: ReturnType<typeof createMockRepository>;
  let transactionRepository: ReturnType<typeof createMockRepository>;
  let userRepository: ReturnType<typeof createMockRepository>;
  let mockDataSource: MockDataSource;
  let paymentGateway: jest.Mocked<IPaymentGateway>;

  const senderUserId = 'sender-user-id';
  const recipientPhone = '+2250987654321';
  const recipientId = 'recipient-user-id';

  beforeEach(async () => {
    walletRepository = createMockRepository();
    transactionRepository = createMockRepository();
    userRepository = createMockRepository();
    mockDataSource = createMockDataSource();
    paymentGateway = createMockPaymentGateway();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalTransferUseCase,
        { provide: WalletRepository, useValue: walletRepository },
        { provide: TransactionRepository, useValue: transactionRepository },
        { provide: UserRepository, useValue: userRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: PAYMENT_GATEWAY, useValue: paymentGateway },
      ],
    }).compile();

    useCase = module.get<InternalTransferUseCase>(InternalTransferUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Valid transfer between two users', () => {
    it('should successfully transfer funds between two users', async () => {
      // Arrange
      const sender = createTestUser({ id: senderUserId, kycStatus: 'approved' });
      const recipient = createTestUser({ id: recipientId, phone: recipientPhone });
      const senderWallet = createTestWallet({ userId: senderUserId, balance: 500 });
      const recipientWallet = createTestWallet({ userId: recipientId, balance: 100 });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);

      mockDataSource.manager.findOne
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet);

      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 100,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.amount).toBe(100);
      expect(result.status).toBe('completed');
      expect(result.toPhone).toBe(recipientPhone);
      expect(paymentGateway.internalTransfer).toHaveBeenCalled();
    });
  });

  describe('Reject transfer to non-existent recipient', () => {
    it('should throw NotFoundException when recipient does not exist', async () => {
      // Arrange
      userRepository.findByPhone.mockResolvedValue(null);

      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: '+2251111111111',
        amount: 100,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Recipient not found. They must register first.',
      );
    });
  });

  describe('Reject transfer with insufficient balance', () => {
    it('should throw BadRequestException when balance is insufficient', async () => {
      // Arrange
      const sender = createTestUser({ id: senderUserId, kycStatus: 'approved' });
      const recipient = createTestUser({ id: recipientId, phone: recipientPhone });
      const senderWallet = createTestWallet({ userId: senderUserId, balance: 50 });
      const recipientWallet = createTestWallet({ userId: recipientId, balance: 100 });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      mockDataSource.manager.findOne.mockImplementation(async (entity, options) => {
        if (options?.where?.userId === senderUserId) {
          return senderWallet;
        }
        if (options?.where?.userId === recipientId) {
          return recipientWallet;
        }
        return null;
      });

      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 100,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Reject self-transfer', () => {
    it('should throw BadRequestException when trying to transfer to self', async () => {
      // Arrange
      const user = createTestUser({ id: senderUserId, phone: recipientPhone, kycStatus: 'approved' });
      const wallet = createTestWallet({ userId: senderUserId, balance: 500 });

      // Same user for both sender and recipient
      userRepository.findByPhone.mockResolvedValue(user);
      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      // Return the same wallet for both lookups
      mockDataSource.manager.findOne.mockResolvedValue(wallet);

      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 100,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow('Cannot transfer to yourself');
    });
  });

  describe('Enforce KYC-based daily limits', () => {
    it('should allow $100 for unverified users (none)', async () => {
      // Arrange
      const sender = createTestUser({ id: senderUserId, kycStatus: 'pending' });
      const recipient = createTestUser({ id: recipientId, phone: recipientPhone });
      const senderWallet = createTestWallet({ userId: senderUserId, balance: 500 });
      const recipientWallet = createTestWallet({ userId: recipientId, balance: 100 });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);

      mockDataSource.manager.findOne
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet);

      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 100,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.status).toBe('completed');
    });

    it('should reject transfer exceeding daily limit for pending KYC', async () => {
      // Arrange
      const sender = createTestUser({ id: senderUserId, kycStatus: 'pending' });
      const recipient = createTestUser({ id: recipientId, phone: recipientPhone });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(50);

      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 60, // Would exceed $100 limit (50 + 60 = 110)
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow(/Daily transfer limit exceeded/);
    });

    it('should allow $10,000 for verified users', async () => {
      // Arrange
      // Note: DAILY_TRANSFER_LIMITS uses 'verified' key, so we use that as kycStatus
      const sender = createTestUser({ id: senderUserId });
      // Manually override kycStatus to match the DAILY_TRANSFER_LIMITS key
      (sender as any).kycStatus = 'verified';

      const recipient = createTestUser({ id: recipientId, phone: recipientPhone });
      const senderWallet = createTestWallet({ userId: senderUserId, balance: 10000 });
      const recipientWallet = createTestWallet({ userId: recipientId, balance: 100 });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);

      mockDataSource.manager.findOne
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet);

      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 5000,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.status).toBe('completed');
    });

    it('should reject all transfers for rejected KYC ($0 limit)', async () => {
      // Arrange
      const sender = createTestUser({ id: senderUserId, kycStatus: 'rejected' });
      const recipient = createTestUser({ id: recipientId, phone: recipientPhone });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);

      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 10,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Transfers are disabled. Please contact support regarding your KYC status.',
      );
    });
  });

  describe('Handle optimistic lock conflicts with retry', () => {
    it('should retry on optimistic lock conflict and succeed', async () => {
      // Arrange
      const sender = createTestUser({ id: senderUserId, kycStatus: 'approved' });
      const recipient = createTestUser({ id: recipientId, phone: recipientPhone });
      const senderWallet = createTestWallet({ userId: senderUserId, balance: 500 });
      const recipientWallet = createTestWallet({ userId: recipientId, balance: 100 });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);

      let callCount = 0;
      mockDataSource.transaction.mockImplementation(async (callback) => {
        callCount++;
        if (callCount === 1) {
          throw new OptimisticLockVersionMismatchError('WalletOrmEntity', 1, 2);
        }
        // On second call, succeed
        mockDataSource.manager.findOne
          .mockResolvedValueOnce(senderWallet)
          .mockResolvedValueOnce(recipientWallet);
        return callback(mockDataSource.manager);
      });

      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 100,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.status).toBe('completed');
      expect(callCount).toBe(2);
    });

    it('should throw ConflictException after max retries exceeded', async () => {
      // Arrange
      const sender = createTestUser({ id: senderUserId, kycStatus: 'approved' });
      const recipient = createTestUser({ id: recipientId, phone: recipientPhone });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      mockDataSource.transaction.mockRejectedValue(
        new OptimisticLockVersionMismatchError('WalletOrmEntity', 1, 2),
      );

      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 100,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Transfer failed due to concurrent modification. Please try again.',
      );
    });
  });

  describe('Validate amount constraints', () => {
    it('should reject amount <= 0', async () => {
      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 0,
      };

      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow('Amount must be greater than 0');
    });

    it('should reject negative amount', async () => {
      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: -50,
      };

      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow('Amount must be greater than 0');
    });

    it('should reject amount < 0.01 (dust prevention)', async () => {
      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 0.005,
      };

      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow('Minimum transfer amount is 0.01');
    });

    it('should reject amount with more than 2 decimal places', async () => {
      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 100.123,
      };

      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow('Invalid amount precision');
    });

    it('should accept amount with exactly 2 decimal places', async () => {
      // Arrange
      const sender = createTestUser({ id: senderUserId, kycStatus: 'approved' });
      const recipient = createTestUser({ id: recipientId, phone: recipientPhone });
      const senderWallet = createTestWallet({ userId: senderUserId, balance: 500 });
      const recipientWallet = createTestWallet({ userId: recipientId, balance: 100 });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);

      mockDataSource.manager.findOne
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet);

      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 99.99,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.amount).toBe(99.99);
    });
  });

  describe('Reject when sender/recipient wallet inactive', () => {
    it('should reject when sender wallet is inactive', async () => {
      // Arrange
      const sender = createTestUser({ id: senderUserId });
      (sender as any).kycStatus = 'verified';
      const recipient = createTestUser({ id: recipientId, phone: recipientPhone });
      const senderWallet = createTestWallet({ userId: senderUserId, balance: 500, status: 'suspended' });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      mockDataSource.manager.findOne.mockResolvedValue(senderWallet);

      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 100,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject when recipient wallet is inactive', async () => {
      // Arrange
      const sender = createTestUser({ id: senderUserId });
      (sender as any).kycStatus = 'verified';
      const recipient = createTestUser({ id: recipientId, phone: recipientPhone });
      const senderWallet = createTestWallet({ userId: senderUserId, balance: 500 });
      const recipientWallet = createTestWallet({ userId: recipientId, balance: 100, status: 'frozen' });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      mockDataSource.manager.findOne.mockImplementation(async (entity, options) => {
        if (options?.where?.userId === senderUserId) {
          return senderWallet;
        }
        if (options?.where?.userId === recipientId) {
          return recipientWallet;
        }
        return null;
      });

      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 100,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when sender wallet not found', async () => {
      // Arrange
      const sender = createTestUser({ id: senderUserId });
      (sender as any).kycStatus = 'verified';
      const recipient = createTestUser({ id: recipientId, phone: recipientPhone });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      mockDataSource.manager.findOne.mockResolvedValue(null);

      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 100,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when recipient wallet not found', async () => {
      // Arrange
      const sender = createTestUser({ id: senderUserId });
      (sender as any).kycStatus = 'verified';
      const recipient = createTestUser({ id: recipientId, phone: recipientPhone });
      const senderWallet = createTestWallet({ userId: senderUserId, balance: 500 });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      mockDataSource.manager.findOne.mockImplementation(async (entity, options) => {
        if (options?.where?.userId === senderUserId) {
          return senderWallet;
        }
        return null; // Recipient wallet not found
      });

      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 100,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Edge cases', () => {
    it('should throw NotFoundException when sender user not found', async () => {
      // Arrange
      const recipient = createTestUser({ id: recipientId, phone: recipientPhone });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(null);

      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 100,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
      await expect(useCase.execute(input)).rejects.toThrow('User not found');
    });

    it('should use default currency when not specified', async () => {
      // Arrange
      const sender = createTestUser({ id: senderUserId, kycStatus: 'approved' });
      const recipient = createTestUser({ id: recipientId, phone: recipientPhone });
      const senderWallet = createTestWallet({ userId: senderUserId, balance: 500 });
      const recipientWallet = createTestWallet({ userId: recipientId, balance: 100 });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);

      mockDataSource.manager.findOne
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet);

      const input: InternalTransferInput = {
        fromUserId: senderUserId,
        toPhone: recipientPhone,
        amount: 100,
        // No currency specified
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.currency).toBe('USD');
    });
  });
});
