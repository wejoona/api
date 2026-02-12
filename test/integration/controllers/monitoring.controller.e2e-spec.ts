/**
 * Monitoring Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockMonitoringService = {
  getSystemHealth: jest.fn(),
  getMetrics: jest.fn(),
  getAlerts: jest.fn(),
};

import { MonitoringController } from '@modules/monitoring/application/controllers/monitoring.controller';
import { MonitoringService } from '@modules/monitoring/application/services/monitoring.service';

describe('MonitoringController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [MonitoringController],
      providers: [{ provide: MonitoringService, useValue: mockMonitoringService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/monitoring/health', () => {
    it('should return system health (200)', async () => {
      mockMonitoringService.getSystemHealth.mockResolvedValue({ cpu: 45, memory: 60 });
      await request(app.getHttpServer()).get('/api/v1/monitoring/health').expect(200);
    });
  });

  describe('GET /api/v1/monitoring/metrics', () => {
    it('should return metrics (200)', async () => {
      mockMonitoringService.getMetrics.mockResolvedValue({ requestsPerSecond: 150 });
      await request(app.getHttpServer()).get('/api/v1/monitoring/metrics').expect(200);
    });
  });

  describe('GET /api/v1/monitoring/alerts', () => {
    it('should return alerts (200)', async () => {
      mockMonitoringService.getAlerts.mockResolvedValue([]);
      await request(app.getHttpServer()).get('/api/v1/monitoring/alerts').expect(200);
    });
  });
});
