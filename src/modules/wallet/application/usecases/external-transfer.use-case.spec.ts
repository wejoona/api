import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, OptimisticLockVersionMismatchError } from 'typeorm';
import { ExternalTransferUseCase, ExternalTransferInput } from './external-transfer.use-case';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';
import { UserRepository } from '../../../user/infrastructure/repositories/user.repository';
import { CacheInvalidationService } from '../../../shared/infrastructure/services/cache-invalidation.service';
import { TransactionRiskService } from '../../../risk/application/services/transaction-risk.service';
import { PAYMENT_GATEWAY, IPaymentGateway } from '../../../shared/domain/gateways';
import {
  createMockRepository,
  createMockPaymentGateway,
  createMockDataSource,
  createTestUser,
  createTestWallet,
  MockDataSource,
} from '../../../../test/helpers/test-utils';

describe('ExternalTransferUseCase', () => {
  let useCase: ExternalTransferUseCase;
  let walletRepository: ReturnType<typeof createMockRepository>;
  let transactionRepository: ReturnType<typeof createMockRepository>;
  let userRepository: ReturnType<typeof createMockRepository>;
  let mockDataSource: MockDataSource;
  let paymentGateway: jest.Mocked<IPaymentGateway>;
  let cacheInvalidationService: jest.Mocked<CacheInvalidationService>;
  let riskService: any;

  const userId = 'user-id';
  const validAddress = '0x' + 'a'.repeat(40); // Valid lowercase Ethereum address
  const validChecksumAddress = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'; // Valid EIP-55 checksum address

  beforeEach(async () => {
    walletRepository = createMockRepository();
    transactionRepository = createMockRepository();
    userRepository = createMockRepository();
    mockDataSource = createMockDataSource();
    paymentGateway = createMockPaymentGateway();
    cacheInvalidationService = {
      invalidateBalance: jest.fn().mockResolvedValue(undefined),
      invalidateUserProfile: jest.fn().mockResolvedValue(undefined),
      invalidateRate: jest.fn().mockResolvedValue(undefined),
      invalidateMultipleBalances: jest.fn().mockResolvedValue(undefined),
      clearAll: jest.fn().mockResolvedValue(undefined),
    } as any;
    riskService = {
      assessTransaction: jest.fn().mockResolvedValue({
        riskScore: 10,
        riskLevel: 'low',
        factors: [],
        requiresReview: false,
        requiresStepUp: false,
      }),
      recordTransactionOutcome: jest.fn().mockResolvedValue(undefined),
      isAddressSafe: jest.fn().mockResolvedValue({
        safe: true,
        reason: null,
        riskSignals: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalTransferUseCase,
        { provide: WalletRepository, useValue: walletRepository },
        { provide: TransactionRepository, useValue: transactionRepository },
        { provide: UserRepository, useValue: userRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: PAYMENT_GATEWAY, useValue: paymentGateway },
        { provide: CacheInvalidationService, useValue: cacheInvalidationService },
        { provide: TransactionRiskService, useValue: riskService },
      ],
    }).compile();

    useCase = module.get<ExternalTransferUseCase>(ExternalTransferUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Valid external transfer with fee calculation', () => {
    it('should successfully execute external transfer with 0.5% fee', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified'; // Use 'verified' to match DAILY_TRANSFER_LIMITS
      const wallet = createTestWallet({ userId, balance: 1000 });

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);
      transactionRepository.update.mockResolvedValue(undefined);

      mockDataSource.manager.findOne.mockResolvedValue(wallet);

      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 100,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.amount).toBe(100);
      expect(result.fee).toBe(0.5); // 0.5% of 100
      expect(result.toAddress).toBe(validAddress);
      expect(paymentGateway.externalTransfer).toHaveBeenCalled();
    });

    it('should calculate fee correctly (0.5% rounded up)', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified';
      const wallet = createTestWallet({ userId, balance: 1000 });

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);
      transactionRepository.update.mockResolvedValue(undefined);

      mockDataSource.manager.findOne.mockResolvedValue(wallet);

      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 99,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      // 99 * 0.005 = 0.495, rounded up to 0.50
      expect(result.fee).toBe(0.5);
    });
  });

  describe('Validate Ethereum address format', () => {
    it('should accept valid lowercase Ethereum address', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified';
      const wallet = createTestWallet({ userId, balance: 1000 });

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);
      transactionRepository.update.mockResolvedValue(undefined);

      mockDataSource.manager.findOne.mockResolvedValue(wallet);

      const input: ExternalTransferInput = {
        userId,
        toAddress: '0x' + 'a'.repeat(40),
        amount: 100,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result).toBeDefined();
    });

    it('should accept valid uppercase Ethereum address', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified';
      const wallet = createTestWallet({ userId, balance: 1000 });

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);
      transactionRepository.update.mockResolvedValue(undefined);

      mockDataSource.manager.findOne.mockResolvedValue(wallet);

      const input: ExternalTransferInput = {
        userId,
        toAddress: '0x' + 'A'.repeat(40),
        amount: 100,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result).toBeDefined();
    });

    it('should reject address without 0x prefix', async () => {
      const input: ExternalTransferInput = {
        userId,
        toAddress: 'a'.repeat(40),
        amount: 100,
      };

      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow('Invalid wallet address format');
    });

    it('should reject address with wrong length (too short)', async () => {
      const input: ExternalTransferInput = {
        userId,
        toAddress: '0x' + 'a'.repeat(38),
        amount: 100,
      };

      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow('Invalid wallet address format');
    });

    it('should reject address with wrong length (too long)', async () => {
      const input: ExternalTransferInput = {
        userId,
        toAddress: '0x' + 'a'.repeat(42),
        amount: 100,
      };

      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow('Invalid wallet address format');
    });

    it('should reject address with invalid hex characters', async () => {
      const input: ExternalTransferInput = {
        userId,
        toAddress: '0x' + 'g'.repeat(40),
        amount: 100,
      };

      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow('Invalid wallet address format');
    });
  });

  describe('Validate EIP-55 checksum for mixed-case addresses', () => {
    // Note: The EIP-55 validation in the use case uses SHA3-256 which is not exactly keccak256.
    // In a real implementation, you'd use ethers.js or web3.js for proper validation.
    // These tests document the current behavior.

    it('should accept all-lowercase addresses (no checksum required)', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified';
      const wallet = createTestWallet({ userId, balance: 1000 });

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);
      transactionRepository.update.mockResolvedValue(undefined);

      mockDataSource.manager.findOne.mockResolvedValue(wallet);

      // Lowercase address bypasses EIP-55 checksum validation
      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress, // all lowercase
        amount: 100,
      };

      // Act - should not throw
      const result = await useCase.execute(input);

      // Assert
      expect(result).toBeDefined();
    });

    it('should accept all-uppercase addresses (no checksum required)', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified';
      const wallet = createTestWallet({ userId, balance: 1000 });

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);
      transactionRepository.update.mockResolvedValue(undefined);

      mockDataSource.manager.findOne.mockResolvedValue(wallet);

      // Uppercase address bypasses EIP-55 checksum validation
      const input: ExternalTransferInput = {
        userId,
        toAddress: '0x' + 'A'.repeat(40),
        amount: 100,
      };

      // Act - should not throw
      const result = await useCase.execute(input);

      // Assert
      expect(result).toBeDefined();
    });

    it('should reject mixed-case addresses with invalid checksum', async () => {
      // Mixed case addresses require valid EIP-55 checksum
      // This tests that random mixed-case is rejected
      const input: ExternalTransferInput = {
        userId,
        toAddress: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAeD', // Last char changed
        amount: 100,
      };

      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow('Invalid wallet address format');
    });
  });

  describe('Reject amount constraints', () => {
    it('should reject amount < $1', async () => {
      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 0.5,
      };

      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow('Minimum transfer amount is $1');
    });

    it('should reject amount > $10,000', async () => {
      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 10001,
      };

      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow('Maximum transfer amount is $10000');
    });

    it('should reject amount <= 0', async () => {
      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 0,
      };

      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow('Amount must be greater than 0');
    });

    it('should reject amount with more than 2 decimal places', async () => {
      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 100.123,
      };

      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow('Invalid amount precision');
    });

    it('should accept minimum amount of $1', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified';
      const wallet = createTestWallet({ userId, balance: 1000 });

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);
      transactionRepository.update.mockResolvedValue(undefined);

      mockDataSource.manager.findOne.mockResolvedValue(wallet);

      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 1,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.amount).toBe(1);
    });

    it('should accept maximum amount of $10,000', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified';
      const wallet = createTestWallet({ userId, balance: 20000 });

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);
      transactionRepository.update.mockResolvedValue(undefined);

      mockDataSource.manager.findOne.mockResolvedValue(wallet);

      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 10000,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.amount).toBe(10000);
    });
  });

  describe('Enforce KYC daily limits', () => {
    it('should enforce $100 daily limit for unverified users', async () => {
      // Arrange
      const user = createTestUser({ id: userId, kycStatus: 'pending' });

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(50);

      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 60, // Would exceed $100 limit
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow(/Daily transfer limit exceeded/);
    });

    it('should enforce $10,000 daily limit for verified users', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified';
      const wallet = createTestWallet({ userId, balance: 15000 });

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(9500);
      transactionRepository.save.mockImplementation(async (tx) => tx);
      transactionRepository.update.mockResolvedValue(undefined);

      mockDataSource.manager.findOne.mockResolvedValue(wallet);

      // This should succeed (9500 + 500 = 10000, exactly at limit)
      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 500,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.amount).toBe(500);
    });

    it('should block all transfers for rejected KYC', async () => {
      // Arrange
      const user = createTestUser({ id: userId, kycStatus: 'rejected' });

      userRepository.findById.mockResolvedValue(user);

      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 5,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Transfers are disabled. Please contact support regarding your KYC status.',
      );
    });
  });

  describe('Handle transfer failure with automatic refund', () => {
    it('should refund on payment gateway failure', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified';
      const wallet = createTestWallet({ userId, balance: 1000 });

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);
      transactionRepository.update.mockResolvedValue(undefined);

      mockDataSource.manager.findOne.mockResolvedValue(wallet);
      mockDataSource.manager.save.mockImplementation((entity) => Promise.resolve(entity));

      // Payment gateway fails
      paymentGateway.externalTransfer.mockRejectedValue(new Error('Network error'));

      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 100,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Transfer failed. Your funds have been refunded. Please try again later.',
      );

      // Verify refund was attempted (wallet balance restored)
      expect(transactionRepository.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: 'failed',
          metadata: expect.objectContaining({
            refunded: true,
          }),
        }),
      );
    });
  });

  describe('Three-phase commit: reserve -> execute -> finalize/refund', () => {
    it('should follow three-phase commit for successful transfer', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified';
      const wallet = createTestWallet({ userId, balance: 1000 });

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);
      transactionRepository.update.mockResolvedValue(undefined);

      mockDataSource.manager.findOne.mockResolvedValue(wallet);

      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 100,
      };

      // Act
      await useCase.execute(input);

      // Assert
      // Phase 1: Reserve - transaction saved with 'pending' status
      expect(transactionRepository.save).toHaveBeenCalled();

      // Phase 2: Execute - external transfer called
      expect(paymentGateway.externalTransfer).toHaveBeenCalled();

      // Phase 3: Finalize - transaction updated to 'completed'
      expect(transactionRepository.update).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: 'completed',
        }),
      );
    });
  });

  describe('Handle optimistic lock conflicts', () => {
    it('should retry on optimistic lock conflict during fund reservation', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified';
      const wallet = createTestWallet({ userId, balance: 1000 });

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);
      transactionRepository.update.mockResolvedValue(undefined);

      let callCount = 0;
      mockDataSource.transaction.mockImplementation(async (callback) => {
        callCount++;
        if (callCount === 1) {
          throw new OptimisticLockVersionMismatchError('WalletOrmEntity', 1, 2);
        }
        mockDataSource.manager.findOne.mockResolvedValue(wallet);
        return callback(mockDataSource.manager);
      });

      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 100,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result).toBeDefined();
      expect(callCount).toBe(2);
    });

    it('should throw ConflictException after max retries', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified';

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      mockDataSource.transaction.mockRejectedValue(
        new OptimisticLockVersionMismatchError('WalletOrmEntity', 1, 2),
      );

      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 100,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
      await expect(useCase.execute(input)).rejects.toThrow(
        'Transfer failed due to concurrent modification. Please try again.',
      );
    });
  });

  describe('Wallet validation', () => {
    it('should throw NotFoundException when wallet not found', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified';

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      mockDataSource.manager.findOne.mockResolvedValue(null);

      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 100,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
      await expect(useCase.execute(input)).rejects.toThrow('Wallet not found');
    });

    it('should throw BadRequestException when wallet is not active', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified';
      const wallet = createTestWallet({ userId, balance: 1000, status: 'suspended' });

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      mockDataSource.manager.findOne.mockResolvedValue(wallet);

      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 100,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow('Wallet is not active');
    });

    it('should throw BadRequestException for insufficient balance (including fee)', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified';
      const wallet = createTestWallet({ userId, balance: 100 }); // Exact amount without fee

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);

      mockDataSource.manager.findOne.mockResolvedValue(wallet);

      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 100, // Fee would be 0.50, total 100.50
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
      await expect(useCase.execute(input)).rejects.toThrow(/Insufficient balance/);
    });
  });

  describe('User validation', () => {
    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      userRepository.findById.mockResolvedValue(null);

      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 100,
      };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
      await expect(useCase.execute(input)).rejects.toThrow('User not found');
    });
  });

  describe('Default values', () => {
    it('should use default currency (USD) when not specified', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified';
      const wallet = createTestWallet({ userId, balance: 1000 });

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);
      transactionRepository.update.mockResolvedValue(undefined);

      mockDataSource.manager.findOne.mockResolvedValue(wallet);

      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 100,
      };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.currency).toBe('USD');
    });

    it('should use default network (polygon) when not specified', async () => {
      // Arrange
      const user = createTestUser({ id: userId });
      (user as any).kycStatus = 'verified';
      const wallet = createTestWallet({ userId, balance: 1000 });

      userRepository.findById.mockResolvedValue(user);
      transactionRepository.getDailyTransferVolume.mockResolvedValue(0);
      transactionRepository.save.mockImplementation(async (tx) => tx);
      transactionRepository.update.mockResolvedValue(undefined);

      mockDataSource.manager.findOne.mockResolvedValue(wallet);

      const input: ExternalTransferInput = {
        userId,
        toAddress: validAddress,
        amount: 100,
      };

      // Act
      await useCase.execute(input);

      // Assert
      expect(paymentGateway.externalTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          network: 'polygon',
        }),
      );
    });
  });
});
