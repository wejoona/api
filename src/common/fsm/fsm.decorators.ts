import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for allowed states
 */
export const ALLOWED_STATES_KEY = 'allowedStates';

/**
 * Decorator to specify which states allow a controller action
 *
 * @example
 * ```typescript
 * @Post('submit')
 * @AllowedStates(['documents_pending', 'rejected'])
 * async submitDocuments() { ... }
 * ```
 */
export const AllowedStates = (...states: string[]) =>
  SetMetadata(ALLOWED_STATES_KEY, states);

/**
 * Metadata key for required events
 */
export const REQUIRED_EVENT_KEY = 'requiredEvent';

/**
 * Decorator to specify the FSM event that should be triggered
 *
 * @example
 * ```typescript
 * @Post('approve')
 * @TriggerEvent('ADMIN_APPROVE')
 * async approve() { ... }
 * ```
 */
export const TriggerEvent = (eventType: string) =>
  SetMetadata(REQUIRED_EVENT_KEY, eventType);
