# Graceful Shutdown Module

Comprehensive graceful shutdown implementation for the NestJS backend, ensuring clean termination of the application without losing in-flight requests or data.

## Features

- **Signal Handling**: Responds to SIGTERM and SIGINT signals from orchestrators (Kubernetes, Docker, PM2) or terminal (Ctrl+C)
- **Request Tracking**: Monitors active requests and waits for them to complete before shutdown
- **Connection Management**: Properly closes database and Redis connections
- **Health Integration**: Exposes shutdown status via health check endpoints
- **Configurable Timeout**: Customizable grace period before forced shutdown
- **Error Handling**: Handles uncaught exceptions and unhandled rejections

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Signal Received                          │
│              (SIGTERM, SIGINT, Exception)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Stop Accepting New Requests                        │
│  - ShutdownMiddleware rejects new requests                  │
│  - Returns 503 Service Unavailable                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Wait for In-Flight Requests                        │
│  - Polls active request counter                             │
│  - Waits up to configured timeout (default: 30s)            │
│  - Logs progress every 100ms                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Close Database Connections                         │
│  - TypeORM connection pool graceful shutdown                │
│  - Waits for active queries to complete                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Close Redis Connections                            │
│  - cache-manager-redis-yet disconnect                       │
│  - Ensures all cached data is flushed                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Clean Exit (process.exit(0))                   │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. ShutdownService

Core service managing the shutdown lifecycle.

**Methods:**
- `shutdown(signal: string)`: Initiates graceful shutdown
- `isShutdown(): boolean`: Check if shutting down
- `incrementActiveRequests()`: Track new request
- `decrementActiveRequests()`: Mark request complete
- `getActiveRequestCount(): number`: Get current active requests
- `setShutdownTimeout(ms: number)`: Configure timeout

### 2. ShutdownMiddleware

Middleware that tracks all incoming requests and prevents new requests during shutdown.

**Behavior:**
- Increments active request counter on request start
- Decrements counter when request finishes (response 'finish', 'close', or 'error' events)
- Returns `503 Service Unavailable` if shutdown in progress

### 3. ShutdownModule

Global module exporting the shutdown service.

## Usage

### Configuration

The shutdown timeout can be configured:

```typescript
import { ShutdownService } from '@/common/shutdown';

constructor(private readonly shutdownService: ShutdownService) {
  // Set custom timeout (default is 30000ms)
  this.shutdownService.setShutdownTimeout(60000); // 60 seconds
}
```

### Health Checks

The shutdown status is exposed via health endpoints:

**GET /api/v1/health/live**
```json
{
  "status": "shutting_down",
  "timestamp": "2026-01-29T12:00:00.000Z",
  "shuttingDown": true,
  "activeRequests": 3
}
```

**GET /api/v1/health/detailed**
```json
{
  "status": "shutting_down",
  "timestamp": "2026-01-29T12:00:00.000Z",
  "services": { ... },
  "shutdown": {
    "isShuttingDown": true,
    "activeRequests": 3
  },
  "uptime": 3600,
  "memory": { ... }
}
```

### Manual Shutdown

Trigger shutdown programmatically (useful for testing):

```typescript
import { ShutdownService } from '@/common/shutdown';

constructor(private readonly shutdownService: ShutdownService) {}

async handleCriticalError() {
  await this.shutdownService.shutdown('CRITICAL_ERROR');
}
```

## Deployment Considerations

### Kubernetes

Ensure proper termination grace period:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60  # Should be > shutdown timeout
      containers:
      - name: api
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]  # Give LB time to deregister
```

### Docker

Ensure Docker allows sufficient time:

```dockerfile
# Dockerfile
STOPSIGNAL SIGTERM
```

```bash
# docker-compose.yml
services:
  api:
    stop_grace_period: 60s
```

### PM2

Configure PM2 for graceful shutdown:

```json
{
  "apps": [{
    "name": "api",
    "script": "dist/main.js",
    "kill_timeout": 60000,
    "wait_ready": true,
    "listen_timeout": 10000
  }]
}
```

## Signal Handling

| Signal | Source | Behavior |
|--------|--------|----------|
| `SIGTERM` | Kubernetes, Docker, PM2 | Graceful shutdown with full cleanup |
| `SIGINT` | Ctrl+C in terminal | Graceful shutdown with full cleanup |
| `uncaughtException` | Unhandled errors | Log error, then graceful shutdown with exit code 1 |
| `unhandledRejection` | Unhandled promise rejections | Log error, then graceful shutdown with exit code 1 |

## Logging

Shutdown progress is logged at each step:

```
[Bootstrap] SIGTERM signal received: closing HTTP server
[ShutdownService] Received SIGTERM signal, initiating graceful shutdown...
[ShutdownService] Step 1/4: Stopped accepting new requests
[ShutdownService] Waiting for 5 active requests to complete... (3s elapsed)
[ShutdownService] Step 2/4: All in-flight requests completed
[ShutdownService] Closing database connection pool...
[ShutdownService] Database connection pool closed
[ShutdownService] Step 3/4: Database connections closed
[ShutdownService] Closing Redis/cache connections...
[ShutdownService] Redis cache connection closed
[ShutdownService] Step 4/4: Cache connections closed
[ShutdownService] Graceful shutdown completed successfully
```

## Testing

### Manual Testing

```bash
# Start the server
npm run start:dev

# In another terminal, send SIGTERM
pkill -SIGTERM node

# Or send SIGINT (Ctrl+C)
# Press Ctrl+C in the server terminal
```

### Load Testing During Shutdown

```bash
# Terminal 1: Start server
npm run start:dev

# Terminal 2: Generate load
ab -n 1000 -c 10 http://localhost:3000/api/v1/health/

# Terminal 3: Send shutdown signal
pkill -SIGTERM node

# Observe that:
# 1. New requests get 503
# 2. In-flight requests complete
# 3. Server waits for all requests
# 4. Clean shutdown occurs
```

## Best Practices

1. **Always use graceful shutdown in production** - Prevents data loss and connection leaks
2. **Set appropriate timeouts** - Balance between quick shutdown and request completion
3. **Monitor shutdown metrics** - Track shutdown duration and active requests
4. **Test shutdown under load** - Ensure it works with real traffic patterns
5. **Configure orchestrators properly** - Ensure grace periods are longer than shutdown timeout
6. **Use health checks** - Load balancers should deregister pods before shutdown completes

## Troubleshooting

### Shutdown Timeout Reached

If you see warnings about timeout being reached:

```
[ShutdownService] Shutdown timeout reached with 3 active requests. Forcing shutdown.
```

**Solutions:**
- Increase shutdown timeout: `shutdownService.setShutdownTimeout(60000)`
- Investigate long-running requests
- Check for requests that aren't completing (hung connections)

### Connections Not Closing

If database or Redis connections don't close:

```
[ShutdownService] Error closing database connections: ...
```

**Solutions:**
- Check TypeORM configuration
- Verify Redis connection settings
- Check for connection pool leaks

### New Requests During Shutdown

If new requests are accepted during shutdown:

```
[ShutdownMiddleware] Received request while shutting down
```

**Solutions:**
- Verify ShutdownMiddleware is registered globally
- Check middleware order (should be early in the chain)
- Ensure load balancer respects health check status

## Future Enhancements

- [ ] Metrics/monitoring integration (Prometheus)
- [ ] Webhook notification on shutdown
- [ ] Configurable shutdown steps (skip certain steps)
- [ ] Drain mode (stop accepting writes but allow reads)
- [ ] Graceful job/queue worker shutdown
