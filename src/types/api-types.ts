/**
 * API-specific Type Definitions
 *
 * Strict types for HTTP requests, responses, and API interactions
 */

import {
  SuccessResponse,
  ErrorResponse,
  PaginatedResponse,
  UUID,
  ISODateString,
  PositiveInt,
} from './strict-types';

// ==========================================
// HTTP METHOD TYPES
// ==========================================

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS'
  | 'HEAD';

export type HttpStatusCode =
  | 200 // OK
  | 201 // Created
  | 204 // No Content
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden
  | 404 // Not Found
  | 409 // Conflict
  | 422 // Unprocessable Entity
  | 429 // Too Many Requests
  | 500 // Internal Server Error
  | 502 // Bad Gateway
  | 503 // Service Unavailable
  | 504; // Gateway Timeout

// ==========================================
// REQUEST TYPES
// ==========================================

/**
 * Standard request headers
 */
export interface StandardRequestHeaders {
  readonly 'content-type'?:
    | 'application/json'
    | 'application/x-www-form-urlencoded'
    | 'multipart/form-data';
  readonly accept?: 'application/json' | '*/*';
  readonly authorization?: string;
  readonly 'x-api-key'?: string;
  readonly 'x-request-id'?: UUID;
  readonly 'x-correlation-id'?: UUID;
  readonly 'x-device-id'?: string;
  readonly 'x-app-version'?: string;
  readonly 'user-agent'?: string;
}

/**
 * Pagination query parameters
 */
export interface PaginationQuery {
  readonly page?: PositiveInt;
  readonly pageSize?: PositiveInt;
  readonly limit?: PositiveInt;
  readonly offset?: PositiveInt;
}

/**
 * Cursor pagination query parameters
 */
export interface CursorPaginationQuery {
  readonly cursor?: string;
  readonly limit?: PositiveInt;
  readonly direction?: 'forward' | 'backward';
}

/**
 * Sorting query parameters
 */
export interface SortingQuery {
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
  readonly orderBy?: string;
}

/**
 * Search query parameters
 */
export interface SearchQuery {
  readonly q?: string;
  readonly search?: string;
  readonly filter?: string;
}

/**
 * Date range query parameters
 */
export interface DateRangeQuery {
  readonly startDate?: ISODateString;
  readonly endDate?: ISODateString;
  readonly fromDate?: ISODateString;
  readonly toDate?: ISODateString;
}

/**
 * Combined query parameters
 */
export interface StandardQuery
  extends PaginationQuery, SortingQuery, SearchQuery, DateRangeQuery {}

// ==========================================
// RESPONSE TYPES
// ==========================================

/**
 * HTTP response with typed data
 */
export interface HttpResponse<T = unknown> {
  readonly status: HttpStatusCode;
  readonly statusText: string;
  readonly data: T;
  readonly headers: Record<string, string>;
}

/**
 * Success response with metadata
 */
export interface ApiSuccessResponse<T> extends SuccessResponse<T> {
  readonly meta?: {
    readonly version?: string;
    readonly environment?: string;
    readonly cached?: boolean;
    readonly ttl?: number;
  };
}

/**
 * Error response with detailed information
 */
export interface ApiErrorResponse extends ErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
    readonly path?: string;
    readonly statusCode?: HttpStatusCode;
    readonly validationErrors?: readonly ValidationErrorDetail[];
  };
}

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  readonly field: string;
  readonly message: string;
  readonly constraint?: string;
  readonly value?: unknown;
}

// ==========================================
// API CLIENT TYPES
// ==========================================

/**
 * API client configuration
 */
export interface ApiClientConfig {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly timeout?: number;
  readonly retries?: PositiveInt;
  readonly headers?: Record<string, string>;
}

/**
 * API request options
 */
export interface ApiRequestOptions {
  readonly method: HttpMethod;
  readonly url: string;
  readonly headers?: Record<string, string>;
  readonly params?: Record<string, string | number | boolean>;
  readonly data?: unknown;
  readonly timeout?: number;
  readonly retries?: PositiveInt;
  readonly validateStatus?: (status: number) => boolean;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  readonly maxRetries: PositiveInt;
  readonly retryDelay: number;
  readonly retryCondition?: (error: Error) => boolean;
  readonly exponentialBackoff?: boolean;
}

// ==========================================
// WEBHOOK TYPES
// ==========================================

/**
 * Webhook event
 */
export interface WebhookEvent<T = unknown> {
  readonly id: UUID;
  readonly type: string;
  readonly data: T;
  readonly timestamp: ISODateString;
  readonly signature?: string;
  readonly retryCount?: PositiveInt;
}

/**
 * Webhook delivery status
 */
export type WebhookDeliveryStatus =
  | 'pending'
  | 'processing'
  | 'delivered'
  | 'failed'
  | 'retrying';

/**
 * Webhook delivery attempt
 */
export interface WebhookDeliveryAttempt {
  readonly attemptNumber: PositiveInt;
  readonly timestamp: ISODateString;
  readonly statusCode?: HttpStatusCode;
  readonly responseTime?: number;
  readonly errorMessage?: string;
}

// ==========================================
// RATE LIMITING TYPES
// ==========================================

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  readonly limit: PositiveInt;
  readonly remaining: PositiveInt;
  readonly reset: ISODateString;
  readonly retryAfter?: number;
}

/**
 * Rate limit headers
 */
export interface RateLimitHeaders {
  readonly 'x-ratelimit-limit': string;
  readonly 'x-ratelimit-remaining': string;
  readonly 'x-ratelimit-reset': string;
  readonly 'retry-after'?: string;
}

// ==========================================
// CACHING TYPES
// ==========================================

/**
 * Cache control directives
 */
export interface CacheControl {
  readonly maxAge?: number;
  readonly sMaxAge?: number;
  readonly noCache?: boolean;
  readonly noStore?: boolean;
  readonly mustRevalidate?: boolean;
  readonly public?: boolean;
  readonly private?: boolean;
}

/**
 * Cached response
 */
export interface CachedResponse<T> {
  readonly data: T;
  readonly cachedAt: ISODateString;
  readonly expiresAt: ISODateString;
  readonly etag?: string;
  readonly lastModified?: ISODateString;
}

// ==========================================
// CONTENT TYPES
// ==========================================

/**
 * File upload data
 */
export interface FileUploadData {
  readonly filename: string;
  readonly mimetype: string;
  readonly size: number;
  readonly buffer?: Buffer;
  readonly path?: string;
}

/**
 * Multipart form data
 */
export interface MultipartFormData {
  readonly fields: Record<string, string>;
  readonly files: readonly FileUploadData[];
}

// ==========================================
// API VERSIONING
// ==========================================

/**
 * API version
 */
export type ApiVersion = 'v1' | 'v2' | 'v3';

/**
 * Versioned endpoint
 */
export interface VersionedEndpoint {
  readonly version: ApiVersion;
  readonly path: string;
  readonly deprecated?: boolean;
  readonly sunsetDate?: ISODateString;
}

// ==========================================
// HEALTH CHECK TYPES
// ==========================================

/**
 * Health status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Health check response
 */
export interface HealthCheckResponse {
  readonly status: HealthStatus;
  readonly timestamp: ISODateString;
  readonly uptime: number;
  readonly version: string;
  readonly checks: Record<string, ComponentHealth>;
}

/**
 * Component health
 */
export interface ComponentHealth {
  readonly status: HealthStatus;
  readonly message?: string;
  readonly responseTime?: number;
  readonly details?: Record<string, unknown>;
}

// ==========================================
// BATCH OPERATIONS
// ==========================================

/**
 * Batch request
 */
export interface BatchRequest<T> {
  readonly operations: readonly T[];
  readonly continueOnError?: boolean;
  readonly parallel?: boolean;
}

/**
 * Batch response
 */
export interface BatchResponse<T, E = Error> {
  readonly results: readonly (
    | { readonly success: true; readonly data: T }
    | { readonly success: false; readonly error: E }
  )[];
  readonly summary: {
    readonly total: PositiveInt;
    readonly successful: PositiveInt;
    readonly failed: PositiveInt;
  };
}

// ==========================================
// EXPORT TYPE HELPERS
// ==========================================

/**
 * Extract response data type from API response
 */
export type ExtractResponseData<T> =
  T extends SuccessResponse<infer U> ? U : never;

/**
 * Extract paginated items type
 */
export type ExtractPaginatedItems<T> =
  T extends PaginatedResponse<infer U> ? U : never;

/**
 * Make query type from DTO
 */
export type QueryFromDto<T> = T & StandardQuery;
