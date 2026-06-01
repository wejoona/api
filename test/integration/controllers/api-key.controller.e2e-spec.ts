/**
 * API Key Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockApiKeyService = {
  getApiKeysByUserId: jest.fn(),
  createApiKey: jest.fn(),
  revokeApiKey: jest.fn(),
  deleteApiKey: jest.fn(),
};

import { ApiKeyController } from '@modules/api-keys/application/controllers/api-key.controller';
import { ApiKeyService } from '@modules/api-keys/application/services/api-key.service';
import { ApiKey } from '@modules/api-keys/domain/entities/api-key.entity';

const API_KEY_ID = '550e8400-e29b-41d4-a716-446655440123';

function createApiKey() {
  return ApiKey.fromPersistence({
    id: API_KEY_ID,
    name: 'Test Key',
    keyHash: 'hash',
    keyPrefix: 'ak_live',
    permissions: ['read'],
    rateLimit: 60,
    userId: '550e8400-e29b-41d4-a716-446655440000',
    isActive: true,
    expiresAt: null,
    lastUsedAt: null,
    usageCount: 0,
    ipWhitelist: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('ApiKeyController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ApiKeyController],
      providers: [{ provide: ApiKeyService, useValue: mockApiKeyService }],
    });
    app = result.app;
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/api-keys', () => {
    it('should list API keys (200)', async () => {
      mockApiKeyService.getApiKeysByUserId.mockResolvedValue([]);
      await request(app.getHttpServer()).get('/api/v1/api-keys').expect(200);
    });
  });

  describe('POST /api/v1/api-keys', () => {
    it('should create API key (201)', async () => {
      mockApiKeyService.createApiKey.mockResolvedValue({
        apiKey: createApiKey(),
        rawKey: 'ak_live_xxx',
      });
      await request(app.getHttpServer())
        .post('/api/v1/api-keys')
        .send({ name: 'Test Key', permissions: ['read'] })
        .expect(201);
    });
  });

});
