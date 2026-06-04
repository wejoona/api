import { ConfigService } from '@nestjs/config';
import { SmsFactory } from './sms.factory';
import { MockSmsAdapter } from './mock-sms.adapter';

describe('SmsFactory', () => {
  function makeFactory(values: Record<string, unknown>) {
    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        return key in values ? values[key] : defaultValue;
      }),
    } as unknown as ConfigService;

    return new SmsFactory(configService);
  }

  it('allows mock SMS outside production-like environments', () => {
    const factory = makeFactory({
      nodeEnv: 'development',
      'sms.provider': 'mock',
    });

    expect(factory.create()).toBeInstanceOf(MockSmsAdapter);
  });

  it('rejects mock SMS in production-like environments', () => {
    const factory = makeFactory({
      nodeEnv: 'production',
      'sms.provider': 'mock',
    });

    expect(() => factory.create()).toThrow('SMS_PROVIDER=mock is not allowed');
  });
});
