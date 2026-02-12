/**
 * Health Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockHealthCheckService = {
  check: jest.fn(),
};

import { HealthController } from '@modules/health/health.controller';
import { HealthCheckService, TerminusModule } from '@nestjs/terminus';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
      ],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/health', () => {
    it('should return health status (200)', async () => {
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        details: { database: { status: 'up' }, redis: { status: 'up' } },
      });
      await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    });
  });
});
