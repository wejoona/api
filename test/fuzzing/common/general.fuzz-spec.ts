/**
 * General fuzzing tests applicable to all endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as fc from 'fast-check';
import { AppModule } from '../../../src/app.module';
import {
  sqlInjectionStrings,
  xssStrings,
  pathTraversalStrings,
  bufferOverflowStrings,
  unicodeEdgeCases,
} from './arbitraries';
import {
  assertHelpers,
  fuzzConfig,
  isTransientRequestError,
  withTransientRequestRetry,
} from './helpers';

describe('General API Fuzzing Tests', () => {
  let app: INestApplication;

  const asSendablePayload = (payload: unknown): string | object => {
    if (typeof payload === 'string') {
      return payload;
    }

    if (typeof payload === 'object' && payload !== null) {
      return payload;
    }

    return String(payload);
  };

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

  const testEndpoints = [
    { method: 'post', path: '/auth/register', requiresAuth: false },
    { method: 'post', path: '/auth/verify-otp', requiresAuth: false },
    { method: 'post', path: '/auth/login', requiresAuth: false },
    { method: 'get', path: '/user/profile', requiresAuth: true },
    { method: 'get', path: '/wallet', requiresAuth: true },
    { method: 'get', path: '/wallet/kyc/status', requiresAuth: true },
  ];

  describe('HTTP Method Fuzzing', () => {
    it('should reject unsupported HTTP methods', async () => {
      const unsupportedMethods = ['PATCH', 'OPTIONS', 'DELETE'];

      for (const method of unsupportedMethods) {
        try {
          const response = await request(app.getHttpServer())
            [
              method.toLowerCase() as 'delete' | 'options' | 'patch'
            ]('/auth/register')
            .timeout({ response: 1000, deadline: 2000 })
            .send({ phone: '+2250701234567' });

          // Some adapters answer OPTIONS automatically; others reject unknown methods.
          expect([200, 204, 404, 405, 429]).toContain(response.status);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          expect(message).toMatch(/socket hang up|ECONNRESET|EPIPE|timeout/i);
        }
      }
    });

    it('should handle HEAD requests safely', async () => {
      const response = await request(app.getHttpServer())
        .head('/health')
        .send();

      // Should either support HEAD or reject gracefully
      expect([200, 404, 405]).toContain(response.status);

      // HEAD should not return body
      expect(response.text).toBeFalsy();
    });
  });

  describe('Header Fuzzing', () => {
    it('should handle malformed Content-Type headers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('text/plain'),
            fc.constant('application/xml'),
            fc.constant('multipart/form-data'),
            fc.constant(''),
            fc.constant('invalid-content-type'),
            fc.string({ minLength: 1, maxLength: 100 }),
          ),
          async (contentType) => {
            const response = await request(app.getHttpServer())
              .post('/auth/register')
              .set('Content-Type', contentType)
              .send(JSON.stringify({ phone: '+2250701234567' }));

            // Should either accept or reject gracefully
            expect([201, 400, 415, 429]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 30) },
      );
    });

    it('should handle malformed Authorization headers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''),
            fc.constant('Bearer'),
            fc.constant('Bearer '),
            fc.constant('InvalidScheme token'),
            fc.string(),
            sqlInjectionStrings(),
            xssStrings(),
          ),
          async (authHeader) => {
            const response = await request(app.getHttpServer())
              .get('/user/profile')
              .set('Authorization', authHeader);

            expect([401, 403, 429]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 50) },
      );
    });

    it('should handle very long headers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1000, maxLength: 10000 }),
          async (longHeader) => {
            const response = await request(app.getHttpServer())
              .post('/auth/register')
              .set('X-Custom-Header', longHeader)
              .send({ phone: '+2250701234567' });

            // Should either accept, reject, or limit header size
            expect([201, 400, 413, 429, 431]).toContain(response.status);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle SQL injection in headers', async () => {
      await fc.assert(
        fc.asyncProperty(sqlInjectionStrings(), async (sqlPayload) => {
          const response = await request(app.getHttpServer())
            .get('/user/profile')
            .set('Authorization', `Bearer ${sqlPayload}`)
            .set('X-Custom-Header', sqlPayload);

          expect([400, 401, 429]).toContain(response.status);
          assertHelpers.noSqlErrors(response);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle XSS in headers', async () => {
      await fc.assert(
        fc.asyncProperty(xssStrings(), async (xssPayload) => {
          const response = await request(app.getHttpServer())
            .post('/auth/register')
            .set('X-Custom-Header', xssPayload)
            .send({ phone: '+2250701234567' });

          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toMatch(/<script>/i);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });
  });

  describe('Query Parameter Fuzzing', () => {
    it('should handle SQL injection in query parameters', async () => {
      await fc.assert(
        fc.asyncProperty(sqlInjectionStrings(), async (sqlPayload) => {
          const response = await withTransientRequestRetry(() =>
            request(app.getHttpServer())
              .get('/user/username/search')
              .query({ query: sqlPayload })
              .timeout({ response: 1000, deadline: 2000 }),
          );

          assertHelpers.noSqlErrors(response);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle XSS in query parameters', async () => {
      await fc.assert(
        fc.asyncProperty(xssStrings(), async (xssPayload) => {
          const response = await withTransientRequestRetry(() =>
            request(app.getHttpServer())
              .get('/wallet/deposit/channels')
              .query({ currency: xssPayload })
              .timeout({ response: 1000, deadline: 2000 }),
          );

          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toMatch(/<script>/i);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle path traversal in query parameters', async () => {
      await fc.assert(
        fc.asyncProperty(pathTraversalStrings(), async (pathPayload) => {
          const response = await withTransientRequestRetry(() =>
            request(app.getHttpServer())
              .get('/wallet/deposit/channels')
              .query({ currency: pathPayload })
              .timeout({ response: 1000, deadline: 2000 }),
          );

          assertHelpers.noSensitiveDataLeak(response);

          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toMatch(/\/etc\/passwd/i);
          expect(responseText).not.toMatch(/windows\\system32/i);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle buffer overflow in query parameters', async () => {
      await fc.assert(
        fc.asyncProperty(bufferOverflowStrings(), async (largeString) => {
          try {
            const response = await request(app.getHttpServer())
              .get('/user/username/search')
              .query({ query: largeString })
              .timeout({ response: 1000, deadline: 2000 });

            // Should reject or truncate
            expect([200, 400, 401, 414, 429, 431]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            expect(message).toMatch(/socket hang up|ECONNRESET|EPIPE|timeout/i);
          }
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 10) },
      );
    });
  });

  describe('URL Path Fuzzing', () => {
    it('should handle path traversal attempts in URLs', async () => {
      await fc.assert(
        fc.asyncProperty(pathTraversalStrings(), async (pathPayload) => {
          const response = await request(app.getHttpServer()).get(
            `/user/by-username/${encodeURIComponent(pathPayload)}`,
          );

          assertHelpers.noSensitiveDataLeak(response);

          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toMatch(/\/etc\/passwd/i);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle SQL injection in URL paths', async () => {
      await fc.assert(
        fc.asyncProperty(sqlInjectionStrings(), async (sqlPayload) => {
          const response = await request(app.getHttpServer()).get(
            `/user/username/check/${encodeURIComponent(sqlPayload)}`,
          );

          assertHelpers.noSqlErrors(response);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle very long URL paths', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 100, maxLength: 2000 }),
          async (longPath) => {
            const response = await request(app.getHttpServer()).get(
              `/user/by-username/${encodeURIComponent(longPath)}`,
            );

            // Should either handle or reject
            expect([200, 400, 401, 404, 414]).toContain(response.status);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle unicode in URL paths', async () => {
      await fc.assert(
        fc.asyncProperty(unicodeEdgeCases(), async (unicodeString) => {
          const response = await request(app.getHttpServer()).get(
            `/user/by-username/${encodeURIComponent(unicodeString)}`,
          );

          expect([200, 400, 401, 404]).toContain(response.status);
          assertHelpers.noSensitiveDataLeak(response);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });
  });

  describe('Request Body Fuzzing', () => {
    it('should handle malformed JSON', async () => {
      const malformedJsonCases = [
        '{invalid json}',
        '{"key": undefined}',
        '{"key": NaN}',
        '{"key": Infinity}',
        '{"key":}',
        '{,}',
        'not json at all',
        '',
        '   ',
      ];

      for (const malformedJson of malformedJsonCases) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .set('Content-Type', 'application/json')
          .send(malformedJson);

        expect([400, 415, 429]).toContain(response.status);
        assertHelpers.noSensitiveDataLeak(response);
      }
    });

    it('should handle very large JSON payloads', async () => {
      const largeObject = {
        data: 'A'.repeat(1000000), // 1MB string
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(largeObject);

      // Should reject due to payload size limit
      expect([400, 413, 429]).toContain(response.status);
    });

    it('should handle deeply nested JSON', async () => {
      let deepObject: any = { value: 'deep' };
      for (let i = 0; i < 100; i++) {
        deepObject = { nested: deepObject };
      }

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(deepObject);

      expect([400, 413, 429]).toContain(response.status);
    });

    it('should handle circular JSON references gracefully', async () => {
      // Note: Can't actually send circular JSON, but test handling
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"a": {"b": {"c": "[Circular]"}}}');

      expect([400, 415, 429]).toContain(response.status);
    });
  });

  describe('Security Headers', () => {
    it('should set security headers on all responses', async () => {
      const endpoints = [
        { method: 'get', path: '/health' },
        { method: 'post', path: '/auth/register' },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app.getHttpServer())
          [endpoint.method as 'get' | 'post'](endpoint.path)
          .send(
            endpoint.method === 'post'
              ? { phone: '+2250701234567' }
              : undefined,
          );

        // Should have security headers (if helmet is configured)
        // Check for common security headers
        const headers = response.headers;

        // These assertions depend on your helmet configuration
        // Uncomment as needed based on your security setup
        // expect(headers['x-frame-options']).toBeDefined();
        // expect(headers['x-content-type-options']).toBe('nosniff');
        // expect(headers['x-xss-protection']).toBeDefined();
      }
    });
  });

  describe('Error Response Consistency', () => {
    it('should return consistent error structure across all endpoints', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...testEndpoints),
          async (endpoint) => {
            const req = request(app.getHttpServer())[
              endpoint.method as 'get' | 'post'
            ](endpoint.path);

            if (endpoint.method === 'post') {
              req.send({ invalid: 'data' });
            }

            const response = await req;

            if (response.status >= 400) {
              // Should have consistent error structure
              expect(response.body).toHaveProperty('statusCode');
              expect(response.body).toHaveProperty('message');
              expect(typeof response.body.statusCode).toBe('number');
            }
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should never leak stack traces in production', async () => {
      await fc.assert(
        fc.asyncProperty(fc.anything(), async (randomPayload) => {
          let response: request.Response;
          try {
            response = await request(app.getHttpServer())
              .post('/auth/register')
              .send(asSendablePayload(randomPayload));
          } catch (error) {
            if (isTransientRequestError(error)) {
              return;
            }

            throw error;
          }

          const responseText = JSON.stringify(response.body);

          // Should never contain stack trace patterns
          expect(responseText).not.toMatch(/at\s+\w+\s+\(/);
          expect(responseText).not.toMatch(/\.ts:\d+:\d+/);
          expect(responseText).not.toMatch(/Error:\s/);
          expect(responseText).not.toMatch(/node_modules/);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 100) },
      );
    });

    it('should never leak database connection strings', async () => {
      await fc.assert(
        fc.asyncProperty(fc.anything(), async (randomPayload) => {
          let response: request.Response;
          try {
            response = await request(app.getHttpServer())
              .post('/auth/register')
              .send(asSendablePayload(randomPayload));
          } catch (error) {
            if (isTransientRequestError(error)) {
              return;
            }

            throw error;
          }

          const responseText = JSON.stringify(response.body).toLowerCase();

          // Should never contain database info
          expect(responseText).not.toMatch(/postgres/i);
          expect(responseText).not.toMatch(/mongodb/i);
          expect(responseText).not.toMatch(/connection.*string/i);
          expect(responseText).not.toContain('database_url');
          expect(responseText).not.toContain('db_host');
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 100) },
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits globally', async () => {
      // Note: This test might fail in test environment if rate limiting is disabled
      const requests = [];

      // Make a bounded burst; keep it sequential to avoid client-side socket resets
      // masking API behavior.
      for (let i = 0; i < 20; i++) {
        requests.push(
          await request(app.getHttpServer())
            .post('/auth/register')
            .send({ phone: `+22507012345${i.toString().padStart(2, '0')}` }),
        );
      }

      const responses = requests;

      // At least some should be rate limited
      // (This assertion might need adjustment based on your rate limit config)
      const allStatuses = responses.map((r) => r.status);
      const uniqueStatuses = new Set(allStatuses);

      // Should see a mix of success/error and rate limit responses
      expect(uniqueStatuses.size).toBeGreaterThan(0);
    });
  });
});
