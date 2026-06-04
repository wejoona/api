import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ERROR_CODES } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions';
import { PaymentMethodType } from '../../domain/enums/payment-method-type.enum';
import { PaymentProviderFactory } from './payment-provider.factory';

describe('PaymentProviderFactory', () => {
  const provider = (code: string) =>
    ({
      getProviderCode: () => code,
      getProviderName: () => `${code} Provider`,
      getPaymentMethodType: () => PaymentMethodType.PUSH,
      getSupportedCurrencies: () => ['XOF'],
    }) as any;

  const makeConfig = (values: Record<string, unknown>) =>
    ({
      get: jest.fn((key: string, defaultValue?: unknown) =>
        Object.prototype.hasOwnProperty.call(values, key)
          ? values[key]
          : defaultValue,
      ),
    }) as unknown as ConfigService;

  const makeFactory = (values: Record<string, unknown>) =>
    new PaymentProviderFactory(
      makeConfig(values),
      provider('OMCI'),
      provider('MTNCI'),
      provider('MOOVCI'),
      provider('WAVECI'),
    );

  it('uses mock providers in non-production environments by default', () => {
    const factory = makeFactory({ nodeEnv: 'development' });

    expect(factory.getProvider('OMCI').getProviderCode()).toBe('OMCI');
    expect(factory.getProviderModeStatus()).toMatchObject({
      mode: 'mock',
      productionLike: false,
      mockAllowed: true,
      status: 'mock',
    });
  });

  it('rejects mock mode in production-like environments', () => {
    expect(() =>
      makeFactory({ nodeEnv: 'production', DEPOSIT_USE_MOCK: 'true' }),
    ).toThrow('DEPOSIT_USE_MOCK=true is not allowed');
  });

  it('returns explicit unavailable errors when live deposit providers are requested', () => {
    const factory = makeFactory({
      nodeEnv: 'production',
      DEPOSIT_USE_MOCK: 'false',
    });

    try {
      factory.getProvider('OMCI');
      throw new Error('expected provider error');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      const exception = error as AppException;
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.code).toBe(ERROR_CODES.DEPOSIT_PROVIDER_UNAVAILABLE);
      expect(exception.getResponse()).toMatchObject({
        reason: 'provider_not_implemented',
        featureReason: 'deposit_provider_not_connected',
        providerCode: 'OMCI',
        retryable: false,
        supportReviewRequired: true,
      });
    }
  });

  it('marks provider info unavailable instead of exposing live fallback', () => {
    const factory = makeFactory({
      nodeEnv: 'production',
      DEPOSIT_USE_MOCK: 'false',
    });

    expect(factory.getProviderInfo()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'OMCI',
          status: 'unavailable',
          available: false,
          reason: 'provider_not_implemented',
          featureReason: 'deposit_provider_not_connected',
        }),
      ]),
    );
  });
});
