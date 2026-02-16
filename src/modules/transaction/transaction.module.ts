import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';

// ORM Entities
import { TransactionOrmEntity } from './infrastructure/orm-entities/transaction.orm-entity';

// Repositories
import { TransactionRepository } from './infrastructure/repositories/transaction.repository';

// Mappers
import { TransactionMapper } from './infrastructure/mappers/transaction.mapper';

// Use Cases
import {
  GetTransactionsUseCase,
  GetTransactionUseCase,
  GetDepositStatusUseCase,
} from './application/usecases';

// Domain Services
import {
  ReconciliationService,
  TransactionSearchService,
} from './application/domain/services';

// Controllers
import { TransactionController } from './application/controllers/transaction.controller';
import { ReconciliationController } from './application/controllers/reconciliation.controller';

// Event Listeners
import { ReconciliationAlertListener } from './application/domain/events/reconciliation-alert.listener';

// Other modules
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionOrmEntity]),
    CqrsModule,
    forwardRef(() => WalletModule),
    NotificationsModule,
    // Note: BlnkModule and CircleModule are @Global() so providers
    // (RECONCILIATION_PROVIDER, LEDGER_PROVIDER, WALLET_PROVIDER) are available
  ],
  providers: [
    // Repositories
    TransactionRepository,
    // Mappers
    TransactionMapper,
    // Use Cases
    GetTransactionsUseCase,
    GetTransactionUseCase,
    GetDepositStatusUseCase,
    // Domain Services
    ReconciliationService,
    TransactionSearchService,
    // Event Listeners
    ReconciliationAlertListener,
  ],
  controllers: [TransactionController, ReconciliationController],
  exports: [
    TransactionRepository,
    TransactionSearchService,
    ReconciliationService,
    GetDepositStatusUseCase,
  ],
})
export class TransactionModule {}
