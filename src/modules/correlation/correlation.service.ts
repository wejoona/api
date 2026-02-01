import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

/**
 * Correlation Service
 *
 * Request-scoped service that provides access to the correlation ID
 * anywhere in the application (services, use cases, repositories).
 *
 * Scope: REQUEST - A new instance is created for each incoming request.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class WalletService {
 *   constructor(private readonly correlationService: CorrelationService) {}
 *
 *   async getBalance(userId: string) {
 *     const correlationId = this.correlationService.getCorrelationId();
 *     this.logger.log(`[${correlationId}] Fetching balance for user ${userId}`);
 *     // ... rest of the logic
 *   }
 * }
 * ```
 */
@Injectable({ scope: Scope.REQUEST })
export class CorrelationService {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  /**
   * Get the correlation ID for the current request
   */
  getCorrelationId(): string {
    return this.request['correlationId'] || 'unknown';
  }

  /**
   * Check if a correlation ID exists for the current request
   */
  hasCorrelationId(): boolean {
    return !!this.request['correlationId'];
  }
}
