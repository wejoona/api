import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectQueue, Processor, Process } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { BatchJob, BatchJobType } from '../../domain/entities/batch-job.entity';
import { BatchJobRepository } from '../../domain/repositories/batch-job.repository';
import { BulkKycProcessor } from '../processors/bulk-kyc.processor';
import { MassNotificationProcessor } from '../processors/mass-notification.processor';
import { ScheduledReportProcessor } from '../processors/scheduled-report.processor';
import { DataExportProcessor } from '../processors/data-export.processor';
import { IBatchProcessor } from '../../domain/interfaces/batch-processor.interface';

export const BATCH_QUEUE_NAME = 'batch-processing';

@Injectable()
@Processor(BATCH_QUEUE_NAME)
export class BatchQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BatchQueueService.name);
  private processors: Map<BatchJobType, IBatchProcessor> = new Map();

  constructor(
    @InjectQueue(BATCH_QUEUE_NAME) private readonly batchQueue: Queue,
    private readonly batchJobRepository: BatchJobRepository,
    private readonly bulkKycProcessor: BulkKycProcessor,
    private readonly massNotificationProcessor: MassNotificationProcessor,
    private readonly scheduledReportProcessor: ScheduledReportProcessor,
    private readonly dataExportProcessor: DataExportProcessor,
  ) {}

  onModuleInit() {
    // Register processors
    this.processors.set(BatchJobType.BULK_KYC, this.bulkKycProcessor);
    this.processors.set(
      BatchJobType.MASS_NOTIFICATION,
      this.massNotificationProcessor,
    );
    this.processors.set(
      BatchJobType.SCHEDULED_REPORT,
      this.scheduledReportProcessor,
    );
    this.processors.set(BatchJobType.DATA_EXPORT, this.dataExportProcessor);

    this.logger.log('Batch queue service initialized with processors');
  }

  async onModuleDestroy(): Promise<void> {
    await this.batchQueue.close();
    this.logger.log('Batch queue closed');
  }

  async addJob(batchJob: BatchJob, delay = 0): Promise<void> {
    try {
      const queuedJob = batchJob.queue();
      await this.batchJobRepository.update(queuedJob);

      await this.batchQueue.add(
        batchJob.type,
        {
          batchJobId: batchJob.id,
          type: batchJob.type,
          userId: batchJob.userId,
        },
        {
          jobId: batchJob.id,
          priority: batchJob.priority,
          delay,
          attempts: batchJob.maxRetries,
          backoff: {
            type: 'exponential',
            delay: 5000, // Start with 5 seconds
          },
          removeOnComplete: false, // Keep completed jobs for audit
          removeOnFail: false,
        },
      );

      this.logger.log(
        `Job ${batchJob.id} added to queue with type ${batchJob.type}`,
      );
    } catch (error) {
      this.logger.error(`Failed to add job to queue: ${error.message}`);
      throw error;
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = await this.batchQueue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Job ${jobId} removed from queue`);
    }
  }

  async getQueueMetrics(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.batchQueue.getWaitingCount(),
      this.batchQueue.getActiveCount(),
      this.batchQueue.getCompletedCount(),
      this.batchQueue.getFailedCount(),
      this.batchQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async pauseQueue(): Promise<void> {
    await this.batchQueue.pause();
    this.logger.log('Queue paused');
  }

  async resumeQueue(): Promise<void> {
    await this.batchQueue.resume();
    this.logger.log('Queue resumed');
  }

  async cleanQueue(grace = 3600000): Promise<void> {
    // Clean completed jobs older than 1 hour by default
    await this.batchQueue.clean(grace, 'completed');
    await this.batchQueue.clean(grace, 'failed');
    this.logger.log('Queue cleaned');
  }

  @Process()
  async processJob(job: Job): Promise<void> {
    const { batchJobId } = job.data;

    this.logger.log(`Processing job ${batchJobId} (Queue ID: ${job.id})`);

    try {
      // Fetch batch job from database
      let batchJob = await this.batchJobRepository.findById(batchJobId);
      if (!batchJob) {
        throw new Error(`Batch job ${batchJobId} not found`);
      }

      // Mark as processing
      batchJob = batchJob.start();
      await this.batchJobRepository.update(batchJob);

      // Get appropriate processor
      const processor = this.processors.get(batchJob.type);
      if (!processor) {
        throw new Error(`No processor found for job type: ${batchJob.type}`);
      }

      // Validate payload
      await processor.validatePayload(batchJob.payload);

      // Process the job
      const result = await processor.process(batchJob);

      // Update progress
      batchJob = batchJob.updateProgress({
        totalItems: result.processedCount,
        processedItems: result.processedCount,
        successfulItems: result.successCount,
        failedItems: result.failedCount,
        skippedItems: result.skippedCount,
      });

      // Mark as completed or partially completed
      if (result.success) {
        batchJob = batchJob.complete(result.results);
      } else if (result.failedCount > 0 && result.successCount > 0) {
        batchJob = batchJob.partiallyComplete(result.results);
      } else {
        batchJob = batchJob.fail('Job failed', { errors: result.errors });
      }

      await this.batchJobRepository.update(batchJob);

      this.logger.log(
        `Job ${batchJobId} completed: ${result.successCount} success, ${result.failedCount} failed`,
      );
    } catch (error) {
      this.logger.error(
        `Job ${batchJobId} failed: ${error.message}`,
        error.stack,
      );

      let batchJob = await this.batchJobRepository.findById(batchJobId);
      if (batchJob) {
        batchJob = batchJob.incrementRetry();

        if (!batchJob.canRetry()) {
          batchJob = batchJob.fail(error.message, { stack: error.stack });
        }

        await this.batchJobRepository.update(batchJob);
      }

      throw error; // Re-throw to let Bull handle retry logic
    }
  }
}
