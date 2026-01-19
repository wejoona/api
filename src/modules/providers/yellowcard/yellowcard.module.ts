import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ONRAMP_PROVIDER_CI, OFFRAMP_PROVIDER_CI } from '../interfaces';
import { YellowCardOnRampAdapter, YellowCardOffRampAdapter } from './adapters';

/**
 * Yellow Card Provider Module
 *
 * Provides on-ramp and off-ramp services for Ivory Coast / UEMOA region.
 * - On-ramp: XOF (Mobile Money) → USDC
 * - Off-ramp: USDC → XOF (Mobile Money)
 *
 * Yellow Card is ONLY used for fiat conversion, not for wallets or transfers.
 * Circle handles all wallet and transfer operations.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // Adapter instances
    YellowCardOnRampAdapter,
    YellowCardOffRampAdapter,

    // Bind to provider symbols for Ivory Coast
    {
      provide: ONRAMP_PROVIDER_CI,
      useExisting: YellowCardOnRampAdapter,
    },
    {
      provide: OFFRAMP_PROVIDER_CI,
      useExisting: YellowCardOffRampAdapter,
    },
  ],
  exports: [
    ONRAMP_PROVIDER_CI,
    OFFRAMP_PROVIDER_CI,
    YellowCardOnRampAdapter,
    YellowCardOffRampAdapter,
  ],
})
export class YellowCardModule {}
