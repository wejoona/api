import { ConfigService } from '@nestjs/config';
import { VerifyHqVerificationStrategy } from './verifyhq-verification.strategy';
import { VerificationPurpose } from '../../domain/strategies/verification-strategy.interface';

const redisStore = new Map<string, string>();

jest.mock('ioredis', () => {
  const RedisMock = jest.fn().mockImplementation(() => ({
    setex: jest.fn(async (_key: string, _ttl: number, value: string) => {
      redisStore.set(_key, value);
      return 'OK';
    }),
    get: jest.fn(async (key: string) => redisStore.get(key) ?? null),
    quit: jest.fn(async () => 'OK'),
  }));

  return { __esModule: true, default: RedisMock };
});

describe('VerifyHqVerificationStrategy', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    redisStore.clear();
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function makeStrategy() {
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'verification.verifyhq.baseUrl': 'http://localhost:3300',
          'verification.verifyhq.apiKey': 'dev-test-key',
          'verification.local.expirySeconds': 300,
          'verification.local.otpLength': 6,
          'redis.host': 'localhost',
          'redis.port': 6379,
          'redis.password': undefined,
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    return new VerifyHqVerificationStrategy(configService);
  }

  it('creates a VerifyHQ verification using the current API contract', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        verificationId: 'vhq_verification_123',
        expiresAt: '2026-06-04T05:30:00.000Z',
      }),
    });

    const strategy = makeStrategy();

    await expect(
      strategy.createVerification({
        phone: '+2250750000000',
        channel: 'sms',
        purpose: VerificationPurpose.REGISTRATION,
      }),
    ).resolves.toMatchObject({
      verificationId: 'vhq_verification_123',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3300/verifications',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'dev-test-key',
        },
        body: JSON.stringify({
          phone: '+2250750000000',
          channel: 'sms',
          purpose: VerificationPurpose.REGISTRATION,
          codeLength: 6,
        }),
      }),
    );
  });

  it('checks OTP by resolving the phone mapping to the VerifyHQ verification id', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          verificationId: 'vhq_verification_456',
          expiresAt: '2026-06-04T05:30:00.000Z',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'verified',
          attemptsRemaining: 0,
        }),
      });

    const strategy = makeStrategy();
    await strategy.createVerification({
      phone: '+2250750000001',
      channel: 'sms',
      purpose: VerificationPurpose.LOGIN,
    });

    await expect(
      strategy.checkVerification({
        verificationId: '+2250750000001',
        code: '123456',
      }),
    ).resolves.toEqual({
      status: 'approved',
      attemptsRemaining: 0,
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://localhost:3300/verifications/vhq_verification_456/check',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'dev-test-key',
        },
        body: JSON.stringify({ code: '123456' }),
      }),
    );
  });
});
