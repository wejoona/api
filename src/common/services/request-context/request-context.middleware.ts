import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContextService } from './request-context.service';
import { RequestContext } from './request-context.interface';

/**
 * Extended request interface with user and device info
 */
interface RequestWithContext extends Request {
  user?: {
    id?: string;
    sub?: string;
    email?: string;
    role?: string;
    permissions?: readonly string[];
    deviceId?: string;
    sessionId?: string;
  };
  device?: {
    id?: string;
    fingerprint?: string;
    platform?: string;
    osVersion?: string;
    appVersion?: string;
    isRooted?: boolean;
    isTrusted?: boolean;
  };
}

/**
 * Request Context Middleware
 *
 * Initializes request context at the start of each request.
 * This middleware should be applied globally and run early in the middleware chain.
 *
 * It extracts:
 * - Correlation ID (from header or generated)
 * - Client IP (handles proxies)
 * - User agent
 * - Request metadata
 * - User info (if authenticated - populated by guards later)
 * - Device info (if provided)
 *
 * The context is stored in AsyncLocalStorage and accessible throughout
 * the request lifecycle via RequestContextService.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly _logger = new Logger(RequestContextMiddleware.name);

  constructor(private readonly requestContextService: RequestContextService) {}

  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    // Generate or use existing correlation ID
    const correlationId = this.getCorrelationId(req);

    // Build initial context
    const context: RequestContext = {
      correlationId,
      requestId: correlationId,
      timestamp: new Date(),
      method: req.method,
      path: req.path,
      url: req.url,
      metadata: {
        ip: this.getClientIp(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        origin: req.headers['origin'],
        referer: req.headers['referer'],
        acceptLanguage: req.headers['accept-language'],
        // GeoIP data would be populated here if available
        // country: req.geoip?.country,
        // region: req.geoip?.region,
      },
    };

    // Add user info if available (might be populated by auth guard later)
    if (req.user) {
      context.user = {
        id: req.user.id || req.user.sub,
        sub: req.user.sub,
        email: req.user.email,
        role: req.user.role,
        permissions: req.user.permissions,
        deviceId: req.user.deviceId,
        sessionId: req.user.sessionId,
      };
    }

    // Add device info if available
    if (req.device) {
      context.device = {
        id: req.device.id,
        fingerprint: req.device.fingerprint,
        platform: req.device.platform,
        osVersion: req.device.osVersion,
        appVersion: req.device.appVersion,
        isRooted: req.device.isRooted,
        isTrusted: req.device.isTrusted,
      };
    }

    // Set correlation ID header for response
    res.setHeader('X-Correlation-ID', correlationId);
    res.setHeader('X-Request-ID', correlationId);

    // Run the rest of the request in this context
    this.requestContextService.run(context, () => {
      next();
    });
  }

  /**
   * Get or generate correlation ID for request tracing
   */
  private getCorrelationId(req: Request): string {
    return (
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      uuidv4()
    );
  }

  /**
   * Get client IP address, handling proxies
   */
  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'] as string;
    if (forwardedFor) {
      // X-Forwarded-For can be a comma-separated list
      // The first IP is the original client
      return forwardedFor.split(',')[0].trim();
    }

    return (
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }
}
