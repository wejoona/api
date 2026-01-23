import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPushGateway } from '../../../domain/gateways/push.gateway';
import { MockPushAdapter } from './mock-push.adapter';
import { FcmPushAdapter } from './fcm-push.adapter';
import { PushProviderType } from '../../../../../config/providers.config';

/**
 * Push Gateway Factory
 *
 * Creates the appropriate Push adapter based on configuration.
 * Supports: mock, fcm
 */
@Injectable()
export class PushFactory {
  private readonly logger = new Logger(PushFactory.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Creates a Push gateway instance based on the configured provider
   */
  create(): IPushGateway {
    const useMock = this.configService.get<boolean>('fcm.useMock') ?? true;
    const projectId = this.configService.get<string>('fcm.projectId');

    const provider: PushProviderType = useMock || !projectId ? 'mock' : 'fcm';

    this.logger.log(`Creating Push gateway with provider: ${provider}`);

    switch (provider) {
      case 'fcm':
        return new FcmPushAdapter(this.configService);

      case 'mock':
      default:
        return new MockPushAdapter();
    }
  }

  /**
   * Get the current provider type
   */
  getProviderType(): PushProviderType {
    const useMock = this.configService.get<boolean>('fcm.useMock') ?? true;
    const projectId = this.configService.get<string>('fcm.projectId');
    return useMock || !projectId ? 'mock' : 'fcm';
  }

  /**
   * Check if using mock mode
   */
  isMockMode(): boolean {
    return this.getProviderType() === 'mock';
  }
}

/**
 * Factory function for NestJS module provider
 */
export function createPushGateway(factory: PushFactory): IPushGateway {
  return factory.create();
}
