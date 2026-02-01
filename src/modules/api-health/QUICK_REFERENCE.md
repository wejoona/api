# API Health Monitoring - Quick Reference

## Endpoints

```bash
# Get all API health
GET /api-health

# Get specific provider health
GET /api-health/circle
GET /api-health/yellow_card
GET /api-health/twilio

# Trigger health checks (requires auth)
POST /api-health/check
POST /api-health/check/circle
```

## Environment Variables

```env
CIRCLE_API_URL=https://api.circle.com
CIRCLE_API_KEY=your_key

YELLOW_CARD_API_URL=https://api.yellowcard.io
YELLOW_CARD_API_KEY=your_key
YELLOW_CARD_SECRET_KEY=your_secret

TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
```

## Usage in Code

### Import Service
```typescript
import { ApiHealthMetricsService } from '@modules/api-health';

constructor(
  private readonly apiHealthMetricsService: ApiHealthMetricsService,
) {}
```

### Record Twilio Message
```typescript
// Success
this.apiHealthMetricsService.recordTwilioMessage('sent');
this.apiHealthMetricsService.recordTwilioMessage('delivered');

// Failure
this.apiHealthMetricsService.recordTwilioMessage('failed', errorCode);
this.apiHealthMetricsService.recordTwilioMessage('undelivered', errorCode);
```

### Check Health Programmatically
```typescript
// All providers
const health = await this.apiHealthMetricsService.getCurrentHealth();

// Specific provider
await this.apiHealthMetricsService.checkProviderHealth(ApiProvider.CIRCLE);
```

## Prometheus Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `api_health_availability` | Gauge | 1 = up, 0 = down |
| `api_health_status` | Gauge | 2 = healthy, 1 = degraded, 0 = down |
| `api_health_latency_seconds` | Histogram | Response time |
| `api_health_checks_total` | Counter | Total checks |
| `api_health_errors_total` | Counter | Total errors |
| `api_twilio_messages_sent_total` | Counter | Sent messages |
| `api_twilio_messages_failed_total` | Counter | Failed messages |

## Common Queries

```promql
# Circle API availability (24h)
avg_over_time(api_health_availability{provider="circle"}[24h]) * 100

# Yellow Card p95 latency
histogram_quantile(0.95, rate(api_health_latency_seconds_bucket{provider="yellow_card"}[5m]))

# Twilio delivery rate
rate(api_twilio_messages_sent_total[5m]) / (rate(api_twilio_messages_sent_total[5m]) + rate(api_twilio_messages_failed_total[5m]))

# APIs currently down
count(api_health_availability == 0)
```

## Alert Thresholds

| Alert | Condition | Severity | Duration |
|-------|-----------|----------|----------|
| API Down | availability = 0 | Critical | 2m |
| High Latency | p95 > 2s | Warning | 5m |
| Low Delivery | rate < 95% | Warning | 10m |
| Critical Delivery | rate < 90% | Critical | 5m |

## Health Status

| Status | Value | Condition |
|--------|-------|-----------|
| HEALTHY | 2 | Available & latency ≤ 2s |
| DEGRADED | 1 | Available & latency > 2s |
| DOWN | 0 | Not available |

## File Locations

```
Module: /usdc-wallet/src/modules/api-health/
Dashboard: /infrastructure/monitoring/grafana/dashboards/api-health-dashboard.json
Alerts: /infrastructure/monitoring/prometheus/alerts/api-health-alerts.yml
```

## Debugging

```bash
# View all metrics
curl http://localhost:3000/metrics | grep api_health

# Check health status
curl http://localhost:3000/api-health | jq

# View Prometheus targets
http://localhost:9090/targets

# View Grafana dashboard
http://localhost:3000/grafana/d/api-health-monitoring
```

## Testing

```bash
# Unit tests
npm test api-health-metrics.service.spec.ts

# Integration test
curl http://localhost:3000/api-health/circle

# Trigger manual check
curl -X POST http://localhost:3000/api-health/check \
  -H "Authorization: Bearer TOKEN"
```

## Import in Module

```typescript
import { ApiHealthModule } from './modules/api-health';

@Module({
  imports: [ApiHealthModule],
})
export class AppModule {}
```

## SLA Targets

- **Availability**: > 99.5% (24h)
- **Latency p95**: < 500ms (good), < 2s (acceptable)
- **Twilio Delivery**: > 98% (target), > 95% (acceptable)
