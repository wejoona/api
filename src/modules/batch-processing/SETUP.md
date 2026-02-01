# Batch Processing Module - Setup Guide

## Step-by-Step Installation

### 1. Install Required Dependencies

```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet

# Install Bull and related packages
npm install @nestjs/bull bull
npm install --save-dev @types/bull
```

### 2. Update Configuration

#### Add Redis Configuration to `src/config/configuration.ts`

```typescript
export const configuration = () => ({
  // ... existing config

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },
});
```

#### Update Environment Variables

Add to `.env`:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 3. Register Bull Module Globally

Update `src/app.module.ts`:

```typescript
import { BullModule } from '@nestjs/bull';
import { BatchProcessingModule } from './modules/batch-processing/batch-processing.module';

@Module({
  imports: [
    // ... existing imports

    // Bull Queue Configuration (add after ConfigModule)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          db: configService.get<number>('redis.db'),
        },
      }),
    }),

    // ... other modules

    BatchProcessingModule, // Add this module
  ],
})
export class AppModule {}
```

### 4. Run Database Migration

```bash
npm run migration:run
```

### 5. Start Redis (if not running)

#### Using Docker

```bash
docker run -d \
  --name joonapay-redis \
  -p 6379:6379 \
  redis:7-alpine
```

#### Using Docker Compose

Add to `docker-compose.yml`:

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: joonapay-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

Then run:

```bash
docker-compose up -d redis
```

### 6. Verify Installation

Start the application:

```bash
npm run start:dev
```

Check logs for:
```
[BatchQueueService] Batch queue service initialized with processors
[BatchProcessingModule] Initialized
```

### 7. Test the Module

#### Create a Test Job

```bash
curl -X POST http://localhost:3000/batch-jobs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "bulk_kyc",
    "name": "Test Bulk KYC",
    "payload": {
      "userIds": ["user-1", "user-2"],
      "kycLevel": "basic",
      "autoApprove": false,
      "notifyUsers": true
    },
    "estimatedItemCount": 2
  }'
```

#### Check Job Status

```bash
curl http://localhost:3000/batch-jobs/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Check Metrics

```bash
curl http://localhost:3000/batch-jobs/metrics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Production Configuration

### Redis High Availability

For production, use Redis Cluster or Sentinel:

```typescript
BullModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    redis: {
      cluster: [
        {
          host: configService.get<string>('redis.host1'),
          port: configService.get<number>('redis.port1'),
        },
        {
          host: configService.get<string>('redis.host2'),
          port: configService.get<number>('redis.port2'),
        },
      ],
      password: configService.get<string>('redis.password'),
    },
  }),
}),
```

### Worker Processes

For better performance, run separate worker processes:

```bash
# Main API server (no workers)
BULL_DISABLE_WORKERS=true npm run start:prod

# Worker process 1
BULL_WORKER_ONLY=true npm run start:prod

# Worker process 2
BULL_WORKER_ONLY=true npm run start:prod
```

Update `main.ts`:

```typescript
if (process.env.BULL_DISABLE_WORKERS === 'true') {
  // Disable queue processing in API server
  app.get(BatchQueueService).pauseQueue();
}
```

### Monitoring

#### Bull Board (Optional)

Install Bull Board for UI monitoring:

```bash
npm install @bull-board/api @bull-board/express
```

Add to `app.module.ts`:

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

// In AppModule
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullAdapter(batchQueue)],
  serverAdapter,
});

// Mount in main.ts
app.use('/admin/queues', serverAdapter.getRouter());
```

Access at: `http://localhost:3000/admin/queues`

## Troubleshooting

### Issue: Jobs Not Processing

**Solution:**
1. Check Redis connection:
   ```bash
   redis-cli ping
   ```
2. Verify queue is not paused:
   ```bash
   curl -X POST http://localhost:3000/admin/batch-jobs/queue/resume \
     -H "Authorization: Bearer ADMIN_TOKEN"
   ```

### Issue: High Memory Usage

**Solution:**
1. Configure job retention:
   ```typescript
   BullModule.registerQueue({
     name: BATCH_QUEUE_NAME,
     defaultJobOptions: {
       removeOnComplete: 100, // Keep only last 100
       removeOnFail: 500,
     },
   })
   ```
2. Run cleanup regularly:
   ```bash
   curl -X POST http://localhost:3000/admin/batch-jobs/queue/clean \
     -H "Authorization: Bearer ADMIN_TOKEN"
   ```

### Issue: Stuck Jobs

**Solution:**
- Automatic recovery runs every 5 minutes
- Manually check:
  ```bash
  curl http://localhost:3000/admin/batch-jobs/metrics \
    -H "Authorization: Bearer ADMIN_TOKEN"
  ```

### Issue: Connection Timeout

**Solution:**
1. Increase Redis timeout:
   ```typescript
   redis: {
     connectTimeout: 10000,
     commandTimeout: 5000,
   }
   ```

## Environment-Specific Configuration

### Development

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
BULL_DISABLE_WORKERS=false
```

### Staging

```env
REDIS_HOST=staging-redis.internal
REDIS_PORT=6379
REDIS_PASSWORD=staging-password
REDIS_DB=1
BULL_DISABLE_WORKERS=false
```

### Production

```env
REDIS_HOST=prod-redis-cluster.internal
REDIS_PORT=6379
REDIS_PASSWORD=strong-production-password
REDIS_DB=0
BULL_DISABLE_WORKERS=true  # For API servers
# BULL_WORKER_ONLY=true    # For worker servers
```

## Kubernetes Deployment

### API Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: joonapay-api
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: joonapay/api:latest
        env:
        - name: BULL_DISABLE_WORKERS
          value: "true"
        - name: REDIS_HOST
          value: redis-service
```

### Worker Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: joonapay-worker
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: worker
        image: joonapay/api:latest
        env:
        - name: BULL_WORKER_ONLY
          value: "true"
        - name: REDIS_HOST
          value: redis-service
```

## Performance Tuning

### Queue Configuration

```typescript
BullModule.registerQueue({
  name: BATCH_QUEUE_NAME,
  limiter: {
    max: 10,        // Max 10 jobs
    duration: 1000, // per second
  },
  settings: {
    stalledInterval: 30000,     // Check every 30s
    maxStalledCount: 1,          // Fail after 1 stall
    guardInterval: 5000,         // Lock duration check
    retryProcessDelay: 5000,     // Retry delay
  },
})
```

### Concurrency

```typescript
@Processor(BATCH_QUEUE_NAME)
export class BatchQueueService {
  @Process({ concurrency: 5 }) // Process 5 jobs concurrently
  async processJob(job: Job): Promise<void> {
    // ...
  }
}
```

## Security Checklist

- [ ] Redis password configured
- [ ] Admin endpoints protected with AdminGuard
- [ ] Rate limiting enabled
- [ ] Job payloads validated
- [ ] Sensitive data encrypted in exports
- [ ] Audit logging enabled
- [ ] Network security (Redis not publicly accessible)

## Next Steps

1. Configure monitoring and alerting
2. Set up Bull Board for queue monitoring
3. Implement custom processors for your use cases
4. Configure backup and disaster recovery
5. Load test the system
6. Document team workflows

## Support

For issues or questions, contact the JoonaPay development team.
