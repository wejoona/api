/**
 * Referral State Machine
 * FSM for referral lifecycle using xstate v5
 */

import { setup, assign } from 'xstate';
import { ReferralStatus } from '../interfaces/referral.types';

// Context
export interface ReferralContext {
  referralId: string;
  referrerId: string;
  refereeId: string;
  referralCodeId: string;
  kycCompleted: boolean;
  firstTransactionCompleted: boolean;
  firstTransactionAmount: number;
  minimumTransactionAmount: number;
  referrerRewardAmount: number;
  refereeRewardAmount: number;
  referrerRewardId?: string;
  refereeRewardId?: string;
  qualifiedAt?: Date;
  rewardedAt?: Date;
  expiresAt: Date;
  rejectionReason?: string;
  createdAt: Date;
}

// Events
export type ReferralEvent =
  | { type: 'KYC_COMPLETED' }
  | { type: 'FIRST_TRANSACTION'; amount: number }
  | { type: 'QUALIFY' }
  | {
      type: 'CREDIT_REWARDS';
      referrerRewardId: string;
      refereeRewardId: string;
    }
  | { type: 'EXPIRE' }
  | { type: 'REJECT'; reason: string };

// States
export type ReferralState = ReferralStatus;

// Machine
export const referralMachine = setup({
  types: {
    context: {} as ReferralContext,
    events: {} as ReferralEvent,
  },
  guards: {
    isQualified: ({ context }) => {
      return context.kycCompleted && context.firstTransactionCompleted;
    },
    meetsMinimumAmount: ({ context }) => {
      return context.firstTransactionAmount >= context.minimumTransactionAmount;
    },
    isExpired: ({ context }) => {
      return new Date() > context.expiresAt;
    },
  },
  actions: {
    markKycCompleted: assign({
      kycCompleted: true,
    }),
    recordFirstTransaction: assign(({ event }) => {
      if (event.type !== 'FIRST_TRANSACTION') return {};
      return {
        firstTransactionCompleted: true,
        firstTransactionAmount: event.amount,
      };
    }),
    markQualified: assign({
      qualifiedAt: () => new Date(),
    }),
    recordRewards: assign(({ event }) => {
      if (event.type !== 'CREDIT_REWARDS') return {};
      return {
        referrerRewardId: event.referrerRewardId,
        refereeRewardId: event.refereeRewardId,
        rewardedAt: new Date(),
      };
    }),
    setRejectionReason: assign(({ event }) => {
      if (event.type !== 'REJECT') return {};
      return {
        rejectionReason: event.reason,
      };
    }),
  },
}).createMachine({
  id: 'referral',
  initial: 'pending',
  context: {
    referralId: '',
    referrerId: '',
    refereeId: '',
    referralCodeId: '',
    kycCompleted: false,
    firstTransactionCompleted: false,
    firstTransactionAmount: 0,
    minimumTransactionAmount: 10,
    referrerRewardAmount: 5,
    refereeRewardAmount: 5,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    createdAt: new Date(),
  },
  states: {
    pending: {
      on: {
        KYC_COMPLETED: {
          actions: 'markKycCompleted',
        },
        FIRST_TRANSACTION: [
          {
            guard: 'meetsMinimumAmount',
            actions: 'recordFirstTransaction',
          },
        ],
        QUALIFY: {
          guard: 'isQualified',
          target: 'qualified',
          actions: 'markQualified',
        },
        EXPIRE: {
          target: 'expired',
        },
        REJECT: {
          target: 'rejected',
          actions: 'setRejectionReason',
        },
      },
      always: [
        {
          guard: 'isExpired',
          target: 'expired',
        },
      ],
    },
    qualified: {
      on: {
        CREDIT_REWARDS: {
          target: 'rewarded',
          actions: 'recordRewards',
        },
        REJECT: {
          target: 'rejected',
          actions: 'setRejectionReason',
        },
      },
    },
    rewarded: {
      type: 'final',
    },
    expired: {
      type: 'final',
    },
    rejected: {
      type: 'final',
    },
  },
});

export type ReferralMachine = typeof referralMachine;
