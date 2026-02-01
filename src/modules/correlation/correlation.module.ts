import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CorrelationIdMiddleware } from './correlation.middleware';
import { CorrelationIdInterceptor } from './correlation.interceptor';
import { CorrelationService } from './correlation.service';

/**
 * Correlation Module
 *
 * Provides correlation ID tracking across the entire application.
 *
 * Features:
 * 1. Middleware: Generates/propagates X-Correlation-ID header
 * 2. Interceptor: Logs execution time and errors with correlation ID
 * 3. Service: Request-scoped service for accessing correlation ID anywhere
 * 4. Decorator: @CorrelationId() for extracting correlation ID in controllers
 *
 * Setup:
 * Import this module in AppModule to enable correlation tracking globally.
 *
 * Usage Examples:
 *
 * 1. In Controllers:
 * ```typescript
 * @Get('balance')
 * async getBalance(
 *   @CurrentUser() user: User,
 *   @CorrelationId() correlationId: string,
 * ) {
 *   this.logger.log(`[${correlationId}] Getting balance for ${user.id}`);
 *   return this.balanceService.getBalance(user.id);
 * }
 * ```
 *
 * 2. In Services:
 * ```typescript
 * @Injectable()
 * export class WalletService {
 *   constructor(private readonly correlationService: CorrelationService) {}
 *
 *   async getBalance(userId: string) {
 *     const correlationId = this.correlationService.getCorrelationId();
 *     this.logger.log(`[${correlationId}] Fetching balance for ${userId}`);
 *     return this.walletRepository.findByUserId(userId);
 *   }
 * }
 * ```
 *
 * 3. Propagating to Downstream Services:
 * ```typescript
 * async callExternalAPI(data: any, req: Request) {
 *   const correlationId = req.correlationId;
 *   return axios.post(url, data, {
 *     headers: {
 *       'X-Correlation-ID': correlationId,
 *       'Content-Type': 'application/json',
 *     },
 *   });
 * }
 * ```
 *
 * Benefits:
 * - End-to-end request tracking across microservices
 * - Easier debugging and log correlation
 * - Better observability in distributed systems
 * - Compliance with distributed tracing standards
 */
@Module({
  providers: [
    CorrelationService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CorrelationIdInterceptor,
    },
  ],
  exports: [CorrelationService],
})
export class CorrelationModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply correlation middleware to all routes
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
