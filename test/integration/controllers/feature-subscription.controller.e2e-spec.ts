/**
 * Feature Subscription Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TEST_USER } from '../setup/test-app';
import { FeatureSubscriptionController } from '@modules/feature-subscriptions/application/controllers';
import { FeatureSubscriptionService } from '@modules/feature-subscriptions/application/services';
import { FeatureSubscription } from '@modules/feature-subscriptions/domain/entities';

const mockFeatureSubscriptionService = {
  subscribe: jest.fn(),
  listMine: jest.fn(),
};

describe('FeatureSubscriptionController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [FeatureSubscriptionController],
      providers: [
        {
          provide: FeatureSubscriptionService,
          useValue: mockFeatureSubscriptionService,
        },
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

  describe('POST /api/v1/feature-subscriptions', () => {
    it('should subscribe with feature, source, and regional context (200)', async () => {
      const subscription = FeatureSubscription.create({
        id: '550e8400-e29b-41d4-a716-446655440010',
        userId: TEST_USER.id,
        featureKey: 'virtual_card',
        source: 'vcard_screen',
        phone: '+2250748805663',
        metadata: {
          countryCode: 'CI',
          locale: 'fr-CI',
          requestedFeature: 'virtual_card_launch',
        },
      });
      mockFeatureSubscriptionService.subscribe.mockResolvedValue(subscription);

      await request(app.getHttpServer())
        .post('/api/v1/feature-subscriptions')
        .send({
          featureKey: 'virtual_card',
          source: 'vcard_screen',
          phone: '+2250748805663',
          metadata: {
            countryCode: 'CI',
            locale: 'fr-CI',
            requestedFeature: 'virtual_card_launch',
          },
        })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            id: subscription.id,
            userId: TEST_USER.id,
            featureKey: 'virtual_card',
            source: 'vcard_screen',
            status: 'subscribed',
            isActive: true,
            phone: '+2250748805663',
            metadata: {
              countryCode: 'CI',
              locale: 'fr-CI',
              requestedFeature: 'virtual_card_launch',
            },
          });
          expect(body.createdAt).toBeDefined();
          expect(body.updatedAt).toBeDefined();
        });

      expect(mockFeatureSubscriptionService.subscribe).toHaveBeenCalledWith(
        TEST_USER.id,
        {
          featureKey: 'virtual_card',
          source: 'vcard_screen',
          phone: '+2250748805663',
          metadata: {
            countryCode: 'CI',
            locale: 'fr-CI',
            requestedFeature: 'virtual_card_launch',
          },
        },
      );
    });
  });

  describe('GET /api/v1/feature-subscriptions', () => {
    it('should list current user subscriptions with normalized pagination (200)', async () => {
      const subscription = FeatureSubscription.create({
        id: '550e8400-e29b-41d4-a716-446655440011',
        userId: TEST_USER.id,
        featureKey: 'bill_pay',
        source: 'services_screen',
      });
      mockFeatureSubscriptionService.listMine.mockResolvedValue({
        items: [subscription],
        total: 1,
      });

      await request(app.getHttpServer())
        .get('/api/v1/feature-subscriptions')
        .query({ page: 0, limit: 250 })
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            total: 1,
            page: 1,
            limit: 100,
            items: [
              {
                id: subscription.id,
                userId: TEST_USER.id,
                featureKey: 'bill_pay',
                source: 'services_screen',
              },
            ],
          });
        });

      expect(mockFeatureSubscriptionService.listMine).toHaveBeenCalledWith(
        TEST_USER.id,
        {
          page: 1,
          limit: 100,
        },
      );
    });
  });
});
