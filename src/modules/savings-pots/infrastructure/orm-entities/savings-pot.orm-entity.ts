import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WalletOrmEntity } from '../../../wallet/infrastructure/orm-entities/wallet.orm-entity';

@Entity({ name: 'savings_pots', schema: 'wallet' })
export class SavingsPotOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index()
  walletId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  emoji: string | null;

  @Column({ type: 'integer', nullable: true })
  color: number | null;

  @Column({ name: 'target_amount', type: 'decimal', precision: 18, scale: 6 })
  targetAmount: number;

  @Column({
    name: 'current_amount',
    type: 'decimal',
    precision: 18,
    scale: 6,
    default: 0,
  })
  currentAmount: number;

  @Column({ type: 'varchar', length: 10, default: 'USDC' })
  currency: string;

  @Column({ name: 'target_date', type: 'timestamp', nullable: true })
  targetDate: Date | null;

  @Column({ name: 'is_locked', type: 'boolean', default: false })
  isLocked: boolean;

  @Column({ name: 'lock_until', type: 'timestamp', nullable: true })
  lockUntil: Date | null;

  @Column({
    name: 'auto_deposit_amount',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  autoDepositAmount: number | null;

  @Column({
    name: 'auto_deposit_frequency',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  autoDepositFrequency: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => WalletOrmEntity)
  @JoinColumn({ name: 'wallet_id' })
  wallet?: WalletOrmEntity;
}
