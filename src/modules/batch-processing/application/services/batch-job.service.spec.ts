import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BatchJobService } from './batch-job.service';
import { BatchJobRepository } from '../../domain/repositories/batch-job.repository';
import { BatchQueueService } from '../../infrastructure/queues/batch-queue.service';
import {
  BatchJob,
  BatchJobType,
  BatchJobPriority,
  BatchJobStatus,
} from '../../domain/entities/batch-job.entity';

describe('BatchJobService', () => {
  let service: BatchJobService;
  let batchJobRepository: jest.Mocked<BatchJobRepository>;
  let batchQueueService: jest.Mocked<BatchQueueService>;

  const mockUserId = 'user-123';
  const mockBatchJob = BatchJob.create({
    type: BatchJobType.BULK_KYC,
    name: 'Test Job',
    priority: BatchJobPriority.NORMAL,
    userId: mockUserId,
    payload: { userIds: ['user-1', 'user-2'] },
    createdBy: mockUserId,
    metrics: {
      totalItems: 2,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      skippedItems: 0,
      progress: 0,
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchJobService,
        {
          provide: BatchJobRepository,
          useValue: {
            findById: jest.fn(),
            findByUserId: jest.fn(),
            findByFilters: jest.fn(),
            findPendingJobs: jest.fn(),
            findStuckJobs: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            getJobMetrics: jest.fn(),
          },
        },
        {
          provide: BatchQueueService,
          useValue: {
            addJob: jest.fn(),
            cancelJob: jest.fn(),
            getQueueMetrics: jest.fn(),
            pauseQueue: jest.fn(),
            resumeQueue: jest.fn(),
            cleanQueue: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BatchJobService>(BatchJobService);
    batchJobRepository = module.get(BatchJobRepository);
    batchQueueService = module.get(BatchQueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBatchJob', () => {
    it('should create a batch job and add to queue', async () => {
      const dto = {
        type: BatchJobType.BULK_KYC,
        name: 'Test Job',
        payload: { userIds: ['user-1', 'user-2'] },
        estimatedItemCount: 2,
      };

      batchJobRepository.save.mockResolvedValue(mockBatchJob);

      const result = await service.createBatchJob(dto, mockUserId);

      expect(result).toBeDefined();
      expect(batchJobRepository.save).toHaveBeenCalled();
      expect(batchQueueService.addJob).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should schedule job for future execution', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const dto = {
        type: BatchJobType.BULK_KYC,
        name: 'Scheduled Job',
        payload: { userIds: ['user-1'] },
        scheduledAt: futureDate.toISOString(),
      };

      batchJobRepository.save.mockResolvedValue(mockBatchJob);

      await service.createBatchJob(dto, mockUserId);

      expect(batchQueueService.addJob).toHaveBeenCalledWith(
        mockBatchJob,
        expect.any(Number),
      );
    });
  });

  describe('getBatchJob', () => {
    it('should return batch job for authorized user', async () => {
      batchJobRepository.findById.mockResolvedValue(mockBatchJob);

      const result = await service.getBatchJob(mockBatchJob.id, mockUserId);

      expect(result).toEqual(mockBatchJob);
      expect(batchJobRepository.findById).toHaveBeenCalledWith(mockBatchJob.id);
    });

    it('should throw NotFoundException if job not found', async () => {
      batchJobRepository.findById.mockResolvedValue(null);

      await expect(
        service.getBatchJob('non-existent-id', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user not authorized', async () => {
      batchJobRepository.findById.mockResolvedValue(mockBatchJob);

      await expect(
        service.getBatchJob(mockBatchJob.id, 'different-user-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelBatchJob', () => {
    it('should cancel batch job', async () => {
      batchJobRepository.findById.mockResolvedValue(mockBatchJob);
      const cancelledJob = mockBatchJob.cancel();
      batchJobRepository.update.mockResolvedValue(cancelledJob);

      const result = await service.cancelBatchJob(mockBatchJob.id, mockUserId);

      expect(result.status).toBe(BatchJobStatus.CANCELLED);
      expect(batchQueueService.cancelJob).toHaveBeenCalledWith(mockBatchJob.id);
      expect(batchJobRepository.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if job already completed', async () => {
      const completedJob = mockBatchJob.complete();
      batchJobRepository.findById.mockResolvedValue(completedJob);

      await expect(
        service.cancelBatchJob(mockBatchJob.id, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteBatchJob', () => {
    it('should delete completed batch job', async () => {
      const completedJob = mockBatchJob.complete();
      batchJobRepository.findById.mockResolvedValue(completedJob);

      await service.deleteBatchJob(mockBatchJob.id, mockUserId);

      expect(batchJobRepository.delete).toHaveBeenCalledWith(mockBatchJob.id);
    });

    it('should throw BadRequestException if job not completed', async () => {
      batchJobRepository.findById.mockResolvedValue(mockBatchJob);

      await expect(
        service.deleteBatchJob(mockBatchJob.id, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getJobMetrics', () => {
    it('should return job metrics', async () => {
      const mockMetrics = {
        total: 10,
        pending: 2,
        processing: 1,
        completed: 6,
        failed: 1,
      };

      batchJobRepository.getJobMetrics.mockResolvedValue(mockMetrics);

      const result = await service.getJobMetrics(mockUserId);

      expect(result).toEqual(mockMetrics);
      expect(batchJobRepository.getJobMetrics).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('getQueueMetrics', () => {
    it('should return queue metrics', async () => {
      const mockMetrics = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      };

      batchQueueService.getQueueMetrics.mockResolvedValue(mockMetrics);

      const result = await service.getQueueMetrics();

      expect(result).toEqual(mockMetrics);
    });
  });

  describe('processPendingJobs', () => {
    it('should queue pending jobs', async () => {
      const pendingJobs = [mockBatchJob];
      batchJobRepository.findPendingJobs.mockResolvedValue(pendingJobs);

      await service.processPendingJobs();

      expect(batchJobRepository.findPendingJobs).toHaveBeenCalledWith(10);
      expect(batchQueueService.addJob).toHaveBeenCalledWith(mockBatchJob);
    });

    it('should handle errors gracefully', async () => {
      batchJobRepository.findPendingJobs.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.processPendingJobs()).resolves.not.toThrow();
    });
  });

  describe('handleStuckJobs', () => {
    it('should retry stuck jobs that can be retried', async () => {
      const stuckJob = mockBatchJob.start();
      batchJobRepository.findStuckJobs.mockResolvedValue([stuckJob]);

      await service.handleStuckJobs();

      expect(batchJobRepository.findStuckJobs).toHaveBeenCalledWith(30);
      expect(batchQueueService.addJob).toHaveBeenCalledWith(stuckJob);
    });

    it('should fail stuck jobs that exceed max retries', async () => {
      const stuckJob = BatchJob.fromPersistence({
        ...mockBatchJob,
        retryCount: 3,
        maxRetries: 3,
      });
      batchJobRepository.findStuckJobs.mockResolvedValue([stuckJob]);

      await service.handleStuckJobs();

      expect(batchJobRepository.update).toHaveBeenCalled();
    });
  });
});
