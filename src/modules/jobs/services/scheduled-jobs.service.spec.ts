import { ScheduledJobsService } from './scheduled-jobs.service';

describe('ScheduledJobsService cronhub status', () => {
  const makeRepository = (runsByJobName: Record<string, any>) => ({
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(function () {
        const whereCall = this.where.mock.calls[0];
        const jobName = whereCall?.[1]?.jobName;
        const runs = runsByJobName[jobName] ?? [];
        return Promise.resolve(Array.isArray(runs) ? runs : [runs]);
      }),
    })),
  });

  const makeService = (
    runsByJobName: Record<string, any>,
    registrations = [
      {
        name: 'daily_reconciliation',
        schedule: '0 1 * * *',
        grace_period: 600,
        service_name: 'korido-backend',
        product_name: 'korido',
        expected_interval_minutes: 1440,
      },
      {
        name: 'reconcile_blnk_balances',
        schedule: '30 2 * * *',
        grace_period: 600,
        service_name: 'korido-backend',
        product_name: 'korido',
        expected_interval_minutes: 1440,
      },
    ],
  ) => {
    return new ScheduledJobsService(
      {} as any,
      makeRepository(runsByJobName) as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {
        getRegisteredJobs: jest.fn().mockReturnValue(registrations),
        pingStart: jest.fn(),
        pingComplete: jest.fn(),
      } as any,
    );
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-04T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns healthy CronHub-compatible status for a recent successful reconciliation run', async () => {
    const service = makeService({
      daily_reconciliation: [
        {
          id: 'job-run-1',
          jobName: 'daily_reconciliation',
          status: 'completed',
          startedAt: new Date('2026-06-04T01:00:00.000Z'),
          completedAt: new Date('2026-06-04T01:02:00.000Z'),
          recordsProcessed: 42,
          errorMessage: null,
          createdAt: new Date('2026-06-04T01:00:00.000Z'),
        },
      ],
    });

    const result = await service.getCronHubCompatibleStatus(
      'daily_reconciliation',
    );

    expect(result).toMatchObject({
      productName: 'korido',
      serviceName: 'korido-backend',
      jobs: [
        {
          name: 'daily_reconciliation',
          status: 'healthy',
          healthState: 'healthy',
          lastStatus: 'success',
          previousLastStatus: null,
          lastRunId: 'job-run-1',
          lastHeartbeatAt: '2026-06-04T01:02:00.000Z',
          nextExpectedAt: '2026-06-05T01:02:00.000Z',
          durationMs: 120000,
          recordsProcessed: 42,
          errorMessage: null,
          recoveredAt: null,
        },
      ],
    });
  });

  it('marks failed reconciliation runs as missed with the failure reason', async () => {
    const service = makeService({
      reconcile_blnk_balances: [
        {
          id: 'job-run-2',
          jobName: 'reconcile_blnk_balances',
          status: 'failed',
          startedAt: new Date('2026-06-04T02:30:00.000Z'),
          completedAt: new Date('2026-06-04T02:31:00.000Z'),
          recordsProcessed: 0,
          errorMessage: 'Blnk unavailable',
          createdAt: new Date('2026-06-04T02:30:00.000Z'),
        },
      ],
    });

    const result = await service.getCronHubCompatibleStatus(
      'reconcile_blnk_balances',
    );

    expect(result.jobs[0]).toMatchObject({
      name: 'reconcile_blnk_balances',
      status: 'missed',
      healthState: 'failed',
      lastStatus: 'failure',
      previousLastStatus: null,
      errorMessage: 'Blnk unavailable',
    });
  });

  it('marks jobs with no persisted run as new', async () => {
    const service = makeService({});

    const result = await service.getCronHubCompatibleStatus(
      'daily_reconciliation',
    );

    expect(result.jobs[0]).toMatchObject({
      name: 'daily_reconciliation',
      status: 'new',
      healthState: 'new',
      lastStatus: 'new',
      previousLastStatus: null,
      recoveredAt: null,
    });
  });

  it('marks an in-flight run as running before the grace period expires', async () => {
    const service = makeService({
      daily_reconciliation: [
        {
          id: 'job-run-3',
          jobName: 'daily_reconciliation',
          status: 'running',
          startedAt: new Date('2026-06-04T11:55:00.000Z'),
          completedAt: null,
          recordsProcessed: 0,
          errorMessage: null,
          createdAt: new Date('2026-06-04T11:55:00.000Z'),
        },
      ],
    });

    const result = await service.getCronHubCompatibleStatus(
      'daily_reconciliation',
    );

    expect(result.jobs[0]).toMatchObject({
      status: 'running',
      healthState: 'running',
      lastStatus: 'running',
    });
  });

  it('marks an in-flight run as late after the grace period expires', async () => {
    const service = makeService({
      daily_reconciliation: [
        {
          id: 'job-run-4',
          jobName: 'daily_reconciliation',
          status: 'running',
          startedAt: new Date('2026-06-04T11:40:00.000Z'),
          completedAt: null,
          recordsProcessed: 0,
          errorMessage: null,
          createdAt: new Date('2026-06-04T11:40:00.000Z'),
        },
      ],
    });

    const result = await service.getCronHubCompatibleStatus(
      'daily_reconciliation',
    );

    expect(result.jobs[0]).toMatchObject({
      status: 'late',
      healthState: 'late',
      lastStatus: 'running',
    });
  });

  it('marks a successful run after a failed run as recovered', async () => {
    const service = makeService({
      reconcile_blnk_balances: [
        {
          id: 'job-run-6',
          jobName: 'reconcile_blnk_balances',
          status: 'completed',
          startedAt: new Date('2026-06-04T02:30:00.000Z'),
          completedAt: new Date('2026-06-04T02:32:00.000Z'),
          recordsProcessed: 11,
          errorMessage: null,
          createdAt: new Date('2026-06-04T02:30:00.000Z'),
        },
        {
          id: 'job-run-5',
          jobName: 'reconcile_blnk_balances',
          status: 'failed',
          startedAt: new Date('2026-06-03T02:30:00.000Z'),
          completedAt: new Date('2026-06-03T02:31:00.000Z'),
          recordsProcessed: 0,
          errorMessage: 'Blnk unavailable',
          createdAt: new Date('2026-06-03T02:30:00.000Z'),
        },
      ],
    });

    const result = await service.getCronHubCompatibleStatus(
      'reconcile_blnk_balances',
    );

    expect(result.jobs[0]).toMatchObject({
      status: 'healthy',
      healthState: 'recovered',
      lastStatus: 'success',
      previousLastStatus: 'failure',
      recoveredAt: '2026-06-04T02:32:00.000Z',
      errorMessage: null,
    });
  });
});
