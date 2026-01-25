import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from '@modules/user/infrastructure/orm-entities';
import { TransactionOrmEntity } from '@modules/transaction/infrastructure/orm-entities/transaction.orm-entity';
import { TransactionRepository } from '@modules/transaction/infrastructure/repositories/transaction.repository';
import { TransactionMapper } from '@modules/transaction/infrastructure/mappers/transaction.mapper';
import { AuditLogEntity } from './infrastructure/persistence/typeorm/entities/audit-log.entity';
import { SystemMetricEntity } from './infrastructure/persistence/typeorm/entities/system-metric.entity';
import { ScheduledJobEntity } from './infrastructure/persistence/typeorm/entities/scheduled-job.entity';
import { AdminController } from './application/controllers/admin.controller';
import { AdminService } from './application/services/admin.service';
import { AuditService } from './application/services/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserOrmEntity,
      TransactionOrmEntity,
      AuditLogEntity,
      SystemMetricEntity,
      ScheduledJobEntity,
    ]),
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AuditService,
    TransactionRepository,
    TransactionMapper,
  ],
  exports: [AdminService, AuditService],
})
export class AdminModule {}
