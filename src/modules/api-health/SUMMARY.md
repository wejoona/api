# API Health Monitoring Module - Summary

## Overview

A comprehensive API health monitoring module that tracks Circle API availability, Yellow Card API latency, Twilio delivery rates, and exposes metrics for Grafana dashboards.

## Files Created

### Module Core
```
/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/api-health/
├── api-health.module.ts                              # Module definition with Prometheus setup
├── index.ts                                          # Public exports
├── .env.example                                      # Environment configuration template
├── README.md                                         # Comprehensive documentation
├── INTEGRATION.md                                    # Integration guide
└── SUMMARY.md                                        # This file
```

### Application Layer
```
application/
├── controllers/
│   └── api-health.controller.ts                     # REST endpoints for health status
├── services/
│   ├── api-health-metrics.service.ts                # Core metrics collection service
│   └── api-health-metrics.service.spec.ts           # Unit tests
└── dto/
    └── api-health-response.dto.ts                   # Response DTOs
```

### Domain Layer
```
domain/
├── entities/
│   └── api-health-metric.entity.ts                  # Domain entity & enums
└── interfaces/
    └── health-collector.interface.ts                # Collector contract
```

### Infrastructure Layer
```
infrastructure/
└── collectors/
    ├── index.ts                                      # Collector exports
    ├── circle-health.collector.ts                   # Circle API health checks
    ├── yellowcard-health.collector.ts               # Yellow Card API health checks
    └── twilio-health.collector.ts                   # Twilio API health checks
```

### Infrastructure Configuration
```
/Users/macbook/JoonaPay/USDC-Wallet/infrastructure/monitoring/
├── grafana/dashboards/
│   └── api-health-dashboard.json                    # Grafana dashboard
└── prometheus/alerts/
    └── api-health-alerts.yml                        # Prometheus alert rules
```

## Key Features

### 1. Automated Health Monitoring
- Runs health checks every 30 seconds via cron
- Tracks Circle, Yellow Card, and Twilio APIs
- Records availability, latency, and status

### 2. Prometheus Metrics
```
api_health_availability           # 1 = available, 0 = unavailable
api_health_latency_seconds        # Histogram of latency
api_health_status                 # 2 = healthy, 1 = degraded, 0 = down
api_health_checks_total           # Total checks performed
api_health_errors_total           # Total errors encountered
api_twilio_delivery_rate          # Twilio delivery rate (0-1)
api_twilio_messages_sent_total    # Successfully sent messages
api_twilio_messages_failed_total  # Failed messages
```

### 3. REST API Endpoints
```
GET  /api-health                  # All APIs health status
GET  /api-health/:provider        # Specific provider health
POST /api-health/check            # Trigger all health checks (auth required)
POST /api-health/check/:provider  # Trigger specific health check (auth required)
```

### 4. Grafana Dashboard
- API Availability Overview
- API Health Status
- Overall API Health Gauge
- Circle API Latency (p50, p95, p99)
- Yellow Card API Latency (p50, p95, p99)
- Twilio Delivery Rate
- Twilio Messages Sent vs Failed
- API Health Check Errors
- API Availability Percentage (24h)

### 5. Prometheus Alerts
- CircleAPIDown (critical, 2m)
- CircleAPIHighLatency (warning, 5m)
- CircleAPIDegraded (warning, 5m)
- YellowCardAPIDown (critical, 2m)
- YellowCardAPIHighLatency (warning, 5m)
- TwilioAPIDown (critical, 2m)
- TwilioLowDeliveryRate (warning, 10m)
- TwilioCriticalDeliveryRate (critical, 5m)
- MultipleAPIsDown (critical, 1m)
- OverallAPIHealthPoor (warning, 10m)

## Architecture

### Clean Architecture Pattern
```
┌─────────────────────────────────────────┐
│         API Health Controller           │  ← REST endpoints
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    API Health Metrics Service           │  ← Orchestration
│    - Collects metrics                   │
│    - Records to Prometheus              │
│    - Schedules health checks            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Health Collectors                  │  ← Implementation
│      - CircleHealthCollector            │
│      - YellowCardHealthCollector        │
│      - TwilioHealthCollector            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      External APIs                      │  ← External services
│      - Circle API                       │
│      - Yellow Card API                  │
│      - Twilio API                       │
└─────────────────────────────────────────┘
```

### Data Flow
```
1. Cron triggers every 30 seconds
   ↓
2. ApiHealthMetricsService.collectAllMetrics()
   ↓
3. For each collector:
   - Execute health check
   - Measure latency
   - Determine status
   ↓
4. Record to Prometheus:
   - availability gauge
   - latency histogram
   - status gauge
   - checks counter
   - errors counter
   ↓
5. Prometheus scrapes /metrics endpoint
   ↓
6. Grafana queries Prometheus
   ↓
7. Alerts triggered based on rules
```

## Health Status Logic

### Status Determination
```typescript
if (!available) {
  status = DOWN (0)
} else if (latencyMs > 2000) {
  status = DEGRADED (1)
} else {
  status = HEALTHY (2)
}
```

### Availability Logic
- **Available**: 2xx responses, 401/403 (API up, auth failed)
- **Unavailable**: Timeout, connection refused, 5xx errors, exceptions

## Integration Steps

### 1. Import Module
```typescript
// app.module.ts
import { ApiHealthModule } from './modules/api-health';

@Module({
  imports: [ApiHealthModule],
})
export class AppModule {}
```

### 2. Configure Environment
```env
CIRCLE_API_URL=https://api.circle.com
CIRCLE_API_KEY=your_key
YELLOW_CARD_API_URL=https://api.yellowcard.io
YELLOW_CARD_API_KEY=your_key
YELLOW_CARD_SECRET_KEY=your_secret
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
```

### 3. Track Twilio Messages
```typescript
// In your SMS service
this.apiHealthMetricsService.recordTwilioMessage('sent');
this.apiHealthMetricsService.recordTwilioMessage('failed', errorCode);
```

### 4. Deploy Grafana Dashboard
```bash
# Import dashboard JSON
infrastructure/monitoring/grafana/dashboards/api-health-dashboard.json
```

### 5. Configure Prometheus Alerts
```bash
# Copy alert rules
cp infrastructure/monitoring/prometheus/alerts/api-health-alerts.yml \
   /path/to/prometheus/alerts/
```

## Metrics Examples

### Prometheus Queries

**Circle API Availability (24h):**
```promql
avg_over_time(api_health_availability{provider="circle"}[24h]) * 100
```

**Yellow Card p95 Latency:**
```promql
histogram_quantile(0.95,
  sum(rate(api_health_latency_seconds_bucket{provider="yellow_card"}[5m])) by (le)
)
```

**Twilio Delivery Rate:**
```promql
rate(api_twilio_messages_sent_total[5m]) /
(rate(api_twilio_messages_sent_total[5m]) + rate(api_twilio_messages_failed_total[5m]))
```

## Testing

### Manual Testing
```bash
# Check all APIs
curl http://localhost:3000/api-health

# Check Circle API
curl http://localhost:3000/api-health/circle

# Trigger health check
curl -X POST http://localhost:3000/api-health/check \
  -H "Authorization: Bearer TOKEN"

# View metrics
curl http://localhost:3000/metrics | grep api_health
```

### Unit Tests
```bash
npm test api-health-metrics.service.spec.ts
```

## Monitoring Targets

### SLA Targets
- **Availability**: > 99.5% (24h rolling)
- **Latency p95**: < 500ms (good), < 2000ms (acceptable)
- **Twilio Delivery**: > 98% (target), > 95% (acceptable)

### Alert Thresholds
- **Critical**: API down > 2 minutes
- **Warning**: High latency > 5 minutes
- **Warning**: Delivery rate < 95% for 10 minutes
- **Critical**: Delivery rate < 90% for 5 minutes

## Dependencies

### Required Packages (Already Installed)
- `@nestjs/schedule` - Cron jobs
- `@nestjs/config` - Configuration
- `@willsoto/nestjs-prometheus` - Prometheus integration
- `prom-client` - Prometheus client

### External Services
- Circle API
- Yellow Card API
- Twilio API
- Prometheus
- Grafana

## Performance Impact

### Resource Usage
- **Memory**: ~10-20MB for metric storage
- **CPU**: Minimal (health checks every 30s)
- **Network**: ~3 HTTP requests every 30s

### Optimization Tips
- Adjust cron frequency if needed
- Limit metric cardinality (avoid high-cardinality labels)
- Use histogram buckets appropriate for your latency range

## Security Considerations

1. **API Credentials**: Store in environment variables, never commit
2. **Endpoint Access**: Health endpoints are public, check endpoints require auth
3. **Rate Limiting**: Health checks respect API rate limits
4. **Signature Verification**: Twilio webhook signature verification recommended

## Troubleshooting

### Common Issues

**Metrics not appearing:**
- Verify module is imported
- Check Prometheus scraping configuration
- Ensure `/metrics` endpoint is accessible

**Health checks failing:**
- Verify API credentials in `.env`
- Check network connectivity
- Review error logs

**Twilio metrics not updating:**
- Ensure `recordTwilioMessage()` is called
- Verify webhook endpoint is configured
- Check Twilio delivery status callbacks

## Future Enhancements

Potential improvements:
- [ ] Add Blnk API health collector
- [ ] Implement circuit breaker pattern
- [ ] Add health check result caching
- [ ] Store historical health data in database
- [ ] Add email/SMS alerts for critical issues
- [ ] Implement health score calculation
- [ ] Add API performance benchmarking

## Production Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] Prometheus scraping `/metrics`
- [ ] Grafana dashboard imported
- [ ] Alert rules configured
- [ ] Alert notifications set up (Slack, PagerDuty)
- [ ] Twilio webhook configured
- [ ] Cron job verified running
- [ ] CI/CD health checks added
- [ ] Team trained on alerts
- [ ] Runbooks created

## Support

For issues or questions:
- Review `/api-health/README.md` for detailed documentation
- Check `/api-health/INTEGRATION.md` for integration examples
- Review Prometheus metrics at `/metrics`
- Check Grafana dashboard for visual monitoring
- Review alert rules in `prometheus/alerts/api-health-alerts.yml`

## License

Part of JoonaPay USDC Wallet project.
