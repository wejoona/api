import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IdempotencyMiddleware } from './idempotency.middleware';
import { IdempotencyStorage } from './types/idempotency.types';
import { RedisIdempotencyStorage } from './storage/redis-idempotency.storage';
import { IdempotencyGuard } from './guards/idempotency.guard';

/**
 * Idempotency Module
 *
 * Provides idempotency handling for safe retries of financial operations.
 *
 * Features:
 * - Request deduplication via Idempotency-Key header
 * - Redis-backed storage with automatic expiration
 * - Request fingerprinting for replay attack prevention
 * - Distributed locking for concurrent request handling
 * - Cached response replay for idempotent retries
 *
 * Usage:
 * 1. Import this module in AppModule
 * 2. Apply middleware globally or to specific routes
 * 3. Use @Idempotent decorator on endpoints that need protection
 *
 * Configuration (in .env):
 * - IDEMPOTENCY_TTL=86400 (24 hours)
 * - IDEMPOTENCY_PROCESSING_TIMEOUT=300 (5 minutes)
 * - IDEMPOTENCY_STORE_RESPONSE_BODY=true
 * - IDEMPOTENCY_VALIDATE_FINGERPRINT=true
 *
 * @example
 * ```typescript
 * // In AppModule
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(IdempotencyMiddleware)
 *       .forRoutes('api/v1/transfers', 'api/v1/withdrawals');
 *   }
 * }
 *
 * // In Controller
 * @Post('transfer')
 * @Idempotent({ required: true })
 * async createTransfer(@Body() dto: CreateTransferDto) {
 *   return this.transferService.create(dto);
 * }
 * ```
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    IdempotencyMiddleware,
    IdempotencyGuard,
    {
      provide: IdempotencyStorage,
      useClass: RedisIdempotencyStorage,
    },
  ],
  exports: [IdempotencyMiddleware, IdempotencyGuard, IdempotencyStorage],
})
export class IdempotencyModule {}
