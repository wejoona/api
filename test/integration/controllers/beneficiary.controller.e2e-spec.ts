/**
 * Beneficiary Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockBeneficiaryService = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  toggleFavorite: jest.fn(),
  delete: jest.fn(),
};

import { BeneficiaryController } from '@modules/beneficiary/application/controllers/beneficiary.controller';
import { BeneficiaryService } from '@modules/beneficiary/application/services/beneficiary.service';

describe('BeneficiaryController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [BeneficiaryController],
      providers: [
        { provide: BeneficiaryService, useValue: mockBeneficiaryService },
      ],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/beneficiaries', () => {
    it('should list beneficiaries (200)', async () => {
      mockBeneficiaryService.findAll.mockResolvedValue([TestData.beneficiary()]);
      await request(app.getHttpServer())
        .get('/api/v1/beneficiaries')
        .expect(200);
    });
  });

  describe('GET /api/v1/beneficiaries/:id', () => {
    it('should get beneficiary (200)', async () => {
      mockBeneficiaryService.findById.mockResolvedValue(TestData.beneficiary());
      await request(app.getHttpServer())
        .get('/api/v1/beneficiaries/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });

  describe('POST /api/v1/beneficiaries', () => {
    it('should create beneficiary (201)', async () => {
      mockBeneficiaryService.create.mockResolvedValue(TestData.beneficiary());
      await request(app.getHttpServer())
        .post('/api/v1/beneficiaries')
        .send({ name: 'John Doe', phone: '+2250701234568' })
        .expect(201);
    });
  });

  describe('PUT /api/v1/beneficiaries/:id', () => {
    it('should update beneficiary (200)', async () => {
      mockBeneficiaryService.update.mockResolvedValue(TestData.beneficiary({ name: 'Updated' }));
      await request(app.getHttpServer())
        .put('/api/v1/beneficiaries/550e8400-e29b-41d4-a716-446655440000')
        .send({ name: 'Updated' })
        .expect(200);
    });
  });

  describe('POST /api/v1/beneficiaries/:id/favorite', () => {
    it('should toggle favorite (200)', async () => {
      mockBeneficiaryService.toggleFavorite.mockResolvedValue(TestData.beneficiary({ isFavorite: true }));
      await request(app.getHttpServer())
        .post('/api/v1/beneficiaries/550e8400-e29b-41d4-a716-446655440000/favorite')
        .expect(200);
    });
  });

  describe('DELETE /api/v1/beneficiaries/:id', () => {
    it('should delete beneficiary (200)', async () => {
      mockBeneficiaryService.delete.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .delete('/api/v1/beneficiaries/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });
});
