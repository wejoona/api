/**
 * Monitoring Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockAlertRepository = {
  findWithFilters: jest.fn(),
  findUnreadByUser: jest.fn(),
  getStatistics: jest.fn(),
};
const mockPreferencesUseCase = {};
const mockMonitorService = {};
const mockRulesService = {};

import { MonitoringController } from '@modules/monitoring/application/controllers/monitoring.controller';
import { AlertRepository } from '@modules/monitoring/infrastructure/repositories/alert.repository';
import { UserAlertPreferencesUseCase } from '@modules/monitoring/application/usecases/user-alert-preferences.use-case';
import { TransactionMonitorService } from '@modules/monitoring/application/services/transaction-monitor.service';
import { AlertRulesService } from '@modules/monitoring/application/services/alert-rules.service';

describe('MonitoringController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [MonitoringController],
      providers: [
        { provide: AlertRepository, useValue: mockAlertRepository },
        { provide: UserAlertPreferencesUseCase, useValue: mockPreferencesUseCase },
        { provide: TransactionMonitorService, useValue: mockMonitorService },
        { provide: AlertRulesService, useValue: mockRulesService },
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

  describe('GET /api/v1/alerts', () => {
    it('should return alerts (200)', async () => {
      mockAlertRepository.findWithFilters.mockResolvedValue({
        alerts: [],
        total: 0,
        page: 1,
        limit: 20,
      });
      await request(app.getHttpServer()).get('/api/v1/alerts').expect(200);
    });
  });

  describe('GET /api/v1/alerts/unread', () => {
    it('should return unread alerts (200)', async () => {
      mockAlertRepository.findUnreadByUser.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get('/api/v1/alerts/unread')
        .expect(200);
    });
  });

  describe('GET /api/v1/alerts/statistics', () => {
    it('should return alert statistics (200)', async () => {
      mockAlertRepository.getStatistics.mockResolvedValue({
        total: 0,
        unread: 0,
        critical: 0,
        actionRequired: 0,
        byType: {},
        bySeverity: {},
      });
      await request(app.getHttpServer())
        .get('/api/v1/alerts/statistics')
        .expect(200);
    });
  });
});
