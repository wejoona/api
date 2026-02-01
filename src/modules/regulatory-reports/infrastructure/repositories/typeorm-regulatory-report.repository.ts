import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In, Between, IsNull } from 'typeorm';
import { RegulatoryReportOrmEntity } from '../orm-entities/regulatory-report.orm-entity';
import {
  RegulatoryReportRepository,
  ReportQueryOptions,
  ReportStatistics,
} from '../../domain/repositories/regulatory-report.repository';
import { RegulatoryReport } from '../../domain/entities/regulatory-report.entity';
import { RegulatoryReportType, ReportStatus } from '../../domain/types';

@Injectable()
export class TypeOrmRegulatoryReportRepository extends RegulatoryReportRepository {
  constructor(
    @InjectRepository(RegulatoryReportOrmEntity)
    private readonly repo: Repository<RegulatoryReportOrmEntity>,
  ) {
    super();
  }

  async findById(id: string): Promise<RegulatoryReport | null> {
    const entity = await this.repo.findOne({
      where: { id, archivedAt: IsNull() },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByBceaoReference(
    reference: string,
  ): Promise<RegulatoryReport | null> {
    const entity = await this.repo.findOne({
      where: { bceaoReference: reference, archivedAt: IsNull() },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(options?: ReportQueryOptions): Promise<RegulatoryReport[]> {
    const query = this.repo.createQueryBuilder('report');

    query.where('report.archivedAt IS NULL');

    if (options?.reportType) {
      query.andWhere('report.reportType = :reportType', {
        reportType: options.reportType,
      });
    }

    if (options?.status) {
      query.andWhere('report.status = :status', { status: options.status });
    }

    if (options?.period) {
      query.andWhere('report.reportPeriod = :period', {
        period: options.period,
      });
    }

    if (options?.periodStart && options?.periodEnd) {
      query.andWhere('report.periodStart >= :periodStart', {
        periodStart: options.periodStart,
      });
      query.andWhere('report.periodEnd <= :periodEnd', {
        periodEnd: options.periodEnd,
      });
    }

    if (options?.generatedBy) {
      query.andWhere('report.generatedBy = :generatedBy', {
        generatedBy: options.generatedBy,
      });
    }

    const orderBy = options?.orderBy || 'createdAt';
    const orderDirection = options?.orderDirection || 'DESC';
    query.orderBy(`report.${orderBy}`, orderDirection);

    if (options?.limit) {
      query.take(options.limit);
    }

    if (options?.offset) {
      query.skip(options.offset);
    }

    const entities = await query.getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async findPendingSubmission(): Promise<RegulatoryReport[]> {
    const entities = await this.repo.find({
      where: {
        status: In([
          ReportStatus.DRAFT,
          ReportStatus.PENDING_REVIEW,
          ReportStatus.APPROVED,
        ]),
        archivedAt: IsNull(),
      },
      order: { submissionDeadline: 'ASC', createdAt: 'DESC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findOverdue(): Promise<RegulatoryReport[]> {
    const now = new Date();
    const entities = await this.repo.find({
      where: {
        submissionDeadline: LessThan(now),
        status: In([
          ReportStatus.DRAFT,
          ReportStatus.PENDING_REVIEW,
          ReportStatus.APPROVED,
        ]),
        archivedAt: IsNull(),
      },
      order: { submissionDeadline: 'ASC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findByTypeAndPeriod(
    reportType: RegulatoryReportType,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<RegulatoryReport | null> {
    const entity = await this.repo.findOne({
      where: {
        reportType,
        periodStart,
        periodEnd,
        archivedAt: IsNull(),
      },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async count(options?: ReportQueryOptions): Promise<number> {
    const query = this.repo.createQueryBuilder('report');

    query.where('report.archivedAt IS NULL');

    if (options?.reportType) {
      query.andWhere('report.reportType = :reportType', {
        reportType: options.reportType,
      });
    }

    if (options?.status) {
      query.andWhere('report.status = :status', { status: options.status });
    }

    return query.getCount();
  }

  async save(report: RegulatoryReport): Promise<RegulatoryReport> {
    const entity = this.toOrmEntity(report);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    // Soft delete for compliance
    await this.repo.update(id, { archivedAt: new Date() });
  }

  async getStatistics(
    startDate: Date,
    endDate: Date,
  ): Promise<ReportStatistics> {
    const reports = await this.repo.find({
      where: {
        createdAt: Between(startDate, endDate),
        archivedAt: IsNull(),
      },
    });

    const byStatus = reports.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      {} as Record<ReportStatus, number>,
    );

    const byType = reports.reduce(
      (acc, r) => {
        acc[r.reportType] = (acc[r.reportType] || 0) + 1;
        return acc;
      },
      {} as Record<RegulatoryReportType, number>,
    );

    const submittedReports = reports.filter((r) => r.submittedAt);
    const totalProcessingTime = submittedReports.reduce((sum, r) => {
      const processingTime = r.submittedAt.getTime() - r.createdAt.getTime();
      return sum + processingTime;
    }, 0);

    const averageProcessingTimeHours =
      submittedReports.length > 0
        ? totalProcessingTime / submittedReports.length / (1000 * 60 * 60)
        : 0;

    const overdueCount = await this.repo.count({
      where: {
        submissionDeadline: LessThan(new Date()),
        status: In([
          ReportStatus.DRAFT,
          ReportStatus.PENDING_REVIEW,
          ReportStatus.APPROVED,
        ]),
        archivedAt: IsNull(),
      },
    });

    return {
      totalReports: reports.length,
      byStatus,
      byType,
      submittedCount: submittedReports.length,
      pendingCount: reports.filter((r) =>
        [
          ReportStatus.DRAFT,
          ReportStatus.PENDING_REVIEW,
          ReportStatus.APPROVED,
        ].includes(r.status),
      ).length,
      overdueCount,
      averageProcessingTimeHours:
        Math.round(averageProcessingTimeHours * 100) / 100,
    };
  }

  private toDomain(entity: RegulatoryReportOrmEntity): RegulatoryReport {
    return RegulatoryReport.fromPersistence({
      id: entity.id,
      reportType: entity.reportType,
      reportPeriod: entity.reportPeriod,
      periodStart: entity.periodStart,
      periodEnd: entity.periodEnd,
      status: entity.status,
      title: entity.title,
      description: entity.description || undefined,
      reportData: entity.reportData,
      exportFormat: entity.exportFormat || undefined,
      fileUrl: entity.fileUrl || undefined,
      fileSize: entity.fileSize ? Number(entity.fileSize) : undefined,
      checksum: entity.checksum || undefined,
      bceaoReference: entity.bceaoReference || undefined,
      submissionDeadline: entity.submissionDeadline || undefined,
      generatedBy: entity.generatedBy,
      reviewedBy: entity.reviewedBy || undefined,
      approvedBy: entity.approvedBy || undefined,
      submittedBy: entity.submittedBy || undefined,
      submittedAt: entity.submittedAt || undefined,
      acknowledgedAt: entity.acknowledgedAt || undefined,
      rejectionReason: entity.rejectionReason || undefined,
      notes: entity.notes || undefined,
      metadata: entity.metadata || undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      archivedAt: entity.archivedAt || undefined,
    });
  }

  private toOrmEntity(domain: RegulatoryReport): RegulatoryReportOrmEntity {
    const entity = new RegulatoryReportOrmEntity();
    entity.id = domain.id;
    entity.reportType = domain.reportType;
    entity.reportPeriod = domain.reportPeriod;
    entity.periodStart = domain.periodStart;
    entity.periodEnd = domain.periodEnd;
    entity.status = domain.status;
    entity.title = domain.title;
    entity.description = domain.description || null;
    entity.reportData = domain.reportData;
    entity.exportFormat = domain.exportFormat || null;
    entity.fileUrl = domain.fileUrl || null;
    entity.fileSize = domain.fileSize || null;
    entity.checksum = domain.checksum || null;
    entity.bceaoReference = domain.bceaoReference || null;
    entity.submissionDeadline = domain.submissionDeadline || null;
    entity.generatedBy = domain.generatedBy;
    entity.reviewedBy = domain.reviewedBy || null;
    entity.approvedBy = domain.approvedBy || null;
    entity.submittedBy = domain.submittedBy || null;
    entity.submittedAt = domain.submittedAt || null;
    entity.acknowledgedAt = domain.acknowledgedAt || null;
    entity.rejectionReason = domain.rejectionReason || null;
    entity.notes = domain.notes || null;
    entity.metadata = domain.metadata || null;
    entity.archivedAt = domain.archivedAt || null;
    return entity;
  }
}
