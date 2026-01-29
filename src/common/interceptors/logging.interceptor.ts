import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';

// Extended request interface with correlation ID and user
interface RequestWithUser extends Request {
  requestId?: string;
  user?: {
    id?: string;
    sub?: string;
    email?: string;
    [key: string]: any;
  };
}

/**
 * HTTP Request/Response Logging Interceptor
 *
 * Features:
 * - Structured JSON logging with correlation IDs
 * - Request/response tracking with duration metrics
 * - Automatic sensitive data sanitization
 * - Environment-based log levels (dev vs prod)
 * - User tracking and IP logging
 * - Performance monitoring
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly isDevelopment = process.env.NODE_ENV === 'development';

  // Sensitive fields to sanitize in logs
  private readonly sensitiveFields = [
    'password',
    'pin',
    'pinHash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'authorization',
    'cookie',
    'x-api-key',
    'x-circle-api-key',
    'privateKey',
    'mnemonic',
    'seed',
    'otp',
    'otpCode',
    'verificationCode',
    'cvv',
    'cardNumber',
    'accountNumber',
    'iban',
    'ssn',
    'taxId',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();

    // Generate or use existing correlation ID for request tracing
    const correlationId = this.getCorrelationId(request);
    request.requestId = correlationId;
    response.setHeader('X-Request-ID', correlationId);
    response.setHeader('X-Correlation-ID', correlationId);

    const startTime = Date.now();
    const requestLog = this.buildRequestLog(request, correlationId);

    // Log incoming request (debug level in prod, log level in dev)
    if (this.isDevelopment) {
      this.logger.log(JSON.stringify(requestLog));
    } else {
      this.logger.debug(JSON.stringify(requestLog));
    }

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const responseLog = this.buildResponseLog(
          request,
          response,
          correlationId,
          duration,
          data,
        );

        // Log successful response
        this.logResponse(responseLog, duration);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const errorLog = this.buildErrorLog(
          request,
          correlationId,
          duration,
          error,
        );

        // Always log errors
        this.logger.error(JSON.stringify(errorLog));

        return throwError(() => error);
      }),
    );
  }

  /**
   * Get or generate correlation ID for request tracing
   */
  private getCorrelationId(request: Request): string {
    return (
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      uuidv4()
    );
  }

  /**
   * Build structured request log
   */
  private buildRequestLog(
    request: RequestWithUser,
    correlationId: string,
  ): object {
    const { method, url, headers, body, query, user } = request;

    const baseLog = {
      type: 'http_request',
      correlationId,
      timestamp: new Date().toISOString(),
      method,
      url: this.sanitizeUrl(url),
      path: request.path,
      ip: this.getClientIp(request),
      userAgent: headers['user-agent'] || 'unknown',
      userId: user?.id || user?.sub || null,
      userEmail: this.isDevelopment ? user?.email : null,
    };

    // In development, log more details
    if (this.isDevelopment) {
      return {
        ...baseLog,
        headers: this.sanitizeObject(headers),
        query: this.sanitizeObject(query),
        body: this.sanitizeObject(body),
        hasBody: !!body && Object.keys(body).length > 0,
      };
    }

    // In production, minimal logging
    return {
      ...baseLog,
      queryParams:
        Object.keys(query || {}).length > 0 ? Object.keys(query) : [],
      bodyFields: body && typeof body === 'object' ? Object.keys(body) : [],
      contentType: headers['content-type'],
    };
  }

  /**
   * Build structured response log
   */
  private buildResponseLog(
    request: RequestWithUser,
    response: Response,
    correlationId: string,
    duration: number,
    data: any,
  ): object {
    const { method, url, user } = request;
    const { statusCode } = response;

    const baseLog = {
      type: 'http_response',
      correlationId,
      timestamp: new Date().toISOString(),
      method,
      url: this.sanitizeUrl(url),
      statusCode,
      duration,
      durationMs: `${duration}ms`,
      userId: user?.id || user?.sub || null,
    };

    // In development, log response details
    if (this.isDevelopment) {
      return {
        ...baseLog,
        hasData: !!data,
        dataType: data ? typeof data : null,
        responseSize: data ? JSON.stringify(data).length : 0,
      };
    }

    // In production, minimal logging
    return baseLog;
  }

  /**
   * Build structured error log
   */
  private buildErrorLog(
    request: RequestWithUser,
    correlationId: string,
    duration: number,
    error: any,
  ): object {
    const { method, url, user } = request;

    const baseLog = {
      type: 'http_error',
      correlationId,
      timestamp: new Date().toISOString(),
      method,
      url: this.sanitizeUrl(url),
      statusCode: error.status || error.statusCode || 500,
      duration,
      durationMs: `${duration}ms`,
      userId: user?.id || user?.sub || null,
      error: {
        name: error.name || 'Error',
        message: error.message || 'Unknown error',
        code: error.code,
      },
    };

    // In development, include stack trace
    if (this.isDevelopment) {
      return {
        ...baseLog,
        error: {
          ...baseLog.error,
          stack: error.stack,
          details: error.response,
        },
      };
    }

    return baseLog;
  }

  /**
   * Log response with appropriate level based on duration and status
   */
  private logResponse(responseLog: any, duration: number): void {
    const { statusCode } = responseLog;

    // Slow request warning (>1000ms)
    if (duration > 1000) {
      this.logger.warn(
        JSON.stringify({
          ...responseLog,
          type: 'http_slow_response',
          warning: 'Request exceeded 1000ms threshold',
        }),
      );
      return;
    }

    // Client errors (4xx)
    if (statusCode >= 400 && statusCode < 500) {
      this.logger.warn(JSON.stringify(responseLog));
      return;
    }

    // Server errors (5xx) - should not happen in normal flow
    if (statusCode >= 500) {
      this.logger.error(JSON.stringify(responseLog));
      return;
    }

    // Success responses
    if (this.isDevelopment) {
      this.logger.log(JSON.stringify(responseLog));
    } else {
      this.logger.debug(JSON.stringify(responseLog));
    }
  }

  /**
   * Sanitize URL by removing sensitive query parameters
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url, 'http://localhost');
      const sensitiveParams = ['token', 'key', 'secret', 'password', 'pin'];

      sensitiveParams.forEach((param) => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      });

      return urlObj.pathname + urlObj.search;
    } catch {
      return url;
    }
  }

  /**
   * Recursively sanitize object by redacting sensitive fields
   */
  private sanitizeObject(obj: any): any {
    if (!obj) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if field is sensitive
      if (this.isSensitiveField(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Check if field name is sensitive
   */
  private isSensitiveField(fieldName: string): boolean {
    return this.sensitiveFields.some((sensitive) =>
      fieldName.includes(sensitive.toLowerCase()),
    );
  }

  /**
   * Get client IP address (handle proxies)
   */
  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.ip ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}
