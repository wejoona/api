import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionOrmEntity } from '@modules/transaction/infrastructure/orm-entities';
import { ScheduledJobEntity } from '@modules/admin/infrastructure/persistence/typeorm/entities/scheduled-job.entity';
import { AuditLogEntity } from '@modules/admin/infrastructure/persistence/typeorm/entities/audit-log.entity';
import { ScheduledJobsService } from './services/scheduled-jobs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionOrmEntity,
      ScheduledJobEntity,
      AuditLogEntity,
    ]),
  ],
  providers: [ScheduledJobsService],
  exports: [ScheduledJobsService],
})
export class JobsModule {}
