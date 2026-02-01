import { v4 as uuidv4 } from 'uuid';

export type BulkPaymentStatus =
  | 'draft'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'partially_completed'
  | 'failed';
export type BulkPaymentItemStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export interface IBulkPayment {
  id: string;
  walletId: string;
  name: string;
  totalAmount: number;
  totalRecipients: number;
  successCount: number;
  failedCount: number;
  status: BulkPaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  processedAt: Date | null;
}

export interface IBulkPaymentItem {
  id: string;
  bulkPaymentId: string;
  recipientPhone: string;
  recipientName: string | null;
  amount: number;
  description: string | null;
  status: BulkPaymentItemStatus;
  errorMessage: string | null;
  transactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  processedAt: Date | null;
}

export interface CreateBulkPaymentProps {
  walletId: string;
  name: string;
  items: CreateBulkPaymentItemProps[];
}

export interface CreateBulkPaymentItemProps {
  recipientPhone: string;
  recipientName?: string;
  amount: number;
  description?: string;
}

export class BulkPaymentItemEntity implements IBulkPaymentItem {
  readonly id: string;
  readonly bulkPaymentId: string;
  readonly recipientPhone: string;
  readonly recipientName: string | null;
  readonly amount: number;
  readonly description: string | null;
  status: BulkPaymentItemStatus;
  errorMessage: string | null;
  transactionId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  processedAt: Date | null;

  private constructor(props: IBulkPaymentItem) {
    this.id = props.id;
    this.bulkPaymentId = props.bulkPaymentId;
    this.recipientPhone = props.recipientPhone;
    this.recipientName = props.recipientName;
    this.amount = props.amount;
    this.description = props.description;
    this.status = props.status;
    this.errorMessage = props.errorMessage;
    this.transactionId = props.transactionId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.processedAt = props.processedAt;
  }

  static create(
    bulkPaymentId: string,
    props: CreateBulkPaymentItemProps,
  ): BulkPaymentItemEntity {
    return new BulkPaymentItemEntity({
      id: uuidv4(),
      bulkPaymentId,
      recipientPhone: props.recipientPhone,
      recipientName: props.recipientName || null,
      amount: props.amount,
      description: props.description || null,
      status: 'pending',
      errorMessage: null,
      transactionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      processedAt: null,
    });
  }

  static reconstitute(props: IBulkPaymentItem): BulkPaymentItemEntity {
    return new BulkPaymentItemEntity(props);
  }

  markProcessing(): void {
    this.status = 'processing';
  }

  complete(transactionId: string): void {
    this.status = 'completed';
    this.transactionId = transactionId;
    this.processedAt = new Date();
  }

  fail(errorMessage: string): void {
    this.status = 'failed';
    this.errorMessage = errorMessage;
    this.processedAt = new Date();
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
}

export class BulkPaymentEntity implements IBulkPayment {
  readonly id: string;
  readonly walletId: string;
  readonly name: string;
  totalAmount: number;
  totalRecipients: number;
  successCount: number;
  failedCount: number;
  status: BulkPaymentStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  processedAt: Date | null;

  private items: BulkPaymentItemEntity[] = [];

  private constructor(props: IBulkPayment) {
    this.id = props.id;
    this.walletId = props.walletId;
    this.name = props.name;
    this.totalAmount = props.totalAmount;
    this.totalRecipients = props.totalRecipients;
    this.successCount = props.successCount;
    this.failedCount = props.failedCount;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.processedAt = props.processedAt;
  }

  static create(props: CreateBulkPaymentProps): BulkPaymentEntity {
    const id = uuidv4();
    const totalAmount = props.items.reduce((sum, item) => sum + item.amount, 0);

    const entity = new BulkPaymentEntity({
      id,
      walletId: props.walletId,
      name: props.name,
      totalAmount,
      totalRecipients: props.items.length,
      successCount: 0,
      failedCount: 0,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      processedAt: null,
    });

    entity.items = props.items.map((item) =>
      BulkPaymentItemEntity.create(id, item),
    );

    return entity;
  }

  static reconstitute(
    props: IBulkPayment,
    items: BulkPaymentItemEntity[] = [],
  ): BulkPaymentEntity {
    const entity = new BulkPaymentEntity(props);
    entity.items = items;
    return entity;
  }

  setItems(items: BulkPaymentItemEntity[]): void {
    this.items = items;
  }

  getItems(): BulkPaymentItemEntity[] {
    return this.items;
  }

  submit(): void {
    this.status = 'pending';
  }

  startProcessing(): void {
    this.status = 'processing';
  }

  complete(): void {
    this.updateCounts();

    if (this.failedCount === 0) {
      this.status = 'completed';
    } else if (this.successCount > 0) {
      this.status = 'partially_completed';
    } else {
      this.status = 'failed';
    }

    this.processedAt = new Date();
  }

  fail(): void {
    this.status = 'failed';
    this.processedAt = new Date();
  }

  private updateCounts(): void {
    this.successCount = this.items.filter((item) => item.isCompleted).length;
    this.failedCount = this.items.filter((item) => item.isFailed).length;
  }

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

  get hasItems(): boolean {
    return this.items.length > 0;
  }

  get pendingItems(): BulkPaymentItemEntity[] {
    return this.items.filter((item) => item.isPending);
  }

  get completedItems(): BulkPaymentItemEntity[] {
    return this.items.filter((item) => item.isCompleted);
  }

  get failedItems(): BulkPaymentItemEntity[] {
    return this.items.filter((item) => item.isFailed);
  }
}
