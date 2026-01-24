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
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities';
import { WalletOrmEntity } from '../../../wallet/infrastructure/orm-entities';

@Entity('transfers')
export class TransferOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  reference: string;

  @Column({
    type: 'enum',
    enum: ['internal', 'external'],
  })
  @Index()
  type: string;

  @Column({
    type: 'enum',
    enum: [
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'refunded',
    ],
    default: 'pending',
  })
  @Index()
  status: string;

  @Column({ name: 'sender_id', type: 'uuid' })
  @Index()
  senderId: string;

  @Column({ name: 'sender_wallet_id', type: 'uuid' })
  @Index()
  senderWalletId: string;

  @Column({ name: 'sender_phone', type: 'varchar', length: 20, nullable: true })
  senderPhone: string | null;

  @Column({ name: 'recipient_id', type: 'uuid', nullable: true })
  @Index()
  recipientId: string | null;

  @Column({ name: 'recipient_wallet_id', type: 'uuid', nullable: true })
  recipientWalletId: string | null;

  @Column({
    name: 'recipient_phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  @Index()
  recipientPhone: string | null;

  @Column({
    name: 'recipient_address',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  recipientAddress: string | null;

  @Column({
    name: 'recipient_blockchain',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  recipientBlockchain: string | null;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'bigint', default: 0 })
  fee: number;

  @Column({ type: 'varchar', length: 10, default: 'USDC' })
  currency: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  @Column({
    name: 'provider_transfer_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @Index()
  providerTransferId: string | null;

  @Column({
    name: 'provider_name',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  providerName: string | null;

  @Column({ name: 'ledger_transaction_id', type: 'uuid', nullable: true })
  ledgerTransactionId: string | null;

  @Column({ name: 'tx_hash', type: 'varchar', length: 255, nullable: true })
  txHash: string | null;

  @Column({
    name: 'error_message',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  errorMessage: string | null;

  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'sender_id' })
  sender?: UserOrmEntity;

  @ManyToOne(() => UserOrmEntity)
  @JoinColumn({ name: 'recipient_id' })
  recipient?: UserOrmEntity;

  @ManyToOne(() => WalletOrmEntity)
  @JoinColumn({ name: 'sender_wallet_id' })
  senderWallet?: WalletOrmEntity;

  @ManyToOne(() => WalletOrmEntity)
  @JoinColumn({ name: 'recipient_wallet_id' })
  recipientWallet?: WalletOrmEntity;
}
