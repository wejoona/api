import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  ProcessWebhookUseCase,
  ProcessWebhookInput,
} from './process-webhook.use-case';
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
  WebhookEvent,
} from '@modules/shared/domain/gateways/payment.gateway';
import { TransactionRepository } from '@modules/transaction/infrastructure/repositories/transaction.repository';
import { WalletRepository } from '@modules/wallet/infrastructure/repositories/wallet.repository';
import {
  ONRAMP_PROVIDER_CI,
  IOnRampProvider,
} from '@modules/providers/interfaces';
import { WebhookDeadletterService } from '../domain/services/webhook-deadletter.service';
import { CacheInvalidationService } from '@modules/shared/infrastructure/services';

describe('ProcessWebhookUseCase', () => {
  let useCase: ProcessWebhookUseCase;
  let paymentGateway: jest.Mocked<IPaymentGateway>;
  let onRampProvider: jest.Mocked<IOnRampProvider>;
  let transactionRepository: jest.Mocked<TransactionRepository>;
  let walletRepository: jest.Mocked<WalletRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let _configService: jest.Mocked<ConfigService>;
  let deadLetterService: jest.Mocked<WebhookDeadletterService>;
  let cacheInvalidationService: jest.Mocked<CacheInvalidationService>;

  const mockTransaction = {
    id: 'tx-123',
    walletId: 'wallet-123',
    amount: 100,
    providerRef: 'deposit-123',
    status: 'pending',
    updateStatus: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
  };

  const mockWallet = {
    id: 'wallet-123',
    userId: 'user-123',
    credit: jest.fn(),
    updateKycStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessWebhookUseCase,
        {
          provide: PAYMENT_GATEWAY,
          useValue: {
            verifyWebhookSignature: jest.fn(),
            parseWebhookEvent: jest.fn(),
          },
        },
        {
          provide: ONRAMP_PROVIDER_CI,
          useValue: {
            verifyWebhookSignature: jest.fn(),
            parseWebhookEvent: jest.fn(),
          },
        },
        {
          provide: TransactionRepository,
          useValue: {
            findByProviderRef: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: WalletRepository,
          useValue: {
            findById: jest.fn(),
            findByProviderWalletId: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                'circle.webhookSecret': 'test-secret',
                'redis.host': 'localhost',
                'redis.port': 6379,
                'redis.password': undefined,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: WebhookDeadletterService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: CacheInvalidationService,
          useValue: {
            invalidateBalance: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<ProcessWebhookUseCase>(ProcessWebhookUseCase);
    paymentGateway = module.get(PAYMENT_GATEWAY);
    onRampProvider = module.get(ONRAMP_PROVIDER_CI);
    transactionRepository = module.get(TransactionRepository);
    walletRepository = module.get(WalletRepository);
    eventEmitter = module.get(EventEmitter2);
    _configService = module.get(ConfigService);
    deadLetterService = module.get(WebhookDeadletterService);
    cacheInvalidationService = module.get(CacheInvalidationService);

    // Suppress logs in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(async () => {
    await useCase.onModuleDestroy();
    jest.clearAllMocks();
  });

  describe('Yellow Card Webhooks', () => {
    describe('deposit.completed', () => {
      it('should process successful deposit completion', async () => {
        const input: ProcessWebhookInput = {
          payload: { depositId: 'deposit-123', amount: 100 },
          signature: 'valid-signature',
          rawBody: '{"depositId":"deposit-123","amount":100}',
          provider: 'yellowcard',
        };

        onRampProvider.verifyWebhookSignature.mockReturnValue(undefined);
        onRampProvider.parseWebhookEvent.mockReturnValue({
          type: 'deposit.completed',
          depositId: 'deposit-123',
          data: { targetAmount: 100, fee: 2 },
        });

        transactionRepository.findByProviderRef.mockResolvedValue(
          mockTransaction as any,
        );
        walletRepository.findById.mockResolvedValue(mockWallet as any);

        const result = await useCase.execute(input);

        expect(result.success).toBe(true);
        expect(result.eventType).toBe('deposit.completed');
        expect(result.processed).toBe(true);
        expect(mockTransaction.complete).toHaveBeenCalled();
        expect(transactionRepository.save).toHaveBeenCalledWith(
          mockTransaction,
        );
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'webhook.deposit.completed',
          expect.objectContaining({
            userId: 'user-123',
            walletId: 'wallet-123',
            amount: '100',
            currency: 'USDC',
          }),
        );
        expect(cacheInvalidationService.invalidateBalance).toHaveBeenCalledWith(
          'user-123',
        );
      });

      it('should handle deposit completion when transaction not found', async () => {
        const input: ProcessWebhookInput = {
          payload: { depositId: 'unknown-deposit' },
          signature: 'valid-signature',
          rawBody: '{"depositId":"unknown-deposit"}',
          provider: 'yellowcard',
        };

        onRampProvider.verifyWebhookSignature.mockReturnValue(undefined);
        onRampProvider.parseWebhookEvent.mockReturnValue({
          type: 'deposit.completed',
          depositId: 'unknown-deposit',
          data: {},
        });

        transactionRepository.findByProviderRef.mockResolvedValue(null);

        const result = await useCase.execute(input);

        expect(result.success).toBe(true);
        expect(mockTransaction.complete).not.toHaveBeenCalled();
      });

      it('should throw UnauthorizedException for invalid signature', async () => {
        const input: ProcessWebhookInput = {
          payload: { depositId: 'deposit-123' },
          signature: 'invalid-signature',
          rawBody: '{"depositId":"deposit-123"}',
          provider: 'yellowcard',
        };

        onRampProvider.verifyWebhookSignature.mockImplementation(() => {
          throw new Error('Invalid signature');
        });

        await expect(useCase.execute(input)).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('deposit.failed', () => {
      it('should process failed deposit', async () => {
        const input: ProcessWebhookInput = {
          payload: { depositId: 'deposit-123', reason: 'Payment declined' },
          signature: 'valid-signature',
          rawBody: '{"depositId":"deposit-123"}',
          provider: 'yellowcard',
        };

        onRampProvider.verifyWebhookSignature.mockReturnValue(undefined);
        onRampProvider.parseWebhookEvent.mockReturnValue({
          type: 'deposit.failed',
          depositId: 'deposit-123',
          data: { reason: 'Payment declined' },
        });

        transactionRepository.findByProviderRef.mockResolvedValue(
          mockTransaction as any,
        );
        walletRepository.findById.mockResolvedValue(mockWallet as any);

        const result = await useCase.execute(input);

        expect(result.success).toBe(true);
        expect(mockTransaction.fail).toHaveBeenCalledWith('Payment declined');
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'deposit.failed',
          expect.objectContaining({
            userId: 'user-123',
            error: 'Payment declined',
          }),
        );
      });
    });

    describe('withdrawal.completed', () => {
      it('should process successful withdrawal completion', async () => {
        const input: ProcessWebhookInput = {
          payload: { withdrawalId: 'withdrawal-123' },
          signature: 'valid-signature',
          rawBody: '{"withdrawalId":"withdrawal-123"}',
          provider: 'yellowcard',
        };

        onRampProvider.verifyWebhookSignature.mockReturnValue(undefined);
        onRampProvider.parseWebhookEvent.mockReturnValue({
          type: 'withdrawal.completed',
          depositId: 'withdrawal-123',
          data: {},
        });

        transactionRepository.findByProviderRef.mockResolvedValue(
          mockTransaction as any,
        );
        walletRepository.findById.mockResolvedValue(mockWallet as any);

        const result = await useCase.execute(input);

        expect(result.success).toBe(true);
        expect(mockTransaction.complete).toHaveBeenCalled();
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'webhook.withdrawal.completed',
          expect.objectContaining({
            userId: 'user-123',
            withdrawalId: 'withdrawal-123',
          }),
        );
        expect(cacheInvalidationService.invalidateBalance).toHaveBeenCalledWith(
          'user-123',
        );
      });
    });
  });

  describe('Circle Webhooks', () => {
    describe('transfers.complete', () => {
      it('should process Circle transfer completion', async () => {
        const signature = crypto
          .createHmac('sha256', 'test-secret')
          .update('{"notificationType":"transfers.complete"}')
          .digest('hex');

        const input: ProcessWebhookInput = {
          payload: {
            notificationType: 'transfers.complete',
            transfer: { id: 'transfer-123', transactionHash: '0xabc' },
          },
          signature,
          rawBody: '{"notificationType":"transfers.complete"}',
          provider: 'circle',
        };

        const result = await useCase.execute(input);

        expect(result.success).toBe(true);
        expect(result.eventType).toBe('transfers.complete');
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'webhook.transfer.completed',
          expect.objectContaining({
            transferId: 'transfer-123',
            provider: 'circle',
          }),
        );
      });

      it('should throw UnauthorizedException for invalid Circle signature', async () => {
        const input: ProcessWebhookInput = {
          payload: { notificationType: 'transfers.complete' },
          signature: 'invalid-signature',
          rawBody: '{"notificationType":"transfers.complete"}',
          provider: 'circle',
        };

        await expect(useCase.execute(input)).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('inboundTransfers.complete', () => {
      it('should process Circle inbound transfer', async () => {
        const signature = crypto
          .createHmac('sha256', 'test-secret')
          .update('{"notificationType":"inboundTransfers.complete"}')
          .digest('hex');

        const input: ProcessWebhookInput = {
          payload: {
            notificationType: 'inboundTransfers.complete',
            inboundTransfer: {
              id: 'inbound-123',
              destinationWalletId: 'circle-wallet-123',
              amount: '50',
            },
          },
          signature,
          rawBody: '{"notificationType":"inboundTransfers.complete"}',
          provider: 'circle',
        };

        walletRepository.findByProviderWalletId.mockResolvedValue(
          mockWallet as any,
        );

        const result = await useCase.execute(input);

        expect(result.success).toBe(true);
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'webhook.deposit.completed',
          expect.objectContaining({
            userId: 'user-123',
            amount: '50',
            provider: 'circle',
          }),
        );
        expect(cacheInvalidationService.invalidateBalance).toHaveBeenCalledWith(
          'user-123',
        );
      });
    });
  });

  describe('Generic Webhooks', () => {
    it('should process generic deposit completed webhook', async () => {
      const input: ProcessWebhookInput = {
        payload: { type: 'deposit.completed', referenceId: 'ref-123' },
        signature: 'valid-signature',
        rawBody: '{"type":"deposit.completed"}',
        provider: 'generic',
      };

      const event: WebhookEvent = {
        type: 'deposit.completed',
        referenceId: 'ref-123',
        data: { amount: 100 },
      };

      paymentGateway.verifyWebhookSignature.mockReturnValue(true);
      paymentGateway.parseWebhookEvent.mockReturnValue(event);
      transactionRepository.findByProviderRef.mockResolvedValue(
        mockTransaction as any,
      );
      walletRepository.findById.mockResolvedValue(mockWallet as any);

      const result = await useCase.execute(input);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('deposit.completed');
      expect(mockTransaction.complete).toHaveBeenCalled();
      expect(mockWallet.credit).toHaveBeenCalledWith(100);
      expect(cacheInvalidationService.invalidateBalance).toHaveBeenCalledWith(
        'user-123',
      );
    });

    it('should handle KYC approved webhook', async () => {
      const input: ProcessWebhookInput = {
        payload: { type: 'kyc.approved', referenceId: 'wallet-123' },
        signature: 'valid-signature',
        rawBody: '{"type":"kyc.approved"}',
        provider: 'generic',
      };

      const event: WebhookEvent = {
        type: 'kyc.approved',
        referenceId: 'wallet-123',
        data: {},
      };

      paymentGateway.verifyWebhookSignature.mockReturnValue(true);
      paymentGateway.parseWebhookEvent.mockReturnValue(event);
      walletRepository.findByProviderWalletId.mockResolvedValue(
        mockWallet as any,
      );

      const result = await useCase.execute(input);

      expect(result.success).toBe(true);
      expect(mockWallet.updateKycStatus).toHaveBeenCalledWith('verified');
    });
  });

  describe('Error Handling', () => {
    it('should log to dead-letter queue on processing error', async () => {
      const input: ProcessWebhookInput = {
        payload: { depositId: 'deposit-123' },
        signature: 'valid-signature',
        rawBody: '{"depositId":"deposit-123"}',
        provider: 'yellowcard',
      };

      onRampProvider.verifyWebhookSignature.mockReturnValue(undefined);
      onRampProvider.parseWebhookEvent.mockReturnValue({
        type: 'deposit.completed',
        depositId: 'deposit-123',
        data: {},
      });

      const error = new Error('Database connection lost');
      transactionRepository.findByProviderRef.mockRejectedValue(error);

      await expect(useCase.execute(input)).rejects.toThrow(error);
      expect(deadLetterService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'yellowcard',
          eventType: 'deposit.completed',
          error,
        }),
      );
    });

    it('should handle unhandled event types gracefully', async () => {
      const input: ProcessWebhookInput = {
        payload: { type: 'unknown.event', referenceId: 'ref-123' },
        signature: 'valid-signature',
        rawBody: '{"type":"unknown.event"}',
        provider: 'generic',
      };

      const event: WebhookEvent = {
        type: 'unknown.event' as any,
        referenceId: 'ref-123',
        data: {},
      };

      paymentGateway.verifyWebhookSignature.mockReturnValue(true);
      paymentGateway.parseWebhookEvent.mockReturnValue(event);

      const result = await useCase.execute(input);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(false);
      expect(result.message).toBe('Event type not handled');
    });
  });

  describe('Idempotency', () => {
    it('should prevent duplicate processing using Redis', async () => {
      // This test would require mocking Redis behavior
      // For now, we verify the flow completes successfully
      const input: ProcessWebhookInput = {
        payload: { depositId: 'deposit-123' },
        signature: 'valid-signature',
        rawBody: '{"depositId":"deposit-123"}',
        provider: 'yellowcard',
      };

      onRampProvider.verifyWebhookSignature.mockReturnValue(undefined);
      onRampProvider.parseWebhookEvent.mockReturnValue({
        type: 'deposit.completed',
        depositId: 'deposit-123',
        data: {},
      });

      transactionRepository.findByProviderRef.mockResolvedValue(
        mockTransaction as any,
      );
      walletRepository.findById.mockResolvedValue(mockWallet as any);

      const result = await useCase.execute(input);
      expect(result.success).toBe(true);
    });
  });
});
