import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { TracingService } from './tracing.service';
import { Request, Response } from 'express';

/**
 * Tracing Interceptor for NestJS
 *
 * Automatically creates spans for incoming HTTP requests and enriches them with:
 * - HTTP method, URL, status code
 * - Request ID from header
 * - User ID (if authenticated)
 * - Response time
 * - Error details (if any)
 *
 * This interceptor works in conjunction with OpenTelemetry's auto-instrumentation
 * to provide additional context and ensure trace propagation.
 */
@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private readonly _logger = new Logger(TracingInterceptor.name);

  constructor(private readonly tracingService: TracingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Only handle HTTP requests
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const startTime = Date.now();

    // Extract request metadata
    const method = request.method;
    const url = request.url;
    const requestId = request.headers['x-request-id'] as string;
    const userAgent = request.headers['user-agent'];
    const controller = context.getClass().name;
    const handler = context.getHandler().name;

    // Add attributes to the current span (created by auto-instrumentation)
    this.tracingService.setAttributes({
      'http.method': method,
      'http.url': url,
      'http.route': `${controller}.${handler}`,
      'http.user_agent': userAgent || 'unknown',
    });

    if (requestId) {
      this.tracingService.setAttributes({ 'request.id': requestId });
    }

    // Extract user ID if authenticated (assuming it's in request.user)
    const user = (request as any).user;
    if (user?.id) {
      this.tracingService.setAttributes({ 'user.id': user.id });
    }

    // Add idempotency key if present
    const idempotencyKey = request.headers['x-idempotency-key'] as string;
    if (idempotencyKey) {
      this.tracingService.setAttributes({ 'idempotency.key': idempotencyKey });
    }

    // Add event for request start
    this.tracingService.addEvent('http.request.start', {
      method,
      url,
    });

    return next.handle().pipe(
      tap(() => {
        // Success - record response metadata
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        this.tracingService.setAttributes({
          'http.status_code': statusCode,
          'http.response_time_ms': duration,
        });

        this.tracingService.addEvent('http.request.complete', {
          status_code: statusCode,
          duration_ms: duration,
        });
      }),
      catchError((error) => {
        // Error - record error metadata
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        this.tracingService.setAttributes({
          'http.status_code': statusCode,
          'http.response_time_ms': duration,
          error: true,
          'error.type': error.constructor.name,
          'error.message': error.message,
        });

        this.tracingService.addEvent('http.request.error', {
          status_code: statusCode,
          duration_ms: duration,
          error_type: error.constructor.name,
          error_message: error.message,
        });

        // Re-throw the error to let NestJS handle it
        throw error;
      }),
    );
  }
}
