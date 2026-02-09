import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarWalletAdapter } from '../adapters/stellar-wallet.adapter';
import { StellarHorizonService } from '../services/stellar-horizon.service';
import { StellarError, StellarAccount, StellarBalance } from '../stellar.types';

describe('StellarWalletAdapter', () => {
  let adapter: StellarWalletAdapter;
  let horizonService: jest.Mocked<StellarHorizonService>;

  const mockConfigValues: Record<string, any> = {
    'stellar.network': 'testnet',
    'stellar.horizonUrl': 'https://horizon-testnet.stellar.org',
    'stellar.usdcAssetCode': 'USDC',
    'stellar.usdcIssuer': 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    'stellar.anchorDomain': 'test-anchor.stellar.org',
    'stellar.useMock': false,
  };

  const mockKeypair = {
    publicKey: 'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
    secretKey: 'SBSECRET1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
  };

  const mockAccount: StellarAccount = {
    accountId: 'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
    sequence: '12345',
    balances: [
      {
        assetType: 'native',
        assetCode: 'XLM',
        assetIssuer: null,
        balance: '100.0000000',
        buyingLiabilities: '0',
        sellingLiabilities: '0',
      },
      {
        assetType: 'credit_alphanum4',
        assetCode: 'USDC',
        assetIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        balance: '500.0000000',
        buyingLiabilities: '0',
        sellingLiabilities: '0',
      },
    ],
    hasUsdcTrustline: true,
    status: 'active',
  };

  beforeEach(async () => {
    const mockHorizonService = {
      generateKeypair: jest.fn().mockReturnValue(mockKeypair),
      fundTestnetAccount: jest.fn().mockResolvedValue(true),
      createUsdcTrustline: jest.fn().mockResolvedValue({
        transactionId: 'tx-123',
        hash: 'hash-123',
        ledger: 12345,
        successful: true,
        feeCharged: '100',
        resultXdr: 'xdr',
        createdAt: new Date(),
      }),
      getAccount: jest.fn().mockResolvedValue(mockAccount),
      keypairFromSecret: jest.fn().mockReturnValue({
        publicKey: () => mockKeypair.publicKey,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarWalletAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfigValues[key]),
          },
        },
        {
          provide: StellarHorizonService,
          useValue: mockHorizonService,
        },
      ],
    }).compile();

    adapter = module.get<StellarWalletAdapter>(StellarWalletAdapter);
    horizonService = module.get(StellarHorizonService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(adapter).toBeDefined();
    });

    it('should have correct provider name', () => {
      expect(adapter.providerName).toBe('stellar');
    });
  });

  describe('createWallet', () => {
    const createWalletData = {
      userId: 'user-123',
      userProviderId: 'user-provider-123',
      name: 'Test Wallet',
      metadata: { customField: 'value' },
    };

    it('should create a new wallet with keypair', async () => {
      const result = await adapter.createWallet(createWalletData);

      expect(result.providerId).toBe(mockKeypair.publicKey);
      expect(result.address).toBe(mockKeypair.publicKey);
      expect(result.blockchain).toBe('STELLAR');
      expect(result.status).toBe('active');
      expect(horizonService.generateKeypair).toHaveBeenCalled();
    });

    it('should fund testnet account on testnet', async () => {
      await adapter.createWallet(createWalletData);

      expect(horizonService.fundTestnetAccount).toHaveBeenCalledWith(
        mockKeypair.publicKey,
      );
    });

    it('should create USDC trustline after funding', async () => {
      await adapter.createWallet(createWalletData);

      expect(horizonService.createUsdcTrustline).toHaveBeenCalledWith(
        mockKeypair.secretKey,
      );
    });

    it('should include secret key in metadata', async () => {
      const result = await adapter.createWallet(createWalletData);

      expect((result as any).metadata?.secretKey).toBe(mockKeypair.secretKey);
    });

    it('should handle funding failure gracefully', async () => {
      horizonService.fundTestnetAccount.mockRejectedValue(
        new Error('Friendbot error'),
      );

      // Should not throw, just log warning
      const result = await adapter.createWallet(createWalletData);

      expect(result.providerId).toBe(mockKeypair.publicKey);
    });

    it('should handle trustline creation failure gracefully', async () => {
      horizonService.createUsdcTrustline.mockRejectedValue(
        new Error('Trustline error'),
      );

      // Should not throw, just log warning
      const result = await adapter.createWallet(createWalletData);

      expect(result.providerId).toBe(mockKeypair.publicKey);
    });

    it('should propagate keypair generation errors', async () => {
      horizonService.generateKeypair.mockImplementation(() => {
        throw new Error('Keypair generation failed');
      });

      await expect(adapter.createWallet(createWalletData)).rejects.toThrow(
        'Keypair generation failed',
      );
    });
  });

  describe('getWallet', () => {
    it('should return wallet information for existing account', async () => {
      const result = await adapter.getWallet(mockKeypair.publicKey);

      expect(result).not.toBeNull();
      expect(result?.providerId).toBe(mockKeypair.publicKey);
      expect(result?.address).toBe(mockKeypair.publicKey);
      expect(result?.blockchain).toBe('STELLAR');
      expect(result?.status).toBe('active');
    });

    it('should return correct balances', async () => {
      const result = await adapter.getWallet(mockKeypair.publicKey);

      expect(result?.balances).toHaveLength(2);
      expect(result?.balances[0].currency).toBe('XLM');
      expect(result?.balances[1].currency).toBe('USDC');
      expect(result?.balances[1].available).toBe('500.0000000');
    });

    it('should return null for non-existent account', async () => {
      horizonService.getAccount.mockResolvedValue(null);

      const result = await adapter.getWallet('GBNONEXISTENT');

      expect(result).toBeNull();
    });

    it('should map inactive account status', async () => {
      horizonService.getAccount.mockResolvedValue({
        ...mockAccount,
        status: 'inactive',
      });

      const result = await adapter.getWallet(mockKeypair.publicKey);

      expect(result?.status).toBe('frozen');
    });

    it('should propagate StellarError', async () => {
      const stellarError = new StellarError('Network error', 'NETWORK_ERROR');
      horizonService.getAccount.mockRejectedValue(stellarError);

      await expect(adapter.getWallet(mockKeypair.publicKey)).rejects.toThrow(
        StellarError,
      );
    });

    it('should propagate other errors', async () => {
      horizonService.getAccount.mockRejectedValue(new Error('Unknown error'));

      await expect(adapter.getWallet(mockKeypair.publicKey)).rejects.toThrow(
        'Unknown error',
      );
    });
  });

  describe('getBalance', () => {
    it('should return all balances for existing account', async () => {
      const result = await adapter.getBalance(mockKeypair.publicKey);

      expect(result).toHaveLength(2);
      expect(result[0].currency).toBe('XLM');
      expect(result[0].available).toBe('100.0000000');
      expect(result[1].currency).toBe('USDC');
      expect(result[1].available).toBe('500.0000000');
    });

    it('should return zero balances for non-existent account', async () => {
      horizonService.getAccount.mockResolvedValue(null);

      const result = await adapter.getBalance('GBNONEXISTENT');

      expect(result).toHaveLength(2);
      expect(result[0].currency).toBe('USDC');
      expect(result[0].available).toBe('0');
      expect(result[1].currency).toBe('XLM');
      expect(result[1].available).toBe('0');
    });

    it('should include pending as zero', async () => {
      const result = await adapter.getBalance(mockKeypair.publicKey);

      result.forEach((balance) => {
        expect(balance.pending).toBe('0');
      });
    });
  });

  describe('getDepositAddress', () => {
    it('should return public key as deposit address', async () => {
      const result = await adapter.getDepositAddress(mockKeypair.publicKey);

      expect(result).toBe(mockKeypair.publicKey);
    });

    it('should throw error for non-existent account', async () => {
      horizonService.getAccount.mockResolvedValue(null);

      await expect(
        adapter.getDepositAddress('GBNONEXISTENT'),
      ).rejects.toThrow(StellarError);
    });

    it('should warn when account lacks USDC trustline', async () => {
      const accountWithoutTrustline = {
        ...mockAccount,
        hasUsdcTrustline: false,
      };
      horizonService.getAccount.mockResolvedValue(accountWithoutTrustline);

      // Should still return address but log warning
      const result = await adapter.getDepositAddress(mockKeypair.publicKey);

      expect(result).toBe(mockKeypair.publicKey);
    });

    it('should ignore blockchain parameter', async () => {
      const result = await adapter.getDepositAddress(
        mockKeypair.publicKey,
        'IGNORED_CHAIN',
      );

      expect(result).toBe(mockKeypair.publicKey);
    });
  });

  describe('listWallets', () => {
    it('should return array with single wallet', async () => {
      const result = await adapter.listWallets(mockKeypair.publicKey);

      expect(result).toHaveLength(1);
      expect(result[0].providerId).toBe(mockKeypair.publicKey);
    });

    it('should return empty array for non-existent user', async () => {
      horizonService.getAccount.mockResolvedValue(null);

      const result = await adapter.listWallets('GBNONEXISTENT');

      expect(result).toHaveLength(0);
    });

    it('should return empty array on error', async () => {
      horizonService.getAccount.mockRejectedValue(new Error('Network error'));

      const result = await adapter.listWallets(mockKeypair.publicKey);

      expect(result).toHaveLength(0);
    });
  });

  describe('ensureUsdcTrustline', () => {
    it('should return true when trustline already exists', async () => {
      const result = await adapter.ensureUsdcTrustline(mockKeypair.secretKey);

      expect(result).toBe(true);
      expect(horizonService.createUsdcTrustline).not.toHaveBeenCalled();
    });

    it('should create trustline when missing', async () => {
      horizonService.getAccount.mockResolvedValue({
        ...mockAccount,
        hasUsdcTrustline: false,
      });

      const result = await adapter.ensureUsdcTrustline(mockKeypair.secretKey);

      expect(result).toBe(true);
      expect(horizonService.createUsdcTrustline).toHaveBeenCalledWith(
        mockKeypair.secretKey,
      );
    });

    it('should throw error for non-existent account', async () => {
      horizonService.getAccount.mockResolvedValue(null);

      await expect(
        adapter.ensureUsdcTrustline(mockKeypair.secretKey),
      ).rejects.toThrow(StellarError);
    });

    it('should propagate trustline creation errors', async () => {
      horizonService.getAccount.mockResolvedValue({
        ...mockAccount,
        hasUsdcTrustline: false,
      });
      horizonService.createUsdcTrustline.mockRejectedValue(
        new Error('Insufficient XLM'),
      );

      await expect(
        adapter.ensureUsdcTrustline(mockKeypair.secretKey),
      ).rejects.toThrow('Insufficient XLM');
    });
  });

  describe('isReadyForUsdc', () => {
    it('should return true when account has USDC trustline', async () => {
      const result = await adapter.isReadyForUsdc(mockKeypair.publicKey);

      expect(result).toBe(true);
    });

    it('should return false when account lacks trustline', async () => {
      horizonService.getAccount.mockResolvedValue({
        ...mockAccount,
        hasUsdcTrustline: false,
      });

      const result = await adapter.isReadyForUsdc(mockKeypair.publicKey);

      expect(result).toBe(false);
    });

    it('should return false for non-existent account', async () => {
      horizonService.getAccount.mockResolvedValue(null);

      const result = await adapter.isReadyForUsdc('GBNONEXISTENT');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      horizonService.getAccount.mockRejectedValue(new Error('Network error'));

      const result = await adapter.isReadyForUsdc(mockKeypair.publicKey);

      expect(result).toBe(false);
    });
  });
});
