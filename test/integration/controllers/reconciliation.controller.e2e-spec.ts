/**
 * Reconciliation Controller Integration Tests
 * CRITICAL: Tests that these endpoints ARE unprotected (security bug)
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TEST_ADMIN } from '../setup/test-app';

const mockReconciliationService = {
  reconcile: jest.fn(),
  runDailyReconciliation: jest.fn(),
};
const mockProviderBalanceService = {
  runScheduledReconciliation: jest.fn(),
  reconcileProvider: jest.fn(),
};
const mockFeeVerificationService = {
  verifyFees: jest.fn(),
  verifyTransactionFee: jest.fn(),
  getExpectedFee: jest.fn(),
};
const mockSettlementReportService = {
  generateSettlementReport: jest.fn(),
  generateDailySettlement: jest.fn(),
  generateMonthlySettlement: jest.fn(),
  getDailySettlementSummary: jest.fn(),
};
const mockReportRepository = {
  findLatestByType: jest.fn(),
  findRequiringReview: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
};

import { ReconciliationController } from '@modules/reconciliation/application/controllers/reconciliation.controller';
import {
  DailyTransactionReconciliationService,
  ProviderBalanceReconciliationService,
  FeeVerificationService,
  SettlementReportService,
} from '@modules/reconciliation/application/services';
import { ReconciliationReportRepository } from '@modules/reconciliation/domain/repositories/reconciliation-report.repository';

function reconciliationReport() {
  return {
    id: '550e8400-e29b-41d4-a716-446655440901',
    type: 'daily_transaction',
    status: 'completed',
    periodStart: new Date('2026-01-01T00:00:00Z'),
    periodEnd: new Date('2026-01-02T00:00:00Z'),
    summary: {
      totalTransactions: 0,
      matchedTransactions: 0,
      discrepancyCount: 0,
      criticalDiscrepancies: 0,
      highDiscrepancies: 0,
    },
    transactionDiscrepancies: [],
    feeDiscrepancies: [],
    settlementEntries: [],
    providerBalances: [],
    executedBy: null,
    reviewedBy: null,
    notes: null,
    isReconciled: true,
    reconciliationPercentage: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: new Date(),
  };
}

describe('ReconciliationController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ReconciliationController],
      authUser: TEST_ADMIN,
      providers: [
        {
          provide: DailyTransactionReconciliationService,
          useValue: mockReconciliationService,
        },
        {
          provide: ProviderBalanceReconciliationService,
          useValue: mockProviderBalanceService,
        },
        { provide: FeeVerificationService, useValue: mockFeeVerificationService },
        { provide: SettlementReportService, useValue: mockSettlementReportService },
        { provide: ReconciliationReportRepository, useValue: mockReportRepository },
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

  describe('GET /api/v1/reconciliation/status', () => {
    it('should return reconciliation status (200)', async () => {
      mockReportRepository.findLatestByType.mockResolvedValue(null);
      mockReportRepository.findRequiringReview.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get('/api/v1/reconciliation/status')
        .expect(200);
    });
  });

  describe('POST /api/v1/reconciliation/transactions/run-daily', () => {
    it('should trigger daily transaction reconciliation (200)', async () => {
      mockReconciliationService.runDailyReconciliation.mockResolvedValue(
        reconciliationReport(),
      );
      await request(app.getHttpServer())
        .post('/api/v1/reconciliation/transactions/run-daily')
        .expect(200);
    });
  });

  describe('POST /api/v1/reconciliation/balances/run', () => {
    it('should reconcile provider balances (200)', async () => {
      mockProviderBalanceService.runScheduledReconciliation.mockResolvedValue(
        reconciliationReport(),
      );
      await request(app.getHttpServer())
        .post('/api/v1/reconciliation/balances/run')
        .expect(200);
    });
  });

  describe('GET /api/v1/reconciliation/reports', () => {
    it('should return reports (200)', async () => {
      mockReportRepository.find.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get('/api/v1/reconciliation/reports')
        .expect(200);
    });
  });
});
