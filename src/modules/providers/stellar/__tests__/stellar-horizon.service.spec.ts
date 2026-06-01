import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarHorizonService } from '../services/stellar-horizon.service';
import {
  StellarNetworkError,
  StellarTransactionError,
  TESTNET_PASSPHRASE,
} from '../stellar.types';

// Mock Stellar SDK
jest.mock('@stellar/stellar-sdk', () => {
  const mockKeypair = {
    publicKey: jest.fn(() => 'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345'),
    secret: jest.fn(() => 'SBSECRET1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234'),
  };
  const MockAsset = jest.fn((code, issuer) => ({
    code,
    issuer,
    isNative: () => code === 'XLM',
  }));
  (MockAsset as any).native = jest.fn(() => ({
    code: 'XLM',
    issuer: null,
    isNative: () => true,
  }));

  return {
    Keypair: {
      random: jest.fn(() => mockKeypair),
      fromSecret: jest.fn(() => ({
        publicKey: jest.fn(
          () => 'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
        ),
        sign: jest.fn(),
      })),
    },
    Asset: MockAsset,
    TransactionBuilder: jest.fn(() => ({
      addOperation: jest.fn().mockReturnThis(),
      addMemo: jest.fn().mockReturnThis(),
      setTimeout: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({
        sign: jest.fn(),
        toXDR: jest.fn(() => 'mock-xdr'),
      })),
    })),
    Operation: {
      changeTrust: jest.fn(() => ({ type: 'changeTrust' })),
      payment: jest.fn(() => ({ type: 'payment' })),
      createAccount: jest.fn(() => ({ type: 'createAccount' })),
    },
    Memo: {
      text: jest.fn((t) => ({ type: 'text', value: t })),
      id: jest.fn((i) => ({ type: 'id', value: i })),
      hash: jest.fn((h) => ({ type: 'hash', value: h })),
    },
    Horizon: {
      Server: jest.fn(() => ({
        loadAccount: jest.fn(),
        submitTransaction: jest.fn(),
        transactions: jest.fn(() => ({
          transaction: jest.fn(() => ({
            call: jest.fn(),
          })),
          forAccount: jest.fn(() => ({
            limit: jest.fn(() => ({
              order: jest.fn(() => ({
                call: jest.fn(),
              })),
            })),
          })),
        })),
      })),
    },
  };
});

describe('StellarHorizonService', () => {
  let service: StellarHorizonService;
  let configService: ConfigService;
  let mockServer: any;

  const mockConfigValues: Record<string, any> = {
    'stellar.network': 'testnet',
    'stellar.horizonUrl': 'https://horizon-testnet.stellar.org',
    'stellar.usdcAssetCode': 'USDC',
    'stellar.usdcIssuer':
      'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    'stellar.anchorDomain': 'test-anchor.stellar.org',
    'stellar.useMock': false,
    'stellar.baseFee': '100',
    'stellar.friendbotUrl': 'https://friendbot.stellar.org?addr=',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarHorizonService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfigValues[key]),
          },
        },
      ],
    }).compile();

    service = module.get<StellarHorizonService>(StellarHorizonService);
    configService = module.get<ConfigService>(ConfigService);

    // Initialize the service
    service.onModuleInit();

    // Get mock server reference
    mockServer = (service as any).server;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with testnet configuration', () => {
      const config = service.getConfig();
      expect(config.network).toBe('testnet');
      expect(config.horizonUrl).toBe('https://horizon-testnet.stellar.org');
    });

    it('should set correct network passphrase for testnet', () => {
      expect(service.getNetworkPassphrase()).toBe(TESTNET_PASSPHRASE);
    });
  });

  describe('generateKeypair', () => {
    it('should generate a valid keypair', () => {
      const keypair = service.generateKeypair();

      expect(keypair).toHaveProperty('publicKey');
      expect(keypair).toHaveProperty('secretKey');
      expect(keypair.publicKey).toMatch(/^G[A-Z0-9]+$/);
      expect(keypair.secretKey).toMatch(/^S[A-Z0-9]+$/);
    });
  });

  describe('keypairFromSecret', () => {
    it('should create keypair from secret key', () => {
      const secretKey = 'SBSECRET1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234';
      const keypair = service.keypairFromSecret(secretKey);

      expect(keypair).toBeDefined();
      expect(keypair.publicKey()).toBeDefined();
    });
  });

  describe('getAccount', () => {
    it('should return account information when account exists', async () => {
      const mockAccountResponse = {
        accountId: jest.fn(
          () => 'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
        ),
        sequenceNumber: jest.fn(() => '12345'),
        balances: [
          {
            asset_type: 'native',
            balance: '100.0000000',
            buying_liabilities: '0',
            selling_liabilities: '0',
          },
          {
            asset_type: 'credit_alphanum4',
            asset_code: 'USDC',
            asset_issuer:
              'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
            balance: '500.0000000',
            buying_liabilities: '0',
            selling_liabilities: '0',
          },
        ],
      };

      mockServer.loadAccount = jest.fn().mockResolvedValue(mockAccountResponse);

      const account = await service.getAccount(
        'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
      );

      expect(account).not.toBeNull();
      expect(account?.accountId).toBe(
        'GBTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
      );
      expect(account?.hasUsdcTrustline).toBe(true);
      expect(account?.balances).toHaveLength(2);
    });

    it('should return null when account does not exist', async () => {
      mockServer.loadAccount = jest
        .fn()
        .mockRejectedValue(new Error('404 not found'));

      const account = await service.getAccount('GBNONEXISTENT');

      expect(account).toBeNull();
    });

    it('should throw StellarNetworkError for other errors', async () => {
      mockServer.loadAccount = jest
        .fn()
        .mockRejectedValue(new Error('Network timeout'));

      await expect(service.getAccount('GBTEST')).rejects.toThrow(
        StellarNetworkError,
      );
    });
  });

  describe('accountExists', () => {
    it('should return true when account exists', async () => {
      mockServer.loadAccount = jest.fn().mockResolvedValue({
        accountId: jest.fn(() => 'GBTEST'),
        sequenceNumber: jest.fn(() => '1'),
        balances: [],
      });

      const exists = await service.accountExists('GBTEST');
      expect(exists).toBe(true);
    });

    it('should return false when account does not exist', async () => {
      mockServer.loadAccount = jest
        .fn()
        .mockRejectedValue(new Error('404 not found'));

      const exists = await service.accountExists('GBTEST');
      expect(exists).toBe(false);
    });
  });

  describe('getUsdcBalance', () => {
    it('should return USDC balance when trustline exists', async () => {
      mockServer.loadAccount = jest.fn().mockResolvedValue({
        accountId: jest.fn(() => 'GBTEST'),
        sequenceNumber: jest.fn(() => '1'),
        balances: [
          {
            asset_type: 'credit_alphanum4',
            asset_code: 'USDC',
            asset_issuer:
              'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
            balance: '250.5000000',
            buying_liabilities: '0',
            selling_liabilities: '0',
          },
        ],
      });

      const balance = await service.getUsdcBalance('GBTEST');
      expect(balance).toBe('250.5000000');
    });

    it('should return 0 when no USDC trustline', async () => {
      mockServer.loadAccount = jest.fn().mockResolvedValue({
        accountId: jest.fn(() => 'GBTEST'),
        sequenceNumber: jest.fn(() => '1'),
        balances: [
          {
            asset_type: 'native',
            balance: '100.0000000',
            buying_liabilities: '0',
            selling_liabilities: '0',
          },
        ],
      });

      const balance = await service.getUsdcBalance('GBTEST');
      expect(balance).toBe('0');
    });

    it('should return 0 when account does not exist', async () => {
      mockServer.loadAccount = jest
        .fn()
        .mockRejectedValue(new Error('404 not found'));

      const balance = await service.getUsdcBalance('GBNONEXISTENT');
      expect(balance).toBe('0');
    });
  });

  describe('getXlmBalance', () => {
    it('should return XLM balance', async () => {
      mockServer.loadAccount = jest.fn().mockResolvedValue({
        accountId: jest.fn(() => 'GBTEST'),
        sequenceNumber: jest.fn(() => '1'),
        balances: [
          {
            asset_type: 'native',
            asset_code: 'XLM',
            balance: '150.0000000',
            buying_liabilities: '0',
            selling_liabilities: '0',
          },
        ],
      });

      const balance = await service.getXlmBalance('GBTEST');
      expect(balance).toBe('150.0000000');
    });
  });

  describe('fundTestnetAccount', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it('should fund testnet account successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const result = await service.fundTestnetAccount('GBTEST');
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://friendbot.stellar.org?addr=GBTEST',
      );
    });

    it('should throw error when friendbot fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 400 });

      await expect(service.fundTestnetAccount('GBTEST')).rejects.toThrow(
        StellarNetworkError,
      );
    });

    it('should throw error when called on mainnet', async () => {
      // Override config to mainnet
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'stellar.network') return 'mainnet';
        return mockConfigValues[key];
      });

      // Re-initialize service
      const newService = new StellarHorizonService(configService);
      (newService as any).config = {
        ...service.getConfig(),
        network: 'mainnet',
      };

      await expect(newService.fundTestnetAccount('GBTEST')).rejects.toThrow(
        'Friendbot only available on testnet',
      );
    });
  });

  describe('createUsdcTrustline', () => {
    it('should create trustline successfully', async () => {
      mockServer.loadAccount = jest.fn().mockResolvedValue({
        accountId: jest.fn(() => 'GBTEST'),
        sequenceNumber: jest.fn(() => '1'),
        balances: [],
      });

      mockServer.submitTransaction = jest.fn().mockResolvedValue({
        hash: 'abc123',
        ledger: 12345,
        successful: true,
        fee_charged: '100',
        result_xdr: 'mock-xdr',
      });

      const result = await service.createUsdcTrustline(
        'SBSECRET1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
      );

      expect(result.successful).toBe(true);
      expect(result.hash).toBe('abc123');
      expect(result.ledger).toBe(12345);
    });

    it('should throw error when transaction fails', async () => {
      mockServer.loadAccount = jest.fn().mockResolvedValue({
        accountId: jest.fn(() => 'GBTEST'),
        sequenceNumber: jest.fn(() => '1'),
        balances: [],
      });

      mockServer.submitTransaction = jest
        .fn()
        .mockRejectedValue(new Error('Transaction failed'));

      await expect(service.createUsdcTrustline('SBSECRET')).rejects.toThrow(
        StellarTransactionError,
      );
    });
  });

  describe('sendPayment', () => {
    const paymentRequest = {
      sourceSecretKey: 'SBSECRET1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234',
      destinationPublicKey: 'GBDEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ12345',
      amount: '100.00',
      assetCode: 'USDC',
      assetIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    };

    it('should send payment successfully', async () => {
      mockServer.loadAccount = jest.fn().mockResolvedValue({
        accountId: jest.fn(() => 'GBTEST'),
        sequenceNumber: jest.fn(() => '1'),
        balances: [],
      });

      mockServer.submitTransaction = jest.fn().mockResolvedValue({
        hash: 'payment-hash-123',
        ledger: 54321,
        successful: true,
        fee_charged: '100',
        result_xdr: 'payment-xdr',
      });

      const result = await service.sendPayment(paymentRequest);

      expect(result.successful).toBe(true);
      expect(result.hash).toBe('payment-hash-123');
      expect(result.transactionId).toBe('payment-hash-123');
    });

    it('should send XLM payment (native asset)', async () => {
      mockServer.loadAccount = jest.fn().mockResolvedValue({
        accountId: jest.fn(() => 'GBTEST'),
        sequenceNumber: jest.fn(() => '1'),
        balances: [],
      });

      mockServer.submitTransaction = jest.fn().mockResolvedValue({
        hash: 'xlm-payment-hash',
        ledger: 11111,
        successful: true,
        fee_charged: '100',
        result_xdr: 'xlm-xdr',
      });

      const result = await service.sendPayment({
        ...paymentRequest,
        assetCode: 'XLM',
        assetIssuer: undefined,
      });

      expect(result.successful).toBe(true);
    });

    it('should add text memo when provided', async () => {
      mockServer.loadAccount = jest.fn().mockResolvedValue({
        accountId: jest.fn(() => 'GBTEST'),
        sequenceNumber: jest.fn(() => '1'),
        balances: [],
      });

      mockServer.submitTransaction = jest.fn().mockResolvedValue({
        hash: 'memo-payment-hash',
        ledger: 22222,
        successful: true,
        fee_charged: '100',
        result_xdr: 'memo-xdr',
      });

      const result = await service.sendPayment({
        ...paymentRequest,
        memo: 'test-memo',
        memoType: 'text',
      });

      expect(result.successful).toBe(true);
    });

    it('should throw error on payment failure', async () => {
      mockServer.loadAccount = jest.fn().mockResolvedValue({
        accountId: jest.fn(() => 'GBTEST'),
        sequenceNumber: jest.fn(() => '1'),
        balances: [],
      });

      mockServer.submitTransaction = jest
        .fn()
        .mockRejectedValue(new Error('Insufficient funds'));

      await expect(service.sendPayment(paymentRequest)).rejects.toThrow(
        StellarTransactionError,
      );
    });
  });

  describe('getTransaction', () => {
    it('should return transaction details', async () => {
      const mockTransaction = {
        hash: 'tx-hash-123',
        ledger: 12345,
        successful: true,
        fee_charged: '100',
        result_xdr: 'result-xdr',
        created_at: '2024-01-15T10:30:00Z',
      };

      mockServer.transactions = jest.fn(() => ({
        transaction: jest.fn(() => ({
          call: jest.fn().mockResolvedValue(mockTransaction),
        })),
      }));

      const result = await service.getTransaction('tx-hash-123');

      expect(result).not.toBeNull();
      expect(result?.hash).toBe('tx-hash-123');
      expect(result?.successful).toBe(true);
    });

    it('should return null when transaction not found', async () => {
      mockServer.transactions = jest.fn(() => ({
        transaction: jest.fn(() => ({
          call: jest.fn().mockRejectedValue(new Error('404 not found')),
        })),
      }));

      const result = await service.getTransaction('nonexistent-hash');
      expect(result).toBeNull();
    });
  });

  describe('createAccount', () => {
    it('should create a new account with starting balance', async () => {
      mockServer.loadAccount = jest.fn().mockResolvedValue({
        accountId: jest.fn(() => 'GBFUNDING'),
        sequenceNumber: jest.fn(() => '1'),
        balances: [],
      });

      mockServer.submitTransaction = jest.fn().mockResolvedValue({
        hash: 'create-account-hash',
        ledger: 33333,
        successful: true,
        fee_charged: '100',
        result_xdr: 'create-xdr',
      });

      const result = await service.createAccount(
        'SBFUNDING_SECRET',
        'GBNEW_ACCOUNT',
        '2.0',
      );

      expect(result.successful).toBe(true);
      expect(result.hash).toBe('create-account-hash');
    });
  });

  describe('getAccountTransactions', () => {
    it('should return list of transactions', async () => {
      const mockTransactions = [
        {
          hash: 'tx1',
          ledger: 100,
          successful: true,
          fee_charged: '100',
          result_xdr: 'xdr1',
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          hash: 'tx2',
          ledger: 101,
          successful: true,
          fee_charged: '100',
          result_xdr: 'xdr2',
          created_at: '2024-01-15T11:00:00Z',
        },
      ];

      mockServer.transactions = jest.fn(() => ({
        forAccount: jest.fn(() => ({
          limit: jest.fn(() => ({
            order: jest.fn(() => ({
              call: jest.fn().mockResolvedValue({ records: mockTransactions }),
            })),
          })),
        })),
      }));

      const result = await service.getAccountTransactions('GBTEST', 10);

      expect(result).toHaveLength(2);
      expect(result[0].hash).toBe('tx1');
      expect(result[1].hash).toBe('tx2');
    });
  });

  describe('getUsdcAsset', () => {
    it('should return USDC asset object', () => {
      const asset = service.getUsdcAsset();
      expect(asset).toBeDefined();
    });
  });

  describe('getServer', () => {
    it('should return Horizon server instance', () => {
      const server = service.getServer();
      expect(server).toBeDefined();
    });
  });
});
