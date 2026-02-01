/**
 * Idempotency Module Exports
 *
 * Provides components for handling idempotent requests and preventing
 * duplicate processing of financial operations.
 */

// Module
export { IdempotencyModule } from './idempotency.module';

// Middleware
export { IdempotencyMiddleware } from './idempotency.middleware';

// Storage
export { IdempotencyStorage } from './types/idempotency.types';
export { RedisIdempotencyStorage } from './storage/redis-idempotency.storage';

// Types
export {
  IdempotencyStatus,
  IdempotencyRecord,
  IdempotencyConfig,
  IdempotentRequest,
  RequestFingerprint,
} from './types/idempotency.types';

// Decorators
export {
  Idempotent,
  IdempotentRequired,
  IdempotentOptional,
  IdempotentOptions,
} from './decorators/idempotent.decorator';

// Guards
export { IdempotencyGuard } from './guards/idempotency.guard';

// Utils
export { FingerprintUtil } from './utils/fingerprint.util';
