import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ORM Entities
import {
  RecurringTransferOrmEntity,
  RecurringTransferHistoryOrmEntity,
} from './infrastructure/orm-entities';

// Repositories
import { RecurringTransferRepository } from './domain/repositories/recurring-transfer.repository';
import { RecurringTransferHistoryRepository } from './domain/repositories/recurring-transfer-history.repository';
import {
  TypeOrmRecurringTransferRepository,
  TypeOrmRecurringTransferHistoryRepository,
} from './infrastructure/repositories';

// Mappers
import {
  RecurringTransferMapper,
  RecurringTransferHistoryMapper,
} from './infrastructure/mappers';

// Services
import { RecurringTransferService } from './application/services';

// Controllers
import { RecurringTransferController } from './application/controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecurringTransferOrmEntity,
      RecurringTransferHistoryOrmEntity,
    ]),
  ],
  controllers: [RecurringTransferController],
  providers: [
    // Mappers
    RecurringTransferMapper,
    RecurringTransferHistoryMapper,

    // Repositories
    {
      provide: RecurringTransferRepository,
      useClass: TypeOrmRecurringTransferRepository,
    },
    {
      provide: RecurringTransferHistoryRepository,
      useClass: TypeOrmRecurringTransferHistoryRepository,
    },

    // Services
    RecurringTransferService,
  ],
  exports: [RecurringTransferService, RecurringTransferRepository],
})
export class RecurringTransferModule {}
