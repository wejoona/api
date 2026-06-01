/**
 * Export Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockExportService = {
  execute: jest.fn(),
};

import { ExportController } from '@modules/wallet/application/controllers/export.controller';
import { ExportTransactionsUseCase } from '@modules/wallet/application/usecases/export-transactions.use-case';

describe('ExportController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ExportController],
      providers: [
        { provide: ExportTransactionsUseCase, useValue: mockExportService },
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

  describe('GET /api/v1/wallet/export/transactions', () => {
    it('should export transactions (200)', async () => {
      mockExportService.execute.mockResolvedValue({
        data: 'Date,Type,Amount\n2026-01-01,deposit,10',
        filename: 'transactions.csv',
        contentType: 'text/csv',
      });
      await request(app.getHttpServer())
        .get('/api/v1/wallet/export/transactions')
        .query({
          format: 'csv',
          startDate: '2026-01-01',
          endDate: '2026-02-01',
        })
        .expect(200);
    });
  });

  describe('GET /api/v1/wallet/export/statement', () => {
    it('should return 404 because statement export is not exposed', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/wallet/export/statement')
        .query({ month: '2026-01' })
        .expect(404);
    });
  });
});
