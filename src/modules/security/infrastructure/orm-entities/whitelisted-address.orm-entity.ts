import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('whitelisted_addresses')
@Unique(['userId', 'address'])
export class WhitelistedAddressOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  address: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({
    name: 'address_type',
    type: 'varchar',
    length: 20,
    default: 'external',
  })
  addressType: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  network: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status: string;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: 'usage_count', type: 'integer', default: 0 })
  usageCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
