import { v4 as uuidv4 } from 'uuid';

export type TransactionType =
  | 'deposit'
  | 'transfer_internal'
  | 'transfer_external'
  | 'withdrawal';
export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ITransaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  yellowCardRef: string | null;
  recipientAddress: string | null;
  recipientPhone: string | null;
  recipientWalletId: string | null;
  metadata: Record<string, unknown> | null;
  failureReason: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface CreateDepositProps {
  walletId: string;
  amount: number;
  currency?: string;
  yellowCardRef?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateInternalTransferProps {
  walletId: string;
  amount: number;
  recipientWalletId: string;
  recipientPhone: string;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateExternalTransferProps {
  walletId: string;
  amount: number;
  recipientAddress: string;
  currency?: string;
  yellowCardRef?: string;
  metadata?: Record<string, unknown>;
}

export class TransactionEntity implements ITransaction {
  readonly id: string;
  readonly walletId: string;
  readonly type: TransactionType;
  readonly amount: number;
  readonly currency: string;
  status: TransactionStatus;
  yellowCardRef: string | null;
  readonly recipientAddress: string | null;
  readonly recipientPhone: string | null;
  readonly recipientWalletId: string | null;
  metadata: Record<string, unknown> | null;
  failureReason: string | null;
  readonly createdAt: Date;
  completedAt: Date | null;

  private constructor(props: ITransaction) {
    this.id = props.id;
    this.walletId = props.walletId;
    this.type = props.type;
    this.amount = props.amount;
    this.currency = props.currency;
    this.status = props.status;
    this.yellowCardRef = props.yellowCardRef;
    this.recipientAddress = props.recipientAddress;
    this.recipientPhone = props.recipientPhone;
    this.recipientWalletId = props.recipientWalletId;
    this.metadata = props.metadata;
    this.failureReason = props.failureReason;
    this.createdAt = props.createdAt;
    this.completedAt = props.completedAt;
  }

  static createDeposit(props: CreateDepositProps): TransactionEntity {
    return new TransactionEntity({
      id: uuidv4(),
      walletId: props.walletId,
      type: 'deposit',
      amount: props.amount,
      currency: props.currency || 'USD',
      status: 'pending',
      yellowCardRef: props.yellowCardRef || null,
      recipientAddress: null,
      recipientPhone: null,
      recipientWalletId: null,
      metadata: props.metadata || null,
      failureReason: null,
      createdAt: new Date(),
      completedAt: null,
    });
  }

  static createInternalTransfer(
    props: CreateInternalTransferProps,
  ): TransactionEntity {
    return new TransactionEntity({
      id: uuidv4(),
      walletId: props.walletId,
      type: 'transfer_internal',
      amount: props.amount,
      currency: props.currency || 'USD',
      status: 'pending',
      yellowCardRef: null,
      recipientAddress: null,
      recipientPhone: props.recipientPhone,
      recipientWalletId: props.recipientWalletId,
      metadata: props.metadata || null,
      failureReason: null,
      createdAt: new Date(),
      completedAt: null,
    });
  }

  static createExternalTransfer(
    props: CreateExternalTransferProps,
  ): TransactionEntity {
    return new TransactionEntity({
      id: uuidv4(),
      walletId: props.walletId,
      type: 'transfer_external',
      amount: props.amount,
      currency: props.currency || 'USD',
      status: 'pending',
      yellowCardRef: props.yellowCardRef || null,
      recipientAddress: props.recipientAddress,
      recipientPhone: null,
      recipientWalletId: null,
      metadata: props.metadata || null,
      failureReason: null,
      createdAt: new Date(),
      completedAt: null,
    });
  }

  static reconstitute(props: ITransaction): TransactionEntity {
    return new TransactionEntity(props);
  }

  markProcessing(): void {
    this.status = 'processing';
  }

  updateStatus(status: TransactionStatus): void {
    this.status = status;
    if (
      status === 'completed' ||
      status === 'failed' ||
      status === 'cancelled'
    ) {
      this.completedAt = new Date();
    }
  }

  complete(): void {
    this.status = 'completed';
    this.completedAt = new Date();
  }

  fail(reason: string): void {
    this.status = 'failed';
    this.failureReason = reason;
    this.completedAt = new Date();
  }

  cancel(): void {
    this.status = 'cancelled';
    this.completedAt = new Date();
  }

  setYellowCardRef(ref: string): void {
    this.yellowCardRef = ref;
  }

  // Generic alias for provider reference (decoupled from Yellow Card naming)
  setProviderRef(ref: string): void {
    this.setYellowCardRef(ref);
  }

  get providerRef(): string | null {
    return this.yellowCardRef;
  }

  addMetadata(key: string, value: unknown): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
  }

  get isPending(): boolean {
    return this.status === 'pending';
  }

  get isCompleted(): boolean {
    return this.status === 'completed';
  }

  get isFailed(): boolean {
    return this.status === 'failed';
  }

  get isDeposit(): boolean {
    return this.type === 'deposit';
  }

  get isTransfer(): boolean {
    return (
      this.type === 'transfer_internal' || this.type === 'transfer_external'
    );
  }
}
