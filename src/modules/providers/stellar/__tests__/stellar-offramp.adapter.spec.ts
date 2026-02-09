import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { StellarOffRampAdapter } from '../adapters/stellar-offramp.adapter';
import { StellarSep10Service } from '../services/stellar-sep10.service';
import { StellarSep24Service } from '../services/stellar-sep24.service';
import { StellarAuthError, Sep24Info, Sep24Transaction } from '../stellar.types';

describe('StellarOffRampAdapter', () => {
  let adapter: StellarOffRampAdapter;
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
        fee: { fixed: 1 },
        types: { bank_transfer: {} },
      },
    },
    withdraw: {
      USDC: {
        enabled: true,
        authenticationRequired: true,
        minAmount: 20,
        maxAmount: 5000,
        fee: { fixed: 2, percent: 1 },
        types: {
          bank_transfer: {},
          mobile_money: {},
          ach: {},
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
    url: 'https://test-anchor.stellar.org/withdraw/interactive?token=xyz789',
    id: 'withdraw-tx-67890',
  };

  beforeEach(async () => {
    const mockSep10 = {
      authenticate: jest.fn().mockResolvedValue(mockAuthToken),
      isTokenValid: jest.fn().mockReturnValue(true),
    };

    const mockSep24 = {
      getInfo: jest.fn().mockResolvedValue(mockSep24Info),
      initiateWithdrawal: jest.fn().mockResolvedValue(mockInteractiveResponse),
      getTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarOffRampAdapter,
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

    adapter = module.get<StellarOffRampAdapter>(StellarOffRampAdapter);
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
      expect(adapter.supportedCountries).toContain('GH');
    });
  });

  describe('getChannels', () => {
    it('should return available withdrawal channels', async () => {
      const channels = await adapter.getChannels('US');

      expect(channels.length).toBeGreaterThan(0);
      expect(sep24Service.getInfo).toHaveBeenCalled();
    });

    it('should include bank transfer channel when available', async () => {
      const channels = await adapter.getChannels('US');

      const bankChannel = channels.find((c) => c.type === 'bank_transfer');
      expect(bankChannel).toBeDefined();
      expect(bankChannel?.name).toBe('Bank Transfer');
    });

    it('should include mobile money channel when available', async () => {
      const channels = await adapter.getChannels('CI');

      const mobileChannel = channels.find((c) => c.type === 'mobile_money');
      expect(mobileChannel).toBeDefined();
    });

    it('should include ACH channel for US', async () => {
      const channels = await adapter.getChannels('US');

      const achChannel = channels.find((c) => c.type === 'ach');
      expect(achChannel).toBeDefined();
      expect(achChannel?.country).toBe('US');
    });

    it('should return empty array when USDC withdrawal not available', async () => {
      sep24Service.getInfo.mockResolvedValue({
        ...mockSep24Info,
        withdraw: {},
      });

      const channels = await adapter.getChannels('US');

      expect(channels).toHaveLength(0);
    });

    it('should return empty array when USDC not enabled', async () => {
      sep24Service.getInfo.mockResolvedValue({
        ...mockSep24Info,
        withdraw: {
          USDC: { ...mockSep24Info.withdraw.USDC, enabled: false },
        },
      });

      const channels = await adapter.getChannels('US');

      expect(channels).toHaveLength(0);
    });

    it('should return default channel when no specific types available', async () => {
      sep24Service.getInfo.mockResolvedValue({
        deposit: {},
        withdraw: {
          USDC: {
            enabled: true,
            authenticationRequired: true,
            minAmount: 20,
            maxAmount: 5000,
            types: {},
          },
        },
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

    it('should set correct min/max amounts', async () => {
      const channels = await adapter.getChannels('US');

      const bankChannel = channels.find((c) => c.type === 'bank_transfer');
      expect(bankChannel?.minAmount).toBe(20);
      expect(bankChannel?.maxAmount).toBe(5000);
    });

    it('should set correct fee type based on anchor info', async () => {
      const channels = await adapter.getChannels('US');

      const bankChannel = channels.find((c) => c.type === 'bank_transfer');
      expect(bankChannel?.feeType).toBe('percentage');
    });
  });

  describe('getRate', () => {
    it('should return 1:1 rate for USDC to USD', async () => {
      const rate = await adapter.getRate('USDC', 'USD', 100);

      expect(rate.rate).toBe(1);
      expect(rate.sourceAmount).toBe(100);
    });

    it('should estimate 1% fee', async () => {
      const rate = await adapter.getRate('USDC', 'USD', 100);

      expect(rate.fee).toBe(1);
      expect(rate.targetAmount).toBe(99);
    });

    it('should return rate < 1 for non-USD target', async () => {
      const rate = await adapter.getRate('USDC', 'EUR', 100);

      expect(rate.rate).toBeLessThan(1);
    });

    it('should set expiration time', async () => {
      const rate = await adapter.getRate('USDC', 'USD', 100);

      expect(rate.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('initiateWithdrawal', () => {
    const withdrawalData = {
      userId: 'user-123',
      sourceWalletId: 'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
      amount: 100,
      targetCurrency: 'USD',
      destination: {
        bankName: 'Test Bank',
        accountNumber: '1234567890',
        accountHolderName: 'John Doe',
      },
      channelId: 'stellar-bank-transfer',
      idempotencyKey: 'withdrawal-idempotency-key-123',
      metadata: {
        sourceSecretKey: 'SBSECRET1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
        countryCode: 'US',
      },
    };

    it('should initiate withdrawal with SEP-24 flow', async () => {
      const result = await adapter.initiateWithdrawal(withdrawalData);

      expect(result.providerId).toBe('withdraw-tx-67890');
      expect(result.status).toBe('pending');
      expect(result.reference).toContain('withdraw');
    });

    it('should authenticate with SEP-10 first', async () => {
      await adapter.initiateWithdrawal(withdrawalData);

      expect(sep10Service.authenticate).toHaveBeenCalledWith(
        withdrawalData.sourceWalletId,
        withdrawalData.metadata.sourceSecretKey,
      );
    });

    it('should call SEP-24 initiateWithdrawal with auth token', async () => {
      await adapter.initiateWithdrawal(withdrawalData);

      expect(sep24Service.initiateWithdrawal).toHaveBeenCalledWith({
        authToken: mockAuthToken.token,
        assetCode: 'USDC',
        account: withdrawalData.sourceWalletId,
        amount: withdrawalData.amount.toString(),
        lang: 'en',
        countryCode: 'US',
      });
    });

    it('should throw error when source secret key missing', async () => {
      await expect(
        adapter.initiateWithdrawal({
          ...withdrawalData,
          metadata: {},
        }),
      ).rejects.toThrow(StellarAuthError);
    });

    it('should throw error when SEP-10 authentication fails', async () => {
      sep10Service.authenticate.mockRejectedValue(
        new StellarAuthError('Auth failed'),
      );

      await expect(adapter.initiateWithdrawal(withdrawalData)).rejects.toThrow(
        StellarAuthError,
      );
    });

    it('should throw error when SEP-24 withdrawal fails', async () => {
      sep24Service.initiateWithdrawal.mockRejectedValue(
        new StellarAuthError('Withdrawal failed'),
      );

      await expect(adapter.initiateWithdrawal(withdrawalData)).rejects.toThrow(
        StellarAuthError,
      );
    });

    it('should estimate target amount with fee', async () => {
      const result = await adapter.initiateWithdrawal(withdrawalData);

      expect(result.targetAmount).toBe(99); // 100 - 1% fee
      expect(result.fee).toBe(1);
    });

    it('should set estimated arrival time', async () => {
      const result = await adapter.initiateWithdrawal(withdrawalData);

      expect(result.estimatedArrival).toBeDefined();
      expect(result.estimatedArrival!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should include destination details', async () => {
      const result = await adapter.initiateWithdrawal(withdrawalData);

      expect(result.destination).toEqual(withdrawalData.destination);
    });
  });

  describe('getWithdrawalStatus', () => {
    it('should return pending status when auth token not available', async () => {
      const result = await adapter.getWithdrawalStatus('withdraw-tx-67890');

      expect(result.status).toBe('pending');
      expect(result.providerId).toBe('withdraw-tx-67890');
    });
  });

  describe('getWithdrawalStatusWithAuth', () => {
    const mockTransaction: Sep24Transaction = {
      id: 'withdraw-tx-67890',
      kind: 'withdrawal',
      status: 'completed',
      amountIn: '100.00',
      amountOut: '98.00',
      amountFee: '2.00',
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T14:00:00Z',
      externalTransactionId: 'bank-ref-abc123',
    };

    it('should return mapped withdrawal status', async () => {
      sep24Service.getTransaction.mockResolvedValue(mockTransaction);

      const result = await adapter.getWithdrawalStatusWithAuth(
        'withdraw-tx-67890',
        'auth-token',
      );

      expect(result.status).toBe('completed');
      expect(result.providerId).toBe('withdraw-tx-67890');
      expect(result.sourceAmount).toBe(100);
      expect(result.targetAmount).toBe(98);
    });

    it('should map processing status', async () => {
      sep24Service.getTransaction.mockResolvedValue({
        ...mockTransaction,
        status: 'pending_external',
      });

      const result = await adapter.getWithdrawalStatusWithAuth(
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

      const result = await adapter.getWithdrawalStatusWithAuth(
        'tx-id',
        'auth-token',
      );

      expect(result.status).toBe('failed');
    });

    it('should map refunded status', async () => {
      sep24Service.getTransaction.mockResolvedValue({
        ...mockTransaction,
        status: 'refunded',
      });

      const result = await adapter.getWithdrawalStatusWithAuth(
        'tx-id',
        'auth-token',
      );

      expect(result.status).toBe('returned');
    });

    it('should include external reference when available', async () => {
      sep24Service.getTransaction.mockResolvedValue(mockTransaction);

      const result = await adapter.getWithdrawalStatusWithAuth(
        'tx-id',
        'auth-token',
      );

      expect(result.reference).toBe('bank-ref-abc123');
    });

    it('should propagate errors', async () => {
      sep24Service.getTransaction.mockRejectedValue(
        new StellarAuthError('Token expired'),
      );

      await expect(
        adapter.getWithdrawalStatusWithAuth('tx-id', 'invalid-token'),
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
      const invalidSignature = 'invalid-signature';

      const result = adapter.verifyWebhookSignature(payload, invalidSignature);

      expect(result).toBe(false);
    });

    it('should return false when webhook secret not configured', () => {
      const adapterWithoutSecret = new StellarOffRampAdapter(
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
    it('should parse withdrawal completed event', () => {
      const payload = {
        transaction: {
          id: 'tx-123',
          kind: 'withdrawal',
          status: 'completed',
        },
      };

      const result = adapter.parseWebhookEvent(payload);

      expect(result.type).toBe('withdrawal.completed');
      expect(result.withdrawalId).toBe('tx-123');
    });

    it('should parse withdrawal pending event', () => {
      const payload = {
        transaction: {
          id: 'tx-123',
          kind: 'withdrawal',
          status: 'pending_external',
        },
      };

      const result = adapter.parseWebhookEvent(payload);

      expect(result.type).toBe('withdrawal.pending');
    });

    it('should parse withdrawal failed event', () => {
      const payload = {
        transaction: {
          id: 'tx-123',
          kind: 'withdrawal',
          status: 'error',
        },
      };

      const result = adapter.parseWebhookEvent(payload);

      expect(result.type).toBe('withdrawal.failed');
    });

    it('should parse withdrawal returned/refunded event', () => {
      const payload = {
        transaction: {
          id: 'tx-123',
          kind: 'withdrawal',
          status: 'refunded',
        },
      };

      const result = adapter.parseWebhookEvent(payload);

      expect(result.type).toBe('withdrawal.returned');
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
          kind: 'withdrawal',
          status: 'completed',
          externalTransactionId: 'external-ref',
        },
      };

      const result = adapter.parseWebhookEvent(payload);

      expect(result.data).toEqual(payload);
    });

    it('should default to pending for unknown status', () => {
      const payload = {
        transaction: {
          id: 'tx-123',
          kind: 'withdrawal',
          status: 'unknown_status',
        },
      };

      const result = adapter.parseWebhookEvent(payload);

      expect(result.type).toBe('withdrawal.pending');
    });
  });
});
