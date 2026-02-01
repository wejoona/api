import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BusinessOrmEntity } from '../../../business/infrastructure/orm-entities/business.orm-entity';

export enum SubBusinessType {
  DEPARTMENT = 'department',
  BRANCH = 'branch',
  TEAM = 'team',
}

export enum SubBusinessStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity({ name: 'sub_businesses' })
@Unique('UQ_sub_businesses_wallet_id', ['walletId'])
export class SubBusinessOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', type: 'uuid' })
  @Index()
  businessId: string;

  @ManyToOne(() => BusinessOrmEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business?: BusinessOrmEntity;

  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index()
  walletId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: SubBusinessType,
    default: SubBusinessType.DEPARTMENT,
  })
  type: SubBusinessType;

  @Column({ type: 'jsonb', default: '{}' })
  permissions: Record<string, unknown>;

  @Column({
    name: 'spending_limit',
    type: 'decimal',
    precision: 18,
    scale: 6,
    nullable: true,
  })
  spendingLimit: string | null;

  @Column({
    type: 'enum',
    enum: SubBusinessStatus,
    default: SubBusinessStatus.ACTIVE,
  })
  @Index()
  status: SubBusinessStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
