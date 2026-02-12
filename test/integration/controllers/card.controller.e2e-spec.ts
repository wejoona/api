/**
 * Card Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { TestData } from '../setup/mock-helpers';

const mockCardService = {
  getCards: jest.fn(),
  getCard: jest.fn(),
  createCard: jest.fn(),
  freezeCard: jest.fn(),
  unfreezeCard: jest.fn(),
  updateSpendingLimit: jest.fn(),
  deleteCard: jest.fn(),
};

import { CardController } from '@modules/cards/application/controllers/card.controller';
import { CardService } from '@modules/cards/application/services/card.service';

describe('CardController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [CardController],
      providers: [
        { provide: CardService, useValue: mockCardService },
      ],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/cards', () => {
    it('should list cards (200)', async () => {
      mockCardService.getCards.mockResolvedValue([TestData.card()]);
      await request(app.getHttpServer())
        .get('/api/v1/cards')
        .expect(200);
    });
  });

  describe('POST /api/v1/cards', () => {
    it('should create card (201)', async () => {
      mockCardService.createCard.mockResolvedValue(TestData.card());
      await request(app.getHttpServer())
        .post('/api/v1/cards')
        .send({ type: 'virtual', currency: 'USDC' })
        .expect(201);
    });
  });

  describe('GET /api/v1/cards/:id', () => {
    it('should get card details (200)', async () => {
      mockCardService.getCard.mockResolvedValue(TestData.card());
      await request(app.getHttpServer())
        .get('/api/v1/cards/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });

  describe('PUT /api/v1/cards/:id/freeze', () => {
    it('should freeze card (200)', async () => {
      mockCardService.freezeCard.mockResolvedValue(TestData.card({ status: 'frozen' }));
      await request(app.getHttpServer())
        .put('/api/v1/cards/550e8400-e29b-41d4-a716-446655440000/freeze')
        .expect(200);
    });
  });

  describe('PUT /api/v1/cards/:id/unfreeze', () => {
    it('should unfreeze card (200)', async () => {
      mockCardService.unfreezeCard.mockResolvedValue(TestData.card({ status: 'active' }));
      await request(app.getHttpServer())
        .put('/api/v1/cards/550e8400-e29b-41d4-a716-446655440000/unfreeze')
        .expect(200);
    });
  });

  describe('PUT /api/v1/cards/:id/limit', () => {
    it('should update spending limit (200)', async () => {
      mockCardService.updateSpendingLimit.mockResolvedValue(TestData.card({ spendingLimit: 10000 }));
      await request(app.getHttpServer())
        .put('/api/v1/cards/550e8400-e29b-41d4-a716-446655440000/limit')
        .send({ dailyLimit: 10000 })
        .expect(200);
    });
  });

  describe('DELETE /api/v1/cards/:id', () => {
    it('should delete card (200)', async () => {
      mockCardService.deleteCard.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .delete('/api/v1/cards/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });
});
