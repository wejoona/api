import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from '@/modules/metrics/metrics.service';

interface RequestWithTimestamp extends Request {
  _startTime?: number;
  _queryCount?: number;
}

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('PerformanceInterceptor');
  private readonly slowRequestThreshold = 1000; // 1 second

  // Track percentile data in memory (last 1000 requests per endpoint)
  private readonly latencyData = new Map<string, number[]>();
  private readonly maxSamplesPerEndpoint = 1000;

  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithTimestamp>();
    const response = context.switchToHttp().getResponse<Response>();

    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    // Store start time for other middleware/interceptors to use
    request._startTime = startTime;
    request._queryCount = 0; // Will be incremented by database profiler

    const { method, url, ip } = request;
    const endpoint = this.normalizeEndpoint(url);

    return next.handle().pipe(
      tap({
        next: () => {
          this.recordMetrics(
            request,
            response,
            startTime,
            startMemory,
            method,
            endpoint,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            JSON.stringify({
              type: 'request_error',
              method,
              endpoint,
              statusCode: response.statusCode || 500,
              duration: `${duration}ms`,
              error: error.message,
              stack: error.stack,
              ip,
            }),
          );

          // Record error metrics
          this.metricsService.recordHttpRequest(
            method,
            endpoint,
            response.statusCode || 500,
            duration,
          );
        },
      }),
    );
  }

  private recordMetrics(
    request: RequestWithTimestamp,
    response: Response,
    startTime: number,
    startMemory: NodeJS.MemoryUsage,
    method: string,
    endpoint: string,
  ): void {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
    const statusCode = response.statusCode;

    // Record Prometheus metrics
    this.metricsService.recordHttpRequest(method, endpoint, statusCode, duration);

    // Track latency percentiles
    this.recordLatencyPercentile(endpoint, duration);

    // Log slow requests
    if (duration > this.slowRequestThreshold) {
      const percentiles = this.calculatePercentiles(endpoint);

      this.logger.warn(
        JSON.stringify({
          type: 'slow_request',
          method,
          endpoint,
          duration: `${duration}ms`,
          threshold: `${this.slowRequestThreshold}ms`,
          statusCode,
          queryCount: request._queryCount || 0,
          memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
          heapUsed: `${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          percentiles: {
            p50: `${percentiles.p50}ms`,
            p95: `${percentiles.p95}ms`,
            p99: `${percentiles.p99}ms`,
          },
          userAgent: request.headers['user-agent'],
          ip: request.ip,
          recommendation: this.getOptimizationRecommendation(
            duration,
            request._queryCount || 0,
            memoryDelta,
          ),
        }),
      );
    }

    // Log normal requests in development
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(
        JSON.stringify({
          type: 'request',
          method,
          endpoint,
          duration: `${duration}ms`,
          statusCode,
          queryCount: request._queryCount || 0,
          memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
        }),
      );
    }

    // Update heap metrics periodically
    if (Math.random() < 0.01) {
      // 1% of requests
      this.metricsService.updateHeapMetrics();
    }
  }

  private normalizeEndpoint(url: string): string {
    // Remove query parameters
    const baseUrl = url.split('?')[0];

    // Replace UUIDs, numeric IDs, and other dynamic segments
    return baseUrl
      .replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '/:id',
      )
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9]{24}/g, '/:id'); // MongoDB ObjectId
  }

  private recordLatencyPercentile(endpoint: string, duration: number): void {
    if (!this.latencyData.has(endpoint)) {
      this.latencyData.set(endpoint, []);
    }

    const samples = this.latencyData.get(endpoint)!;
    samples.push(duration);

    // Keep only last N samples
    if (samples.length > this.maxSamplesPerEndpoint) {
      samples.shift();
    }
  }

  private calculatePercentiles(endpoint: string): {
    p50: number;
    p95: number;
    p99: number;
  } {
    const samples = this.latencyData.get(endpoint) || [];
    if (samples.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      p50: Math.round(sorted[p50Index] || 0),
      p95: Math.round(sorted[p95Index] || 0),
      p99: Math.round(sorted[p99Index] || 0),
    };
  }

  public getEndpointStats(): Array<{
    endpoint: string;
    sampleCount: number;
    p50: number;
    p95: number;
    p99: number;
  }> {
    const stats: Array<{
      endpoint: string;
      sampleCount: number;
      p50: number;
      p95: number;
      p99: number;
    }> = [];

    for (const [endpoint, samples] of this.latencyData.entries()) {
      const percentiles = this.calculatePercentiles(endpoint);
      stats.push({
        endpoint,
        sampleCount: samples.length,
        ...percentiles,
      });
    }

    // Sort by p99 (slowest endpoints first)
    return stats.sort((a, b) => b.p99 - a.p99);
  }

  private getOptimizationRecommendation(
    duration: number,
    queryCount: number,
    memoryDelta: number,
  ): string[] {
    const recommendations: string[] = [];

    if (duration > 5000) {
      recommendations.push('CRITICAL: Request took >5s - investigate immediately');
    } else if (duration > 2000) {
      recommendations.push('WARNING: Request took >2s - optimization needed');
    }

    if (queryCount > 10) {
      recommendations.push(
        `High query count (${queryCount}) - possible N+1 problem, consider eager loading`,
      );
    }

    if (queryCount > 5 && duration > 1000) {
      recommendations.push('Add database indexes or use query optimization');
    }

    if (memoryDelta > 50 * 1024 * 1024) {
      // >50MB
      recommendations.push(
        `High memory allocation (${(memoryDelta / 1024 / 1024).toFixed(2)}MB) - check for memory leaks`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Review application logic and consider caching');
    }

    return recommendations;
  }
}
