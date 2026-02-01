import {
  RecurringTransfer,
  RecurringTransferStatus,
} from '../entities/recurring-transfer.entity';

export abstract class RecurringTransferRepository {
  abstract findById(id: string): Promise<RecurringTransfer | null>;
  abstract findByWalletId(walletId: string): Promise<RecurringTransfer[]>;
  abstract findByWalletIdAndStatus(
    walletId: string,
    status: RecurringTransferStatus,
  ): Promise<RecurringTransfer[]>;
  abstract findActiveByWalletId(walletId: string): Promise<RecurringTransfer[]>;
  abstract findDueForExecution(beforeDate: Date): Promise<RecurringTransfer[]>;
  abstract findUpcoming(
    walletId: string,
    limit: number,
  ): Promise<RecurringTransfer[]>;
  abstract save(transfer: RecurringTransfer): Promise<RecurringTransfer>;
  abstract delete(id: string): Promise<void>;
  abstract countByWalletId(walletId: string): Promise<number>;
}
