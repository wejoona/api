import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPayoutProvider } from '../../domain/interfaces/payout-provider.interface';
import { OrangePayoutMockProvider } from './mock/orange-payout-mock.provider';
import { MtnPayoutMockProvider } from './mock/mtn-payout-mock.provider';
import { MoovPayoutMockProvider } from './mock/moov-payout-mock.provider';
import { WavePayoutMockProvider } from './mock/wave-payout-mock.provider';

@Injectable()
export class PayoutProviderFactory {
  private readonly logger = new Logger(PayoutProviderFactory.name);
  private readonly useMock: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly orangeMock: OrangePayoutMockProvider,
    private readonly mtnMock: MtnPayoutMockProvider,
    private readonly moovMock: MoovPayoutMockProvider,
    private readonly waveMock: WavePayoutMockProvider,
  ) {
    this.useMock = this.configService.get<boolean>('WITHDRAWAL_USE_MOCK', true);

    if (!this.useMock) {
      this.logger.warn('Real payout providers not implemented yet. Falling back to mock.');
      this.useMock = true;
    }
  }

  getProvider(providerCode: string): IPayoutProvider {
    this.logger.debug(`Getting payout provider for code: ${providerCode}`);

    if (this.useMock) {
      return this.getMockProvider(providerCode);
    }

    throw new Error(`Real payout provider ${providerCode} not implemented yet`);
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
    return this.getAllProviders().map(provider => ({
      code: provider.getProviderCode(),
      name: provider.getProviderName(),
      paymentMethodType: provider.getPaymentMethodType(),
      supportedCurrencies: provider.getSupportedCurrencies(),
    }));
  }
}
