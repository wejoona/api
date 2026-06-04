import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, TEST_ADMIN } from '../setup/test-app';
import { JobsController } from '@modules/jobs/controllers/jobs.controller';
import { ScheduledJobsService } from '@modules/jobs/services/scheduled-jobs.service';

const mockScheduledJobsService = {
  getCronHubCompatibleStatus: jest.fn(),
};

describe('JobsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const result = await createTestApp({
      controllers: [JobsController],
      authUser: TEST_ADMIN,
      providers: [
        {
          provide: ScheduledJobsService,
          useValue: mockScheduledJobsService,
        },
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

  describe('GET /api/v1/jobs/cronhub/status', () => {
    it('returns CronHub-compatible scheduled job status', async () => {
      mockScheduledJobsService.getCronHubCompatibleStatus.mockResolvedValue({
        productName: 'korido',
        serviceName: 'korido-backend',
        generatedAt: '2026-06-04T12:00:00.000Z',
        jobs: [
          {
            name: 'daily_reconciliation',
            status: 'healthy',
            lastStatus: 'success',
            lastRunId: 'job-run-1',
            lastHeartbeatAt: '2026-06-04T01:02:00.000Z',
          },
        ],
      });

      await request(app.getHttpServer())
        .get('/api/v1/jobs/cronhub/status?jobName=daily_reconciliation')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            productName: 'korido',
            serviceName: 'korido-backend',
            jobs: [
              {
                name: 'daily_reconciliation',
                status: 'healthy',
                lastStatus: 'success',
              },
            ],
          });
        });

      expect(
        mockScheduledJobsService.getCronHubCompatibleStatus,
      ).toHaveBeenCalledWith('daily_reconciliation');
    });
  });
});
