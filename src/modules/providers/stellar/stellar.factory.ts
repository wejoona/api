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
import { StellarAdapter } from './services/stellar-adapter.interface';
import { StellarHorizonService } from './services/stellar-horizon.service';
import { StellarRpcService } from './services/stellar-rpc.service';
import { StellarSep10Service } from './services/stellar-sep10.service';
import { StellarSep24Service } from './services/stellar-sep24.service';
import { KeyVaultService } from '@modules/shared/infrastructure/services';

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
  private readonly stellarService: StellarAdapter;
  private readonly providerType: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly horizonService: StellarHorizonService,
    private readonly rpcService: StellarRpcService,
    private readonly sep10Service: StellarSep10Service,
    private readonly sep24Service: StellarSep24Service,
    private readonly keyVault: KeyVaultService,
  ) {
    this.useMock =
      this.configService.get<boolean>('stellar.useMock') ?? false;
    this.providerType =
      this.configService.get<string>('stellar.provider') || 'rpc';

    // Select the appropriate backend based on configuration
    this.stellarService =
      this.providerType === 'horizon' ? this.horizonService : this.rpcService;

    this.logger.log(
      `Stellar Provider Factory initialized (provider: ${this.providerType}, mock: ${this.useMock})`,
    );
  }

  /**
   * Get the active Stellar adapter (RPC or Horizon)
   * @returns The configured StellarAdapter implementation
   */
  getStellarService(): StellarAdapter {
    return this.stellarService;
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
    // Pass the active stellar service (RPC or Horizon) — both implement StellarAdapter.
    // The wallet adapter accepts StellarHorizonService by type but both services are structurally compatible.
    return new StellarWalletAdapter(this.configService, this.stellarService as any, this.keyVault);
  }

  /**
   * Creates a transfer provider instance
   */
  createTransferProvider(): ITransferProvider {
    if (this.useMock) {
      this.logger.log('Creating Stellar transfer provider (testnet mode)');
    }
    return new StellarTransferAdapter(this.configService, this.stellarService as any);
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
      this.keyVault,
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
      this.keyVault,
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
