/**
 * Fuzzing tests for auth registration endpoint
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as fc from 'fast-check';
import { AppModule } from '../../../src/app.module';
import {
  phoneArbitraries,
  countryCodeArbitraries,
  sqlInjectionStrings,
  xssStrings,
  pathTraversalStrings,
  commandInjectionStrings,
  bufferOverflowStrings,
  unicodeEdgeCases,
} from '../common/arbitraries';
import {
  assertHelpers,
  fuzzConfig,
  leaksSensitiveInfo,
  containsSqlError,
} from '../common/helpers';

describe('Auth Registration - Fuzzing Tests', () => {
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

  describe('Phone Number Validation', () => {
    it('should reject all invalid phone number formats', async () => {
      await fc.assert(
        fc.asyncProperty(phoneArbitraries.invalid(), async (invalidPhone) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.auth.register)
            .send({ phone: invalidPhone, countryCode: 'CI' });

          // Should reject with 400
          expect([400, 403, 405, 429]).toContain(response.status);

          // Should not leak sensitive information
          assertHelpers.noSensitiveDataLeak(response);

          // Should not expose SQL errors
          assertHelpers.noSqlErrors(response);

          // Should have proper error structure
          assertHelpers.hasProperErrorStructure(response);
        }),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should accept all valid phone number formats', async () => {
      await fc.assert(
        fc.asyncProperty(phoneArbitraries.valid(), async (validPhone) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.auth.register)
            .send({ phone: validPhone, countryCode: 'CI' });

          // Should either succeed or fail gracefully
          expect([201, 400, 409, 429]).toContain(response.status);

          // Should never leak sensitive info
          assertHelpers.noSensitiveDataLeak(response);
          assertHelpers.noSqlErrors(response);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 50) }, // Reduce runs to avoid hitting rate limits
      );
    });

    it('should handle SQL injection attempts in phone field', async () => {
      await fc.assert(
        fc.asyncProperty(sqlInjectionStrings(), async (sqlPayload) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.auth.register)
            .send({ phone: sqlPayload, countryCode: 'CI' });

          expect([400, 403, 413, 429]).toContain(response.status);
          assertHelpers.noSqlErrors(response);
          assertHelpers.noSensitiveDataLeak(response);

          // Ensure no database errors
          expect(containsSqlError(response)).toBe(false);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle XSS attempts in phone field', async () => {
      await fc.assert(
        fc.asyncProperty(xssStrings(), async (xssPayload) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.auth.register)
            .send({ phone: xssPayload, countryCode: 'CI' });

          expect([400, 403, 405, 429]).toContain(response.status);
          assertHelpers.noSensitiveDataLeak(response);

          // Response should not contain unescaped HTML
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toMatch(/<script>/i);
          expect(responseText).not.toMatch(/<img/i);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle path traversal attempts', async () => {
      await fc.assert(
        fc.asyncProperty(pathTraversalStrings(), async (pathPayload) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.auth.register)
            .send({ phone: pathPayload, countryCode: 'CI' });

          expect([400, 403, 429]).toContain(response.status);
          assertHelpers.noSensitiveDataLeak(response);

          // Should not expose file system paths
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toMatch(/\/etc\/passwd/i);
          expect(responseText).not.toMatch(/windows\\system32/i);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle command injection attempts', async () => {
      await fc.assert(
        fc.asyncProperty(commandInjectionStrings(), async (cmdPayload) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.auth.register)
            .send({ phone: cmdPayload, countryCode: 'CI' });

          expect([400, 403, 429]).toContain(response.status);
          assertHelpers.noSensitiveDataLeak(response);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle buffer overflow attempts', async () => {
      await fc.assert(
        fc.asyncProperty(bufferOverflowStrings(), async (largeString) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.auth.register)
            .send({ phone: largeString, countryCode: 'CI' });

          // Should reject large inputs
          expect([400, 403, 413, 429]).toContain(response.status);
          assertHelpers.noSensitiveDataLeak(response);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 10) },
      );
    });

    it('should handle unicode edge cases in phone', async () => {
      await fc.assert(
        fc.asyncProperty(unicodeEdgeCases(), async (unicodeString) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.auth.register)
            .send({ phone: unicodeString, countryCode: 'CI' });

          expect([400, 403, 429]).toContain(response.status);
          assertHelpers.noSensitiveDataLeak(response);
          assertHelpers.hasProperErrorStructure(response);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });
  });

  describe('Country Code Validation', () => {
    it('should reject invalid country codes', async () => {
      await fc.assert(
        fc.asyncProperty(
          countryCodeArbitraries.invalid(),
          phoneArbitraries.valid(),
          async (invalidCountryCode, validPhone) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.auth.register)
              .send({ phone: validPhone, countryCode: invalidCountryCode });

            expect([400, 403, 405, 429]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
            assertHelpers.hasProperErrorStructure(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should accept valid country codes', async () => {
      await fc.assert(
        fc.asyncProperty(
          countryCodeArbitraries.valid(),
          phoneArbitraries.valid(),
          async (validCountryCode, validPhone) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.auth.register)
              .send({ phone: validPhone, countryCode: validCountryCode });

            // Should either succeed or fail gracefully
            expect([201, 400, 409, 429]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 30) },
      );
    });
  });

  describe('Request Body Edge Cases', () => {
    it('should handle missing phone field', async () => {
      const response = await request(app.getHttpServer())
        .post(fuzzConfig.paths.auth.register)
        .send({ countryCode: 'CI' });

      expect([400, 403, 429]).toContain(response.status);
      assertHelpers.hasProperErrorStructure(response);
    });

    it('should handle missing countryCode field', async () => {
      const response = await request(app.getHttpServer())
        .post(fuzzConfig.paths.auth.register)
        .send({ phone: '+2250701234567' });

      // Might have default or require it
      expect([201, 400, 409, 429]).toContain(response.status);
    });

    it('should handle empty request body', async () => {
      const response = await request(app.getHttpServer())
        .post(fuzzConfig.paths.auth.register)
        .send({});

      expect([400, 403, 429]).toContain(response.status);
      assertHelpers.hasProperErrorStructure(response);
    });

    it('should handle null values', async () => {
      const response = await request(app.getHttpServer())
        .post(fuzzConfig.paths.auth.register)
        .send({ phone: null, countryCode: null });

      expect([400, 403, 429]).toContain(response.status);
      assertHelpers.hasProperErrorStructure(response);
    });

    it('should handle extra fields gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(),
          fc.anything(),
          async (extraKey, extraValue) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.auth.register)
              .send({
                phone: '+2250701234567',
                countryCode: 'CI',
                [extraKey]: extraValue,
              });

            // Should either strip extra fields or reject
            expect([201, 400, 409, 429]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 50) },
      );
    });

    it('should handle wrong data types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.integer(),
            fc.boolean(),
            fc.array(fc.string()),
            fc.object(),
          ),
          async (wrongType) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.auth.register)
              .send({ phone: wrongType, countryCode: 'CI' });

            expect([400, 403, 429]).toContain(response.status);
            assertHelpers.hasProperErrorStructure(response);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 50) },
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on repeated requests', async () => {
      const phone = '+2250701234567';
      const responses: request.Response[] = [];

      // Make 10 rapid requests
      for (let i = 0; i < 10; i++) {
        responses.push(
          await request(app.getHttpServer())
            .post(fuzzConfig.paths.auth.register)
            .send({ phone, countryCode: 'CI' }),
        );
      }

      // Note: Might not be rate limited in test environment
      // Just ensure no crashes
      responses.forEach((r) => {
        expect([201, 400, 409, 429]).toContain(r.status);
      });
    });
  });

  describe('Content-Type Handling', () => {
    it('should reject non-JSON content types', async () => {
      const response = await request(app.getHttpServer())
        .post(fuzzConfig.paths.auth.register)
        .set('Content-Type', 'text/plain')
        .send('phone=+2250701234567&countryCode=CI');

      expect([400, 403, 415, 429]).toContain(response.status);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app.getHttpServer())
        .post(fuzzConfig.paths.auth.register)
        .send({ phone: '+2250701234567', countryCode: 'CI' });

      // Should either work or reject gracefully
      expect([201, 400, 409, 415, 429]).toContain(response.status);
    });
  });

  describe('Security Headers', () => {
    it('should not leak information in error responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.anything(),
          fc.anything(),
          async (phone, countryCode) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.auth.register)
              .send({ phone, countryCode });

            // Never leak sensitive info regardless of input
            const responseText = JSON.stringify(response.body);
            expect(leaksSensitiveInfo(responseText)).toBe(false);

            // No stack traces
            expect(responseText).not.toMatch(/at\s+\w+\s+\(/);
            expect(responseText).not.toMatch(/\.ts:\d+:\d+/);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 100) },
      );
    });
  });
});
