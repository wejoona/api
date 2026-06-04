import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISmsGateway } from '../../../domain/gateways/sms.gateway';
import { MockSmsAdapter } from './mock-sms.adapter';
import { TwilioSmsAdapter } from './twilio-sms.adapter';
import { AfricasTalkingSmsAdapter } from './africas-talking.adapter';
import { SmsProviderType } from '../../../../../config/providers.config';

/**
 * SMS Gateway Factory
 *
 * Creates the appropriate SMS adapter based on configuration.
 * Supports: mock, twilio, africas_talking
 */
@Injectable()
export class SmsFactory {
  private readonly logger = new Logger(SmsFactory.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Creates an SMS gateway instance based on the configured provider
   */
  create(): ISmsGateway {
    const provider =
      (this.configService.get<string>('sms.provider') as SmsProviderType) ||
      'mock';

    this.logger.log(`Creating SMS gateway with provider: ${provider}`);

    if (provider === 'mock' && this.isProductionLike()) {
      throw new Error(
        'SMS_PROVIDER=mock is not allowed in production-like environments',
      );
    }

    switch (provider) {
      case 'twilio':
        return new TwilioSmsAdapter(this.configService);

      case 'africas_talking':
        return new AfricasTalkingSmsAdapter(this.configService);

      case 'mock':
      default:
        return new MockSmsAdapter();
    }
  }

  /**
   * Get the current provider type
   */
  getProviderType(): SmsProviderType {
    return (
      (this.configService.get<string>('sms.provider') as SmsProviderType) ||
      'mock'
    );
  }

  /**
   * Check if using mock mode
   */
  isMockMode(): boolean {
    return this.getProviderType() === 'mock';
  }

  private isProductionLike(): boolean {
    const nodeEnv =
      this.configService.get<string>('nodeEnv') ||
      this.configService.get<string>('NODE_ENV') ||
      process.env.NODE_ENV ||
      'development';

    return ['production', 'staging'].includes(nodeEnv);
  }
}

/**
 * Factory function for NestJS module provider
 */
export function createSmsGateway(factory: SmsFactory): ISmsGateway {
  return factory.create();
}
