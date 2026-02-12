/**
 * Export Controller Integration Tests
 */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../setup/test-app';

const mockExportService = {
  exportTransactions: jest.fn(),
  exportStatement: jest.fn(),
};

import { ExportController } from '@modules/wallet/application/controllers/export.controller';
import { ExportService } from '@modules/wallet/application/services/export.service';

describe('ExportController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [ExportController],
      providers: [{ provide: ExportService, useValue: mockExportService }],
    });
    app = result.app;
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => { jest.clearAllMocks(); });

  describe('GET /api/v1/wallet/export/transactions', () => {
    it('should export transactions (200)', async () => {
      mockExportService.exportTransactions.mockResolvedValue({ url: 'https://s3.../export.csv' });
      await request(app.getHttpServer())
        .get('/api/v1/wallet/export/transactions')
        .query({ format: 'csv', from: '2026-01-01', to: '2026-02-01' })
        .expect(200);
    });
  });

  describe('GET /api/v1/wallet/export/statement', () => {
    it('should export statement (200)', async () => {
      mockExportService.exportStatement.mockResolvedValue({ url: 'https://s3.../statement.pdf' });
      await request(app.getHttpServer())
        .get('/api/v1/wallet/export/statement')
        .query({ month: '2026-01' })
        .expect(200);
    });
  });
});
