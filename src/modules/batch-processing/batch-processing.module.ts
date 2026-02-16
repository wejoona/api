import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

// Controllers
import { BatchJobController } from './application/controllers/batch-job.controller';
import { AdminBatchJobController } from './application/controllers/admin-batch-job.controller';

// Services
import { BatchJobService } from './application/services/batch-job.service';

// Repositories
import { BatchJobRepository } from './domain/repositories/batch-job.repository';
import { TypeOrmBatchJobRepository } from './infrastructure/repositories/typeorm-batch-job.repository';

// ORM Entities
import { BatchJobOrmEntity } from './infrastructure/orm-entities/batch-job.orm-entity';
import { UserOrmEntity } from '../user/infrastructure/orm-entities/user.orm-entity';
import { TransactionOrmEntity } from '../transaction/infrastructure/orm-entities/transaction.orm-entity';

// Queue Services
import {
  BatchQueueService,
  BATCH_QUEUE_NAME,
} from './infrastructure/queues/batch-queue.service';

// Processors
import { BulkKycProcessor } from './infrastructure/processors/bulk-kyc.processor';
import { MassNotificationProcessor } from './infrastructure/processors/mass-notification.processor';
import { ScheduledReportProcessor } from './infrastructure/processors/scheduled-report.processor';
import { DataExportProcessor } from './infrastructure/processors/data-export.processor';
import { KycModule } from '../kyc/kyc.module';
import { NotificationModule } from '../notification/notification.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BatchJobOrmEntity, UserOrmEntity, TransactionOrmEntity]),
    KycModule,
    NotificationModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: BATCH_QUEUE_NAME,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
      limiter: {
        max: 10, // Process max 10 jobs
        duration: 1000, // per 1 second
      },
      settings: {
        stalledInterval: 30000, // Check for stalled jobs every 30s
        maxStalledCount: 1, // Max times a job can be stalled before being failed
      },
    }),
  ],
  controllers: [BatchJobController, AdminBatchJobController],
  providers: [
    // Services
    BatchJobService,
    BatchQueueService,

    // Processors
    BulkKycProcessor,
    MassNotificationProcessor,
    ScheduledReportProcessor,
    DataExportProcessor,

    // Repositories
    {
      provide: BatchJobRepository,
      useClass: TypeOrmBatchJobRepository,
    },
  ],
  exports: [BatchJobService, BatchJobRepository],
})
export class BatchProcessingModule {}
