import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * Correlation ID Interceptor
 *
 * Intercepts all HTTP requests and responses to:
 * - Log execution time with correlation ID
 * - Log errors with correlation ID
 * - Ensure correlation ID is available in exception context
 *
 * This works in conjunction with CorrelationIdMiddleware to provide
 * comprehensive request tracking throughout the application lifecycle.
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CorrelationIdInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const correlationId = request.correlationId || 'unknown';
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const executionTime = Date.now() - startTime;
        this.logger.log(
          `[${correlationId}] Request completed in ${executionTime}ms`,
          JSON.stringify({
            correlationId,
            executionTime: `${executionTime}ms`,
            method: request.method,
            path: request.path,
          }),
        );
      }),
      catchError((error) => {
        const executionTime = Date.now() - startTime;
        this.logger.error(
          `[${correlationId}] Request failed after ${executionTime}ms: ${error.message}`,
          JSON.stringify({
            correlationId,
            executionTime: `${executionTime}ms`,
            method: request.method,
            path: request.path,
            error: error.message,
            stack: error.stack,
          }),
        );

        // Add correlation ID to error object for exception filters
        error.correlationId = correlationId;

        return throwError(() => error);
      }),
    );
  }
}
