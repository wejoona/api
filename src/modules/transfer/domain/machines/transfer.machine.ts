import { setup, assign } from 'xstate';

/**
 * Transfer States
 */
export type TransferState =
  | 'initiated'
  | 'validating'
  | 'pending'
  | 'debiting'
  | 'processing'
  | 'pending_confirmation'
  | 'crediting'
  | 'completed'
  | 'failed'
  | 'refunding'
  | 'refunded'
  | 'cancelled';

/**
 * Transfer FSM Context
 */
export interface TransferContext {
  // Entity identifiers
  entityId: string;
  entityType: string;
  transferId: string;

  // Transfer details
  type: 'internal' | 'external';
  amount: number;
  currency: string;
  fee: number;
  totalAmount: number;

  // Parties
  senderId: string;
  senderWalletId: string;
  recipientId?: string;
  recipientWalletId?: string;
  recipientAddress?: string; // For external transfers

  // Provider references
  ledgerTransactionId?: string;
  providerTransactionId?: string;
  providerReference?: string;

  // Status tracking
  failureReason?: string;
  failureCode?: string;
  refundId?: string;
  refundReason?: string;

  // Retry tracking
  retryCount: number;
  maxRetries: number;

  // Metadata
  description?: string;
  reference?: string;
  metadata?: Record<string, unknown>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
}

/**
 * Transfer FSM Events
 */
export type TransferEvent =
  | { type: 'INITIATE'; transferDetails: Partial<TransferContext> }
  | { type: 'VALIDATION_SUCCESS' }
  | { type: 'VALIDATION_FAILED'; reason: string }
  | { type: 'DEBIT_SUCCESS'; ledgerTransactionId: string }
  | { type: 'DEBIT_FAILED'; reason: string }
  | { type: 'INTERNAL_CREDIT_SUCCESS' }
  | {
      type: 'EXTERNAL_SUBMITTED';
      providerTransactionId: string;
      providerReference: string;
    }
  | { type: 'PROVIDER_CONFIRMED'; providerReference: string }
  | { type: 'PROVIDER_FAILED'; reason: string; code?: string }
  | { type: 'PROVIDER_TIMEOUT' }
  | { type: 'CREDIT_SUCCESS' }
  | { type: 'CREDIT_FAILED'; reason: string }
  | { type: 'REFUND_INITIATED'; reason: string }
  | { type: 'REFUND_SUCCESS'; refundId: string }
  | { type: 'REFUND_FAILED'; reason: string }
  | { type: 'CANCEL'; reason: string }
  | { type: 'RETRY' };

/**
 * Transfer State Machine
 *
 * Flow for Internal Transfers:
 * INITIATED → VALIDATING → PENDING → DEBITING → PROCESSING → CREDITING → COMPLETED
 *
 * Flow for External Transfers:
 * INITIATED → VALIDATING → PENDING → DEBITING → PROCESSING → PENDING_CONFIRMATION → COMPLETED
 *
 * Failure Path:
 * Any State → FAILED → (if funds debited) REFUNDING → REFUNDED
 */
export const transferMachine = setup({
  types: {
    context: {} as TransferContext,
    events: {} as TransferEvent,
  },
  guards: {
    maxRetriesReached: ({ context }) =>
      context.retryCount >= context.maxRetries,
    canRetry: ({ context }) => context.retryCount < context.maxRetries,
    isExternalTransfer: ({ context }) => context.type === 'external',
  },
  actions: {
    validateTransfer: () => {
      // Implemented by service
    },
    debitSender: () => {
      // Implemented by service
    },
    executeTransfer: () => {
      // Implemented by service
    },
    creditRecipient: () => {
      // Implemented by service
    },
    refundSender: () => {
      // Implemented by service
    },
    emitTransferCompleted: () => {
      // Implemented by service
    },
    emitTransferFailed: () => {
      // Implemented by service
    },
    emitTransferRefunded: () => {
      // Implemented by service
    },
    emitTransferCancelled: () => {
      // Implemented by service
    },
  },
  delays: {
    PROVIDER_TIMEOUT: 1800000, // 30 minutes
  },
}).createMachine({
  id: 'transfer',
  initial: 'initiated',
  context: {
    entityId: '',
    entityType: 'transfer',
    transferId: '',
    type: 'internal',
    amount: 0,
    currency: 'USDC',
    fee: 0,
    totalAmount: 0,
    senderId: '',
    senderWalletId: '',
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  states: {
    // Initial state - transfer request received
    initiated: {
      on: {
        INITIATE: {
          target: 'validating',
          actions: assign(({ context, event }) => ({
            ...context,
            ...event.transferDetails,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        },
      },
    },

    // Validating transfer (funds, limits, recipient, etc.)
    validating: {
      entry: 'validateTransfer',
      on: {
        VALIDATION_SUCCESS: 'pending',
        VALIDATION_FAILED: {
          target: 'failed',
          actions: assign({
            failureReason: ({ event }) => event.reason,
            failedAt: () => new Date(),
            updatedAt: () => new Date(),
          }),
        },
        CANCEL: {
          target: 'cancelled',
          actions: assign({
            failureReason: ({ event }) => event.reason,
            updatedAt: () => new Date(),
          }),
        },
      },
    },

    // Validated, ready to process
    pending: {
      entry: 'debitSender',
      on: {
        DEBIT_SUCCESS: {
          target: 'debiting',
          actions: assign({
            ledgerTransactionId: ({ event }) => event.ledgerTransactionId,
            updatedAt: () => new Date(),
          }),
        },
        CANCEL: {
          target: 'cancelled',
          actions: assign({
            failureReason: ({ event }) => event.reason,
            updatedAt: () => new Date(),
          }),
        },
      },
    },

    // Funds debited from sender
    debiting: {
      always: {
        target: 'processing',
        actions: assign({
          updatedAt: () => new Date(),
        }),
      },
    },

    // Processing transfer
    processing: {
      entry: 'executeTransfer',
      on: {
        // Internal transfer - credit recipient directly
        INTERNAL_CREDIT_SUCCESS: {
          target: 'crediting',
          actions: assign({
            processedAt: () => new Date(),
            updatedAt: () => new Date(),
          }),
        },
        // External transfer - submitted to provider
        EXTERNAL_SUBMITTED: {
          target: 'pending_confirmation',
          actions: assign({
            providerTransactionId: ({ event }) => event.providerTransactionId,
            providerReference: ({ event }) => event.providerReference,
            processedAt: () => new Date(),
            updatedAt: () => new Date(),
          }),
        },
        // Processing failed - need to refund
        PROVIDER_FAILED: {
          target: 'refunding',
          actions: assign({
            failureReason: ({ event }) => event.reason,
            failureCode: ({ event }) => event.code,
            refundReason: () => 'Transfer processing failed',
            failedAt: () => new Date(),
            updatedAt: () => new Date(),
          }),
        },
        CREDIT_FAILED: {
          target: 'refunding',
          actions: assign({
            failureReason: ({ event }) => event.reason,
            refundReason: () => 'Credit to recipient failed',
            failedAt: () => new Date(),
            updatedAt: () => new Date(),
          }),
        },
      },
    },

    // Waiting for external provider confirmation
    pending_confirmation: {
      on: {
        PROVIDER_CONFIRMED: {
          target: 'completed',
          actions: assign({
            providerReference: ({ event }) => event.providerReference,
            completedAt: () => new Date(),
            updatedAt: () => new Date(),
          }),
        },
        PROVIDER_FAILED: {
          target: 'refunding',
          actions: assign({
            failureReason: ({ event }) => event.reason,
            failureCode: ({ event }) => event.code,
            refundReason: () => 'Provider reported failure',
            failedAt: () => new Date(),
            updatedAt: () => new Date(),
          }),
        },
        PROVIDER_TIMEOUT: [
          {
            target: 'refunding',
            guard: 'maxRetriesReached',
            actions: assign({
              failureReason: () => 'Provider confirmation timeout',
              refundReason: () => 'Provider did not confirm in time',
              failedAt: () => new Date(),
              updatedAt: () => new Date(),
            }),
          },
        ],
        RETRY: {
          target: 'pending_confirmation',
          guard: 'canRetry',
          actions: assign({
            retryCount: ({ context }) => context.retryCount + 1,
            updatedAt: () => new Date(),
          }),
        },
      },
      after: {
        // Timeout after 30 minutes
        PROVIDER_TIMEOUT: {
          target: 'refunding',
          guard: 'isExternalTransfer',
          actions: assign({
            failureReason: () => 'Provider confirmation timeout',
            refundReason: () => 'Transfer timed out waiting for confirmation',
            updatedAt: () => new Date(),
          }),
        },
      },
    },

    // Crediting recipient (internal transfers)
    crediting: {
      entry: 'creditRecipient',
      on: {
        CREDIT_SUCCESS: {
          target: 'completed',
          actions: assign({
            completedAt: () => new Date(),
            updatedAt: () => new Date(),
          }),
        },
        CREDIT_FAILED: {
          target: 'refunding',
          actions: assign({
            failureReason: ({ event }) => event.reason,
            refundReason: () => 'Failed to credit recipient',
            failedAt: () => new Date(),
            updatedAt: () => new Date(),
          }),
        },
      },
    },

    // Transfer completed successfully
    completed: {
      type: 'final',
      entry: 'emitTransferCompleted',
    },

    // Transfer failed (before debiting)
    failed: {
      type: 'final',
      entry: 'emitTransferFailed',
    },

    // Refunding sender (after debit failure)
    refunding: {
      entry: 'refundSender',
      on: {
        REFUND_SUCCESS: {
          target: 'refunded',
          actions: assign({
            refundId: ({ event }) => event.refundId,
            refundedAt: () => new Date(),
            updatedAt: () => new Date(),
          }),
        },
        REFUND_FAILED: {
          // Stay in refunding state - needs manual intervention
          actions: assign({
            failureReason: ({ context, event }) =>
              `${context.failureReason}; Refund failed: ${event.reason}`,
            retryCount: ({ context }) => context.retryCount + 1,
            updatedAt: () => new Date(),
          }),
        },
        RETRY: {
          guard: 'canRetry',
          actions: 'refundSender',
        },
      },
    },

    // Refund completed
    refunded: {
      type: 'final',
      entry: 'emitTransferRefunded',
    },

    // Transfer cancelled (before processing)
    cancelled: {
      type: 'final',
      entry: 'emitTransferCancelled',
    },
  },
});

export type TransferMachine = typeof transferMachine;
