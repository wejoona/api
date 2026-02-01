import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for idempotency decorator
 */
export const IDEMPOTENCY_KEY = 'idempotency';

/**
 * Idempotent decorator options
 */
export interface IdempotentOptions {
  /**
   * Whether idempotency key is required (default: true)
   * If true, requests without idempotency key will be rejected
   */
  required?: boolean;

  /**
   * Custom TTL for this endpoint (overrides global config)
   */
  ttl?: number;

  /**
   * Whether to store response body (default: true)
   */
  storeResponse?: boolean;
}

/**
 * Mark an endpoint as idempotent
 *
 * This decorator can be used on controller methods to enforce
 * idempotency requirements and customize behavior.
 *
 * @example
 * ```typescript
 * @Post('transfer')
 * @Idempotent({ required: true, ttl: 3600 })
 * async createTransfer(@Body() dto: CreateTransferDto) {
 *   return this.transferService.create(dto);
 * }
 * ```
 *
 * @param options - Idempotency configuration options
 */
export const Idempotent = (options: IdempotentOptions = {}) => {
  const config: Required<IdempotentOptions> = {
    required: options.required ?? true,
    ttl: options.ttl ?? 86400, // 24 hours
    storeResponse: options.storeResponse ?? true,
  };

  return SetMetadata(IDEMPOTENCY_KEY, config);
};

/**
 * Shorthand for marking an endpoint as idempotent with required key
 */
export const IdempotentRequired = (ttl?: number) =>
  Idempotent({ required: true, ttl });

/**
 * Shorthand for marking an endpoint as idempotent with optional key
 */
export const IdempotentOptional = (ttl?: number) =>
  Idempotent({ required: false, ttl });
