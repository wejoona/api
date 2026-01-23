import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IIdentityProvider, IWalletProvider, ITransferProvider } from '../interfaces';
import { CircleIdentityAdapter } from './adapters/circle-identity.adapter';
import { CircleWalletAdapter } from './adapters/circle-wallet.adapter';
import { CircleTransferAdapter } from './adapters/circle-transfer.adapter';
import {
  MockCircleIdentityAdapter,
  MockCircleWalletAdapter,
  MockCircleTransferAdapter,
} from '../mock';

/**
 * Circle Provider Factory
 *
 * Creates the appropriate Circle adapter (mock or real) based on configuration.
 * Configuration: CIRCLE_USE_MOCK env var or absence of CIRCLE_API_KEY
 */
@Injectable()
export class CircleProviderFactory {
  private readonly logger = new Logger(CircleProviderFactory.name);
  private readonly useMock: boolean;

  constructor(private readonly configService: ConfigService) {
    this.useMock =
      this.configService.get<boolean>('circle.useMock') ??
      !this.configService.get<string>('circle.apiKey');

    this.logger.log(
      `Circle Provider Factory initialized (mock mode: ${this.useMock})`,
    );
  }

  /**
   * Creates an identity provider instance
   */
  createIdentityProvider(): IIdentityProvider {
    if (this.useMock) {
      return new MockCircleIdentityAdapter();
    }
    return new CircleIdentityAdapter(this.configService);
  }

  /**
   * Creates a wallet provider instance
   */
  createWalletProvider(): IWalletProvider {
    if (this.useMock) {
      return new MockCircleWalletAdapter();
    }
    return new CircleWalletAdapter(this.configService);
  }

  /**
   * Creates a transfer provider instance
   */
  createTransferProvider(): ITransferProvider {
    if (this.useMock) {
      return new MockCircleTransferAdapter();
    }
    return new CircleTransferAdapter(this.configService);
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
export function createCircleIdentityProvider(
  factory: CircleProviderFactory,
): IIdentityProvider {
  return factory.createIdentityProvider();
}

export function createCircleWalletProvider(
  factory: CircleProviderFactory,
): IWalletProvider {
  return factory.createWalletProvider();
}

export function createCircleTransferProvider(
  factory: CircleProviderFactory,
): ITransferProvider {
  return factory.createTransferProvider();
}
