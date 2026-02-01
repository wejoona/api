# API Health Monitoring Module

This module provides comprehensive health monitoring for all external API integrations, including Circle API, Yellow Card API, and Twilio. It collects real-time metrics and exposes them for Grafana dashboards.

## Features

- **Automated Health Checks**: Runs every 30 seconds via cron job
- **Multi-Provider Support**: Circle, Yellow Card, Twilio
- **Prometheus Metrics**: Full integration with Prometheus/Grafana
- **Real-time Monitoring**: Track availability, latency, and delivery rates
- **REST API**: Query health status programmatically

## Architecture

```
api-health/
├── application/
│   ├── controllers/
│   │   └── api-health.controller.ts       # REST endpoints
│   ├── services/
│   │   └── api-health-metrics.service.ts  # Metrics collection & Prometheus
│   └── dto/
│       └── api-health-response.dto.ts     # Response DTOs
├── domain/
│   ├── entities/
│   │   └── api-health-metric.entity.ts    # Domain entity
│   └── interfaces/
│       └── health-collector.interface.ts  # Collector contract
├── infrastructure/
│   └── collectors/
│       ├── circle-health.collector.ts     # Circle API health checks
│       ├── yellowcard-health.collector.ts # Yellow Card health checks
│       └── twilio-health.collector.ts     # Twilio health checks
└── api-health.module.ts                   # Module definition
```

## API Endpoints

### GET /api-health

Get health status for all APIs.

**Response:**
```json
{
  "overall": "healthy",
  "providers": [
    {
      "provider": "circle",
      "endpoint": "/v1/configuration",
      "status": "healthy",
      "available": true,
      "latencyMs": 250,
      "statusCode": 200,
      "timestamp": "2026-01-30T12:00:00Z"
    },
    {
      "provider": "yellow_card",
      "endpoint": "/business/rates",
      "status": "healthy",
      "available": true,
      "latencyMs": 450,
      "statusCode": 200,
      "timestamp": "2026-01-30T12:00:00Z"
    },
    {
      "provider": "twilio",
      "endpoint": "/2010-04-01/Accounts/AC123.json",
      "status": "healthy",
      "available": true,
      "latencyMs": 180,
      "statusCode": 200,
      "timestamp": "2026-01-30T12:00:00Z"
    }
  ],
  "checkedAt": "2026-01-30T12:00:00Z"
}
```

### GET /api-health/:provider

Get health status for a specific provider (circle, yellow_card, twilio).

**Response:**
```json
{
  "provider": "circle",
  "endpoint": "/v1/configuration",
  "status": "healthy",
  "available": true,
  "latencyMs": 250,
  "statusCode": 200,
  "metadata": {
    "baseUrl": "https://api.circle.com",
    "hasApiKey": true
  },
  "timestamp": "2026-01-30T12:00:00Z"
}
```

### POST /api-health/check

Manually trigger health checks for all providers (requires authentication).

**Response:**
```json
{
  "message": "Health checks triggered successfully",
  "timestamp": "2026-01-30T12:00:00Z"
}
```

### POST /api-health/check/:provider

Manually trigger health check for a specific provider (requires authentication).

**Response:**
```json
{
  "message": "Health check triggered successfully",
  "provider": "circle",
  "timestamp": "2026-01-30T12:00:00Z"
}
```

## Prometheus Metrics

### api_health_availability

Gauge tracking API availability (1 = available, 0 = unavailable).

**Labels:** `provider`, `endpoint`

**Example:**
```
api_health_availability{provider="circle",endpoint="/v1/configuration"} 1
```

### api_health_latency_seconds

Histogram tracking API health check latency in seconds.

**Labels:** `provider`, `endpoint`

**Buckets:** 0.1, 0.5, 1, 2, 5, 10, 30

**Example:**
```
api_health_latency_seconds_bucket{provider="circle",endpoint="/v1/configuration",le="0.5"} 42
```

### api_health_status

Gauge tracking API health status (2 = healthy, 1 = degraded, 0 = down).

**Labels:** `provider`, `endpoint`

**Example:**
```
api_health_status{provider="circle",endpoint="/v1/configuration"} 2
```

### api_health_checks_total

Counter tracking total number of health checks performed.

**Labels:** `provider`, `endpoint`, `status`

**Example:**
```
api_health_checks_total{provider="circle",endpoint="/v1/configuration",status="200"} 1250
```

### api_health_errors_total

Counter tracking total health check errors.

**Labels:** `provider`, `endpoint`, `error`

**Example:**
```
api_health_errors_total{provider="circle",endpoint="/v1/configuration",error="timeout"} 5
```

### api_twilio_delivery_rate

Gauge tracking Twilio message delivery rate (0-1).

**Labels:** `status`

### api_twilio_messages_sent_total

Counter tracking successfully sent Twilio messages.

**Labels:** `status`, `error_code`

### api_twilio_messages_failed_total

Counter tracking failed Twilio messages.

**Labels:** `status`, `error_code`

## Grafana Dashboard

The Grafana dashboard is available at:
```
/infrastructure/monitoring/grafana/dashboards/api-health-dashboard.json
```

### Dashboard Panels

1. **API Availability Overview** - Real-time status for all APIs
2. **API Health Status** - Health status (healthy/degraded/down)
3. **Overall API Health** - Gauge showing overall health
4. **Circle API Latency** - p50, p95, p99 latency percentiles
5. **Yellow Card API Latency** - p50, p95, p99 latency percentiles
6. **Twilio Delivery Rate** - Message delivery success rate
7. **Twilio Messages Sent vs Failed** - Message volume comparison
8. **API Health Check Errors** - Error breakdown by provider
9. **API Availability Percentage (24h)** - SLA tracking

### Prometheus Queries

**Circle API Availability (24h):**
```promql
avg_over_time(api_health_availability{provider="circle"}[24h]) * 100
```

**Yellow Card API p95 Latency:**
```promql
histogram_quantile(0.95, sum(rate(api_health_latency_seconds_bucket{provider="yellow_card"}[5m])) by (le))
```

**Twilio Delivery Rate:**
```promql
rate(api_twilio_messages_sent_total[5m]) / (rate(api_twilio_messages_sent_total[5m]) + rate(api_twilio_messages_failed_total[5m]))
```

## Usage

### Recording Twilio Message Metrics

When sending messages via Twilio, record the delivery status:

```typescript
import { ApiHealthMetricsService } from '@modules/api-health/application/services/api-health-metrics.service';

@Injectable()
export class SmsService {
  constructor(
    private readonly apiHealthMetricsService: ApiHealthMetricsService,
  ) {}

  async sendSms(to: string, message: string): Promise<void> {
    try {
      const result = await this.twilioClient.messages.create({
        to,
        from: this.twilioNumber,
        body: message,
      });

      // Record successful delivery
      this.apiHealthMetricsService.recordTwilioMessage('sent');
    } catch (error) {
      // Record failed delivery
      this.apiHealthMetricsService.recordTwilioMessage('failed', error.code);
      throw error;
    }
  }
}
```

### Manual Health Check

Trigger a health check programmatically:

```typescript
import { ApiHealthMetricsService } from '@modules/api-health/application/services/api-health-metrics.service';
import { ApiProvider } from '@modules/api-health/domain/entities/api-health-metric.entity';

@Injectable()
export class MonitoringService {
  constructor(
    private readonly apiHealthMetricsService: ApiHealthMetricsService,
  ) {}

  async checkCircleHealth(): Promise<void> {
    await this.apiHealthMetricsService.checkProviderHealth(ApiProvider.CIRCLE);
  }

  async getAllHealth(): Promise<Record<string, any>> {
    return this.apiHealthMetricsService.getCurrentHealth();
  }
}
```

## Health Status Logic

### Status Determination

- **DOWN (0)**: API is not reachable or returns server error
- **DEGRADED (1)**: API is reachable but latency > 2000ms
- **HEALTHY (2)**: API is reachable and latency <= 2000ms

### Availability Logic

APIs are considered available if:
- Response status is 2xx (OK)
- Response status is 401/403 (API is up, but auth failed)

APIs are considered unavailable if:
- Network timeout
- Connection refused
- 5xx server errors
- Request throws exception

## Configuration

Environment variables required:

```env
# Circle API
CIRCLE_API_URL=https://api.circle.com
CIRCLE_API_KEY=your_api_key

# Yellow Card API
YELLOW_CARD_API_URL=https://sandbox.api.yellowcard.io
YELLOW_CARD_API_KEY=your_api_key
YELLOW_CARD_SECRET_KEY=your_secret_key

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
```

## Monitoring Best Practices

1. **Set Up Alerts**: Configure Prometheus alerts for:
   - API downtime (availability < 1 for > 2 minutes)
   - High latency (p95 > 2s for > 5 minutes)
   - Low delivery rate (Twilio delivery < 95% for > 10 minutes)

2. **SLA Tracking**: Monitor 24h availability percentage:
   - Target: > 99.5% availability
   - Warning: < 99% availability
   - Critical: < 95% availability

3. **Latency Thresholds**:
   - Good: p95 < 500ms
   - Acceptable: p95 < 1000ms
   - Poor: p95 > 2000ms

4. **Delivery Rate Targets** (Twilio):
   - Target: > 98% delivery rate
   - Warning: < 95% delivery rate
   - Critical: < 90% delivery rate

## Testing

Test the health endpoints:

```bash
# Get all API health status
curl http://localhost:3000/api-health

# Get Circle API health
curl http://localhost:3000/api-health/circle

# Trigger manual health check (requires auth)
curl -X POST http://localhost:3000/api-health/check \
  -H "Authorization: Bearer YOUR_TOKEN"

# View Prometheus metrics
curl http://localhost:3000/metrics | grep api_health
```

## Troubleshooting

### High Latency

If latency is consistently high:
1. Check network connectivity
2. Verify API endpoint URLs
3. Check for rate limiting
4. Review API provider status page

### Low Availability

If availability drops:
1. Check API credentials
2. Verify network connectivity
3. Check API provider status
4. Review error logs

### Twilio Low Delivery Rate

If delivery rate is low:
1. Check phone number format
2. Verify Twilio account status
3. Check for blocked numbers
4. Review Twilio error codes
