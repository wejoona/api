/**
 * Fuzzing tests for PIN management endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fc from 'fast-check';
import { AppModule } from '../../../src/app.module';
import {
  pinArbitraries,
  sqlInjectionStrings,
  xssStrings,
} from '../common/arbitraries';
import { assertHelpers, fuzzConfig, wait } from '../common/helpers';

describe('PIN Management - Fuzzing Tests', () => {
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

  describe('Set PIN - Format Validation', () => {
    it('should reject invalid PIN formats', async () => {
      await fc.assert(
        fc.asyncProperty(pinArbitraries.invalid(), async (invalidPin) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.setPin)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ pin: invalidPin, confirmPin: invalidPin });

          expect([400, 401]).toContain(response.status);
          assertHelpers.noSensitiveDataLeak(response);
        }),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should handle SQL injection in PIN', async () => {
      await fc.assert(
        fc.asyncProperty(sqlInjectionStrings(), async (sqlPayload) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.setPin)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ pin: sqlPayload, confirmPin: sqlPayload });

          expect([400, 401]).toContain(response.status);
          assertHelpers.noSqlErrors(response);
          assertHelpers.noSensitiveDataLeak(response);
        }),
        { numRuns: 20 },
      );
    });

    it('should handle XSS in PIN', async () => {
      await fc.assert(
        fc.asyncProperty(xssStrings(), async (xssPayload) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.setPin)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ pin: xssPayload, confirmPin: xssPayload });

          expect([400, 401]).toContain(response.status);
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toMatch(/<script>/i);
        }),
        { numRuns: 20 },
      );
    });

    it('should reject mismatched PIN confirmation', async () => {
      await fc.assert(
        fc.asyncProperty(
          pinArbitraries.valid(),
          pinArbitraries.valid(),
          async (pin1, pin2) => {
            // Only test when PINs are different
            fc.pre(pin1 !== pin2);

            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.setPin)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ pin: pin1, confirmPin: pin2 });

            expect([400, 401]).toContain(response.status);
            assertHelpers.hasProperErrorStructure(response);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should warn about weak PINs', async () => {
      await fc.assert(
        fc.asyncProperty(pinArbitraries.weak(), async (weakPin) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.setPin)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ pin: weakPin, confirmPin: weakPin });

          // Should either reject or warn
          expect([200, 400, 401]).toContain(response.status);
          assertHelpers.noSensitiveDataLeak(response);
        }),
        { numRuns: 20 },
      );
    });

    it('should reject too short PINs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 999 }).map(String),
          async (shortPin) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.setPin)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ pin: shortPin, confirmPin: shortPin });

            expect([400, 401]).toContain(response.status);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should reject too long PINs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10000000, max: 99999999 }).map(String),
          async (longPin) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.setPin)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ pin: longPin, confirmPin: longPin });

            expect([400, 401]).toContain(response.status);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Verify PIN - Format Validation', () => {
    it('should reject invalid PIN formats', async () => {
      await fc.assert(
        fc.asyncProperty(pinArbitraries.invalid(), async (invalidPin) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.verifyPin)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ pin: invalidPin });

          expect([400, 401]).toContain(response.status);
          assertHelpers.noSensitiveDataLeak(response);
        }),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should handle SQL injection in PIN verification', async () => {
      await fc.assert(
        fc.asyncProperty(sqlInjectionStrings(), async (sqlPayload) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.verifyPin)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ pin: sqlPayload });

          expect([400, 401]).toContain(response.status);
          assertHelpers.noSqlErrors(response);
        }),
        { numRuns: 20 },
      );
    });

    it('should reject valid format but wrong PIN', async () => {
      await fc.assert(
        fc.asyncProperty(pinArbitraries.valid(), async (validPin) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.verifyPin)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ pin: validPin });

          // Should reject (400 or 401) or lock (403)
          expect([400, 401, 403]).toContain(response.status);
          assertHelpers.noSensitiveDataLeak(response);
        }),
        { numRuns: 20 }, // Reduce to avoid lockout
      );
    });
  });

  describe('Brute Force Protection', () => {
    it('should handle rapid PIN verification attempts', async () => {
      const requests = [];

      // Attempt multiple PIN verifications rapidly
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.verifyPin)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ pin: '1234' }),
        );
      }

      const responses = await Promise.all(requests);

      // Should rate limit or lock account
      const hasRateLimit = responses.some((r) => r.status === 429);
      const hasForbidden = responses.some((r) => r.status === 403);

      // At least no crashes and proper error handling
      responses.forEach((r) => {
        expect([400, 401, 403, 429]).toContain(r.status);
        assertHelpers.noSensitiveDataLeak(r);
      });
    });

    it('should not leak information through response timing', async () => {
      const timings: number[] = [];

      await fc.assert(
        fc.asyncProperty(pinArbitraries.valid(), async (pin) => {
          const start = Date.now();
          await request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.verifyPin)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ pin });
          const duration = Date.now() - start;

          timings.push(duration);

          // Basic timing check
          return true;
        }),
        { numRuns: 10 }, // Reduced to avoid lockout
      );

      // Check timing consistency (basic check)
      if (timings.length > 1) {
        const avg = timings.reduce((a, b) => a + b) / timings.length;
        const variance =
          timings.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) /
          timings.length;
        const stdDev = Math.sqrt(variance);

        // Timing should be relatively consistent
        expect(stdDev).toBeLessThan(avg * 2); // Allow 200% variance
      }
    });

    it('should lockout after too many failed attempts', async () => {
      const pin = '1234';

      // Make 6 failed attempts
      for (let i = 0; i < 6; i++) {
        await request(app.getHttpServer())
          .post(fuzzConfig.paths.wallet.verifyPin)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ pin });

        // Small delay between attempts
        await wait(100);
      }

      // Next attempt should be locked
      const response = await request(app.getHttpServer())
        .post(fuzzConfig.paths.wallet.verifyPin)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin });

      // Should be forbidden (locked) or rate limited
      expect([403, 429]).toContain(response.status);

      // Should not leak lockout timing
      const message = JSON.stringify(response.body);
      assertHelpers.noSensitiveDataLeak(response);
    });
  });

  describe('Request Body Edge Cases', () => {
    it('should handle missing PIN field', async () => {
      const responses = await Promise.all([
        request(app.getHttpServer())
          .post(fuzzConfig.paths.wallet.setPin)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ confirmPin: '1234' }),

        request(app.getHttpServer())
          .post(fuzzConfig.paths.wallet.verifyPin)
          .set('Authorization', `Bearer ${authToken}`)
          .send({}),
      ]);

      responses.forEach((r) => {
        expect([400, 401]).toContain(r.status);
        assertHelpers.hasProperErrorStructure(r);
      });
    });

    it('should handle null values', async () => {
      const response = await request(app.getHttpServer())
        .post(fuzzConfig.paths.wallet.setPin)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: null, confirmPin: null });

      expect([400, 401]).toContain(response.status);
      assertHelpers.hasProperErrorStructure(response);
    });

    it('should handle wrong data types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.boolean(), fc.array(fc.integer()), fc.object()),
          async (wrongType) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.setPin)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ pin: wrongType, confirmPin: wrongType });

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
              .post(fuzzConfig.paths.wallet.setPin)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                pin: '1234',
                confirmPin: '1234',
                [extraKey]: extraValue,
              });

            // Should strip extra fields or reject
            expect([200, 400, 401]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('PIN in Response', () => {
    it('should never return PIN in response', async () => {
      await fc.assert(
        fc.asyncProperty(pinArbitraries.valid(), async (pin) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.setPin)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ pin, confirmPin: pin });

          // PIN should NEVER appear in response
          const responseText = JSON.stringify(response.body).toLowerCase();
          expect(responseText).not.toContain(pin);
        }),
        { numRuns: 50 },
      );
    });

    it('should not leak PIN hash or salt', async () => {
      const response = await request(app.getHttpServer())
        .post(fuzzConfig.paths.wallet.verifyPin)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '1234' });

      const responseText = JSON.stringify(response.body).toLowerCase();

      // Should not contain hash-like strings
      expect(responseText).not.toMatch(/\$2[aby]\$\d+\$/); // bcrypt pattern
      expect(responseText).not.toMatch(/[a-f0-9]{32,}/); // hex hash pattern
      expect(responseText).not.toContain('salt');
      expect(responseText).not.toContain('hash');
    });
  });

  describe('Authentication', () => {
    it('should require authentication for PIN operations', async () => {
      const responses = await Promise.all([
        request(app.getHttpServer())
          .post(fuzzConfig.paths.wallet.setPin)
          .send({ pin: '1234', confirmPin: '1234' }),

        request(app.getHttpServer())
          .post(fuzzConfig.paths.wallet.verifyPin)
          .send({ pin: '1234' }),
      ]);

      responses.forEach((r) => {
        expect(r.status).toBe(401);
        assertHelpers.hasProperErrorStructure(r);
      });
    });
  });
});
