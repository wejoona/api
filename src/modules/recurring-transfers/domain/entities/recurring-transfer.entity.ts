import { v4 as uuidv4 } from 'uuid';

export enum RecurringTransferFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
}

export enum RecurringTransferStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export interface RecurringTransferProps {
  id?: string;
  walletId: string;
  recipientPhone: string;
  recipientName: string;
  amount: number;
  currency: string;
  frequency: RecurringTransferFrequency;
  startDate: Date;
  endDate?: Date | null;
  nextExecutionDate: Date;
  occurrencesTotal?: number | null;
  occurrencesRemaining?: number | null;
  status: RecurringTransferStatus;
  note?: string | null;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  executedCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateRecurringTransferProps {
  walletId: string;
  recipientPhone: string;
  recipientName: string;
  amount: number;
  currency: string;
  frequency: RecurringTransferFrequency;
  startDate: Date;
  endDate?: Date | null;
  occurrences?: number | null;
  note?: string | null;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
}

export class RecurringTransfer {
  readonly id: string;
  readonly walletId: string;
  private _recipientPhone: string;
  private _recipientName: string;
  private _amount: number;
  private _currency: string;
  private _frequency: RecurringTransferFrequency;
  private _startDate: Date;
  private _endDate: Date | null;
  private _nextExecutionDate: Date;
  private _occurrencesTotal: number | null;
  private _occurrencesRemaining: number | null;
  private _status: RecurringTransferStatus;
  private _note: string | null;
  private _dayOfWeek: number | null;
  private _dayOfMonth: number | null;
  private _executedCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: RecurringTransferProps) {
    this.id = props.id || uuidv4();
    this.walletId = props.walletId;
    this._recipientPhone = props.recipientPhone;
    this._recipientName = props.recipientName;
    this._amount = props.amount;
    this._currency = props.currency;
    this._frequency = props.frequency;
    this._startDate = props.startDate;
    this._endDate = props.endDate ?? null;
    this._nextExecutionDate = props.nextExecutionDate;
    this._occurrencesTotal = props.occurrencesTotal ?? null;
    this._occurrencesRemaining = props.occurrencesRemaining ?? null;
    this._status = props.status;
    this._note = props.note ?? null;
    this._dayOfWeek = props.dayOfWeek ?? null;
    this._dayOfMonth = props.dayOfMonth ?? null;
    this._executedCount = props.executedCount;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  // Getters
  get recipientPhone(): string {
    return this._recipientPhone;
  }

  get recipientName(): string {
    return this._recipientName;
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  get frequency(): RecurringTransferFrequency {
    return this._frequency;
  }

  get startDate(): Date {
    return this._startDate;
  }

  get endDate(): Date | null {
    return this._endDate;
  }

  get nextExecutionDate(): Date {
    return this._nextExecutionDate;
  }

  get occurrencesTotal(): number | null {
    return this._occurrencesTotal;
  }

  get occurrencesRemaining(): number | null {
    return this._occurrencesRemaining;
  }

  get status(): RecurringTransferStatus {
    return this._status;
  }

  get note(): string | null {
    return this._note;
  }

  get dayOfWeek(): number | null {
    return this._dayOfWeek;
  }

  get dayOfMonth(): number | null {
    return this._dayOfMonth;
  }

  get executedCount(): number {
    return this._executedCount;
  }

  get isActive(): boolean {
    return this._status === RecurringTransferStatus.ACTIVE;
  }

  get isPaused(): boolean {
    return this._status === RecurringTransferStatus.PAUSED;
  }

  get isCancelled(): boolean {
    return this._status === RecurringTransferStatus.CANCELLED;
  }

  get isCompleted(): boolean {
    return this._status === RecurringTransferStatus.COMPLETED;
  }

  // Business methods
  updateAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }
    this._amount = amount;
  }

  updateFrequency(
    frequency: RecurringTransferFrequency,
    dayOfWeek?: number,
    dayOfMonth?: number,
  ): void {
    this._frequency = frequency;
    this._dayOfWeek = dayOfWeek ?? null;
    this._dayOfMonth = dayOfMonth ?? null;
  }

  updateNote(note: string): void {
    this._note = note;
  }

  pause(): void {
    if (this._status !== RecurringTransferStatus.ACTIVE) {
      throw new Error('Only active transfers can be paused');
    }
    this._status = RecurringTransferStatus.PAUSED;
  }

  resume(): void {
    if (this._status !== RecurringTransferStatus.PAUSED) {
      throw new Error('Only paused transfers can be resumed');
    }
    this._status = RecurringTransferStatus.ACTIVE;
  }

  cancel(): void {
    if (
      this._status === RecurringTransferStatus.CANCELLED ||
      this._status === RecurringTransferStatus.COMPLETED
    ) {
      throw new Error('Transfer is already cancelled or completed');
    }
    this._status = RecurringTransferStatus.CANCELLED;
  }

  recordExecution(success: boolean): void {
    if (success) {
      this._executedCount++;

      // Update occurrences remaining
      if (this._occurrencesRemaining !== null) {
        this._occurrencesRemaining--;

        // Check if completed
        if (this._occurrencesRemaining <= 0) {
          this._status = RecurringTransferStatus.COMPLETED;
          return;
        }
      }

      // Calculate next execution date
      this._nextExecutionDate = this.calculateNextExecutionDate();

      // Check if end date has passed
      if (this._endDate && this._nextExecutionDate > this._endDate) {
        this._status = RecurringTransferStatus.COMPLETED;
      }
    }
  }

  private calculateNextExecutionDate(): Date {
    const current = new Date(this._nextExecutionDate);

    switch (this._frequency) {
      case RecurringTransferFrequency.DAILY:
        current.setDate(current.getDate() + 1);
        break;

      case RecurringTransferFrequency.WEEKLY:
        current.setDate(current.getDate() + 7);
        break;

      case RecurringTransferFrequency.BIWEEKLY:
        current.setDate(current.getDate() + 14);
        break;

      case RecurringTransferFrequency.MONTHLY:
        // Move to next month, keeping the same day if possible
        const targetDay = this._dayOfMonth || current.getDate();
        current.setMonth(current.getMonth() + 1);
        // Handle months with fewer days
        const daysInMonth = new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          0,
        ).getDate();
        current.setDate(Math.min(targetDay, daysInMonth));
        break;
    }

    return current;
  }

  calculateNextDates(count: number): Date[] {
    const dates: Date[] = [];
    const current = new Date(this._nextExecutionDate);

    for (let i = 0; i < count; i++) {
      dates.push(new Date(current));

      // Calculate next date
      switch (this._frequency) {
        case RecurringTransferFrequency.DAILY:
          current.setDate(current.getDate() + 1);
          break;

        case RecurringTransferFrequency.WEEKLY:
          current.setDate(current.getDate() + 7);
          break;

        case RecurringTransferFrequency.BIWEEKLY:
          current.setDate(current.getDate() + 14);
          break;

        case RecurringTransferFrequency.MONTHLY:
          const targetDay = this._dayOfMonth || current.getDate();
          current.setMonth(current.getMonth() + 1);
          const daysInMonth = new Date(
            current.getFullYear(),
            current.getMonth() + 1,
            0,
          ).getDate();
          current.setDate(Math.min(targetDay, daysInMonth));
          break;
      }

      // Stop if we've reached the end date
      if (this._endDate && current > this._endDate) {
        break;
      }

      // Stop if we've reached the occurrence limit
      if (
        this._occurrencesRemaining !== null &&
        i + 1 >= this._occurrencesRemaining
      ) {
        break;
      }
    }

    return dates;
  }

  static create(props: CreateRecurringTransferProps): RecurringTransfer {
    // Validate
    if (props.amount <= 0) {
      throw new Error('Amount must be positive');
    }

    if (props.startDate < new Date()) {
      throw new Error('Start date must be in the future or today');
    }

    if (props.endDate && props.endDate <= props.startDate) {
      throw new Error('End date must be after start date');
    }

    // Calculate next execution date (same as start date initially)
    const nextExecutionDate = new Date(props.startDate);

    return new RecurringTransfer({
      walletId: props.walletId,
      recipientPhone: props.recipientPhone,
      recipientName: props.recipientName,
      amount: props.amount,
      currency: props.currency,
      frequency: props.frequency,
      startDate: props.startDate,
      endDate: props.endDate ?? null,
      nextExecutionDate,
      occurrencesTotal: props.occurrences ?? null,
      occurrencesRemaining: props.occurrences ?? null,
      status: RecurringTransferStatus.ACTIVE,
      note: props.note ?? null,
      dayOfWeek: props.dayOfWeek ?? null,
      dayOfMonth: props.dayOfMonth ?? null,
      executedCount: 0,
    });
  }

  static reconstitute(props: RecurringTransferProps): RecurringTransfer {
    return new RecurringTransfer(props);
  }
}
