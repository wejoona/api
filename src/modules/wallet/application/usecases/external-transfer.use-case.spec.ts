import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import {
  ExternalTransferInput,
  ExternalTransferUseCase,
} from './external-transfer.use-case';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { TransactionRepository } from '../../../transaction/infrastructure/repositories/transaction.repository';
import { UserRepository } from '../../../user/infrastructure/repositories/user.repository';
import { PAYMENT_GATEWAY } from '../../../shared/domain/gateways';
import { LEDGER_PROVIDER } from '../../../providers/interfaces';
import { CacheInvalidationService } from '../../../shared/infrastructure/services/cache-invalidation.service';
import { TransactionRiskService } from '../../../risk/application/services/transaction-risk.service';
import { OmnibusService } from '../services/omnibus.service';
import { RiskEvaluationService } from '../../../risk/risk-evaluation.service';
import {
  createMockDataSource,
  createMockPaymentGateway,
  createTestUser,
  createTestWallet,
  MockDataSource,
} from '../../../../test/helpers/test-utils';
import { AppException } from '../../../../common/exceptions';
import { ERROR_CODES } from '../../../../common/constants/error-codes';

describe('ExternalTransferUseCase', () => {
  let useCase: ExternalTransferUseCase;
  let walletRepository: { findByUserId: jest.Mock };
  let transactionRepository: {
    getDailyTransferVolume: jest.Mock;
    save: jest.Mock;
  };
  let userRepository: { findById: jest.Mock };
  let dataSource: MockDataSource;
  let paymentGateway: ReturnType<typeof createMockPaymentGateway>;
  let ledgerProvider: {
    getAvailableBalance: jest.Mock;
    recordExternalTransfer: jest.Mock;
    commitTransaction: jest.Mock;
    voidTransaction: jest.Mock;
  };
  let omnibusService: { routeExternalTransfer: jest.Mock };
  let cacheInvalidationService: { invalidateBalance: jest.Mock };
  let transactionRiskService: {
    isAddressSafe: jest.Mock;
    assessTransaction: jest.Mock;
    recordTransactionOutcome: jest.Mock;
  };
  let riskEvaluationService: { evaluateTransfer: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  const userId = 'user-id';
  const validAddress = '0x' + 'a'.repeat(40);
  const input: ExternalTransferInput = {
    userId,
    toAddress: validAddress,
    amount: 100,
  };

  beforeEach(async () => {
    const wallet = createTestWallet({
      id: 'wallet-id',
      userId,
      balance: 1000,
    });

    walletRepository = {
      findByUserId: jest.fn().mockResolvedValue(wallet),
    };
    transactionRepository = {
      getDailyTransferVolume: jest.fn().mockResolvedValue(0),
      save: jest.fn().mockImplementation(async (transaction) => transaction),
    };
    userRepository = {
      findById: jest.fn().mockResolvedValue(
        createTestUser({
          id: userId,
          kycStatus: 'approved',
        }),
      ),
    };
    dataSource = createMockDataSource();
    dataSource.manager.findOne.mockResolvedValue(wallet);
    paymentGateway = createMockPaymentGateway();
    ledgerProvider = {
      getAvailableBalance: jest.fn().mockResolvedValue(1_000_000_000n),
      recordExternalTransfer: jest.fn().mockResolvedValue({
        transactionId: 'blnk-withdrawal-123',
        status: 'inflight',
      }),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      voidTransaction: jest.fn().mockResolvedValue(undefined),
    };
    omnibusService = {
      routeExternalTransfer: jest.fn().mockResolvedValue({
        provider: 'circle',
        network: 'polygon',
        omnibusWalletId: 'omnibus-wallet-id',
      }),
    };
    cacheInvalidationService = {
      invalidateBalance: jest.fn().mockResolvedValue(undefined),
    };
    transactionRiskService = {
      isAddressSafe: jest.fn().mockResolvedValue({
        safe: true,
        reason: null,
        riskSignals: [],
      }),
      assessTransaction: jest.fn(),
      recordTransactionOutcome: jest.fn(),
    };
    riskEvaluationService = {
      evaluateTransfer: jest.fn().mockResolvedValue({ decision: 'ALLOW' }),
    };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalTransferUseCase,
        { provide: WalletRepository, useValue: walletRepository },
        { provide: TransactionRepository, useValue: transactionRepository },
        { provide: UserRepository, useValue: userRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: PAYMENT_GATEWAY, useValue: paymentGateway },
        { provide: LEDGER_PROVIDER, useValue: ledgerProvider },
        { provide: OmnibusService, useValue: omnibusService },
        {
          provide: CacheInvalidationService,
          useValue: cacheInvalidationService,
        },
        { provide: TransactionRiskService, useValue: transactionRiskService },
        { provide: RiskEvaluationService, useValue: riskEvaluationService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    useCase = module.get<ExternalTransferUseCase>(ExternalTransferUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reserves funds in Blnk, routes through an omnibus wallet, and commits on success', async () => {
    const result = await useCase.execute(input);

    expect(result).toMatchObject({
      walletId: 'wallet-id',
      toAddress: validAddress,
      amount: 100,
      currency: 'USDC',
      fee: 0.5,
      status: 'completed',
    });
    expect(transactionRiskService.isAddressSafe).toHaveBeenCalledWith(
      validAddress,
      'MATIC',
    );
    expect(ledgerProvider.getAvailableBalance).toHaveBeenCalledWith(
      userId,
      'USDC',
    );
    expect(ledgerProvider.recordExternalTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        amount: 100_000_000n,
        fee: 500_000n,
        inflight: true,
      }),
    );
    expect(omnibusService.routeExternalTransfer).toHaveBeenCalledWith({
      amount: 100,
      destination: validAddress,
      preferredNetwork: 'circle',
    });
    expect(paymentGateway.externalTransfer).toHaveBeenCalledWith({
      subwalletId: 'omnibus-wallet-id',
      toAddress: validAddress,
      amount: 100,
      currency: 'USDC',
      network: 'polygon',
    });
    expect(ledgerProvider.commitTransaction).toHaveBeenCalledWith(
      'blnk-withdrawal-123',
    );
    expect(cacheInvalidationService.invalidateBalance).toHaveBeenCalledWith(
      userId,
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'transaction.withdrawal.initiated',
      expect.objectContaining({ userId, amount: 100, fee: 0.5 }),
    );
  });

  it('calculates the fee by rounding 0.5 percent up to cents', async () => {
    const result = await useCase.execute({
      ...input,
      amount: 99,
    });

    expect(result.fee).toBe(0.5);
    expect(ledgerProvider.recordExternalTransfer).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 99_000_000n, fee: 500_000n }),
    );
  });

  it('rejects malformed addresses before compliance checks', async () => {
    await expect(
      useCase.execute({
        ...input,
        toAddress: 'not-an-address',
      }),
    ).rejects.toThrow('Invalid wallet address format');
    expect(transactionRiskService.isAddressSafe).not.toHaveBeenCalled();
  });

  it('blocks addresses rejected by compliance screening', async () => {
    transactionRiskService.isAddressSafe.mockResolvedValue({
      safe: false,
      reason: 'Sanctions exposure',
      riskSignals: ['sanctions'],
    });

    await expect(useCase.execute(input)).rejects.toThrow(ForbiddenException);
    expect(ledgerProvider.recordExternalTransfer).not.toHaveBeenCalled();
  });

  it('validates amount bounds and precision', async () => {
    await expect(useCase.execute({ ...input, amount: 0 })).rejects.toThrow(
      'Amount must be greater than 0',
    );
    await expect(useCase.execute({ ...input, amount: 0.5 })).rejects.toThrow(
      'Minimum transfer amount is $1',
    );
    await expect(useCase.execute({ ...input, amount: 10001 })).rejects.toThrow(
      'Maximum transfer amount is $10000',
    );
    await expect(
      useCase.execute({ ...input, amount: 100.123 }),
    ).rejects.toThrow('Invalid amount precision');
  });

  it('enforces KYC daily limits before reserving ledger funds', async () => {
    userRepository.findById.mockResolvedValue(
      createTestUser({ id: userId, kycStatus: 'pending' }),
    );
    transactionRepository.getDailyTransferVolume.mockResolvedValue(90);

    await expect(
      useCase.execute({
        ...input,
        amount: 20,
      }),
    ).rejects.toThrow(/Daily transfer limit exceeded/);
    expect(ledgerProvider.recordExternalTransfer).not.toHaveBeenCalled();
  });

  it('requires step-up verification when risk evaluation requests it', async () => {
    riskEvaluationService.evaluateTransfer.mockResolvedValue({
      decision: 'STEP_UP',
    });

    await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
    expect(ledgerProvider.recordExternalTransfer).not.toHaveBeenCalled();
  });

  it('throws not found when the local wallet is missing', async () => {
    walletRepository.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    expect(ledgerProvider.recordExternalTransfer).not.toHaveBeenCalled();
  });

  it('rejects insufficient Blnk source-of-truth balance including fee', async () => {
    ledgerProvider.getAvailableBalance.mockResolvedValue(100_000_000n);

    await expect(useCase.execute(input)).rejects.toThrow(
      'Insufficient balance. Required: $100.50 (including $0.50 fee)',
    );
    expect(ledgerProvider.recordExternalTransfer).not.toHaveBeenCalled();
  });

  it('falls back to local balance when Blnk balance lookup is unavailable', async () => {
    ledgerProvider.getAvailableBalance.mockRejectedValue(
      new Error('Blnk unavailable'),
    );

    await expect(useCase.execute(input)).resolves.toMatchObject({
      amount: 100,
      status: 'completed',
    });
  });

  it('voids the Blnk inflight transaction when the on-chain transfer fails', async () => {
    paymentGateway.externalTransfer.mockRejectedValue(
      new Error('Network error'),
    );

    await expect(useCase.execute(input)).rejects.toThrow(
      'Transfer failed. Your funds have been refunded. Please try again later.',
    );
    expect(ledgerProvider.voidTransaction).toHaveBeenCalledWith(
      'blnk-withdrawal-123',
    );
    expect(ledgerProvider.commitTransaction).not.toHaveBeenCalled();
  });

  it('preserves provider-unavailable codes after voiding the Blnk inflight transaction', async () => {
    paymentGateway.externalTransfer.mockRejectedValue(
      AppException.badRequest(
        ERROR_CODES.WITHDRAWAL_PROVIDER_UNAVAILABLE,
        'Payment gateway disabled',
      ),
    );

    await expect(useCase.execute(input)).rejects.toMatchObject({
      code: ERROR_CODES.WITHDRAWAL_PROVIDER_UNAVAILABLE,
    });
    expect(ledgerProvider.voidTransaction).toHaveBeenCalledWith(
      'blnk-withdrawal-123',
    );
    expect(ledgerProvider.commitTransaction).not.toHaveBeenCalled();
  });

  it('uses the Stellar omnibus route for Stellar withdrawals', async () => {
    const stellarAddress = 'G' + 'A'.repeat(55);

    await useCase.execute({
      ...input,
      toAddress: stellarAddress,
      network: 'stellar',
    });

    expect(omnibusService.routeExternalTransfer).toHaveBeenCalledWith({
      amount: 100,
      destination: stellarAddress,
      preferredNetwork: 'stellar',
    });
  });
});
