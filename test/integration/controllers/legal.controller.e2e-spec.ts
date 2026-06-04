/**
 * Legal Controller Integration Tests
 *
 * Covers active mobile legal document and consent routes.
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TEST_USER } from '../setup/test-app';

const mockLegalService = {
  getTermsOfService: jest.fn(),
  getPrivacyPolicy: jest.fn(),
  getCookiePolicy: jest.fn(),
  recordConsent: jest.fn(),
};

import { LegalController } from '@modules/legal/legal.controller';
import { LegalService } from '@modules/legal/legal.service';

describe('LegalController (e2e)', () => {
  let app: INestApplication;

  const legalDocument = {
    id: 'tos-2026-06',
    type: 'terms_of_service',
    version: '1.0.0',
    title: 'Terms of Service',
    content: 'Terms content',
    content_html: '<p>Terms content</p>',
    effective_date: '2026-06-04T00:00:00.000Z',
    last_updated: '2026-06-04T00:00:00.000Z',
    summary: 'Initial version',
    locale: 'en',
  };

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [LegalController],
      providers: [{ provide: LegalService, useValue: mockLegalService }],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/legal/terms', () => {
    it('should return localized terms for mobile (200)', async () => {
      mockLegalService.getTermsOfService.mockReturnValue(legalDocument);

      const res = await request(app.getHttpServer())
        .get('/api/v1/legal/terms?locale=fr')
        .expect(200);

      expect(res.body).toMatchObject({
        id: 'tos-2026-06',
        type: 'terms_of_service',
        version: '1.0.0',
      });
      expect(mockLegalService.getTermsOfService).toHaveBeenCalledWith('fr');
    });
  });

  describe('GET /api/v1/legal/privacy', () => {
    it('should return privacy policy for mobile (200)', async () => {
      mockLegalService.getPrivacyPolicy.mockReturnValue({
        ...legalDocument,
        id: 'privacy-2026-06',
        type: 'privacy_policy',
      });

      await request(app.getHttpServer())
        .get('/api/v1/legal/privacy?locale=en')
        .expect(200);

      expect(mockLegalService.getPrivacyPolicy).toHaveBeenCalledWith('en');
    });
  });

  describe('GET /api/v1/legal/cookies', () => {
    it('should return cookie policy for mobile (200)', async () => {
      mockLegalService.getCookiePolicy.mockReturnValue({
        ...legalDocument,
        id: 'cookie-2026-06',
        type: 'cookie_policy',
      });

      await request(app.getHttpServer())
        .get('/api/v1/legal/cookies?locale=en')
        .expect(200);

      expect(mockLegalService.getCookiePolicy).toHaveBeenCalledWith('en');
    });
  });

  describe('POST /api/v1/legal/consent', () => {
    it('should record mobile legal consent (201)', async () => {
      mockLegalService.recordConsent.mockResolvedValue(undefined);

      const body = {
        document_id: 'tos-2026-06',
        document_version: '1.0.0',
        document_type: 'terms_of_service',
        consented_at: '2026-06-04T00:00:00.000Z',
        device_id: 'device-123',
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/legal/consent')
        .send(body)
        .expect(201);

      expect(res.body).toEqual({ success: true });
      expect(mockLegalService.recordConsent).toHaveBeenCalledWith(
        expect.objectContaining(body),
        TEST_USER.id,
      );
    });

    it('should reject invalid consent payloads', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/legal/consent')
        .send({
          document_id: 'tos-2026-06',
          document_version: '1.0.0',
          document_type: 'unsupported',
          consented_at: 'not-a-date',
        })
        .expect(400);
    });
  });
});
