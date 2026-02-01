import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TracingService } from './tracing.service';
import { propagation, context } from '@opentelemetry/api';

/**
 * HTTP Client Wrapper with Trace Context Propagation
 *
 * Wraps the NestJS HttpService to automatically inject W3C Trace Context headers
 * into outgoing HTTP requests, enabling distributed tracing across services.
 *
 * Injects headers:
 * - traceparent: W3C trace context (trace ID, parent span ID, trace flags)
 * - tracestate: Vendor-specific trace state
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class PaymentService {
 *   constructor(private readonly httpClient: TracedHttpClient) {}
 *
 *   async processPayment(data: any) {
 *     // Trace context is automatically propagated to external service
 *     const response = await this.httpClient.post(
 *       'https://payment-provider.com/api/charge',
 *       data
 *     ).toPromise();
 *     return response.data;
 *   }
 * }
 * ```
 */
@Injectable()
export class TracedHttpClient {
  private readonly _logger = new Logger(TracedHttpClient.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly tracingService: TracingService,
  ) {}

  /**
   * Perform GET request with trace context propagation
   */
  get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return this.request<T>('GET', url, { ...config });
  }

  /**
   * Perform POST request with trace context propagation
   */
  post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return this.request<T>('POST', url, { ...config, data });
  }

  /**
   * Perform PUT request with trace context propagation
   */
  put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return this.request<T>('PUT', url, { ...config, data });
  }

  /**
   * Perform PATCH request with trace context propagation
   */
  patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return this.request<T>('PATCH', url, { ...config, data });
  }

  /**
   * Perform DELETE request with trace context propagation
   */
  delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return this.request<T>('DELETE', url, { ...config });
  }

  /**
   * Generic request method with automatic trace context injection
   */
  private request<T = any>(
    method: string,
    url: string,
    config: AxiosRequestConfig = {},
  ): Observable<AxiosResponse<T>> {
    // Create a new span for the outgoing HTTP request
    return from(
      this.tracingService.trace(
        `http.client.${method.toLowerCase()}`,
        async (span) => {
          // Add span attributes
          span?.setAttribute('http.method', method);
          span?.setAttribute('http.url', url);
          span?.setAttribute('http.target', new URL(url).pathname);

          // Inject trace context into headers
          const headers = this.injectTraceContext(config.headers || {});

          // Update config with trace headers
          const finalConfig: AxiosRequestConfig = {
            ...config,
            method,
            url,
            headers,
          };

          // Execute the request
          const startTime = Date.now();

          try {
            let response: AxiosResponse<T>;

            switch (method.toUpperCase()) {
              case 'GET':
                response = await this.httpService.axiosRef.get<T>(
                  url,
                  finalConfig,
                );
                break;
              case 'POST':
                response = await this.httpService.axiosRef.post<T>(
                  url,
                  config.data,
                  finalConfig,
                );
                break;
              case 'PUT':
                response = await this.httpService.axiosRef.put<T>(
                  url,
                  config.data,
                  finalConfig,
                );
                break;
              case 'PATCH':
                response = await this.httpService.axiosRef.patch<T>(
                  url,
                  config.data,
                  finalConfig,
                );
                break;
              case 'DELETE':
                response = await this.httpService.axiosRef.delete<T>(
                  url,
                  finalConfig,
                );
                break;
              default:
                throw new Error(`Unsupported HTTP method: ${method}`);
            }

            const duration = Date.now() - startTime;

            // Record response metadata
            span?.setAttribute('http.status_code', response.status);
            span?.setAttribute('http.response_time_ms', duration);
            span?.addEvent('http.response', {
              status_code: response.status,
              duration_ms: duration,
            });

            return response;
          } catch (error) {
            const duration = Date.now() - startTime;

            // Record error metadata
            span?.setAttribute('http.response_time_ms', duration);
            span?.setAttribute('error', true);

            if (error.response) {
              // HTTP error response
              span?.setAttribute('http.status_code', error.response.status);
              span?.addEvent('http.error', {
                status_code: error.response.status,
                duration_ms: duration,
              });
            } else if (error.code) {
              // Network error
              span?.setAttribute('error.code', error.code);
              span?.addEvent('http.network_error', {
                error_code: error.code,
                duration_ms: duration,
              });
            }

            throw error;
          }
        },
      ),
    ).pipe(
      // Convert Promise to Observable for consistency with HttpService API
      switchMap((response) => from([response])),
    );
  }

  /**
   * Inject W3C Trace Context headers into request
   *
   * Uses OpenTelemetry propagation API to inject trace context
   * into the carrier (HTTP headers)
   */
  private injectTraceContext(
    headers: Record<string, any>,
  ): Record<string, any> {
    const carrier: Record<string, string> = { ...headers };

    // Inject trace context using W3C Trace Context propagator
    propagation.inject(context.active(), carrier);

    return carrier;
  }

  /**
   * Extract trace context from incoming request headers
   *
   * Useful for manual trace context extraction
   */
  static extractTraceContext(headers: Record<string, any>): void {
    const extractedContext = propagation.extract(context.active(), headers);
    context.with(extractedContext, () => {
      // Context is now available for child spans
    });
  }
}
