import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReconciliationService } from '../reconciliation.service';
import {
  IReconciliationProvider,
  RECONCILIATION_PROVIDER,
  ILedgerProvider,
  LEDGER_PROVIDER,
  IWalletProvider,
  WALLET_PROVIDER,
} from '@modules/providers/interfaces';
import {
  IWalletRepository,
  WALLET_REPOSITORY,
} from '@modules/wallet/domain/repositories/wallet.repository';
import { WalletEntity } from '@modules/wallet/domain/entities/wallet.entity';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let mockReconciliationProvider: jest.Mocked<IReconciliationProvider>;
  let mockLedgerProvider: jest.Mocked<ILedgerProvider>;
  let mockWalletProvider: jest.Mocked<IWalletProvider>;
  let mockWalletRepository: jest.Mocked<IWalletRepository>;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    // Create mocks
    mockReconciliationProvider = {
      uploadExternalData: jest.fn(),
      createMatchingRule: jest.fn(),
      runReconciliation: jest.fn(),
    } as any;

    mockLedgerProvider = {
      getUserBalance: jest.fn(),
      initialize: jest.fn(),
      createUserBalance: jest.fn(),
      getAvailableBalance: jest.fn(),
      recordDeposit: jest.fn(),
      recordWithdrawal: jest.fn(),
      recordP2PTransfer: jest.fn(),
      recordExternalTransfer: jest.fn(),
      commitTransaction: jest.fn(),
      voidTransaction: jest.fn(),
      getTransactionByReference: jest.fn(),
      getUserTransactionHistory: jest.fn(),
    } as any;

    mockWalletProvider = {
      providerName: 'circle',
      createWallet: jest.fn(),
      getWallet: jest.fn(),
      getBalance: jest.fn(),
      getDepositAddress: jest.fn(),
      listWallets: jest.fn(),
    } as any;

    mockWalletRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByYellowCardWalletId: jest.fn(),
      findByCircleWalletId: jest.fn(),
      findByProviderWalletId: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        {
          provide: RECONCILIATION_PROVIDER,
          useValue: mockReconciliationProvider,
        },
        {
          provide: LEDGER_PROVIDER,
          useValue: mockLedgerProvider,
        },
        {
          provide: WALLET_PROVIDER,
          useValue: mockWalletProvider,
        },
        {
          provide: WALLET_REPOSITORY,
          useValue: mockWalletRepository,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reconcileUserBalance', () => {
    it('should reconcile when all balances match', async () => {
      // Arrange
      const userId = 'user-123';
      const wallet = WalletEntity.create({ userId });
      wallet.linkToCircle('circle-wallet-123');
      wallet.credit(100); // Set DB balance to 100 USDC to match Blnk and Circle

      const balance = 100_000_000n; // 100 USDC

      mockWalletRepository.findByUserId.mockResolvedValue(wallet);
      mockLedgerProvider.getUserBalance.mockResolvedValue({
        balanceId: 'balance-123',
        userId,
        currency: 'USDC',
        balance,
        creditBalance: 0n,
        debitBalance: 0n,
        inflightBalance: 0n,
        availableBalance: balance,
      });
      mockWalletProvider.getBalance.mockResolvedValue([
        {
          currency: 'USDC',
          available: '100.000000',
          pending: '0',
          total: '100.000000',
        },
      ]);

      // Act
      const report = await service.reconcileUserBalance(userId);

      // Assert
      expect(report.isReconciled).toBe(true);
      expect(report.blnkBalance).toBe('100.000000');
      expect(report.databaseBalance).toBe('100.000000'); // All three match at 100 USDC
      expect(report.circleBalance).toBe('100.000000');
      expect(report.discrepancy).toBeUndefined();
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        'reconciliation.balance.discrepancy',
        expect.anything(),
      );
    });

    it('should detect low severity discrepancy', async () => {
      // Arrange
      const userId = 'user-123';
      const wallet = WalletEntity.create({ userId });
      wallet.linkToCircle('circle-wallet-123');
      wallet.credit(100); // Set DB balance to 100 USDC

      mockWalletRepository.findByUserId.mockResolvedValue(wallet);
      mockLedgerProvider.getUserBalance.mockResolvedValue({
        balanceId: 'balance-123',
        userId,
        currency: 'USDC',
        balance: 100_005_000n, // 100.005 USDC (0.005 difference)
        creditBalance: 0n,
        debitBalance: 0n,
        inflightBalance: 0n,
        availableBalance: 100_005_000n,
      });
      mockWalletProvider.getBalance.mockResolvedValue([
        {
          currency: 'USDC',
          available: '100.000000',
          pending: '0',
          total: '100.000000',
        },
      ]);

      // Act
      const report = await service.reconcileUserBalance(userId);

      // Assert
      expect(report.isReconciled).toBe(false);
      expect(report.discrepancy).toBeDefined();
      expect(report.discrepancy?.severity).toBe('low');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'reconciliation.balance.discrepancy',
        expect.anything(),
      );
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        'reconciliation.balance.critical',
        expect.anything(),
      );
    });

    it('should detect medium severity discrepancy', async () => {
      // Arrange
      const userId = 'user-123';
      const wallet = WalletEntity.create({ userId });
      wallet.linkToCircle('circle-wallet-123');
      wallet.credit(100); // 100 USDC

      mockWalletRepository.findByUserId.mockResolvedValue(wallet);
      mockLedgerProvider.getUserBalance.mockResolvedValue({
        balanceId: 'balance-123',
        userId,
        currency: 'USDC',
        balance: 100_050_000n, // 100.05 USDC (0.05 difference = medium)
        creditBalance: 0n,
        debitBalance: 0n,
        inflightBalance: 0n,
        availableBalance: 100_050_000n,
      });
      mockWalletProvider.getBalance.mockResolvedValue([
        {
          currency: 'USDC',
          available: '100.000000',
          pending: '0',
          total: '100.000000',
        },
      ]);

      // Act
      const report = await service.reconcileUserBalance(userId);

      // Assert
      expect(report.isReconciled).toBe(false);
      expect(report.discrepancy?.severity).toBe('medium');
    });

    it('should detect high severity discrepancy', async () => {
      // Arrange
      const userId = 'user-123';
      const wallet = WalletEntity.create({ userId });
      wallet.linkToCircle('circle-wallet-123');
      wallet.credit(100); // 100 USDC

      mockWalletRepository.findByUserId.mockResolvedValue(wallet);
      mockLedgerProvider.getUserBalance.mockResolvedValue({
        balanceId: 'balance-123',
        userId,
        currency: 'USDC',
        balance: 100_500_000n, // 100.50 USDC (0.50 difference = high)
        creditBalance: 0n,
        debitBalance: 0n,
        inflightBalance: 0n,
        availableBalance: 100_500_000n,
      });
      mockWalletProvider.getBalance.mockResolvedValue([
        {
          currency: 'USDC',
          available: '100.000000',
          pending: '0',
          total: '100.000000',
        },
      ]);

      // Act
      const report = await service.reconcileUserBalance(userId);

      // Assert
      expect(report.isReconciled).toBe(false);
      expect(report.discrepancy?.severity).toBe('high');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'reconciliation.balance.critical',
        expect.anything(),
      );
    });

    it('should detect critical severity discrepancy', async () => {
      // Arrange
      const userId = 'user-123';
      const wallet = WalletEntity.create({ userId });
      wallet.linkToCircle('circle-wallet-123');
      wallet.credit(100); // 100 USDC

      mockWalletRepository.findByUserId.mockResolvedValue(wallet);
      mockLedgerProvider.getUserBalance.mockResolvedValue({
        balanceId: 'balance-123',
        userId,
        currency: 'USDC',
        balance: 102_000_000n, // 102 USDC (2.00 difference = critical)
        creditBalance: 0n,
        debitBalance: 0n,
        inflightBalance: 0n,
        availableBalance: 102_000_000n,
      });
      mockWalletProvider.getBalance.mockResolvedValue([
        {
          currency: 'USDC',
          available: '100.000000',
          pending: '0',
          total: '100.000000',
        },
      ]);

      // Act
      const report = await service.reconcileUserBalance(userId);

      // Assert
      expect(report.isReconciled).toBe(false);
      expect(report.discrepancy?.severity).toBe('critical');
      expect(report.discrepancy?.totalDiff).toBe('2.000000');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'reconciliation.balance.critical',
        expect.anything(),
      );
    });

    it('should handle wallet not found', async () => {
      // Arrange
      const userId = 'user-123';
      mockWalletRepository.findByUserId.mockResolvedValue(null);

      // Act
      const report = await service.reconcileUserBalance(userId);

      // Assert
      expect(report.isReconciled).toBe(false);
      expect(report.error).toBeDefined();
      expect(report.error).toContain('Wallet not found');
    });

    it('should handle Blnk API failure gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const wallet = WalletEntity.create({ userId });
      wallet.linkToCircle('circle-wallet-123');
      wallet.credit(100);

      mockWalletRepository.findByUserId.mockResolvedValue(wallet);
      mockLedgerProvider.getUserBalance.mockRejectedValue(
        new Error('Blnk API timeout'),
      );
      mockWalletProvider.getBalance.mockResolvedValue([
        {
          currency: 'USDC',
          available: '100.000000',
          pending: '0',
          total: '100.000000',
        },
      ]);

      // Act
      const report = await service.reconcileUserBalance(userId);

      // Assert
      expect(report.isReconciled).toBe(false);
      expect(report.blnkBalance).toBe('0.000000'); // Defaults to 0 on error
      expect(report.discrepancy?.severity).toBe('critical'); // 100 USDC difference
    });

    it('should handle Circle API failure gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const wallet = WalletEntity.create({ userId });
      wallet.linkToCircle('circle-wallet-123');
      wallet.credit(100);

      mockWalletRepository.findByUserId.mockResolvedValue(wallet);
      mockLedgerProvider.getUserBalance.mockResolvedValue({
        balanceId: 'balance-123',
        userId,
        currency: 'USDC',
        balance: 100_000_000n,
        creditBalance: 0n,
        debitBalance: 0n,
        inflightBalance: 0n,
        availableBalance: 100_000_000n,
      });
      mockWalletProvider.getBalance.mockRejectedValue(
        new Error('Circle API timeout'),
      );

      // Act
      const report = await service.reconcileUserBalance(userId);

      // Assert
      // When Circle API fails, it defaults to 0 which creates a discrepancy
      // Blnk=100, DB=100, Circle=0 (error) -> max diff is 100 USDC
      expect(report.circleBalance).toBe('0.000000'); // Defaults to 0 on error
      expect(report.blnkBalance).toBe('100.000000');
      expect(report.databaseBalance).toBe('100.000000');
      // Report still completes without throwing
      expect(report.userId).toBe(userId);
    });
  });

  describe('reconcileAllBalances', () => {
    it('should reconcile multiple wallets', async () => {
      // Arrange
      const wallet1 = WalletEntity.create({ userId: 'user-1' });
      const wallet2 = WalletEntity.create({ userId: 'user-2' });
      const wallet3 = WalletEntity.create({ userId: 'user-3' });

      mockWalletRepository.findAll.mockResolvedValue([
        wallet1,
        wallet2,
        wallet3,
      ]);

      // Mock findByUserId for each wallet (called by reconcileUserBalance)
      mockWalletRepository.findByUserId.mockImplementation((userId: string) => {
        const wallets = {
          'user-1': wallet1,
          'user-2': wallet2,
          'user-3': wallet3,
        };
        return Promise.resolve(wallets[userId] || null);
      });

      // Mock successful reconciliation for all
      mockLedgerProvider.getUserBalance.mockResolvedValue({
        balanceId: 'balance-123',
        userId: 'user-1',
        currency: 'USDC',
        balance: 0n,
        creditBalance: 0n,
        debitBalance: 0n,
        inflightBalance: 0n,
        availableBalance: 0n,
      });
      mockWalletProvider.getBalance.mockResolvedValue([]);

      // Act
      const report = await service.reconcileAllBalances();

      // Assert
      expect(report.totalWallets).toBe(3);
      expect(report.reconciledWallets).toBe(3);
      expect(report.discrepancies).toHaveLength(0);
      expect(report.errors).toHaveLength(0);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'reconciliation.balance.completed',
        expect.anything(),
      );
    });

    it('should handle mix of reconciled and discrepant wallets', async () => {
      // Arrange
      const wallet1 = WalletEntity.create({ userId: 'user-1' });
      wallet1.credit(100);
      const wallet2 = WalletEntity.create({ userId: 'user-2' });

      mockWalletRepository.findAll.mockResolvedValue([wallet1, wallet2]);

      // Mock findByUserId for each wallet (called by reconcileUserBalance)
      mockWalletRepository.findByUserId.mockImplementation((userId: string) => {
        const wallets = { 'user-1': wallet1, 'user-2': wallet2 };
        return Promise.resolve(wallets[userId] || null);
      });

      // User 1: Has discrepancy
      mockLedgerProvider.getUserBalance
        .mockResolvedValueOnce({
          balanceId: 'balance-1',
          userId: 'user-1',
          currency: 'USDC',
          balance: 102_000_000n, // 2 USDC difference
          creditBalance: 0n,
          debitBalance: 0n,
          inflightBalance: 0n,
          availableBalance: 102_000_000n,
        })
        // User 2: Reconciled
        .mockResolvedValueOnce({
          balanceId: 'balance-2',
          userId: 'user-2',
          currency: 'USDC',
          balance: 0n,
          creditBalance: 0n,
          debitBalance: 0n,
          inflightBalance: 0n,
          availableBalance: 0n,
        });

      mockWalletProvider.getBalance.mockResolvedValue([]);

      // Act
      const report = await service.reconcileAllBalances();

      // Assert
      expect(report.totalWallets).toBe(2);
      expect(report.reconciledWallets).toBe(1);
      expect(report.discrepancies).toHaveLength(1);
      expect(report.discrepancies[0].userId).toBe('user-1');
      expect(report.discrepancies[0].severity).toBe('critical');
    });
  });

  describe('getStatus', () => {
    it('should return reconciliation service status', () => {
      // Act
      const status = service.getStatus();

      // Assert
      expect(status).toHaveProperty('yellowCardRuleId');
      expect(status).toHaveProperty('circleRuleId');
      expect(status).toHaveProperty('initialized');
    });
  });
});
