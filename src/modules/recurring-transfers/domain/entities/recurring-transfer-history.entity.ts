import { v4 as uuidv4 } from 'uuid';

export interface RecurringTransferHistoryProps {
  id?: string;
  recurringTransferId: string;
  amount: number;
  currency: string;
  executedAt: Date;
  success: boolean;
  errorMessage?: string | null;
  transactionId?: string | null;
}

export interface CreateRecurringTransferHistoryProps {
  recurringTransferId: string;
  amount: number;
  currency: string;
  success: boolean;
  errorMessage?: string | null;
  transactionId?: string | null;
}

export class RecurringTransferHistory {
  readonly id: string;
  readonly recurringTransferId: string;
  readonly amount: number;
  readonly currency: string;
  readonly executedAt: Date;
  readonly success: boolean;
  readonly errorMessage: string | null;
  readonly transactionId: string | null;

  private constructor(props: RecurringTransferHistoryProps) {
    this.id = props.id || uuidv4();
    this.recurringTransferId = props.recurringTransferId;
    this.amount = props.amount;
    this.currency = props.currency;
    this.executedAt = props.executedAt ?? new Date();
    this.success = props.success;
    this.errorMessage = props.errorMessage ?? null;
    this.transactionId = props.transactionId ?? null;
  }

  static create(
    props: CreateRecurringTransferHistoryProps,
  ): RecurringTransferHistory {
    return new RecurringTransferHistory({
      ...props,
      executedAt: new Date(),
    });
  }

  static reconstitute(
    props: RecurringTransferHistoryProps,
  ): RecurringTransferHistory {
    return new RecurringTransferHistory(props);
  }
}
