import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { StellarOnRampAdapter } from '../adapters/stellar-onramp.adapter';
import { StellarSep10Service } from '../services/stellar-sep10.service';
import { StellarSep24Service } from '../services/stellar-sep24.service';
import { StellarAuthError, Sep24Info, Sep24Transaction } from '../stellar.types';

describe('StellarOnRampAdapter', () => {
  let adapter: StellarOnRampAdapter;
  let sep10Service: jest.Mocked<StellarSep10Service>;
  let sep24Service: jest.Mocked<StellarSep24Service>;

  const mockConfigValues: Record<string, any> = {
    'stellar.network': 'testnet',
    'stellar.horizonUrl': 'https://horizon-testnet.stellar.org',
    'stellar.usdcAssetCode': 'USDC',
    'stellar.usdcIssuer': 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    'stellar.anchorDomain': 'test-anchor.stellar.org',
    'stellar.webhookSecret': 'test-webhook-secret',
    'stellar.useMock': false,
  };

  const mockSep24Info: Sep24Info = {
    deposit: {
      USDC: {
        enabled: true,
        authenticationRequired: true,
        minAmount: 10,
        maxAmount: 10000,
        fee: { fixed: 1, percent: 0.5 },
        types: {
          bank_transfer: {},
          mobile_money: {},
          card: {},
        },
      },
    },
    withdraw: {
      USDC: {
        enabled: true,
        authenticationRequired: true,
        minAmount: 20,
        maxAmount: 5000,
        fee: { fixed: 2 },
        types: {
          bank_transfer: {},
        },
      },
    },
    features: {
      accountCreation: true,
      claimableBalances: true,
    },
  };

  const mockAuthToken = {
    token: 'mock-jwt-token',
    expiresAt: new Date(Date.now() + 3600000),
    account: 'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
  };

  const mockInteractiveResponse = {
    type: 'interactive_customer_info_needed' as const,
    url: 'https://test-anchor.stellar.org/deposit/interactive?token=abc123',
    id: 'deposit-tx-12345',
  };

  beforeEach(async () => {
    const mockSep10 = {
      authenticate: jest.fn().mockResolvedValue(mockAuthToken),
      isTokenValid: jest.fn().mockReturnValue(true),
    };

    const mockSep24 = {
      getInfo: jest.fn().mockResolvedValue(mockSep24Info),
      initiateDeposit: jest.fn().mockResolvedValue(mockInteractiveResponse),
      getTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarOnRampAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfigValues[key]),
          },
        },
        {
          provide: StellarSep10Service,
          useValue: mockSep10,
        },
        {
          provide: StellarSep24Service,
          useValue: mockSep24,
        },
      ],
    }).compile();

    adapter = module.get<StellarOnRampAdapter>(StellarOnRampAdapter);
    sep10Service = module.get(StellarSep10Service);
    sep24Service = module.get(StellarSep24Service);
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

    it('should have supported countries', () => {
      expect(adapter.supportedCountries).toContain('US');
      expect(adapter.supportedCountries).toContain('CI');
      expect(adapter.supportedCountries).toContain('NG');
    });
  });

  describe('getChannels', () => {
    it('should return available payment channels', async () => {
      const channels = await adapter.getChannels('US');

      expect(channels.length).toBeGreaterThan(0);
      expect(sep24Service.getInfo).toHaveBeenCalled();
    });

    it('should include bank transfer channel when available', async () => {
      const channels = await adapter.getChannels('US');

      const bankChannel = channels.find((c) => c.type === 'bank_transfer');
      expect(bankChannel).toBeDefined();
      expect(bankChannel?.provider).toBe('stellar-anchor');
    });

    it('should include mobile money channel when available', async () => {
      const channels = await adapter.getChannels('CI');

      const mobileChannel = channels.find((c) => c.type === 'mobile_money');
      expect(mobileChannel).toBeDefined();
      expect(mobileChannel?.name).toBe('Mobile Money');
    });

    it('should include card channel when available', async () => {
      const channels = await adapter.getChannels('US');

      const cardChannel = channels.find((c) => c.type === 'card');
      expect(cardChannel).toBeDefined();
      expect(cardChannel?.name).toBe('Card Payment');
    });

    it('should return empty array when USDC deposit not available', async () => {
      sep24Service.getInfo.mockResolvedValue({
        ...mockSep24Info,
        deposit: {},
      });

      const channels = await adapter.getChannels('US');

      expect(channels).toHaveLength(0);
    });

    it('should return empty array when USDC not enabled', async () => {
      sep24Service.getInfo.mockResolvedValue({
        ...mockSep24Info,
        deposit: {
          USDC: { ...mockSep24Info.deposit.USDC, enabled: false },
        },
      });

      const channels = await adapter.getChannels('US');

      expect(channels).toHaveLength(0);
    });

    it('should return default channel when no specific types available', async () => {
      sep24Service.getInfo.mockResolvedValue({
        deposit: {
          USDC: {
            enabled: true,
            authenticationRequired: true,
            minAmount: 10,
            maxAmount: 10000,
            types: {},
          },
        },
        withdraw: {},
        features: { accountCreation: false, claimableBalances: false },
      });

      const channels = await adapter.getChannels('US');

      expect(channels).toHaveLength(1);
      expect(channels[0].id).toBe('stellar-default');
    });

    it('should return empty array on error', async () => {
      sep24Service.getInfo.mockRejectedValue(new Error('Network error'));

      const channels = await adapter.getChannels('US');

      expect(channels).toHaveLength(0);
    });

    it('should set correct min/max amounts from anchor info', async () => {
      const channels = await adapter.getChannels('US');

      const bankChannel = channels.find((c) => c.type === 'bank_transfer');
      expect(bankChannel?.minAmount).toBe(10);
      expect(bankChannel?.maxAmount).toBe(10000);
    });

    it('should set correct fee from anchor info', async () => {
      const channels = await adapter.getChannels('US');

      const bankChannel = channels.find((c) => c.type === 'bank_transfer');
      expect(bankChannel?.fee).toBe(1);
    });
  });

  describe('getRate', () => {
    it('should return 1:1 rate for USD to USDC', async () => {
      const rate = await adapter.getRate('USD', 'USDC', 100);

      expect(rate.rate).toBe(1);
      expect(rate.sourceAmount).toBe(100);
    });

    it('should estimate 1% fee', async () => {
      const rate = await adapter.getRate('USD', 'USDC', 100);

      expect(rate.fee).toBe(1);
      expect(rate.targetAmount).toBe(99);
    });

    it('should return rate < 1 for non-USD currencies', async () => {
      const rate = await adapter.getRate('EUR', 'USDC', 100);

      expect(rate.rate).toBeLessThan(1);
    });

    it('should set expiration time', async () => {
      const beforeTime = new Date();
      const rate = await adapter.getRate('USD', 'USDC', 100);

      expect(rate.expiresAt.getTime()).toBeGreaterThan(beforeTime.getTime());
      // Should expire within ~5 minutes
      expect(rate.expiresAt.getTime() - Date.now()).toBeLessThan(6 * 60 * 1000);
    });
  });

  describe('initiateDeposit', () => {
    const depositData = {
      userId: 'user-123',
      destinationWalletId: 'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
      amount: 100,
      sourceCurrency: 'USD',
      targetCurrency: 'USDC',
      channelId: 'stellar-bank-transfer',
      idempotencyKey: 'deposit-idempotency-key-123',
      metadata: {
        sourceSecretKey: 'SBSECRET1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
        countryCode: 'US',
      },
    };

    it('should initiate deposit with SEP-24 flow', async () => {
      const result = await adapter.initiateDeposit(depositData);

      expect(result.providerId).toBe('deposit-tx-12345');
      expect(result.status).toBe('awaiting_payment');
      expect(result.paymentInstructions.deepLink).toContain('deposit');
    });

    it('should authenticate with SEP-10 first', async () => {
      await adapter.initiateDeposit(depositData);

      expect(sep10Service.authenticate).toHaveBeenCalledWith(
        depositData.destinationWalletId,
        depositData.metadata.sourceSecretKey,
      );
    });

    it('should call SEP-24 initiateDeposit with auth token', async () => {
      await adapter.initiateDeposit(depositData);

      expect(sep24Service.initiateDeposit).toHaveBeenCalledWith({
        authToken: mockAuthToken.token,
        assetCode: 'USDC',
        account: depositData.destinationWalletId,
        amount: depositData.amount.toString(),
        lang: 'en',
        countryCode: 'US',
      });
    });

    it('should throw error when source secret key missing', async () => {
      await expect(
        adapter.initiateDeposit({
          ...depositData,
          metadata: {},
        }),
      ).rejects.toThrow(StellarAuthError);
    });

    it('should throw error when SEP-10 authentication fails', async () => {
      sep10Service.authenticate.mockRejectedValue(
        new StellarAuthError('Auth failed'),
      );

      await expect(adapter.initiateDeposit(depositData)).rejects.toThrow(
        StellarAuthError,
      );
    });

    it('should throw error when SEP-24 deposit fails', async () => {
      sep24Service.initiateDeposit.mockRejectedValue(
        new StellarAuthError('Deposit failed'),
      );

      await expect(adapter.initiateDeposit(depositData)).rejects.toThrow(
        StellarAuthError,
      );
    });

    it('should include payment instructions with reference', async () => {
      const result = await adapter.initiateDeposit(depositData);

      expect(result.paymentInstructions.reference).toBe('deposit-tx-12345');
      expect(result.paymentInstructions.type).toBe('bank_transfer');
    });

    it('should estimate target amount with fee', async () => {
      const result = await adapter.initiateDeposit(depositData);

      expect(result.targetAmount).toBe(99); // 100 - 1% fee
      expect(result.fee).toBe(1);
    });

    it('should set expiration time', async () => {
      const result = await adapter.initiateDeposit(depositData);

      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('getDepositStatus', () => {
    it('should return pending status when auth token not available', async () => {
      const result = await adapter.getDepositStatus('deposit-tx-12345');

      expect(result.status).toBe('pending');
      expect(result.providerId).toBe('deposit-tx-12345');
    });

    // Note: Full status check requires auth token, tested in getDepositStatusWithAuth
  });

  describe('getDepositStatusWithAuth', () => {
    const mockTransaction: Sep24Transaction = {
      id: 'deposit-tx-12345',
      kind: 'deposit',
      status: 'completed',
      amountIn: '100.00',
      amountOut: '99.50',
      amountFee: '0.50',
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:30:00Z',
      stellarTransactionId: 'stellar-tx-hash-abc',
    };

    it('should return mapped deposit status', async () => {
      sep24Service.getTransaction.mockResolvedValue(mockTransaction);

      const result = await adapter.getDepositStatusWithAuth(
        'deposit-tx-12345',
        'auth-token',
      );

      expect(result.status).toBe('completed');
      expect(result.providerId).toBe('deposit-tx-12345');
      expect(result.targetAmount).toBe(99.5);
    });

    it('should map awaiting_payment status', async () => {
      sep24Service.getTransaction.mockResolvedValue({
        ...mockTransaction,
        status: 'pending_user_transfer_start',
      });

      const result = await adapter.getDepositStatusWithAuth(
        'tx-id',
        'auth-token',
      );

      expect(result.status).toBe('awaiting_payment');
    });

    it('should map processing status', async () => {
      sep24Service.getTransaction.mockResolvedValue({
        ...mockTransaction,
        status: 'pending_anchor',
      });

      const result = await adapter.getDepositStatusWithAuth(
        'tx-id',
        'auth-token',
      );

      expect(result.status).toBe('processing');
    });

    it('should map failed status', async () => {
      sep24Service.getTransaction.mockResolvedValue({
        ...mockTransaction,
        status: 'error',
      });

      const result = await adapter.getDepositStatusWithAuth(
        'tx-id',
        'auth-token',
      );

      expect(result.status).toBe('failed');
    });

    it('should map expired status', async () => {
      sep24Service.getTransaction.mockResolvedValue({
        ...mockTransaction,
        status: 'expired',
      });

      const result = await adapter.getDepositStatusWithAuth(
        'tx-id',
        'auth-token',
      );

      expect(result.status).toBe('expired');
    });

    it('should propagate errors', async () => {
      sep24Service.getTransaction.mockRejectedValue(
        new StellarAuthError('Token expired'),
      );

      await expect(
        adapter.getDepositStatusWithAuth('tx-id', 'invalid-token'),
      ).rejects.toThrow(StellarAuthError);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true for valid signature', () => {
      const payload = '{"transaction":{"id":"tx-123"}}';
      const hmac = crypto.createHmac('sha256', 'test-webhook-secret');
      const signature = hmac.update(payload).digest('hex');

      const result = adapter.verifyWebhookSignature(payload, signature);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const payload = '{"transaction":{"id":"tx-123"}}';
      const invalidSignature = 'invalid-signature-hash';

      const result = adapter.verifyWebhookSignature(payload, invalidSignature);

      expect(result).toBe(false);
    });

    it('should return false when webhook secret not configured', () => {
      const adapterWithoutSecret = new StellarOnRampAdapter(
        {
          get: jest.fn((key: string) => {
            if (key === 'stellar.webhookSecret') return undefined;
            return mockConfigValues[key];
          }),
        } as any,
        sep10Service as any,
        sep24Service as any,
      );

      const result = adapterWithoutSecret.verifyWebhookSignature(
        '{"data":"test"}',
        'signature',
      );

      expect(result).toBe(false);
    });
  });

  describe('parseWebhookEvent', () => {
    it('should parse deposit completed event', () => {
      const payload = {
        transaction: {
          id: 'tx-123',
          kind: 'deposit',
          status: 'completed',
        },
      };

      const result = adapter.parseWebhookEvent(payload);

      expect(result.type).toBe('deposit.completed');
      expect(result.depositId).toBe('tx-123');
    });

    it('should parse deposit pending event', () => {
      const payload = {
        transaction: {
          id: 'tx-123',
          kind: 'deposit',
          status: 'pending_user_transfer_start',
        },
      };

      const result = adapter.parseWebhookEvent(payload);

      expect(result.type).toBe('deposit.pending');
    });

    it('should parse deposit failed event', () => {
      const payload = {
        transaction: {
          id: 'tx-123',
          kind: 'deposit',
          status: 'error',
        },
      };

      const result = adapter.parseWebhookEvent(payload);

      expect(result.type).toBe('deposit.failed');
    });

    it('should parse deposit expired event', () => {
      const payload = {
        transaction: {
          id: 'tx-123',
          kind: 'deposit',
          status: 'expired',
        },
      };

      const result = adapter.parseWebhookEvent(payload);

      expect(result.type).toBe('deposit.expired');
    });

    it('should handle withdrawal events', () => {
      const payload = {
        transaction: {
          id: 'tx-456',
          kind: 'withdrawal',
          status: 'completed',
        },
      };

      const result = adapter.parseWebhookEvent(payload);

      expect(result.type).toBe('withdrawal.completed');
    });

    it('should throw error when transaction missing', () => {
      expect(() => adapter.parseWebhookEvent({})).toThrow(
        'Invalid webhook payload',
      );
    });

    it('should include full payload in data', () => {
      const payload = {
        transaction: {
          id: 'tx-123',
          kind: 'deposit',
          status: 'completed',
          extraField: 'value',
        },
      };

      const result = adapter.parseWebhookEvent(payload);

      expect(result.data).toEqual(payload);
    });
  });
});
