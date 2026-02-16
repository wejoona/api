import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('reconciliation_reports')
@Index(['type', 'periodStart', 'periodEnd'])
export class ReconciliationReportOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  type: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  @Index()
  status: string;

  @Column({ name: 'period_start', type: 'timestamp with time zone' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'timestamp with time zone' })
  periodEnd: Date;

  @Column({ type: 'jsonb' })
  summary: {
    totalTransactions: number;
    matchedTransactions: number;
    unmatchedTransactions: number;
    totalDiscrepancies: number;
    criticalDiscrepancies: number;
    highDiscrepancies: number;
    mediumDiscrepancies: number;
    lowDiscrepancies: number;
    totalAmountReconciled: string;
    totalDiscrepancyAmount: string;
  };

  @Column({ name: 'transaction_discrepancies', type: 'jsonb', default: '[]' })
  transactionDiscrepancies: Array<{
    transactionId: string;
    externalId?: string;
    provider: string;
    type: string;
    internalAmount?: string;
    externalAmount?: string;
    internalStatus?: string;
    externalStatus?: string;
    internalFee?: string;
    externalFee?: string;
    difference?: string;
    severity: string;
    notes?: string;
    createdAt: Date;
  }>;

  @Column({ name: 'fee_discrepancies', type: 'jsonb', default: '[]' })
  feeDiscrepancies: Array<{
    transactionId: string;
    transactionType: string;
    expectedFee: string;
    actualFee: string;
    difference: string;
    feeType: string;
    severity: string;
    notes?: string;
  }>;

  @Column({ name: 'settlement_entries', type: 'jsonb', default: '[]' })
  settlementEntries: Array<{
    provider: string;
    currency: string;
    grossVolume: string;
    totalFees: string;
    platformFees: string;
    providerFees: string;
    networkFees: string;
    netSettlement: string;
    transactionCount: number;
    depositCount: number;
    withdrawalCount: number;
    transferCount: number;
  }>;

  @Column({ name: 'provider_balances', type: 'jsonb', default: '[]' })
  providerBalances: Array<{
    provider: string;
    currency: string;
    reportedBalance: string;
    calculatedBalance: string;
    difference: string;
    isReconciled: boolean;
    lastTransactionId?: string;
    lastTransactionDate?: Date;
  }>;

  @Column({ name: 'executed_by', type: 'uuid', nullable: true })
  executedBy?: string;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({
    name: 'completed_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  completedAt?: Date;
}
