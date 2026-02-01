import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  BatchJobRepository,
  BatchJobFilters,
} from '../../domain/repositories/batch-job.repository';
import {
  BatchJob,
  BatchJobStatus,
  BatchJobType,
  BatchJobPriority,
} from '../../domain/entities/batch-job.entity';
import { BatchJobOrmEntity } from '../orm-entities/batch-job.orm-entity';

@Injectable()
export class TypeOrmBatchJobRepository extends BatchJobRepository {
  constructor(
    @InjectRepository(BatchJobOrmEntity)
    private readonly repo: Repository<BatchJobOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<BatchJob | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<BatchJob[]> {
    const entities = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByFilters(filters: BatchJobFilters): Promise<BatchJob[]> {
    const queryBuilder = this.repo.createQueryBuilder('job');

    if (filters.userId) {
      queryBuilder.andWhere('job.userId = :userId', { userId: filters.userId });
    }

    if (filters.organizationId) {
      queryBuilder.andWhere('job.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }

    if (filters.type) {
      queryBuilder.andWhere('job.type = :type', { type: filters.type });
    }

    if (filters.status) {
      queryBuilder.andWhere('job.status = :status', { status: filters.status });
    }

    if (filters.createdAfter) {
      queryBuilder.andWhere('job.createdAt >= :createdAfter', {
        createdAfter: filters.createdAfter,
      });
    }

    if (filters.createdBefore) {
      queryBuilder.andWhere('job.createdAt <= :createdBefore', {
        createdBefore: filters.createdBefore,
      });
    }

    queryBuilder.orderBy('job.createdAt', 'DESC');

    const entities = await queryBuilder.getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async findPendingJobs(limit = 100): Promise<BatchJob[]> {
    const entities = await this.repo.find({
      where: { status: BatchJobStatus.PENDING },
      order: {
        priority: 'DESC',
        scheduledAt: 'ASC',
        createdAt: 'ASC',
      },
      take: limit,
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findStuckJobs(thresholdMinutes: number): Promise<BatchJob[]> {
    const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    const entities = await this.repo.find({
      where: {
        status: BatchJobStatus.PROCESSING,
        updatedAt: LessThan(threshold),
      },
    });

    return entities.map((e) => this.toDomain(e));
  }

  async save(batchJob: BatchJob): Promise<BatchJob> {
    const entity = this.toOrmEntity(batchJob);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async update(batchJob: BatchJob): Promise<BatchJob> {
    const entity = this.toOrmEntity(batchJob);
    const updated = await this.repo.save(entity);
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async countByStatus(status: BatchJobStatus): Promise<number> {
    return this.repo.count({ where: { status } });
  }

  async getJobMetrics(userId?: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const queryBuilder = this.repo.createQueryBuilder('job');

    if (userId) {
      queryBuilder.where('job.userId = :userId', { userId });
    }

    const [total, pending, processing, completed, failed] = await Promise.all([
      queryBuilder.getCount(),
      this.repo.count({
        where: userId
          ? { userId, status: BatchJobStatus.PENDING }
          : { status: BatchJobStatus.PENDING },
      }),
      this.repo.count({
        where: userId
          ? { userId, status: BatchJobStatus.PROCESSING }
          : { status: BatchJobStatus.PROCESSING },
      }),
      this.repo.count({
        where: userId
          ? { userId, status: BatchJobStatus.COMPLETED }
          : { status: BatchJobStatus.COMPLETED },
      }),
      this.repo.count({
        where: userId
          ? { userId, status: BatchJobStatus.FAILED }
          : { status: BatchJobStatus.FAILED },
      }),
    ]);

    return { total, pending, processing, completed, failed };
  }

  private toDomain(entity: BatchJobOrmEntity): BatchJob {
    return BatchJob.fromPersistence({
      id: entity.id,
      type: entity.type as BatchJobType,
      name: entity.name,
      description: entity.description,
      status: entity.status as BatchJobStatus,
      priority: entity.priority as BatchJobPriority,
      userId: entity.userId,
      organizationId: entity.organizationId,
      payload: entity.payload,
      config: entity.config,
      metrics: entity.metrics,
      scheduledAt: entity.scheduledAt,
      startedAt: entity.startedAt,
      completedAt: entity.completedAt,
      errorMessage: entity.errorMessage,
      errorDetails: entity.errorDetails,
      retryCount: entity.retryCount,
      maxRetries: entity.maxRetries,
      results: entity.results,
      resultFileUrl: entity.resultFileUrl,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      createdBy: entity.createdBy,
    });
  }

  private toOrmEntity(batchJob: BatchJob): BatchJobOrmEntity {
    const entity = new BatchJobOrmEntity();
    entity.id = batchJob.id;
    entity.type = batchJob.type;
    entity.name = batchJob.name;
    entity.description = batchJob.description;
    entity.status = batchJob.status;
    entity.priority = batchJob.priority;
    entity.userId = batchJob.userId;
    entity.organizationId = batchJob.organizationId;
    entity.payload = batchJob.payload;
    entity.config = batchJob.config;
    entity.metrics = batchJob.metrics;
    entity.scheduledAt = batchJob.scheduledAt;
    entity.startedAt = batchJob.startedAt;
    entity.completedAt = batchJob.completedAt;
    entity.errorMessage = batchJob.errorMessage;
    entity.errorDetails = batchJob.errorDetails;
    entity.retryCount = batchJob.retryCount;
    entity.maxRetries = batchJob.maxRetries;
    entity.results = batchJob.results;
    entity.resultFileUrl = batchJob.resultFileUrl;
    entity.createdBy = batchJob.createdBy;
    return entity;
  }
}
