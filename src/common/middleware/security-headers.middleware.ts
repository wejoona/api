import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

/**
 * Security Headers Middleware
 *
 * Adds additional security headers and provides route-specific header customization.
 * Works in conjunction with Helmet for comprehensive security header coverage.
 *
 * OWASP References:
 * - Secure Headers: https://owasp.org/www-project-secure-headers/
 * - HTTP Headers Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
 *
 * Target: A+ rating on securityheaders.com
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityHeadersMiddleware.name);
  private readonly isProduction: boolean;
  private readonly apiPrefix: string;

  constructor(private readonly configService: ConfigService) {
    this.isProduction =
      this.configService.get<string>('nodeEnv') === 'production';
    this.apiPrefix = this.configService.get<string>('apiPrefix') || 'api/v1';
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // ===================================================================
    // SECURITY HEADERS (Additional to Helmet)
    // ===================================================================

    // X-Request-ID: Track requests for debugging and audit trails
    // If client provides one, use it; otherwise generate one
    const requestId =
      (req.headers['x-request-id'] as string) || this.generateRequestId();
    res.setHeader('X-Request-ID', requestId);
    req.headers['x-request-id'] = requestId;

    // X-Robots-Tag: Prevent search engine indexing of API responses
    // Important for preventing API endpoint exposure in search results
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');

    // Clear-Site-Data: For logout/session termination routes
    if (this.isLogoutRoute(req)) {
      res.setHeader(
        'Clear-Site-Data',
        '"cache", "cookies", "storage", "executionContexts"',
      );
    }

    // Route-specific CSP for Swagger documentation
    if (this.isSwaggerRoute(req) && !this.isProduction) {
      this.applySwaggerCSP(res);
    }

    // API-specific headers
    if (this.isApiRoute(req)) {
      this.applyApiHeaders(res);
    }

    // Health check routes can have relaxed headers
    if (this.isHealthRoute(req)) {
      this.applyHealthCheckHeaders(res);
    }

    // Webhook routes need specific handling
    if (this.isWebhookRoute(req)) {
      this.applyWebhookHeaders(res);
    }

    // Log security events in production
    if (this.isProduction && this.isSuspiciousRequest(req)) {
      this.logger.warn(
        `Suspicious request detected: ${req.method} ${req.path}`,
        {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          requestId,
        },
      );
    }

    next();
  }

  /**
   * Generate a unique request ID for tracking
   */
  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `req_${timestamp}_${randomPart}`;
  }

  /**
   * Check if request is for logout route
   */
  private isLogoutRoute(req: Request): boolean {
    return (
      req.path.includes('/logout') ||
      req.path.includes('/signout') ||
      req.path.includes('/session/revoke')
    );
  }

  /**
   * Check if request is for Swagger documentation
   */
  private isSwaggerRoute(req: Request): boolean {
    return req.path.startsWith('/docs') || req.path.startsWith('/swagger');
  }

  /**
   * Check if request is for API endpoints
   */
  private isApiRoute(req: Request): boolean {
    return req.path.startsWith(`/${this.apiPrefix}`);
  }

  /**
   * Check if request is for health check endpoints
   */
  private isHealthRoute(req: Request): boolean {
    return (
      req.path.includes('/health') ||
      req.path.includes('/ready') ||
      req.path.includes('/live')
    );
  }

  /**
   * Check if request is for webhook endpoints
   */
  private isWebhookRoute(req: Request): boolean {
    return req.path.includes('/webhook');
  }

  /**
   * Apply relaxed CSP for Swagger UI
   * Only used in non-production environments
   */
  private applySwaggerCSP(res: Response): void {
    // Swagger needs inline scripts and styles
    // This is acceptable in development only
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https:",
        "font-src 'self' https://fonts.gstatic.com data:",
        "connect-src 'self'",
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    );
  }

  /**
   * Apply API-specific security headers
   */
  private applyApiHeaders(res: Response): void {
    // Prevent caching of API responses (sensitive data protection)
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    // API responses should be JSON only
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent this API from being embedded
    res.setHeader('X-Frame-Options', 'DENY');
  }

  /**
   * Apply headers for health check endpoints
   * Health checks need to be fast and cacheable by load balancers
   */
  private applyHealthCheckHeaders(res: Response): void {
    // Allow short caching for health checks
    res.setHeader('Cache-Control', 'public, max-age=10');
  }

  /**
   * Apply headers for webhook endpoints
   * Webhooks come from external services and need specific handling
   */
  private applyWebhookHeaders(res: Response): void {
    // Webhooks should not cache responses
    res.setHeader('Cache-Control', 'no-store');

    // Allow webhook providers to call this endpoint
    // Note: CORS is handled separately, this is for additional security
  }

  /**
   * Detect potentially suspicious requests
   * Log these for security monitoring
   */
  private isSuspiciousRequest(req: Request): boolean {
    const suspiciousPatterns = [
      // Common injection attempts
      /[\<\>\'\"\%\;\(\)\&\+]/,
      // Path traversal
      /\.\.\//,
      // Common vulnerability scanners
      /\.(php|asp|aspx|jsp|cgi|env|git|svn)/i,
      // SQL injection keywords
      /(\bUNION\b|\bSELECT\b|\bDROP\b|\bINSERT\b|\bDELETE\b|\bUPDATE\b)/i,
      // Script injection
      /<script/i,
    ];

    const path = req.path;
    const query = JSON.stringify(req.query);

    return suspiciousPatterns.some(
      (pattern) => pattern.test(path) || pattern.test(query),
    );
  }
}

/**
 * Factory function for creating SecurityHeadersMiddleware
 * Used for module configuration
 */
export const SecurityHeadersMiddlewareFactory = {
  provide: SecurityHeadersMiddleware,
  useClass: SecurityHeadersMiddleware,
};
