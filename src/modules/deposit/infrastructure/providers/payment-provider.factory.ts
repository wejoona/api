import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPaymentProvider } from '../../domain/interfaces/payment-provider.interface';
import { OrangeMockProvider } from './mock/orange-mock.provider';
import { MtnMockProvider } from './mock/mtn-mock.provider';
import { MoovMockProvider } from './mock/moov-mock.provider';
import { WaveMockProvider } from './mock/wave-mock.provider';

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
  ) {
    this.useMock = this.configService.get<boolean>('DEPOSIT_USE_MOCK', true);
    
    if (!this.useMock) {
      this.logger.warn('Real providers not implemented yet. Falling back to mock providers.');
      this.useMock = true;
    }
  }

  getProvider(providerCode: string): IPaymentProvider {
    this.logger.debug(`Getting provider for code: ${providerCode}`);

    if (this.useMock) {
      return this.getMockProvider(providerCode);
    }

    // In production, return real provider implementations
    throw new Error(`Real provider ${providerCode} not implemented yet`);
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
    return [
      this.orangeMock,
      this.mtnMock,
      this.moovMock,
      this.waveMock,
    ];
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