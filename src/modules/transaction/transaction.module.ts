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

// Other modules
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionOrmEntity]),
    CqrsModule,
    forwardRef(() => WalletModule),
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
  ],
  controllers: [TransactionController],
  exports: [
    TransactionRepository,
    TransactionSearchService,
    ReconciliationService,
  ],
})
export class TransactionModule {}
