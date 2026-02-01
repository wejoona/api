import {
  Injectable,
  NestMiddleware,
  Logger,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, NextFunction } from 'express';
import {
  IdempotentRequest,
  IdempotencyConfig,
  IdempotencyStatus,
  IdempotencyRecord,
} from './types/idempotency.types';
import { IdempotencyStorage } from './types/idempotency.types';
import { FingerprintUtil } from './utils/fingerprint.util';

/**
 * Idempotency Middleware
 *
 * Handles idempotent request processing for safe retries of financial operations.
 *
 * How it works:
 * 1. Client sends request with Idempotency-Key header
 * 2. Middleware checks if key exists in storage
 * 3. If exists and completed -> return cached response
 * 4. If exists and processing -> return 409 Conflict (retry later)
 * 5. If doesn't exist -> acquire lock and process request
 * 6. Store response for future retries
 *
 * Security Features:
 * - Request fingerprinting prevents replay attacks
 * - Distributed locking prevents concurrent duplicate processing
 * - Automatic expiration of idempotency records
 * - Validates key format and length
 *
 * Usage:
 * Client includes header: Idempotency-Key: <uuid or random string>
 *
 * Standards:
 * - Based on Stripe's idempotency implementation
 * - RFC 7231 (HTTP semantics for safe methods)
 * - IETF draft-ietf-httpapi-idempotency-key-header
 */
@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IdempotencyMiddleware.name);
  private readonly config: Required<IdempotencyConfig>;
  private readonly HEADER_NAME = 'Idempotency-Key';

  constructor(
    private readonly storage: IdempotencyStorage,
    private readonly configService: ConfigService,
  ) {
    this.config = {
      ttl: this.configService.get<number>('idempotency.ttl') || 86400, // 24 hours
      processingTimeout:
        this.configService.get<number>('idempotency.processingTimeout') || 300, // 5 minutes
      storeResponseBody:
        this.configService.get<boolean>('idempotency.storeResponseBody') ??
        true,
      validateFingerprint:
        this.configService.get<boolean>('idempotency.validateFingerprint') ??
        true,
      extractKey: (req) =>
        req.headers[this.HEADER_NAME.toLowerCase()] as string,
      excludeRoutes: this.configService.get<string[]>(
        'idempotency.excludeRoutes',
      ) || ['/health', '/metrics', '/docs'],
      methods: ['POST', 'PUT', 'PATCH'],
    };
  }

  async use(
    req: IdempotentRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Skip if method doesn't require idempotency
      if (!this.shouldApplyIdempotency(req)) {
        return next();
      }

      // Skip excluded routes
      if (this.isExcludedRoute(req.path)) {
        return next();
      }

      // Extract idempotency key from header
      const key = this.extractIdempotencyKey(req);

      // If no key provided, continue without idempotency (optional)
      if (!key) {
        this.logger.debug(
          `No idempotency key provided for ${req.method} ${req.path}`,
        );
        return next();
      }

      // Validate key format
      this.validateKey(key);

      // Check for existing idempotency record
      const existingRecord = await this.storage.get(key);

      if (existingRecord) {
        return this.handleExistingRecord(req, res, key, existingRecord);
      }

      // Create new idempotency record
      await this.handleNewRequest(req, res, next, key);
    } catch (error) {
      this.logger.error('Idempotency middleware error', error);

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      // Don't fail the request due to idempotency errors
      // Log and continue
      next();
    }
  }

  /**
   * Handle request with existing idempotency record
   */
  private async handleExistingRecord(
    req: IdempotentRequest,
    res: Response,
    key: string,
    record: IdempotencyRecord,
  ): Promise<void> {
    // Validate request fingerprint (prevent replay attacks)
    if (this.config.validateFingerprint) {
      if (!FingerprintUtil.validate(req, record.fingerprint)) {
        throw new BadRequestException(
          'Request fingerprint mismatch. Idempotency key cannot be reused for different requests.',
        );
      }
    }

    // Check if record is expired but not yet cleaned up
    if (record.expiresAt && record.expiresAt < new Date()) {
      this.logger.warn(`Expired idempotency record found: ${key}`);
      await this.storage.delete(key);
      throw new BadRequestException('Idempotency key has expired');
    }

    // Handle based on status
    switch (record.status) {
      case IdempotencyStatus.COMPLETED:
        // Return cached response
        this.logger.log(
          `Returning cached response for idempotency key: ${key}`,
        );
        this.sendCachedResponse(res, record);
        break;

      case IdempotencyStatus.PROCESSING:
        // Check if processing has timed out
        const processingTime = (Date.now() - record.createdAt.getTime()) / 1000;

        if (processingTime > this.config.processingTimeout) {
          // Processing timed out - allow retry
          this.logger.warn(
            `Processing timeout for idempotency key: ${key} (${processingTime}s)`,
          );
          await this.storage.delete(key);
          throw new BadRequestException(
            'Previous request timed out. Please retry.',
          );
        }

        // Still processing - return 409 Conflict
        throw new ConflictException(
          'Request is currently being processed. Please retry in a few seconds.',
        );

      case IdempotencyStatus.FAILED:
        // Return cached error
        this.logger.log(`Returning cached error for idempotency key: ${key}`);
        this.sendCachedError(res, record);
        break;

      default:
        throw new InternalServerErrorException(
          'Invalid idempotency record status',
        );
    }
  }

  /**
   * Handle new request (no existing record)
   */
  private async handleNewRequest(
    req: IdempotentRequest,
    res: Response,
    next: NextFunction,
    key: string,
  ): Promise<void> {
    // Try to acquire lock
    const lockAcquired = await this.storage.acquireLock(
      key,
      this.config.processingTimeout,
    );

    if (!lockAcquired) {
      // Another instance is processing this request
      throw new ConflictException(
        'Request is being processed by another instance. Please retry in a few seconds.',
      );
    }

    try {
      // Create initial record (PROCESSING state)
      const fingerprint = FingerprintUtil.generate(req);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.config.ttl * 1000);

      const record: IdempotencyRecord = {
        key,
        status: IdempotencyStatus.PROCESSING,
        fingerprint,
        createdAt: now,
        updatedAt: now,
        expiresAt,
      };

      await this.storage.set(record);

      // Add idempotency context to request
      req.idempotency = {
        key,
        isRetry: false,
        record,
      };

      // Intercept response to store result
      this.interceptResponse(req, res, key);

      // Continue processing
      next();
    } catch (error) {
      // Release lock on error
      await this.storage.releaseLock(key);
      throw error;
    }
  }

  /**
   * Intercept response to store idempotency result
   */
  private interceptResponse(
    _req: IdempotentRequest,
    res: Response,
    key: string,
  ): void {
    const originalSend = res.send.bind(res);

    res.send = (body: any): Response => {
      // Only store on first call to send()
      if (!res.headersSent) {
        this.storeResponse(key, res.statusCode, body).catch((error) => {
          this.logger.error(
            `Failed to store idempotency response: ${key}`,
            error,
          );
        });
      }

      return originalSend(body);
    };
  }

  /**
   * Store response in idempotency storage
   */
  private async storeResponse(
    key: string,
    statusCode: number,
    body: any,
  ): Promise<void> {
    try {
      const isSuccess = statusCode >= 200 && statusCode < 300;
      const status = isSuccess
        ? IdempotencyStatus.COMPLETED
        : IdempotencyStatus.FAILED;

      const updates: Partial<IdempotencyRecord> = {
        status,
        statusCode,
        updatedAt: new Date(),
      };

      if (this.config.storeResponseBody && isSuccess) {
        updates.responseBody =
          typeof body === 'string' ? JSON.parse(body) : body;
      }

      if (!isSuccess) {
        updates.error = {
          message: body?.message || 'Request failed',
          code: body?.code,
        };
      }

      await this.storage.update(key, updates);
      await this.storage.releaseLock(key);

      this.logger.debug(`Stored idempotency result: ${key} (${status})`);
    } catch (error) {
      this.logger.error(`Failed to store idempotency result: ${key}`, error);
      // Release lock even on error
      await this.storage.releaseLock(key);
    }
  }

  /**
   * Send cached successful response
   */
  private sendCachedResponse(res: Response, record: IdempotencyRecord): void {
    res.setHeader('X-Idempotency-Cached', 'true');
    res.setHeader('X-Idempotency-Key', record.key);
    res.status(record.statusCode || 200).json(record.responseBody);
  }

  /**
   * Send cached error response
   */
  private sendCachedError(res: Response, record: IdempotencyRecord): void {
    res.setHeader('X-Idempotency-Cached', 'true');
    res.setHeader('X-Idempotency-Key', record.key);
    res.status(record.statusCode || 500).json({
      error: record.error?.message || 'Request failed',
      code: record.error?.code,
    });
  }

  /**
   * Check if idempotency should be applied to this request
   */
  private shouldApplyIdempotency(req: IdempotentRequest): boolean {
    return this.config.methods.includes(req.method.toUpperCase());
  }

  /**
   * Check if route is excluded from idempotency
   */
  private isExcludedRoute(path: string): boolean {
    return this.config.excludeRoutes.some((route) => path.includes(route));
  }

  /**
   * Extract idempotency key from request
   */
  private extractIdempotencyKey(req: IdempotentRequest): string | null {
    const key = this.config.extractKey(req);
    return key || null;
  }

  /**
   * Validate idempotency key format
   *
   * Requirements:
   * - Length: 16-255 characters
   * - Format: Alphanumeric, hyphens, underscores
   * - Recommended: UUID v4
   */
  private validateKey(key: string): void {
    if (!key || key.length < 16 || key.length > 255) {
      throw new BadRequestException(
        'Idempotency-Key must be between 16 and 255 characters',
      );
    }

    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(key)) {
      throw new BadRequestException(
        'Idempotency-Key must contain only alphanumeric characters, hyphens, and underscores',
      );
    }
  }
}
