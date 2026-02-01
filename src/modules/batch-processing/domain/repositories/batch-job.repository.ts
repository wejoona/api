import {
  BatchJob,
  BatchJobStatus,
  BatchJobType,
} from '../entities/batch-job.entity';

export interface BatchJobFilters {
  userId?: string;
  organizationId?: string;
  type?: BatchJobType;
  status?: BatchJobStatus;
  createdAfter?: Date;
  createdBefore?: Date;
}

export abstract class BatchJobRepository {
  abstract findById(id: string): Promise<BatchJob | null>;
  abstract findByUserId(userId: string): Promise<BatchJob[]>;
  abstract findByFilters(filters: BatchJobFilters): Promise<BatchJob[]>;
  abstract findPendingJobs(limit?: number): Promise<BatchJob[]>;
  abstract findStuckJobs(thresholdMinutes: number): Promise<BatchJob[]>;
  abstract save(batchJob: BatchJob): Promise<BatchJob>;
  abstract update(batchJob: BatchJob): Promise<BatchJob>;
  abstract delete(id: string): Promise<void>;
  abstract countByStatus(status: BatchJobStatus): Promise<number>;
  abstract getJobMetrics(userId?: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }>;
}
