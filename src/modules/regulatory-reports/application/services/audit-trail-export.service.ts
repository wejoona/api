import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RegulatoryReportRepository } from '../../domain/repositories/regulatory-report.repository';
import { RegulatoryReport } from '../../domain/entities/regulatory-report.entity';
import { AuditLogOrmEntity } from '../../infrastructure/orm-entities/audit-log.orm-entity';
import {
  RegulatoryReportType,
  ReportPeriod,
  ExportFormat,
  AuditTrailExportData,
  AuditRecord,
} from '../../domain/types';
import {
  JsonExporter,
  CsvExporter,
  XmlExporter,
  ExportResult,
} from '../../infrastructure/exporters';
import { GenerateAuditExportDto } from '../dto/generate-report.dto';

/**
 * Audit Trail Export Service
 *
 * Generates comprehensive audit trail exports for regulatory compliance,
 * internal audits, and forensic investigations.
 *
 * Features:
 * - Configurable date ranges
 * - Filter by event type, entity type, or user
 * - Multiple export formats (JSON, CSV, XML)
 * - Cryptographic hash verification
 * - BCEAO-compliant 7-year retention
 */
@Injectable()
export class AuditTrailExportService {
  private readonly logger = new Logger(AuditTrailExportService.name);

  constructor(
    private readonly reportRepository: RegulatoryReportRepository,
    @InjectRepository(AuditLogOrmEntity)
    private readonly auditLogRepo: Repository<AuditLogOrmEntity>,
    private readonly configService: ConfigService,
    private readonly jsonExporter: JsonExporter,
    private readonly csvExporter: CsvExporter,
    private readonly xmlExporter: XmlExporter,
  ) {}

  /**
   * Generate audit trail export
   */
  async generateAuditExport(
    dto: GenerateAuditExportDto,
    generatedBy: string,
  ): Promise<RegulatoryReport> {
    try {
      this.logger.log(
        `Generating audit trail export for ${dto.periodStart.toISOString()} to ${dto.periodEnd.toISOString()}`,
      );

      // Fetch audit logs based on filters
      const auditLogs = await this.fetchAuditLogs(dto);

      // Build export data
      const exportData = this.buildExportData(
        auditLogs,
        dto.periodStart,
        dto.periodEnd,
        generatedBy,
      );

      // Generate report file
      const format = dto.format || ExportFormat.JSON;
      const exportResult = await this.exportData(exportData, format);

      // Calculate checksum for data integrity
      const checksum = this.calculateChecksum(exportResult.data);

      // Create report
      const report = RegulatoryReport.create({
        reportType: RegulatoryReportType.AUDIT_TRAIL,
        reportPeriod: ReportPeriod.CUSTOM,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        title: `Audit Trail Export - ${dto.periodStart.toISOString().split('T')[0]} to ${dto.periodEnd.toISOString().split('T')[0]}`,
        description: `Comprehensive audit trail export containing ${auditLogs.length} records`,
        reportData: exportData as unknown as Record<string, unknown>,
        exportFormat: format,
        generatedBy,
        metadata: {
          recordCount: auditLogs.length,
          filters: {
            eventTypes: dto.eventTypes,
            entityTypes: dto.entityTypes,
            userIds: dto.userIds,
          },
          checksum,
          generatedAt: new Date().toISOString(),
        },
      });

      report.setFileInfo(
        '', // File URL would be set after upload to storage
        Buffer.isBuffer(exportResult.data)
          ? exportResult.data.length
          : exportResult.data.length,
        checksum,
      );

      const savedReport = await this.reportRepository.save(report);

      this.logger.log(
        `Audit trail export generated: ${savedReport.id} with ${auditLogs.length} records`,
      );

      return savedReport;
    } catch (error) {
      this.logger.error(
        `Failed to generate audit trail export: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Fetch audit logs based on filters
   */
  private async fetchAuditLogs(
    dto: GenerateAuditExportDto,
  ): Promise<AuditLogOrmEntity[]> {
    const query = this.auditLogRepo.createQueryBuilder('audit');

    query.where('audit.createdAt BETWEEN :start AND :end', {
      start: dto.periodStart,
      end: dto.periodEnd,
    });

    query.andWhere('audit.archivedAt IS NULL');

    if (dto.eventTypes && dto.eventTypes.length > 0) {
      query.andWhere('audit.eventType IN (:...eventTypes)', {
        eventTypes: dto.eventTypes,
      });
    }

    if (dto.entityTypes && dto.entityTypes.length > 0) {
      query.andWhere('audit.entityType IN (:...entityTypes)', {
        entityTypes: dto.entityTypes,
      });
    }

    if (dto.userIds && dto.userIds.length > 0) {
      query.andWhere('audit.userId IN (:...userIds)', {
        userIds: dto.userIds,
      });
    }

    query.orderBy('audit.createdAt', 'ASC');

    return query.getMany();
  }

  /**
   * Build export data structure
   */
  private buildExportData(
    auditLogs: AuditLogOrmEntity[],
    periodStart: Date,
    periodEnd: Date,
    generatedBy: string,
  ): AuditTrailExportData {
    return {
      exportDate: new Date(),
      periodStart,
      periodEnd,
      generatedBy,
      totalRecords: auditLogs.length,
      records: auditLogs.map((log) => this.mapToAuditRecord(log)),
    };
  }

  /**
   * Map ORM entity to audit record
   */
  private mapToAuditRecord(log: AuditLogOrmEntity): AuditRecord {
    return {
      id: log.id,
      timestamp: log.createdAt,
      eventType: log.eventType,
      entityType: log.entityType,
      entityId: log.entityId,
      userId: log.userId || undefined,
      userEmail: log.userEmail || undefined,
      ipAddress: log.ipAddress || undefined,
      userAgent: log.userAgent || undefined,
      action: log.action,
      previousValue: log.previousValue || undefined,
      newValue: log.newValue || undefined,
      metadata: log.metadata || undefined,
    };
  }

  /**
   * Export data to specified format
   */
  private async exportData(
    data: AuditTrailExportData,
    format: ExportFormat,
  ): Promise<ExportResult> {
    const filename = `audit-trail-${data.periodStart.toISOString().split('T')[0]}-${data.periodEnd.toISOString().split('T')[0]}`;

    switch (format) {
      case ExportFormat.CSV:
        return this.csvExporter.export(
          data as unknown as Record<string, unknown>,
          filename,
          { title: 'Audit Trail Export' },
        );
      case ExportFormat.XML:
        return this.xmlExporter.export(
          data as unknown as Record<string, unknown>,
          filename,
          { title: 'Audit Trail Export' },
        );
      case ExportFormat.JSON:
      default:
        return this.jsonExporter.export(
          data as unknown as Record<string, unknown>,
          filename,
          { title: 'Audit Trail Export' },
        );
    }
  }

  /**
   * Calculate SHA-256 checksum
   */
  private calculateChecksum(data: Buffer | string): string {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Verify export data integrity
   */
  async verifyExportIntegrity(
    reportId: string,
    exportedData: Buffer | string,
  ): Promise<boolean> {
    const report = await this.reportRepository.findById(reportId);

    if (!report || !report.checksum) {
      return false;
    }

    const calculatedChecksum = this.calculateChecksum(exportedData);
    return calculatedChecksum === report.checksum;
  }

  /**
   * Log an audit event
   */
  async logAuditEvent(
    eventType: string,
    entityType: string,
    entityId: string,
    action: string,
    options?: {
      userId?: string;
      userEmail?: string;
      userRole?: string;
      ipAddress?: string;
      userAgent?: string;
      previousValue?: Record<string, unknown>;
      newValue?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      correlationId?: string;
      sessionId?: string;
      riskLevel?: string;
      isSensitive?: boolean;
      countryCode?: string;
    },
  ): Promise<AuditLogOrmEntity> {
    const auditLog = this.auditLogRepo.create({
      eventType,
      entityType,
      entityId,
      action,
      userId: options?.userId || null,
      userEmail: options?.userEmail || null,
      userRole: options?.userRole || null,
      ipAddress: options?.ipAddress || null,
      userAgent: options?.userAgent || null,
      previousValue: options?.previousValue || null,
      newValue: options?.newValue || null,
      changes: this.calculateChanges(options?.previousValue, options?.newValue),
      metadata: options?.metadata || null,
      correlationId: options?.correlationId || null,
      sessionId: options?.sessionId || null,
      riskLevel: options?.riskLevel || null,
      isSensitive: options?.isSensitive || false,
      countryCode: options?.countryCode || null,
    });

    return this.auditLogRepo.save(auditLog);
  }

  /**
   * Calculate changes between previous and new values
   */
  private calculateChanges(
    previousValue?: Record<string, unknown>,
    newValue?: Record<string, unknown>,
  ): Record<string, { old: unknown; new: unknown }> | null {
    if (!previousValue || !newValue) {
      return null;
    }

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const allKeys = new Set([
      ...Object.keys(previousValue),
      ...Object.keys(newValue),
    ]);

    for (const key of allKeys) {
      const oldVal = previousValue[key];
      const newVal = newValue[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[key] = { old: oldVal, new: newVal };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  /**
   * Get audit history for an entity
   */
  async getEntityAuditHistory(
    entityType: string,
    entityId: string,
    limit = 100,
  ): Promise<AuditLogOrmEntity[]> {
    return this.auditLogRepo.find({
      where: {
        entityType,
        entityId,
        archivedAt: null,
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get audit history for a user
   */
  async getUserAuditHistory(
    userId: string,
    limit = 100,
  ): Promise<AuditLogOrmEntity[]> {
    return this.auditLogRepo.find({
      where: {
        userId,
        archivedAt: null,
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Archive old audit logs (retention: 7 years)
   */
  async archiveOldAuditLogs(): Promise<number> {
    const retentionYears = this.configService.get<number>(
      'compliance.auditRetentionYears',
      7,
    );
    const archiveDate = new Date();
    archiveDate.setFullYear(archiveDate.getFullYear() - retentionYears);

    const result = await this.auditLogRepo
      .createQueryBuilder()
      .update()
      .set({ archivedAt: new Date() })
      .where('createdAt < :archiveDate', { archiveDate })
      .andWhere('archivedAt IS NULL')
      .execute();

    this.logger.log(`Archived ${result.affected} old audit log entries`);
    return result.affected || 0;
  }

  /**
   * Common audit event types
   */
  static readonly EVENT_TYPES = {
    // User events
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    USER_LOGIN: 'user.login',
    USER_LOGOUT: 'user.logout',
    USER_PASSWORD_CHANGED: 'user.password_changed',
    USER_2FA_ENABLED: 'user.2fa_enabled',
    USER_2FA_DISABLED: 'user.2fa_disabled',

    // KYC events
    KYC_SUBMITTED: 'kyc.submitted',
    KYC_APPROVED: 'kyc.approved',
    KYC_REJECTED: 'kyc.rejected',
    KYC_DOCUMENT_UPLOADED: 'kyc.document_uploaded',

    // Transaction events
    TRANSACTION_CREATED: 'transaction.created',
    TRANSACTION_APPROVED: 'transaction.approved',
    TRANSACTION_REJECTED: 'transaction.rejected',
    TRANSACTION_COMPLETED: 'transaction.completed',
    TRANSACTION_FAILED: 'transaction.failed',
    TRANSACTION_BLOCKED: 'transaction.blocked',

    // Wallet events
    WALLET_CREATED: 'wallet.created',
    WALLET_SUSPENDED: 'wallet.suspended',
    WALLET_REACTIVATED: 'wallet.reactivated',

    // Compliance events
    AML_ALERT_CREATED: 'aml.alert_created',
    AML_ALERT_RESOLVED: 'aml.alert_resolved',
    SAR_GENERATED: 'sar.generated',
    SAR_SUBMITTED: 'sar.submitted',
    SANCTIONS_MATCH: 'sanctions.match',

    // Admin events
    ADMIN_ACCESS: 'admin.access',
    ADMIN_CONFIG_CHANGED: 'admin.config_changed',
    REPORT_GENERATED: 'report.generated',
    REPORT_SUBMITTED: 'report.submitted',
  };
}
