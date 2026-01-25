# Quick Start - Monitoring Setup

Get your monitoring stack up and running in 5 minutes.

## Prerequisites

- Docker and Docker Compose installed
- USDC Wallet application running
- Node.js application with metrics endpoint at `/metrics`

## Step 1: Start Monitoring Stack

```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

This starts:
- Prometheus (port 9090)
- Grafana (port 3001)
- Redis Exporter (port 9121)
- PostgreSQL Exporter (port 9187)
- Node Exporter (port 9100)

## Step 2: Update Prometheus Configuration

Edit `prometheus/prometheus.yml` and update the target for your application:

```yaml
scrape_configs:
  - job_name: 'usdc-wallet-api'
    static_configs:
      - targets: ['host.docker.internal:3000']  # For Mac/Windows
        # - targets: ['172.17.0.1:3000']        # For Linux
```

Reload Prometheus configuration:

```bash
docker exec usdc-wallet-prometheus kill -HUP 1
```

Or restart the container:

```bash
docker restart usdc-wallet-prometheus
```

## Step 3: Access Grafana

1. Open http://localhost:3001
2. Login with:
   - Username: `admin`
   - Password: `admin`
3. Change password when prompted (or skip)

## Step 4: Verify Metrics

### Check Application Metrics

```bash
curl http://localhost:3000/metrics
```

You should see metrics like:
```
# HELP usdc_wallet_http_requests_total Total number of HTTP requests
# TYPE usdc_wallet_http_requests_total counter
usdc_wallet_http_requests_total{method="GET",path="/api/v1/health",status="200"} 42
```

### Check Prometheus Targets

1. Open http://localhost:9090/targets
2. Verify all targets are "UP"
3. If "DOWN", check your application is running and accessible

## Step 5: View Dashboard

1. In Grafana, go to Dashboards
2. Open "USDC Wallet - Overview Dashboard"
3. You should see metrics appearing

If no data appears:
- Check time range (top right) - set to "Last 15 minutes"
- Verify Prometheus is scraping (check /targets)
- Ensure application is receiving traffic

## Step 6: Test Metrics Collection

Generate some traffic to your application:

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Multiple requests
for i in {1..10}; do curl http://localhost:3000/api/v1/health; done
```

Refresh the Grafana dashboard to see the metrics update.

## Step 7: Configure Alerts (Optional)

Enable alert rules in Prometheus:

```bash
# Edit prometheus.yml to uncomment rule_files
nano prometheus/prometheus.yml
```

Uncomment:
```yaml
rule_files:
  - 'alerts/*.yml'
```

Reload Prometheus:
```bash
docker restart usdc-wallet-prometheus
```

View alerts at http://localhost:9090/alerts

## Common Issues

### Application Metrics Not Showing

**Problem**: Prometheus shows target as DOWN

**Solution**:
```bash
# Check if application is running
curl http://localhost:3000/metrics

# If using Docker on Mac/Windows, use host.docker.internal
# Update prometheus.yml:
- targets: ['host.docker.internal:3000']

# If using Docker on Linux, use host IP
- targets: ['172.17.0.1:3000']
```

### Grafana Shows "No Data"

**Problem**: Dashboard panels are empty

**Solution**:
1. Check Prometheus data source: Configuration > Data Sources > Prometheus
2. Click "Test" - should show "Data source is working"
3. Verify time range in dashboard (top right)
4. Check Prometheus has data: http://localhost:9090/graph

### Permission Denied Errors

**Problem**: Docker volumes permission errors

**Solution**:
```bash
# Fix permissions
sudo chown -R 472:472 monitoring/grafana/
sudo chown -R 65534:65534 monitoring/prometheus/
```

### High Memory Usage

**Problem**: Prometheus using too much memory

**Solution**:
```bash
# Edit prometheus.yml and reduce retention
docker-compose -f docker-compose.monitoring.yml down
# Edit storage.tsdb.retention.time in docker-compose.monitoring.yml
docker-compose -f docker-compose.monitoring.yml up -d
```

## Next Steps

1. **Customize Dashboard**: Edit panels in Grafana to show metrics you care about
2. **Set Up Alerts**: Configure AlertManager for notifications
3. **Add More Metrics**: Instrument your code with custom metrics
4. **Review Logs**: Set up structured logging aggregation
5. **Production Setup**: Secure endpoints, use persistent volumes, configure backups

## Useful Commands

```bash
# View logs
docker logs usdc-wallet-prometheus
docker logs usdc-wallet-grafana

# Restart services
docker restart usdc-wallet-prometheus
docker restart usdc-wallet-grafana

# Stop monitoring stack
docker-compose -f docker-compose.monitoring.yml down

# Remove volumes (WARNING: deletes all data)
docker-compose -f docker-compose.monitoring.yml down -v

# Check Prometheus configuration
docker exec usdc-wallet-prometheus promtool check config /etc/prometheus/prometheus.yml
```

## Health Check Endpoints

```bash
# Basic health
curl http://localhost:3000/api/v1/health

# Readiness (all dependencies)
curl http://localhost:3000/api/v1/health/ready

# Liveness
curl http://localhost:3000/api/v1/health/live

# Detailed health
curl http://localhost:3000/api/v1/health/detailed
```

## Dashboard Shortcuts

- **Request Rate**: Shows HTTP requests per second
- **Latency**: p50, p95, p99 percentiles
- **Error Rate**: 4xx and 5xx errors
- **Active Users**: Users active in last 24h
- **Transactions**: By type and status
- **Cache Hit Rate**: Cache efficiency
- **Database Queries**: Query latency by operation
- **Memory Usage**: Node.js heap usage

## Support

For detailed implementation, see:
- [README.md](./README.md) - Complete documentation
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Code examples

For issues:
1. Check application logs
2. Check Prometheus targets: http://localhost:9090/targets
3. Verify metrics endpoint: http://localhost:3000/metrics
4. Review Grafana data source configuration
