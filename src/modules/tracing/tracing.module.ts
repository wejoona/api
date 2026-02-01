import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TracingService } from './tracing.service';
import { TracingInterceptor } from './tracing.interceptor';

/**
 * Distributed Tracing Module with OpenTelemetry
 *
 * Provides distributed tracing capabilities using OpenTelemetry with Jaeger exporter.
 * Automatically instruments HTTP requests, database queries, and custom operations.
 *
 * Features:
 * - Automatic HTTP request tracing with W3C Trace Context propagation
 * - Database query instrumentation (PostgreSQL, Redis)
 * - Custom span creation for business operations
 * - Jaeger exporter for visualization
 * - Trace context propagation across services
 *
 * @see https://opentelemetry.io/docs/instrumentation/js/
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [TracingService, TracingInterceptor],
  exports: [TracingService, TracingInterceptor],
})
export class TracingModule {}
