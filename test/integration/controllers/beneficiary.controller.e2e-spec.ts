/**
 * Beneficiary Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockBeneficiaryService = {
  getBeneficiaries: jest.fn(),
  getBeneficiary: jest.fn(),
  createBeneficiary: jest.fn(),
  updateBeneficiary: jest.fn(),
  toggleFavorite: jest.fn(),
  deleteBeneficiary: jest.fn(),
};

function beneficiary(overrides: Record<string, any> = {}) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    walletId: '660e8400-e29b-41d4-a716-446655440000',
    name: 'John Doe',
    phoneE164: '+2250701234568',
    accountType: 'internal',
    beneficiaryUserId: null,
    beneficiaryWalletAddress: null,
    bankCode: null,
    bankAccountNumber: null,
    mobileMoneyProvider: null,
    isFavorite: false,
    isVerified: true,
    transferCount: 0,
    totalTransferred: 0,
    lastTransferAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

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

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/beneficiaries', () => {
    it('should list beneficiaries (200)', async () => {
      mockBeneficiaryService.getBeneficiaries.mockResolvedValue([
        beneficiary(),
      ]);
      await request(app.getHttpServer())
        .get('/api/v1/beneficiaries')
        .expect(200);
    });
  });

  describe('GET /api/v1/beneficiaries/:id', () => {
    it('should get beneficiary (200)', async () => {
      mockBeneficiaryService.getBeneficiary.mockResolvedValue(beneficiary());
      await request(app.getHttpServer())
        .get('/api/v1/beneficiaries/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });

  describe('POST /api/v1/beneficiaries', () => {
    it('should create beneficiary (201)', async () => {
      mockBeneficiaryService.createBeneficiary.mockResolvedValue(beneficiary());
      await request(app.getHttpServer())
        .post('/api/v1/beneficiaries')
        .send({ name: 'John Doe', phoneE164: '+2250701234568' })
        .expect(201);
    });
  });

  describe('PUT /api/v1/beneficiaries/:id', () => {
    it('should update beneficiary (200)', async () => {
      mockBeneficiaryService.updateBeneficiary.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .put('/api/v1/beneficiaries/550e8400-e29b-41d4-a716-446655440000')
        .send({ name: 'Updated' })
        .expect(200);
    });
  });

  describe('POST /api/v1/beneficiaries/:id/favorite', () => {
    it('should toggle favorite (200)', async () => {
      mockBeneficiaryService.toggleFavorite.mockResolvedValue(
        beneficiary({ isFavorite: true }),
      );
      await request(app.getHttpServer())
        .post(
          '/api/v1/beneficiaries/550e8400-e29b-41d4-a716-446655440000/favorite',
        )
        .expect(200);
    });
  });

  describe('DELETE /api/v1/beneficiaries/:id', () => {
    it('should delete beneficiary (200)', async () => {
      mockBeneficiaryService.deleteBeneficiary.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .delete('/api/v1/beneficiaries/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });
});
