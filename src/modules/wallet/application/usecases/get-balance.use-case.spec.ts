import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  GetBalanceUseCase,
  GetBalanceInput,
  GetBalanceOutput,
} from './get-balance.use-case';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
  Balance,
} from '../../../shared/domain/gateways';

describe('GetBalanceUseCase', () => {
  let useCase: GetBalanceUseCase;
  let walletRepository: jest.Mocked<WalletRepository>;
  let paymentGateway: jest.Mocked<IPaymentGateway>;
  let cacheManager: jest.Mocked<Cache>;

  const mockWallet = {
    id: 'wallet-123',
    userId: 'user-123',
    circleWalletId: 'circle-wallet-123',
    yellowCardWalletId: null,
    currency: 'USDC',
    balance: 100,
    status: 'active',
  };

  const mockBalances: Balance[] = [
    {
      currency: 'USD',
      available: 100,
      pending: 0,
      total: 100,
    },
    {
      currency: 'USDC',
      available: 50,
      pending: 10,
      total: 60,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBalanceUseCase,
        {
          provide: WalletRepository,
          useValue: {
            findByUserId: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: PAYMENT_GATEWAY,
          useValue: {
            getBalance: jest.fn(),
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
    paymentGateway = module.get(PAYMENT_GATEWAY);
    cacheManager = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return cached balance if available', async () => {
      const input: GetBalanceInput = {
        userId: 'user-123',
      };

      const cachedBalance: GetBalanceOutput = {
        walletId: 'wallet-123',
        currency: 'USDC',
        balances: mockBalances,
      };

      cacheManager.get.mockResolvedValue(cachedBalance);

      const result = await useCase.execute(input);

      expect(cacheManager.get).toHaveBeenCalledWith('balance:user-123');
      expect(result).toEqual(cachedBalance);
      expect(walletRepository.findByUserId).not.toHaveBeenCalled();
      expect(paymentGateway.getBalance).not.toHaveBeenCalled();
    });

    it('should fetch balance from payment gateway when not cached', async () => {
      const input: GetBalanceInput = {
        userId: 'user-123',
      };

      cacheManager.get.mockResolvedValue(null);
      walletRepository.findByUserId.mockResolvedValue(mockWallet as any);
      paymentGateway.getBalance.mockResolvedValue({
        subwalletId: 'subwallet-123',
        balances: mockBalances,
      } as any);

      const result = await useCase.execute(input);

      expect(cacheManager.get).toHaveBeenCalledWith('balance:user-123');
      expect(walletRepository.findByUserId).toHaveBeenCalledWith('user-123');
      expect(paymentGateway.getBalance).toHaveBeenCalledWith(
        'circle-wallet-123',
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        'balance:user-123',
        expect.objectContaining({
          walletId: 'wallet-123',
          currency: 'USDC',
          balances: mockBalances,
        }),
        30,
      );
      expect(result).toEqual({
        walletId: 'wallet-123',
        currency: 'USDC',
        balances: mockBalances,
      });
    });

    it('should throw NotFoundException when wallet not found', async () => {
      const input: GetBalanceInput = {
        userId: 'user-999',
      };

      cacheManager.get.mockResolvedValue(null);
      walletRepository.findByUserId.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
      await expect(useCase.execute(input)).rejects.toThrow('Wallet not found');
      expect(paymentGateway.getBalance).not.toHaveBeenCalled();
    });

    it('should return local balance when no provider wallet ID', async () => {
      const input: GetBalanceInput = {
        userId: 'user-123',
      };

      const walletWithoutProvider = {
        ...mockWallet,
        circleWalletId: null,
        yellowCardWalletId: null,
        balance: 75,
      };

      cacheManager.get.mockResolvedValue(null);
      walletRepository.findByUserId.mockResolvedValue(
        walletWithoutProvider as any,
      );

      const result = await useCase.execute(input);

      expect(paymentGateway.getBalance).not.toHaveBeenCalled();
      expect(result).toEqual({
        walletId: 'wallet-123',
        currency: 'USDC',
        balances: [
          {
            currency: 'USD',
            available: 75,
            pending: 0,
            total: 75,
          },
          {
            currency: 'USDC',
            available: 0,
            pending: 0,
            total: 0,
          },
        ],
      });
      expect(cacheManager.set).toHaveBeenCalledWith(
        'balance:user-123',
        expect.any(Object),
        10, // Shorter TTL for local balance
      );
    });

    it('should use circleWalletId if available', async () => {
      const input: GetBalanceInput = {
        userId: 'user-123',
      };

      cacheManager.get.mockResolvedValue(null);
      walletRepository.findByUserId.mockResolvedValue(mockWallet as any);
      paymentGateway.getBalance.mockResolvedValue({
        subwalletId: 'subwallet-123',
        balances: mockBalances,
      } as any);

      await useCase.execute(input);

      expect(paymentGateway.getBalance).toHaveBeenCalledWith(
        'circle-wallet-123',
      );
    });

    it('should use yellowCardWalletId if circleWalletId not available', async () => {
      const input: GetBalanceInput = {
        userId: 'user-123',
      };

      const walletWithYellowCard = {
        ...mockWallet,
        circleWalletId: null,
        yellowCardWalletId: 'yc-wallet-456',
      };

      cacheManager.get.mockResolvedValue(null);
      walletRepository.findByUserId.mockResolvedValue(
        walletWithYellowCard as any,
      );
      paymentGateway.getBalance.mockResolvedValue({
        subwalletId: 'subwallet-123',
        balances: mockBalances,
      } as any);

      await useCase.execute(input);

      expect(paymentGateway.getBalance).toHaveBeenCalledWith('yc-wallet-456');
    });

    it('should cache balance with correct TTL', async () => {
      const input: GetBalanceInput = {
        userId: 'user-123',
      };

      cacheManager.get.mockResolvedValue(null);
      walletRepository.findByUserId.mockResolvedValue(mockWallet as any);
      paymentGateway.getBalance.mockResolvedValue({
        subwalletId: 'subwallet-123',
        balances: mockBalances,
      } as any);

      await useCase.execute(input);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'balance:user-123',
        expect.any(Object),
        30, // Default cache TTL
      );
    });

    it('should handle payment gateway errors', async () => {
      const input: GetBalanceInput = {
        userId: 'user-123',
      };

      cacheManager.get.mockResolvedValue(null);
      walletRepository.findByUserId.mockResolvedValue(mockWallet as any);
      paymentGateway.getBalance.mockRejectedValue(
        new Error('Gateway unavailable'),
      );

      await expect(useCase.execute(input)).rejects.toThrow(
        'Gateway unavailable',
      );
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should handle different users independently', async () => {
      cacheManager.get.mockResolvedValue(null);

      // User 1
      walletRepository.findByUserId.mockResolvedValue({
        ...mockWallet,
        id: 'wallet-1',
        userId: 'user-1',
      } as any);
      paymentGateway.getBalance.mockResolvedValue({
        subwalletId: 'subwallet-123',
        balances: mockBalances,
      } as any);

      const result1 = await useCase.execute({ userId: 'user-1' });

      expect(result1.walletId).toBe('wallet-1');

      // User 2
      walletRepository.findByUserId.mockResolvedValue({
        ...mockWallet,
        id: 'wallet-2',
        userId: 'user-2',
      } as any);

      const result2 = await useCase.execute({ userId: 'user-2' });

      expect(result2.walletId).toBe('wallet-2');
      expect(cacheManager.set).toHaveBeenCalledTimes(2);
    });

    it('should return empty USDC balance when wallet has no provider', async () => {
      const input: GetBalanceInput = {
        userId: 'user-123',
      };

      const localWallet = {
        ...mockWallet,
        circleWalletId: null,
        yellowCardWalletId: null,
        balance: 0,
      };

      cacheManager.get.mockResolvedValue(null);
      walletRepository.findByUserId.mockResolvedValue(localWallet as any);

      const result = await useCase.execute(input);

      expect(result.balances).toEqual([
        {
          currency: 'USD',
          available: 0,
          pending: 0,
          total: 0,
        },
        {
          currency: 'USDC',
          available: 0,
          pending: 0,
          total: 0,
        },
      ]);
    });
  });

  describe('Cache behavior', () => {
    it('should use cache key with user ID', async () => {
      const input: GetBalanceInput = {
        userId: 'user-456',
      };

      cacheManager.get.mockResolvedValue(null);
      walletRepository.findByUserId.mockResolvedValue(mockWallet as any);
      paymentGateway.getBalance.mockResolvedValue({
        subwalletId: 'subwallet-123',
        balances: mockBalances,
      } as any);

      await useCase.execute(input);

      expect(cacheManager.get).toHaveBeenCalledWith('balance:user-456');
      expect(cacheManager.set).toHaveBeenCalledWith(
        'balance:user-456',
        expect.any(Object),
        30,
      );
    });

    it('should return cached data on subsequent calls', async () => {
      const input: GetBalanceInput = {
        userId: 'user-123',
      };

      const cachedData: GetBalanceOutput = {
        walletId: 'wallet-123',
        currency: 'USDC',
        balances: mockBalances,
      };

      // First call - cache miss
      cacheManager.get.mockResolvedValueOnce(null);
      walletRepository.findByUserId.mockResolvedValue(mockWallet as any);
      paymentGateway.getBalance.mockResolvedValue({
        subwalletId: 'subwallet-123',
        balances: mockBalances,
      } as any);

      await useCase.execute(input);

      // Second call - cache hit
      cacheManager.get.mockResolvedValueOnce(cachedData);

      const result = await useCase.execute(input);

      expect(result).toEqual(cachedData);
      expect(walletRepository.findByUserId).toHaveBeenCalledTimes(1);
      expect(paymentGateway.getBalance).toHaveBeenCalledTimes(1);
    });
  });
});
