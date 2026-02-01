import { BatchJob } from '../entities/batch-job.entity';

export interface BatchProcessorResult {
  success: boolean;
  processedCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors?: Array<{ item: any; error: string }>;
  results?: any;
}

export interface IBatchProcessor {
  process(job: BatchJob): Promise<BatchProcessorResult>;
  validatePayload(payload: any): Promise<boolean>;
  getEstimatedDuration(itemCount: number): number; // in seconds
}
