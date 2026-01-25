# Finite State Machine (FSM) Architecture Proposal

## Overview

This document proposes implementing **Finite State Machines** for key business flows in the USDC Wallet application using the `xstate` library. FSMs provide:

- **Predictable state transitions** - Only valid transitions are allowed
- **Self-documenting flows** - State diagrams serve as documentation
- **Event-driven architecture** - Clean separation of concerns
- **Type safety** - Full TypeScript support with `xstate`

---

## Proposed Package: XState

```bash
npm install xstate @xstate/fsm
```

**Why XState?**
- Industry standard FSM library (2M+ weekly downloads)
- Full TypeScript support with type-safe events/context
- Visualizer for debugging (stately.ai/viz)
- Supports guards, actions, and side effects
- Lightweight `@xstate/fsm` for simple machines

---

## Priority 1: KYC Verification Flow

### Current Issues:
- No validation of state transitions
- Can manually set any status
- Multiple parallel paths not enforced

### FSM Definition:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         KYC VERIFICATION FSM                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐    REGISTER     ┌───────────────────┐                │
│  │   NONE   │ ──────────────► │ DOCUMENTS_PENDING │                │
│  └──────────┘                 └─────────┬─────────┘                │
│                                         │                           │
│                              SUBMIT_DOCUMENTS                       │
│                                         │                           │
│                                         ▼                           │
│                          ┌──────────────────────────┐              │
│                          │  PENDING_VERIFICATION    │              │
│                          └────────────┬─────────────┘              │
│                                       │                             │
│           ┌───────────────────────────┼───────────────────────┐    │
│           │                           │                       │    │
│    SCORE >= 80               40 <= SCORE < 80           SCORE < 40 │
│           │                           │                       │    │
│           ▼                           ▼                       ▼    │
│   ┌───────────────┐         ┌───────────────┐       ┌──────────┐  │
│   │ AUTO_APPROVED │         │ MANUAL_REVIEW │       │ REJECTED │  │
│   └───────┬───────┘         └───────┬───────┘       └────┬─────┘  │
│           │                         │                     │        │
│    FINALIZE                  ┌──────┴──────┐        CAN_RESUBMIT   │
│           │                  │             │              │        │
│           ▼            APPROVE         REJECT             ▼        │
│   ┌───────────────┐         │             │       ┌──────────────┐│
│   │   APPROVED    │◄────────┘             └─────► │   REJECTED   ││
│   └───────────────┘                               └──────────────┘│
│           │                                              │         │
│     WALLET_CREATED                                 RESUBMIT        │
│           │                                              │         │
│           ▼                                              ▼         │
│   ┌───────────────┐                          Back to DOCUMENTS_    │
│   │   COMPLETE    │                          PENDING               │
│   └───────────────┘                                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Code Implementation:

```typescript
// src/modules/kyc/domain/machines/kyc.machine.ts
import { createMachine, assign } from 'xstate';

interface KycContext {
  userId: string;
  score?: number;
  verificationId?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  attempts: number;
}

type KycEvent =
  | { type: 'REGISTER'; userId: string }
  | { type: 'SUBMIT_DOCUMENTS'; documents: DocumentKeys }
  | { type: 'VERIFICATION_COMPLETE'; score: number; verificationId: string }
  | { type: 'ADMIN_APPROVE'; adminId: string; notes?: string }
  | { type: 'ADMIN_REJECT'; adminId: string; reason: string }
  | { type: 'RESUBMIT' }
  | { type: 'WALLET_CREATED' };

export const kycMachine = createMachine<KycContext, KycEvent>({
  id: 'kyc',
  initial: 'none',
  context: {
    userId: '',
    attempts: 0,
  },
  states: {
    none: {
      on: {
        REGISTER: {
          target: 'documents_pending',
          actions: assign({ userId: (_, event) => event.userId }),
        },
      },
    },
    documents_pending: {
      on: {
        SUBMIT_DOCUMENTS: {
          target: 'pending_verification',
          actions: assign({ attempts: (ctx) => ctx.attempts + 1 }),
        },
      },
    },
    pending_verification: {
      on: {
        VERIFICATION_COMPLETE: [
          {
            target: 'auto_approved',
            cond: (_, event) => event.score >= 80,
            actions: assign({
              score: (_, event) => event.score,
              verificationId: (_, event) => event.verificationId,
            }),
          },
          {
            target: 'rejected',
            cond: (_, event) => event.score < 40,
            actions: assign({
              score: (_, event) => event.score,
              rejectionReason: () => 'Verification score too low',
            }),
          },
          {
            target: 'manual_review',
            actions: assign({
              score: (_, event) => event.score,
              verificationId: (_, event) => event.verificationId,
            }),
          },
        ],
      },
    },
    auto_approved: {
      always: { target: 'approved' }, // Auto-transition
    },
    manual_review: {
      on: {
        ADMIN_APPROVE: {
          target: 'approved',
          actions: assign({ reviewedBy: (_, event) => event.adminId }),
        },
        ADMIN_REJECT: {
          target: 'rejected',
          actions: assign({
            reviewedBy: (_, event) => event.adminId,
            rejectionReason: (_, event) => event.reason,
          }),
        },
      },
    },
    approved: {
      on: {
        WALLET_CREATED: 'complete',
      },
      entry: 'emitKycApproved', // Side effect
    },
    rejected: {
      on: {
        RESUBMIT: {
          target: 'documents_pending',
          cond: (ctx) => ctx.attempts < 3, // Max 3 attempts
        },
      },
      entry: 'emitKycRejected',
    },
    complete: {
      type: 'final',
    },
  },
});
```

---

## Priority 2: Transfer Flow

### Current Issues:
- Partial validation scattered across methods
- Refund logic separated from main flow
- No type-specific rules (internal vs external)

### FSM Definition:

```
┌─────────────────────────────────────────────────────────────────────┐
│                          TRANSFER FSM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐                                                  │
│  │   INITIATED  │                                                  │
│  └──────┬───────┘                                                  │
│         │                                                           │
│    VALIDATE_FUNDS                                                   │
│         │                                                           │
│    ┌────┴────┐                                                     │
│    │         │                                                     │
│ SUCCESS    INSUFFICIENT                                             │
│    │         │                                                     │
│    ▼         ▼                                                     │
│ ┌──────┐  ┌──────────┐                                             │
│ │PENDING│  │ FAILED   │ ◄────── PROVIDER_ERROR                     │
│ └──┬────┘  └──────────┘                                            │
│    │              ▲                                                 │
│  DEBIT_LEDGER    │                                                 │
│    │             │                                                  │
│    ▼             │                                                  │
│ ┌──────────┐     │                                                 │
│ │PROCESSING│─────┴── PROVIDER_FAILED                               │
│ └────┬─────┘         (trigger refund)                              │
│      │                                                              │
│   ┌──┴───────────────────┐                                         │
│   │                      │                                         │
│ INTERNAL            EXTERNAL                                        │
│   │                      │                                         │
│   ▼                      ▼                                         │
│ ┌──────────┐      ┌─────────────┐                                  │
│ │ CREDITED │      │ PENDING_    │                                  │
│ │ (instant)│      │ CONFIRMATION│                                  │
│ └────┬─────┘      └──────┬──────┘                                  │
│      │                   │                                          │
│      │            WEBHOOK_CONFIRM                                   │
│      │                   │                                          │
│      ▼                   ▼                                          │
│  ┌───────────────────────────┐                                     │
│  │        COMPLETED          │                                     │
│  └────────────┬──────────────┘                                     │
│               │                                                     │
│         REQUEST_REFUND (admin)                                      │
│               │                                                     │
│               ▼                                                     │
│         ┌──────────┐                                               │
│         │ REFUNDED │                                               │
│         └──────────┘                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Code Implementation:

```typescript
// src/modules/transfer/domain/machines/transfer.machine.ts
import { createMachine, assign } from 'xstate';

interface TransferContext {
  transferId: string;
  type: 'internal' | 'external';
  amount: number;
  senderId: string;
  recipientId: string;
  providerReference?: string;
  failureReason?: string;
}

export const transferMachine = createMachine<TransferContext>({
  id: 'transfer',
  initial: 'initiated',
  states: {
    initiated: {
      on: {
        VALIDATE: [
          { target: 'pending', cond: 'hasSufficientFunds' },
          { target: 'failed', actions: assign({ failureReason: () => 'Insufficient funds' }) },
        ],
      },
    },
    pending: {
      on: {
        DEBIT_SUCCESS: 'processing',
        DEBIT_FAILED: {
          target: 'failed',
          actions: assign({ failureReason: (_, e) => e.reason }),
        },
      },
      entry: 'debitSenderLedger',
    },
    processing: {
      on: {
        INTERNAL_CREDIT: 'completed',
        EXTERNAL_SUBMITTED: 'pending_confirmation',
        PROVIDER_FAILED: {
          target: 'failed',
          actions: ['refundSender', assign({ failureReason: (_, e) => e.reason })],
        },
      },
      entry: 'executeTransfer',
    },
    pending_confirmation: {
      on: {
        WEBHOOK_CONFIRMED: 'completed',
        WEBHOOK_FAILED: {
          target: 'failed',
          actions: 'refundSender',
        },
        TIMEOUT: {
          target: 'failed',
          actions: 'refundSender',
        },
      },
    },
    completed: {
      on: {
        REQUEST_REFUND: {
          target: 'refunded',
          cond: 'isRefundable',
        },
      },
      entry: 'emitTransferCompleted',
    },
    failed: {
      type: 'final',
      entry: 'emitTransferFailed',
    },
    refunded: {
      type: 'final',
      entry: 'emitTransferRefunded',
    },
  },
});
```

---

## Priority 3: Transaction Flow

### FSM Definition:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TRANSACTION FSM                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Type-specific sub-states based on transaction type                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      DEPOSIT                                 │   │
│  │  ┌────────┐    ┌───────────┐    ┌───────────┐   ┌─────────┐│   │
│  │  │PENDING │───►│PROCESSING │───►│CONFIRMING │──►│COMPLETED││   │
│  │  └────────┘    └───────────┘    └─────┬─────┘   └─────────┘│   │
│  │       │              │                │                     │   │
│  │       └──────────────┴────────────────┴────► FAILED         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    WITHDRAWAL                                │   │
│  │  ┌────────┐   ┌──────────┐   ┌───────────┐   ┌───────────┐ │   │
│  │  │PENDING │──►│APPROVAL  │──►│PROCESSING │──►│ COMPLETED │ │   │
│  │  └────────┘   │REQUIRED  │   └───────────┘   └───────────┘ │   │
│  │       │       └──────────┘         │                        │   │
│  │       │            │               │                        │   │
│  │       └────────────┴───────────────┴────────► FAILED        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Priority 4: User Account Flow

### FSM Definition (Parallel States):

```
┌─────────────────────────────────────────────────────────────────────┐
│                      USER ACCOUNT FSM                               │
│                    (Parallel State Machine)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────── ACCOUNT ────────────────────────┐   │
│  │  ┌────────┐     ┌───────────┐     ┌─────────────┐          │   │
│  │  │ ACTIVE │ ◄──►│ SUSPENDED │────►│ DEACTIVATED │          │   │
│  │  └────────┘     └───────────┘     └─────────────┘          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────── KYC ────────────────────────────┐   │
│  │  ┌─────────┐    ┌───────────┐    ┌──────────┐              │   │
│  │  │ PENDING │───►│ SUBMITTED │───►│ APPROVED │              │   │
│  │  └─────────┘    └───────────┘    └──────────┘              │   │
│  │       │              │                                      │   │
│  │       └──────────────┴────────────► REJECTED                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────── PIN ────────────────────────────┐   │
│  │  ┌─────────┐    ┌───────────┐    ┌────────┐                │   │
│  │  │ NOT_SET │───►│    SET    │───►│ LOCKED │                │   │
│  │  └─────────┘    └─────┬─────┘    └────┬───┘                │   │
│  │                       │               │                     │   │
│  │                  VERIFY_SUCCESS    UNLOCK (after 30min)     │   │
│  │                       │               │                     │   │
│  │                       ◄───────────────┘                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Priority 5: Webhook Processing Flow

### FSM for Dead-Letter Queue:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WEBHOOK DEADLETTER FSM                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐                                                       │
│  │ PENDING │                                                       │
│  └────┬────┘                                                       │
│       │                                                             │
│   ┌───┴────────────────────┐                                       │
│   │                        │                                       │
│ RETRY                   IGNORE                                      │
│   │                        │                                       │
│   ▼                        ▼                                       │
│ ┌──────────┐         ┌─────────┐                                   │
│ │ RETRYING │         │ IGNORED │                                   │
│ └────┬─────┘         └─────────┘                                   │
│      │                                                              │
│   ┌──┴────────────────────┐                                        │
│   │                       │                                        │
│ SUCCESS                 FAILED                                      │
│   │                       │                                        │
│   ▼                       ▼                                        │
│ ┌──────────┐      ┌──────────────┐                                 │
│ │ RESOLVED │      │ RETRY_PENDING│──── retry_count < 3 ──► RETRY   │
│ └──────────┘      └──────────────┘                                 │
│                          │                                          │
│                   retry_count >= 3                                  │
│                          │                                          │
│                          ▼                                          │
│                    ┌───────────┐                                   │
│                    │ EXHAUSTED │                                   │
│                    └───────────┘                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Architecture

### Directory Structure:

```
src/
├── common/
│   └── fsm/
│       ├── fsm.module.ts           # FSM NestJS module
│       ├── fsm.service.ts          # Base FSM service
│       ├── fsm.decorator.ts        # @UseFSM() decorator
│       └── fsm.guard.ts            # Validates transitions
│
├── modules/
│   ├── kyc/
│   │   └── domain/
│   │       └── machines/
│   │           ├── kyc.machine.ts
│   │           └── kyc.service.ts   # FSM-aware service
│   │
│   ├── transfer/
│   │   └── domain/
│   │       └── machines/
│   │           ├── transfer.machine.ts
│   │           └── transfer.service.ts
│   │
│   └── transaction/
│       └── domain/
│           └── machines/
│               ├── deposit.machine.ts
│               ├── withdrawal.machine.ts
│               └── transaction.service.ts
```

### FSM Service Base Class:

```typescript
// src/common/fsm/fsm.service.ts
import { interpret, State, StateMachine, Interpreter } from 'xstate';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export abstract class FsmService<TContext, TEvent> {
  protected readonly logger = new Logger(this.constructor.name);
  protected interpreters = new Map<string, Interpreter<TContext, any, TEvent>>();

  constructor(
    protected readonly eventEmitter: EventEmitter2,
    protected readonly machine: StateMachine<TContext, any, TEvent>,
  ) {}

  /**
   * Start a new state machine instance
   */
  start(id: string, context: Partial<TContext>): State<TContext, TEvent> {
    const interpreter = interpret(
      this.machine.withContext({ ...this.machine.context, ...context }),
    )
      .onTransition((state) => {
        this.logger.log(`[${id}] Transition: ${state.value}`);
        this.onTransition(id, state);
      })
      .start();

    this.interpreters.set(id, interpreter);
    return interpreter.state;
  }

  /**
   * Send event to a running machine
   */
  send(id: string, event: TEvent): State<TContext, TEvent> {
    const interpreter = this.interpreters.get(id);
    if (!interpreter) {
      throw new Error(`No FSM instance found for ${id}`);
    }

    interpreter.send(event);
    return interpreter.state;
  }

  /**
   * Get current state
   */
  getState(id: string): State<TContext, TEvent> | null {
    return this.interpreters.get(id)?.state ?? null;
  }

  /**
   * Can transition to event?
   */
  canSend(id: string, event: TEvent): boolean {
    const state = this.getState(id);
    if (!state) return false;
    return state.nextEvents.includes((event as any).type);
  }

  /**
   * Hook for subclasses to emit domain events
   */
  protected abstract onTransition(
    id: string,
    state: State<TContext, TEvent>,
  ): void;
}
```

### FSM Guard for Controllers:

```typescript
// src/common/fsm/fsm.guard.ts
import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class FsmTransitionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedTransitions = this.reflector.get<string[]>(
      'allowedTransitions',
      context.getHandler(),
    );

    if (!allowedTransitions) return true;

    const request = context.switchToHttp().getRequest();
    const currentState = request.entity?.status;

    if (!allowedTransitions.includes(currentState)) {
      throw new BadRequestException(
        `Cannot perform this action when status is '${currentState}'. ` +
        `Allowed states: ${allowedTransitions.join(', ')}`,
      );
    }

    return true;
  }
}
```

### Usage in Controller:

```typescript
// Example: KYC Controller with FSM
@Controller('kyc')
export class KycController {
  constructor(private readonly kycFsmService: KycFsmService) {}

  @Post('submit')
  @AllowedStates(['documents_pending']) // Decorator
  async submitDocuments(@Body() dto: SubmitKycDto, @CurrentUser() user: JwtUser) {
    // FSM validates transition automatically
    const newState = this.kycFsmService.send(user.id, {
      type: 'SUBMIT_DOCUMENTS',
      documents: dto,
    });

    return { status: newState.value };
  }

  @Post(':id/review')
  @AllowedStates(['manual_review'])
  async adminReview(@Param('id') id: string, @Body() dto: AdminReviewDto) {
    const event = dto.approved
      ? { type: 'ADMIN_APPROVE', adminId: dto.adminId }
      : { type: 'ADMIN_REJECT', adminId: dto.adminId, reason: dto.reason };

    const newState = this.kycFsmService.send(id, event);
    return { status: newState.value };
  }
}
```

---

## Benefits Summary

| Before (Current) | After (With FSM) |
|------------------|------------------|
| Manual status checks in every method | Automatic validation by machine |
| Scattered state logic | Centralized state definition |
| No visualization | State diagrams auto-generated |
| Easy to introduce bugs | Invalid transitions impossible |
| Hard to test edge cases | Each state/transition testable |
| Implicit business rules | Explicit, documented flows |

---

## Implementation Order

### Phase 1 (Week 1):
1. Install xstate package
2. Create FSM module infrastructure
3. Implement KYC FSM (highest complexity)

### Phase 2 (Week 2):
1. Implement Transfer FSM
2. Implement Transaction FSM (deposit/withdrawal variants)

### Phase 3 (Week 3):
1. Implement User Account FSM (parallel states)
2. Implement Webhook Deadletter FSM
3. Add FSM state persistence (database)

### Phase 4 (Week 4):
1. Migration of existing entities
2. Testing and validation
3. Documentation and state visualizations

---

## State Persistence

For production, states need to be persisted to database:

```typescript
// Persist state to database
async persistState(id: string, state: State<TContext, TEvent>) {
  await this.repository.update(id, {
    fsmState: JSON.stringify(state),
    status: state.value as string,
    fsmContext: state.context,
    updatedAt: new Date(),
  });
}

// Restore state from database
async restoreState(id: string): Promise<State<TContext, TEvent>> {
  const entity = await this.repository.findById(id);
  if (!entity?.fsmState) {
    return this.machine.initialState;
  }
  return State.create(JSON.parse(entity.fsmState));
}
```

---

## Questions for Discussion

1. **State persistence strategy**: Store full state JSON or just status string?
2. **Retry policies**: Should retry counts be part of FSM context?
3. **Event sourcing**: Should we log all state transitions for audit?
4. **Visualization**: Set up stately.ai visualizer for team?

---

## Next Steps

1. Review and approve this proposal
2. Install xstate dependencies
3. Start with KYC FSM implementation as proof of concept
4. Expand to other flows based on priority
