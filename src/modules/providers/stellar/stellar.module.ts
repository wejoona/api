/**
 * Stellar Provider Module
 *
 * Provides wallet, transfer, on-ramp, and off-ramp services via Stellar blockchain.
 * Implements SEP-10 (authentication) and SEP-24 (interactive deposits/withdrawals).
 *
 * Configuration:
 * - STELLAR_NETWORK: 'testnet' or 'mainnet'
 * - STELLAR_HORIZON_URL: Horizon server URL
 * - STELLAR_USDC_ISSUER: USDC asset issuer public key
 * - STELLAR_ANCHOR_DOMAIN: Domain for SEP-24 services
 * - STELLAR_USE_MOCK: Use mock mode for testing
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  WALLET_PROVIDER,
  TRANSFER_PROVIDER,
  ONRAMP_PROVIDER,
  OFFRAMP_PROVIDER,
} from '../interfaces';
import {
  StellarProviderFactory,
  createStellarWalletProvider,
  createStellarTransferProvider,
  createStellarOnRampProvider,
  createStellarOffRampProvider,
} from './stellar.factory';
import { StellarHorizonService } from './services/stellar-horizon.service';
import { StellarRpcService } from './services/stellar-rpc.service';
import { StellarSep10Service } from './services/stellar-sep10.service';
import { StellarSep24Service } from './services/stellar-sep24.service';
import stellarConfig from './stellar.config';

/**
 * Provider tokens for Stellar-specific injection
 * Use these when you need Stellar specifically (not generic interfaces)
 */
export const STELLAR_WALLET_PROVIDER = Symbol('STELLAR_WALLET_PROVIDER');
export const STELLAR_TRANSFER_PROVIDER = Symbol('STELLAR_TRANSFER_PROVIDER');
export const STELLAR_ONRAMP_PROVIDER = Symbol('STELLAR_ONRAMP_PROVIDER');
export const STELLAR_OFFRAMP_PROVIDER = Symbol('STELLAR_OFFRAMP_PROVIDER');

/**
 * Stellar Provider Module
 *
 * Provides Stellar blockchain integration for:
 * - Wallet management (keypair generation, balance queries)
 * - USDC transfers (on-chain payments)
 * - Deposits (SEP-24 interactive fiat → USDC)
 * - Withdrawals (SEP-24 interactive USDC → fiat)
 *
 * Note: This module is NOT marked as @Global() because:
 * 1. Circle is the primary provider for most operations
 * 2. Stellar is an alternative/addition for specific use cases
 * 3. Import StellarModule explicitly where needed
 *
 * To use Stellar as the primary provider, either:
 * - Import this module in AppModule after CircleModule
 * - Or export WALLET_PROVIDER etc. and they'll override Circle
 */
@Module({
  imports: [
    ConfigModule.forFeature(stellarConfig),
  ],
  providers: [
    // Core services — both Stellar backends registered; factory selects active one
    StellarHorizonService,
    StellarRpcService,
    StellarSep10Service,
    StellarSep24Service,

    // Factory for creating providers
    StellarProviderFactory,

    // Stellar-specific providers (use STELLAR_* tokens)
    {
      provide: STELLAR_WALLET_PROVIDER,
      useFactory: createStellarWalletProvider,
      inject: [StellarProviderFactory],
    },
    {
      provide: STELLAR_TRANSFER_PROVIDER,
      useFactory: createStellarTransferProvider,
      inject: [StellarProviderFactory],
    },
    {
      provide: STELLAR_ONRAMP_PROVIDER,
      useFactory: createStellarOnRampProvider,
      inject: [StellarProviderFactory],
    },
    {
      provide: STELLAR_OFFRAMP_PROVIDER,
      useFactory: createStellarOffRampProvider,
      inject: [StellarProviderFactory],
    },

    // Uncomment below to use Stellar as default provider (overrides Circle)
    // {
    //   provide: WALLET_PROVIDER,
    //   useFactory: createStellarWalletProvider,
    //   inject: [StellarProviderFactory],
    // },
    // {
    //   provide: TRANSFER_PROVIDER,
    //   useFactory: createStellarTransferProvider,
    //   inject: [StellarProviderFactory],
    // },
    // {
    //   provide: ONRAMP_PROVIDER,
    //   useFactory: createStellarOnRampProvider,
    //   inject: [StellarProviderFactory],
    // },
    // {
    //   provide: OFFRAMP_PROVIDER,
    //   useFactory: createStellarOffRampProvider,
    //   inject: [StellarProviderFactory],
    // },
  ],
  exports: [
    // Services (for direct use)
    StellarHorizonService,
    StellarRpcService,
    StellarSep10Service,
    StellarSep24Service,
    StellarProviderFactory,

    // Stellar-specific providers
    STELLAR_WALLET_PROVIDER,
    STELLAR_TRANSFER_PROVIDER,
    STELLAR_ONRAMP_PROVIDER,
    STELLAR_OFFRAMP_PROVIDER,
  ],
})
export class StellarModule {}
