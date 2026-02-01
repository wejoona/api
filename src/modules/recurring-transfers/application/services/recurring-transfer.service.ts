import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RecurringTransferRepository } from '../../domain/repositories/recurring-transfer.repository';
import { RecurringTransferHistoryRepository } from '../../domain/repositories/recurring-transfer-history.repository';
import { RecurringTransfer } from '../../domain/entities/recurring-transfer.entity';
import { RecurringTransferHistory } from '../../domain/entities/recurring-transfer-history.entity';

export interface CreateRecurringTransferParams {
  walletId: string;
  recipientPhone: string;
  recipientName: string;
  amount: number;
  currency: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  occurrences?: number;
  note?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
}

export interface UpdateRecurringTransferParams {
  amount?: number;
  frequency?: string;
  endDate?: Date;
  note?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
}

export interface RecurringTransferResponse {
  id: string;
  walletId: string;
  recipientPhone: string;
  recipientName: string;
  amount: number;
  currency: string;
  frequency: string;
  startDate: Date;
  endDate: Date | null;
  nextExecutionDate: Date;
  occurrencesTotal: number | null;
  occurrencesRemaining: number | null;
  status: string;
  note: string | null;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  executedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringTransferHistoryResponse {
  id: string;
  recurringTransferId: string;
  amount: number;
  currency: string;
  executedAt: Date;
  success: boolean;
  errorMessage: string | null;
  transactionId: string | null;
}

export interface UpcomingTransferResponse {
  recurringTransferId: string;
  recipientName: string;
  amount: number;
  currency: string;
  scheduledDate: Date;
}

@Injectable()
export class RecurringTransferService {
  private readonly logger = new Logger(RecurringTransferService.name);
  private readonly maxRecurringTransfersPerWallet = 50;

  constructor(
    private readonly recurringTransferRepository: RecurringTransferRepository,
    private readonly historyRepository: RecurringTransferHistoryRepository,
  ) {}

  /**
   * Create a new recurring transfer.
   */
  async createRecurringTransfer(
    params: CreateRecurringTransferParams,
  ): Promise<RecurringTransfer> {
    const { walletId } = params;

    // Check limit
    const count =
      await this.recurringTransferRepository.countByWalletId(walletId);
    if (count >= this.maxRecurringTransfersPerWallet) {
      throw new BadRequestException(
        `Maximum number of recurring transfers (${this.maxRecurringTransfersPerWallet}) reached`,
      );
    }

    // Validate frequency-specific fields
    if (
      (params.frequency === 'weekly' || params.frequency === 'biweekly') &&
      params.dayOfWeek === undefined
    ) {
      throw new BadRequestException(
        'dayOfWeek is required for weekly/biweekly frequency',
      );
    }

    if (params.frequency === 'monthly' && params.dayOfMonth === undefined) {
      throw new BadRequestException(
        'dayOfMonth is required for monthly frequency',
      );
    }

    const transfer = RecurringTransfer.create({
      walletId: params.walletId,
      recipientPhone: params.recipientPhone,
      recipientName: params.recipientName,
      amount: params.amount,
      currency: params.currency,
      frequency: params.frequency as any,
      startDate: params.startDate,
      endDate: params.endDate,
      occurrences: params.occurrences,
      note: params.note,
      dayOfWeek: params.dayOfWeek,
      dayOfMonth: params.dayOfMonth,
    });

    const saved = await this.recurringTransferRepository.save(transfer);

    this.logger.log(
      `Created recurring transfer ${saved.id} for wallet ${walletId}`,
    );
    return saved;
  }

  /**
   * Get all recurring transfers for a wallet.
   */
  async getRecurringTransfers(
    walletId: string,
  ): Promise<RecurringTransferResponse[]> {
    const transfers =
      await this.recurringTransferRepository.findByWalletId(walletId);
    return transfers.map(this.toResponse);
  }

  /**
   * Get a single recurring transfer.
   */
  async getRecurringTransfer(
    walletId: string,
    transferId: string,
  ): Promise<RecurringTransfer> {
    const transfer =
      await this.recurringTransferRepository.findById(transferId);

    if (!transfer) {
      throw new NotFoundException('Recurring transfer not found');
    }

    if (transfer.walletId !== walletId) {
      throw new ForbiddenException(
        'Recurring transfer does not belong to this wallet',
      );
    }

    return transfer;
  }

  /**
   * Update a recurring transfer.
   */
  async updateRecurringTransfer(
    walletId: string,
    transferId: string,
    params: UpdateRecurringTransferParams,
  ): Promise<RecurringTransfer> {
    const transfer = await this.getRecurringTransfer(walletId, transferId);

    if (transfer.isCancelled || transfer.isCompleted) {
      throw new BadRequestException(
        'Cannot update cancelled or completed transfers',
      );
    }

    if (params.amount !== undefined) {
      transfer.updateAmount(params.amount);
    }

    if (params.frequency !== undefined) {
      transfer.updateFrequency(
        params.frequency as any,
        params.dayOfWeek,
        params.dayOfMonth,
      );
    }

    if (params.note !== undefined) {
      transfer.updateNote(params.note);
    }

    const saved = await this.recurringTransferRepository.save(transfer);
    this.logger.log(`Updated recurring transfer ${transferId}`);
    return saved;
  }

  /**
   * Pause a recurring transfer.
   */
  async pauseRecurringTransfer(
    walletId: string,
    transferId: string,
  ): Promise<RecurringTransfer> {
    const transfer = await this.getRecurringTransfer(walletId, transferId);
    transfer.pause();

    const saved = await this.recurringTransferRepository.save(transfer);
    this.logger.log(`Paused recurring transfer ${transferId}`);
    return saved;
  }

  /**
   * Resume a recurring transfer.
   */
  async resumeRecurringTransfer(
    walletId: string,
    transferId: string,
  ): Promise<RecurringTransfer> {
    const transfer = await this.getRecurringTransfer(walletId, transferId);
    transfer.resume();

    const saved = await this.recurringTransferRepository.save(transfer);
    this.logger.log(`Resumed recurring transfer ${transferId}`);
    return saved;
  }

  /**
   * Cancel a recurring transfer.
   */
  async cancelRecurringTransfer(
    walletId: string,
    transferId: string,
  ): Promise<void> {
    const transfer = await this.getRecurringTransfer(walletId, transferId);
    transfer.cancel();

    await this.recurringTransferRepository.save(transfer);
    this.logger.log(`Cancelled recurring transfer ${transferId}`);
  }

  /**
   * Get execution history for a recurring transfer.
   */
  async getExecutionHistory(
    walletId: string,
    transferId: string,
  ): Promise<RecurringTransferHistoryResponse[]> {
    // Verify ownership
    await this.getRecurringTransfer(walletId, transferId);

    const history =
      await this.historyRepository.findByRecurringTransferId(transferId);
    return history.map(this.toHistoryResponse);
  }

  /**
   * Get upcoming executions for a wallet.
   */
  async getUpcomingExecutions(
    walletId: string,
    limit: number = 10,
  ): Promise<UpcomingTransferResponse[]> {
    const transfers = await this.recurringTransferRepository.findUpcoming(
      walletId,
      limit,
    );

    return transfers.map((transfer) => ({
      recurringTransferId: transfer.id,
      recipientName: transfer.recipientName,
      amount: transfer.amount,
      currency: transfer.currency,
      scheduledDate: transfer.nextExecutionDate,
    }));
  }

  /**
   * Get next execution dates for a recurring transfer.
   */
  async getNextExecutionDates(
    walletId: string,
    transferId: string,
    count: number = 3,
  ): Promise<Date[]> {
    const transfer = await this.getRecurringTransfer(walletId, transferId);
    return transfer.calculateNextDates(count);
  }

  /**
   * Record an execution in history.
   */
  async recordExecution(
    transferId: string,
    success: boolean,
    transactionId?: string,
    errorMessage?: string,
  ): Promise<void> {
    const transfer =
      await this.recurringTransferRepository.findById(transferId);

    if (!transfer) {
      throw new NotFoundException('Recurring transfer not found');
    }

    // Create history entry
    const history = RecurringTransferHistory.create({
      recurringTransferId: transferId,
      amount: transfer.amount,
      currency: transfer.currency,
      success,
      errorMessage,
      transactionId,
    });

    await this.historyRepository.save(history);

    // Update transfer
    transfer.recordExecution(success);
    await this.recurringTransferRepository.save(transfer);

    this.logger.log(
      `Recorded execution for recurring transfer ${transferId}: ${success ? 'success' : 'failed'}`,
    );
  }

  /**
   * Get transfers due for execution.
   */
  async getTransfersDueForExecution(): Promise<RecurringTransfer[]> {
    return this.recurringTransferRepository.findDueForExecution(new Date());
  }

  private toResponse(transfer: RecurringTransfer): RecurringTransferResponse {
    return {
      id: transfer.id,
      walletId: transfer.walletId,
      recipientPhone: transfer.recipientPhone,
      recipientName: transfer.recipientName,
      amount: transfer.amount,
      currency: transfer.currency,
      frequency: transfer.frequency,
      startDate: transfer.startDate,
      endDate: transfer.endDate,
      nextExecutionDate: transfer.nextExecutionDate,
      occurrencesTotal: transfer.occurrencesTotal,
      occurrencesRemaining: transfer.occurrencesRemaining,
      status: transfer.status,
      note: transfer.note,
      dayOfWeek: transfer.dayOfWeek,
      dayOfMonth: transfer.dayOfMonth,
      executedCount: transfer.executedCount,
      createdAt: transfer.createdAt,
      updatedAt: transfer.updatedAt,
    };
  }

  private toHistoryResponse(
    history: RecurringTransferHistory,
  ): RecurringTransferHistoryResponse {
    return {
      id: history.id,
      recurringTransferId: history.recurringTransferId,
      amount: history.amount,
      currency: history.currency,
      executedAt: history.executedAt,
      success: history.success,
      errorMessage: history.errorMessage,
      transactionId: history.transactionId,
    };
  }
}
