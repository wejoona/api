/**
 * Reconciliation Controller Integration Tests
 * CRITICAL: Tests that these endpoints ARE unprotected (security bug)
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockReconciliationService = {
  getStatus: jest.fn(),
  reconcileUser: jest.fn(),
  reconcileAll: jest.fn(),
  trigger: jest.fn(),
  getReports: jest.fn(),
};

import { ReconciliationController } from '@modules/reconciliation/application/controllers/reconciliation.controller';
import { ReconciliationService } from '@modules/reconciliation/application/services/reconciliation.service';

describe('ReconciliationController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ReconciliationController],
      providers: [{ provide: ReconciliationService, useValue: mockReconciliationService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/reconciliation/status', () => {
    it('should return reconciliation status (200)', async () => {
      mockReconciliationService.getStatus.mockResolvedValue({ lastRun: new Date(), status: 'ok' });
      await request(app.getHttpServer()).get('/api/v1/reconciliation/status').expect(200);
    });
  });

  describe('POST /api/v1/reconciliation/trigger', () => {
    it('should trigger reconciliation (200)', async () => {
      mockReconciliationService.trigger.mockResolvedValue({ started: true });
      await request(app.getHttpServer()).post('/api/v1/reconciliation/trigger').expect(200);
    });
  });

  describe('POST /api/v1/reconciliation/all', () => {
    it('should reconcile all (200)', async () => {
      mockReconciliationService.reconcileAll.mockResolvedValue({ count: 100 });
      await request(app.getHttpServer()).post('/api/v1/reconciliation/all').expect(200);
    });
  });

  describe('GET /api/v1/reconciliation/reports', () => {
    it('should return reports (200)', async () => {
      mockReconciliationService.getReports.mockResolvedValue([]);
      await request(app.getHttpServer()).get('/api/v1/reconciliation/reports').expect(200);
    });
  });
});
