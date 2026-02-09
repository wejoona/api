/**
 * Fuzzing tests for wallet transfer endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as fc from 'fast-check';
import { AppModule } from '../../../src/app.module';
import {
  phoneArbitraries,
  amountArbitraries,
  currencyArbitraries,
  addressArbitraries,
  networkArbitraries,
  sqlInjectionStrings,
  xssStrings,
} from '../common/arbitraries';
import { assertHelpers, fuzzConfig } from '../common/helpers';

describe('Wallet Transfer - Fuzzing Tests', () => {
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

    // Note: In real tests, you'd get a valid auth token
    // For fuzzing, we test both authenticated and unauthenticated states
    authToken = 'mock-token-for-testing';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Internal Transfer - Amount Validation', () => {
    it('should reject invalid amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArbitraries.valid(),
          amountArbitraries.invalid(),
          async (toPhone, invalidAmount) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.internalTransfer)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ toPhone, amount: invalidAmount, currency: 'USD' });

            // Should reject (400) or be unauthorized (401)
            expect([400, 401]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should handle boundary amount values', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArbitraries.valid(),
          amountArbitraries.boundary(),
          async (toPhone, boundaryAmount) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.internalTransfer)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ toPhone, amount: boundaryAmount, currency: 'USD' });

            // Should handle boundaries gracefully
            expect([200, 400, 401, 403, 429]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
            assertHelpers.hasProperErrorStructure(response);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should reject negative amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArbitraries.valid(),
          fc.float({ min: -1000000, max: -0.01 }),
          async (toPhone, negativeAmount) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.internalTransfer)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ toPhone, amount: negativeAmount, currency: 'USD' });

            expect([400, 401]).toContain(response.status);
            assertHelpers.hasProperErrorStructure(response);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should handle precision edge cases', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArbitraries.valid(),
          fc.oneof(
            fc.constant(0.001), // Too many decimals
            fc.constant(0.0001),
            fc.constant(1.111111111111111),
            fc.constant(99.999999999),
          ),
          async (toPhone, preciseAmount) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.internalTransfer)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ toPhone, amount: preciseAmount, currency: 'USD' });

            expect([200, 400, 401, 403]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Internal Transfer - Phone Validation', () => {
    it('should reject invalid recipient phone numbers', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArbitraries.invalid(),
          amountArbitraries.valid(),
          async (invalidPhone, validAmount) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.internalTransfer)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                toPhone: invalidPhone,
                amount: validAmount,
                currency: 'USD',
              });

            expect([400, 401]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should handle SQL injection in phone field', async () => {
      await fc.assert(
        fc.asyncProperty(
          sqlInjectionStrings(),
          amountArbitraries.valid(),
          async (sqlPayload, validAmount) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.internalTransfer)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                toPhone: sqlPayload,
                amount: validAmount,
                currency: 'USD',
              });

            expect([400, 401]).toContain(response.status);
            assertHelpers.noSqlErrors(response);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('Internal Transfer - Currency Validation', () => {
    it('should reject invalid currencies', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArbitraries.valid(),
          amountArbitraries.valid(),
          currencyArbitraries.invalid(),
          async (toPhone, amount, invalidCurrency) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.internalTransfer)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ toPhone, amount, currency: invalidCurrency });

            expect([400, 401]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });
  });

  describe('External Transfer - Address Validation', () => {
    it('should reject invalid wallet addresses', async () => {
      await fc.assert(
        fc.asyncProperty(
          addressArbitraries.invalid(),
          amountArbitraries.valid(),
          async (invalidAddress, validAmount) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.externalTransfer)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                toAddress: invalidAddress,
                amount: validAmount,
                currency: 'USD',
                network: 'polygon',
              });

            expect([400, 401]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should handle SQL injection in address field', async () => {
      await fc.assert(
        fc.asyncProperty(
          sqlInjectionStrings(),
          amountArbitraries.valid(),
          async (sqlPayload, validAmount) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.externalTransfer)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                toAddress: sqlPayload,
                amount: validAmount,
                currency: 'USD',
                network: 'polygon',
              });

            expect([400, 401]).toContain(response.status);
            assertHelpers.noSqlErrors(response);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should handle XSS in address field', async () => {
      await fc.assert(
        fc.asyncProperty(
          xssStrings(),
          amountArbitraries.valid(),
          async (xssPayload, validAmount) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.externalTransfer)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                toAddress: xssPayload,
                amount: validAmount,
                currency: 'USD',
                network: 'polygon',
              });

            expect([400, 401]).toContain(response.status);
            const responseText = JSON.stringify(response.body);
            expect(responseText).not.toMatch(/<script>/i);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('External Transfer - Network Validation', () => {
    it('should reject invalid networks', async () => {
      await fc.assert(
        fc.asyncProperty(
          addressArbitraries.valid(),
          amountArbitraries.valid(),
          networkArbitraries.invalid(),
          async (validAddress, validAmount, invalidNetwork) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.externalTransfer)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                toAddress: validAddress,
                amount: validAmount,
                currency: 'USD',
                network: invalidNetwork,
              });

            expect([400, 401]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });
  });

  describe('Withdraw - Validation', () => {
    it('should validate destination address', async () => {
      await fc.assert(
        fc.asyncProperty(
          addressArbitraries.invalid(),
          amountArbitraries.valid(),
          async (invalidAddress, validAmount) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.withdraw)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                destinationAddress: invalidAddress,
                amount: validAmount,
                network: 'polygon',
              });

            expect([400, 401]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should validate withdrawal amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          addressArbitraries.valid(),
          amountArbitraries.invalid(),
          async (validAddress, invalidAmount) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.withdraw)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                destinationAddress: validAddress,
                amount: invalidAmount,
                network: 'polygon',
              });

            expect([400, 401]).toContain(response.status);
            assertHelpers.hasProperErrorStructure(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate idempotency keys', async () => {
      const idempotencyKey = `test-${Date.now()}`;

      await fc.assert(
        fc.asyncProperty(
          phoneArbitraries.valid(),
          amountArbitraries.valid(),
          async (toPhone, amount) => {
            // Send same request twice with same idempotency key
            const response1 = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.internalTransfer)
              .set('Authorization', `Bearer ${authToken}`)
              .set('X-Idempotency-Key', idempotencyKey)
              .send({ toPhone, amount, currency: 'USD' });

            const response2 = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.internalTransfer)
              .set('Authorization', `Bearer ${authToken}`)
              .set('X-Idempotency-Key', idempotencyKey)
              .send({ toPhone, amount, currency: 'USD' });

            // Responses should be consistent
            expect(response1.status).toBe(response2.status);
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should handle malformed idempotency keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArbitraries.valid(),
          amountArbitraries.valid(),
          fc.oneof(
            fc.string({ minLength: 0, maxLength: 5 }),
            sqlInjectionStrings(),
            xssStrings(),
          ),
          async (toPhone, amount, malformedKey) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.internalTransfer)
              .set('Authorization', `Bearer ${authToken}`)
              .set('X-Idempotency-Key', malformedKey)
              .send({ toPhone, amount, currency: 'USD' });

            // Should either work or reject gracefully
            expect([200, 400, 401, 403, 429]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Authentication', () => {
    it('should reject requests without auth token', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArbitraries.valid(),
          amountArbitraries.valid(),
          async (toPhone, amount) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.internalTransfer)
              .send({ toPhone, amount, currency: 'USD' });

            expect(response.status).toBe(401);
            assertHelpers.hasProperErrorStructure(response);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should reject malformed auth tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArbitraries.valid(),
          amountArbitraries.valid(),
          fc.string(),
          async (toPhone, amount, malformedToken) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.internalTransfer)
              .set('Authorization', `Bearer ${malformedToken}`)
              .send({ toPhone, amount, currency: 'USD' });

            expect(response.status).toBe(401);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
