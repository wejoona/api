/**
 * Stellar Provider Factory
 *
 * Creates appropriate Stellar adapters based on configuration.
 * Supports mock mode for testing and real mode for production.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IWalletProvider,
  ITransferProvider,
  IOnRampProvider,
  IOffRampProvider,
} from '../interfaces';
import { StellarWalletAdapter } from './adapters/stellar-wallet.adapter';
import { StellarTransferAdapter } from './adapters/stellar-transfer.adapter';
import { StellarOnRampAdapter } from './adapters/stellar-onramp.adapter';
import { StellarOffRampAdapter } from './adapters/stellar-offramp.adapter';
import { StellarHorizonService } from './services/stellar-horizon.service';
import { StellarSep10Service } from './services/stellar-sep10.service';
import { StellarSep24Service } from './services/stellar-sep24.service';

/**
 * Stellar Provider Factory
 *
 * Creates the appropriate Stellar adapter (mock or real) based on configuration.
 * Configuration: STELLAR_USE_MOCK env var or absence of anchor domain
 */
@Injectable()
export class StellarProviderFactory {
  private readonly logger = new Logger(StellarProviderFactory.name);
  private readonly useMock: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly horizonService: StellarHorizonService,
    private readonly sep10Service: StellarSep10Service,
    private readonly sep24Service: StellarSep24Service,
  ) {
    this.useMock =
      this.configService.get<boolean>('stellar.useMock') ?? false;

    this.logger.log(
      `Stellar Provider Factory initialized (mock mode: ${this.useMock})`,
    );
  }

  /**
   * Creates a wallet provider instance
   */
  createWalletProvider(): IWalletProvider {
    if (this.useMock) {
      // For mock mode, still use real adapter with testnet
      // Stellar testnet is free and safe for testing
      this.logger.log('Creating Stellar wallet provider (testnet mode)');
    }
    return new StellarWalletAdapter(this.configService, this.horizonService);
  }

  /**
   * Creates a transfer provider instance
   */
  createTransferProvider(): ITransferProvider {
    if (this.useMock) {
      this.logger.log('Creating Stellar transfer provider (testnet mode)');
    }
    return new StellarTransferAdapter(this.configService, this.horizonService);
  }

  /**
   * Creates an on-ramp provider instance
   */
  createOnRampProvider(): IOnRampProvider {
    if (this.useMock) {
      this.logger.log('Creating Stellar on-ramp provider (testnet mode)');
    }
    return new StellarOnRampAdapter(
      this.configService,
      this.sep10Service,
      this.sep24Service,
    );
  }

  /**
   * Creates an off-ramp provider instance
   */
  createOffRampProvider(): IOffRampProvider {
    if (this.useMock) {
      this.logger.log('Creating Stellar off-ramp provider (testnet mode)');
    }
    return new StellarOffRampAdapter(
      this.configService,
      this.sep10Service,
      this.sep24Service,
    );
  }

  /**
   * Check if using mock mode
   */
  isMockMode(): boolean {
    return this.useMock;
  }

  /**
   * Get the current network (testnet or mainnet)
   */
  getNetwork(): string {
    return this.configService.get<string>('stellar.network') || 'testnet';
  }
}

/**
 * Factory functions for NestJS module providers
 */
export function createStellarWalletProvider(
  factory: StellarProviderFactory,
): IWalletProvider {
  return factory.createWalletProvider();
}

export function createStellarTransferProvider(
  factory: StellarProviderFactory,
): ITransferProvider {
  return factory.createTransferProvider();
}

export function createStellarOnRampProvider(
  factory: StellarProviderFactory,
): IOnRampProvider {
  return factory.createOnRampProvider();
}

export function createStellarOffRampProvider(
  factory: StellarProviderFactory,
): IOffRampProvider {
  return factory.createOffRampProvider();
}
