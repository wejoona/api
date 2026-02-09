import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarSep24Service } from '../services/stellar-sep24.service';
import { StellarSep10Service } from '../services/stellar-sep10.service';
import { StellarAuthError, Sep24Transaction, Sep24Info } from '../stellar.types';

describe('StellarSep24Service', () => {
  let service: StellarSep24Service;
  let sep10Service: StellarSep10Service;

  const mockConfigValues: Record<string, any> = {
    'stellar.network': 'testnet',
    'stellar.horizonUrl': 'https://horizon-testnet.stellar.org',
    'stellar.usdcAssetCode': 'USDC',
    'stellar.usdcIssuer': 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    'stellar.anchorDomain': 'test-anchor.stellar.org',
    'stellar.useMock': false,
  };

  const mockToml = `
    WEB_AUTH_ENDPOINT="https://test-anchor.stellar.org/auth"
    TRANSFER_SERVER_SEP0024="https://test-anchor.stellar.org/sep24"
  `;

  beforeEach(async () => {
    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarSep24Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfigValues[key]),
          },
        },
        {
          provide: StellarSep10Service,
          useValue: {
            authenticate: jest.fn(),
            isTokenValid: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StellarSep24Service>(StellarSep24Service);
    sep10Service = module.get<StellarSep10Service>(StellarSep10Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getTransferServerUrl', () => {
    it('should extract TRANSFER_SERVER_SEP0024 from stellar.toml', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(mockToml),
      });

      const url = await service.getTransferServerUrl('test-anchor.stellar.org');

      expect(url).toBe('https://test-anchor.stellar.org/sep24');
    });

    it('should fallback to TRANSFER_SERVER when SEP0024 not available', async () => {
      const fallbackToml = `
        WEB_AUTH_ENDPOINT="https://test-anchor.stellar.org/auth"
        TRANSFER_SERVER="https://test-anchor.stellar.org/transfer"
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(fallbackToml),
      });

      const url = await service.getTransferServerUrl('test-anchor.stellar.org');

      expect(url).toBe('https://test-anchor.stellar.org/transfer');
    });

    it('should throw error when no transfer server found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('WEB_AUTH_ENDPOINT="https://example.com"'),
      });

      await expect(
        service.getTransferServerUrl('test-anchor.stellar.org'),
      ).rejects.toThrow(StellarAuthError);
    });

    it('should throw error when stellar.toml fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(
        service.getTransferServerUrl('invalid-domain.com'),
      ).rejects.toThrow(StellarAuthError);
    });
  });

  describe('getInfo', () => {
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

    it('should fetch SEP-24 service info', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSep24Info),
        });

      const info = await service.getInfo();

      expect(info.deposit.USDC.enabled).toBe(true);
      expect(info.withdraw.USDC.enabled).toBe(true);
      expect(info.deposit.USDC.minAmount).toBe(10);
    });

    it('should throw error when anchor domain not configured', async () => {
      const serviceWithoutDomain = new StellarSep24Service(
        {
          get: jest.fn((key: string) => {
            if (key === 'stellar.anchorDomain') return undefined;
            return mockConfigValues[key];
          }),
        } as any,
        sep10Service,
      );

      await expect(serviceWithoutDomain.getInfo()).rejects.toThrow(
        'Anchor domain not configured',
      );
    });

    it('should throw error when info request fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      await expect(service.getInfo()).rejects.toThrow(StellarAuthError);
    });
  });

  describe('initiateDeposit', () => {
    const depositRequest = {
      authToken: 'mock-jwt-token',
      assetCode: 'USDC',
      account: 'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
      amount: '100',
      lang: 'en',
      countryCode: 'US',
    };

    it('should initiate interactive deposit', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            type: 'interactive_customer_info_needed',
            url: 'https://test-anchor.stellar.org/deposit?token=abc123',
            id: 'deposit-tx-12345',
          }),
        });

      const result = await service.initiateDeposit(depositRequest);

      expect(result.type).toBe('interactive_customer_info_needed');
      expect(result.url).toContain('deposit');
      expect(result.id).toBe('deposit-tx-12345');
    });

    it('should include all optional parameters', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            type: 'interactive_customer_info_needed',
            url: 'https://test-anchor.stellar.org/deposit',
            id: 'deposit-tx-123',
          }),
        });

      await service.initiateDeposit({
        ...depositRequest,
        memo: 'test-memo',
        memoType: 'text',
        claimableBalanceSupported: true,
      });

      // Verify the POST body contains all parameters
      const fetchCall = (global.fetch as jest.Mock).mock.calls[1];
      expect(fetchCall[1].body).toContain('memo=test-memo');
      expect(fetchCall[1].body).toContain('claimable_balance_supported=true');
    });

    it('should throw error when anchor domain not configured', async () => {
      const serviceWithoutDomain = new StellarSep24Service(
        {
          get: jest.fn((key: string) => {
            if (key === 'stellar.anchorDomain') return undefined;
            return mockConfigValues[key];
          }),
        } as any,
        sep10Service,
      );

      await expect(
        serviceWithoutDomain.initiateDeposit(depositRequest),
      ).rejects.toThrow('Anchor domain not configured');
    });

    it('should throw error when deposit initiation fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: jest.fn().mockResolvedValue('Invalid request'),
        });

      await expect(service.initiateDeposit(depositRequest)).rejects.toThrow(
        StellarAuthError,
      );
    });
  });

  describe('initiateWithdrawal', () => {
    const withdrawalRequest = {
      authToken: 'mock-jwt-token',
      assetCode: 'USDC',
      account: 'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
      amount: '50',
      lang: 'en',
      countryCode: 'US',
    };

    it('should initiate interactive withdrawal', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            type: 'interactive_customer_info_needed',
            url: 'https://test-anchor.stellar.org/withdraw?token=xyz789',
            id: 'withdraw-tx-67890',
          }),
        });

      const result = await service.initiateWithdrawal(withdrawalRequest);

      expect(result.type).toBe('interactive_customer_info_needed');
      expect(result.url).toContain('withdraw');
      expect(result.id).toBe('withdraw-tx-67890');
    });

    it('should include refund memo when provided', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            type: 'interactive_customer_info_needed',
            url: 'https://test-anchor.stellar.org/withdraw',
            id: 'withdraw-tx-123',
          }),
        });

      await service.initiateWithdrawal({
        ...withdrawalRequest,
        refundMemo: 'refund-123',
        refundMemoType: 'text',
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[1];
      expect(fetchCall[1].body).toContain('refund_memo=refund-123');
      expect(fetchCall[1].body).toContain('refund_memo_type=text');
    });

    it('should throw error when withdrawal initiation fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: jest.fn().mockResolvedValue('Unauthorized'),
        });

      await expect(service.initiateWithdrawal(withdrawalRequest)).rejects.toThrow(
        StellarAuthError,
      );
    });
  });

  describe('getTransaction', () => {
    const mockTransaction: Sep24Transaction = {
      id: 'tx-12345',
      kind: 'deposit',
      status: 'completed',
      amountIn: '100.00',
      amountOut: '99.50',
      amountFee: '0.50',
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:30:00Z',
      stellarTransactionId: 'stellar-tx-hash',
    };

    it('should get transaction by ID', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ transaction: mockTransaction }),
        });

      const result = await service.getTransaction('tx-12345', 'mock-auth-token');

      expect(result.id).toBe('tx-12345');
      expect(result.status).toBe('completed');
      expect(result.kind).toBe('deposit');
    });

    it('should include auth header in request', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ transaction: mockTransaction }),
        });

      await service.getTransaction('tx-12345', 'my-auth-token');

      const fetchCall = (global.fetch as jest.Mock).mock.calls[1];
      expect(fetchCall[1].headers.Authorization).toBe('Bearer my-auth-token');
    });

    it('should throw error when transaction query fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: jest.fn().mockResolvedValue('Transaction not found'),
        });

      await expect(
        service.getTransaction('invalid-tx', 'auth-token'),
      ).rejects.toThrow(StellarAuthError);
    });
  });

  describe('getTransactionByStellarId', () => {
    it('should get transaction by Stellar transaction ID', async () => {
      const mockTransaction: Sep24Transaction = {
        id: 'tx-12345',
        kind: 'deposit',
        status: 'completed',
        stellarTransactionId: 'stellar-hash-abc123',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ transaction: mockTransaction }),
        });

      const result = await service.getTransactionByStellarId(
        'stellar-hash-abc123',
        'auth-token',
      );

      expect(result.stellarTransactionId).toBe('stellar-hash-abc123');
    });
  });

  describe('listTransactions', () => {
    const mockTransactions: Sep24Transaction[] = [
      {
        id: 'tx-1',
        kind: 'deposit',
        status: 'completed',
        startedAt: '2024-01-15T10:00:00Z',
      },
      {
        id: 'tx-2',
        kind: 'withdrawal',
        status: 'pending_external',
        startedAt: '2024-01-14T09:00:00Z',
      },
    ];

    it('should list all transactions', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ transactions: mockTransactions }),
        });

      const result = await service.listTransactions('auth-token');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('tx-1');
    });

    it('should apply query filters', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ transactions: [mockTransactions[0]] }),
        });

      await service.listTransactions('auth-token', {
        assetCode: 'USDC',
        kind: 'deposit',
        limit: 10,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[1];
      expect(fetchCall[0]).toContain('asset_code=USDC');
      expect(fetchCall[0]).toContain('kind=deposit');
      expect(fetchCall[0]).toContain('limit=10');
    });

    it('should handle empty transaction list', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ transactions: [] }),
        });

      const result = await service.listTransactions('auth-token');

      expect(result).toHaveLength(0);
    });
  });

  describe('getQuote', () => {
    it('should get exchange rate quote', async () => {
      const mockQuote = {
        id: 'quote-123',
        expires_at: '2024-01-15T11:00:00Z',
        price: '1.00',
        sell_amount: '100.00',
        buy_amount: '99.00',
        fee: {
          total: '1.00',
          asset: 'iso4217:USD',
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockQuote),
        });

      const result = await service.getQuote(
        'auth-token',
        'iso4217:USD',
        'stellar:USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        '100.00',
      );

      expect(result.id).toBe('quote-123');
      expect(result.sellAmount).toBe('100.00');
      expect(result.buyAmount).toBe('99.00');
      expect(result.fee.total).toBe('1.00');
    });

    it('should throw error when quote request fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(mockToml),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: jest.fn().mockResolvedValue('Invalid amount'),
        });

      await expect(
        service.getQuote('auth-token', 'iso4217:USD', 'stellar:USDC:issuer', '0'),
      ).rejects.toThrow(StellarAuthError);
    });
  });

  describe('mapTransactionStatus', () => {
    it('should map completed status', () => {
      expect(service.mapTransactionStatus('completed')).toBe('completed');
    });

    it('should map error status to failed', () => {
      expect(service.mapTransactionStatus('error')).toBe('failed');
      expect(service.mapTransactionStatus('no_market')).toBe('failed');
    });

    it('should map expired status', () => {
      expect(service.mapTransactionStatus('expired')).toBe('expired');
    });

    it('should map processing statuses', () => {
      expect(service.mapTransactionStatus('pending_stellar')).toBe('processing');
      expect(service.mapTransactionStatus('pending_external')).toBe('processing');
      expect(service.mapTransactionStatus('pending_anchor')).toBe('processing');
    });

    it('should map pending statuses', () => {
      expect(service.mapTransactionStatus('incomplete')).toBe('pending');
      expect(service.mapTransactionStatus('pending_user_transfer_start')).toBe('pending');
      expect(service.mapTransactionStatus('pending_user')).toBe('pending');
      expect(service.mapTransactionStatus('pending_trust')).toBe('pending');
    });

    it('should default to pending for unknown statuses', () => {
      expect(service.mapTransactionStatus('unknown_status')).toBe('pending');
    });
  });
});
