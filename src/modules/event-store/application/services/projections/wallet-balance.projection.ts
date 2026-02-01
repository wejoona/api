import { Injectable } from '@nestjs/common';
import { IProjectionHandler } from '../projection-builder.service';
import { Event } from '../../../domain/entities/event.entity';

/**
 * Wallet Balance Projection
 * Maintains current wallet balance from events
 */
@Injectable()
export class WalletBalanceProjection implements IProjectionHandler {
  readonly projectionName = 'wallet_balance';
  readonly eventTypes = [
    'wallet.created',
    'wallet.credited',
    'wallet.debited',
    'transaction.completed',
    'transaction.reversed',
  ];

  buildInitial(event: Event): Record<string, any> {
    const initialBalance = this.calculateBalanceChange(event);

    return {
      walletId: event.aggregateId,
      balance: initialBalance,
      currency: event.eventData.currency || 'XOF',
      lastUpdated: event.timestamp,
      version: event.version,
      history: [
        {
          amount: initialBalance,
          timestamp: event.timestamp,
          eventType: event.eventType,
          version: event.version,
        },
      ],
    };
  }

  apply(currentData: Record<string, any>, event: Event): Record<string, any> {
    const balanceChange = this.calculateBalanceChange(event);
    const newBalance = currentData.balance + balanceChange;

    return {
      ...currentData,
      balance: newBalance,
      lastUpdated: event.timestamp,
      version: event.version,
      history: [
        ...currentData.history,
        {
          amount: balanceChange,
          newBalance,
          timestamp: event.timestamp,
          eventType: event.eventType,
          version: event.version,
        },
      ].slice(-50), // Keep last 50 changes
    };
  }

  private calculateBalanceChange(event: Event): number {
    const data = event.eventData;
    const amount = parseFloat(data.amount?.toString() || '0');

    switch (event.eventType) {
      case 'wallet.created':
        return parseFloat(data.initialBalance?.toString() || '0');

      case 'wallet.credited':
      case 'transaction.completed':
        return data.direction === 'credit' ? amount : 0;

      case 'wallet.debited':
        return data.direction === 'debit' ? -amount : 0;

      case 'transaction.reversed':
        // Reverse the original transaction
        return data.originalDirection === 'debit' ? amount : -amount;

      default:
        return 0;
    }
  }
}
