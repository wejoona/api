import { StateValue } from 'xstate';

/**
 * FSM Context base interface
 * All FSM contexts should extend this
 */
export interface BaseFsmContext {
  entityId: string;
  entityType: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * FSM Event base interface
 */
export interface BaseFsmEvent {
  type: string;
  timestamp?: Date;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

/**
 * State transition record for audit logging
 */
export interface StateTransitionRecord {
  id: string;
  entityId: string;
  entityType: string;
  fromState: string;
  toState: string;
  event: string;
  eventPayload?: Record<string, unknown>;
  triggeredBy?: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

/**
 * Persisted state structure
 */
export interface PersistedState {
  value: StateValue;
  context: Record<string, unknown>;
  history?: unknown;
  done: boolean;
}

/**
 * FSM Service interface
 */
export interface IFsmService<TContext, TEvent extends BaseFsmEvent> {
  start(
    entityId: string,
    initialContext?: Partial<TContext>,
  ): Promise<StateValue>;
  send(entityId: string, event: TEvent): Promise<StateValue>;
  getState(entityId: string): Promise<StateValue | null>;
  canTransition(entityId: string, eventType: string): Promise<boolean>;
  getAvailableEvents(entityId: string): Promise<string[]>;
}

/**
 * FSM Machine configuration
 */
export interface FsmMachineConfig {
  id: string;
  version: string;
  persistState: boolean;
  emitEvents: boolean;
  auditTransitions: boolean;
}
