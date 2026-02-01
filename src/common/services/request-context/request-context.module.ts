import { Module, Global } from '@nestjs/common';
import { RequestContextService } from './request-context.service';

/**
 * Request Context Module
 *
 * Provides request-scoped context throughout the application.
 * This module is global, so RequestContextService is available everywhere
 * without explicit imports.
 *
 * Setup:
 * 1. Import RequestContextModule in AppModule
 * 2. Apply RequestContextMiddleware globally in AppModule
 *
 * Usage:
 * ```typescript
 * // In any service
 * constructor(private readonly requestContext: RequestContextService) {}
 *
 * async someMethod() {
 *   const userId = this.requestContext.getUserId();
 *   const correlationId = this.requestContext.getCorrelationId();
 *   // ...
 * }
 * ```
 */
@Global()
@Module({
  providers: [RequestContextService],
  exports: [RequestContextService],
})
export class RequestContextModule {}
