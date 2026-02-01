/**
 * Request Context Interface
 *
 * Defines the shape of request-scoped context data available throughout
 * the application lifecycle using AsyncLocalStorage.
 */

export interface RequestUser {
  id: string;
  sub?: string;
  email?: string;
  role?: string;
  permissions?: readonly string[];
  deviceId?: string;
  sessionId?: string;
}

export interface RequestDevice {
  id?: string;
  fingerprint?: string;
  platform?: string;
  osVersion?: string;
  appVersion?: string;
  isRooted?: boolean;
  isTrusted?: boolean;
}

export interface RequestMetadata {
  ip: string;
  userAgent: string;
  origin?: string;
  referer?: string;
  acceptLanguage?: string;
  country?: string;
  region?: string;
}

export interface RequestContext {
  /**
   * Unique identifier for this request (correlation ID)
   */
  correlationId: string;

  /**
   * Request ID (same as correlation ID or from header)
   */
  requestId: string;

  /**
   * Timestamp when request started
   */
  timestamp: Date;

  /**
   * HTTP method (GET, POST, etc.)
   */
  method: string;

  /**
   * Request path
   */
  path: string;

  /**
   * Full URL
   */
  url: string;

  /**
   * Authenticated user information (if authenticated)
   */
  user?: RequestUser;

  /**
   * Device information (if provided)
   */
  device?: RequestDevice;

  /**
   * Request metadata (IP, user agent, etc.)
   */
  metadata: RequestMetadata;

  /**
   * Additional custom context (extensible)
   */
  custom?: Record<string, unknown>;
}

/**
 * Partial context for updates
 */
export type PartialRequestContext = Partial<RequestContext>;

/**
 * Context store type for AsyncLocalStorage
 */
export type RequestContextStore = RequestContext | undefined;
