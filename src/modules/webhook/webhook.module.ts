import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Use Cases
import { ProcessWebhookUseCase } from './application/usecases';

// Controllers
import { WebhookController } from './application/controllers/webhook.controller';

// Other modules
import { TransactionModule } from '@modules/transaction/transaction.module';
import { WalletModule } from '@modules/wallet/wallet.module';
import { YellowCardModule } from '@modules/providers/yellowcard';

/**
 * Webhook Module
 *
 * Handles payment provider webhook events.
 * No ORM entities needed - it processes events and emits them for other modules.
 *
 * Webhook events are processed and emitted via EventEmitter2:
 * - webhook.deposit.completed -> Ledger module listens and records deposit
 * - webhook.transfer.completed -> Transfer module listens and updates status
 * - deposit.completed, deposit.failed -> Notification module listens
 */
@Module({
  imports: [
    CqrsModule,
    forwardRef(() => TransactionModule),
    forwardRef(() => WalletModule),
    YellowCardModule,
  ],
  providers: [ProcessWebhookUseCase],
  controllers: [WebhookController],
})
export class WebhookModule {}
