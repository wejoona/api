import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  IDENTITY_PROVIDER,
  WALLET_PROVIDER,
  TRANSFER_PROVIDER,
} from '../interfaces';
import {
  CircleProviderFactory,
  createCircleIdentityProvider,
  createCircleWalletProvider,
  createCircleTransferProvider,
} from './circle.factory';

/**
 * Circle Provider Module
 *
 * Provides identity, wallet, and transfer services via Circle Programmable Wallets.
 * Uses factory pattern to switch between mock and real implementations based on config.
 *
 * Configuration:
 * - CIRCLE_USE_MOCK=true or absence of CIRCLE_API_KEY: Uses mock adapters
 * - CIRCLE_API_KEY present: Uses real Circle API
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // Factory for creating providers
    CircleProviderFactory,

    // Identity Provider (factory-based)
    {
      provide: IDENTITY_PROVIDER,
      useFactory: createCircleIdentityProvider,
      inject: [CircleProviderFactory],
    },

    // Wallet Provider (factory-based)
    {
      provide: WALLET_PROVIDER,
      useFactory: createCircleWalletProvider,
      inject: [CircleProviderFactory],
    },

    // Transfer Provider (factory-based)
    {
      provide: TRANSFER_PROVIDER,
      useFactory: createCircleTransferProvider,
      inject: [CircleProviderFactory],
    },
  ],
  exports: [
    IDENTITY_PROVIDER,
    WALLET_PROVIDER,
    TRANSFER_PROVIDER,
    CircleProviderFactory,
  ],
})
export class CircleModule {}
