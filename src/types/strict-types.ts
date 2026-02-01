/**
 * Strict Type System for JoonaPay USDC Wallet
 *
 * This file provides advanced TypeScript utility types for:
 * - API responses with strict type safety
 * - Domain entities with proper constraints
 * - DTOs with validation metadata
 * - Generic type helpers for common patterns
 * - Eliminating 'any' types throughout the codebase
 *
 * @see https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
 * @see https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
 */

// ==========================================
// PRIMITIVE & BRANDED TYPES
// ==========================================

/**
 * Branded type for compile-time type safety
 * Prevents mixing IDs of different entity types
 *
 * @example
 * type UserId = Brand<string, 'UserId'>;
 * type WalletId = Brand<string, 'WalletId'>;
 * const userId: UserId = 'user-123' as UserId;
 * const walletId: WalletId = userId; // ❌ Type error
 */
export type Brand<T, B> = T & { __brand: B };

/**
 * Entity IDs with type branding for safety
 */
export type UserId = Brand<string, 'UserId'>;
export type WalletId = Brand<string, 'WalletId'>;
export type TransactionId = Brand<string, 'TransactionId'>;
export type TransferId = Brand<string, 'TransferId'>;
export type DepositId = Brand<string, 'DepositId'>;
export type WithdrawalId = Brand<string, 'WithdrawalId'>;
export type BeneficiaryId = Brand<string, 'BeneficiaryId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type DeviceId = Brand<string, 'DeviceId'>;
export type ApiKeyId = Brand<string, 'ApiKeyId'>;

/**
 * ISO 8601 date string
 */
export type ISODateString = Brand<string, 'ISODateString'>;

/**
 * Email address (validated)
 */
export type Email = Brand<string, 'Email'>;

/**
 * Phone number in E.164 format (+225XXXXXXXXX)
 */
export type PhoneNumber = Brand<string, 'PhoneNumber'>;

/**
 * UUID v4
 */
export type UUID = Brand<string, 'UUID'>;

/**
 * Positive integer (for counts, IDs, etc.)
 */
export type PositiveInt = Brand<number, 'PositiveInt'>;

/**
 * Non-negative number (for amounts, balances)
 */
export type NonNegative = Brand<number, 'NonNegative'>;

/**
 * USDC amount in smallest unit (6 decimals)
 * e.g., 1000000 = $1.00 USDC
 */
export type USDCAmount = Brand<bigint, 'USDCAmount'>;

/**
 * XOF amount in smallest unit (0 decimals)
 * e.g., 1000 = 1000 XOF
 */
export type XOFAmount = Brand<bigint, 'XOFAmount'>;

// ==========================================
// UTILITY TYPES
// ==========================================

/**
 * Make specific keys required in a type
 *
 * @example
 * type User = { id?: string; name?: string; email?: string };
 * type UserWithId = RequireKeys<User, 'id'>; // { id: string; name?: string; email?: string }
 */
export type RequireKeys<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

/**
 * Make specific keys optional in a type
 *
 * @example
 * type User = { id: string; name: string; email: string };
 * type PartialUser = OptionalKeys<User, 'email'>; // { id: string; name: string; email?: string }
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Make all nested properties optional (deep partial)
 *
 * @example
 * type Config = { db: { host: string; port: number } };
 * type PartialConfig = DeepPartial<Config>; // { db?: { host?: string; port?: number } }
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

/**
 * Make all nested properties required (deep required)
 */
export type DeepRequired<T> = T extends object
  ? {
      [P in keyof T]-?: DeepRequired<T[P]>;
    }
  : T;

/**
 * Make all properties readonly (deep)
 */
export type DeepReadonly<T> = T extends object
  ? {
      readonly [P in keyof T]: DeepReadonly<T[P]>;
    }
  : T;

/**
 * Extract keys of T whose values are assignable to U
 *
 * @example
 * type Example = { a: string; b: number; c: string };
 * type StringKeys = KeysOfType<Example, string>; // 'a' | 'c'
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Exclude null and undefined from type
 */
export type NonNullish<T> = T extends null | undefined ? never : T;

/**
 * Extract non-null/undefined values from union type
 */
export type NonNullishValues<T> = {
  [K in keyof T]: NonNullish<T[K]>;
};

/**
 * Make a type mutable (remove readonly)
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Get the value type from an object type
 */
export type ValueOf<T> = T[keyof T];

/**
 * Extract promise type
 */
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

/**
 * Extract array element type
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : never;

/**
 * Create a type with specific keys omitted recursively
 */
export type DeepOmit<T, K extends string> = T extends object
  ? {
      [P in keyof T as P extends K ? never : P]: DeepOmit<T[P], K>;
    }
  : T;

/**
 * Create a type with specific keys picked recursively
 */
export type DeepPick<T, K extends string> = T extends object
  ? {
      [P in keyof T as P extends K ? P : never]: DeepPick<T[P], K>;
    }
  : T;

// ==========================================
// API RESPONSE TYPES
// ==========================================

/**
 * Standard success response wrapper
 */
export interface SuccessResponse<T> {
  readonly success: true;
  readonly data: T;
  readonly timestamp: ISODateString;
  readonly requestId?: UUID;
}

/**
 * Standard error response wrapper
 */
export interface ErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
    readonly path?: string;
  };
  readonly timestamp: ISODateString;
  readonly requestId?: UUID;
}

/**
 * Union of success and error responses
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly meta: {
    readonly total: PositiveInt;
    readonly page: PositiveInt;
    readonly pageSize: PositiveInt;
    readonly totalPages: PositiveInt;
    readonly hasNext: boolean;
    readonly hasPrevious: boolean;
  };
}

/**
 * Cursor-based pagination response
 */
export interface CursorPaginatedResponse<T> {
  readonly data: readonly T[];
  readonly meta: {
    readonly nextCursor: string | null;
    readonly previousCursor: string | null;
    readonly hasNext: boolean;
    readonly hasPrevious: boolean;
    readonly limit: PositiveInt;
  };
}

/**
 * List response with optional pagination
 */
export type ListResponse<T> = {
  readonly items: readonly T[];
  readonly count: PositiveInt;
} & (
  | {
      readonly pagination: PaginatedResponse<T>['meta'];
    }
  | {
      readonly pagination?: never;
    }
);

// ==========================================
// DTO TYPE HELPERS
// ==========================================

/**
 * Base DTO type with validation metadata
 */
export interface BaseDto {
  readonly _type?: string;
  readonly _validated?: boolean;
}

/**
 * Create DTO type from entity (removes metadata, converts to input types)
 */
export type CreateDto<T> = Omit<
  T,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'version'
> &
  BaseDto;

/**
 * Update DTO type (all fields optional except ID)
 */
export type UpdateDto<T> = Partial<
  Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'version'>
> &
  BaseDto;

/**
 * Response DTO type (readonly, includes metadata)
 */
export type ResponseDto<T> = DeepReadonly<T>;

/**
 * Query/Filter DTO type
 */
export interface QueryDto extends BaseDto {
  readonly page?: PositiveInt;
  readonly pageSize?: PositiveInt;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
  readonly search?: string;
}

/**
 * Bulk operation DTO
 */
export interface BulkOperationDto<T> extends BaseDto {
  readonly items: readonly T[];
  readonly options?: {
    readonly continueOnError?: boolean;
    readonly validateFirst?: boolean;
  };
}

// ==========================================
// DOMAIN ENTITY TYPES
// ==========================================

/**
 * Base entity properties (all domain entities have these)
 */
export interface BaseEntity {
  readonly id: UUID;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
  readonly deletedAt?: ISODateString | null;
}

/**
 * Versioned entity (for optimistic locking)
 */
export interface VersionedEntity extends BaseEntity {
  readonly version: PositiveInt;
}

/**
 * Soft-deletable entity
 */
export interface SoftDeletableEntity extends BaseEntity {
  readonly deletedAt: ISODateString | null;
  readonly deletedBy?: UserId | null;
}

/**
 * Auditable entity (tracks who created/modified)
 */
export interface AuditableEntity extends BaseEntity {
  readonly createdBy?: UserId;
  readonly updatedBy?: UserId;
}

/**
 * Full auditable entity (combining version, soft-delete, and audit)
 */
export interface FullAuditableEntity extends BaseEntity {
  readonly version: PositiveInt;
  readonly deletedAt: ISODateString | null;
  readonly deletedBy?: UserId | null;
  readonly createdBy?: UserId;
  readonly updatedBy?: UserId;
}

// ==========================================
// REPOSITORY TYPES
// ==========================================

/**
 * Standard repository interface
 */
export interface Repository<T extends BaseEntity> {
  findById(id: UUID): Promise<T | null>;
  findMany(filter?: RepositoryFilter<T>): Promise<readonly T[]>;
  create(data: CreateDto<T>): Promise<T>;
  update(id: UUID, data: UpdateDto<T>): Promise<T>;
  delete(id: UUID): Promise<void>;
  exists(id: UUID): Promise<boolean>;
  count(filter?: RepositoryFilter<T>): Promise<PositiveInt>;
}

/**
 * Repository filter options
 */
export interface RepositoryFilter<T> {
  readonly where?: Partial<T>;
  readonly orderBy?: {
    readonly field: keyof T;
    readonly direction: 'asc' | 'desc';
  };
  readonly limit?: PositiveInt;
  readonly offset?: PositiveInt;
  readonly include?: readonly (keyof T)[];
  readonly exclude?: readonly (keyof T)[];
}

/**
 * Repository with soft delete support
 */
export interface SoftDeleteRepository<
  T extends SoftDeletableEntity,
> extends Repository<T> {
  softDelete(id: UUID): Promise<void>;
  restore(id: UUID): Promise<void>;
  findWithDeleted(filter?: RepositoryFilter<T>): Promise<readonly T[]>;
  findOnlyDeleted(filter?: RepositoryFilter<T>): Promise<readonly T[]>;
}

// ==========================================
// VALIDATION TYPES
// ==========================================

/**
 * Validation error
 */
export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly constraints?: Record<string, string>;
  readonly value?: unknown;
}

/**
 * Validation result
 */
export type ValidationResult<T> =
  | {
      readonly valid: true;
      readonly data: T;
    }
  | {
      readonly valid: false;
      readonly errors: readonly ValidationError[];
    };

// ==========================================
// EVENT TYPES
// ==========================================

/**
 * Base domain event
 */
export interface DomainEvent<T = unknown> {
  readonly eventId: UUID;
  readonly eventType: string;
  readonly aggregateId: UUID;
  readonly aggregateType: string;
  readonly payload: T;
  readonly metadata: {
    readonly occurredAt: ISODateString;
    readonly userId?: UserId;
    readonly correlationId?: UUID;
    readonly causationId?: UUID;
  };
  readonly version: PositiveInt;
}

/**
 * Event handler function
 */
export type EventHandler<T extends DomainEvent> = (event: T) => Promise<void>;

// ==========================================
// RESULT TYPES (RAILWAY-ORIENTED PROGRAMMING)
// ==========================================

/**
 * Success result
 */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/**
 * Error result
 */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/**
 * Result type (Either monad)
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Helper to create Ok result
 */
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

/**
 * Helper to create Err result
 */
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/**
 * Check if result is Ok
 */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> =>
  result.ok === true;

/**
 * Check if result is Err
 */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> =>
  result.ok === false;

// ==========================================
// TYPE-SAFE JSON
// ==========================================

/**
 * JSON primitive types
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * JSON array
 */
export type JsonArray = readonly JsonValue[];

/**
 * JSON object
 */
export type JsonObject = { readonly [key: string]: JsonValue };

/**
 * Any valid JSON value
 */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/**
 * Type-safe alternative to Record<string, any>
 */
export type TypeSafeRecord = Record<string, JsonValue>;

/**
 * Metadata object (replaces Record<string, unknown>)
 */
export type Metadata = Record<string, JsonValue>;

// ==========================================
// DATABASE QUERY TYPES
// ==========================================

/**
 * SQL query parameters (replaces any[])
 */
export type QueryParameters = readonly (string | number | boolean | null)[];

/**
 * Database query log entry
 */
export interface QueryLogEntry {
  readonly query: string;
  readonly parameters: QueryParameters;
  readonly duration: number;
  readonly timestamp: ISODateString;
  readonly context?: string;
}

// ==========================================
// EXTERNAL PROVIDER TYPES
// ==========================================

/**
 * Generic external API response
 */
export interface ExternalApiResponse<T = JsonValue> {
  readonly status: number;
  readonly data: T;
  readonly headers: Record<string, string>;
  readonly duration: number;
}

/**
 * External API error
 */
export interface ExternalApiError {
  readonly provider: string;
  readonly statusCode: number;
  readonly message: string;
  readonly originalError?: unknown;
  readonly timestamp: ISODateString;
}

/**
 * Webhook payload (type-safe)
 */
export interface WebhookPayload<T = JsonValue> {
  readonly event: string;
  readonly data: T;
  readonly timestamp: ISODateString;
  readonly signature?: string;
}

// ==========================================
// FINANCIAL TYPES
// ==========================================

/**
 * Money amount with currency
 */
export interface Money {
  readonly amount: NonNegative;
  readonly currency: 'USDC' | 'XOF';
  readonly decimals: 6 | 0;
}

/**
 * Transaction status (strict union)
 */
export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'reversed';

/**
 * Transaction type (strict union)
 */
export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'transfer_internal'
  | 'transfer_external'
  | 'payment'
  | 'refund'
  | 'fee';

/**
 * KYC status
 */
export type KycStatus =
  | 'not_started'
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'expired';

/**
 * KYC tier level
 */
export type KycTier = 'tier_0' | 'tier_1' | 'tier_2' | 'tier_3';

// ==========================================
// TIME SERIES & ANALYTICS TYPES
// ==========================================

/**
 * Time series data point
 */
export interface TimeSeriesPoint<T = number> {
  readonly timestamp: ISODateString;
  readonly value: T;
  readonly metadata?: Metadata;
}

/**
 * Time series data
 */
export interface TimeSeries<T = number> {
  readonly points: readonly TimeSeriesPoint<T>[];
  readonly aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  readonly interval?: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

/**
 * Statistics summary
 */
export interface Statistics {
  readonly count: PositiveInt;
  readonly sum?: number;
  readonly avg?: number;
  readonly min?: number;
  readonly max?: number;
  readonly median?: number;
  readonly stdDev?: number;
}

// ==========================================
// CONFIGURATION TYPES
// ==========================================

/**
 * Environment type
 */
export type Environment = 'development' | 'staging' | 'production' | 'test';

/**
 * Log level
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Feature flag
 */
export interface FeatureFlag {
  readonly name: string;
  readonly enabled: boolean;
  readonly rolloutPercentage?: number;
  readonly enabledFor?: readonly UserId[];
}

// ==========================================
// TYPE GUARDS
// ==========================================

/**
 * Check if value is defined (not null or undefined)
 */
export const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

/**
 * Check if value is a string
 */
export const isString = (value: unknown): value is string =>
  typeof value === 'string';

/**
 * Check if value is a number
 */
export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && !isNaN(value);

/**
 * Check if value is a boolean
 */
export const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';

/**
 * Check if value is an object
 */
export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Check if value is an array
 */
export const isArray = <T = unknown>(value: unknown): value is T[] =>
  Array.isArray(value);

/**
 * Check if value is a valid JSON value
 */
export const isJsonValue = (value: unknown): value is JsonValue => {
  if (value === null) return true;
  if (typeof value === 'string') return true;
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === 'object') {
    return Object.values(value).every(isJsonValue);
  }
  return false;
};

// ==========================================
// ASYNC TYPES
// ==========================================

/**
 * Async function type
 */
export type AsyncFunction<
  Args extends readonly unknown[] = readonly [],
  R = void,
> = (...args: Args) => Promise<R>;

/**
 * Callback function type (replaces (...args: any[]) => any)
 */
export type Callback<
  Args extends readonly unknown[] = readonly [],
  R = void,
> = (...args: Args) => R;

/**
 * Event listener type
 */
export type EventListener<T = unknown> = Callback<[T], void>;

// ==========================================
// CONDITIONAL TYPES
// ==========================================

/**
 * If T is never, return U, otherwise return T
 */
export type IfNever<T, U> = [T] extends [never] ? U : T;

/**
 * If T is any, return U, otherwise return T
 */
export type IfAny<T, U> = 0 extends 1 & T ? U : T;

/**
 * If T is unknown, return U, otherwise return T
 */
export type IfUnknown<T, U> = unknown extends T ? U : T;

/**
 * Check if two types are equal
 */
export type Equals<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

// ==========================================
// FUNCTION TYPES
// ==========================================

/**
 * Extract function parameters
 */
export type Parameters<T> = T extends (...args: infer P) => unknown ? P : never;

/**
 * Extract function return type
 */
export type ReturnType<T> = T extends (...args: readonly unknown[]) => infer R
  ? R
  : never;

/**
 * Extract constructor parameters
 */
export type ConstructorParameters<T> = T extends new (
  ...args: infer P
) => unknown
  ? P
  : never;

/**
 * Extract instance type from constructor
 */
export type InstanceType<T> = T extends new (
  ...args: readonly unknown[]
) => infer R
  ? R
  : never;

// ==========================================
// EXPORTS FOR EASIER IMPORTS
// ==========================================

// Note: These are built-in TypeScript utility types, no need to re-export
// Readonly, Partial, Required, Pick, Omit, Record, Exclude, Extract are globally available
