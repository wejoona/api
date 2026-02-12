/**
 * API Key Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockApiKeyService = {
  getKeys: jest.fn(),
  createKey: jest.fn(),
  revokeKey: jest.fn(),
};

import { ApiKeyController } from '@modules/api-keys/application/controllers/api-key.controller';
import { ApiKeyService } from '@modules/api-keys/application/services/api-key.service';

describe('ApiKeyController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ApiKeyController],
      providers: [{ provide: ApiKeyService, useValue: mockApiKeyService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/api-keys', () => {
    it('should list API keys (200)', async () => {
      mockApiKeyService.getKeys.mockResolvedValue([]);
      await request(app.getHttpServer()).get('/api/v1/api-keys').expect(200);
    });
  });

  describe('POST /api/v1/api-keys', () => {
    it('should create API key (201)', async () => {
      mockApiKeyService.createKey.mockResolvedValue({ id: 'key_123', key: 'ak_live_xxx' });
      await request(app.getHttpServer())
        .post('/api/v1/api-keys')
        .send({ name: 'Test Key', permissions: ['read'] })
        .expect(201);
    });
  });

  describe('DELETE /api/v1/api-keys/:id', () => {
    it('should revoke API key (200)', async () => {
      mockApiKeyService.revokeKey.mockResolvedValue({ success: true });
      await request(app.getHttpServer()).delete('/api/v1/api-keys/key_123').expect(200);
    });
  });
});
