/**
 * KYC Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockKycService = {
  getStatus: jest.fn(),
  submit: jest.fn(),
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

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/kyc/status', () => {
    it('should return KYC status (200)', async () => {
      mockKycService.getStatus.mockResolvedValue({ status: 'verified', tier: 2 });
      await request(app.getHttpServer()).get('/api/v1/kyc/status').expect(200);
    });
  });

  describe('POST /api/v1/kyc/submit', () => {
    it('should submit KYC (200)', async () => {
      mockKycService.submit.mockResolvedValue({ status: 'pending' });
      await request(app.getHttpServer())
        .post('/api/v1/kyc/submit')
        .send({ documentType: 'passport', documentNumber: 'AB123456' })
        .expect(200);
    });
  });
});
