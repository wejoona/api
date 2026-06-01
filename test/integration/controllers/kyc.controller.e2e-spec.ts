/**
 * KYC Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockKycService = {
  getStatus: jest.fn(),
  submitDocuments: jest.fn(),
};

import { KycController } from '@modules/kyc/application/controllers/kyc.controller';
import { KycService } from '@modules/kyc/application/services/kyc.service';

describe('KycController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [KycController],
      providers: [{ provide: KycService, useValue: mockKycService }],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/kyc/status', () => {
    it('should return KYC status (200)', async () => {
      mockKycService.getStatus.mockResolvedValue({
        status: 'verified',
        tier: 2,
      });
      await request(app.getHttpServer()).get('/api/v1/kyc/status').expect(200);
    });
  });

  describe('POST /api/v1/kyc/submit', () => {
    it('should submit KYC (200)', async () => {
      mockKycService.submitDocuments.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440777',
        status: 'pending_verification',
      });
      await request(app.getHttpServer())
        .post('/api/v1/kyc/submit')
        .send({
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: '1990-01-01',
          country: 'CI',
          idType: 'passport',
          idNumber: 'AB123456',
          idFrontKey: 'kyc/front.jpg',
          idBackKey: 'kyc/back.jpg',
          selfieKey: 'kyc/selfie.jpg',
        })
        .expect(200);
    });
  });
});
