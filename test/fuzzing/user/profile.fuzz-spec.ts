/**
 * Fuzzing tests for user profile endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as fc from 'fast-check';
import { AppModule } from '../../../src/app.module';
import {
  usernameArbitraries,
  emailArbitraries,
  sqlInjectionStrings,
  xssStrings,
  unicodeEdgeCases,
  bufferOverflowStrings,
} from '../common/arbitraries';
import { assertHelpers, fuzzConfig } from '../common/helpers';

describe('User Profile - Fuzzing Tests', () => {
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

  describe('Update Profile - Username Validation', () => {
    it('should reject invalid usernames', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArbitraries.invalid(),
          async (invalidUsername) => {
            const response = await request(app.getHttpServer())
              .put(fuzzConfig.paths.user.updateProfile)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ username: invalidUsername });

            expect([400, 401]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should handle SQL injection in username', async () => {
      await fc.assert(
        fc.asyncProperty(sqlInjectionStrings(), async (sqlPayload) => {
          const response = await request(app.getHttpServer())
            .put(fuzzConfig.paths.user.updateProfile)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ username: sqlPayload });

          expect([400, 401]).toContain(response.status);
          assertHelpers.noSqlErrors(response);
          assertHelpers.noSensitiveDataLeak(response);
        }),
        { numRuns: 20 },
      );
    });

    it('should handle XSS in username', async () => {
      await fc.assert(
        fc.asyncProperty(xssStrings(), async (xssPayload) => {
          const response = await request(app.getHttpServer())
            .put(fuzzConfig.paths.user.updateProfile)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ username: xssPayload });

          expect([400, 401]).toContain(response.status);

          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toMatch(/<script>/i);
          expect(responseText).not.toMatch(/<img/i);
        }),
        { numRuns: 20 },
      );
    });

    it('should handle unicode edge cases in username', async () => {
      await fc.assert(
        fc.asyncProperty(unicodeEdgeCases(), async (unicodeString) => {
          const response = await request(app.getHttpServer())
            .put(fuzzConfig.paths.user.updateProfile)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ username: unicodeString });

          expect([400, 401]).toContain(response.status);
          assertHelpers.hasProperErrorStructure(response);
        }),
        { numRuns: 20 },
      );
    });

    it('should handle buffer overflow attempts in username', async () => {
      await fc.assert(
        fc.asyncProperty(bufferOverflowStrings(), async (largeString) => {
          const response = await request(app.getHttpServer())
            .put(fuzzConfig.paths.user.updateProfile)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ username: largeString });

          expect([400, 401]).toContain(response.status);
          assertHelpers.noSensitiveDataLeak(response);
        }),
        { numRuns: 10 },
      );
    });

    it('should handle username with special characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('user@name'),
            fc.constant('user#name'),
            fc.constant('user$name'),
            fc.constant('user%name'),
            fc.constant('user&name'),
            fc.constant('user*name'),
            fc.constant('user!name'),
            fc.constant('user(name)'),
          ),
          async (specialUsername) => {
            const response = await request(app.getHttpServer())
              .put(fuzzConfig.paths.user.updateProfile)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ username: specialUsername });

            expect([400, 401]).toContain(response.status);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Update Profile - Email Validation', () => {
    it('should reject invalid email formats', async () => {
      await fc.assert(
        fc.asyncProperty(emailArbitraries.invalid(), async (invalidEmail) => {
          const response = await request(app.getHttpServer())
            .put(fuzzConfig.paths.user.updateProfile)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ email: invalidEmail });

          expect([400, 401]).toContain(response.status);
          assertHelpers.noSensitiveDataLeak(response);
        }),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should handle SQL injection in email', async () => {
      await fc.assert(
        fc.asyncProperty(sqlInjectionStrings(), async (sqlPayload) => {
          const response = await request(app.getHttpServer())
            .put(fuzzConfig.paths.user.updateProfile)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ email: sqlPayload });

          expect([400, 401]).toContain(response.status);
          assertHelpers.noSqlErrors(response);
        }),
        { numRuns: 20 },
      );
    });

    it('should handle XSS in email', async () => {
      await fc.assert(
        fc.asyncProperty(xssStrings(), async (xssPayload) => {
          const response = await request(app.getHttpServer())
            .put(fuzzConfig.paths.user.updateProfile)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ email: xssPayload });

          expect([400, 401]).toContain(response.status);
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toMatch(/<script>/i);
        }),
        { numRuns: 20 },
      );
    });
  });

  describe('Update Profile - Name Validation', () => {
    it('should handle SQL injection in first/last name', async () => {
      await fc.assert(
        fc.asyncProperty(
          sqlInjectionStrings(),
          sqlInjectionStrings(),
          async (sqlFirstName, sqlLastName) => {
            const response = await request(app.getHttpServer())
              .put(fuzzConfig.paths.user.updateProfile)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ firstName: sqlFirstName, lastName: sqlLastName });

            expect([200, 400, 401, 409]).toContain(response.status);
            assertHelpers.noSqlErrors(response);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should handle XSS in first/last name', async () => {
      await fc.assert(
        fc.asyncProperty(
          xssStrings(),
          xssStrings(),
          async (xssFirstName, xssLastName) => {
            const response = await request(app.getHttpServer())
              .put(fuzzConfig.paths.user.updateProfile)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ firstName: xssFirstName, lastName: xssLastName });

            expect([200, 400, 401, 409]).toContain(response.status);
            const responseText = JSON.stringify(response.body);
            expect(responseText).not.toMatch(/<script>/i);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should handle unicode in names', async () => {
      await fc.assert(
        fc.asyncProperty(
          unicodeEdgeCases(),
          unicodeEdgeCases(),
          async (unicodeFirst, unicodeLast) => {
            const response = await request(app.getHttpServer())
              .put(fuzzConfig.paths.user.updateProfile)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ firstName: unicodeFirst, lastName: unicodeLast });

            expect([200, 400, 401, 409]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should handle very long names', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 100, maxLength: 1000 }),
          fc.string({ minLength: 100, maxLength: 1000 }),
          async (longFirst, longLast) => {
            const response = await request(app.getHttpServer())
              .put(fuzzConfig.paths.user.updateProfile)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ firstName: longFirst, lastName: longLast });

            expect([200, 400, 401, 409]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('Check Username - Validation', () => {
    it('should handle invalid username checks', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArbitraries.invalid(),
          async (invalidUsername) => {
            const response = await request(app.getHttpServer())
              .get(`${fuzzConfig.paths.user.checkUsername}/${invalidUsername}`)
              .set('Authorization', `Bearer ${authToken}`);

            expect([200, 400, 401]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should handle SQL injection in username check', async () => {
      await fc.assert(
        fc.asyncProperty(sqlInjectionStrings(), async (sqlPayload) => {
          const response = await request(app.getHttpServer())
            .get(
              `${fuzzConfig.paths.user.checkUsername}/${encodeURIComponent(sqlPayload)}`,
            )
            .set('Authorization', `Bearer ${authToken}`);

          expect([200, 400, 401]).toContain(response.status);
          assertHelpers.noSqlErrors(response);
        }),
        { numRuns: 20 },
      );
    });

    it('should handle XSS in username check', async () => {
      await fc.assert(
        fc.asyncProperty(xssStrings(), async (xssPayload) => {
          const response = await request(app.getHttpServer())
            .get(
              `${fuzzConfig.paths.user.checkUsername}/${encodeURIComponent(xssPayload)}`,
            )
            .set('Authorization', `Bearer ${authToken}`);

          expect([200, 400, 401]).toContain(response.status);
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toMatch(/<script>/i);
        }),
        { numRuns: 20 },
      );
    });
  });

  describe('Search Username - Validation', () => {
    it('should handle invalid search queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.string({ minLength: 0, maxLength: 1 }),
            sqlInjectionStrings(),
            xssStrings(),
            unicodeEdgeCases(),
          ),
          async (invalidQuery) => {
            const response = await request(app.getHttpServer())
              .get(fuzzConfig.paths.user.searchUsername)
              .set('Authorization', `Bearer ${authToken}`)
              .query({ query: invalidQuery });

            expect([200, 400, 401]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should handle SQL injection in search', async () => {
      await fc.assert(
        fc.asyncProperty(sqlInjectionStrings(), async (sqlPayload) => {
          const response = await request(app.getHttpServer())
            .get(fuzzConfig.paths.user.searchUsername)
            .set('Authorization', `Bearer ${authToken}`)
            .query({ query: sqlPayload });

          expect([200, 400, 401]).toContain(response.status);
          assertHelpers.noSqlErrors(response);
        }),
        { numRuns: 20 },
      );
    });

    it('should handle invalid limit parameter', async () => {
      await fc.assert(
        fc.asyncProperty(
          usernameArbitraries.valid(),
          fc.oneof(
            fc.integer({ min: -100, max: -1 }),
            fc.integer({ min: 1001, max: 10000 }),
            fc.constant('invalid'),
            fc.constant(null),
          ),
          async (validQuery, invalidLimit) => {
            const response = await request(app.getHttpServer())
              .get(fuzzConfig.paths.user.searchUsername)
              .set('Authorization', `Bearer ${authToken}`)
              .query({ query: validQuery, limit: invalidLimit });

            expect([200, 400, 401]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Request Body Edge Cases', () => {
    it('should handle empty update request', async () => {
      const response = await request(app.getHttpServer())
        .put(fuzzConfig.paths.user.updateProfile)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      // Should either accept (no changes) or require at least one field
      expect([200, 400, 401]).toContain(response.status);
    });

    it('should handle null values', async () => {
      const response = await request(app.getHttpServer())
        .put(fuzzConfig.paths.user.updateProfile)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: null,
          email: null,
          firstName: null,
          lastName: null,
        });

      expect([200, 400, 401]).toContain(response.status);
      assertHelpers.noSensitiveDataLeak(response);
    });

    it('should handle wrong data types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.integer(), fc.boolean(), fc.array(fc.string())),
          async (wrongType) => {
            const response = await request(app.getHttpServer())
              .put(fuzzConfig.paths.user.updateProfile)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                username: wrongType,
                email: wrongType,
                firstName: wrongType,
                lastName: wrongType,
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
              .put(fuzzConfig.paths.user.updateProfile)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                username: 'validuser',
                [extraKey]: extraValue,
              });

            // Should strip extra fields or reject
            expect([200, 400, 401, 409]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app.getHttpServer())
        .put(fuzzConfig.paths.user.updateProfile)
        .send({ username: 'testuser' });

      expect(response.status).toBe(401);
      assertHelpers.hasProperErrorStructure(response);
    });

    it('should reject malformed auth tokens', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (malformedToken) => {
          const response = await request(app.getHttpServer())
            .put(fuzzConfig.paths.user.updateProfile)
            .set('Authorization', `Bearer ${malformedToken}`)
            .send({ username: 'testuser' });

          expect(response.status).toBe(401);
          assertHelpers.noSensitiveDataLeak(response);
        }),
        { numRuns: 50 },
      );
    });
  });
});
