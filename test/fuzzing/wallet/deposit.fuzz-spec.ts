/**
 * Fuzzing tests for wallet deposit endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fc from 'fast-check';
import { AppModule } from '../../../src/app.module';
import {
  amountArbitraries,
  currencyArbitraries,
  sqlInjectionStrings,
  xssStrings,
} from '../common/arbitraries';
import { assertHelpers, fuzzConfig } from '../common/helpers';

describe('Wallet Deposit - Fuzzing Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    authToken = 'mock-token-for-testing';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Initiate Deposit - Amount Validation', () => {
    it('should reject invalid deposit amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          amountArbitraries.invalid(),
          currencyArbitraries.valid(),
          async (invalidAmount, validCurrency) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.deposit)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                amount: invalidAmount,
                sourceCurrency: validCurrency,
                channelId: 'orange_money_ci',
              });

            expect([400, 401]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should handle boundary deposit amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          amountArbitraries.boundary(),
          async (boundaryAmount) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.deposit)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                amount: boundaryAmount,
                sourceCurrency: 'XOF',
                channelId: 'orange_money_ci',
              });

            expect([200, 201, 400, 401, 403]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should enforce minimum deposit amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.float({ min: 0, max: 0.009, noNaN: true }),
          async (tinyAmount) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.deposit)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                amount: tinyAmount,
                sourceCurrency: 'XOF',
                channelId: 'orange_money_ci',
              });

            expect([400, 401]).toContain(response.status);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should handle very large deposit amounts', async () => {
      await fc.assert(
        fc.asyncProperty(amountArbitraries.large(), async (largeAmount) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.deposit)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              amount: largeAmount,
              sourceCurrency: 'XOF',
              channelId: 'orange_money_ci',
            });

          // Should either accept or reject based on limits
          expect([200, 201, 400, 401, 403]).toContain(response.status);
          assertHelpers.noSensitiveDataLeak(response);
        }),
        { numRuns: 30 },
      );
    });
  });

  describe('Initiate Deposit - Currency Validation', () => {
    it('should reject invalid source currencies', async () => {
      await fc.assert(
        fc.asyncProperty(
          amountArbitraries.valid(),
          currencyArbitraries.invalid(),
          async (validAmount, invalidCurrency) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.deposit)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                amount: validAmount,
                sourceCurrency: invalidCurrency,
                channelId: 'orange_money_ci',
              });

            expect([400, 401]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should handle SQL injection in currency field', async () => {
      await fc.assert(
        fc.asyncProperty(
          amountArbitraries.valid(),
          sqlInjectionStrings(),
          async (validAmount, sqlPayload) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.deposit)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                amount: validAmount,
                sourceCurrency: sqlPayload,
                channelId: 'orange_money_ci',
              });

            expect([400, 401]).toContain(response.status);
            assertHelpers.noSqlErrors(response);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('Initiate Deposit - Channel ID Validation', () => {
    it('should reject invalid channel IDs', async () => {
      await fc.assert(
        fc.asyncProperty(
          amountArbitraries.valid(),
          fc.oneof(
            fc.string({ minLength: 0, maxLength: 5 }),
            fc.string({ minLength: 100, maxLength: 200 }),
            fc.constant(''),
            fc.constant('invalid-channel'),
          ),
          async (validAmount, invalidChannelId) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.deposit)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                amount: validAmount,
                sourceCurrency: 'XOF',
                channelId: invalidChannelId,
              });

            expect([400, 401, 404]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should handle SQL injection in channel ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          amountArbitraries.valid(),
          sqlInjectionStrings(),
          async (validAmount, sqlPayload) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.deposit)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                amount: validAmount,
                sourceCurrency: 'XOF',
                channelId: sqlPayload,
              });

            expect([400, 401, 404]).toContain(response.status);
            assertHelpers.noSqlErrors(response);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should handle XSS in channel ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          amountArbitraries.valid(),
          xssStrings(),
          async (validAmount, xssPayload) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.deposit)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                amount: validAmount,
                sourceCurrency: 'XOF',
                channelId: xssPayload,
              });

            expect([400, 401, 404]).toContain(response.status);
            const responseText = JSON.stringify(response.body);
            expect(responseText).not.toMatch(/<script>/i);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('Get Deposit Channels - Query Validation', () => {
    it('should handle invalid currency query parameter', async () => {
      await fc.assert(
        fc.asyncProperty(
          currencyArbitraries.invalid(),
          async (invalidCurrency) => {
            const response = await request(app.getHttpServer())
              .get(fuzzConfig.paths.wallet.depositChannels)
              .set('Authorization', `Bearer ${authToken}`)
              .query({ currency: invalidCurrency });

            // Should either filter or reject
            expect([200, 400, 401]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should handle SQL injection in currency query', async () => {
      await fc.assert(
        fc.asyncProperty(sqlInjectionStrings(), async (sqlPayload) => {
          const response = await request(app.getHttpServer())
            .get(fuzzConfig.paths.wallet.depositChannels)
            .set('Authorization', `Bearer ${authToken}`)
            .query({ currency: sqlPayload });

          expect([200, 400, 401]).toContain(response.status);
          assertHelpers.noSqlErrors(response);
        }),
        { numRuns: 20 },
      );
    });

    it('should handle XSS in currency query', async () => {
      await fc.assert(
        fc.asyncProperty(xssStrings(), async (xssPayload) => {
          const response = await request(app.getHttpServer())
            .get(fuzzConfig.paths.wallet.depositChannels)
            .set('Authorization', `Bearer ${authToken}`)
            .query({ currency: xssPayload });

          expect([200, 400, 401]).toContain(response.status);
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toMatch(/<script>/i);
        }),
        { numRuns: 20 },
      );
    });

    it('should handle extra query parameters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(),
          fc.anything(),
          async (extraKey, extraValue) => {
            const response = await request(app.getHttpServer())
              .get(fuzzConfig.paths.wallet.depositChannels)
              .set('Authorization', `Bearer ${authToken}`)
              .query({ currency: 'XOF', [extraKey]: extraValue });

            // Should ignore extra params
            expect([200, 400, 401]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Request Body Edge Cases', () => {
    it('should handle missing required fields', async () => {
      const testCases = [
        { sourceCurrency: 'XOF', channelId: 'orange_money_ci' }, // Missing amount
        { amount: 1000, channelId: 'orange_money_ci' }, // Missing sourceCurrency
        { amount: 1000, sourceCurrency: 'XOF' }, // Missing channelId
        {}, // Missing all
      ];

      for (const testCase of testCases) {
        const response = await request(app.getHttpServer())
          .post(fuzzConfig.paths.wallet.deposit)
          .set('Authorization', `Bearer ${authToken}`)
          .send(testCase);

        expect([400, 401]).toContain(response.status);
        assertHelpers.hasProperErrorStructure(response);
      }
    });

    it('should handle null values', async () => {
      const response = await request(app.getHttpServer())
        .post(fuzzConfig.paths.wallet.deposit)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: null,
          sourceCurrency: null,
          channelId: null,
        });

      expect([400, 401]).toContain(response.status);
      assertHelpers.hasProperErrorStructure(response);
    });

    it('should handle wrong data types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.string(), fc.boolean(), fc.array(fc.integer())),
          async (wrongType) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.deposit)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                amount: wrongType,
                sourceCurrency: wrongType,
                channelId: wrongType,
              });

            expect([400, 401]).toContain(response.status);
            assertHelpers.hasProperErrorStructure(response);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should handle extra fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(),
          fc.anything(),
          async (extraKey, extraValue) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.deposit)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                amount: 10000,
                sourceCurrency: 'XOF',
                channelId: 'orange_money_ci',
                [extraKey]: extraValue,
              });

            // Should strip extra fields or reject
            expect([200, 201, 400, 401, 403]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Idempotency', () => {
    it('should handle idempotency keys correctly', async () => {
      const idempotencyKey = `deposit-${Date.now()}`;

      await fc.assert(
        fc.asyncProperty(amountArbitraries.valid(), async (amount) => {
          const response1 = await request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.deposit)
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-Idempotency-Key', idempotencyKey)
            .send({
              amount,
              sourceCurrency: 'XOF',
              channelId: 'orange_money_ci',
            });

          const response2 = await request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.deposit)
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-Idempotency-Key', idempotencyKey)
            .send({
              amount,
              sourceCurrency: 'XOF',
              channelId: 'orange_money_ci',
            });

          // Responses should be consistent
          expect(response1.status).toBe(response2.status);
        }),
        { numRuns: 10 },
      );
    });
  });

  describe('Rate Exchange Query', () => {
    it('should validate rate query parameters', async () => {
      await fc.assert(
        fc.asyncProperty(
          currencyArbitraries.invalid(),
          currencyArbitraries.invalid(),
          amountArbitraries.invalid(),
          async (invalidSource, invalidTarget, invalidAmount) => {
            const response = await request(app.getHttpServer())
              .get(fuzzConfig.paths.wallet.rate)
              .set('Authorization', `Bearer ${authToken}`)
              .query({
                sourceCurrency: invalidSource,
                targetCurrency: invalidTarget,
                amount: invalidAmount,
              });

            expect([400, 401]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should handle SQL injection in rate query', async () => {
      await fc.assert(
        fc.asyncProperty(sqlInjectionStrings(), async (sqlPayload) => {
          const response = await request(app.getHttpServer())
            .get(fuzzConfig.paths.wallet.rate)
            .set('Authorization', `Bearer ${authToken}`)
            .query({
              sourceCurrency: sqlPayload,
              targetCurrency: sqlPayload,
              amount: sqlPayload,
            });

          expect([400, 401]).toContain(response.status);
          assertHelpers.noSqlErrors(response);
        }),
        { numRuns: 20 },
      );
    });
  });
});
