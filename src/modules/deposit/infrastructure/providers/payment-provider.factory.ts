import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPaymentProvider } from '../../domain/interfaces/payment-provider.interface';
import { OrangeMockProvider } from './mock/orange-mock.provider';
import { MtnMockProvider } from './mock/mtn-mock.provider';
import { MoovMockProvider } from './mock/moov-mock.provider';
import { WaveMockProvider } from './mock/wave-mock.provider';
import { AppException } from '../../../../common/exceptions';
import { ERROR_CODES } from '../../../../common/constants/error-codes';
import { ProviderInfoDto } from '../../application/dto/deposit-response.dto';

@Injectable()
export class PaymentProviderFactory {
  private readonly logger = new Logger(PaymentProviderFactory.name);
  private readonly useMock: boolean;
  private readonly productionLike: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly orangeMock: OrangeMockProvider,
    private readonly mtnMock: MtnMockProvider,
    private readonly moovMock: MoovMockProvider,
    private readonly waveMock: WaveMockProvider,
  ) {
    this.productionLike = this.isProductionLike();
    this.useMock = this.getBoolean('DEPOSIT_USE_MOCK', !this.productionLike);

    if (this.productionLike && this.useMock) {
      throw new Error(
        'DEPOSIT_USE_MOCK=true is not allowed in production-like environments',
      );
    }

    if (!this.useMock) {
      this.logger.warn(
        'Deposit providers are disabled because real mobile money providers are not implemented.',
      );
    }
  }

  getProvider(providerCode: string): IPaymentProvider {
    this.logger.debug(`Getting provider for code: ${providerCode}`);

    if (this.useMock) {
      return this.getMockProvider(providerCode);
    }

    throw this.providerUnavailable(providerCode);
  }

  private getMockProvider(providerCode: string): IPaymentProvider {
    switch (providerCode.toUpperCase()) {
      case 'OMCI':
        return this.orangeMock;
      case 'MTNCI':
        return this.mtnMock;
      case 'MOOVCI':
        return this.moovMock;
      case 'WAVECI':
        return this.waveMock;
      default:
        throw new Error(`Unsupported provider: ${providerCode}`);
    }
  }

  getAllProviders(): IPaymentProvider[] {
    return [this.orangeMock, this.mtnMock, this.moovMock, this.waveMock];
  }

  getProviderInfo(): ProviderInfoDto[] {
    return this.getAllProviders().map((provider) => ({
      code: provider.getProviderCode(),
      name: provider.getProviderName(),
      paymentMethodType: provider.getPaymentMethodType(),
      supportedCurrencies: provider.getSupportedCurrencies(),
      status: this.useMock ? 'mock' : 'unavailable',
      available: this.useMock,
      reason: this.useMock ? null : 'provider_not_implemented',
      featureReason: this.useMock ? null : 'deposit_provider_not_connected',
    }));
  }

  getProviderModeStatus() {
    return {
      mode: this.useMock ? 'mock' : 'disabled',
      productionLike: this.productionLike,
      mockAllowed: !this.productionLike,
      liveConfigured: false,
      status: this.useMock ? 'mock' : 'unavailable',
      reason: this.useMock ? null : 'provider_not_implemented',
      featureReason: this.useMock ? null : 'deposit_provider_not_connected',
    };
  }

  private providerUnavailable(providerCode: string): AppException {
    return AppException.serviceUnavailable(
      ERROR_CODES.DEPOSIT_PROVIDER_UNAVAILABLE,
      'Deposit provider is not available yet.',
      undefined,
      {
        reason: 'provider_not_implemented',
        featureReason: 'deposit_provider_not_connected',
        providerCode,
        retryable: false,
        supportReviewRequired: true,
      },
    );
  }

  private isProductionLike(): boolean {
    const nodeEnv =
      this.configService.get<string>('nodeEnv') ||
      this.configService.get<string>('NODE_ENV') ||
      process.env.NODE_ENV ||
      'development';

    return ['production', 'staging'].includes(nodeEnv);
  }

  private getBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.configService.get<boolean | string>(key, defaultValue);

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return value;
  }
}
