# Graceful Shutdown Implementation

The backend now implements comprehensive graceful shutdown handling to ensure clean termination without data loss.

## Features

- **SIGTERM/SIGINT handling**: Responds to shutdown signals from orchestrators (Kubernetes, Docker, PM2)
- **Request tracking**: Waits for in-flight requests to complete before shutdown
- **Database cleanup**: Closes TypeORM connection pool gracefully
- **Redis cleanup**: Disconnects Redis/cache connections properly
- **Health integration**: Exposes shutdown status via health endpoints
- **Error handling**: Handles uncaught exceptions and unhandled rejections

## How It Works

### 1. Signal Reception
```
SIGTERM/SIGINT → ShutdownService.shutdown()
```

### 2. Shutdown Sequence
```
Step 1: Stop accepting new requests (via middleware)
Step 2: Wait for active requests to complete (max 30s)
Step 3: Close database connections
Step 4: Close Redis connections
Step 5: Clean exit (process.exit(0))
```

### 3. Request Tracking
All incoming requests are tracked by the `ShutdownMiddleware`:
- Increments counter on request start
- Decrements counter on request completion
- Rejects new requests during shutdown with `503 Service Unavailable`

## Files Created

```
src/common/shutdown/
├── shutdown.service.ts        # Core shutdown logic
├── shutdown.middleware.ts     # Request tracking middleware
├── shutdown.module.ts         # NestJS module
├── shutdown.service.spec.ts   # Unit tests
├── index.ts                   # Exports
└── README.md                  # Detailed documentation
```

## Configuration

### Default Timeout
30 seconds (configurable)

### Custom Timeout
```typescript
import { ShutdownService } from '@/common/shutdown';

@Injectable()
export class MyService {
  constructor(private readonly shutdownService: ShutdownService) {
    // Set 60 second timeout
    this.shutdownService.setShutdownTimeout(60000);
  }
}
```

## Health Checks

### Liveness Check
```bash
curl http://localhost:3000/api/v1/health/live
```

**Response (Normal):**
```json
{
  "status": "ok",
  "timestamp": "2026-01-29T12:00:00.000Z",
  "shuttingDown": false,
  "activeRequests": 0
}
```

**Response (Shutting Down):**
```json
{
  "status": "shutting_down",
  "timestamp": "2026-01-29T12:00:00.000Z",
  "shuttingDown": true,
  "activeRequests": 3
}
```

### Detailed Health Check
```bash
curl http://localhost:3000/api/v1/health/detailed
```

Includes shutdown status and active request count.

## Testing

### Manual Testing

#### 1. Start the server
```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet
npm run start:dev
```

#### 2. Send a shutdown signal
```bash
# In another terminal
pkill -SIGTERM node
# or press Ctrl+C in the server terminal
```

#### 3. Expected output
```
[Bootstrap] SIGTERM signal received: closing HTTP server
[ShutdownService] Received SIGTERM signal, initiating graceful shutdown...
[ShutdownService] Step 1/4: Stopped accepting new requests
[ShutdownService] Step 2/4: All in-flight requests completed
[ShutdownService] Closing database connection pool...
[ShutdownService] Database connection pool closed
[ShutdownService] Step 3/4: Database connections closed
[ShutdownService] Closing Redis/cache connections...
[ShutdownService] Redis cache connection closed
[ShutdownService] Step 4/4: Cache connections closed
[ShutdownService] Graceful shutdown completed successfully
```

### Load Testing During Shutdown

```bash
# Terminal 1: Start server
npm run start:dev

# Terminal 2: Generate load
npm install -g artillery
artillery quick --count 10 --num 50 http://localhost:3000/api/v1/health/

# Terminal 3: Trigger shutdown
pkill -SIGTERM node
```

**Expected behavior:**
- New requests receive `503 Service Unavailable`
- In-flight requests complete successfully
- Server waits for all active requests
- Clean shutdown after completion

### Unit Tests

```bash
npm test -- shutdown.service.spec
```

## Deployment

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60  # Must be > shutdown timeout
      containers:
      - name: api
        lifecycle:
          preStop:
            exec:
              # Give load balancer time to deregister
              command: ["/bin/sh", "-c", "sleep 5"]
```

### Docker Compose

```yaml
services:
  api:
    image: joonapay/api:latest
    stop_grace_period: 60s  # Must be > shutdown timeout
```

### PM2

```json
{
  "apps": [{
    "name": "joonapay-api",
    "script": "dist/main.js",
    "kill_timeout": 60000,
    "wait_ready": true,
    "listen_timeout": 10000
  }]
}
```

## Signal Handling

| Signal | Source | Exit Code |
|--------|--------|-----------|
| SIGTERM | Kubernetes, Docker, PM2 | 0 |
| SIGINT | Ctrl+C | 0 |
| uncaughtException | Unhandled errors | 1 |
| unhandledRejection | Unhandled promises | 1 |

## Monitoring

### Metrics to Track

1. **Shutdown duration**: Time from signal to exit
2. **Active requests at shutdown**: Number of requests being processed
3. **Forced shutdowns**: Times when timeout was exceeded
4. **Database connection pool status**: Connections at shutdown time
5. **Redis connection status**: Connection state at shutdown

### Logs to Watch

```bash
# Filter shutdown-related logs
npm run start:dev | grep -E "shutdown|SIGTERM|SIGINT"
```

## Troubleshooting

### Issue: Shutdown timeout reached

**Symptom:**
```
[ShutdownService] Shutdown timeout reached with 3 active requests. Forcing shutdown.
```

**Solutions:**
1. Increase timeout: `shutdownService.setShutdownTimeout(60000)`
2. Investigate long-running requests
3. Add request timeout middleware
4. Check for hung database queries

### Issue: Requests fail during shutdown

**Symptom:**
```
503 Service Unavailable - Server is shutting down
```

**Expected Behavior:**
- This is correct! New requests should be rejected during shutdown
- Load balancers should deregister the pod before shutdown starts
- Kubernetes readiness probes should fail when shutting down

### Issue: Database connections leak

**Symptom:**
```
[ShutdownService] Error closing database connections: Connection pool not empty
```

**Solutions:**
1. Check for unclosed transactions
2. Verify all queries use proper connection management
3. Review connection pool configuration
4. Add connection timeout

## Best Practices

1. **Always use graceful shutdown in production**
2. **Set termination grace period > shutdown timeout**
3. **Configure load balancers to respect health checks**
4. **Monitor shutdown metrics**
5. **Test shutdown under load**
6. **Use preStop hooks in Kubernetes**
7. **Log shutdown progress**

## Additional Resources

- Detailed implementation: `src/common/shutdown/README.md`
- Unit tests: `src/common/shutdown/shutdown.service.spec.ts`
- Health integration: `src/modules/health/health.controller.ts`

## Quick Reference

```bash
# Check shutdown status
curl http://localhost:3000/api/v1/health/live | jq '.shuttingDown'

# Test shutdown
pkill -SIGTERM node

# Test with load
artillery quick --count 10 --num 100 http://localhost:3000/api/v1/health/ &
sleep 2 && pkill -SIGTERM node

# View logs
npm run start:dev 2>&1 | tee shutdown.log
```
