import { ConfigService } from '@nestjs/config';
import { TwilioWebhookController } from './twilio-webhook.controller';

describe('TwilioWebhookController', () => {
  const webhookService = {
    handleStatusCallback: jest.fn(),
  };

  function makeController(values: Record<string, unknown>) {
    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        return key in values ? values[key] : defaultValue;
      }),
    } as unknown as ConfigService;

    return new TwilioWebhookController(webhookService as any, configService);
  }

  it('allows missing auth token only outside production-like environments', () => {
    expect(() =>
      makeController({
        nodeEnv: 'development',
        TWILIO_VALIDATE_SIGNATURES: true,
      }),
    ).not.toThrow();
  });

  it('rejects disabled signature validation in production-like environments', () => {
    expect(() =>
      makeController({
        nodeEnv: 'production',
        TWILIO_VALIDATE_SIGNATURES: false,
        TWILIO_AUTH_TOKEN: 'token',
      }),
    ).toThrow('TWILIO_VALIDATE_SIGNATURES=false is not allowed');
  });

  it('requires Twilio auth token in production-like environments', () => {
    expect(() =>
      makeController({
        nodeEnv: 'staging',
        TWILIO_VALIDATE_SIGNATURES: true,
      }),
    ).toThrow('TWILIO_AUTH_TOKEN is required');
  });

  it('accepts production-like config when validation is enabled and token exists', () => {
    expect(() =>
      makeController({
        nodeEnv: 'production',
        TWILIO_VALIDATE_SIGNATURES: true,
        TWILIO_AUTH_TOKEN: 'token',
      }),
    ).not.toThrow();
  });
});
