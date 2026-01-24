import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities';

@Entity('wallets')
export class WalletOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    name: 'yellow_card_wallet_id',
    type: 'varchar',
    length: 100,
    nullable: true,
    unique: true,
  })
  @Index()
  yellowCardWalletId: string | null;

  // Circle integration
  @Column({
    name: 'circle_wallet_id',
    type: 'varchar',
    length: 100,
    nullable: true,
    unique: true,
  })
  @Index()
  circleWalletId: string | null;

  @Column({
    name: 'circle_wallet_address',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  circleWalletAddress: string | null;

  @Column({ type: 'varchar', length: 10, default: 'USDC' })
  currency: string;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  balance: number;

  @Column({ name: 'kyc_status', type: 'varchar', length: 20, default: 'none' })
  kycStatus: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  // Optimistic locking version column
  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;
}
