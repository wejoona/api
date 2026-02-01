import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventStoreService } from '../application/services/event-store.service';
import { ProjectionBuilderService } from '../application/services/projection-builder.service';
import { Event } from '../domain/entities/event.entity';

/**
 * Example: Transaction Event Sourcing
 * Demonstrates how to use event store for financial transactions
 */

// ==========================================
// 1. Domain Events for Transactions
// ==========================================

export interface TransactionCreatedEvent {
  transactionId: string;
  walletId: string;
  type: 'transfer' | 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  recipientId?: string;
  metadata: Record<string, any>;
}

export interface TransactionCompletedEvent {
  transactionId: string;
  walletId: string;
  completedAt: Date;
  finalAmount: number;
}

export interface TransactionFailedEvent {
  transactionId: string;
  walletId: string;
  reason: string;
  failedAt: Date;
}

// ==========================================
// 2. Transaction Aggregate Service
// ==========================================

@Injectable()
export class TransactionAggregateService {
  constructor(private readonly eventStore: EventStoreService) {}

  /**
   * Create a new transaction
   */
  async createTransaction(
    data: TransactionCreatedEvent,
    userId: string,
  ): Promise<void> {
    // Get current version
    const version = await this.eventStore.getAggregateVersion(
      data.transactionId,
      'transaction',
    );

    // Append event
    await this.eventStore.appendEvent({
      aggregateId: data.transactionId,
      aggregateType: 'transaction',
      eventType: 'transaction.created',
      eventData: {
        walletId: data.walletId,
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        recipientId: data.recipientId,
        metadata: data.metadata,
      },
      metadata: {
        userId,
        timestamp: new Date(),
      },
      version: version + 1,
    });
  }

  /**
   * Complete a transaction
   */
  async completeTransaction(
    transactionId: string,
    finalAmount: number,
  ): Promise<void> {
    const version = await this.eventStore.getAggregateVersion(
      transactionId,
      'transaction',
    );

    await this.eventStore.appendEvent({
      aggregateId: transactionId,
      aggregateType: 'transaction',
      eventType: 'transaction.completed',
      eventData: {
        finalAmount,
        completedAt: new Date(),
      },
      metadata: {},
      version: version + 1,
    });

    // Create snapshot every 10 events
    if ((version + 1) % 10 === 0) {
      const state = await this.getTransactionState(transactionId);
      await this.eventStore.createSnapshot(
        transactionId,
        'transaction',
        version + 1,
        state,
      );
    }
  }

  /**
   * Fail a transaction
   */
  async failTransaction(transactionId: string, reason: string): Promise<void> {
    const version = await this.eventStore.getAggregateVersion(
      transactionId,
      'transaction',
    );

    await this.eventStore.appendEvent({
      aggregateId: transactionId,
      aggregateType: 'transaction',
      eventType: 'transaction.failed',
      eventData: {
        reason,
        failedAt: new Date(),
      },
      metadata: {},
      version: version + 1,
    });
  }

  /**
   * Get transaction state from events
   */
  async getTransactionState(transactionId: string): Promise<any> {
    const events = await this.eventStore.getEventStream(
      transactionId,
      'transaction',
    );

    let state = {
      id: transactionId,
      status: 'pending',
      amount: 0,
      currency: 'XOF',
      createdAt: null,
      completedAt: null,
      failedAt: null,
    };

    for (const event of events) {
      state = this.applyEvent(state, event);
    }

    return state;
  }

  /**
   * Apply event to state (reducer pattern)
   */
  private applyEvent(state: any, event: Event): any {
    switch (event.eventType) {
      case 'transaction.created':
        return {
          ...state,
          amount: event.eventData.amount,
          currency: event.eventData.currency,
          type: event.eventData.type,
          walletId: event.eventData.walletId,
          recipientId: event.eventData.recipientId,
          createdAt: event.timestamp,
          status: 'pending',
        };

      case 'transaction.completed':
        return {
          ...state,
          status: 'completed',
          finalAmount: event.eventData.finalAmount,
          completedAt: event.eventData.completedAt,
        };

      case 'transaction.failed':
        return {
          ...state,
          status: 'failed',
          failureReason: event.eventData.reason,
          failedAt: event.eventData.failedAt,
        };

      default:
        return state;
    }
  }
}

// ==========================================
// 3. Event Listeners for Side Effects
// ==========================================

@Injectable()
export class TransactionEventListeners {
  constructor(private readonly projectionBuilder: ProjectionBuilderService) {}

  /**
   * Listen to transaction.created events
   */
  @OnEvent('transaction.transaction.created')
  async handleTransactionCreated(event: Event): Promise<void> {
    console.log('Transaction created:', event.aggregateId);

    // Update transaction history projection
    await this.projectionBuilder.updateProjection(
      'transaction_history',
      event,
      event.eventData.walletId, // Group by wallet
    );

    // Update wallet balance projection
    await this.projectionBuilder.updateProjection(
      'wallet_balance',
      event,
      event.eventData.walletId,
    );

    // Additional side effects:
    // - Send notification
    // - Update analytics
    // - Trigger compliance checks
  }

  /**
   * Listen to transaction.completed events
   */
  @OnEvent('transaction.transaction.completed')
  async handleTransactionCompleted(event: Event): Promise<void> {
    console.log('Transaction completed:', event.aggregateId);

    // Update projections
    await this.projectionBuilder.updateProjection('transaction_history', event);

    // Create audit trail
    await this.projectionBuilder.updateProjection('audit_trail', event);
  }

  /**
   * Listen to transaction.failed events
   */
  @OnEvent('transaction.transaction.failed')
  async handleTransactionFailed(event: Event): Promise<void> {
    console.log('Transaction failed:', event.aggregateId);

    // Update projections
    await this.projectionBuilder.updateProjection('transaction_history', event);

    // Log for monitoring
    // Send alert if critical failure
  }
}

// ==========================================
// 4. Usage Examples
// ==========================================

/**
 * Example Controller
 */
@Injectable()
export class TransactionUsageExample {
  constructor(
    private readonly transactionAggregate: TransactionAggregateService,
    private readonly eventStore: EventStoreService,
    private readonly projectionBuilder: ProjectionBuilderService,
  ) {}

  /**
   * Create and process a transaction
   */
  async processTransfer(
    walletId: string,
    recipientId: string,
    amount: number,
    userId: string,
  ): Promise<void> {
    const transactionId = 'tx-' + Date.now();

    // 1. Create transaction event
    await this.transactionAggregate.createTransaction(
      {
        transactionId,
        walletId,
        type: 'transfer',
        amount,
        currency: 'XOF',
        recipientId,
        metadata: {},
      },
      userId,
    );

    // 2. Process transaction (in real app, this would be async)
    try {
      // ... business logic ...
      await this.transactionAggregate.completeTransaction(
        transactionId,
        amount,
      );
    } catch (error) {
      await this.transactionAggregate.failTransaction(
        transactionId,
        error.message,
      );
    }
  }

  /**
   * Get transaction history from projection
   */
  async getTransactionHistory(walletId: string): Promise<any> {
    const projection = await this.projectionBuilder.getProjection(
      'transaction_history',
      walletId,
    );

    return projection?.data;
  }

  /**
   * Get wallet balance from projection
   */
  async getWalletBalance(walletId: string): Promise<any> {
    const projection = await this.projectionBuilder.getProjection(
      'wallet_balance',
      walletId,
    );

    return projection?.data;
  }

  /**
   * Get audit trail
   */
  async getAuditTrail(transactionId: string): Promise<any> {
    const projection = await this.projectionBuilder.getProjection(
      'audit_trail',
      transactionId,
    );

    return projection?.data;
  }

  /**
   * Replay transaction for debugging
   */
  async replayTransaction(transactionId: string): Promise<void> {
    // Get all events
    const events = await this.eventStore.getEventStream(
      transactionId,
      'transaction',
    );

    console.log(`Replaying ${events.length} events for ${transactionId}`);

    // Process each event
    for (const event of events) {
      console.log(`- ${event.eventType} at ${event.timestamp}`);
    }
  }

  /**
   * Rebuild transaction state
   */
  async rebuildTransactionState(transactionId: string): Promise<any> {
    return this.transactionAggregate.getTransactionState(transactionId);
  }

  /**
   * Get transaction timeline
   */
  async getTransactionTimeline(transactionId: string): Promise<any[]> {
    const events = await this.eventStore.getEventStream(
      transactionId,
      'transaction',
    );

    return events.map((event) => ({
      timestamp: event.timestamp,
      type: event.eventType,
      version: event.version,
      data: event.eventData,
    }));
  }
}

// ==========================================
// 5. Testing Example
// ==========================================

/**
 * Example Test
 */
describe('Transaction Event Sourcing', () => {
  let service: TransactionAggregateService;
  let eventStore: EventStoreService;

  beforeEach(async () => {
    // Setup test module
  });

  it('should create transaction with correct events', async () => {
    const transactionId = 'test-tx-123';

    await service.createTransaction(
      {
        transactionId,
        walletId: 'wallet-123',
        type: 'transfer',
        amount: 1000,
        currency: 'XOF',
        metadata: {},
      },
      'user-123',
    );

    const events = await eventStore.getEventStream(
      transactionId,
      'transaction',
    );

    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('transaction.created');
    expect(events[0].version).toBe(1);
  });

  it('should rebuild state from events', async () => {
    const transactionId = 'test-tx-456';

    // Create transaction
    await service.createTransaction(
      {
        transactionId,
        walletId: 'wallet-123',
        type: 'transfer',
        amount: 1000,
        currency: 'XOF',
        metadata: {},
      },
      'user-123',
    );

    // Complete transaction
    await service.completeTransaction(transactionId, 1000);

    // Rebuild state
    const state = await service.getTransactionState(transactionId);

    expect(state.status).toBe('completed');
    expect(state.amount).toBe(1000);
    expect(state.finalAmount).toBe(1000);
  });
});
