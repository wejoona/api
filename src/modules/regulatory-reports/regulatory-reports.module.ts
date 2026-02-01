import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import { RegulatoryReportsController } from './application/controllers/regulatory-reports.controller';

// Services
import {
  BCEAOTransactionReportService,
  SuspiciousActivityReportService,
  MonthlyComplianceSummaryService,
  AuditTrailExportService,
} from './application/services';

// Repositories
import { RegulatoryReportRepository } from './domain/repositories/regulatory-report.repository';
import { TypeOrmRegulatoryReportRepository } from './infrastructure/repositories/typeorm-regulatory-report.repository';

// ORM Entities
import {
  RegulatoryReportOrmEntity,
  AuditLogOrmEntity,
} from './infrastructure/orm-entities';

// Exporters
import {
  JsonExporter,
  CsvExporter,
  XmlExporter,
} from './infrastructure/exporters';

// External entities (from other modules)
import { TransactionOrmEntity } from '../transaction/infrastructure/orm-entities/transaction.orm-entity';
import { UserOrmEntity } from '../user/infrastructure/orm-entities/user.orm-entity';

/**
 * Regulatory Reports Module
 *
 * Comprehensive regulatory reporting for BCEAO (Central Bank of West African States)
 * compliance requirements.
 *
 * Features:
 * - BCEAO Transaction Reports (daily, weekly, monthly)
 * - Suspicious Activity Reports (SAR) with 24-hour filing requirement
 * - Monthly Compliance Summaries
 * - Audit Trail Exports with cryptographic verification
 *
 * Report Schedule (West Africa Time - UTC+0):
 * - Daily Transaction Report: 00:30 WAT
 * - Weekly Transaction Report: Sunday 01:00 WAT
 * - Monthly Transaction Report: 1st of month 02:00 WAT
 * - Monthly Compliance Summary: 3rd of month 03:00 WAT
 *
 * Regulatory Framework:
 * - BCEAO directives for financial institutions
 * - FATF recommendations (R.10, R.11, R.20, R.21)
 * - WAEMU/UEMOA AML/CFT standards
 *
 * Data Retention:
 * - All reports retained for 7 years per BCEAO mandate
 * - Soft delete ensures compliance with retention requirements
 * - Cryptographic checksums for data integrity verification
 *
 * Access Control:
 * - Report generation: compliance_officer, compliance_manager, admin
 * - Approval/submission: compliance_manager, admin
 * - All endpoints require authentication
 *
 * Integration Points:
 * - Transaction module (transaction data)
 * - User module (user/KYC data)
 * - Compliance module (AML alerts, cases)
 *
 * Export Formats:
 * - JSON (default)
 * - CSV
 * - XML (BCEAO submission format)
 * - PDF (planned)
 * - XLSX (planned)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Module entities
      RegulatoryReportOrmEntity,
      AuditLogOrmEntity,
      // External entities
      TransactionOrmEntity,
      UserOrmEntity,
    ]),
    ConfigModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
  ],
  controllers: [RegulatoryReportsController],
  providers: [
    // Services
    BCEAOTransactionReportService,
    SuspiciousActivityReportService,
    MonthlyComplianceSummaryService,
    AuditTrailExportService,
    // Repository
    {
      provide: RegulatoryReportRepository,
      useClass: TypeOrmRegulatoryReportRepository,
    },
    // Exporters
    JsonExporter,
    CsvExporter,
    XmlExporter,
  ],
  exports: [
    // Services (for use by other modules)
    BCEAOTransactionReportService,
    SuspiciousActivityReportService,
    MonthlyComplianceSummaryService,
    AuditTrailExportService,
    // Repository
    RegulatoryReportRepository,
    // Exporters
    JsonExporter,
    CsvExporter,
    XmlExporter,
  ],
})
export class RegulatoryReportsModule {}
