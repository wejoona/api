import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BulkPaymentService } from './bulk-payment.service';
import { BulkPaymentRepository } from '../../domain/repositories/bulk-payment.repository';
import { ERROR_CODES } from '../../../../common/constants/error-codes';

describe('BulkPaymentService', () => {
  let service: BulkPaymentService;
  let repository: jest.Mocked<BulkPaymentRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkPaymentService,
        {
          provide: BulkPaymentRepository,
          useValue: {
            findById: jest.fn(),
            findByWalletId: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
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
            get: jest.fn((key: string) => {
              if (key === 'bulkPayments.enabled') return false;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(BulkPaymentService);
    repository = module.get(BulkPaymentRepository);
    eventEmitter = module.get(EventEmitter2);
  });

  it('should return mobile-safe unavailable list without repository access when disabled', async () => {
    await expect(service.getBatches('wallet-123')).resolves.toEqual({
      batches: [],
      data: [],
      available: false,
      status: 'unavailable',
      reason: 'provider_or_feature_disabled',
      featureReason: 'bulk_payments_unavailable',
      retryable: false,
      supportReviewRequired: false,
    });

    expect(repository.findByWalletId).not.toHaveBeenCalled();
  });

  it('should reject batch creation before persistence and events when disabled', async () => {
    await expect(
      service.createBatch('wallet-123', {
        name: 'Payroll',
        payments: [
          {
            phone: '+2250701234568',
            amount: 100,
            description: 'Allowance',
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.BULK_PAYMENTS_UNAVAILABLE,
      context: expect.objectContaining({
        reason: 'provider_or_feature_disabled',
        featureReason: 'bulk_payments_unavailable',
        retryable: false,
        supportReviewRequired: false,
      }),
    });

    expect(repository.save).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
