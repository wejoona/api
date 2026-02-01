import { RecurringTransferHistory } from '../entities/recurring-transfer-history.entity';

export abstract class RecurringTransferHistoryRepository {
  abstract findById(id: string): Promise<RecurringTransferHistory | null>;
  abstract findByRecurringTransferId(
    recurringTransferId: string,
  ): Promise<RecurringTransferHistory[]>;
  abstract save(
    history: RecurringTransferHistory,
  ): Promise<RecurringTransferHistory>;
  abstract delete(id: string): Promise<void>;
}
