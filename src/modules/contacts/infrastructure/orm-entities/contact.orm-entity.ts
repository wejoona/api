import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('contacts')
@Unique(['userId', 'phone'])
@Unique(['userId', 'walletAddress'])
@Unique(['userId', 'contactUserId'])
export class ContactOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'contact_user_id', type: 'uuid', nullable: true })
  @Index()
  contactUserId: string | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  @Index()
  phone: string | null;

  @Column({
    name: 'wallet_address',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  @Index()
  walletAddress: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  username: string | null;

  @Column({ name: 'is_favorite', type: 'boolean', default: false })
  @Index()
  isFavorite: boolean;

  @Column({ name: 'transaction_count', type: 'integer', default: 0 })
  transactionCount: number;

  @Column({ name: 'last_transaction_at', type: 'timestamp', nullable: true })
  lastTransactionAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
