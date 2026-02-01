import { Injectable } from '@nestjs/common';
import { IProjectionHandler } from '../projection-builder.service';
import { Event } from '../../../domain/entities/event.entity';

/**
 * Transaction History Projection
 * Builds a complete transaction history from events
 */
@Injectable()
export class TransactionHistoryProjection implements IProjectionHandler {
  readonly projectionName = 'transaction_history';
  readonly eventTypes = [
    'transaction.created',
    'transaction.completed',
    'transaction.failed',
    'transaction.reversed',
    'transfer.created',
    'transfer.completed',
    'transfer.failed',
    'deposit.created',
    'deposit.completed',
    'withdrawal.created',
    'withdrawal.completed',
  ];

  buildInitial(event: Event): Record<string, any> {
    return {
      transactions: [this.extractTransaction(event)],
      totalCount: 1,
      totalVolume: this.extractAmount(event),
      firstTransaction: event.timestamp,
      lastTransaction: event.timestamp,
      byType: {
        [this.extractTransactionType(event)]: 1,
      },
      byStatus: {
        [this.extractStatus(event)]: 1,
      },
    };
  }

  apply(currentData: Record<string, any>, event: Event): Record<string, any> {
    const transaction = this.extractTransaction(event);
    const type = this.extractTransactionType(event);
    const status = this.extractStatus(event);
    const amount = this.extractAmount(event);

    // Find existing transaction to update or add new one
    const existingIndex = currentData.transactions.findIndex(
      (t: any) => t.id === transaction.id,
    );

    let transactions;
    if (existingIndex >= 0) {
      // Update existing transaction
      transactions = [...currentData.transactions];
      transactions[existingIndex] = {
        ...transactions[existingIndex],
        ...transaction,
      };
    } else {
      // Add new transaction
      transactions = [transaction, ...currentData.transactions];
    }

    return {
      transactions,
      totalCount:
        existingIndex >= 0
          ? currentData.totalCount
          : currentData.totalCount + 1,
      totalVolume:
        existingIndex >= 0
          ? currentData.totalVolume
          : currentData.totalVolume + amount,
      firstTransaction: currentData.firstTransaction,
      lastTransaction: event.timestamp,
      byType: {
        ...currentData.byType,
        [type]: (currentData.byType[type] || 0) + (existingIndex >= 0 ? 0 : 1),
      },
      byStatus: {
        ...currentData.byStatus,
        [status]: (currentData.byStatus[status] || 0) + 1,
      },
    };
  }

  private extractTransaction(event: Event): any {
    const data = event.eventData;
    return {
      id: data.transactionId || data.transferId || data.id,
      type: this.extractTransactionType(event),
      status: this.extractStatus(event),
      amount: data.amount || 0,
      currency: data.currency || 'XOF',
      timestamp: event.timestamp,
      metadata: {
        eventType: event.eventType,
        version: event.version,
        ...data.metadata,
      },
    };
  }

  private extractTransactionType(event: Event): string {
    if (event.eventType.includes('transfer')) return 'transfer';
    if (event.eventType.includes('deposit')) return 'deposit';
    if (event.eventType.includes('withdrawal')) return 'withdrawal';
    return 'transaction';
  }

  private extractStatus(event: Event): string {
    if (event.eventType.includes('completed')) return 'completed';
    if (event.eventType.includes('failed')) return 'failed';
    if (event.eventType.includes('reversed')) return 'reversed';
    return 'pending';
  }

  private extractAmount(event: Event): number {
    return parseFloat(event.eventData.amount?.toString() || '0');
  }
}
