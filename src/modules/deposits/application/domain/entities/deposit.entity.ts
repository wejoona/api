import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum PaymentMethodType { OTP = 'OTP', PUSH = 'PUSH', QR_LINK = 'QR_LINK', CARD = 'CARD' }
export enum DepositStatus { INITIATED = 'INITIATED', PENDING_CONFIRMATION = 'PENDING_CONFIRMATION', PROCESSING = 'PROCESSING', COMPLETED = 'COMPLETED', FAILED = 'FAILED', EXPIRED = 'EXPIRED', TIMEOUT = 'TIMEOUT' }
export enum ProviderCode { OMCI = 'OMCI', MTNCI = 'MTNCI', MOOVCI = 'MOOVCI', WAVECI = 'WAVECI' }

@Entity('deposits')
export class Deposit {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') @Index() userId: string;
  @Column('decimal', { precision: 18, scale: 2 }) amount: number;
  @Column('decimal', { precision: 18, scale: 6 }) usdcAmount: number;
  @Column('decimal', { precision: 18, scale: 6 }) exchangeRate: number;
  @Column({ type: 'varchar', length: 10 }) provider: ProviderCode;
  @Column({ type: 'varchar', length: 20 }) phoneNumber: string;
  @Column({ type: 'enum', enum: PaymentMethodType }) paymentMethodType: PaymentMethodType;
  @Column({ type: 'enum', enum: DepositStatus, default: DepositStatus.INITIATED }) @Index() status: DepositStatus;
  @Column({ type: 'varchar', nullable: true }) providerReference: string | null;
  @Column({ type: 'varchar', nullable: true }) failureReason: string | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @Column({ type: 'timestamp', nullable: true }) completedAt: Date | null;
}
