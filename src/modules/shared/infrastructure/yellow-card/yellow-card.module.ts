import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { YellowCardAuthService } from './yellow-card-auth.service';
import { YellowCardRatesService } from './yellow-card-rates.service';
import { YellowCardPaymentsService } from './yellow-card-payments.service';
import { YellowCardChannelsService } from './yellow-card-channels.service';
import { YellowCardWebhooksService } from './yellow-card-webhooks.service';
import { YellowCardService } from './yellow-card.service';

/**
 * Yellow Card Module
 * Provides Yellow Card payment gateway services
 *
 * Services are split by responsibility:
 * - YellowCardAuthService: Authentication and HTTP requests
 * - YellowCardRatesService: Exchange rate operations
 * - YellowCardPaymentsService: Subwallets, deposits, transfers
 * - YellowCardChannelsService: Payment channel management
 * - YellowCardWebhooksService: Webhook verification
 * - YellowCardService: Facade that delegates to specialized services
 */
@Module({
  imports: [ConfigModule],
  providers: [
    YellowCardAuthService,
    YellowCardRatesService,
    YellowCardPaymentsService,
    YellowCardChannelsService,
    YellowCardWebhooksService,
    YellowCardService,
  ],
  exports: [
    YellowCardAuthService,
    YellowCardRatesService,
    YellowCardPaymentsService,
    YellowCardChannelsService,
    YellowCardWebhooksService,
    YellowCardService,
  ],
})
export class YellowCardModule {}
