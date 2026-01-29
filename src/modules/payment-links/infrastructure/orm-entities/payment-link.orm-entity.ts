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
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities/user.orm-entity';
import { WalletOrmEntity } from '../../../wallet/infrastructure/orm-entities/wallet.orm-entity';

@Entity({ name: 'payment_links', schema: 'public' })
export class PaymentLinkOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index()
  walletId!: string;

  @ManyToOne(() => WalletOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet?: WalletOrmEntity;

  @Column({ type: 'varchar', length: 20, unique: true })
  @Index()
  code!: string;

  @Column({ type: 'decimal', precision: 20, scale: 6, nullable: true })
  amount!: string | null;

  @Column({ type: 'varchar', length: 10, default: 'USDC' })
  currency!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  @Index()
  status!: string;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  @Index()
  expiresAt!: Date | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'paid_by_user_id', type: 'uuid', nullable: true })
  paidByUserId!: string | null;

  @ManyToOne(() => UserOrmEntity, { nullable: true })
  @JoinColumn({ name: 'paid_by_user_id' })
  paidByUser?: UserOrmEntity;

  @Column({ name: 'view_count', type: 'integer', default: 0 })
  viewCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
