import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RecurringTransferOrmEntity } from './recurring-transfer.orm-entity';

@Entity({ name: 'recurring_transfer_history', schema: 'wallet' })
@Index('IDX_recurring_transfer_history_recurring_transfer_id', [
  'recurringTransferId',
])
@Index('IDX_recurring_transfer_history_executed_at', ['executedAt'])
@Index('IDX_recurring_transfer_history_transaction_id', ['transactionId'])
@Index('IDX_recurring_transfer_history_success', ['success'])
export class RecurringTransferHistoryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recurring_transfer_id', type: 'uuid' })
  recurringTransferId: string;

  @ManyToOne(() => RecurringTransferOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recurring_transfer_id' })
  recurringTransfer?: RecurringTransferOrmEntity;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 6,
  })
  amount: string;

  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @CreateDateColumn({ name: 'executed_at' })
  executedAt: Date;

  @Column({ type: 'boolean' })
  success: boolean;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId: string | null;
}
