/**
 * Business Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockBusinessService = {
  register: jest.fn(),
  getProfile: jest.fn(),
  update: jest.fn(),
  getAnalytics: jest.fn(),
};

import { BusinessController } from '@modules/business/application/controllers/business.controller';
import { BusinessService } from '@modules/business/application/services/business.service';

describe('BusinessController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [BusinessController],
      providers: [{ provide: BusinessService, useValue: mockBusinessService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('POST /api/v1/business/register', () => {
    it('should register business (201)', async () => {
      mockBusinessService.register.mockResolvedValue({ id: 'biz_123', name: 'Test Biz' });
      await request(app.getHttpServer())
        .post('/api/v1/business/register')
        .send({ name: 'Test Biz', type: 'retail' })
        .expect(201);
    });
  });

  describe('GET /api/v1/business/me', () => {
    it('should get business profile (200)', async () => {
      mockBusinessService.getProfile.mockResolvedValue({ id: 'biz_123', name: 'Test Biz' });
      await request(app.getHttpServer()).get('/api/v1/business/me').expect(200);
    });
  });
});
