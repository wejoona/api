/**
 * Sub-Business Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockSubBusinessService = {
  createSubBusiness: jest.fn(),
  getSubBusinessesByBusinessId: jest.fn(),
  getSubBusinessById: jest.fn(),
  update: jest.fn(),
  deleteSubBusiness: jest.fn(),
};
const mockBusinessService = {
  getBusinessByUserId: jest.fn(),
};

import { SubBusinessController } from '@modules/sub-business/application/controllers/sub-business.controller';
import { SubBusinessService } from '@modules/sub-business/application/services/sub-business.service';
import { BusinessService } from '@modules/business/application/services/business.service';

describe('SubBusinessController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [SubBusinessController],
      providers: [
        { provide: SubBusinessService, useValue: mockSubBusinessService },
        { provide: BusinessService, useValue: mockBusinessService },
      ],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockBusinessService.getBusinessByUserId.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440010',
    });
  });

  describe('POST /api/v1/sub-businesses', () => {
    it('should create sub-business (201)', async () => {
      mockSubBusinessService.createSubBusiness.mockResolvedValue({
        id: 'sub_123',
        name: 'Branch 1',
      });
      await request(app.getHttpServer())
        .post('/api/v1/sub-businesses')
        .send({
          walletId: '660e8400-e29b-41d4-a716-446655440000',
          name: 'Branch 1',
          type: 'branch',
        })
        .expect(201);
    });
  });

  describe('GET /api/v1/sub-businesses', () => {
    it('should list sub-businesses (200)', async () => {
      mockSubBusinessService.getSubBusinessesByBusinessId.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get('/api/v1/sub-businesses')
        .expect(200);
    });
  });

  describe('GET /api/v1/sub-businesses/:id', () => {
    it('should get sub-business (200)', async () => {
      mockSubBusinessService.getSubBusinessById.mockResolvedValue({
        id: 'sub_123',
        name: 'Branch 1',
      });
      await request(app.getHttpServer())
        .get('/api/v1/sub-businesses/sub_123')
        .expect(200);
    });
  });

  describe('DELETE /api/v1/sub-businesses/:id', () => {
    it('should delete sub-business (200)', async () => {
      mockSubBusinessService.deleteSubBusiness.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .delete('/api/v1/sub-businesses/sub_123')
        .expect(200);
    });
  });
});
