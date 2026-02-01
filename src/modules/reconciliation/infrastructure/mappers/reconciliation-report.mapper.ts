import { Injectable } from '@nestjs/common';
import { ReconciliationReportOrmEntity } from '../orm-entities/reconciliation-report.orm-entity';
import {
  ReconciliationReportEntity,
  ReconciliationReportType,
  ReconciliationReportStatus,
  TransactionDiscrepancy,
  FeeDiscrepancy,
  DiscrepancySeverity,
} from '../../domain/entities/reconciliation-report.entity';

@Injectable()
export class ReconciliationReportMapper {
  /**
   * Map ORM entity to domain entity
   */
  toDomain(
    ormEntity: ReconciliationReportOrmEntity,
  ): ReconciliationReportEntity {
    return ReconciliationReportEntity.fromPersistence({
      id: ormEntity.id,
      type: ormEntity.type as ReconciliationReportType,
      status: ormEntity.status as ReconciliationReportStatus,
      periodStart: ormEntity.periodStart,
      periodEnd: ormEntity.periodEnd,
      summary: ormEntity.summary,
      transactionDiscrepancies: ormEntity.transactionDiscrepancies.map((d) => ({
        ...d,
        severity: d.severity as DiscrepancySeverity,
        type: d.type as TransactionDiscrepancy['type'],
        createdAt: new Date(d.createdAt),
      })),
      feeDiscrepancies: ormEntity.feeDiscrepancies.map((d) => ({
        ...d,
        severity: d.severity as DiscrepancySeverity,
        feeType: d.feeType as FeeDiscrepancy['feeType'],
      })),
      settlementEntries: ormEntity.settlementEntries,
      providerBalances: ormEntity.providerBalances.map((b) => ({
        ...b,
        lastTransactionDate: b.lastTransactionDate
          ? new Date(b.lastTransactionDate)
          : undefined,
      })),
      executedBy: ormEntity.executedBy,
      reviewedBy: ormEntity.reviewedBy,
      notes: ormEntity.notes,
      metadata: ormEntity.metadata,
      createdAt: ormEntity.createdAt,
      updatedAt: ormEntity.updatedAt,
      completedAt: ormEntity.completedAt,
    });
  }

  /**
   * Map domain entity to ORM entity
   */
  toOrmEntity(
    domainEntity: ReconciliationReportEntity,
  ): ReconciliationReportOrmEntity {
    const ormEntity = new ReconciliationReportOrmEntity();

    ormEntity.id = domainEntity.id;
    ormEntity.type = domainEntity.type;
    ormEntity.status = domainEntity.status;
    ormEntity.periodStart = domainEntity.periodStart;
    ormEntity.periodEnd = domainEntity.periodEnd;
    ormEntity.summary = domainEntity.summary;
    ormEntity.transactionDiscrepancies =
      domainEntity.transactionDiscrepancies.map((d) => ({
        ...d,
        createdAt: d.createdAt,
      }));
    ormEntity.feeDiscrepancies = domainEntity.feeDiscrepancies;
    ormEntity.settlementEntries = domainEntity.settlementEntries;
    ormEntity.providerBalances = domainEntity.providerBalances;
    ormEntity.executedBy = domainEntity.executedBy;
    ormEntity.reviewedBy = domainEntity.reviewedBy;
    ormEntity.notes = domainEntity.notes;
    ormEntity.metadata = domainEntity.metadata;
    ormEntity.completedAt = domainEntity.completedAt;

    return ormEntity;
  }
}
