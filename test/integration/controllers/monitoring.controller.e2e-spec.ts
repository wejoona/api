/**
 * Monitoring Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TEST_USER } from '../setup/test-app';

const mockAlertRepository = {
  findWithFilters: jest.fn(),
  findUnreadByUser: jest.fn(),
  getStatistics: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  findByIdAndUser: jest.fn(),
};
const mockPreferencesUseCase = {
  getPreferences: jest.fn(),
  getAvailableAlertTypes: jest.fn(),
};
const mockMonitorService = {};
const mockRulesService = {};

import { MonitoringController } from '@modules/monitoring/application/controllers/monitoring.controller';
import { AlertRepository } from '@modules/monitoring/infrastructure/repositories/alert.repository';
import { UserAlertPreferencesUseCase } from '@modules/monitoring/application/usecases/user-alert-preferences.use-case';
import { TransactionMonitorService } from '@modules/monitoring/application/services/transaction-monitor.service';
import { AlertRulesService } from '@modules/monitoring/application/services/alert-rules.service';

describe('MonitoringController (e2e)', () => {
  let app: INestApplication;
  const alertId = '550e8400-e29b-41d4-a716-446655440000';

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
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
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

  describe('GET /api/v1/alerts/preferences', () => {
    it('should return preferences without being captured by /alerts/:id (200)', async () => {
      mockPreferencesUseCase.getPreferences.mockResolvedValue({
        userId: TEST_USER.id,
        emailAlerts: true,
        pushAlerts: true,
        smsAlerts: false,
        largeTransactionThreshold: 1000,
        balanceLowThreshold: 10,
        alertTypes: ['large_transaction'],
        quietHoursEnabled: false,
        timezone: 'UTC',
        instantCriticalAlerts: true,
        digestFrequency: 'realtime',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await request(app.getHttpServer())
        .get('/api/v1/alerts/preferences')
        .expect(200)
        .expect(({ body }) => {
          expect(body.userId).toBe(TEST_USER.id);
        });

      expect(mockPreferencesUseCase.getPreferences).toHaveBeenCalledWith(
        TEST_USER.id,
      );
      expect(mockAlertRepository.findByIdAndUser).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/alerts/preferences/alert-types', () => {
    it('should return available alert types (200)', async () => {
      mockPreferencesUseCase.getAvailableAlertTypes.mockResolvedValue([
        {
          type: 'large_transaction',
          name: 'Large Transaction',
          description: 'Transaction amount exceeds your threshold',
          defaultEnabled: true,
        },
      ]);

      await request(app.getHttpServer())
        .get('/api/v1/alerts/preferences/alert-types')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toHaveLength(1);
          expect(body[0].type).toBe('large_transaction');
        });
    });
  });

  describe('PUT /api/v1/alerts/:id/read', () => {
    it('should mark an alert as read using the mobile PUT method (200)', async () => {
      mockAlertRepository.markAsRead.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .put(`/api/v1/alerts/${alertId}/read`)
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ success: true });
        });

      expect(mockAlertRepository.markAsRead).toHaveBeenCalledWith(
        alertId,
        TEST_USER.id,
      );
    });
  });

  describe('PUT /api/v1/alerts/read-all', () => {
    it('should mark all alerts as read using the mobile PUT method (200)', async () => {
      mockAlertRepository.markAllAsRead.mockResolvedValue(3);

      await request(app.getHttpServer())
        .put('/api/v1/alerts/read-all')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ count: 3 });
        });

      expect(mockAlertRepository.markAllAsRead).toHaveBeenCalledWith(
        TEST_USER.id,
      );
    });
  });
});
