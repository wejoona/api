/**
 * Exchange Rate Controller Integration Tests
 *
 * Covers active mobile exchange-rate routes.
 */

import { INestApplication, BadRequestException } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockExchangeRateService = {
  getAllRates: jest.fn(),
  convert: jest.fn(),
  getRate: jest.fn(),
};

import { ExchangeRateController } from '@modules/exchange-rate/application/controllers/exchange-rate.controller';
import { ExchangeRateService } from '@modules/exchange-rate/application/services/exchange-rate.service';

describe('ExchangeRateController (e2e)', () => {
  let app: INestApplication;
  const rateResponse = {
    from: 'USDC',
    to: 'XOF',
    rate: 600,
    inverseRate: 0.001667,
    source: 'fallback',
    updatedAt: new Date('2026-06-04T00:00:00.000Z'),
  };

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ExchangeRateController],
      providers: [
        { provide: ExchangeRateService, useValue: mockExchangeRateService },
      ],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/rates/pair', () => {
    it('should return the USDC/XOF pair used by mobile (200)', async () => {
      mockExchangeRateService.getRate.mockReturnValue(rateResponse);

      const res = await request(app.getHttpServer())
        .get('/api/v1/rates/pair?from=USDC&to=XOF')
        .expect(200);

      expect(res.body).toMatchObject({
        from: 'USDC',
        to: 'XOF',
        rate: 600,
      });
      expect(mockExchangeRateService.getRate).toHaveBeenCalledWith(
        'USDC',
        'XOF',
      );
    });

    it('should reject unavailable currency pairs', async () => {
      mockExchangeRateService.getRate.mockReturnValue(null);

      await request(app.getHttpServer())
        .get('/api/v1/rates/pair?from=BTC&to=XOF')
        .expect(400);
    });
  });

  describe('GET /api/v1/rates/convert', () => {
    it('should validate positive amounts', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/rates/convert?amount=0&from=USDC&to=XOF')
        .expect(400);
    });

    it('should convert supported pairs (200)', async () => {
      mockExchangeRateService.convert.mockReturnValue({
        fromAmount: 10,
        fromCurrency: 'USDC',
        toAmount: 6000,
        toCurrency: 'XOF',
        rate: 600,
        fee: 0,
        totalCost: 10,
      });

      await request(app.getHttpServer())
        .get('/api/v1/rates/convert?amount=10&from=USDC&to=XOF')
        .expect(200);
    });
  });
});
