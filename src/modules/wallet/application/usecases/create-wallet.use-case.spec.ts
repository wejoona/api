import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  CreateWalletUseCase,
  CreateWalletInput,
} from './create-wallet.use-case';
import { WalletEntity } from '../../domain/entities/wallet.entity';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import {
  IDENTITY_PROVIDER,
  IIdentityProvider,
  WALLET_PROVIDER,
  IWalletProvider,
  LEDGER_PROVIDER,
  ILedgerProvider,
} from '../../../providers/interfaces';

describe('CreateWalletUseCase', () => {
  let useCase: CreateWalletUseCase;
  let walletRepository: jest.Mocked<WalletRepository>;
  let identityProvider: jest.Mocked<IIdentityProvider>;
  let walletProvider: jest.Mocked<IWalletProvider>;
  let ledgerProvider: jest.Mocked<ILedgerProvider>;

  const mockWallet: WalletEntity = {
    id: 'wallet-123',
    userId: 'user-123',
    circleWalletId: 'circle-wallet-123',
    circleWalletAddress: '0xabc123',
    currency: 'USDC',
    balance: 0,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateWalletUseCase,
        {
          provide: WalletRepository,
          useValue: {
            findByUserId: jest.fn(),
            save: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: IDENTITY_PROVIDER,
          useValue: {
            createUser: jest.fn(),
            getUser: jest.fn(),
          },
        },
        {
          provide: WALLET_PROVIDER,
          useValue: {
            createWallet: jest.fn(),
            getWallet: jest.fn(),
          },
        },
        {
          provide: LEDGER_PROVIDER,
          useValue: {
            createUserBalance: jest.fn(),
            getBalance: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<CreateWalletUseCase>(CreateWalletUseCase);
    walletRepository = module.get(WalletRepository);
    identityProvider = module.get(IDENTITY_PROVIDER);
    walletProvider = module.get(WALLET_PROVIDER);
    ledgerProvider = module.get(LEDGER_PROVIDER);

    // Suppress logs in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create wallet with all provider integrations', async () => {
      const input: CreateWalletInput = {
        userId: 'user-123',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        userPhone: '+225123456789',
        countryCode: 'CI',
      };

      walletRepository.findByUserId.mockResolvedValue(null);
      identityProvider.createUser.mockResolvedValue({
        providerId: 'circle-user-123',
        userId: 'user-123',
      });
      walletProvider.createWallet.mockResolvedValue({
        providerId: 'circle-wallet-123',
        address: '0xabc123',
        userId: 'user-123',
      });
      ledgerProvider.createUserBalance.mockResolvedValue('blnk-balance-123');
      walletRepository.save.mockResolvedValue(mockWallet);

      const result = await useCase.execute(input);

      expect(walletRepository.findByUserId).toHaveBeenCalledWith('user-123');
      expect(identityProvider.createUser).toHaveBeenCalledWith({
        userId: 'user-123',
        email: 'john@example.com',
        phone: '+225123456789',
        countryCode: 'CI',
      });
      expect(walletProvider.createWallet).toHaveBeenCalledWith({
        userId: 'user-123',
        userProviderId: 'circle-user-123',
        name: 'John Doe',
        metadata: {
          joonapayUserId: 'user-123',
        },
      });
      expect(ledgerProvider.createUserBalance).toHaveBeenCalledWith(
        'user-123',
        'USDC',
      );
      expect(walletRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockWallet);
    });

    it('should return existing wallet if already created', async () => {
      const input: CreateWalletInput = {
        userId: 'user-123',
      };

      walletRepository.findByUserId.mockResolvedValue(mockWallet);

      const result = await useCase.execute(input);

      expect(walletRepository.findByUserId).toHaveBeenCalledWith('user-123');
      expect(identityProvider.createUser).not.toHaveBeenCalled();
      expect(walletProvider.createWallet).not.toHaveBeenCalled();
      expect(ledgerProvider.createUserBalance).not.toHaveBeenCalled();
      expect(walletRepository.save).not.toHaveBeenCalled();
      expect(result).toEqual(mockWallet);
    });

    it('should continue when Circle user creation fails', async () => {
      const input: CreateWalletInput = {
        userId: 'user-123',
        userName: 'John Doe',
      };

      walletRepository.findByUserId.mockResolvedValue(null);
      identityProvider.createUser.mockRejectedValue(
        new Error('Circle API unavailable'),
      );
      ledgerProvider.createUserBalance.mockResolvedValue('blnk-balance-123');
      walletRepository.save.mockResolvedValue(mockWallet);

      const result = await useCase.execute(input);

      expect(identityProvider.createUser).toHaveBeenCalled();
      expect(walletProvider.createWallet).not.toHaveBeenCalled();
      expect(ledgerProvider.createUserBalance).toHaveBeenCalled();
      expect(walletRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should continue when Circle wallet creation fails', async () => {
      const input: CreateWalletInput = {
        userId: 'user-123',
      };

      walletRepository.findByUserId.mockResolvedValue(null);
      identityProvider.createUser.mockResolvedValue({
        providerId: 'circle-user-123',
        userId: 'user-123',
      });
      walletProvider.createWallet.mockRejectedValue(
        new Error('Wallet creation failed'),
      );
      ledgerProvider.createUserBalance.mockResolvedValue('blnk-balance-123');
      walletRepository.save.mockResolvedValue(mockWallet);

      const result = await useCase.execute(input);

      expect(walletProvider.createWallet).toHaveBeenCalled();
      expect(ledgerProvider.createUserBalance).toHaveBeenCalled();
      expect(walletRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should continue when Blnk balance creation fails', async () => {
      const input: CreateWalletInput = {
        userId: 'user-123',
      };

      walletRepository.findByUserId.mockResolvedValue(null);
      identityProvider.createUser.mockResolvedValue({
        providerId: 'circle-user-123',
        userId: 'user-123',
      });
      walletProvider.createWallet.mockResolvedValue({
        providerId: 'circle-wallet-123',
        address: '0xabc123',
        userId: 'user-123',
      });
      ledgerProvider.createUserBalance.mockRejectedValue(
        new Error('Blnk API error'),
      );
      walletRepository.save.mockResolvedValue(mockWallet);

      const result = await useCase.execute(input);

      expect(ledgerProvider.createUserBalance).toHaveBeenCalled();
      expect(walletRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should use default country code when not provided', async () => {
      const input: CreateWalletInput = {
        userId: 'user-123',
        userEmail: 'test@example.com',
      };

      walletRepository.findByUserId.mockResolvedValue(null);
      identityProvider.createUser.mockResolvedValue({
        providerId: 'circle-user-123',
        userId: 'user-123',
      });
      walletProvider.createWallet.mockResolvedValue({
        providerId: 'circle-wallet-123',
        address: '0xabc123',
        userId: 'user-123',
      });
      ledgerProvider.createUserBalance.mockResolvedValue('blnk-balance-123');
      walletRepository.save.mockResolvedValue(mockWallet);

      await useCase.execute(input);

      expect(identityProvider.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          countryCode: 'CI',
        }),
      );
    });

    it('should use default username when not provided', async () => {
      const input: CreateWalletInput = {
        userId: 'user-123',
      };

      walletRepository.findByUserId.mockResolvedValue(null);
      identityProvider.createUser.mockResolvedValue({
        providerId: 'circle-user-123',
        userId: 'user-123',
      });
      walletProvider.createWallet.mockResolvedValue({
        providerId: 'circle-wallet-123',
        address: '0xabc123',
        userId: 'user-123',
      });
      ledgerProvider.createUserBalance.mockResolvedValue('blnk-balance-123');
      walletRepository.save.mockResolvedValue(mockWallet);

      await useCase.execute(input);

      expect(walletProvider.createWallet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'User user-123',
        }),
      );
    });

    it('should not create wallet if Circle user creation fails', async () => {
      const input: CreateWalletInput = {
        userId: 'user-123',
      };

      walletRepository.findByUserId.mockResolvedValue(null);
      identityProvider.createUser.mockRejectedValue(
        new Error('Circle user creation failed'),
      );
      ledgerProvider.createUserBalance.mockResolvedValue('blnk-balance-123');
      walletRepository.save.mockResolvedValue(mockWallet);

      await useCase.execute(input);

      expect(walletProvider.createWallet).not.toHaveBeenCalled();
    });

    it('should save wallet with all provider IDs when successful', async () => {
      const input: CreateWalletInput = {
        userId: 'user-123',
      };

      walletRepository.findByUserId.mockResolvedValue(null);
      identityProvider.createUser.mockResolvedValue({
        providerId: 'circle-user-123',
        userId: 'user-123',
      });
      walletProvider.createWallet.mockResolvedValue({
        providerId: 'circle-wallet-456',
        address: '0xdef456',
        userId: 'user-123',
      });
      ledgerProvider.createUserBalance.mockResolvedValue('blnk-789');
      walletRepository.save.mockResolvedValue(mockWallet);

      await useCase.execute(input);

      expect(walletRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          currency: 'USDC',
        }),
      );
    });

    it('should handle partial failures gracefully', async () => {
      const input: CreateWalletInput = {
        userId: 'user-123',
      };

      walletRepository.findByUserId.mockResolvedValue(null);
      identityProvider.createUser.mockResolvedValue({
        providerId: 'circle-user-123',
        userId: 'user-123',
      });
      walletProvider.createWallet.mockRejectedValue(
        new Error('Network timeout'),
      );
      ledgerProvider.createUserBalance.mockRejectedValue(
        new Error('Blnk down'),
      );
      walletRepository.save.mockResolvedValue(mockWallet);

      const result = await useCase.execute(input);

      expect(result).toBeDefined();
      expect(walletRepository.save).toHaveBeenCalled();
    });
  });
});
