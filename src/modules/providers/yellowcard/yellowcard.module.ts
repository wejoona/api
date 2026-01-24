import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ONRAMP_PROVIDER_CI, OFFRAMP_PROVIDER_CI } from '../interfaces';
import {
  YellowCardProviderFactory,
  createYellowCardOnRampProvider,
  createYellowCardOffRampProvider,
} from './yellowcard.factory';

/**
 * Yellow Card Provider Module
 *
 * Provides on-ramp and off-ramp services for Ivory Coast / UEMOA region.
 * - On-ramp: XOF (Mobile Money) → USDC
 * - Off-ramp: USDC → XOF (Mobile Money)
 *
 * Uses factory pattern to switch between mock and real implementations based on config.
 *
 * Configuration:
 * - YELLOW_CARD_USE_MOCK=true or absence of YELLOW_CARD_API_KEY: Uses mock adapters
 * - YELLOW_CARD_API_KEY present: Uses real Yellow Card API
 *
 * Yellow Card is ONLY used for fiat conversion, not for wallets or transfers.
 * Circle handles all wallet and transfer operations.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // Factory for creating providers
    YellowCardProviderFactory,

    // On-Ramp Provider for Ivory Coast (factory-based)
    {
      provide: ONRAMP_PROVIDER_CI,
      useFactory: createYellowCardOnRampProvider,
      inject: [YellowCardProviderFactory],
    },

    // Off-Ramp Provider for Ivory Coast (factory-based)
    {
      provide: OFFRAMP_PROVIDER_CI,
      useFactory: createYellowCardOffRampProvider,
      inject: [YellowCardProviderFactory],
    },
  ],
  exports: [ONRAMP_PROVIDER_CI, OFFRAMP_PROVIDER_CI, YellowCardProviderFactory],
})
export class YellowCardModule {}
