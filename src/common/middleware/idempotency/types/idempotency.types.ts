import { Request } from 'express';

/**
 * Idempotency record status
 */
export enum IdempotencyStatus {
  /** Request is currently being processed */
  PROCESSING = 'processing',
  /** Request completed successfully */
  COMPLETED = 'completed',
  /** Request failed */
  FAILED = 'failed',
}

/**
 * Stored idempotency record
 */
export interface IdempotencyRecord {
  /** Unique idempotency key */
  key: string;

  /** Current status of the request */
  status: IdempotencyStatus;

  /** HTTP status code of the response */
  statusCode?: number;

  /** Response body (only stored on success) */
  responseBody?: any;

  /** Error details (only stored on failure) */
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };

  /** Request fingerprint for validation */
  fingerprint: string;

  /** Timestamp when record was created */
  createdAt: Date;

  /** Timestamp when record was last updated */
  updatedAt: Date;

  /** When this record expires (TTL) */
  expiresAt: Date;
}

/**
 * Request fingerprint for detecting replay attacks
 */
export interface RequestFingerprint {
  method: string;
  path: string;
  userId?: string;
  bodyHash?: string;
}

/**
 * Idempotency configuration options
 */
export interface IdempotencyConfig {
  /** TTL for idempotency records in seconds (default: 86400 = 24 hours) */
  ttl?: number;

  /** Maximum time a request can be in PROCESSING state before timing out (default: 300 = 5 minutes) */
  processingTimeout?: number;

  /** Whether to store response body for replay (default: true) */
  storeResponseBody?: boolean;

  /** Whether to check request fingerprint for replay detection (default: true) */
  validateFingerprint?: boolean;

  /** Custom key extraction function */
  extractKey?: (req: Request) => string | null;

  /** Routes to exclude from idempotency check */
  excludeRoutes?: string[];

  /** HTTP methods to apply idempotency to (default: POST, PUT, PATCH) */
  methods?: string[];
}

/**
 * Extended Express Request with idempotency context
 */
export interface IdempotentRequest extends Request {
  idempotency?: {
    key: string;
    isRetry: boolean;
    record?: IdempotencyRecord;
  };
}

/**
 * Idempotency storage interface
 */
export abstract class IdempotencyStorage {
  /**
   * Get an idempotency record by key
   */
  abstract get(key: string): Promise<IdempotencyRecord | null>;

  /**
   * Store an idempotency record
   */
  abstract set(record: IdempotencyRecord): Promise<void>;

  /**
   * Update an existing idempotency record
   */
  abstract update(
    key: string,
    updates: Partial<IdempotencyRecord>,
  ): Promise<void>;

  /**
   * Delete an idempotency record
   */
  abstract delete(key: string): Promise<void>;

  /**
   * Acquire a lock for processing a request
   */
  abstract acquireLock(key: string, ttl: number): Promise<boolean>;

  /**
   * Release a lock after processing
   */
  abstract releaseLock(key: string): Promise<void>;
}
