import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../../modules/metrics/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    const method = request.method;

    // Normalize path to avoid cardinality explosion
    const path = this.normalizePath(request.route?.path || request.url);

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.metricsService.recordHttpRequest(
            method,
            path,
            statusCode,
            duration,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.metricsService.recordHttpRequest(
            method,
            path,
            statusCode,
            duration,
          );
        },
      }),
    );
  }

  /**
   * Normalize path to avoid high cardinality in metrics
   * Replaces dynamic segments with placeholders
   */
  private normalizePath(path: string): string {
    return path
      .replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '/:id',
      ) // UUIDs
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\/0x[a-fA-F0-9]{40}/g, '/:address') // Ethereum addresses
      .replace(/\?.*$/, ''); // Remove query strings
  }
}
