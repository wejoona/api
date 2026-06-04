import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { RiskClientFactory } from './risk-client.factory';
import { MockRiskClient } from './clients/mock-risk.client';
import { RiskManagerClient } from './clients/risk-manager.client';

describe('RiskClientFactory', () => {
  function makeFactory(values: Record<string, unknown>) {
    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        return key in values ? values[key] : defaultValue;
      }),
    } as unknown as ConfigService;

    return new RiskClientFactory(configService, {} as HttpService);
  }

  it('uses mock mode by default outside production', () => {
    const factory = makeFactory({ nodeEnv: 'development' });

    expect(factory.getClient()).toBeInstanceOf(MockRiskClient);
    expect(factory.getRuntimeStatus()).toMatchObject({
      mode: 'mock',
      productionLike: false,
      mockAllowed: true,
      fallbackAllowed: false,
    });
  });

  it('uses live mode by default in production-like environments', () => {
    const factory = makeFactory({
      nodeEnv: 'production',
      RISK_MANAGER_URL: 'http://risk-manager:3000',
      RISK_MANAGER_API_KEY: 'prod-risk-key',
    });

    expect(factory.getClient()).toBeInstanceOf(RiskManagerClient);
    expect(factory.getRuntimeStatus()).toMatchObject({
      mode: 'live',
      productionLike: true,
      mockAllowed: false,
      liveConfigured: true,
    });
  });

  it('rejects mock mode in production-like environments', () => {
    expect(() =>
      makeFactory({
        nodeEnv: 'production',
        RISK_CLIENT_MODE: 'mock',
      }),
    ).toThrow('RISK_CLIENT_MODE=mock is not allowed');
  });

  it('rejects hybrid mode in production-like environments', () => {
    expect(() =>
      makeFactory({
        nodeEnv: 'staging',
        RISK_CLIENT_MODE: 'hybrid',
      }),
    ).toThrow('RISK_CLIENT_MODE=hybrid is not allowed');
  });

  it('rejects live mode in production when the live client is not configured', () => {
    expect(() =>
      makeFactory({
        nodeEnv: 'production',
        RISK_CLIENT_MODE: 'live',
        RISK_MANAGER_URL: 'http://risk-manager:3000',
        RISK_MANAGER_API_KEY: 'dev-api-key',
      }),
    ).toThrow('Risk Manager live mode requires RISK_MANAGER_URL');
  });

  it('falls back to mock for invalid modes only outside production', () => {
    const factory = makeFactory({
      nodeEnv: 'test',
      RISK_CLIENT_MODE: 'invalid',
    });

    expect(factory.getClient()).toBeInstanceOf(MockRiskClient);
    expect(factory.getRuntimeStatus()).toMatchObject({
      mode: 'mock',
      configuredMode: 'invalid',
      mockAllowed: true,
    });
  });
});
