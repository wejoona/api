/**
 * Security Controller Integration Tests (server-key)
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockServerKeyService = {
  getPublicKey: jest.fn(),
  rotateKeys: jest.fn(),
};

import { ServerKeyController } from '@modules/security/application/controllers/server-key.controller';
import { ServerKeyService } from '@modules/security/application/services/server-key.service';

describe('ServerKeyController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ServerKeyController],
      providers: [{ provide: ServerKeyService, useValue: mockServerKeyService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/security/public-key', () => {
    it('should return public key (200)', async () => {
      mockServerKeyService.getPublicKey.mockResolvedValue({ publicKey: 'RSA_KEY_123', algorithm: 'RSA-OAEP' });
      await request(app.getHttpServer()).get('/api/v1/security/public-key').expect(200);
    });
  });
});
