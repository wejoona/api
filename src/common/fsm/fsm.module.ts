import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FsmPersistenceService } from './fsm-persistence.service';
import { FsmTransitionGuard } from './fsm.guard';

/**
 * FSM Module
 *
 * Provides finite state machine infrastructure for the application.
 * Uses xstate for state machine definitions and transitions.
 *
 * Features:
 * - Type-safe state machines with xstate
 * - Automatic transition validation
 * - State persistence to database
 * - Event emission on state changes
 * - Audit logging of all transitions
 */
@Global()
@Module({
  imports: [EventEmitterModule],
  providers: [FsmPersistenceService, FsmTransitionGuard],
  exports: [FsmPersistenceService, FsmTransitionGuard],
})
export class FsmModule {}
