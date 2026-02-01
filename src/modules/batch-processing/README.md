# Batch Processing Module

Enterprise-grade batch processing module with Bull queue integration for handling bulk operations efficiently.

## Features

- **Bulk KYC Processing**: Process KYC verifications for multiple users
- **Mass Notifications**: Send notifications to large user groups
- **Scheduled Reports**: Generate and deliver reports on schedule
- **Data Exports**: Export user data for GDPR compliance and backups
- **Queue Management**: Pause, resume, and monitor job queues
- **Retry Logic**: Automatic retry with exponential backoff
- **Progress Tracking**: Real-time progress updates
- **Scheduled Jobs**: Schedule jobs for future execution

## Installation

### 1. Install Dependencies

```bash
npm install @nestjs/bull bull
npm install --save-dev @types/bull
```

### 2. Configure Redis

Update your `.env` file:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 3. Run Migration

```bash
npm run migration:run
```

### 4. Register Module

Add to `app.module.ts`:

```typescript
import { BullModule } from '@nestjs/bull';
import { BatchProcessingModule } from './modules/batch-processing/batch-processing.module';

@Module({
  imports: [
    // ... other imports

    // Bull Queue Configuration
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

    BatchProcessingModule,
  ],
})
export class AppModule {}
```

## Architecture

```
batch-processing/
├── application/
│   ├── controllers/          # REST endpoints
│   │   ├── batch-job.controller.ts
│   │   └── admin-batch-job.controller.ts
│   ├── services/             # Business logic
│   │   └── batch-job.service.ts
│   └── dto/                  # Data transfer objects
│       ├── create-batch-job.dto.ts
│       ├── update-batch-job.dto.ts
│       └── batch-job-filters.dto.ts
│
├── domain/
│   ├── entities/             # Domain entities
│   │   └── batch-job.entity.ts
│   ├── repositories/         # Repository interfaces
│   │   └── batch-job.repository.ts
│   └── interfaces/           # Processor interfaces
│       └── batch-processor.interface.ts
│
└── infrastructure/
    ├── orm-entities/         # TypeORM entities
    │   └── batch-job.orm-entity.ts
    ├── repositories/         # Repository implementations
    │   └── typeorm-batch-job.repository.ts
    ├── queues/               # Bull queue services
    │   └── batch-queue.service.ts
    └── processors/           # Job processors
        ├── bulk-kyc.processor.ts
        ├── mass-notification.processor.ts
        ├── scheduled-report.processor.ts
        └── data-export.processor.ts
```

## API Endpoints

### User Endpoints

#### Create Batch Job
```http
POST /batch-jobs
Authorization: Bearer {token}

{
  "type": "bulk_kyc",
  "name": "Q1 2024 KYC Verification",
  "description": "Bulk KYC processing for new users",
  "priority": 10,
  "payload": {
    "userIds": ["user-1", "user-2"],
    "kycLevel": "advanced",
    "autoApprove": false,
    "notifyUsers": true
  },
  "estimatedItemCount": 2,
  "maxRetries": 3
}
```

#### Get User's Batch Jobs
```http
GET /batch-jobs/me
Authorization: Bearer {token}
```

#### Get Batch Job by ID
```http
GET /batch-jobs/:id
Authorization: Bearer {token}
```

#### Get Batch Jobs with Filters
```http
GET /batch-jobs?type=bulk_kyc&status=completed
Authorization: Bearer {token}
```

#### Get Metrics
```http
GET /batch-jobs/metrics
Authorization: Bearer {token}
```

#### Cancel Batch Job
```http
POST /batch-jobs/:id/cancel
Authorization: Bearer {token}
```

#### Update Batch Job
```http
PUT /batch-jobs/:id
Authorization: Bearer {token}

{
  "name": "Updated Job Name",
  "description": "Updated description"
}
```

#### Delete Batch Job
```http
DELETE /batch-jobs/:id
Authorization: Bearer {token}
```

### Admin Endpoints

#### Get All Batch Jobs
```http
GET /admin/batch-jobs
Authorization: Bearer {admin-token}
```

#### Get All Metrics
```http
GET /admin/batch-jobs/metrics
Authorization: Bearer {admin-token}
```

#### Pause Queue
```http
POST /admin/batch-jobs/queue/pause
Authorization: Bearer {admin-token}
```

#### Resume Queue
```http
POST /admin/batch-jobs/queue/resume
Authorization: Bearer {admin-token}
```

#### Clean Queue
```http
POST /admin/batch-jobs/queue/clean
Authorization: Bearer {admin-token}
```

## Job Types

### 1. Bulk KYC Processing

Process KYC verifications for multiple users.

```typescript
{
  "type": "bulk_kyc",
  "name": "Bulk KYC Verification",
  "payload": {
    "userIds": ["user-1", "user-2", "user-3"],
    "kycLevel": "advanced",
    "autoApprove": false,
    "notifyUsers": true
  }
}
```

### 2. Mass Notifications

Send notifications to multiple users.

```typescript
{
  "type": "mass_notification",
  "name": "Product Launch Announcement",
  "payload": {
    "userIds": ["user-1", "user-2"],
    // OR use filters
    "userFilters": {
      "kycStatus": "verified",
      "country": "CI"
    },
    "notification": {
      "title": "New Feature Available",
      "message": "Check out our new feature...",
      "type": "push",
      "priority": "high"
    }
  }
}
```

### 3. Scheduled Reports

Generate reports on a schedule.

```typescript
{
  "type": "scheduled_report",
  "name": "Monthly Transaction Report",
  "payload": {
    "reportType": "transaction",
    "format": "xlsx",
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "recipients": ["admin@example.com"],
    "includeCharts": true
  }
}
```

### 4. Data Export

Export user data for GDPR compliance.

```typescript
{
  "type": "data_export",
  "name": "User Data Export",
  "payload": {
    "exportType": "full_account",
    "userId": "user-123",
    "format": "json",
    "includeAttachments": true,
    "encryption": {
      "enabled": true,
      "password": "secure-password"
    }
  }
}
```

## Job Statuses

- `pending`: Job created but not yet queued
- `queued`: Job added to queue, waiting for processing
- `processing`: Job currently being processed
- `completed`: Job completed successfully
- `partially_completed`: Some items succeeded, some failed
- `failed`: Job failed completely
- `cancelled`: Job was cancelled by user

## Job Priorities

- `LOW = 1`: Low priority jobs
- `NORMAL = 5`: Default priority
- `HIGH = 10`: High priority jobs
- `CRITICAL = 15`: Critical jobs processed first

## Scheduled Tasks

The module includes automatic scheduled tasks:

### Process Pending Jobs
Runs every minute to queue pending jobs.

### Handle Stuck Jobs
Runs every 5 minutes to retry or fail stuck jobs.

### Clean Old Jobs
Runs daily at 2 AM to clean completed jobs from queue.

## Monitoring

### Job Metrics
```json
{
  "jobs": {
    "total": 150,
    "pending": 10,
    "processing": 5,
    "completed": 130,
    "failed": 5
  },
  "queue": {
    "waiting": 10,
    "active": 5,
    "completed": 1250,
    "failed": 15,
    "delayed": 3
  }
}
```

## Error Handling

- Automatic retry with exponential backoff
- Configurable max retry attempts (default: 3)
- Detailed error logging with stack traces
- Failed job retention for debugging

## Rate Limiting

Queue is configured with rate limiting:
- Max 10 jobs per second
- Prevents system overload
- Configurable per environment

## Best Practices

1. **Set Realistic Estimates**: Provide accurate `estimatedItemCount` for better progress tracking
2. **Use Priority Wisely**: Reserve `CRITICAL` priority for urgent jobs
3. **Schedule Large Jobs**: Use `scheduledAt` for large jobs during off-peak hours
4. **Monitor Failed Jobs**: Regularly check failed jobs and investigate errors
5. **Clean Up**: Delete old completed jobs to save storage
6. **Test Payloads**: Validate payloads before creating jobs
7. **Use Encryption**: Enable encryption for sensitive data exports

## Security

- JWT authentication required for all endpoints
- User can only access their own jobs
- Admin endpoints require admin role (TODO: implement AdminGuard)
- Sensitive data encrypted in exports
- Audit trail via `createdBy` field

## Performance

- Redis-backed queue for high performance
- Concurrent processing with configurable workers
- Connection pooling for database operations
- Efficient indexing for fast queries
- Progress tracking without database overhead

## Extending

### Add New Job Type

1. Create processor implementing `IBatchProcessor`
2. Register in `batch-queue.service.ts`
3. Add to `BatchJobType` enum
4. Update validation and documentation

```typescript
@Injectable()
export class CustomProcessor implements IBatchProcessor {
  async process(job: BatchJob): Promise<BatchProcessorResult> {
    // Implementation
  }

  async validatePayload(payload: any): Promise<boolean> {
    // Validation
  }

  getEstimatedDuration(itemCount: number): number {
    // Estimate
  }
}
```

## Troubleshooting

### Jobs Not Processing
- Check Redis connection
- Verify queue is not paused
- Check worker processes are running

### Stuck Jobs
- Automatic recovery runs every 5 minutes
- Manually check `/admin/batch-jobs/metrics`
- Check logs for errors

### High Failure Rate
- Review error logs
- Check external service availability
- Verify payload validation

## License

Proprietary - JoonaPay
