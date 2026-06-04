import { ConfigService } from '@nestjs/config';
import { resolveKycVerificationProviderMode } from './kyc-provider-mode';

describe('resolveKycVerificationProviderMode', () => {
  function config(values: Record<string, unknown>) {
    return {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        return key in values ? values[key] : defaultValue;
      }),
    } as unknown as ConfigService;
  }

  it('allows explicit mock only outside production-like environments', () => {
    expect(
      resolveKycVerificationProviderMode(
        config({ nodeEnv: 'development', KYC_PROVIDER: 'mock' }),
      ),
    ).toBe('mock');
  });

  it('uses VerifyHQ when configured outside production', () => {
    expect(
      resolveKycVerificationProviderMode(
        config({
          nodeEnv: 'test',
          KYC_PROVIDER: 'verifyhq',
          VERIFY_HQ_API_KEY: 'vhq_test_key',
        }),
      ),
    ).toBe('verifyhq');
  });

  it('rejects mock in production-like environments', () => {
    expect(() =>
      resolveKycVerificationProviderMode(
        config({ nodeEnv: 'production', KYC_PROVIDER: 'mock' }),
      ),
    ).toThrow('KYC_PROVIDER=mock is not allowed');
  });

  it('rejects unsupported providers in production-like environments', () => {
    expect(() =>
      resolveKycVerificationProviderMode(
        config({ nodeEnv: 'staging', KYC_PROVIDER: 'legacy-provider' }),
      ),
    ).toThrow('Unsupported KYC_PROVIDER for production');
  });

  it('requires VerifyHQ API key in production-like environments', () => {
    expect(() =>
      resolveKycVerificationProviderMode(
        config({
          nodeEnv: 'production',
          KYC_PROVIDER: 'verifyhq',
          VERIFY_HQ_API_KEY: 'your-api-key-here',
        }),
      ),
    ).toThrow('KYC_PROVIDER=verifyhq requires VERIFY_HQ_API_KEY');
  });
});
