import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { InternalTransferUseCase } from './internal-transfer.use-case';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';
import { UserRepository } from '../../../user/infrastructure/repositories/user.repository';
import { LEDGER_PROVIDER } from '../../../providers/interfaces';
import { CacheInvalidationService } from '../../../shared/infrastructure/services';
import { RiskEvaluationService } from '../../../risk/risk-evaluation.service';
import {
  createMockDataSource,
  createTestUser,
  createTestWallet,
  MockDataSource,
  MockEntityManager,
} from '../../../../test/helpers/test-utils';

describe('InternalTransferUseCase', () => {
  let useCase: InternalTransferUseCase;
  let walletRepository: { findByUserId: jest.Mock };
  let transactionRepository: {
    getDailyTransferVolume: jest.Mock;
    save: jest.Mock;
  };
  let userRepository: { findByPhone: jest.Mock; findById: jest.Mock };
  let dataSource: MockDataSource;
  let mockManager: MockEntityManager;
  let ledgerProvider: {
    getAvailableBalance: jest.Mock;
    recordP2PTransfer: jest.Mock;
  };
  let cacheInvalidationService: { invalidateMultipleBalances: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let riskEvaluationService: { evaluateTransfer: jest.Mock };
  let walletsByUserId: Map<string, any>;

  const senderId = 'sender-user-id';
  const recipientId = 'recipient-user-id';
  const senderPhone = '+2250123456789';
  const recipientPhone = '+2250987654321';

  const setWallets = (...wallets: any[]) => {
    walletsByUserId = new Map(wallets.map((wallet) => [wallet.userId, wallet]));
    walletRepository.findByUserId.mockImplementation(async (userId: string) => {
      return walletsByUserId.get(userId) ?? null;
    });
    mockManager.findOne.mockImplementation(async (_entity, options) => {
      return walletsByUserId.get(options?.where?.userId) ?? null;
    });
  };

  beforeEach(async () => {
    walletRepository = { findByUserId: jest.fn() };
    transactionRepository = {
      getDailyTransferVolume: jest.fn().mockResolvedValue(0),
      save: jest.fn().mockImplementation(async (transaction) => transaction),
    };
    userRepository = {
      findByPhone: jest.fn(),
      findById: jest.fn(),
    };
    dataSource = createMockDataSource();
    mockManager = dataSource.manager;
    ledgerProvider = {
      getAvailableBalance: jest.fn().mockResolvedValue(1_000_000_000n),
      recordP2PTransfer: jest.fn().mockResolvedValue({
        transactionId: 'blnk-transfer-123',
        status: 'applied',
      }),
    };
    cacheInvalidationService = {
      invalidateMultipleBalances: jest.fn().mockResolvedValue(undefined),
    };
    eventEmitter = { emit: jest.fn() };
    riskEvaluationService = {
      evaluateTransfer: jest.fn().mockResolvedValue({ decision: 'ALLOW' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalTransferUseCase,
        { provide: WalletRepository, useValue: walletRepository },
        { provide: TransactionRepository, useValue: transactionRepository },
        { provide: UserRepository, useValue: userRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: LEDGER_PROVIDER, useValue: ledgerProvider },
        {
          provide: CacheInvalidationService,
          useValue: cacheInvalidationService,
        },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: RiskEvaluationService, useValue: riskEvaluationService },
      ],
    }).compile();

    useCase = module.get<InternalTransferUseCase>(InternalTransferUseCase);

    const senderWallet = createTestWallet({
      id: 'sender-wallet-id',
      userId: senderId,
      balance: 500,
    });
    const recipientWallet = createTestWallet({
      id: 'recipient-wallet-id',
      userId: recipientId,
      balance: 100,
    });
    setWallets(senderWallet, recipientWallet);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const arrangeUsers = (kycStatus: any = 'approved') => {
    const sender = createTestUser({
      id: senderId,
      phone: senderPhone,
      kycStatus,
    });
    const recipient = createTestUser({
      id: recipientId,
      phone: recipientPhone,
    });

    userRepository.findByPhone.mockResolvedValue(recipient);
    userRepository.findById.mockResolvedValue(sender);

    return { sender, recipient };
  };

  it('records an internal transfer in Blnk and mirrors balances locally', async () => {
    arrangeUsers();

    const result = await useCase.execute({
      fromUserId: senderId,
      toPhone: recipientPhone,
      amount: 50,
      currency: 'USD',
    });

    expect(result).toMatchObject({
      fromWalletId: 'sender-wallet-id',
      toWalletId: 'recipient-wallet-id',
      toPhone: recipientPhone,
      amount: 50,
      currency: 'USD',
      fee: 0,
      status: 'completed',
    });
    expect(ledgerProvider.getAvailableBalance).toHaveBeenCalledWith(
      senderId,
      'USDC',
    );
    expect(ledgerProvider.recordP2PTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        senderId,
        recipientId,
        amount: 50_000_000n,
        currency: 'USDC',
      }),
    );
    expect(mockManager.save).toHaveBeenCalledTimes(2);
    expect(transactionRepository.save).toHaveBeenCalledTimes(2);
    expect(
      cacheInvalidationService.invalidateMultipleBalances,
    ).toHaveBeenCalledWith([senderId, recipientId]);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'transaction.transfer.sent',
      expect.objectContaining({ userId: senderId, amount: 50 }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'transaction.transfer.received',
      expect.objectContaining({ userId: recipientId, amount: 50 }),
    );
  });

  it('rejects invalid amounts before looking up the recipient', async () => {
    await expect(
      useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 0,
      }),
    ).rejects.toThrow('Amount must be greater than 0');

    await expect(
      useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 0.005,
      }),
    ).rejects.toThrow('Minimum transfer amount is 0.01');

    await expect(
      useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 50.123,
      }),
    ).rejects.toThrow('Invalid amount precision');

    expect(userRepository.findByPhone).not.toHaveBeenCalled();
  });

  it('rejects transfers to non-Korido users', async () => {
    userRepository.findByPhone.mockResolvedValue(null);

    await expect(
      useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 50,
      }),
    ).rejects.toThrow(NotFoundException);
    expect(ledgerProvider.recordP2PTransfer).not.toHaveBeenCalled();
  });

  it('rejects self-transfers', async () => {
    const sender = createTestUser({
      id: senderId,
      phone: senderPhone,
      kycStatus: 'approved',
    });
    userRepository.findByPhone.mockResolvedValue(sender);
    userRepository.findById.mockResolvedValue(sender);

    await expect(
      useCase.execute({
        fromUserId: senderId,
        toPhone: senderPhone,
        amount: 50,
      }),
    ).rejects.toThrow('Cannot transfer to yourself');
  });

  it('enforces KYC daily limits before moving ledger funds', async () => {
    arrangeUsers('pending');
    transactionRepository.getDailyTransferVolume.mockResolvedValue(90);

    await expect(
      useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 20,
      }),
    ).rejects.toThrow(/Daily transfer limit exceeded/);
    expect(ledgerProvider.recordP2PTransfer).not.toHaveBeenCalled();
  });

  it('requires step-up verification when risk evaluation requests it', async () => {
    arrangeUsers('approved');
    riskEvaluationService.evaluateTransfer.mockResolvedValue({
      decision: 'STEP_UP',
    });

    await expect(
      useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 50,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(ledgerProvider.recordP2PTransfer).not.toHaveBeenCalled();
  });

  it('rejects insufficient Blnk source-of-truth balance', async () => {
    arrangeUsers();
    ledgerProvider.getAvailableBalance.mockResolvedValue(10_000_000n);

    await expect(
      useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 50,
      }),
    ).rejects.toThrow('Insufficient balance');
    expect(ledgerProvider.recordP2PTransfer).not.toHaveBeenCalled();
  });

  it('falls back to local balance when the Blnk balance check is unavailable', async () => {
    arrangeUsers();
    ledgerProvider.getAvailableBalance.mockRejectedValue(
      new Error('Blnk unavailable'),
    );

    await expect(
      useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 50,
      }),
    ).resolves.toMatchObject({ amount: 50, status: 'completed' });
    expect(ledgerProvider.recordP2PTransfer).toHaveBeenCalled();
  });

  it('returns sender wallet not found when no wallet exists for the sender', async () => {
    arrangeUsers();
    walletRepository.findByUserId.mockImplementation(async (userId: string) => {
      if (userId === senderId) return null;
      return walletsByUserId.get(userId) ?? null;
    });

    await expect(
      useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 50,
      }),
    ).rejects.toThrow('Sender wallet not found');
  });

  it('fails cleanly when Blnk cannot record the P2P transfer', async () => {
    arrangeUsers();
    ledgerProvider.recordP2PTransfer.mockRejectedValue(new Error('Blnk down'));

    await expect(
      useCase.execute({
        fromUserId: senderId,
        toPhone: recipientPhone,
        amount: 50,
      }),
    ).rejects.toThrow('Transfer failed. Please try again later.');
    expect(transactionRepository.save).not.toHaveBeenCalled();
  });
});
