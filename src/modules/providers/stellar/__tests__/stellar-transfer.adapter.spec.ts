import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StellarTransferAdapter } from '../adapters/stellar-transfer.adapter';
import { StellarHorizonService } from '../services/stellar-horizon.service';
import {
  StellarAccount,
  StellarTransactionResult,
  StellarTransactionError,
} from '../stellar.types';

describe('StellarTransferAdapter', () => {
  let adapter: StellarTransferAdapter;
  let horizonService: jest.Mocked<StellarHorizonService>;

  const mockConfigValues: Record<string, any> = {
    'stellar.network': 'testnet',
    'stellar.horizonUrl': 'https://horizon-testnet.stellar.org',
    'stellar.usdcAssetCode': 'USDC',
    'stellar.usdcIssuer': 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    'stellar.anchorDomain': 'test-anchor.stellar.org',
    'stellar.baseFee': 100,
    'stellar.useMock': false,
  };

  const mockSourceAccount: StellarAccount = {
    accountId: 'GBSOURCE12345678901234567890123456789012345678901234',
    sequence: '12345',
    balances: [
      {
        assetType: 'credit_alphanum4',
        assetCode: 'USDC',
        assetIssuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        balance: '1000.0000000',
        buyingLiabilities: '0',
        sellingLiabilities: '0',
      },
    ],
    hasUsdcTrustline: true,
    status: 'active',
  };

  const mockDestAccount: StellarAccount = {
    accountId: 'GBDEST123456789012345678901234567890123456789012345',
    sequence: '67890',
    balances: [
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

  const mockTransactionResult: StellarTransactionResult = {
    transactionId: 'tx-hash-123',
    hash: 'tx-hash-123',
    ledger: 12345,
    successful: true,
    feeCharged: '100',
    resultXdr: 'result-xdr',
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  beforeEach(async () => {
    const mockHorizonService = {
      getAccount: jest.fn(),
      sendPayment: jest.fn().mockResolvedValue(mockTransactionResult),
      getTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarTransferAdapter,
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

    adapter = module.get<StellarTransferAdapter>(StellarTransferAdapter);
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

  describe('internalTransfer', () => {
    const transferData = {
      fromWalletId: 'GBSOURCE12345678901234567890123456789012345678901234',
      toWalletId: 'GBDEST123456789012345678901234567890123456789012345',
      amount: '100.00',
      currency: 'USDC',
      idempotencyKey: 'test-idempotency-key-12345',
      metadata: {
        sourceSecretKey: 'SBSOURCE_SECRET_KEY_123456789012345678901234567890',
      },
    };

    beforeEach(() => {
      horizonService.getAccount.mockResolvedValue(mockDestAccount);
    });

    it('should execute internal transfer successfully', async () => {
      const result = await adapter.internalTransfer(transferData);

      expect(result.status).toBe('completed');
      expect(result.providerId).toBe('tx-hash-123');
      expect(result.txHash).toBe('tx-hash-123');
      expect(result.amount).toBe('100.00');
      expect(result.currency).toBe('USDC');
    });

    it('should verify destination account exists', async () => {
      await adapter.internalTransfer(transferData);

      expect(horizonService.getAccount).toHaveBeenCalledWith(
        transferData.toWalletId,
      );
    });

    it('should call sendPayment with correct parameters', async () => {
      await adapter.internalTransfer(transferData);

      expect(horizonService.sendPayment).toHaveBeenCalledWith({
        sourceSecretKey: transferData.metadata.sourceSecretKey,
        destinationPublicKey: transferData.toWalletId,
        amount: transferData.amount,
        assetCode: transferData.currency,
        assetIssuer: mockConfigValues['stellar.usdcIssuer'],
        memo: transferData.idempotencyKey.substring(0, 28),
        memoType: 'text',
      });
    });

    it('should return failed status when source secret key missing', async () => {
      const result = await adapter.internalTransfer({
        ...transferData,
        metadata: {},
      });

      expect(result.status).toBe('failed');
      expect(result.errorCode).toBe('TRANSFER_FAILED');
      expect(result.errorMessage).toContain('Source secret key required');
    });

    it('should return failed status when destination account not found', async () => {
      horizonService.getAccount.mockResolvedValue(null);

      const result = await adapter.internalTransfer(transferData);

      expect(result.status).toBe('failed');
      expect(result.errorCode).toBe('TRANSFER_FAILED');
      expect(result.errorMessage).toContain('Destination account not found');
    });

    it('should return failed status when destination lacks USDC trustline', async () => {
      horizonService.getAccount.mockResolvedValue({
        ...mockDestAccount,
        hasUsdcTrustline: false,
      });

      const result = await adapter.internalTransfer(transferData);

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('USDC trustline');
    });

    it('should allow XLM transfers without trustline check', async () => {
      horizonService.getAccount.mockResolvedValue({
        ...mockDestAccount,
        hasUsdcTrustline: false,
      });

      const result = await adapter.internalTransfer({
        ...transferData,
        currency: 'XLM',
      });

      // Should proceed since XLM doesn't need trustline
      expect(result.status).toBe('completed');
    });

    it('should return failed status on payment error', async () => {
      horizonService.sendPayment.mockRejectedValue(
        new Error('Insufficient funds'),
      );

      const result = await adapter.internalTransfer(transferData);

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('Insufficient funds');
    });

    it('should convert fee from stroops to XLM', async () => {
      const result = await adapter.internalTransfer(transferData);

      expect(result.fee).toBe('0.0000100'); // 100 stroops = 0.0000100 XLM
    });

    it('should truncate memo to 28 characters', async () => {
      const longIdempotencyKey = 'very-long-idempotency-key-that-exceeds-28-chars';

      await adapter.internalTransfer({
        ...transferData,
        idempotencyKey: longIdempotencyKey,
      });

      expect(horizonService.sendPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          memo: longIdempotencyKey.substring(0, 28),
        }),
      );
    });
  });

  describe('externalTransfer', () => {
    const transferData = {
      fromWalletId: 'GBSOURCE12345678901234567890123456789012345678901234',
      toAddress: 'GBEXTERNAL12345678901234567890123456789012345678901',
      amount: '250.00',
      currency: 'USDC',
      blockchain: 'STELLAR',
      idempotencyKey: 'external-transfer-key-123',
      metadata: {
        sourceSecretKey: 'SBSOURCE_SECRET_KEY_123456789012345678901234567890',
      },
    };

    beforeEach(() => {
      horizonService.getAccount.mockResolvedValue(mockDestAccount);
    });

    it('should execute external transfer successfully', async () => {
      const result = await adapter.externalTransfer(transferData);

      expect(result.status).toBe('completed');
      expect(result.providerId).toBe('tx-hash-123');
      expect(result.toAddress).toBe(transferData.toAddress);
    });

    it('should verify destination address exists on Stellar', async () => {
      await adapter.externalTransfer(transferData);

      expect(horizonService.getAccount).toHaveBeenCalledWith(
        transferData.toAddress,
      );
    });

    it('should return failed status when source secret key missing', async () => {
      const result = await adapter.externalTransfer({
        ...transferData,
        metadata: {},
      });

      expect(result.status).toBe('failed');
      expect(result.errorCode).toBe('TRANSFER_FAILED');
    });

    it('should return failed status when destination not found', async () => {
      horizonService.getAccount.mockResolvedValue(null);

      const result = await adapter.externalTransfer(transferData);

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('not found on Stellar network');
    });

    it('should return failed status when destination lacks trustline', async () => {
      horizonService.getAccount.mockResolvedValue({
        ...mockDestAccount,
        hasUsdcTrustline: false,
      });

      const result = await adapter.externalTransfer(transferData);

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('USDC trustline');
    });

    it('should return failed status on payment error', async () => {
      horizonService.sendPayment.mockRejectedValue(
        new StellarTransactionError('Transaction failed', {}),
      );

      const result = await adapter.externalTransfer(transferData);

      expect(result.status).toBe('failed');
    });
  });

  describe('getTransferStatus', () => {
    it('should return completed status for successful transaction', async () => {
      horizonService.getTransaction.mockResolvedValue(mockTransactionResult);

      const result = await adapter.getTransferStatus('tx-hash-123');

      expect(result.status).toBe('completed');
      expect(result.providerId).toBe('tx-hash-123');
      expect(result.txHash).toBe('tx-hash-123');
    });

    it('should return pending status when transaction not found', async () => {
      horizonService.getTransaction.mockResolvedValue(null);

      const result = await adapter.getTransferStatus('unknown-tx');

      expect(result.status).toBe('pending');
      expect(result.providerId).toBe('unknown-tx');
    });

    it('should return failed status for unsuccessful transaction', async () => {
      horizonService.getTransaction.mockResolvedValue({
        ...mockTransactionResult,
        successful: false,
      });

      const result = await adapter.getTransferStatus('failed-tx');

      expect(result.status).toBe('failed');
    });

    it('should convert fee from stroops to XLM', async () => {
      horizonService.getTransaction.mockResolvedValue({
        ...mockTransactionResult,
        feeCharged: '200',
      });

      const result = await adapter.getTransferStatus('tx-hash');

      expect(result.fee).toBe('0.0000200');
    });

    it('should propagate errors from getTransaction', async () => {
      horizonService.getTransaction.mockRejectedValue(
        new Error('Network error'),
      );

      await expect(adapter.getTransferStatus('tx-hash')).rejects.toThrow(
        'Network error',
      );
    });

    it('should include completedAt for successful transactions', async () => {
      horizonService.getTransaction.mockResolvedValue(mockTransactionResult);

      const result = await adapter.getTransferStatus('tx-hash');

      expect(result.completedAt).toBeDefined();
    });

    it('should not include completedAt for failed transactions', async () => {
      horizonService.getTransaction.mockResolvedValue({
        ...mockTransactionResult,
        successful: false,
      });

      const result = await adapter.getTransferStatus('tx-hash');

      expect(result.completedAt).toBeUndefined();
    });
  });

  describe('estimateFee', () => {
    it('should return base fee in XLM', async () => {
      const result = await adapter.estimateFee({
        fromWalletId: 'GBSOURCE',
        toAddress: 'GBDEST',
        amount: '100',
        currency: 'USDC',
        blockchain: 'STELLAR',
      });

      expect(result.currency).toBe('XLM');
      expect(result.fee).toBe('0.0000100'); // 100 stroops
    });

    it('should return fee regardless of transfer parameters', async () => {
      // Fee is fixed, not dependent on transfer details
      const result1 = await adapter.estimateFee({
        amount: '1',
      });

      const result2 = await adapter.estimateFee({
        amount: '10000',
      });

      expect(result1.fee).toBe(result2.fee);
    });

    it('should use configured base fee', async () => {
      const result = await adapter.estimateFee({});

      expect(parseFloat(result.fee)).toBeCloseTo(0.00001, 7);
    });
  });

  describe('edge cases', () => {
    it('should handle zero amount transfer', async () => {
      horizonService.getAccount.mockResolvedValue(mockDestAccount);
      horizonService.sendPayment.mockResolvedValue(mockTransactionResult);

      const result = await adapter.internalTransfer({
        fromWalletId: 'GBSOURCE',
        toWalletId: 'GBDEST',
        amount: '0',
        currency: 'USDC',
        idempotencyKey: 'zero-amount-key',
        metadata: { sourceSecretKey: 'SBSECRET' },
      });

      expect(result.amount).toBe('0');
    });

    it('should handle very large amounts', async () => {
      horizonService.getAccount.mockResolvedValue(mockDestAccount);
      horizonService.sendPayment.mockResolvedValue(mockTransactionResult);

      const result = await adapter.internalTransfer({
        fromWalletId: 'GBSOURCE',
        toWalletId: 'GBDEST',
        amount: '999999999999.9999999',
        currency: 'USDC',
        idempotencyKey: 'large-amount-key',
        metadata: { sourceSecretKey: 'SBSECRET' },
      });

      expect(result.amount).toBe('999999999999.9999999');
    });

    it('should handle special characters in idempotency key', async () => {
      horizonService.getAccount.mockResolvedValue(mockDestAccount);
      horizonService.sendPayment.mockResolvedValue(mockTransactionResult);

      await adapter.internalTransfer({
        fromWalletId: 'GBSOURCE',
        toWalletId: 'GBDEST',
        amount: '100',
        currency: 'USDC',
        idempotencyKey: 'key-with-special-chars-@#$%',
        metadata: { sourceSecretKey: 'SBSECRET' },
      });

      expect(horizonService.sendPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          memo: 'key-with-special-chars-@#$%',
        }),
      );
    });
  });
});
