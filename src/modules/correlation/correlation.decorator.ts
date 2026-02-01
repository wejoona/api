import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Correlation ID Decorator
 *
 * Extracts the correlation ID from the request object.
 * Use this decorator in controllers to access the correlation ID.
 *
 * @example
 * ```typescript
 * @Get()
 * async getBalance(
 *   @CurrentUser() user: User,
 *   @CorrelationId() correlationId: string,
 * ) {
 *   this.logger.log(`[${correlationId}] Getting balance for user ${user.id}`);
 *   return this.balanceService.getBalance(user.id);
 * }
 * ```
 */
export const CorrelationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.correlationId || 'unknown';
  },
);
