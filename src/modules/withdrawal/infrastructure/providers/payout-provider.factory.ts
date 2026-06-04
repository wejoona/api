import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPayoutProvider } from '../../domain/interfaces/payout-provider.interface';
import { OrangePayoutMockProvider } from './mock/orange-payout-mock.provider';
import { MtnPayoutMockProvider } from './mock/mtn-payout-mock.provider';
import { MoovPayoutMockProvider } from './mock/moov-payout-mock.provider';
import { WavePayoutMockProvider } from './mock/wave-payout-mock.provider';
import { AppException } from '../../../../common/exceptions';
import { ERROR_CODES } from '../../../../common/constants/error-codes';

@Injectable()
export class PayoutProviderFactory {
  private readonly logger = new Logger(PayoutProviderFactory.name);
  private readonly useMock: boolean;
  private readonly productionLike: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly orangeMock: OrangePayoutMockProvider,
    private readonly mtnMock: MtnPayoutMockProvider,
    private readonly moovMock: MoovPayoutMockProvider,
    private readonly waveMock: WavePayoutMockProvider,
  ) {
    this.productionLike = this.isProductionLike();
    this.useMock = this.getBoolean('WITHDRAWAL_USE_MOCK', !this.productionLike);

    if (this.productionLike && this.useMock) {
      throw new Error(
        'WITHDRAWAL_USE_MOCK=true is not allowed in production-like environments',
      );
    }

    if (!this.useMock) {
      this.logger.warn(
        'Payout providers are disabled because real mobile money providers are not implemented.',
      );
    }
  }

  getProvider(providerCode: string): IPayoutProvider {
    this.logger.debug(`Getting payout provider for code: ${providerCode}`);

    if (this.useMock) {
      return this.getMockProvider(providerCode);
    }

    throw this.providerUnavailable(providerCode);
  }

  private getMockProvider(providerCode: string): IPayoutProvider {
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
        throw new Error(`Unsupported payout provider: ${providerCode}`);
    }
  }

  getAllProviders(): IPayoutProvider[] {
    return [this.orangeMock, this.mtnMock, this.moovMock, this.waveMock];
  }

  getProviderInfo() {
    return this.getAllProviders().map((provider) => ({
      code: provider.getProviderCode(),
      name: provider.getProviderName(),
      paymentMethodType: provider.getPaymentMethodType(),
      supportedCurrencies: provider.getSupportedCurrencies(),
      status: this.useMock ? 'mock' : 'unavailable',
      available: this.useMock,
      reason: this.useMock ? null : 'provider_not_implemented',
      featureReason: this.useMock ? null : 'payout_provider_not_connected',
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
      featureReason: this.useMock ? null : 'payout_provider_not_connected',
    };
  }

  private providerUnavailable(providerCode: string): AppException {
    return AppException.serviceUnavailable(
      ERROR_CODES.WITHDRAWAL_PROVIDER_UNAVAILABLE,
      'Withdrawal provider is not available yet.',
      undefined,
      {
        reason: 'provider_not_implemented',
        featureReason: 'payout_provider_not_connected',
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
