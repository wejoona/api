/**
 * Sub-Business Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockSubBusinessService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

import { SubBusinessController } from '@modules/sub-business/application/controllers/sub-business.controller';
import { SubBusinessService } from '@modules/sub-business/application/services/sub-business.service';

describe('SubBusinessController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [SubBusinessController],
      providers: [{ provide: SubBusinessService, useValue: mockSubBusinessService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('POST /api/v1/sub-businesses', () => {
    it('should create sub-business (201)', async () => {
      mockSubBusinessService.create.mockResolvedValue({ id: 'sub_123', name: 'Branch 1' });
      await request(app.getHttpServer())
        .post('/api/v1/sub-businesses')
        .send({ name: 'Branch 1', type: 'branch' })
        .expect(201);
    });
  });

  describe('GET /api/v1/sub-businesses', () => {
    it('should list sub-businesses (200)', async () => {
      mockSubBusinessService.findAll.mockResolvedValue([]);
      await request(app.getHttpServer()).get('/api/v1/sub-businesses').expect(200);
    });
  });

  describe('GET /api/v1/sub-businesses/:id', () => {
    it('should get sub-business (200)', async () => {
      mockSubBusinessService.findById.mockResolvedValue({ id: 'sub_123', name: 'Branch 1' });
      await request(app.getHttpServer()).get('/api/v1/sub-businesses/sub_123').expect(200);
    });
  });

  describe('DELETE /api/v1/sub-businesses/:id', () => {
    it('should delete sub-business (200)', async () => {
      mockSubBusinessService.delete.mockResolvedValue(undefined);
      await request(app.getHttpServer()).delete('/api/v1/sub-businesses/sub_123').expect(200);
    });
  });
});
