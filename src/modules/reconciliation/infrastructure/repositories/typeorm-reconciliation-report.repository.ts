import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import {
  ReconciliationReportRepository,
  FindReconciliationReportsOptions,
} from '../../domain/repositories/reconciliation-report.repository';
import {
  ReconciliationReportEntity,
  ReconciliationReportType,
  ReconciliationReportStatus,
} from '../../domain/entities/reconciliation-report.entity';
import { ReconciliationReportOrmEntity } from '../orm-entities/reconciliation-report.orm-entity';
import { ReconciliationReportMapper } from '../mappers/reconciliation-report.mapper';

@Injectable()
export class TypeOrmReconciliationReportRepository extends ReconciliationReportRepository {
  constructor(
    @InjectRepository(ReconciliationReportOrmEntity)
    private readonly repo: Repository<ReconciliationReportOrmEntity>,
    private readonly mapper: ReconciliationReportMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<ReconciliationReportEntity | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async find(
    options: FindReconciliationReportsOptions,
  ): Promise<ReconciliationReportEntity[]> {
    const queryBuilder = this.repo.createQueryBuilder('report');

    if (options.type) {
      queryBuilder.andWhere('report.type = :type', { type: options.type });
    }

    if (options.status) {
      queryBuilder.andWhere('report.status = :status', {
        status: options.status,
      });
    }

    if (options.periodStart && options.periodEnd) {
      queryBuilder.andWhere(
        'report.period_start >= :periodStart AND report.period_end <= :periodEnd',
        {
          periodStart: options.periodStart,
          periodEnd: options.periodEnd,
        },
      );
    } else if (options.periodStart) {
      queryBuilder.andWhere('report.period_start >= :periodStart', {
        periodStart: options.periodStart,
      });
    } else if (options.periodEnd) {
      queryBuilder.andWhere('report.period_end <= :periodEnd', {
        periodEnd: options.periodEnd,
      });
    }

    queryBuilder.orderBy('report.created_at', 'DESC');

    if (options.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options.offset) {
      queryBuilder.offset(options.offset);
    }

    const entities = await queryBuilder.getMany();
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findLatestByType(
    type: ReconciliationReportType,
  ): Promise<ReconciliationReportEntity | null> {
    const entity = await this.repo.findOne({
      where: { type },
      order: { createdAt: 'DESC' },
    });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findRequiringReview(): Promise<ReconciliationReportEntity[]> {
    const entities = await this.repo.find({
      where: { status: ReconciliationReportStatus.REQUIRES_REVIEW },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async save(
    report: ReconciliationReportEntity,
  ): Promise<ReconciliationReportEntity> {
    const ormEntity = this.mapper.toOrmEntity(report);
    const saved = await this.repo.save(ormEntity);
    return this.mapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async count(options: FindReconciliationReportsOptions): Promise<number> {
    const queryBuilder = this.repo.createQueryBuilder('report');

    if (options.type) {
      queryBuilder.andWhere('report.type = :type', { type: options.type });
    }

    if (options.status) {
      queryBuilder.andWhere('report.status = :status', {
        status: options.status,
      });
    }

    if (options.periodStart && options.periodEnd) {
      queryBuilder.andWhere(
        'report.period_start >= :periodStart AND report.period_end <= :periodEnd',
        {
          periodStart: options.periodStart,
          periodEnd: options.periodEnd,
        },
      );
    }

    return queryBuilder.getCount();
  }

  async existsForPeriod(
    type: ReconciliationReportType,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<boolean> {
    const count = await this.repo.count({
      where: {
        type,
        periodStart: MoreThanOrEqual(periodStart),
        periodEnd: LessThanOrEqual(periodEnd),
      },
    });
    return count > 0;
  }
}
