import { v4 as uuidv4 } from 'uuid';

export type TransferType = 'internal' | 'external';
export type TransferStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface ITransfer {
  id: string;
  reference: string;
  type: TransferType;
  status: TransferStatus;
  senderId: string;
  senderWalletId: string;
  senderPhone: string | null;
  recipientId: string | null;
  recipientWalletId: string | null;
  recipientPhone: string | null;
  recipientAddress: string | null;
  recipientBlockchain: string | null;
  amount: number;
  fee: number;
  currency: string;
  note: string | null;
  providerTransferId: string | null;
  providerName: string | null;
  ledgerTransactionId: string | null;
  txHash: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface CreateInternalTransferProps {
  senderId: string;
  senderWalletId: string;
  senderPhone?: string;
  recipientId: string;
  recipientWalletId: string;
  recipientPhone: string;
  amount: number;
  fee?: number;
  currency?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateExternalTransferProps {
  senderId: string;
  senderWalletId: string;
  recipientAddress: string;
  recipientBlockchain?: string;
  amount: number;
  fee?: number;
  currency?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

export class TransferEntity implements ITransfer {
  readonly id: string;
  readonly reference: string;
  readonly type: TransferType;
  status: TransferStatus;
  readonly senderId: string;
  readonly senderWalletId: string;
  readonly senderPhone: string | null;
  readonly recipientId: string | null;
  readonly recipientWalletId: string | null;
  readonly recipientPhone: string | null;
  readonly recipientAddress: string | null;
  readonly recipientBlockchain: string | null;
  readonly amount: number;
  readonly fee: number;
  readonly currency: string;
  readonly note: string | null;
  providerTransferId: string | null;
  providerName: string | null;
  ledgerTransactionId: string | null;
  txHash: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  readonly createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;

  private constructor(props: ITransfer) {
    this.id = props.id;
    this.reference = props.reference;
    this.type = props.type;
    this.status = props.status;
    this.senderId = props.senderId;
    this.senderWalletId = props.senderWalletId;
    this.senderPhone = props.senderPhone;
    this.recipientId = props.recipientId;
    this.recipientWalletId = props.recipientWalletId;
    this.recipientPhone = props.recipientPhone;
    this.recipientAddress = props.recipientAddress;
    this.recipientBlockchain = props.recipientBlockchain;
    this.amount = props.amount;
    this.fee = props.fee;
    this.currency = props.currency;
    this.note = props.note;
    this.providerTransferId = props.providerTransferId;
    this.providerName = props.providerName;
    this.ledgerTransactionId = props.ledgerTransactionId;
    this.txHash = props.txHash;
    this.errorMessage = props.errorMessage;
    this.metadata = props.metadata;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.completedAt = props.completedAt;
  }

  static createInternal(props: CreateInternalTransferProps): TransferEntity {
    const now = new Date();
    const reference = TransferEntity.generateReference('INT');

    return new TransferEntity({
      id: uuidv4(),
      reference,
      type: 'internal',
      status: 'pending',
      senderId: props.senderId,
      senderWalletId: props.senderWalletId,
      senderPhone: props.senderPhone || null,
      recipientId: props.recipientId,
      recipientWalletId: props.recipientWalletId,
      recipientPhone: props.recipientPhone,
      recipientAddress: null,
      recipientBlockchain: null,
      amount: props.amount,
      fee: props.fee || 0,
      currency: props.currency || 'USDC',
      note: props.note || null,
      providerTransferId: null,
      providerName: null,
      ledgerTransactionId: null,
      txHash: null,
      errorMessage: null,
      metadata: props.metadata || null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    });
  }

  static createExternal(props: CreateExternalTransferProps): TransferEntity {
    const now = new Date();
    const reference = TransferEntity.generateReference('EXT');

    return new TransferEntity({
      id: uuidv4(),
      reference,
      type: 'external',
      status: 'pending',
      senderId: props.senderId,
      senderWalletId: props.senderWalletId,
      senderPhone: null,
      recipientId: null,
      recipientWalletId: null,
      recipientPhone: null,
      recipientAddress: props.recipientAddress,
      recipientBlockchain: props.recipientBlockchain || 'polygon',
      amount: props.amount,
      fee: props.fee || 0,
      currency: props.currency || 'USDC',
      note: props.note || null,
      providerTransferId: null,
      providerName: null,
      ledgerTransactionId: null,
      txHash: null,
      errorMessage: null,
      metadata: props.metadata || null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    });
  }

  static reconstitute(props: ITransfer): TransferEntity {
    return new TransferEntity(props);
  }

  private static generateReference(prefix: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Status transition methods
  markProcessing(): void {
    if (this.status !== 'pending') {
      throw new Error(`Cannot mark as processing from ${this.status} status`);
    }
    this.status = 'processing';
    this.updatedAt = new Date();
  }

  complete(txHash?: string): void {
    if (this.status !== 'processing' && this.status !== 'pending') {
      throw new Error(`Cannot complete transfer from ${this.status} status`);
    }
    this.status = 'completed';
    this.completedAt = new Date();
    this.updatedAt = new Date();
    if (txHash) {
      this.txHash = txHash;
    }
  }

  fail(errorMessage: string): void {
    if (this.status === 'completed') {
      throw new Error('Cannot fail a completed transfer');
    }
    this.status = 'failed';
    this.errorMessage = errorMessage;
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  cancel(): void {
    if (this.status === 'completed' || this.status === 'processing') {
      throw new Error(`Cannot cancel transfer in ${this.status} status`);
    }
    this.status = 'cancelled';
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }

  refund(): void {
    if (this.status !== 'completed') {
      throw new Error('Can only refund completed transfers');
    }
    this.status = 'refunded';
    this.updatedAt = new Date();
  }

  setProviderInfo(providerTransferId: string, providerName: string): void {
    this.providerTransferId = providerTransferId;
    this.providerName = providerName;
    this.updatedAt = new Date();
  }

  setLedgerTransactionId(ledgerTransactionId: string): void {
    this.ledgerTransactionId = ledgerTransactionId;
    this.updatedAt = new Date();
  }

  setTxHash(txHash: string): void {
    this.txHash = txHash;
    this.updatedAt = new Date();
  }

  addMetadata(key: string, value: unknown): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
    this.updatedAt = new Date();
  }

  // Getters
  get isPending(): boolean {
    return this.status === 'pending';
  }

  get isProcessing(): boolean {
    return this.status === 'processing';
  }

  get isCompleted(): boolean {
    return this.status === 'completed';
  }

  get isFailed(): boolean {
    return this.status === 'failed';
  }

  get isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  get isRefunded(): boolean {
    return this.status === 'refunded';
  }

  get isInternal(): boolean {
    return this.type === 'internal';
  }

  get isExternal(): boolean {
    return this.type === 'external';
  }

  get totalAmount(): number {
    return this.amount + this.fee;
  }

  get canBeCancelled(): boolean {
    return this.status === 'pending';
  }

  get canBeRefunded(): boolean {
    return this.status === 'completed';
  }
}
