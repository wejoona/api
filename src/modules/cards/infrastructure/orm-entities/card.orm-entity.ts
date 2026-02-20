import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities';
import { WalletOrmEntity } from '../../../wallet/infrastructure/orm-entities/wallet.orm-entity';

@Entity('cards')
export class CardOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index()
  walletId: string;

  /**
   * Card number stored encrypted at rest.
   * Only the last 4 digits should be returned to clients.
   * TODO: Implement column-level encryption via TypeORM transformer or application-level AES-256-GCM.
   */
  @Column({ name: 'card_number_encrypted', type: 'varchar', length: 512 })
  cardNumberEncrypted: string;

  /** Last 4 digits of card number for display purposes */
  @Column({ name: 'card_last_four', type: 'varchar', length: 4 })
  cardLastFour: string;

  /**
   * CVV — PCI DSS prohibits storing CVV post-authorization.
   * This column is DEPRECATED and should NOT be populated.
   * Existing data should be purged via migration.
   * @deprecated Do not store CVV. Will be removed in a future migration.
   */
  @Column({ name: 'cvv_encrypted', type: 'varchar', length: 512, nullable: true })
  cvvEncrypted: string | null;

  @Column({ name: 'expiry_month', type: 'varchar', length: 2 })
  expiryMonth: string;

  @Column({ name: 'expiry_year', type: 'varchar', length: 2 })
  expiryYear: string;

  @Column({ name: 'cardholder_name', type: 'varchar', length: 255 })
  cardholderName: string;

  @Column({
    name: 'card_type',
    type: 'varchar',
    length: 20,
    default: 'virtual',
  })
  @Index()
  cardType: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  @Index()
  status: string;

  @Column({ name: 'spending_limit', type: 'decimal', precision: 18, scale: 2 })
  spendingLimit: number;

  @Column({
    name: 'spent_amount',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  spentAmount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ name: 'frozen_at', type: 'timestamp', nullable: true })
  frozenAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @ManyToOne(() => WalletOrmEntity)
  @JoinColumn({ name: 'wallet_id' })
  wallet?: WalletOrmEntity;
}
