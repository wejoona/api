import { NoopPaymentAdapter } from './noop-payment.adapter';

describe('NoopPaymentAdapter', () => {
  let adapter: NoopPaymentAdapter;

  beforeEach(() => {
    adapter = new NoopPaymentAdapter();
  });

  it('returns no on-ramp channels when payment gateway is disabled', async () => {
    await expect(adapter.getOnRampChannels('CI', 'XOF')).resolves.toEqual([]);
  });

  it('still rejects deposit initiation when payment gateway is disabled', async () => {
    await expect(
      adapter.initiateDeposit({
        subwalletId: 'wallet-123',
        amount: 1000,
        sourceCurrency: 'XOF',
        targetCurrency: 'USDC',
        channelId: 'orange_money_ci',
        customerPhone: '+2250700000000',
      }),
    ).rejects.toThrow('Payment gateway disabled');
  });
});
