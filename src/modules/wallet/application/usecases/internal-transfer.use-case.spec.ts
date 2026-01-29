import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm';
import { InternalTransferUseCase } from './internal-transfer.use-case';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';
import { UserRepository } from '../../../user/infrastructure/repositories/user.repository';
import { PAYMENT_GATEWAY } from '../../../shared/domain/gateways';
import { CacheInvalidationService } from '../../../shared/infrastructure/services';
import { BlnkLedgerAdapter } from '../../../providers/blnk/adapters';
import {
  createMockRepository,
  createMockDataSource,
  createMockPaymentGateway,
  createTestUser,
  createTestWallet,
  MockDataSource,
  MockEntityManager,
} from '../../../../test/helpers/test-utils';

describe('InternalTransferUseCase', () => {
  let useCase: InternalTransferUseCase;
  let walletRepository: ReturnType<typeof createMockRepository>;
  let transactionRepository: ReturnType<typeof createMockRepository>;
  let userRepository: ReturnType<typeof createMockRepository>;
  let dataSource: MockDataSource;
  let paymentGateway: ReturnType<typeof createMockPaymentGateway>;
  let cacheInvalidationService: jest.Mocked<CacheInvalidationService>;
  let blnkLedgerAdapter: jest.Mocked<BlnkLedgerAdapter>;
  let mockManager: MockEntityManager;

  const senderId = 'sender-user-id';
  const recipientId = 'recipient-user-id';
  const senderPhone = '+2250123456789';
  const recipientPhone = '+2250987654321';

  beforeEach(async () => {
    walletRepository = createMockRepository();
    transactionRepository = createMockRepository();
    userRepository = createMockRepository();
    dataSource = createMockDataSource();
    paymentGateway = createMockPaymentGateway();
    mockManager = dataSource.manager;

    cacheInvalidationService = {
      invalidateBalance: jest.fn().mockResolvedValue(undefined),
      invalidateMultipleBalances: jest.fn().mockResolvedValue(undefined),
      invalidateUserProfile: jest.fn().mockResolvedValue(undefined),
      invalidateRate: jest.fn().mockResolvedValue(undefined),
      clearAll: jest.fn().mockResolvedValue(undefined),
    } as any;

    blnkLedgerAdapter = {
      recordP2PTransfer: jest.fn().mockResolvedValue(undefined),
      recordDeposit: jest.fn().mockResolvedValue(undefined),
      recordWithdrawal: jest.fn().mockResolvedValue(undefined),
      recordExternalTransfer: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      voidTransaction: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalTransferUseCase,
        { provide: WalletRepository, useValue: walletRepository },
        { provide: TransactionRepository, useValue: transactionRepository },
        { provide: UserRepository, useValue: userRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: PAYMENT_GATEWAY, useValue: paymentGateway },
        {
          provide: CacheInvalidationService,
          useValue: cacheInvalidationService,
        },
        { provide: BlnkLedgerAdapter, useValue: blnkLedgerAdapter },
      ],
    }).compile();

    useCase = module.get<InternalTransferUseCase>(InternalTransferUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy path - successful internal transfer', () => {
    it('should successfully transfer funds between two users', async () => {
      // Arrange
      const sender = createTestUser({
        id: senderId,
        phone: senderPhone,
        kycStatus: 'pending',
      });
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });

      const senderWallet = createTestWallet({
        id: 'sender-wallet-id',
        userId: senderId,
        balance: 500,
        yellowCardWalletId: 'yc-sender-wallet',
        version: 1,
      });

      const recipientWallet = createTestWallet({
        id: 'recipient-wallet-id',
        userId: recipientId,
        balance: 100,
        yellowCardWalletId: 'yc-recipient-wallet',
        version: 1,
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      mockManager.findOne
        .mockResolvedValueOnce(senderWallet) // First call for sender wallet
        .mockResolvedValueOnce(recipientWallet); // Second call for recipient wallet

      paymentGateway.internalTransfer.mockResolvedValue({
        id: 'transfer-id',
        externalId: 'ext-transfer-id',
        type: 'internal',
        fromSubwalletId: 'yc-sender-wallet',
        toSubwalletId: 'yc-recipient-wallet',
        amount: 50,
        currency: 'USD',
        fee: 0,
        status: 'completed',
        createdAt: new Date(),
      });

      // Act
      const result = await useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 50,
        currency: 'USD',
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.amount).toBe(50);
      expect(result.currency).toBe('USD');
      expect(result.status).toBe('completed');
      expect(result.fee).toBe(0);
      expect(result.fromWalletId).toBe('sender-wallet-id');
      expect(result.toWalletId).toBe('recipient-wallet-id');
      expect(result.toPhone).toBe(recipientPhone);

      // Verify recipient lookup
      expect(userRepository.findByPhone).toHaveBeenCalledWith(recipientPhone);

      // Verify transfer limit check
      expect(userRepository.findById).toHaveBeenCalledWith(senderId);
      expect(transactionRepository.getDailyTransferVolume).toHaveBeenCalled();

      // Verify payment gateway called
      expect(paymentGateway.internalTransfer).toHaveBeenCalledWith({
        fromSubwalletId: 'yc-sender-wallet',
        toSubwalletId: 'yc-recipient-wallet',
        amount: 50,
        currency: 'USD',
      });

      // Verify wallets updated
      expect(mockManager.save).toHaveBeenCalledWith(senderWallet);
      expect(mockManager.save).toHaveBeenCalledWith(recipientWallet);
      expect(senderWallet.balance).toBe(450); // 500 - 50
      expect(recipientWallet.balance).toBe(150); // 100 + 50

      // Verify transactions created (saved via transaction repository, not manager)
      expect(transactionRepository.save).toHaveBeenCalledTimes(2);

      // Verify cache invalidation
      expect(
        cacheInvalidationService.invalidateMultipleBalances,
      ).toHaveBeenCalledWith([senderId, recipientId]);
    });
  });

  describe('Reject transfer below minimum amount (0.01)', () => {
    it('should throw BadRequestException for amount less than 0.01', async () => {
      // Arrange
      const input = {
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 0.005,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Minimum transfer amount is 0.01',
      );

      // Verify no recipient lookup or transfer occurred
      expect(userRepository.findByPhone).not.toHaveBeenCalled();
      expect(paymentGateway.internalTransfer).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for zero amount', async () => {
      // Arrange
      const input = {
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 0,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Amount must be greater than 0',
      );
    });

    it('should throw BadRequestException for negative amount', async () => {
      // Arrange
      const input = {
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: -50,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Amount must be greater than 0',
      );
    });
  });

  describe('Reject transfer with invalid precision', () => {
    it('should reject amount with more than 2 decimal places', async () => {
      // Arrange
      const input = {
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 50.123, // 3 decimal places
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Invalid amount precision',
      );
    });

    it('should accept amount with exactly 2 decimal places', async () => {
      // Arrange
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });
      const sender = createTestUser({ id: senderId, kycStatus: 'pending' });
      const senderWallet = createTestWallet({
        userId: senderId,
        balance: 500,
        yellowCardWalletId: 'yc-sender-wallet',
      });
      const recipientWallet = createTestWallet({
        userId: recipientId,
        balance: 100,
        yellowCardWalletId: 'yc-recipient-wallet',
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      mockManager.findOne
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet);

      // Act
      await useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 50.99, // Valid precision
      });

      // Assert
      expect(paymentGateway.internalTransfer).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 50.99 }),
      );
    });

    it('should reject non-finite amount (Infinity)', async () => {
      // Arrange
      const input = {
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: Infinity,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Invalid amount precision',
      );
    });

    it('should reject non-finite amount (NaN)', async () => {
      // Arrange
      const input = {
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: NaN,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Invalid amount precision',
      );
    });
  });

  describe('Reject self-transfer (same phone)', () => {
    it('should throw BadRequestException when sender and recipient are the same', async () => {
      // Arrange
      const sender = createTestUser({ id: senderId, phone: senderPhone });
      const senderWallet = createTestWallet({
        id: 'same-wallet-id',
        userId: senderId,
        balance: 500,
      });

      userRepository.findByPhone.mockResolvedValue(sender); // Same user
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      mockManager.findOne.mockResolvedValue(senderWallet); // Same wallet returned twice

      // Act & Assert
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: senderPhone, // Same phone as sender
          amount: 50,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: senderPhone,
          amount: 50,
        }),
      ).rejects.toThrow('Cannot transfer to yourself');

      // Verify no transfer occurred
      expect(paymentGateway.internalTransfer).not.toHaveBeenCalled();
    });
  });

  describe('Reject transfer to non-existent user (404)', () => {
    it('should throw NotFoundException when recipient not found', async () => {
      // Arrange
      userRepository.findByPhone.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow('Recipient not found. They must register first.');

      // Verify no transfer limit check occurred
      expect(userRepository.findById).not.toHaveBeenCalled();
      expect(paymentGateway.internalTransfer).not.toHaveBeenCalled();
    });
  });

  describe('Reject transfer exceeding daily limit for unverified user', () => {
    it('should reject transfer that would exceed $100 daily limit (KYC: none)', async () => {
      // Arrange
      const sender = createTestUser({
        id: senderId,
        kycStatus: 'pending', // none, pending, verified, rejected
      });
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(80); // Already transferred $80 today

      // Act & Assert - trying to transfer $50 more (total $130 > $100 limit)
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow(/Daily transfer limit exceeded/);

      // Verify no transfer occurred
      expect(paymentGateway.internalTransfer).not.toHaveBeenCalled();
    });

    it('should allow transfer within $100 daily limit for unverified user', async () => {
      // Arrange
      const sender = createTestUser({ id: senderId, kycStatus: 'pending' });
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });
      const senderWallet = createTestWallet({
        userId: senderId,
        balance: 500,
        yellowCardWalletId: 'yc-sender-wallet',
      });
      const recipientWallet = createTestWallet({
        userId: recipientId,
        balance: 100,
        yellowCardWalletId: 'yc-recipient-wallet',
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(80); // Already transferred $80
      mockManager.findOne
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet);

      // Act - transfer $20 (total $100, exactly at limit)
      const result = await useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 20,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.amount).toBe(20);
      expect(paymentGateway.internalTransfer).toHaveBeenCalled();
    });
  });

  describe('Reject transfer exceeding daily limit for verified user', () => {
    it('should reject transfer that would exceed $10,000 daily limit (KYC: verified)', async () => {
      // Arrange
      const sender = createTestUser({ id: senderId });
      // Manually set kycStatus to 'verified' to match DAILY_TRANSFER_LIMITS keys
      (sender as any).kycStatus = 'verified';
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(9500); // Already transferred $9,500

      // Act & Assert - trying to transfer $1000 more (total $10,500 > $10,000 limit)
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 1000,
        }),
      ).rejects.toThrow(/Daily transfer limit exceeded/);
    });

    it('should allow large transfers within $10,000 limit for verified user', async () => {
      // Arrange
      const sender = createTestUser({ id: senderId });
      (sender as any).kycStatus = 'verified';
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });
      const senderWallet = createTestWallet({
        userId: senderId,
        balance: 10000,
        yellowCardWalletId: 'yc-sender-wallet',
      });
      const recipientWallet = createTestWallet({
        userId: recipientId,
        balance: 100,
        yellowCardWalletId: 'yc-recipient-wallet',
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(5000); // Already transferred $5,000
      mockManager.findOne
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet);

      // Act - transfer $5,000 (total $10,000, exactly at limit)
      const result = await useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 5000,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.amount).toBe(5000);
      expect(paymentGateway.internalTransfer).toHaveBeenCalled();
    });
  });

  describe('Reject transfer with insufficient balance', () => {
    it('should throw BadRequestException when sender has insufficient balance', async () => {
      // Arrange
      const sender = createTestUser({ id: senderId, kycStatus: 'pending' });
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });
      const senderWallet = createTestWallet({
        userId: senderId,
        balance: 30, // Only $30 available
        yellowCardWalletId: 'yc-sender-wallet',
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      mockManager.findOne.mockResolvedValue(senderWallet);

      // Act & Assert - trying to transfer $50 but only has $30
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow('Insufficient balance');

      // Verify no transfer occurred
      expect(paymentGateway.internalTransfer).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when sender wallet not found', async () => {
      // Arrange
      const sender = createTestUser({ id: senderId, kycStatus: 'pending' });
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      mockManager.findOne.mockResolvedValue(null); // Wallet not found

      // Act & Assert
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow('Sender wallet not found');
    });

    it('should throw BadRequestException when sender wallet is not active', async () => {
      // Arrange
      const sender = createTestUser({ id: senderId, kycStatus: 'pending' });
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });
      const senderWallet = createTestWallet({
        userId: senderId,
        balance: 500,
        status: 'suspended', // Wallet suspended
        yellowCardWalletId: 'yc-sender-wallet',
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      mockManager.findOne.mockResolvedValue(senderWallet);

      // Act & Assert
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow('Sender wallet is not active');
    });

    it('should throw BadRequestException when recipient wallet is not active', async () => {
      // Arrange
      const sender = createTestUser({ id: senderId, kycStatus: 'pending' });
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });
      const senderWallet = createTestWallet({
        userId: senderId,
        balance: 500,
        yellowCardWalletId: 'yc-sender-wallet',
      });
      const recipientWallet = createTestWallet({
        userId: recipientId,
        balance: 100,
        status: 'suspended', // Recipient wallet suspended
        yellowCardWalletId: 'yc-recipient-wallet',
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      // Setup to return sender wallet on first call, recipient wallet on second for EACH execute call
      mockManager.findOne.mockImplementation(async () => {
        const currentCalls = mockManager.findOne.mock.calls.length;
        // Odd calls (1st, 3rd, 5th) return sender wallet
        // Even calls (2nd, 4th, 6th) return recipient wallet
        if (currentCalls % 2 === 1) return senderWallet;
        return recipientWallet;
      });

      // Act & Assert
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow('Recipient wallet is not active');
    });

    it('should throw NotFoundException when recipient wallet not found', async () => {
      // Arrange
      const sender = createTestUser({ id: senderId, kycStatus: 'pending' });
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });
      const senderWallet = createTestWallet({
        userId: senderId,
        balance: 500,
        yellowCardWalletId: 'yc-sender-wallet',
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      // Setup to return sender wallet on odd calls, null on even calls (recipient not found)
      mockManager.findOne.mockImplementation(async () => {
        const currentCalls = mockManager.findOne.mock.calls.length;
        // Odd calls (1st, 3rd, 5th) return sender wallet
        // Even calls (2nd, 4th, 6th) return null (recipient not found)
        if (currentCalls % 2 === 1) return senderWallet;
        return null; // Recipient wallet not found
      });

      // Act & Assert
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow('Recipient wallet not found');
    });
  });

  describe('Handle optimistic locking conflict with retry', () => {
    it('should retry on OptimisticLockVersionMismatchError and succeed', async () => {
      // Arrange
      const sender = createTestUser({ id: senderId, kycStatus: 'pending' });
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });
      const senderWallet = createTestWallet({
        userId: senderId,
        balance: 500,
        yellowCardWalletId: 'yc-sender-wallet',
        version: 1,
      });
      const recipientWallet = createTestWallet({
        userId: recipientId,
        balance: 100,
        yellowCardWalletId: 'yc-recipient-wallet',
        version: 1,
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      let attemptCount = 0;
      dataSource.transaction.mockImplementation(async (callback) => {
        attemptCount++;

        if (attemptCount === 1) {
          // First attempt - throw optimistic lock error
          mockManager.findOne
            .mockResolvedValueOnce(senderWallet)
            .mockResolvedValueOnce(recipientWallet);
          mockManager.save.mockRejectedValueOnce(
            new OptimisticLockVersionMismatchError('WalletOrmEntity', 1, 2),
          );
          return callback(mockManager);
        } else {
          // Second attempt - succeed
          const freshSenderWallet = createTestWallet({
            userId: senderId,
            balance: 500,
            yellowCardWalletId: 'yc-sender-wallet',
            version: 2, // Version incremented
          });
          const freshRecipientWallet = createTestWallet({
            userId: recipientId,
            balance: 100,
            yellowCardWalletId: 'yc-recipient-wallet',
            version: 2,
          });

          mockManager.findOne
            .mockResolvedValueOnce(freshSenderWallet)
            .mockResolvedValueOnce(freshRecipientWallet);
          mockManager.save.mockResolvedValue(undefined);
          return callback(mockManager);
        }
      });

      // Act
      const result = await useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 50,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.amount).toBe(50);
      expect(dataSource.transaction).toHaveBeenCalledTimes(2); // Called twice (1 failed + 1 success)
    });

    it('should retry on error with "version" in message and succeed', async () => {
      // Arrange
      const sender = createTestUser({ id: senderId, kycStatus: 'pending' });
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });
      const senderWallet = createTestWallet({
        userId: senderId,
        balance: 500,
        yellowCardWalletId: 'yc-sender-wallet',
      });
      const recipientWallet = createTestWallet({
        userId: recipientId,
        balance: 100,
        yellowCardWalletId: 'yc-recipient-wallet',
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      let attemptCount = 0;
      dataSource.transaction.mockImplementation(async (callback) => {
        attemptCount++;

        if (attemptCount === 1) {
          mockManager.findOne
            .mockResolvedValueOnce(senderWallet)
            .mockResolvedValueOnce(recipientWallet);
          const versionError = new Error('Database version conflict detected');
          mockManager.save.mockRejectedValueOnce(versionError);
          return callback(mockManager);
        } else {
          mockManager.findOne
            .mockResolvedValueOnce(senderWallet)
            .mockResolvedValueOnce(recipientWallet);
          mockManager.save.mockResolvedValue(undefined);
          return callback(mockManager);
        }
      });

      // Act
      const result = await useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 50,
      });

      // Assert
      expect(result).toBeDefined();
      expect(dataSource.transaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('Fail after max retries on persistent conflict', () => {
    it('should throw ConflictException after 3 failed retry attempts', async () => {
      // Arrange
      const sender = createTestUser({ id: senderId, kycStatus: 'pending' });
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });
      const senderWallet = createTestWallet({
        userId: senderId,
        balance: 500,
        yellowCardWalletId: 'yc-sender-wallet',
      });
      const recipientWallet = createTestWallet({
        userId: recipientId,
        balance: 100,
        yellowCardWalletId: 'yc-recipient-wallet',
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      // All attempts fail with optimistic lock error
      dataSource.transaction.mockImplementation(async (callback) => {
        mockManager.findOne
          .mockResolvedValueOnce(senderWallet)
          .mockResolvedValueOnce(recipientWallet);
        mockManager.save.mockRejectedValue(
          new OptimisticLockVersionMismatchError('WalletOrmEntity', 1, 2),
        );
        return callback(mockManager);
      });

      // Act & Assert
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow(ConflictException);
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow(
        'Transfer failed due to concurrent modification. Please try again.',
      );

      // Verify it tried 3 times (max retries)
      expect(dataSource.transaction).toHaveBeenCalledTimes(6); // 3 retries x 2 calls
    });

    it('should not retry on non-version-related errors', async () => {
      // Arrange
      const sender = createTestUser({ id: senderId, kycStatus: 'pending' });
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });
      const senderWallet = createTestWallet({
        userId: senderId,
        balance: 500,
        yellowCardWalletId: 'yc-sender-wallet',
      });
      const recipientWallet = createTestWallet({
        userId: recipientId,
        balance: 100,
        yellowCardWalletId: 'yc-recipient-wallet',
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      dataSource.transaction.mockImplementation(async (callback) => {
        mockManager.findOne
          .mockResolvedValueOnce(senderWallet)
          .mockResolvedValueOnce(recipientWallet);
        // Non-version error - should not retry
        mockManager.save.mockRejectedValue(
          new Error('Database connection failed'),
        );
        return callback(mockManager);
      });

      // Act & Assert
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow('Database connection failed');

      // Verify it only tried once (no retry)
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Additional edge cases', () => {
    it('should throw NotFoundException when sender user not found during limit check', async () => {
      // Arrange
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(null); // Sender not found

      // Act & Assert
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 50,
        }),
      ).rejects.toThrow('User not found');
    });

    it('should reject all transfers for users with rejected KYC', async () => {
      // Arrange
      const sender = createTestUser({ id: senderId, kycStatus: 'rejected' });
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      // Act & Assert
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 0.01, // Even minimum amount
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        useCase.execute({
          fromUserId: senderId,
          toPhone: recipientPhone,
          amount: 0.01,
        }),
      ).rejects.toThrow(/Transfers are disabled.*KYC status/);
    });

    it('should use default currency USD when not specified', async () => {
      // Arrange
      const sender = createTestUser({ id: senderId, kycStatus: 'pending' });
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });
      const senderWallet = createTestWallet({
        userId: senderId,
        balance: 500,
        yellowCardWalletId: 'yc-sender-wallet',
      });
      const recipientWallet = createTestWallet({
        userId: recipientId,
        balance: 100,
        yellowCardWalletId: 'yc-recipient-wallet',
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      mockManager.findOne
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet);

      // Act
      const result = await useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 50,
        // No currency specified
      });

      // Assert
      expect(result.currency).toBe('USD');
      expect(paymentGateway.internalTransfer).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'USD' }),
      );
    });

    it('should check daily limit using correct date (start of day)', async () => {
      // Arrange
      const sender = createTestUser({ id: senderId, kycStatus: 'pending' });
      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });
      const senderWallet = createTestWallet({
        userId: senderId,
        balance: 500,
        yellowCardWalletId: 'yc-sender-wallet',
      });
      const recipientWallet = createTestWallet({
        userId: recipientId,
        balance: 100,
        yellowCardWalletId: 'yc-recipient-wallet',
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      mockManager.findOne
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet);

      // Act
      await useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 50,
      });

      // Assert
      const callArgs =
        transactionRepository.getDailyTransferVolume.mock.calls[0];
      const todayStart = callArgs[1];
      expect(todayStart.getHours()).toBe(0);
      expect(todayStart.getMinutes()).toBe(0);
      expect(todayStart.getSeconds()).toBe(0);
      expect(todayStart.getMilliseconds()).toBe(0);
    });

    it('should create both sender and recipient transaction records', async () => {
      // Arrange
      const sender = createTestUser({
        id: senderId,
        phone: senderPhone,
        kycStatus: 'pending',
      });
      sender.firstName = 'John';
      sender.lastName = 'Doe';

      const recipient = createTestUser({
        id: recipientId,
        phone: recipientPhone,
      });
      recipient.firstName = 'Jane';
      recipient.lastName = 'Smith';

      const senderWallet = createTestWallet({
        id: 'sender-wallet-id',
        userId: senderId,
        balance: 500,
        yellowCardWalletId: 'yc-sender-wallet',
      });
      const recipientWallet = createTestWallet({
        id: 'recipient-wallet-id',
        userId: recipientId,
        balance: 100,
        yellowCardWalletId: 'yc-recipient-wallet',
      });

      userRepository.findByPhone.mockResolvedValue(recipient);
      userRepository.findById.mockResolvedValue(sender);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      mockManager.findOne
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet);

      paymentGateway.internalTransfer.mockResolvedValue({
        id: 'payment-transfer-id',
        externalId: 'ext-transfer-id',
        type: 'internal',
        fromSubwalletId: 'yc-sender-wallet',
        toSubwalletId: 'yc-recipient-wallet',
        amount: 50,
        currency: 'USD',
        fee: 0,
        status: 'completed',
        createdAt: new Date(),
      });

      // Act
      await useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 50,
      });

      // Assert
      expect(transactionRepository.save).toHaveBeenCalledTimes(2);

      // Verify sender transaction (debit)
      const senderTxCall = transactionRepository.save.mock.calls[0][0] as any;
      expect(senderTxCall.walletId).toBe('sender-wallet-id');
      expect(senderTxCall.amount).toBe(-50); // Negative for debit
      expect(senderTxCall.type).toBe('transfer_internal');
      expect(senderTxCall.status).toBe('completed');
      expect(senderTxCall.recipientWalletId).toBe('recipient-wallet-id');
      expect(senderTxCall.recipientPhone).toBe(recipientPhone);

      // Verify recipient transaction (credit)
      const recipientTxCall = transactionRepository.save.mock
        .calls[1][0] as any;
      expect(recipientTxCall.walletId).toBe('recipient-wallet-id');
      expect(recipientTxCall.amount).toBe(50); // Positive for credit
      expect(recipientTxCall.type).toBe('transfer_internal');
      expect(recipientTxCall.status).toBe('completed');
    });
  });
});
