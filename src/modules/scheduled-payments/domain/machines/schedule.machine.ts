/**
 * Schedule State Machine
 * FSM for payment schedule lifecycle using xstate v5
 */

import { setup, assign } from 'xstate';
import {
  ScheduleStatus,
  ScheduleFrequency,
} from '../interfaces/scheduled-payment.types';

// Context
export interface ScheduleContext {
  scheduleId: string;
  userId: string;
  status: ScheduleStatus;
  frequency: ScheduleFrequency;
  totalExecuted: number;
  maxOccurrences?: number;
  remainingOccurrences?: number;
  failureCount: number;
  maxFailures: number;
  endDate?: Date;
  nextExecutionAt?: Date;
  lastExecutedAt?: Date;
  pausedAt?: Date;
  cancelledAt?: Date;
  lastFailureReason?: string;
}

// Events
export type ScheduleEvent =
  | { type: 'EXECUTE' }
  | { type: 'EXECUTION_COMPLETED'; transactionId: string }
  | { type: 'EXECUTION_FAILED'; reason: string }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'CANCEL' }
  | { type: 'SKIP' }
  | { type: 'UPDATE_NEXT_EXECUTION'; nextAt: Date };

// Machine
export const scheduleMachine = setup({
  types: {
    context: {} as ScheduleContext,
    events: {} as ScheduleEvent,
  },
  guards: {
    isCompleted: ({ context }) => {
      // Check if all occurrences completed
      if (
        context.maxOccurrences &&
        context.totalExecuted >= context.maxOccurrences
      ) {
        return true;
      }
      // Check if end date reached
      if (context.endDate && new Date() > context.endDate) {
        return true;
      }
      return false;
    },
    hasRemainingOccurrences: ({ context }) => {
      if (!context.maxOccurrences) return true;
      return context.totalExecuted < context.maxOccurrences;
    },
    isBeforeEndDate: ({ context }) => {
      if (!context.endDate) return true;
      return new Date() < context.endDate;
    },
    maxFailuresReached: ({ context }) => {
      return context.failureCount >= context.maxFailures;
    },
  },
  actions: {
    incrementExecuted: assign({
      totalExecuted: ({ context }) => context.totalExecuted + 1,
      lastExecutedAt: () => new Date(),
      failureCount: 0, // Reset failure count on success
    }),
    recordFailure: assign(({ context, event }) => {
      if (event.type !== 'EXECUTION_FAILED') return {};
      return {
        failureCount: context.failureCount + 1,
        lastFailureReason: event.reason,
      };
    }),
    markPaused: assign({
      pausedAt: () => new Date(),
    }),
    markCancelled: assign({
      cancelledAt: () => new Date(),
    }),
    updateNextExecution: assign(({ event }) => {
      if (event.type !== 'UPDATE_NEXT_EXECUTION') return {};
      return {
        nextExecutionAt: event.nextAt,
      };
    }),
    decrementRemaining: assign(({ context }) => {
      if (!context.remainingOccurrences) return {};
      return {
        remainingOccurrences: context.remainingOccurrences - 1,
      };
    }),
  },
}).createMachine({
  id: 'schedule',
  initial: 'active',
  context: {
    scheduleId: '',
    userId: '',
    status: 'active',
    frequency: 'monthly',
    totalExecuted: 0,
    failureCount: 0,
    maxFailures: 3,
  },
  states: {
    active: {
      on: {
        EXECUTE: {
          target: 'executing',
        },
        PAUSE: {
          target: 'paused',
          actions: 'markPaused',
        },
        CANCEL: {
          target: 'cancelled',
          actions: 'markCancelled',
        },
        UPDATE_NEXT_EXECUTION: {
          actions: 'updateNextExecution',
        },
      },
      always: [
        {
          guard: 'isCompleted',
          target: 'completed',
        },
      ],
    },
    executing: {
      on: {
        EXECUTION_COMPLETED: [
          {
            guard: 'isCompleted',
            target: 'completed',
            actions: ['incrementExecuted', 'decrementRemaining'],
          },
          {
            target: 'active',
            actions: ['incrementExecuted', 'decrementRemaining'],
          },
        ],
        EXECUTION_FAILED: [
          {
            guard: 'maxFailuresReached',
            target: 'failed',
            actions: 'recordFailure',
          },
          {
            target: 'active',
            actions: 'recordFailure',
          },
        ],
        SKIP: {
          target: 'active',
        },
      },
    },
    paused: {
      on: {
        RESUME: {
          target: 'active',
        },
        CANCEL: {
          target: 'cancelled',
          actions: 'markCancelled',
        },
      },
    },
    completed: {
      type: 'final',
    },
    cancelled: {
      type: 'final',
    },
    failed: {
      on: {
        RESUME: {
          target: 'active',
          actions: assign({ failureCount: 0 }),
        },
        CANCEL: {
          target: 'cancelled',
          actions: 'markCancelled',
        },
      },
    },
  },
});

export type ScheduleMachine = typeof scheduleMachine;
