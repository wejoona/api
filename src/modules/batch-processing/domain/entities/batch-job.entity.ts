import { v4 as uuidv4 } from 'uuid';

export enum BatchJobType {
  BULK_KYC = 'bulk_kyc',
  MASS_NOTIFICATION = 'mass_notification',
  SCHEDULED_REPORT = 'scheduled_report',
  DATA_EXPORT = 'data_export',
  BULK_TRANSACTION = 'bulk_transaction',
  USER_MIGRATION = 'user_migration',
}

export enum BatchJobStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PARTIALLY_COMPLETED = 'partially_completed',
}

export enum BatchJobPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 15,
}

export interface BatchJobMetrics {
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  skippedItems: number;
  progress: number;
  estimatedTimeRemaining?: number;
}

export interface BatchJobProps {
  id?: string;
  type: BatchJobType;
  name: string;
  description?: string;
  status: BatchJobStatus;
  priority: BatchJobPriority;
  userId: string;
  organizationId?: string;

  // Payload and configuration
  payload: Record<string, any>;
  config?: Record<string, any>;

  // Metrics
  metrics: BatchJobMetrics;

  // Scheduling
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Error handling
  errorMessage?: string;
  errorDetails?: Record<string, any>;
  retryCount?: number;
  maxRetries?: number;

  // Results
  results?: Record<string, any>;
  resultFileUrl?: string;

  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
  createdBy: string;
}

export class BatchJob {
  readonly id: string;
  readonly type: BatchJobType;
  readonly name: string;
  readonly description?: string;
  readonly status: BatchJobStatus;
  readonly priority: BatchJobPriority;
  readonly userId: string;
  readonly organizationId?: string;

  readonly payload: Record<string, any>;
  readonly config?: Record<string, any>;

  readonly metrics: BatchJobMetrics;

  readonly scheduledAt?: Date;
  readonly startedAt?: Date;
  readonly completedAt?: Date;

  readonly errorMessage?: string;
  readonly errorDetails?: Record<string, any>;
  readonly retryCount: number;
  readonly maxRetries: number;

  readonly results?: Record<string, any>;
  readonly resultFileUrl?: string;

  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy: string;

  private constructor(props: BatchJobProps) {
    this.id = props.id || uuidv4();
    this.type = props.type;
    this.name = props.name;
    this.description = props.description;
    this.status = props.status;
    this.priority = props.priority;
    this.userId = props.userId;
    this.organizationId = props.organizationId;
    this.payload = props.payload;
    this.config = props.config;
    this.metrics = props.metrics;
    this.scheduledAt = props.scheduledAt;
    this.startedAt = props.startedAt;
    this.completedAt = props.completedAt;
    this.errorMessage = props.errorMessage;
    this.errorDetails = props.errorDetails;
    this.retryCount = props.retryCount || 0;
    this.maxRetries = props.maxRetries || 3;
    this.results = props.results;
    this.resultFileUrl = props.resultFileUrl;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
    this.createdBy = props.createdBy;
  }

  static create(
    props: Omit<BatchJobProps, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
  ): BatchJob {
    return new BatchJob({
      ...props,
      status: BatchJobStatus.PENDING,
      metrics: props.metrics || {
        totalItems: 0,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        skippedItems: 0,
        progress: 0,
      },
    });
  }

  static fromPersistence(props: BatchJobProps): BatchJob {
    return new BatchJob(props);
  }

  // State transition methods
  queue(): BatchJob {
    return new BatchJob({
      ...this,
      status: BatchJobStatus.QUEUED,
      updatedAt: new Date(),
    });
  }

  start(): BatchJob {
    return new BatchJob({
      ...this,
      status: BatchJobStatus.PROCESSING,
      startedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  updateProgress(metrics: Partial<BatchJobMetrics>): BatchJob {
    const updatedMetrics = {
      ...this.metrics,
      ...metrics,
    };

    // Calculate progress percentage
    if (updatedMetrics.totalItems > 0) {
      updatedMetrics.progress = Math.round(
        (updatedMetrics.processedItems / updatedMetrics.totalItems) * 100,
      );
    }

    return new BatchJob({
      ...this,
      metrics: updatedMetrics,
      updatedAt: new Date(),
    });
  }

  complete(results?: Record<string, any>, resultFileUrl?: string): BatchJob {
    return new BatchJob({
      ...this,
      status: BatchJobStatus.COMPLETED,
      completedAt: new Date(),
      updatedAt: new Date(),
      results,
      resultFileUrl,
    });
  }

  fail(errorMessage: string, errorDetails?: Record<string, any>): BatchJob {
    return new BatchJob({
      ...this,
      status: BatchJobStatus.FAILED,
      errorMessage,
      errorDetails,
      completedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  partiallyComplete(
    results?: Record<string, any>,
    resultFileUrl?: string,
  ): BatchJob {
    return new BatchJob({
      ...this,
      status: BatchJobStatus.PARTIALLY_COMPLETED,
      completedAt: new Date(),
      updatedAt: new Date(),
      results,
      resultFileUrl,
    });
  }

  cancel(): BatchJob {
    return new BatchJob({
      ...this,
      status: BatchJobStatus.CANCELLED,
      completedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  incrementRetry(): BatchJob {
    return new BatchJob({
      ...this,
      retryCount: this.retryCount + 1,
      updatedAt: new Date(),
    });
  }

  canRetry(): boolean {
    return this.retryCount < this.maxRetries;
  }

  isCompleted(): boolean {
    return [
      BatchJobStatus.COMPLETED,
      BatchJobStatus.FAILED,
      BatchJobStatus.CANCELLED,
      BatchJobStatus.PARTIALLY_COMPLETED,
    ].includes(this.status);
  }

  getEstimatedTimeRemaining(): number | undefined {
    if (this.metrics.processedItems === 0) {
      return undefined;
    }

    const elapsed = this.startedAt ? Date.now() - this.startedAt.getTime() : 0;

    const itemsRemaining =
      this.metrics.totalItems - this.metrics.processedItems;
    const timePerItem = elapsed / this.metrics.processedItems;

    return Math.round((timePerItem * itemsRemaining) / 1000); // in seconds
  }
}
