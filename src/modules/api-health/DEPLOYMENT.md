# API Health Monitoring - Deployment Guide

## Pre-Deployment Checklist

### 1. Verify Dependencies
```bash
# Check package.json includes required packages
grep -E "@nestjs/schedule|@willsoto/nestjs-prometheus|prom-client" package.json

# If missing, install
npm install @nestjs/schedule @willsoto/nestjs-prometheus prom-client
```

### 2. Configure Environment Variables

#### Development (.env.development)
```env
CIRCLE_API_URL=https://api-sandbox.circle.com
CIRCLE_API_KEY=TEST_API_KEY_xxxxxxxxx

YELLOW_CARD_API_URL=https://sandbox.api.yellowcard.io
YELLOW_CARD_API_KEY=test_xxxxxxxxx
YELLOW_CARD_SECRET_KEY=test_secret_xxxxxxxxx

TWILIO_ACCOUNT_SID=AC_test_xxxxxxxxx
TWILIO_AUTH_TOKEN=test_token_xxxxxxxxx
TWILIO_PHONE_NUMBER=+15551234567

NODE_ENV=development
```

#### Staging (.env.staging)
```env
CIRCLE_API_URL=https://api-sandbox.circle.com
CIRCLE_API_KEY=STAGING_API_KEY_xxxxxxxxx

YELLOW_CARD_API_URL=https://sandbox.api.yellowcard.io
YELLOW_CARD_API_KEY=staging_xxxxxxxxx
YELLOW_CARD_SECRET_KEY=staging_secret_xxxxxxxxx

TWILIO_ACCOUNT_SID=AC_staging_xxxxxxxxx
TWILIO_AUTH_TOKEN=staging_token_xxxxxxxxx
TWILIO_PHONE_NUMBER=+15559876543

NODE_ENV=staging
```

#### Production (.env.production)
```env
CIRCLE_API_URL=https://api.circle.com
CIRCLE_API_KEY=${CIRCLE_API_KEY}  # From secrets manager

YELLOW_CARD_API_URL=https://api.yellowcard.io
YELLOW_CARD_API_KEY=${YELLOW_CARD_API_KEY}  # From secrets manager
YELLOW_CARD_SECRET_KEY=${YELLOW_CARD_SECRET_KEY}  # From secrets manager

TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}  # From secrets manager
TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}  # From secrets manager
TWILIO_PHONE_NUMBER=${TWILIO_PHONE_NUMBER}  # From secrets manager

NODE_ENV=production
```

### 3. Update app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiHealthModule } from './modules/api-health';
import { MetricsModule } from './modules/metrics';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    MetricsModule,
    ApiHealthModule,  // Add this line
    // ... other modules
  ],
})
export class AppModule {}
```

## Deployment Steps

### Step 1: Deploy Code

```bash
# Build the application
npm run build

# Run tests
npm test

# Verify build artifacts
ls -la dist/modules/api-health/
```

### Step 2: Deploy to Staging

```bash
# Deploy to staging
git checkout staging
git merge develop
git push origin staging

# Trigger staging deployment (adjust for your CI/CD)
# Example: GitHub Actions
# The pipeline should automatically deploy to staging
```

### Step 3: Verify Staging Deployment

```bash
# Check health endpoint
curl https://api-staging.joonapay.com/api-health

# Expected response:
# {
#   "overall": "healthy",
#   "providers": [...],
#   "checkedAt": "2026-01-30T12:00:00Z"
# }

# Check Prometheus metrics
curl https://api-staging.joonapay.com/metrics | grep api_health

# Trigger manual health check
curl -X POST https://api-staging.joonapay.com/api-health/check \
  -H "Authorization: Bearer STAGING_TOKEN"
```

### Step 4: Deploy Grafana Dashboard

```bash
# Copy dashboard JSON to Grafana config directory
cp infrastructure/monitoring/grafana/dashboards/api-health-dashboard.json \
   /path/to/grafana/provisioning/dashboards/

# Restart Grafana
docker-compose restart grafana

# Or if using systemd
sudo systemctl restart grafana-server

# Verify dashboard is loaded
curl -u admin:password http://localhost:3000/api/dashboards/uid/api-health-monitoring
```

### Step 5: Deploy Prometheus Alerts

```bash
# Copy alert rules to Prometheus
cp infrastructure/monitoring/prometheus/alerts/api-health-alerts.yml \
   /path/to/prometheus/rules/

# Update prometheus.yml to include the rules
cat >> /path/to/prometheus/prometheus.yml <<EOF
rule_files:
  - "/etc/prometheus/rules/api-health-alerts.yml"
EOF

# Validate Prometheus configuration
promtool check config /path/to/prometheus/prometheus.yml

# Reload Prometheus configuration
curl -X POST http://localhost:9090/-/reload

# Or restart Prometheus
docker-compose restart prometheus
```

### Step 6: Configure Alert Notifications

#### Slack Integration
```yaml
# alertmanager.yml
route:
  group_by: ['alertname', 'provider']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'slack-notifications'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#api-health-alerts'
        title: '{{ range .Alerts }}{{ .Labels.severity | toUpper }}{{ end }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

#### PagerDuty Integration
```yaml
receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
        description: '{{ .GroupLabels.alertname }}: {{ .Annotations.summary }}'
```

### Step 7: Verify Monitoring

```bash
# Check Prometheus is scraping metrics
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job == "usdc-wallet")'

# Check Grafana dashboard is accessible
curl http://localhost:3000/d/api-health-monitoring

# Verify alerts are loaded
curl http://localhost:9090/api/v1/rules | jq '.data.groups[] | select(.name == "api_health_alerts")'

# Check alert status
curl http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.labels.category == "api_health")'
```

### Step 8: Production Deployment

```bash
# Merge to production branch
git checkout production
git merge staging
git push origin production

# Deploy to production
# (This should trigger your production deployment pipeline)

# Verify production deployment
curl https://api.joonapay.com/api-health

# Check metrics endpoint
curl https://api.joonapay.com/metrics | grep api_health

# Monitor logs
kubectl logs -f deployment/usdc-wallet-api -n production | grep "API Health"
```

### Step 9: Post-Deployment Verification

```bash
# Wait for first health check cycle (30 seconds)
sleep 35

# Verify all providers are being monitored
curl https://api.joonapay.com/api-health | jq '.providers[] | {provider, status, available}'

# Check Prometheus metrics are being recorded
curl https://api.joonapay.com/metrics | grep -E "api_health_availability|api_health_status"

# Verify Grafana dashboard shows data
# Navigate to: https://grafana.joonapay.com/d/api-health-monitoring
```

## Rollback Procedure

If issues occur during deployment:

```bash
# Rollback code deployment
kubectl rollout undo deployment/usdc-wallet-api -n production

# Or using Docker
docker-compose down
docker-compose up -d --force-recreate

# Remove Grafana dashboard
rm /path/to/grafana/provisioning/dashboards/api-health-dashboard.json
docker-compose restart grafana

# Remove Prometheus alerts
rm /path/to/prometheus/rules/api-health-alerts.yml
curl -X POST http://localhost:9090/-/reload

# Verify rollback
curl https://api.joonapay.com/health
```

## Monitoring Deployment

### CloudWatch (AWS)
```bash
# Create CloudWatch log group
aws logs create-log-group --log-group-name /ecs/usdc-wallet/api-health

# Create metric filter for errors
aws logs put-metric-filter \
  --log-group-name /ecs/usdc-wallet/api-health \
  --filter-name api-health-errors \
  --filter-pattern "[time, request_id, level=ERROR*, ...]" \
  --metric-transformations \
    metricName=APIHealthErrors,metricNamespace=JoonaPay,metricValue=1
```

### Kubernetes
```yaml
# api-health-service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: usdc-wallet-api-health
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: usdc-wallet
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

## Performance Tuning

### Adjust Health Check Frequency

If health checks are too frequent:

```typescript
// api-health-metrics.service.ts
@Cron('*/60 * * * * *')  // Change from 30s to 60s
async runScheduledHealthChecks(): Promise<void> {
  // ...
}
```

### Optimize Prometheus Retention

```yaml
# prometheus.yml
global:
  scrape_interval: 30s
  evaluation_interval: 30s

storage:
  tsdb:
    retention.time: 30d  # Keep 30 days of data
    retention.size: 10GB  # Max 10GB storage
```

### Reduce Metric Cardinality

If metrics storage grows too large:

```typescript
// Remove high-cardinality labels
// Before: {provider, endpoint, status, error}
// After: {provider, status}
this.errorsCounter.inc({
  provider,
  status: statusCode.toString(),
  // Remove 'error' label if too many unique values
});
```

## Troubleshooting

### Issue: Metrics not appearing in Prometheus

**Solution:**
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify /metrics endpoint is accessible
curl http://localhost:3000/metrics

# Check Prometheus scrape config
grep -A 10 "job_name: 'usdc-wallet'" /path/to/prometheus/prometheus.yml
```

### Issue: Grafana dashboard shows no data

**Solution:**
```bash
# Verify Prometheus data source
curl http://localhost:3000/api/datasources

# Test Prometheus query
curl -G http://localhost:9090/api/v1/query \
  --data-urlencode 'query=api_health_availability'

# Check dashboard JSON is valid
jq . infrastructure/monitoring/grafana/dashboards/api-health-dashboard.json
```

### Issue: Alerts not firing

**Solution:**
```bash
# Check alert rules are loaded
curl http://localhost:9090/api/v1/rules

# Verify alert condition is met
curl http://localhost:9090/api/v1/query \
  --data-urlencode 'query=api_health_availability{provider="circle"} == 0'

# Check Alertmanager is configured
curl http://localhost:9093/api/v1/status
```

## Production Checklist

Before marking deployment as complete:

- [ ] Code deployed to all environments
- [ ] Environment variables configured
- [ ] Health endpoint returning 200
- [ ] Prometheus scraping metrics
- [ ] Grafana dashboard showing data
- [ ] Alert rules loaded in Prometheus
- [ ] Alertmanager notifications configured
- [ ] Twilio webhook endpoint configured (if applicable)
- [ ] CI/CD health checks passing
- [ ] Logs showing successful health checks
- [ ] No errors in application logs
- [ ] SLA targets configured
- [ ] Team notified of new monitoring
- [ ] Runbooks updated
- [ ] Documentation reviewed

## Post-Deployment

### Week 1: Monitoring

Monitor for:
- Memory leaks from metric collection
- CPU spikes during health checks
- Network bandwidth usage
- Alert noise (too many alerts)

### Week 2-4: Optimization

Adjust:
- Health check frequency
- Alert thresholds
- Metric retention
- Dashboard layout

### Month 2+: Review

Review:
- SLA compliance
- Alert accuracy
- Dashboard usage
- Performance impact

## Support Contacts

- **Platform Team**: platform@joonapay.com
- **On-call**: +1-555-ON-CALL-1
- **Slack**: #platform-support
- **Runbooks**: https://docs.joonapay.com/runbooks/api-health

## Additional Resources

- [README.md](./README.md) - Full documentation
- [INTEGRATION.md](./INTEGRATION.md) - Integration guide
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick reference
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
