import { NoopPaymentAdapter } from './noop-payment.adapter';
import { ERROR_CODES } from '../../../../../common/constants/error-codes';

describe('NoopPaymentAdapter', () => {
  let adapter: NoopPaymentAdapter;

  beforeEach(() => {
    adapter = new NoopPaymentAdapter();
  });

  it('returns no on-ramp channels when payment gateway is disabled', async () => {
    await expect(adapter.getOnRampChannels('CI', 'XOF')).resolves.toEqual([]);
  });

  it('rejects deposit initiation with a mobile provider-unavailable code', async () => {
    await expect(
      adapter.initiateDeposit({
        subwalletId: 'wallet-123',
        amount: 1000,
        sourceCurrency: 'XOF',
        targetCurrency: 'USDC',
        channelId: 'orange_money_ci',
        customerPhone: '+2250700000000',
      }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.DEPOSIT_PROVIDER_UNAVAILABLE,
      response: expect.objectContaining({
        reason: 'provider_or_feature_disabled',
        featureReason: 'yellow_card_disabled',
        provider: 'yellow_card',
      }),
    });
  });

  it('rejects external withdrawals with a mobile provider-unavailable code', async () => {
    await expect(
      adapter.externalTransfer({
        subwalletId: 'wallet-123',
        toAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        amount: 10,
        currency: 'USDC',
        network: 'polygon',
      }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.WITHDRAWAL_PROVIDER_UNAVAILABLE,
      response: expect.objectContaining({
        reason: 'provider_or_feature_disabled',
        featureReason: 'yellow_card_disabled',
        provider: 'yellow_card',
      }),
    });
  });
});
