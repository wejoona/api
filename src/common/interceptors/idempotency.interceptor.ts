import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  OnModuleDestroy,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import Redis from 'ioredis';
import { Request, Response } from 'express';

/**
 * Idempotency Interceptor
 *
 * Ensures that duplicate requests with the same idempotency key are not processed multiple times.
 * This is critical for financial operations to prevent double-charging or duplicate transfers.
 *
 * How it works:
 * 1. Client sends X-Idempotency-Key header with a unique identifier (e.g., UUID)
 * 2. If key exists in Redis, return cached response immediately (409 Conflict or 200 with cached result)
 * 3. If key doesn't exist, process request and cache successful response for 24 hours
 * 4. Errors are NOT cached to allow retry on transient failures
 *
 * Usage:
 * @UseInterceptors(IdempotencyInterceptor)
 * @Post('transfer')
 * async transfer(@Body() dto: TransferDto) { ... }
 */
@Injectable()
export class IdempotencyInterceptor
  implements NestInterceptor, OnModuleDestroy
{
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  private readonly redis: Redis;
  private isRedisConnected = false;
  private readonly CACHE_TTL = 86400; // 24 hours in seconds

  constructor(private readonly configService: ConfigService) {
    // Initialize Redis client
    this.redis = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(
          `Redis connection retry attempt ${times}, waiting ${delay}ms`,
        );
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    // Redis connection event handlers
    this.redis.on('connect', () => {
      this.isRedisConnected = true;
      this.logger.log('Redis connected successfully for idempotency');
    });

    this.redis.on('error', (error) => {
      this.isRedisConnected = false;
      this.logger.error(`Redis connection error: ${error.message}`);
    });

    this.redis.on('close', () => {
      this.isRedisConnected = false;
      this.logger.warn('Redis connection closed');
    });
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis connection closed gracefully');
    }
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Extract idempotency key from header
    const idempotencyKey = request.headers['x-idempotency-key'] as string;

    // If no idempotency key provided, skip idempotency check
    // This allows the endpoint to work without the header if desired
    if (!idempotencyKey) {
      this.logger.debug(
        'No idempotency key provided, processing request normally',
      );
      return next.handle();
    }

    // Validate idempotency key format (should be UUID or similar)
    if (!this.isValidIdempotencyKey(idempotencyKey)) {
      throw new BadRequestException(
        'Invalid X-Idempotency-Key format. Must be a valid UUID or alphanumeric string (16-128 characters)',
      );
    }

    // If Redis is not available, log warning and proceed without idempotency
    // This ensures service availability even if Redis is down
    if (!this.isRedisConnected) {
      this.logger.warn(
        `Redis unavailable, processing request without idempotency check for key: ${idempotencyKey}`,
      );
      return next.handle();
    }

    // SECURITY: Bind idempotency key to user to prevent cross-user cache key collisions
    const user = (request as any).user;
    const userId = user?.id || 'anonymous';
    const cacheKey = `idempotency:${userId}:${idempotencyKey}`;

    try {
      // Check if this idempotency key has been processed before
      const cachedResponse = await this.redis.get(cacheKey);

      if (cachedResponse) {
        this.logger.log(
          `Idempotency key ${idempotencyKey} found in cache, returning cached response`,
        );

        // Parse cached response
        const cached = JSON.parse(cachedResponse);

        // Set status code from cached response
        response.status(cached.statusCode || 200);

        // Return cached response body as Observable
        return of(cached.body);
      }

      // Key not found, process the request
      this.logger.debug(
        `Idempotency key ${idempotencyKey} not found, processing new request`,
      );

      // Execute the handler and cache the response
      return next.handle().pipe(
        tap({
          next: async (responseBody) => {
            try {
              // Cache successful response
              const statusCode = response.statusCode || 200;

              // Only cache successful responses (2xx status codes)
              if (statusCode >= 200 && statusCode < 300) {
                const cacheData = {
                  statusCode,
                  body: responseBody,
                  timestamp: new Date().toISOString(),
                };

                await this.redis.setex(
                  cacheKey,
                  this.CACHE_TTL,
                  JSON.stringify(cacheData),
                );

                this.logger.log(
                  `Cached response for idempotency key ${idempotencyKey} (TTL: ${this.CACHE_TTL}s)`,
                );
              } else {
                this.logger.debug(
                  `Not caching response for key ${idempotencyKey} - status code ${statusCode}`,
                );
              }
            } catch (error) {
              // Don't fail the request if caching fails
              const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';
              this.logger.error(
                `Failed to cache response for idempotency key ${idempotencyKey}: ${errorMessage}`,
              );
            }
          },
          error: (error) => {
            // Don't cache errors - allow retries for transient failures
            this.logger.debug(
              `Not caching error response for idempotency key ${idempotencyKey}`,
            );
            // Re-throw the error to maintain normal error handling
            throw error;
          },
        }),
      );
    } catch (error) {
      // If Redis operation fails, log and proceed without idempotency
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Redis operation failed for idempotency check: ${errorMessage}`,
      );

      // Proceed with request processing
      return next.handle();
    }
  }

  /**
   * Validate idempotency key format
   * Should be UUID, ULID, or alphanumeric string between 16-128 characters
   */
  private isValidIdempotencyKey(key: string): boolean {
    // Must be a string with reasonable length
    if (
      !key ||
      typeof key !== 'string' ||
      key.length < 16 ||
      key.length > 128
    ) {
      return false;
    }

    // Allow alphanumeric, hyphens, and underscores
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    return validPattern.test(key);
  }
}
