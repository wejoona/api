import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IOnRampProvider, IOffRampProvider } from '../interfaces';
import { YellowCardOnRampAdapter } from './adapters/yellowcard-onramp.adapter';
import { YellowCardOffRampAdapter } from './adapters/yellowcard-offramp.adapter';
import {
  MockYellowCardOnRampAdapter,
  MockYellowCardOffRampAdapter,
} from '../mock';

/**
 * Yellow Card Provider Factory
 *
 * Creates the appropriate Yellow Card adapter (mock or real) based on configuration.
 * Configuration: YELLOW_CARD_USE_MOCK env var or absence of YELLOW_CARD_API_KEY
 */
@Injectable()
export class YellowCardProviderFactory {
  private readonly logger = new Logger(YellowCardProviderFactory.name);
  private readonly useMock: boolean;

  constructor(private readonly configService: ConfigService) {
    this.useMock =
      this.configService.get<boolean>('yellowCard.useMock') ??
      !this.configService.get<string>('yellowCard.apiKey');

    this.logger.log(
      `Yellow Card Provider Factory initialized (mock mode: ${this.useMock})`,
    );
  }

  /**
   * Creates an on-ramp provider instance
   */
  createOnRampProvider(): IOnRampProvider {
    if (this.useMock) {
      return new MockYellowCardOnRampAdapter();
    }
    return new YellowCardOnRampAdapter(this.configService);
  }

  /**
   * Creates an off-ramp provider instance
   */
  createOffRampProvider(): IOffRampProvider {
    if (this.useMock) {
      return new MockYellowCardOffRampAdapter();
    }
    return new YellowCardOffRampAdapter(this.configService);
  }

  /**
   * Check if using mock mode
   */
  isMockMode(): boolean {
    return this.useMock;
  }
}

/**
 * Factory functions for NestJS module providers
 */
export function createYellowCardOnRampProvider(
  factory: YellowCardProviderFactory,
): IOnRampProvider {
  return factory.createOnRampProvider();
}

export function createYellowCardOffRampProvider(
  factory: YellowCardProviderFactory,
): IOffRampProvider {
  return factory.createOffRampProvider();
}
