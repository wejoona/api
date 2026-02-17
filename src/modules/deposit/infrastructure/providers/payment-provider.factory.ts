import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPaymentProvider } from '../../domain/interfaces/payment-provider.interface';
import { OrangeMockProvider } from './mock/orange-mock.provider';
import { MtnMockProvider } from './mock/mtn-mock.provider';
import { MoovMockProvider } from './mock/moov-mock.provider';
import { WaveMockProvider } from './mock/wave-mock.provider';
import { CinetPayProvider } from './cinetpay/cinetpay.provider';
import { YellowCardProvider } from './yellowcard/yellowcard.provider';

@Injectable()
export class PaymentProviderFactory {
  private readonly logger = new Logger(PaymentProviderFactory.name);
  private readonly useMock: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly orangeMock: OrangeMockProvider,
    private readonly mtnMock: MtnMockProvider,
    private readonly moovMock: MoovMockProvider,
    private readonly waveMock: WaveMockProvider,
    @Optional() private readonly cinetPayProvider?: CinetPayProvider,
    @Optional() private readonly yellowCardProvider?: YellowCardProvider,
  ) {
    this.useMock = this.configService.get<string>('DEPOSIT_USE_MOCK', 'true') !== 'false';

    if (this.useMock) {
      this.logger.log('Using MOCK payment providers');
    } else {
      this.logger.log('Using REAL payment providers (CinetPay + YellowCard)');
    }
  }

  getProvider(providerCode: string): IPaymentProvider {
    this.logger.debug(`Getting provider for code: ${providerCode}`);

    if (this.useMock) {
      return this.getMockProvider(providerCode);
    }

    return this.getRealProvider(providerCode);
  }

  private getRealProvider(providerCode: string): IPaymentProvider {
    switch (providerCode.toUpperCase()) {
      case 'CINETPAY':
        // CinetPay handles all mobile money operators
        if (!this.cinetPayProvider) {
          throw new Error('CinetPayProvider not configured. Check CINETPAY_* env vars.');
        }
        return this.cinetPayProvider;

      case 'YELLOWCARD':
        if (!this.yellowCardProvider) {
          throw new Error('YellowCardProvider not configured. Check YELLOWCARD_* env vars.');
        }
        return this.yellowCardProvider;

      // Map individual operator codes to CinetPay in real mode
      case 'OMCI':
      case 'MTNCI':
      case 'MOOVCI':
      case 'WAVECI':
        if (!this.cinetPayProvider) {
          throw new Error('CinetPayProvider not configured. Check CINETPAY_* env vars.');
        }
        return this.cinetPayProvider;

      default:
        throw new Error(`Unsupported provider: ${providerCode}`);
    }
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
    if (this.useMock) {
      return [this.orangeMock, this.mtnMock, this.moovMock, this.waveMock];
    }

    const providers: IPaymentProvider[] = [];
    if (this.cinetPayProvider) providers.push(this.cinetPayProvider);
    if (this.yellowCardProvider) providers.push(this.yellowCardProvider);
    return providers;
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
