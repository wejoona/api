import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WalletOrmEntity } from '../../../wallet/infrastructure/orm-entities';

@Entity('transactions')
export class TransactionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index()
  walletId: string;

  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status: string;

  @Column({
    name: 'yellow_card_ref',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  @Index()
  yellowCardRef: string | null;

  @Column({
    name: 'recipient_address',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  recipientAddress: string | null;

  @Column({
    name: 'recipient_phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  recipientPhone: string | null;

  @Column({ name: 'recipient_wallet_id', type: 'uuid', nullable: true })
  recipientWalletId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => WalletOrmEntity)
  @JoinColumn({ name: 'wallet_id' })
  wallet?: WalletOrmEntity;
}
