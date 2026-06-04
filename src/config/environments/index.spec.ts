import { validateProductionConfig } from './index';

describe('validateProductionConfig', () => {
  const originalEnv = process.env;
  const requiredProductionEnv = {
    NODE_ENV: 'production',
    DATABASE_HOST: 'postgres',
    DATABASE_NAME: 'usdc_wallet',
    DATABASE_USER: 'wallet',
    DATABASE_PASSWORD: 'password',
    REDIS_HOST: 'redis',
    JWT_SECRET: 'x'.repeat(32),
    JWT_REFRESH_SECRET: 'y'.repeat(32),
    CIRCLE_API_KEY: 'circle-key',
    CIRCLE_ENTITY_SECRET: 'circle-entity-secret',
    YELLOW_CARD_API_KEY: 'yellow-card-key',
    YELLOW_CARD_SECRET_KEY: 'yellow-card-secret',
    KYC_PROVIDER: 'verifyhq',
    VERIFY_HQ_API_KEY: 'vhq_prod_key',
  };

  beforeEach(() => {
    process.env = { ...requiredProductionEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('accepts production VerifyHQ KYC configuration', () => {
    expect(() => validateProductionConfig()).not.toThrow();
  });

  it('rejects mock KYC provider in production', () => {
    process.env.KYC_PROVIDER = 'mock';

    expect(() => validateProductionConfig()).toThrow(
      'KYC_PROVIDER cannot be mock in production',
    );
  });

  it('requires VerifyHQ API key for production VerifyHQ KYC', () => {
    delete process.env.VERIFY_HQ_API_KEY;

    expect(() => validateProductionConfig()).toThrow(
      'VERIFY_HQ_API_KEY is required in production',
    );
  });

  it('rejects mock SMS provider in production', () => {
    process.env.SMS_PROVIDER = 'mock';

    expect(() => validateProductionConfig()).toThrow(
      'SMS_PROVIDER cannot be mock in production',
    );
  });

  it('rejects disabled Twilio signature validation in production', () => {
    process.env.TWILIO_VALIDATE_SIGNATURES = 'false';

    expect(() => validateProductionConfig()).toThrow(
      'TWILIO_VALIDATE_SIGNATURES cannot be false in production',
    );
  });

  it('requires Twilio auth token when production SMS provider is Twilio', () => {
    process.env.SMS_PROVIDER = 'twilio';
    delete process.env.TWILIO_AUTH_TOKEN;

    expect(() => validateProductionConfig()).toThrow(
      'TWILIO_AUTH_TOKEN is required in production',
    );
  });

  it('rejects mock FCM provider in production', () => {
    process.env.FCM_USE_MOCK = 'true';

    expect(() => validateProductionConfig()).toThrow(
      'FCM_USE_MOCK must be false in production',
    );
  });
});
