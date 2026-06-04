import { of } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { ExchangeRateService } from './exchange-rate.service';

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;

  beforeEach(async () => {
    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const values: Record<string, unknown> = {
          USDC_XOF_RATE: undefined,
          EXCHANGE_FEE_PERCENT: 0,
          EXCHANGE_RATE_API_KEY: null,
        };
        return values[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;
    const httpService = {
      get: jest.fn(() => of({ data: {} })),
    } as unknown as HttpService;

    service = new ExchangeRateService(configService, httpService);
    await service.refreshRates();
  });

  it('should treat USDC as a USD-pegged currency when reading XOF rates', () => {
    const rate = service.getRate('USDC', 'XOF');

    expect(rate).toMatchObject({
      from: 'USDC',
      to: 'XOF',
      rate: 600,
      source: 'fallback',
    });
  });

  it('should return the inverse XOF to USDC rate', () => {
    const rate = service.getRate('XOF', 'USDC');

    expect(rate).toMatchObject({
      from: 'XOF',
      to: 'USDC',
      rate: 0.001667,
      inverseRate: 600,
      source: 'fallback',
    });
  });

  it('should return a stablecoin peg rate for USD and USDC', () => {
    expect(service.getRate('USD', 'USDC')).toMatchObject({
      from: 'USD',
      to: 'USDC',
      rate: 1,
      inverseRate: 1,
      source: 'stablecoin_peg',
    });
  });
});
