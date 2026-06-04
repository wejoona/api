import { ConfigService } from '@nestjs/config';
import { YellowCardPaymentAdapter } from './yellow-card.adapter';

describe('YellowCardPaymentAdapter', () => {
  let adapter: YellowCardPaymentAdapter;

  beforeEach(() => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'yellowCard.useMock') return true;
        return '';
      }),
    } as unknown as ConfigService;

    adapter = new YellowCardPaymentAdapter(configService);
  });

  it('returns CI mobile-money on-ramp channels in mock mode', async () => {
    const channels = await adapter.getOnRampChannels('CI', 'XOF');

    expect(channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'orange_money_ci',
          type: 'mobile_money',
          country: 'CI',
          currency: 'XOF',
        }),
      ]),
    );
  });

  it('returns a US USD on-ramp channel in mock mode', async () => {
    const channels = await adapter.getOnRampChannels('US', 'USD');

    expect(channels).toEqual([
      expect.objectContaining({
        id: 'usdc_crypto_us',
        type: 'crypto',
        provider: 'usdc',
        country: 'US',
        currency: 'USD',
      }),
    ]);
  });

  it('uses stablecoin deposit instructions for US USD to USDC mock deposits', async () => {
    const deposit = await adapter.initiateDeposit({
      subwalletId: 'wallet-us',
      amount: 25,
      sourceCurrency: 'USD',
      targetCurrency: 'USDC',
      channelId: 'usdc_crypto_us',
    });

    expect(deposit).toMatchObject({
      sourceCurrency: 'USD',
      targetCurrency: 'USDC',
      rate: 1,
      fee: 0,
      paymentInstructions: expect.objectContaining({
        type: 'crypto',
        provider: 'usdc',
      }),
    });
  });
});
