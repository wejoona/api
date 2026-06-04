jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'PAY123AB',
}));

import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentLinkService } from './payment-link.service';
import { PaymentLink } from '../../domain/entities/payment-link.entity';
import { WalletEntity } from '../../../wallet/domain/entities/wallet.entity';
import { ERROR_CODES } from '../../../../common/constants/error-codes';

describe('PaymentLinkService', () => {
  it('returns support-safe settlement context when ledger recording fails during payment', async () => {
    const recipientWallet = WalletEntity.create({ userId: 'recipient-user' });
    const payerWallet = WalletEntity.create({ userId: 'payer-user' });
    payerWallet.credit(100);

    const paymentLink = PaymentLink.reconstitute({
      id: 'payment-link-1',
      userId: 'recipient-user',
      walletId: recipientWallet.id,
      code: 'PAY123AB',
      amount: 25,
      currency: 'USDC',
      description: null,
    });

    const service = new PaymentLinkService(
      {
        findByCode: jest.fn().mockResolvedValue(paymentLink),
        save: jest.fn(),
      } as any,
      {
        findByUserId: jest.fn().mockResolvedValue(payerWallet),
        findById: jest.fn().mockResolvedValue(recipientWallet),
        save: jest.fn(),
      } as any,
      {
        save: jest.fn(),
      } as any,
      {
        getAvailableBalance: jest.fn().mockResolvedValue(100_000_000n),
        recordP2PTransfer: jest.fn().mockRejectedValue(new Error('Blnk down')),
      } as any,
      {
        emit: jest.fn(),
      } as unknown as EventEmitter2,
    );

    await expect(
      service.payPaymentLink('PAY123AB', 'payer-user', {}),
    ).rejects.toMatchObject({
      message: 'Payment failed. Please try again later.',
      response: expect.objectContaining({
        code: ERROR_CODES.PAYMENT_LINK_PAYMENT_FAILED,
        supportReference: expect.stringMatching(/^pl_PAY123AB_/),
        ledgerReference: expect.stringMatching(/^pl_PAY123AB_/),
        paymentLinkId: 'payment-link-1',
        settlementStage: 'ledger_recording',
      }),
    });
  });
});
