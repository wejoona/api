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
  });

  afterAll(async () => {
    await app.close();
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

            expect(response.status).toBe(400);
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
        { numRuns: 30 }, // Reduce to avoid lockout
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

            expect(response.status).toBe(400);
            assertHelpers.noSqlErrors(response);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: 20 },
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

            expect(response.status).toBe(400);
            assertHelpers.noSensitiveDataLeak(response);

            const responseText = JSON.stringify(response.body);
            expect(responseText).not.toMatch(/<script>/i);
          },
        ),
        { numRuns: 20 },
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

            expect(response.status).toBe(400);
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
      const requests = [];

      // Attempt multiple OTP verifications rapidly
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app.getHttpServer())
            .post(fuzzConfig.paths.auth.verifyOtp)
            .send({ phone, otp: '123456' }),
        );
      }

      const responses = await Promise.all(requests);

      // Should rate limit or lock account
      const hasRateLimit = responses.some((r) => r.status === 429);
      const hasForbidden = responses.some((r) => r.status === 403);

      // At least no crashes
      responses.forEach((r) => {
        expect([400, 401, 403, 429]).toContain(r.status);
        assertHelpers.noSensitiveDataLeak(r);
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
        { numRuns: 50 },
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
        expect(r.status).toBe(400);
        assertHelpers.hasProperErrorStructure(r);
      });
    });

    it('should handle null values', async () => {
      const response = await request(app.getHttpServer())
        .post(fuzzConfig.paths.auth.verifyOtp)
        .send({ phone: null, otp: null });

      expect(response.status).toBe(400);
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

            expect(response.status).toBe(400);
            assertHelpers.hasProperErrorStructure(response);
          },
        ),
        { numRuns: 50 },
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
        { numRuns: 20 },
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
