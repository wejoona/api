import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionOrmEntity } from '@modules/transaction/infrastructure/orm-entities';
import { ScheduledJobEntity } from '@modules/admin/infrastructure/persistence/typeorm/entities/scheduled-job.entity';
import { AuditLogEntity } from '@modules/admin/infrastructure/persistence/typeorm/entities/audit-log.entity';
import { FcmTokenOrmEntity } from '@modules/notification/infrastructure/fcm';
import { NotificationOrmEntity } from '@modules/notification/infrastructure/orm-entities';
import { SessionModule } from '@modules/session/session.module';
import { ScheduledJobsService } from './services/scheduled-jobs.service';
import { CronHubReporterService } from '@common/services/cronhub-reporter.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionOrmEntity,
      ScheduledJobEntity,
      AuditLogEntity,
      FcmTokenOrmEntity,
      NotificationOrmEntity,
    ]),
    SessionModule,
  ],
  providers: [ScheduledJobsService, CronHubReporterService],
  exports: [ScheduledJobsService],
})
export class JobsModule {}
