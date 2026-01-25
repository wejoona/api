import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StateTransitionRecord, PersistedState } from './fsm.types';

/**
 * FSM Persistence Service
 *
 * Handles state persistence and transition logging.
 * Can be extended to use different storage backends.
 */
@Injectable()
export class FsmPersistenceService {
  private readonly logger = new Logger(FsmPersistenceService.name);

  // In-memory storage (replace with database in production)
  private states = new Map<string, PersistedState>();
  private transitions: StateTransitionRecord[] = [];

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Persist state to storage
   */
  async persistState(
    entityId: string,
    entityType: string,
    state: PersistedState,
  ): Promise<void> {
    const key = `${entityType}:${entityId}`;
    this.states.set(key, {
      ...state,
      context: {
        ...state.context,
        updatedAt: new Date(),
      },
    });

    this.logger.debug(`Persisted state for ${key}: ${JSON.stringify(state.value)}`);
  }

  /**
   * Load state from storage
   */
  async loadState(
    entityId: string,
    entityType: string,
  ): Promise<PersistedState | null> {
    const key = `${entityType}:${entityId}`;
    return this.states.get(key) || null;
  }

  /**
   * Record a state transition for audit
   */
  async recordTransition(record: StateTransitionRecord): Promise<void> {
    this.transitions.push(record);

    // Emit event for external listeners (e.g., analytics, notifications)
    this.eventEmitter.emit('fsm.transition', record);

    this.logger.log(
      `[${record.entityType}:${record.entityId}] ${record.fromState} → ${record.toState} (${record.event})`,
    );
  }

  /**
   * Get transition history for an entity
   */
  async getTransitionHistory(
    entityId: string,
    entityType: string,
  ): Promise<StateTransitionRecord[]> {
    return this.transitions.filter(
      (t) => t.entityId === entityId && t.entityType === entityType,
    );
  }

  /**
   * Clear state (for testing)
   */
  async clearState(entityId: string, entityType: string): Promise<void> {
    const key = `${entityType}:${entityId}`;
    this.states.delete(key);
  }
}
