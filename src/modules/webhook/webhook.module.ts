import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

// Use Cases
import { ProcessWebhookUseCase } from './application/usecases';

// Services
import { WebhookDeadletterService } from './application/domain/services/webhook-deadletter.service';

// Repositories
import { Repositories } from './infrastructure/repositories';

// ORM Entities
import { WebhookDeadletterOrmEntity } from './infrastructure/orm-entities/webhook-deadletter.orm-entity';

// Controllers
import { Controllers } from './application/controllers';

// Query and Command Handlers
import { Queries } from './application/queries';
import { CommandHandlers } from './application/commands';

// Other modules
import { TransactionModule } from '@modules/transaction/transaction.module';
import { WalletModule } from '@modules/wallet/wallet.module';
import { YellowCardModule } from '@modules/providers/yellowcard';

/**
 * Webhook Module
 *
 * Handles payment provider webhook events.
 * Failed webhooks are stored in the dead-letter queue for investigation/retry.
 *
 * Webhook events are processed and emitted via EventEmitter2:
 * - webhook.deposit.completed -> Ledger module listens and records deposit
 * - webhook.transfer.completed -> Transfer module listens and updates status
 * - webhook.withdrawal.completed -> Ledger module listens and commits withdrawal
 * - webhook.withdrawal.failed -> Ledger module listens and voids withdrawal
 * - deposit.completed, deposit.failed -> Notification module listens
 */
@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([WebhookDeadletterOrmEntity]),
    forwardRef(() => TransactionModule),
    forwardRef(() => WalletModule),
    ...(process.env.YELLOW_CARD_ENABLED === 'true' ? [YellowCardModule] : []),
  ],
  providers: [
    ProcessWebhookUseCase,
    WebhookDeadletterService,
    ...Repositories,
    ...Queries,
    ...CommandHandlers,
  ],
  controllers: [...Controllers],
  exports: [WebhookDeadletterService, ...Repositories],
})
export class WebhookModule {}
