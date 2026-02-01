import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
} from '@opentelemetry/sdk-trace-node';
import { trace, SpanStatusCode, Span, Tracer } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { CompositePropagator } from '@opentelemetry/core';

/**
 * OpenTelemetry Tracing Service
 *
 * Manages distributed tracing infrastructure using OpenTelemetry SDK.
 * Supports Jaeger exporter and automatic instrumentation of:
 * - HTTP/HTTPS requests (incoming and outgoing)
 * - PostgreSQL database queries
 * - Redis cache operations
 * - NestJS framework internals
 *
 * Configuration via environment variables:
 * - TRACING_ENABLED: Enable/disable tracing (default: true in non-production)
 * - JAEGER_ENDPOINT: Jaeger collector endpoint (default: http://localhost:4318/v1/traces)
 * - TRACING_SAMPLE_RATE: Sampling rate 0.0-1.0 (default: 1.0)
 * - TRACING_EXPORT_CONSOLE: Also export to console (default: false)
 */
@Injectable()
export class TracingService implements OnModuleInit {
  private readonly logger = new Logger(TracingService.name);
  private sdk: NodeSDK | null = null;
  private tracer: Tracer;
  private enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    // Determine if tracing is enabled
    this.enabled = this.configService.get<boolean>(
      'tracing.enabled',
      this.configService.get<string>('nodeEnv') !== 'production',
    );
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Distributed tracing is disabled');
      return;
    }

    try {
      await this.initializeTracing();
      this.logger.log('Distributed tracing initialized successfully');
    } catch (error) {
      this.logger.error(
        'Failed to initialize distributed tracing',
        error.stack,
      );
      // Don't throw - allow app to continue without tracing
    }
  }

  /**
   * Initialize OpenTelemetry SDK with Jaeger exporter
   */
  private async initializeTracing(): Promise<void> {
    const serviceName = this.configService.get<string>(
      'tracing.serviceName',
      'usdc-wallet-api',
    );
    const serviceVersion = this.configService.get<string>(
      'tracing.version',
      '1.0.0',
    );
    const jaegerEndpoint = this.configService.get<string>(
      'tracing.jaegerEndpoint',
      'http://localhost:4318/v1/traces',
    );
    const exportConsole = this.configService.get<boolean>(
      'tracing.exportConsole',
      false,
    );
    const environment = this.configService.get<string>(
      'nodeEnv',
      'development',
    );

    // Create resource with service metadata
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
      'deployment.environment': environment,
    });

    // Configure OTLP exporter for Jaeger
    const otlpExporter = new OTLPTraceExporter({
      url: jaegerEndpoint,
      headers: {},
      // Timeout for export requests (ms)
      timeoutMillis: 10000,
    });

    // Span processors
    const spanProcessors = [
      new BatchSpanProcessor(otlpExporter, {
        // Maximum queue size before forcing flush
        maxQueueSize: 2048,
        // Maximum batch size per export
        maxExportBatchSize: 512,
        // Delay before export (ms)
        scheduledDelayMillis: 5000,
        // Export timeout (ms)
        exportTimeoutMillis: 30000,
      }),
    ];

    // Add console exporter for debugging if enabled
    if (exportConsole) {
      spanProcessors.push(new BatchSpanProcessor(new ConsoleSpanExporter()));
    }

    // Initialize SDK with auto-instrumentation
    this.sdk = new NodeSDK({
      resource,
      spanProcessors,
      instrumentations: [
        getNodeAutoInstrumentations({
          // HTTP instrumentation options
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            ignoreIncomingRequestHook: (request) => {
              // Ignore health check and metrics endpoints
              const url = request.url || '';
              return url.includes('/health') || url.includes('/metrics');
            },
            // Capture request/response headers (be careful with sensitive data)
            headersToSpanAttributes: {
              client: {
                requestHeaders: ['x-request-id', 'user-agent'],
                responseHeaders: ['x-request-id'],
              },
              server: {
                requestHeaders: [
                  'x-request-id',
                  'user-agent',
                  'x-idempotency-key',
                ],
                responseHeaders: ['x-request-id'],
              },
            },
          },
          // PostgreSQL instrumentation
          '@opentelemetry/instrumentation-pg': {
            enabled: true,
            // Don't capture query parameters (may contain sensitive data)
            enhancedDatabaseReporting: false,
          },
          // Redis instrumentation
          '@opentelemetry/instrumentation-ioredis': {
            enabled: true,
            // Don't capture full command arguments
            dbStatementSerializer: (cmdName) => cmdName,
          },
          // Express instrumentation (NestJS uses Express under the hood)
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
          // Disable instrumentations we don't need
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
          '@opentelemetry/instrumentation-dns': {
            enabled: false,
          },
        }),
      ],
      // W3C Trace Context propagation (standard for distributed tracing)
      textMapPropagator: new CompositePropagator({
        propagators: [new W3CTraceContextPropagator()],
      }),
    });

    // Start the SDK
    await this.sdk.start();

    // Get tracer instance for custom spans
    this.tracer = trace.getTracer(serviceName, serviceVersion);

    this.logger.log(`Tracing initialized: ${serviceName} v${serviceVersion}`);
    this.logger.log(`Jaeger endpoint: ${jaegerEndpoint}`);
  }

  /**
   * Create a custom span for tracing a specific operation
   *
   * @param name Span name (e.g., "CreateTransferUseCase.execute")
   * @param fn Function to execute within the span
   * @param attributes Optional span attributes
   * @returns Result of the function
   *
   * @example
   * ```typescript
   * return this.tracingService.trace('ProcessPayment', async () => {
   *   // Your business logic here
   *   return paymentResult;
   * }, { 'user.id': userId, 'payment.amount': amount });
   * ```
   */
  async trace<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes?: Record<string, string | number | boolean>,
  ): Promise<T> {
    if (!this.enabled || !this.tracer) {
      // If tracing is disabled, just execute the function
      return fn(null);
    }

    return this.tracer.startActiveSpan(name, async (span) => {
      try {
        // Add custom attributes if provided
        if (attributes) {
          Object.entries(attributes).forEach(([key, value]) => {
            span.setAttribute(key, value);
          });
        }

        // Execute the function
        const result = await fn(span);

        // Mark span as successful
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        // Record error in span
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        throw error;
      } finally {
        // End the span
        span.end();
      }
    });
  }

  /**
   * Create a synchronous span for tracing
   *
   * @param name Span name
   * @param fn Function to execute
   * @param attributes Optional span attributes
   */
  traceSync<T>(
    name: string,
    fn: (span: Span) => T,
    attributes?: Record<string, string | number | boolean>,
  ): T {
    if (!this.enabled || !this.tracer) {
      return fn(null);
    }

    return this.tracer.startActiveSpan(name, (span) => {
      try {
        if (attributes) {
          Object.entries(attributes).forEach(([key, value]) => {
            span.setAttribute(key, value);
          });
        }

        const result = fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Get the current span context for propagation
   *
   * Useful for manual trace context propagation to external services
   */
  getCurrentSpanContext() {
    if (!this.enabled) return null;

    const span = trace.getActiveSpan();
    return span ? span.spanContext() : null;
  }

  /**
   * Add an event to the current active span
   *
   * @param name Event name
   * @param attributes Event attributes
   */
  addEvent(
    name: string,
    attributes?: Record<string, string | number | boolean>,
  ) {
    if (!this.enabled) return;

    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  /**
   * Add attributes to the current active span
   *
   * @param attributes Attributes to add
   */
  setAttributes(attributes: Record<string, string | number | boolean>) {
    if (!this.enabled) return;

    const span = trace.getActiveSpan();
    if (span) {
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });
    }
  }

  /**
   * Shutdown the tracing SDK gracefully
   * Call this on application shutdown to flush pending spans
   */
  async shutdown(): Promise<void> {
    if (this.sdk) {
      this.logger.log('Shutting down tracing SDK...');
      await this.sdk.shutdown();
      this.logger.log('Tracing SDK shutdown complete');
    }
  }
}
