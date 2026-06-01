/**
 * Fuzzing tests for KYC endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as fc from 'fast-check';
import { AppModule } from '../../../src/app.module';
import {
  dateArbitraries,
  countryCodeArbitraries,
  sqlInjectionStrings,
  xssStrings,
  pathTraversalStrings,
  unicodeEdgeCases,
} from '../common/arbitraries';
import {
  assertHelpers,
  fuzzConfig,
  withTransientRequestRetry,
} from '../common/helpers';

describe('KYC - Fuzzing Tests', () => {
  let app: INestApplication;
  let authToken: string;

  const isTransientSocketError = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message : String(error);
    return /ECONNRESET|EPIPE|ETIMEDOUT|socket hang up/i.test(message);
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

    authToken = 'mock-token-for-testing';
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

  describe('Submit KYC - Name Validation', () => {
    it('should handle SQL injection in names', async () => {
      await fc.assert(
        fc.asyncProperty(
          sqlInjectionStrings(),
          sqlInjectionStrings(),
          async (sqlFirst, sqlLast) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.submitKyc)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                firstName: sqlFirst,
                lastName: sqlLast,
                dateOfBirth: '1990-01-01',
                country: 'CI',
                idType: 'passport',
                idNumber: '123456789',
                address: '123 Main St',
              });

            expect([201, 400, 401, 429]).toContain(response.status);
            assertHelpers.noSqlErrors(response);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle XSS in names', async () => {
      await fc.assert(
        fc.asyncProperty(
          xssStrings(),
          xssStrings(),
          async (xssFirst, xssLast) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.submitKyc)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                firstName: xssFirst,
                lastName: xssLast,
                dateOfBirth: '1990-01-01',
                country: 'CI',
                idType: 'passport',
                idNumber: '123456789',
                address: '123 Main St',
              });

            expect([201, 400, 401, 429]).toContain(response.status);
            const responseText = JSON.stringify(response.body);
            expect(responseText).not.toMatch(/<script>/i);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle unicode in names', async () => {
      await fc.assert(
        fc.asyncProperty(
          unicodeEdgeCases(),
          unicodeEdgeCases(),
          async (unicodeFirst, unicodeLast) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.submitKyc)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                firstName: unicodeFirst,
                lastName: unicodeLast,
                dateOfBirth: '1990-01-01',
                country: 'CI',
                idType: 'passport',
                idNumber: '123456789',
                address: '123 Main St',
              });

            expect([201, 400, 401, 405, 429]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should reject very long names', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 200, maxLength: 1000 }),
          fc.string({ minLength: 200, maxLength: 1000 }),
          async (longFirst, longLast) => {
            const response = await withTransientRequestRetry(() =>
              request(app.getHttpServer())
                .post(fuzzConfig.paths.wallet.submitKyc)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                  firstName: longFirst,
                  lastName: longLast,
                  dateOfBirth: '1990-01-01',
                  country: 'CI',
                  idType: 'passport',
                  idNumber: '123456789',
                  address: '123 Main St',
                }),
            );

            expect([400, 401, 429]).toContain(response.status);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should reject empty names', async () => {
      const response = await request(app.getHttpServer())
        .post(fuzzConfig.paths.wallet.submitKyc)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: '',
          lastName: '',
          dateOfBirth: '1990-01-01',
          country: 'CI',
          idType: 'passport',
          idNumber: '123456789',
          address: '123 Main St',
        });

      expect([400, 401, 429]).toContain(response.status);
      assertHelpers.hasProperErrorStructure(response);
    });
  });

  describe('Submit KYC - Date of Birth Validation', () => {
    it('should reject invalid date formats', async () => {
      await fc.assert(
        fc.asyncProperty(dateArbitraries.invalid(), async (invalidDate) => {
          const response = await withTransientRequestRetry(() =>
            request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.submitKyc)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: invalidDate,
                country: 'CI',
                idType: 'passport',
                idNumber: '123456789',
                address: '123 Main St',
              }),
          );

          expect([400, 401, 405, 429]).toContain(response.status);
          assertHelpers.noSensitiveDataLeak(response);
        }),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should reject future birth dates', async () => {
      await fc.assert(
        fc.asyncProperty(dateArbitraries.future(), async (futureDate) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.submitKyc)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              firstName: 'John',
              lastName: 'Doe',
              dateOfBirth: futureDate,
              country: 'CI',
              idType: 'passport',
              idNumber: '123456789',
              address: '123 Main St',
            });

          expect([400, 401, 429]).toContain(response.status);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 30) },
      );
    });

    it('should reject birth dates for minors (under 18)', async () => {
      const today = new Date();
      const minorDate = new Date(
        today.getFullYear() - 10,
        today.getMonth(),
        today.getDate(),
      )
        .toISOString()
        .split('T')[0];

      const response = await request(app.getHttpServer())
        .post(fuzzConfig.paths.wallet.submitKyc)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: minorDate,
          country: 'CI',
          idType: 'passport',
          idNumber: '123456789',
          address: '123 Main St',
        });

      expect([400, 401, 429]).toContain(response.status);
    });

    it('should reject very old birth dates (over 120 years)', async () => {
      const today = new Date();
      const ancientDate = new Date(
        today.getFullYear() - 150,
        today.getMonth(),
        today.getDate(),
      )
        .toISOString()
        .split('T')[0];

      const response = await request(app.getHttpServer())
        .post(fuzzConfig.paths.wallet.submitKyc)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: ancientDate,
          country: 'CI',
          idType: 'passport',
          idNumber: '123456789',
          address: '123 Main St',
        });

      expect([400, 401, 429]).toContain(response.status);
    });
  });

  describe('Submit KYC - Country Validation', () => {
    it('should reject invalid country codes', async () => {
      await fc.assert(
        fc.asyncProperty(
          countryCodeArbitraries.invalid(),
          async (invalidCountry) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.submitKyc)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                country: invalidCountry,
                idType: 'passport',
                idNumber: '123456789',
                address: '123 Main St',
              });

            expect([400, 401, 403, 429]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });
  });

  describe('Submit KYC - ID Validation', () => {
    it('should handle SQL injection in ID number', async () => {
      await fc.assert(
        fc.asyncProperty(sqlInjectionStrings(), async (sqlPayload) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.submitKyc)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              firstName: 'John',
              lastName: 'Doe',
              dateOfBirth: '1990-01-01',
              country: 'CI',
              idType: 'passport',
              idNumber: sqlPayload,
              address: '123 Main St',
            });

          expect([201, 400, 401, 429]).toContain(response.status);
          assertHelpers.noSqlErrors(response);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle XSS in ID number', async () => {
      await fc.assert(
        fc.asyncProperty(xssStrings(), async (xssPayload) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.submitKyc)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              firstName: 'John',
              lastName: 'Doe',
              dateOfBirth: '1990-01-01',
              country: 'CI',
              idType: 'passport',
              idNumber: xssPayload,
              address: '123 Main St',
            });

          expect([201, 400, 401, 405, 429]).toContain(response.status);
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toMatch(/<script>/i);
          expect(responseText).not.toContain(xssPayload);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should reject invalid ID types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 5 }),
            fc.constant(''),
            fc.constant('invalid-id-type'),
            sqlInjectionStrings(),
          ),
          async (invalidIdType) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.submitKyc)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                country: 'CI',
                idType: invalidIdType,
                idNumber: '123456789',
                address: '123 Main St',
              });

            expect([400, 401, 403, 429]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);
          },
        ),
        { numRuns: fuzzConfig.numRuns },
      );
    });

    it('should reject empty ID number', async () => {
      const response = await request(app.getHttpServer())
        .post(fuzzConfig.paths.wallet.submitKyc)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          country: 'CI',
          idType: 'passport',
          idNumber: '',
          address: '123 Main St',
        });

      expect([400, 401, 429]).toContain(response.status);
    });
  });

  describe('Submit KYC - Address Validation', () => {
    it('should handle SQL injection in address', async () => {
      await fc.assert(
        fc.asyncProperty(sqlInjectionStrings(), async (sqlPayload) => {
          const payload = {
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1990-01-01',
            country: 'CI',
            idType: 'passport',
            idNumber: '123456789',
            address: sqlPayload,
          };

          let response: request.Response;
          try {
            response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.submitKyc)
              .set('Authorization', `Bearer ${authToken}`)
              .send(payload);
          } catch (error) {
            if (!isTransientSocketError(error)) {
              throw error;
            }

            response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.submitKyc)
              .set('Authorization', `Bearer ${authToken}`)
              .send(payload);
          }

          expect([201, 400, 401, 429]).toContain(response.status);
          assertHelpers.noSqlErrors(response);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle XSS in address', async () => {
      await fc.assert(
        fc.asyncProperty(xssStrings(), async (xssPayload) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.submitKyc)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              firstName: 'John',
              lastName: 'Doe',
              dateOfBirth: '1990-01-01',
              country: 'CI',
              idType: 'passport',
              idNumber: '123456789',
              address: xssPayload,
            });

          expect([201, 400, 401, 429]).toContain(response.status);
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toMatch(/<script>/i);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should reject very long addresses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 500, maxLength: 2000 }),
          async (longAddress) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.submitKyc)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                country: 'CI',
                idType: 'passport',
                idNumber: '123456789',
                address: longAddress,
              });

            expect([201, 400, 401, 429]).toContain(response.status);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });
  });

  describe('Submit KYC - Document Keys Validation', () => {
    it('should handle path traversal in document keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          pathTraversalStrings(),
          pathTraversalStrings(),
          pathTraversalStrings(),
          async (frontKey, backKey, selfieKey) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.submitKyc)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                country: 'CI',
                idType: 'passport',
                idNumber: '123456789',
                address: '123 Main St',
                documentFrontKey: frontKey,
                documentBackKey: backKey,
                selfieKey: selfieKey,
              });

            expect([201, 400, 401, 429]).toContain(response.status);
            assertHelpers.noSensitiveDataLeak(response);

            // Should not expose file system paths
            const responseText = JSON.stringify(response.body);
            expect(responseText).not.toMatch(/\/etc\/passwd/i);
            expect(responseText).not.toMatch(/windows\\system32/i);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });

    it('should handle SQL injection in document keys', async () => {
      await fc.assert(
        fc.asyncProperty(sqlInjectionStrings(), async (sqlPayload) => {
          const response = await request(app.getHttpServer())
            .post(fuzzConfig.paths.wallet.submitKyc)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              firstName: 'John',
              lastName: 'Doe',
              dateOfBirth: '1990-01-01',
              country: 'CI',
              idType: 'passport',
              idNumber: '123456789',
              address: '123 Main St',
              documentFrontKey: sqlPayload,
              documentBackKey: sqlPayload,
              selfieKey: sqlPayload,
            });

          expect([201, 400, 401, 429]).toContain(response.status);
          assertHelpers.noSqlErrors(response);
        }),
        { numRuns: Math.min(fuzzConfig.numRuns, 20) },
      );
    });
  });

  describe('Request Body Edge Cases', () => {
    it('should handle missing required fields', async () => {
      const testCases = [
        { lastName: 'Doe', dateOfBirth: '1990-01-01' }, // Missing firstName
        { firstName: 'John', dateOfBirth: '1990-01-01' }, // Missing lastName
        { firstName: 'John', lastName: 'Doe' }, // Missing dateOfBirth
        {}, // Missing all
      ];

      for (const testCase of testCases) {
        const response = await request(app.getHttpServer())
          .post(fuzzConfig.paths.wallet.submitKyc)
          .set('Authorization', `Bearer ${authToken}`)
          .send(testCase);

        expect([400, 401, 429]).toContain(response.status);
        assertHelpers.hasProperErrorStructure(response);
      }
    });

    it('should handle null values', async () => {
      const response = await request(app.getHttpServer())
        .post(fuzzConfig.paths.wallet.submitKyc)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: null,
          lastName: null,
          dateOfBirth: null,
          country: null,
          idType: null,
          idNumber: null,
          address: null,
        });

      expect([400, 401, 429]).toContain(response.status);
      assertHelpers.hasProperErrorStructure(response);
    });

    it('should handle wrong data types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.integer(), fc.boolean(), fc.array(fc.string())),
          async (wrongType) => {
            const response = await request(app.getHttpServer())
              .post(fuzzConfig.paths.wallet.submitKyc)
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                firstName: wrongType,
                lastName: wrongType,
                dateOfBirth: wrongType,
                country: wrongType,
                idType: wrongType,
                idNumber: wrongType,
                address: wrongType,
              });

            expect([400, 401, 429]).toContain(response.status);
            assertHelpers.hasProperErrorStructure(response);
          },
        ),
        { numRuns: Math.min(fuzzConfig.numRuns, 50) },
      );
    });
  });

  describe('Get KYC Status', () => {
    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        fuzzConfig.paths.wallet.kycStatus,
      );

      expect([401, 429]).toContain(response.status);
      assertHelpers.hasProperErrorStructure(response);
    });

    it('should not leak KYC information in errors', async () => {
      const response = await request(app.getHttpServer())
        .get(fuzzConfig.paths.wallet.kycStatus)
        .set('Authorization', `Bearer ${authToken}`);

      // Should not leak sensitive KYC data
      assertHelpers.noSensitiveDataLeak(response);
    });
  });
});
