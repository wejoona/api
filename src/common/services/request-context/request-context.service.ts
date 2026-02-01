import { Injectable, Logger, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import {
  RequestContext,
  PartialRequestContext,
  RequestContextStore,
} from './request-context.interface';

/**
 * Request Context Service
 *
 * Provides access to request-scoped context throughout the application
 * using Node.js AsyncLocalStorage. This allows any service, deep in the
 * call stack, to access request information without explicit parameter passing.
 *
 * Features:
 * - Access current user, device, IP, correlation ID anywhere
 * - Thread-safe (async-safe) context isolation
 * - No dependency injection needed in deep layers
 * - Automatic cleanup after request completes
 *
 * Usage:
 * ```typescript
 * // In a service
 * constructor(private readonly requestContext: RequestContextService) {}
 *
 * someMethod() {
 *   const userId = this.requestContext.getUserId();
 *   const ip = this.requestContext.getIp();
 *   const correlationId = this.requestContext.getCorrelationId();
 * }
 * ```
 *
 * Note: Context must be initialized by middleware/interceptor at request start
 */
@Injectable({ scope: Scope.DEFAULT })
export class RequestContextService {
  private readonly logger = new Logger(RequestContextService.name);
  private readonly asyncLocalStorage =
    new AsyncLocalStorage<RequestContextStore>();

  /**
   * Run a function with request context
   * This should be called by middleware/interceptor at request start
   */
  run<T>(context: RequestContext, callback: () => T): T {
    return this.asyncLocalStorage.run(context, callback);
  }

  /**
   * Get the current request context
   * Returns undefined if not in a request context
   */
  getContext(): RequestContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Get the current request context or throw error
   * Use this when context is required
   */
  getContextOrThrow(): RequestContext {
    const context = this.getContext();
    if (!context) {
      throw new Error(
        'Request context not found. Ensure RequestContextMiddleware is applied.',
      );
    }
    return context;
  }

  /**
   * Update the current context with partial data
   * Useful for adding user info after authentication
   */
  updateContext(partial: PartialRequestContext): void {
    const context = this.getContext();
    if (!context) {
      this.logger.warn('Attempted to update context outside of request scope');
      return;
    }

    Object.assign(context, partial);
  }

  /**
   * Set custom context data
   */
  setCustom(key: string, value: unknown): void {
    const context = this.getContext();
    if (!context) {
      this.logger.warn('Attempted to set custom data outside of request scope');
      return;
    }

    if (!context.custom) {
      context.custom = {};
    }

    context.custom[key] = value;
  }

  /**
   * Get custom context data
   */
  getCustom<T = unknown>(key: string): T | undefined {
    const context = this.getContext();
    return context?.custom?.[key] as T | undefined;
  }

  // ===================================================================
  // Convenience Getters
  // ===================================================================

  /**
   * Get correlation ID for request tracing
   * Always available (generated if not provided)
   */
  getCorrelationId(): string {
    return this.getContext()?.correlationId || 'unknown';
  }

  /**
   * Get request ID (same as correlation ID)
   */
  getRequestId(): string {
    return this.getContext()?.requestId || 'unknown';
  }

  /**
   * Get request timestamp
   */
  getTimestamp(): Date | undefined {
    return this.getContext()?.timestamp;
  }

  /**
   * Get HTTP method
   */
  getMethod(): string | undefined {
    return this.getContext()?.method;
  }

  /**
   * Get request path
   */
  getPath(): string | undefined {
    return this.getContext()?.path;
  }

  /**
   * Get full URL
   */
  getUrl(): string | undefined {
    return this.getContext()?.url;
  }

  /**
   * Get authenticated user (undefined if not authenticated)
   */
  getUser() {
    return this.getContext()?.user;
  }

  /**
   * Get user ID (undefined if not authenticated)
   */
  getUserId(): string | undefined {
    return this.getContext()?.user?.id;
  }

  /**
   * Get user email (undefined if not authenticated)
   */
  getUserEmail(): string | undefined {
    return this.getContext()?.user?.email;
  }

  /**
   * Get user role (undefined if not authenticated)
   */
  getUserRole(): string | undefined {
    return this.getContext()?.user?.role;
  }

  /**
   * Get user permissions (empty array if not authenticated)
   */
  getUserPermissions(): readonly string[] {
    return this.getContext()?.user?.permissions || [];
  }

  /**
   * Get device ID
   */
  getDeviceId(): string | undefined {
    return this.getContext()?.device?.id || this.getContext()?.user?.deviceId;
  }

  /**
   * Get session ID
   */
  getSessionId(): string | undefined {
    return this.getContext()?.user?.sessionId;
  }

  /**
   * Get device information
   */
  getDevice() {
    return this.getContext()?.device;
  }

  /**
   * Get device fingerprint
   */
  getDeviceFingerprint(): string | undefined {
    return this.getContext()?.device?.fingerprint;
  }

  /**
   * Check if device is trusted
   */
  isDeviceTrusted(): boolean {
    return this.getContext()?.device?.isTrusted ?? false;
  }

  /**
   * Check if device is rooted/jailbroken
   */
  isDeviceRooted(): boolean {
    return this.getContext()?.device?.isRooted ?? false;
  }

  /**
   * Get client IP address
   */
  getIp(): string {
    return this.getContext()?.metadata?.ip || 'unknown';
  }

  /**
   * Get user agent
   */
  getUserAgent(): string {
    return this.getContext()?.metadata?.userAgent || 'unknown';
  }

  /**
   * Get origin header
   */
  getOrigin(): string | undefined {
    return this.getContext()?.metadata?.origin;
  }

  /**
   * Get referer header
   */
  getReferer(): string | undefined {
    return this.getContext()?.metadata?.referer;
  }

  /**
   * Get accept-language header
   */
  getAcceptLanguage(): string | undefined {
    return this.getContext()?.metadata?.acceptLanguage;
  }

  /**
   * Get country (from GeoIP or header)
   */
  getCountry(): string | undefined {
    return this.getContext()?.metadata?.country;
  }

  /**
   * Get region (from GeoIP or header)
   */
  getRegion(): string | undefined {
    return this.getContext()?.metadata?.region;
  }

  // ===================================================================
  // Utility Methods
  // ===================================================================

  /**
   * Check if we're currently in a request context
   */
  hasContext(): boolean {
    return this.getContext() !== undefined;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getContext()?.user !== undefined;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.getContext()?.user?.role === role;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const permissions = this.getUserPermissions();
    return permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    const userPermissions = this.getUserPermissions();
    return permissions.some((p) => userPermissions.includes(p));
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    const userPermissions = this.getUserPermissions();
    return permissions.every((p) => userPermissions.includes(p));
  }

  /**
   * Get request duration in milliseconds
   */
  getRequestDuration(): number {
    const timestamp = this.getTimestamp();
    if (!timestamp) return 0;
    return Date.now() - timestamp.getTime();
  }

  /**
   * Create a log context object for structured logging
   * Useful for adding request context to all logs
   */
  getLogContext(): Record<string, unknown> {
    const context = this.getContext();
    if (!context) return {};

    return {
      correlationId: context.correlationId,
      userId: context.user?.id,
      deviceId: this.getDeviceId(),
      sessionId: this.getSessionId(),
      ip: context.metadata.ip,
      path: context.path,
      method: context.method,
    };
  }

  /**
   * Create an audit context for audit logs
   */
  getAuditContext(): Record<string, unknown> {
    const context = this.getContext();
    if (!context) return {};

    return {
      correlationId: context.correlationId,
      timestamp: context.timestamp.toISOString(),
      userId: context.user?.id,
      userEmail: context.user?.email,
      deviceId: this.getDeviceId(),
      deviceFingerprint: this.getDeviceFingerprint(),
      sessionId: this.getSessionId(),
      ip: context.metadata.ip,
      userAgent: context.metadata.userAgent,
      country: context.metadata.country,
      path: context.path,
      method: context.method,
    };
  }
}
