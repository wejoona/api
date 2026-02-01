import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RecurringTransferFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
}

export enum RecurringTransferStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity({ name: 'recurring_transfers', schema: 'wallet' })
@Index('IDX_recurring_transfers_wallet_id', ['walletId'])
@Index('IDX_recurring_transfers_status', ['status'])
@Index('IDX_recurring_transfers_next_execution', ['nextExecutionDate'])
@Index('IDX_recurring_transfers_wallet_status', ['walletId', 'status'])
@Index('IDX_recurring_transfers_status_next_execution', [
  'status',
  'nextExecutionDate',
])
@Index('IDX_recurring_transfers_recipient_phone', ['recipientPhone'])
export class RecurringTransferOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  @Column({ name: 'recipient_phone', type: 'varchar', length: 20 })
  recipientPhone: string;

  @Column({ name: 'recipient_name', type: 'varchar', length: 100 })
  recipientName: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 6,
  })
  amount: string;

  @Column({ type: 'varchar', length: 10, default: 'XOF' })
  currency: string;

  @Column({
    type: 'enum',
    enum: RecurringTransferFrequency,
  })
  frequency: RecurringTransferFrequency;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate: Date | null;

  @Column({ name: 'next_execution_date', type: 'timestamp' })
  nextExecutionDate: Date;

  @Column({ name: 'occurrences_total', type: 'int', nullable: true })
  occurrencesTotal: number | null;

  @Column({ name: 'occurrences_remaining', type: 'int', nullable: true })
  occurrencesRemaining: number | null;

  @Column({
    type: 'enum',
    enum: RecurringTransferStatus,
    default: RecurringTransferStatus.ACTIVE,
  })
  status: RecurringTransferStatus;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'day_of_week', type: 'int', nullable: true })
  dayOfWeek: number | null;

  @Column({ name: 'day_of_month', type: 'int', nullable: true })
  dayOfMonth: number | null;

  @Column({ name: 'executed_count', type: 'int', default: 0 })
  executedCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
