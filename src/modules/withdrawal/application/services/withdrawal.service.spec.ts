import { EventEmitter2 } from '@nestjs/event-emitter';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalStatus } from '../../domain/enums/withdrawal-status.enum';
import { PaymentMethodType } from '../../../deposit/domain/enums/payment-method-type.enum';

describe('WithdrawalService ledger settlement', () => {
  let service: WithdrawalService;
  let withdrawalRepository: { update: jest.Mock };
  let payoutProvider: {
    initiatePayout: jest.Mock;
    getPaymentMethodType: jest.Mock;
  };
  let ledgerProvider: {
    commitTransaction: jest.Mock;
    voidTransaction: jest.Mock;
  };
  let eventEmitter: { emit: jest.Mock };

  const withdrawal = {
    id: 'withdrawal-id',
    userId: 'user-id',
    amount: 10_000n,
    fiatAmount: 6_000_000n,
    currency: 'XOF',
    providerCode: 'orange_money',
    paymentMethodType: PaymentMethodType.PUSH,
    status: WithdrawalStatus.INITIATED,
    phoneNumber: '+2250701234567',
    blnkTransactionId: 'blnk-inflight-123',
    createdAt: new Date('2026-06-04T00:00:00.000Z'),
    updatedAt: new Date('2026-06-04T00:00:00.000Z'),
  };

  const dto = {
    amount: 10_000,
    currency: 'XOF',
    providerCode: 'orange_money',
    phoneNumber: '+2250701234567',
  };

  beforeEach(() => {
    withdrawalRepository = {
      update: jest.fn().mockImplementation(async (_id, params) => ({
        ...withdrawal,
        ...params,
      })),
    };
    payoutProvider = {
      getPaymentMethodType: jest.fn().mockReturnValue(PaymentMethodType.PUSH),
      initiatePayout: jest.fn(),
    };
    const providerFactory = {
      getProvider: jest.fn().mockReturnValue(payoutProvider),
    };
    ledgerProvider = {
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      voidTransaction: jest.fn().mockResolvedValue(undefined),
    };
    eventEmitter = { emit: jest.fn() };

    service = new WithdrawalService(
      withdrawalRepository as any,
      providerFactory as any,
      {} as any,
      eventEmitter as unknown as EventEmitter2,
      {} as any,
      {} as any,
      ledgerProvider as any,
    );
  });

  it('commits the inflight Blnk debit when the provider payout completes', async () => {
    payoutProvider.initiatePayout.mockResolvedValue({
      providerTransactionId: 'provider-tx-1',
      providerReference: 'provider-ref-1',
      status: 'completed',
    });

    await (service as any).processPayoutAsync(withdrawal, dto, 6_000_000n);

    expect(ledgerProvider.commitTransaction).toHaveBeenCalledWith(
      'blnk-inflight-123',
    );
    expect(ledgerProvider.voidTransaction).not.toHaveBeenCalled();
    expect(withdrawalRepository.update).toHaveBeenCalledWith(
      withdrawal.id,
      expect.objectContaining({
        status: WithdrawalStatus.COMPLETED,
        completedAt: expect.any(Date),
      }),
    );
  });

  it('voids the inflight Blnk debit when the provider payout fails', async () => {
    payoutProvider.initiatePayout.mockResolvedValue({
      providerTransactionId: 'provider-tx-2',
      providerReference: 'provider-ref-2',
      status: 'failed',
      failureReason: 'Provider rejected payout',
    });

    await (service as any).processPayoutAsync(withdrawal, dto, 6_000_000n);

    expect(ledgerProvider.voidTransaction).toHaveBeenCalledWith(
      'blnk-inflight-123',
    );
    expect(ledgerProvider.commitTransaction).not.toHaveBeenCalled();
    expect(withdrawalRepository.update).toHaveBeenCalledWith(
      withdrawal.id,
      expect.objectContaining({
        status: WithdrawalStatus.FAILED,
        failureReason: 'Provider rejected payout',
      }),
    );
  });

  it('voids the inflight Blnk debit when provider processing throws', async () => {
    payoutProvider.initiatePayout.mockRejectedValue(
      new Error('Provider timeout'),
    );

    await (service as any).processPayoutAsync(withdrawal, dto, 6_000_000n);

    expect(ledgerProvider.voidTransaction).toHaveBeenCalledWith(
      'blnk-inflight-123',
    );
    expect(ledgerProvider.commitTransaction).not.toHaveBeenCalled();
    expect(withdrawalRepository.update).toHaveBeenCalledWith(withdrawal.id, {
      status: WithdrawalStatus.FAILED,
      failureReason: 'Provider timeout',
    });
  });
});
