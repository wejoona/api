/**
 * Card Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { CardEntity } from '@modules/cards/domain/entities/card.entity';
import { AppException } from '@/common/exceptions';
import { ERROR_CODES } from '@/common/constants/error-codes';

const mockCardService = {
  getCards: jest.fn(),
  getCard: jest.fn(),
  createCard: jest.fn(),
  freezeCard: jest.fn(),
  unfreezeCard: jest.fn(),
  updateSpendingLimit: jest.fn(),
  cancelCard: jest.fn(),
  getCardTransactions: jest.fn(),
  isIssuingEnabled: jest.fn(),
  getIssuingProvider: jest.fn(),
};

import { CardController } from '@modules/cards/application/controllers/card.controller';
import { CardService } from '@modules/cards/application/services/card.service';

describe('CardController (e2e)', () => {
  let app: INestApplication;
  const makeCard = (overrides: Partial<CardEntity> = {}) =>
    Object.assign(
      CardEntity.create({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        walletId: '660e8400-e29b-41d4-a716-446655440000',
        cardholderName: 'Test User',
        spendingLimit: 5000,
      }),
      overrides,
    );

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [CardController],
      providers: [{ provide: CardService, useValue: mockCardService }],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockCardService.isIssuingEnabled.mockReturnValue(true);
    mockCardService.getIssuingProvider.mockReturnValue('test-issuer');
  });

  describe('GET /api/v1/cards', () => {
    it('should list cards with mobile-safe capability metadata (200)', async () => {
      mockCardService.getCards.mockResolvedValue([]);
      mockCardService.isIssuingEnabled.mockReturnValue(false);
      mockCardService.getIssuingProvider.mockReturnValue(null);

      const response = await request(app.getHttpServer())
        .get('/api/v1/cards')
        .expect(200);

      expect(response.body).toEqual({
        cards: [],
        data: [],
        available: false,
        status: 'unavailable',
        reason: 'card_issuing_unavailable',
        provider: null,
      });
    });
  });

  describe('POST /api/v1/cards', () => {
    it('should create card (201)', async () => {
      mockCardService.createCard.mockResolvedValue(makeCard());
      await request(app.getHttpServer())
        .post('/api/v1/cards')
        .send({
          cardholderName: 'Test User',
          spendingLimit: 5000,
          cardType: 'virtual',
        })
        .expect(201);
    });

    it('should return a deterministic unavailable-provider envelope (400)', async () => {
      mockCardService.createCard.mockRejectedValue(
        AppException.badRequest(
          ERROR_CODES.CARD_PROVIDER_UNAVAILABLE,
          'Card issuing is not available yet',
        ),
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/cards')
        .send({
          cardholderName: 'Test User',
          spendingLimit: 5000,
          cardType: 'virtual',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: ERROR_CODES.CARD_PROVIDER_UNAVAILABLE,
          message: 'Card issuing is not available yet',
        },
        meta: {
          path: '/api/v1/cards',
          method: 'POST',
        },
      });
    });
  });

  describe('GET /api/v1/cards/:id', () => {
    it('should get card details (200)', async () => {
      mockCardService.getCard.mockResolvedValue(makeCard());
      await request(app.getHttpServer())
        .get('/api/v1/cards/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);
    });
  });

  describe('PUT /api/v1/cards/:id/freeze', () => {
    it('should freeze card (200)', async () => {
      const card = makeCard();
      card.freeze();
      mockCardService.freezeCard.mockResolvedValue(card);
      await request(app.getHttpServer())
        .put('/api/v1/cards/550e8400-e29b-41d4-a716-446655440000/freeze')
        .expect(200);
    });
  });

  describe('PUT /api/v1/cards/:id/unfreeze', () => {
    it('should unfreeze card (200)', async () => {
      mockCardService.unfreezeCard.mockResolvedValue(makeCard());
      await request(app.getHttpServer())
        .put('/api/v1/cards/550e8400-e29b-41d4-a716-446655440000/unfreeze')
        .expect(200);
    });
  });

  describe('PUT /api/v1/cards/:id/limit', () => {
    it('should update spending limit (200)', async () => {
      mockCardService.updateSpendingLimit.mockResolvedValue(
        makeCard({ spendingLimit: 10000 }),
      );
      await request(app.getHttpServer())
        .put('/api/v1/cards/550e8400-e29b-41d4-a716-446655440000/limit')
        .send({ spendingLimit: 10000 })
        .expect(200);
    });
  });

  describe('DELETE /api/v1/cards/:id', () => {
    it('should delete card (204)', async () => {
      mockCardService.cancelCard.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .delete('/api/v1/cards/550e8400-e29b-41d4-a716-446655440000')
        .expect(204);
    });
  });

  describe('GET /api/v1/cards/:id/transactions', () => {
    it('should return empty paginated card transaction history (200)', async () => {
      mockCardService.getCardTransactions.mockResolvedValue({
        data: [],
        transactions: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/cards/550e8400-e29b-41d4-a716-446655440000/transactions')
        .expect(200);

      expect(response.body).toEqual({
        data: [],
        transactions: [],
        total: 0,
        limit: 20,
        offset: 0,
      });
      expect(mockCardService.getCardTransactions).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        expect.any(String),
        20,
        0,
      );
    });
  });
});
