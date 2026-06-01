/**
 * Health Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';
import { ConfigService } from '@nestjs/config';

const mockHealthCheckService = {
  check: jest.fn(),
};
const mockTypeOrmHealthIndicator = {
  pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
};
const mockDependencyIndicator = {
  isHealthy: jest.fn().mockResolvedValue({ dependency: { status: 'up' } }),
};

import { HealthController } from '@modules/health/health.controller';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import {
  BlnkHealthIndicator,
  CircleHealthIndicator,
  RedisHealthIndicator,
  StellarHealthIndicator,
  TwilioHealthIndicator,
  YellowCardHealthIndicator,
} from '@modules/health/health-indicators';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        {
          provide: TypeOrmHealthIndicator,
          useValue: mockTypeOrmHealthIndicator,
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: CircleHealthIndicator, useValue: mockDependencyIndicator },
        { provide: BlnkHealthIndicator, useValue: mockDependencyIndicator },
        { provide: RedisHealthIndicator, useValue: mockDependencyIndicator },
        {
          provide: YellowCardHealthIndicator,
          useValue: mockDependencyIndicator,
        },
        { provide: TwilioHealthIndicator, useValue: mockDependencyIndicator },
        { provide: StellarHealthIndicator, useValue: mockDependencyIndicator },
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
