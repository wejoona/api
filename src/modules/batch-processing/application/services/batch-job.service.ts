import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  BatchJobRepository,
  BatchJobFilters,
} from '../../domain/repositories/batch-job.repository';
import {
  BatchJob,
  BatchJobPriority,
} from '../../domain/entities/batch-job.entity';
import { BatchQueueService } from '../../infrastructure/queues/batch-queue.service';
import { CreateBatchJobDto } from '../dto/create-batch-job.dto';
import { UpdateBatchJobDto } from '../dto/update-batch-job.dto';

@Injectable()
export class BatchJobService {
  private readonly logger = new Logger(BatchJobService.name);

  constructor(
    private readonly batchJobRepository: BatchJobRepository,
    private readonly batchQueueService: BatchQueueService,
  ) {}

  async createBatchJob(
    dto: CreateBatchJobDto,
    userId: string,
  ): Promise<BatchJob> {
    this.logger.log(
      `Creating batch job of type ${dto.type} for user ${userId}`,
    );

    const batchJob = BatchJob.create({
      type: dto.type,
      name: dto.name,
      description: dto.description,
      priority: dto.priority || BatchJobPriority.NORMAL,
      userId,
      organizationId: dto.organizationId,
      payload: dto.payload,
      config: dto.config,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      maxRetries: dto.maxRetries || 3,
      createdBy: userId,
      metrics: {
        totalItems: dto.estimatedItemCount || 0,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        skippedItems: 0,
        progress: 0,
      },
    });

    const saved = await this.batchJobRepository.save(batchJob);

    // Add to queue
    const delay = dto.scheduledAt
      ? new Date(dto.scheduledAt).getTime() - Date.now()
      : 0;

    if (delay > 0) {
      await this.batchQueueService.addJob(saved, delay);
    } else {
      await this.batchQueueService.addJob(saved);
    }

    return saved;
  }

  async getBatchJob(id: string, userId: string): Promise<BatchJob> {
    const batchJob = await this.batchJobRepository.findById(id);

    if (!batchJob) {
      throw new NotFoundException(`Batch job ${id} not found`);
    }

    if (batchJob.userId !== userId) {
      throw new BadRequestException('Access denied');
    }

    return batchJob;
  }

  async getUserBatchJobs(userId: string): Promise<BatchJob[]> {
    return this.batchJobRepository.findByUserId(userId);
  }

  async getBatchJobsByFilters(filters: BatchJobFilters): Promise<BatchJob[]> {
    return this.batchJobRepository.findByFilters(filters);
  }

  async updateBatchJob(
    id: string,
    dto: UpdateBatchJobDto,
    userId: string,
  ): Promise<BatchJob> {
    let batchJob = await this.getBatchJob(id, userId);

    if (batchJob.isCompleted()) {
      throw new BadRequestException('Cannot update completed job');
    }

    // Only allow updating certain fields
    if (dto.name) {
      batchJob = BatchJob.fromPersistence({
        ...batchJob,
        name: dto.name,
      });
    }

    if (dto.description !== undefined) {
      batchJob = BatchJob.fromPersistence({
        ...batchJob,
        description: dto.description,
      });
    }

    return this.batchJobRepository.update(batchJob);
  }

  async cancelBatchJob(id: string, userId: string): Promise<BatchJob> {
    let batchJob = await this.getBatchJob(id, userId);

    if (batchJob.isCompleted()) {
      throw new BadRequestException('Cannot cancel completed job');
    }

    batchJob = batchJob.cancel();
    await this.batchQueueService.cancelJob(id);

    return this.batchJobRepository.update(batchJob);
  }

  async deleteBatchJob(id: string, userId: string): Promise<void> {
    const batchJob = await this.getBatchJob(id, userId);

    if (!batchJob.isCompleted()) {
      throw new BadRequestException('Can only delete completed jobs');
    }

    await this.batchJobRepository.delete(id);
  }

  async getJobMetrics(userId?: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    return this.batchJobRepository.getJobMetrics(userId);
  }

  async getQueueMetrics(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    return this.batchQueueService.getQueueMetrics();
  }

  // Scheduled task to process pending jobs
  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingJobs(): Promise<void> {
    try {
      const pendingJobs = await this.batchJobRepository.findPendingJobs(10);

      if (pendingJobs.length > 0) {
        this.logger.log(`Processing ${pendingJobs.length} pending jobs`);

        for (const job of pendingJobs) {
          try {
            await this.batchQueueService.addJob(job);
          } catch (error) {
            this.logger.error(
              `Failed to queue job ${job.id}: ${error.message}`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error processing pending jobs: ${error.message}`);
    }
  }

  // Scheduled task to handle stuck jobs
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleStuckJobs(): Promise<void> {
    try {
      const stuckJobs = await this.batchJobRepository.findStuckJobs(30); // 30 minutes

      if (stuckJobs.length > 0) {
        this.logger.warn(`Found ${stuckJobs.length} stuck jobs`);

        for (const job of stuckJobs) {
          if (job.canRetry()) {
            this.logger.log(`Retrying stuck job ${job.id}`);
            await this.batchQueueService.addJob(job);
          } else {
            this.logger.warn(`Marking stuck job ${job.id} as failed`);
            const failedJob = job.fail('Job stuck in processing state');
            await this.batchJobRepository.update(failedJob);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error handling stuck jobs: ${error.message}`);
    }
  }

  // Scheduled task to clean old completed jobs
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanOldJobs(): Promise<void> {
    try {
      this.logger.log('Cleaning old completed jobs from queue');
      await this.batchQueueService.cleanQueue(24 * 60 * 60 * 1000); // 24 hours
    } catch (error) {
      this.logger.error(`Error cleaning old jobs: ${error.message}`);
    }
  }
}
