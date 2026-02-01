# Distributed Tracing Module

OpenTelemetry-based distributed tracing with Jaeger exporter for the JoonaPay USDC Wallet backend.

## Overview

This module provides comprehensive distributed tracing capabilities:

- **Automatic instrumentation** for HTTP requests, database queries, and Redis operations
- **W3C Trace Context propagation** for distributed systems
- **Custom span creation** for business operations
- **Jaeger integration** for trace visualization
- **Zero configuration** auto-instrumentation

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenTelemetry SDK                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  HTTP Auto   │  │  PostgreSQL  │  │   Redis      │      │
│  │Instrumentation│  │Instrumentation│  │Instrumentation│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │         Custom Tracing Service                    │       │
│  │  - trace() method for custom spans                │       │
│  │  - Span attributes and events                     │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │         Trace Context Propagation                 │       │
│  │  - W3C Trace Context headers                      │       │
│  │  - traceparent / tracestate                       │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  OTLP Exporter   │
              │  (HTTP/JSON)     │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ Jaeger Collector │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   Jaeger UI      │
              │ (Visualization)  │
              └──────────────────┘
```

## Setup

### 1. Start Jaeger (Development)

```bash
# Using Docker Compose
cd infrastructure/monitoring
docker-compose -f docker-compose.jaeger.yml up -d

# Verify Jaeger is running
curl http://localhost:14269/
```

Access Jaeger UI: http://localhost:16686

### 2. Configure Environment Variables

```bash
# Copy example configuration
cp .env.tracing.example .env.local

# Or add to your existing .env file
TRACING_ENABLED=true
JAEGER_ENDPOINT=http://localhost:4318/v1/traces
TRACING_SERVICE_NAME=usdc-wallet-api
TRACING_SAMPLE_RATE=1.0
```

### 3. Module is Auto-Enabled

The `TracingModule` is already imported in `app.module.ts` and will initialize automatically when the application starts.

## Usage

### Automatic Tracing

**HTTP Requests** are automatically traced by OpenTelemetry auto-instrumentation:

```typescript
// Incoming HTTP requests create spans automatically
@Controller('wallet')
export class WalletController {
  @Get('balance')
  async getBalance() {
    // This request is automatically traced
    return { balance: 100 };
  }
}
```

**Database Queries** are automatically traced:

```typescript
// PostgreSQL queries via TypeORM
const user = await this.userRepository.findOne({ where: { id: userId } });
// Traced as: SELECT * FROM users WHERE id = ?
```

**Redis Operations** are automatically traced:

```typescript
// Cache operations via cache-manager
await this.cacheManager.get('user:123');
// Traced as: GET user:123
```

### Custom Tracing

Use `TracingService` to create custom spans for business operations:

```typescript
import { Injectable } from '@nestjs/common';
import { TracingService } from '@/modules/tracing';

@Injectable()
export class TransferService {
  constructor(private readonly tracingService: TracingService) {}

  async createTransfer(dto: CreateTransferDto) {
    return this.tracingService.trace(
      'TransferService.createTransfer',
      async (span) => {
        // Add custom attributes
        span.setAttribute('transfer.amount', dto.amount);
        span.setAttribute('transfer.currency', dto.currency);
        span.setAttribute('user.id', dto.userId);

        // Your business logic here
        const transfer = await this.processTransfer(dto);

        // Add events
        span.addEvent('transfer.validated', {
          transfer_id: transfer.id,
        });

        return transfer;
      },
      {
        // Initial attributes (alternative to span.setAttribute)
        'transfer.type': 'internal',
      },
    );
  }
}
```

### HTTP Client with Trace Propagation

Use `TracedHttpClient` for outgoing HTTP requests with automatic trace context propagation:

```typescript
import { Injectable } from '@nestjs/common';
import { TracedHttpClient } from '@/modules/tracing';

@Injectable()
export class PaymentProviderService {
  constructor(private readonly httpClient: TracedHttpClient) {}

  async chargeCustomer(amount: number) {
    // Trace context (traceparent header) is automatically injected
    const response = await this.httpClient
      .post('https://payment-provider.com/api/charge', {
        amount,
        currency: 'USD',
      })
      .toPromise();

    return response.data;
  }
}
```

The `traceparent` header will look like:
```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

Where:
- `00` = version
- `4bf92f3577b34da6a3ce929d0e0e4736` = trace ID (128-bit)
- `00f067aa0ba902b7` = parent span ID (64-bit)
- `01` = trace flags (sampled)

### Adding Attributes to Current Span

```typescript
@Injectable()
export class KycService {
  constructor(private readonly tracingService: TracingService) {}

  async submitKyc(userId: string, data: KycData) {
    // Add attributes to the current active span (e.g., from HTTP request)
    this.tracingService.setAttributes({
      'kyc.user_id': userId,
      'kyc.document_type': data.documentType,
      'kyc.country': data.country,
    });

    // Add events
    this.tracingService.addEvent('kyc.document_uploaded', {
      document_count: data.documents.length,
    });

    return this.processKyc(data);
  }
}
```

## Trace Visualization in Jaeger

### View Traces

1. Open Jaeger UI: http://localhost:16686
2. Select service: `usdc-wallet-api`
3. Click "Find Traces"

### Example Trace Hierarchy

```
usdc-wallet-api: POST /api/v1/transfers
├── TransferService.createTransfer
│   ├── TransferService.validateBalance
│   │   └── PostgreSQL: SELECT * FROM wallets WHERE user_id = ?
│   ├── TransferService.checkLimits
│   │   └── Redis: GET rate_limit:user:123
│   ├── BlnkService.createTransaction
│   │   └── HTTP POST: https://blnk.io/api/transactions
│   └── NotificationService.sendNotification
│       └── HTTP POST: https://fcm.googleapis.com/fcm/send
```

### Trace Details

Each span shows:
- **Duration**: Time taken by the operation
- **Attributes**: Custom metadata (user ID, amount, etc.)
- **Events**: Key moments in the operation
- **Logs**: Error messages and warnings
- **Status**: OK, ERROR, UNSET

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TRACING_ENABLED` | Enable/disable tracing | `true` (non-production) |
| `TRACING_SERVICE_NAME` | Service identifier | `usdc-wallet-api` |
| `JAEGER_ENDPOINT` | Jaeger collector URL | `http://localhost:4318/v1/traces` |
| `TRACING_SAMPLE_RATE` | Sampling rate (0.0-1.0) | `1.0` |
| `TRACING_EXPORT_CONSOLE` | Also export to console | `false` |

### Sampling Strategies

**Development**: Sample 100% (1.0)
```env
TRACING_SAMPLE_RATE=1.0
```

**Production**: Sample 10% to reduce overhead
```env
TRACING_SAMPLE_RATE=0.1
```

**High-traffic Production**: Sample 1%
```env
TRACING_SAMPLE_RATE=0.01
```

## Performance Considerations

### Overhead

- **CPU**: ~1-3% overhead with 100% sampling
- **Memory**: ~50-100 MB for trace buffers
- **Network**: Minimal (batched exports every 5 seconds)

### Optimization

1. **Reduce sampling rate** in production (10% recommended)
2. **Disable console export** in production
3. **Use batch span processor** (default, already configured)
4. **Ignore health check endpoints** (already filtered)

### Best Practices

1. **Don't trace sensitive data** (passwords, tokens, PII)
   ```typescript
   // BAD
   span.setAttribute('user.password', password);

   // GOOD
   span.setAttribute('user.id', userId);
   ```

2. **Use meaningful span names**
   ```typescript
   // BAD
   this.tracingService.trace('process', async () => {});

   // GOOD
   this.tracingService.trace('TransferService.validateAndExecute', async () => {});
   ```

3. **Add business context**
   ```typescript
   span.setAttribute('transfer.amount_usd', amount);
   span.setAttribute('transfer.destination_country', country);
   span.setAttribute('transfer.method', 'mobile_money');
   ```

4. **Use events for key milestones**
   ```typescript
   span.addEvent('kyc.documents_verified', { document_count: 3 });
   span.addEvent('payment.authorized', { authorization_code: 'ABC123' });
   ```

## Production Setup

### Using Jaeger Operator (Kubernetes)

```yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: joonapay-jaeger
spec:
  strategy: production
  storage:
    type: elasticsearch
    elasticsearch:
      nodeCount: 3
      storage:
        size: 50Gi
```

### Using Managed Services

**Grafana Cloud**:
```env
JAEGER_ENDPOINT=https://tempo-prod-01-prod-us-central-0.grafana.net/api/traces
TRACING_SAMPLE_RATE=0.1
```

**AWS X-Ray**:
```env
# Use OpenTelemetry X-Ray exporter
# (requires additional configuration)
```

**Datadog APM**:
```env
# Use Datadog exporter
# (requires additional configuration)
```

## Troubleshooting

### Traces Not Appearing in Jaeger

1. **Check if tracing is enabled**
   ```bash
   curl http://localhost:3000/api/v1/health | jq '.tracing'
   ```

2. **Verify Jaeger is running**
   ```bash
   curl http://localhost:14269/
   ```

3. **Check application logs**
   ```
   [TracingService] Distributed tracing initialized successfully
   [TracingService] Tracing initialized: usdc-wallet-api v1.0.0
   ```

4. **Test trace export**
   ```env
   TRACING_EXPORT_CONSOLE=true
   ```

### High Memory Usage

Reduce batch size or increase export frequency in `tracing.service.ts`:

```typescript
new BatchSpanProcessor(otlpExporter, {
  maxQueueSize: 1024, // Reduce from 2048
  maxExportBatchSize: 256, // Reduce from 512
  scheduledDelayMillis: 2000, // Increase frequency (reduce from 5000)
})
```

### Missing Spans

Ensure all async operations are properly awaited:

```typescript
// BAD - span ends before operation completes
this.tracingService.trace('operation', async (span) => {
  this.someAsyncOperation(); // Not awaited!
});

// GOOD
this.tracingService.trace('operation', async (span) => {
  await this.someAsyncOperation();
});
```

## API Reference

### TracingService

#### `trace<T>(name: string, fn: (span) => Promise<T>, attributes?): Promise<T>`

Create a custom span and execute async function within its context.

#### `traceSync<T>(name: string, fn: (span) => T, attributes?): T`

Create a custom span for synchronous operations.

#### `setAttributes(attributes: Record<string, any>): void`

Add attributes to the current active span.

#### `addEvent(name: string, attributes?): void`

Add an event to the current active span.

#### `getCurrentSpanContext(): SpanContext | null`

Get the current span context for manual propagation.

### TracedHttpClient

Drop-in replacement for NestJS `HttpService` with automatic trace propagation.

#### `get<T>(url: string, config?): Observable<AxiosResponse<T>>`
#### `post<T>(url: string, data?, config?): Observable<AxiosResponse<T>>`
#### `put<T>(url: string, data?, config?): Observable<AxiosResponse<T>>`
#### `patch<T>(url: string, data?, config?): Observable<AxiosResponse<T>>`
#### `delete<T>(url: string, config?): Observable<AxiosResponse<T>>`

## Resources

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
