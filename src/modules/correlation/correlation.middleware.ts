import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Correlation ID Middleware
 *
 * Generates or propagates X-Correlation-ID header across requests for distributed tracing.
 * This enables tracking a single user request across multiple services and microservices.
 *
 * Features:
 * - Generates UUID v4 if no correlation ID is provided
 * - Propagates existing correlation ID from client
 * - Adds correlation ID to response headers
 * - Stores correlation ID in request object for downstream use
 * - Integrates with logging for request tracking
 *
 * Usage in logs:
 * - All logs within a request will include the correlation ID
 * - Use req.correlationId to access in controllers/services
 *
 * Downstream service propagation:
 * - Include X-Correlation-ID header when calling external APIs
 * - Example: axios.get(url, { headers: { 'X-Correlation-ID': req.correlationId } })
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CorrelationIdMiddleware.name);
  private readonly headerName = 'X-Correlation-ID';

  use(req: Request, res: Response, next: NextFunction): void {
    // Extract correlation ID from incoming request header or generate new one
    const correlationId = this.extractOrGenerateCorrelationId(req);

    // Store correlation ID in request object for easy access
    req['correlationId'] = correlationId;

    // Add correlation ID to response headers for client tracking
    res.setHeader(this.headerName, correlationId);

    // Log request with correlation ID
    this.logRequest(req, correlationId);

    // Override response.json to include correlation ID in logs
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      this.logResponse(req, res, correlationId);
      return originalJson(body);
    };

    next();
  }

  /**
   * Extract correlation ID from request header or generate a new one
   */
  private extractOrGenerateCorrelationId(req: Request): string {
    // Check for correlation ID in various header formats
    const headerValue =
      (req.headers[this.headerName.toLowerCase()] as string) ||
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      (req.headers['request-id'] as string);

    if (headerValue) {
      // Validate that the header is a valid UUID or reasonable string
      if (this.isValidCorrelationId(headerValue)) {
        return headerValue;
      }
      this.logger.warn(
        `Invalid correlation ID format received: ${headerValue}. Generating new one.`,
      );
    }

    // Generate new correlation ID using UUID v4
    return this.generateCorrelationId();
  }

  /**
   * Generate a new correlation ID using UUID v4
   */
  private generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Validate correlation ID format
   * Accepts UUID v4 or alphanumeric strings with hyphens/underscores (max 255 chars)
   */
  private isValidCorrelationId(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    // UUID v4 pattern
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(value)) {
      return true;
    }

    // Alphanumeric with hyphens/underscores (reasonable length)
    const alphanumericPattern = /^[a-zA-Z0-9_-]{1,255}$/;
    return alphanumericPattern.test(value);
  }

  /**
   * Log incoming request with correlation ID
   */
  private logRequest(req: Request, correlationId: string): void {
    const logData = {
      correlationId,
      method: req.method,
      path: req.path,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `[${correlationId}] Incoming request: ${req.method} ${req.path}`,
      JSON.stringify(logData),
    );
  }

  /**
   * Log outgoing response with correlation ID
   */
  private logResponse(
    req: Request,
    res: Response,
    correlationId: string,
  ): void {
    const logData = {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `[${correlationId}] Outgoing response: ${req.method} ${req.path} - ${res.statusCode}`,
      JSON.stringify(logData),
    );
  }
}

// Extend Express Request interface to include correlationId
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}
