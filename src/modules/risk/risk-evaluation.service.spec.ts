import { ConfigService } from '@nestjs/config';
import { RiskEvaluationService } from './risk-evaluation.service';

describe('RiskEvaluationService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  function makeService(values: Record<string, unknown>) {
    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        return values[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;

    return new RiskEvaluationService(configService);
  }

  const request = {
    transactionId: 'transaction-1',
    amount: 100,
    currency: 'USDC',
    type: 'P2P' as const,
    senderId: 'sender-1',
    receiverId: 'receiver-1',
  };

  it('skips risk evaluation when Risk Manager is disabled', async () => {
    const service = makeService({ RISK_MANAGER_ENABLED: 'false' });
    global.fetch = jest.fn();

    await expect(service.evaluate(request)).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fails closed with STEP_UP when enabled Risk Manager returns an error', async () => {
    const service = makeService({
      RISK_MANAGER_ENABLED: 'true',
      RISK_MANAGER_URL: 'http://risk-manager.test',
      RISK_MANAGER_API_KEY: 'test-key',
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    await expect(service.evaluate(request)).resolves.toMatchObject({
      transactionId: 'transaction-1',
      score: 100,
      decision: 'STEP_UP',
      factors: ['risk_manager_unavailable'],
      triggeredRules: ['fail_closed:http_503'],
    });
  });

  it('fails closed with STEP_UP when enabled Risk Manager is unreachable', async () => {
    const service = makeService({
      RISK_MANAGER_ENABLED: 'true',
      RISK_MANAGER_URL: 'http://risk-manager.test',
      RISK_MANAGER_API_KEY: 'test-key',
    });
    global.fetch = jest.fn().mockRejectedValue(new Error('connection refused'));

    await expect(service.evaluate(request)).resolves.toMatchObject({
      transactionId: 'transaction-1',
      score: 100,
      decision: 'STEP_UP',
      factors: ['risk_manager_unavailable'],
      triggeredRules: ['fail_closed:unavailable'],
    });
  });

  it('preserves successful Risk Manager decisions', async () => {
    const service = makeService({
      RISK_MANAGER_ENABLED: 'true',
      RISK_MANAGER_URL: 'http://risk-manager.test',
      RISK_MANAGER_API_KEY: 'test-key',
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        transactionId: 'transaction-1',
        score: 12,
        decision: 'APPROVE',
        factors: [],
        triggeredRules: [],
        evaluationTimeMs: 35,
        timestamp: '2026-06-04T00:00:00.000Z',
      }),
    } as unknown as Response);

    await expect(service.evaluate(request)).resolves.toMatchObject({
      score: 12,
      decision: 'APPROVE',
    });
  });
});
