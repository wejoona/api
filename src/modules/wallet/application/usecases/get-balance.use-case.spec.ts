import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  GetBalanceInput,
  GetBalanceOutput,
  GetBalanceUseCase,
} from './get-balance.use-case';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import { LEDGER_PROVIDER } from '../../../providers/interfaces';

describe('GetBalanceUseCase', () => {
  let useCase: GetBalanceUseCase;
  let walletRepository: { findByUserId: jest.Mock };
  let ledgerProvider: { getUserBalance: jest.Mock };
  let cacheManager: jest.Mocked<Cache>;

  const mockWallet = {
    id: 'wallet-123',
    userId: 'user-123',
    currency: 'USDC',
    balance: 75,
    status: 'active',
  };

  const mockBlnkBalance = {
    balanceId: 'bln-balance-123',
    userId: 'user-123',
    currency: 'USDC',
    balance: 60_000_000n,
    creditBalance: 60_000_000n,
    debitBalance: 0n,
    inflightBalance: 10_000_000n,
    availableBalance: 50_000_000n,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBalanceUseCase,
        {
          provide: WalletRepository,
          useValue: {
            findByUserId: jest.fn().mockResolvedValue(mockWallet),
          },
        },
        {
          provide: LEDGER_PROVIDER,
          useValue: {
            getUserBalance: jest.fn().mockResolvedValue(mockBlnkBalance),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<GetBalanceUseCase>(GetBalanceUseCase);
    walletRepository = module.get(WalletRepository);
    ledgerProvider = module.get(LEDGER_PROVIDER);
    cacheManager = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached balance without hitting wallet or ledger repositories', async () => {
    const cachedBalance: GetBalanceOutput = {
      walletId: 'wallet-123',
      currency: 'USDC',
      balances: [{ currency: 'USDC', available: 50, pending: 10, total: 60 }],
    };
    cacheManager.get.mockResolvedValue(cachedBalance);

    const result = await useCase.execute({ userId: 'user-123' });

    expect(cacheManager.get).toHaveBeenCalledWith('balance:user-123');
    expect(result).toEqual(cachedBalance);
    expect(walletRepository.findByUserId).not.toHaveBeenCalled();
    expect(ledgerProvider.getUserBalance).not.toHaveBeenCalled();
  });

  it('reads Blnk as the source of truth and converts micro-USDC balances', async () => {
    cacheManager.get.mockResolvedValue(null);

    const result = await useCase.execute({ userId: 'user-123' });

    expect(walletRepository.findByUserId).toHaveBeenCalledWith('user-123');
    expect(ledgerProvider.getUserBalance).toHaveBeenCalledWith(
      'user-123',
      'USDC',
    );
    expect(result).toEqual({
      walletId: 'wallet-123',
      currency: 'USDC',
      balances: [
        { currency: 'USDC', available: 50, pending: 10, total: 60 },
        { currency: 'USD', available: 50, pending: 10, total: 60 },
      ],
    });
    expect(cacheManager.set).toHaveBeenCalledWith(
      'balance:user-123',
      result,
      30,
    );
  });

  it('throws when the user wallet does not exist', async () => {
    cacheManager.get.mockResolvedValue(null);
    walletRepository.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute({ userId: 'missing-user' })).rejects.toThrow(
      NotFoundException,
    );
    expect(ledgerProvider.getUserBalance).not.toHaveBeenCalled();
  });

  it('falls back to local wallet balance when Blnk is unavailable', async () => {
    cacheManager.get.mockResolvedValue(null);
    ledgerProvider.getUserBalance.mockRejectedValue(
      new Error('Blnk unavailable'),
    );

    const result = await useCase.execute({ userId: 'user-123' });

    expect(result).toEqual({
      walletId: 'wallet-123',
      currency: 'USDC',
      balances: [
        { currency: 'USD', available: 75, pending: 0, total: 75 },
        { currency: 'USDC', available: 75, pending: 0, total: 75 },
      ],
    });
    expect(cacheManager.set).toHaveBeenCalledWith(
      'balance:user-123',
      result,
      10,
    );
  });

  it('falls back to local wallet balance when Blnk returns no balance', async () => {
    cacheManager.get.mockResolvedValue(null);
    ledgerProvider.getUserBalance.mockResolvedValue(null);

    const result = await useCase.execute({ userId: 'user-123' });

    expect(result.balances).toEqual([
      { currency: 'USD', available: 75, pending: 0, total: 75 },
      { currency: 'USDC', available: 75, pending: 0, total: 75 },
    ]);
  });

  it('uses independent cache keys for different users', async () => {
    cacheManager.get.mockResolvedValue(null);

    await useCase.execute({ userId: 'user-123' });
    walletRepository.findByUserId.mockResolvedValue({
      ...mockWallet,
      id: 'wallet-456',
      userId: 'user-456',
    });
    await useCase.execute({ userId: 'user-456' });

    expect(cacheManager.get).toHaveBeenCalledWith('balance:user-123');
    expect(cacheManager.get).toHaveBeenCalledWith('balance:user-456');
    expect(cacheManager.set).toHaveBeenCalledTimes(2);
  });

  it('accepts a minimal input object', async () => {
    cacheManager.get.mockResolvedValue(null);
    const input: GetBalanceInput = { userId: 'user-123' };

    await expect(useCase.execute(input)).resolves.toMatchObject({
      walletId: 'wallet-123',
    });
  });
});
