/**
 * Fuzzing tests for OTP verification endpoint
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as fc from 'fast-check';
import { AppModule } from '../../../src/app.module';
import {
  phoneArbitraries,
  otpArbitraries,
  sqlInjectionStrings,
  xssStrings,
} from '../common/arbitraries';
import { assertHelpers, fuzzConfig } from '../common/helpers';

describe('OTP Verification - Fuzzing Tests', () => {
  let app: INestApplication;

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
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await app.close().catch((error) => {
      if (
        !(error instanceof Error) ||
        !error.message.includes('Connection is closed')
      ) {
        throw error;
      }
    });
  });

  describe('OTP Format Validation', () => {
    it('should reject all invalid OTP formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArbitraries.valid(),
          otpArbitraries.invalid(),
          async (validPhone, invalidOtp) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.auth.verifyOtp)
              .send({ phone: validPhone, otp: invalidOtp });

            expect([400, 403, 429]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
            assertHelpers.hasProperErrorStructure(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should handle valid OTP format but wrong code', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArbitraries.valid(),
          otpArbitraries.valid(),
          async (validPhone, validOtp) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.auth.verifyOtp)
              .send({ phone: validPhone, otp: validOtp });

            // Should reject with 400 or 401 (invalid OTP)
            expect([400, 401, 429]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 30) }, // Reduce to avoid lockout
      );
    });

    it('should handle SQL injection in OTP field', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArbitraries.valid(),
          sqlInjectionStrings(),
          async (validPhone, sqlPayload) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.auth.verifyOtp)
              .send({ phone: validPhone, otp: sqlPayload });

            expect([400, 403, 429]).toContain(response.status);
            assertHelpers.noSqlErrors(response);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle XSS in OTP field', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArbitraries.valid(),
          xssStrings(),
          async (validPhone, xssPayload) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.auth.verifyOtp)
              .send({ phone: validPhone, otp: xssPayload });

            expect([400, 403, 429]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);

            const responseText = JSON.stringify(response.body);
            expect(responseText).not.toMatch(/<script>/i);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });
  });

  describe('Phone Number Validation', () => {
    it('should reject invalid phone numbers', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArbitraries.invalid(),
          otpArbitraries.valid(),
          async (invalidPhone, validOtp) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.auth.verifyOtp)
              .send({ phone: invalidPhone, otp: validOtp });

            expect([400, 403, 405, 429]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });
  });

  describe('Brute Force Protection', () => {
    it('should handle rapid OTP verification attempts', async () => {
      const phone = '+2250701234567';
      const responses: request.Response[] = [];

      // Attempt multiple OTP verifications rapidly
      for (let i = 0; i < 10; i++) {
        responses.push(
          await request(app.getHttpServer())
            .post(fuzzConfig.paths.auth.verifyOtp)
            .send({ phone, otp: '123456' }),
        );
      }

      // At least no crashes
      responses.forEach((r) => {
        expect([200, 400, 401, 403, 429]).toContain(r.status);
        if (r.status >= 400) {
          assertHelpers.noSensitiveDataLeak(r);
        }
      });
    });

    it('should not leak valid phone numbers through error messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          phoneArbitraries.valid(),
          otpArbitraries.valid(),
          async (phone, otp) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.auth.verifyOtp)
              .send({ phone, otp });

            // Error message should not confirm if phone is registered
            const message = JSON.stringify(response.body);
            expect(message).not.toMatch(/not found/i);
            expect(message).not.toMatch(/not registered/i);
            expect(message).not.toMatch(/does not exist/i);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 50) },
      );
    });
  });

  describe('Request Body Edge Cases', () => {
    it('should handle missing fields', async () => {
      const responses = await Promise.all([
        request(app.getHttpServer())
          .post(fuzzConfig.paths.auth.verifyOtp)
          .send({ phone: '+2250701234567' }),

        request(app.getHttpServer())
          .post(fuzzConfig.paths.auth.verifyOtp)
          .send({ otp: '123456' }),

        request(app.getHttpServer())
          .post(fuzzConfig.paths.auth.verifyOtp)
          .send({}),
      ]);

      responses.forEach((r) => {
        expect([400, 403, 429]).toContain(r.status);
        assertHelpers.hasProperErrorStructure(r);
      });
    });

    it('should handle null values', async () => {
      const response = await request(app.getHttpServer())
        .post(fuzzConfig.paths.auth.verifyOtp)
        .send({ phone: null, otp: null });

      expect([400, 403, 429]).toContain(response.status);
      assertHelpers.hasProperErrorStructure(response);
    });

    it('should handle wrong data types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.integer(), fc.boolean(), fc.array(fc.string())),
          fc.oneof(fc.integer(), fc.boolean(), fc.array(fc.string())),
          async (wrongPhone, wrongOtp) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.auth.verifyOtp)
              .send({ phone: wrongPhone, otp: wrongOtp });

            expect([400, 403, 429]).toContain(response.status);
            assertHelpers.hasProperErrorStructure(response);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 50) },
      );
    });
  });

  describe('Timing Attack Prevention', () => {
    it('should not reveal information through response timing', async () => {
      const timings: number[] = [];

      await fc.assert(
        fc.asyncProperty(
          phoneArbitraries.valid(),
          otpArbitraries.valid(),
          async (phone, otp) => {
            const start = Date.now();
            await request(app.getHttpServer())
              .post(fuzzConfig.paths.auth.verifyOtp)
              .send({ phone, otp });
            const duration = Date.now() - start;

            timings.push(duration);

            // Timing should be relatively consistent
            // (This is a basic check, real timing attacks need more sophisticated analysis)
            return true;
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );

      // Check timing consistency (basic check)
      if (timings.length > 1) {
        const avg = timings.reduce((a, b) => a + b) / timings.length;
        const variance =
          timings.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) /
          timings.length;
        const stdDev = Math.sqrt(variance);

        // Timing should not vary too wildly (indicates consistent hashing)
        expect(stdDev).toBeLessThan(avg * 2); // Allow 200% variance
      }
    });
  });
});
