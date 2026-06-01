/**
 * Business Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockBusinessService = {
  getBusinessByUserId: jest.fn(),
  createBusiness: jest.fn(),
  updateBusiness: jest.fn(),
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

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/business/profile', () => {
    it('should register business (201)', async () => {
      mockBusinessService.getBusinessByUserId.mockResolvedValue(null);
      mockBusinessService.createBusiness.mockResolvedValue({
        id: 'biz_123',
        name: 'Test Biz',
      });
      await request(app.getHttpServer())
        .post('/api/v1/business/profile')
        .send({ name: 'Test Biz', registrationNumber: 'CI-123456' })
        .expect(201);
    });
  });

  describe('GET /api/v1/business/profile', () => {
    it('should get business profile (200)', async () => {
      mockBusinessService.getBusinessByUserId.mockResolvedValue({
        id: 'biz_123',
        name: 'Test Biz',
      });
      await request(app.getHttpServer())
        .get('/api/v1/business/profile')
        .expect(200);
    });
  });
});
