import { ConfigService } from '@nestjs/config';
import { PushFactory } from './push.factory';
import { MockPushAdapter } from './mock-push.adapter';

describe('PushFactory', () => {
  function makeFactory(values: Record<string, unknown>) {
    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        return key in values ? values[key] : defaultValue;
      }),
    } as unknown as ConfigService;

    return new PushFactory(configService);
  }

  it('allows mock push outside production-like environments', () => {
    const factory = makeFactory({
      nodeEnv: 'test',
      'fcm.useMock': true,
    });

    expect(factory.create()).toBeInstanceOf(MockPushAdapter);
  });

  it('rejects mock push in production-like environments', () => {
    const factory = makeFactory({
      nodeEnv: 'production',
      'fcm.useMock': true,
    });

    expect(() => factory.create()).toThrow(
      'FCM mock mode is not allowed in production-like environments',
    );
  });
});
