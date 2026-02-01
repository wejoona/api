# Batch Processing - Usage Examples

## Table of Contents

1. [Bulk KYC Processing](#bulk-kyc-processing)
2. [Mass Notifications](#mass-notifications)
3. [Scheduled Reports](#scheduled-reports)
4. [Data Exports](#data-exports)
5. [Advanced Examples](#advanced-examples)

---

## Bulk KYC Processing

### Basic Bulk KYC Verification

```typescript
// Create a bulk KYC job for multiple users
const createBulkKycJob = async () => {
  const response = await fetch('http://localhost:3000/batch-jobs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'bulk_kyc',
      name: 'Q1 2024 KYC Verification',
      description: 'Quarterly KYC verification for all pending users',
      priority: 10,
      payload: {
        userIds: [
          'user-001',
          'user-002',
          'user-003',
          'user-004',
          'user-005',
        ],
        kycLevel: 'advanced',
        autoApprove: false,
        notifyUsers: true,
      },
      estimatedItemCount: 5,
      maxRetries: 3,
    }),
  });

  const result = await response.json();
  console.log('Job created:', result.data.id);
};
```

### High-Priority KYC Processing

```typescript
const urgentKycVerification = {
  type: 'bulk_kyc',
  name: 'Urgent KYC - High Value Customers',
  priority: 15, // CRITICAL priority
  payload: {
    userIds: ['vip-user-001', 'vip-user-002'],
    kycLevel: 'premium',
    autoApprove: false,
    notifyUsers: true,
  },
  estimatedItemCount: 2,
  maxRetries: 5, // More retries for critical jobs
};
```

---

## Mass Notifications

### Push Notification to All Users

```typescript
const sendAppUpdate = {
  type: 'mass_notification',
  name: 'App Update Notification',
  description: 'Notify all users about new app version',
  payload: {
    // No userIds means all users (filtered by userFilters)
    userFilters: {
      kycStatus: 'verified',
      // Only verified users
    },
    notification: {
      title: 'New App Version Available',
      message: 'Update now to access exciting new features!',
      type: 'push',
      priority: 'high',
      metadata: {
        version: '2.0.0',
        downloadUrl: 'https://app.joonapay.com/download',
      },
    },
  },
};
```

### Targeted SMS Campaign

```typescript
const sendPromoSms = {
  type: 'mass_notification',
  name: 'Promo SMS - Côte d\'Ivoire Users',
  scheduledAt: '2024-12-25T09:00:00Z', // Christmas morning
  payload: {
    userFilters: {
      country: 'CI',
      accountType: 'premium',
      registeredBefore: '2024-01-01',
    },
    notification: {
      title: 'Holiday Promotion',
      message: 'Get 10% cashback on all transactions this week!',
      type: 'sms',
      priority: 'normal',
      metadata: {
        promoCode: 'HOLIDAY2024',
      },
    },
  },
};
```

### Email to Specific Users

```typescript
const sendWelcomeEmails = {
  type: 'mass_notification',
  name: 'Welcome Email Campaign',
  payload: {
    userIds: [
      'new-user-001',
      'new-user-002',
      'new-user-003',
    ],
    notification: {
      title: 'Welcome to JoonaPay!',
      message: 'Thank you for joining. Here\'s how to get started...',
      type: 'email',
      priority: 'normal',
      metadata: {
        template: 'welcome-email',
        includeGettingStartedGuide: true,
      },
    },
  },
};
```

### In-App Notification

```typescript
const sendInAppAnnouncement = {
  type: 'mass_notification',
  name: 'New Feature Announcement',
  payload: {
    userFilters: {
      kycStatus: 'verified',
    },
    notification: {
      title: 'Introducing Bill Payments',
      message: 'Pay your utility bills directly from your wallet!',
      type: 'in_app',
      priority: 'low',
      metadata: {
        action: 'navigate',
        route: '/bill-payments',
        icon: 'bill-payment',
      },
    },
  },
};
```

---

## Scheduled Reports

### Daily Transaction Report

```typescript
const dailyTransactionReport = {
  type: 'scheduled_report',
  name: 'Daily Transaction Report',
  scheduledAt: '2024-12-01T06:00:00Z', // 6 AM daily
  payload: {
    reportType: 'transaction',
    format: 'xlsx',
    dateRange: {
      startDate: '2024-11-30T00:00:00Z',
      endDate: '2024-11-30T23:59:59Z',
    },
    recipients: ['finance@joonapay.com', 'ops@joonapay.com'],
    includeCharts: true,
    groupBy: ['status', 'type'],
  },
};
```

### Monthly User Activity Report

```typescript
const monthlyActivityReport = {
  type: 'scheduled_report',
  name: 'November 2024 User Activity',
  payload: {
    reportType: 'user_activity',
    format: 'pdf',
    dateRange: {
      startDate: '2024-11-01T00:00:00Z',
      endDate: '2024-11-30T23:59:59Z',
    },
    filters: {
      country: 'CI',
      minTransactions: 1,
    },
    recipients: ['ceo@joonapay.com'],
    includeCharts: true,
  },
};
```

### Compliance Report

```typescript
const complianceReport = {
  type: 'scheduled_report',
  name: 'Q4 2024 Compliance Report',
  payload: {
    reportType: 'compliance',
    format: 'pdf',
    dateRange: {
      startDate: '2024-10-01T00:00:00Z',
      endDate: '2024-12-31T23:59:59Z',
    },
    recipients: [
      'compliance@joonapay.com',
      'legal@joonapay.com',
    ],
    includeCharts: false,
  },
};
```

### Revenue Report

```typescript
const revenueReport = {
  type: 'scheduled_report',
  name: 'Monthly Revenue Report',
  payload: {
    reportType: 'revenue',
    format: 'xlsx',
    dateRange: {
      startDate: '2024-11-01T00:00:00Z',
      endDate: '2024-11-30T23:59:59Z',
    },
    recipients: ['finance@joonapay.com'],
    includeCharts: true,
    groupBy: ['country', 'payment_method'],
  },
};
```

---

## Data Exports

### GDPR Data Export

```typescript
const gdprExport = {
  type: 'data_export',
  name: 'GDPR Data Export - User 123',
  payload: {
    exportType: 'full_account',
    userId: 'user-123',
    format: 'json',
    includeAttachments: true,
    dateRange: {
      startDate: '2020-01-01T00:00:00Z',
      endDate: '2024-12-01T23:59:59Z',
    },
    encryption: {
      enabled: true,
      password: 'user-provided-password',
    },
  },
};
```

### Transaction History Export

```typescript
const transactionExport = {
  type: 'data_export',
  name: 'Transaction History Export',
  payload: {
    exportType: 'transaction_history',
    userId: 'user-456',
    format: 'csv',
    dateRange: {
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-12-31T23:59:59Z',
    },
    includeAttachments: false,
  },
};
```

### Bulk User Data Export

```typescript
const bulkUserExport = {
  type: 'data_export',
  name: 'Bulk User Export - Migration',
  payload: {
    exportType: 'user_data',
    userIds: [
      'user-001',
      'user-002',
      'user-003',
      // ... up to 1000 users
    ],
    format: 'xlsx',
    includeAttachments: false,
    encryption: {
      enabled: true,
      password: 'secure-migration-password',
    },
  },
  estimatedItemCount: 1000,
};
```

### KYC Documents Export

```typescript
const kycDocumentsExport = {
  type: 'data_export',
  name: 'KYC Documents Archive',
  payload: {
    exportType: 'kyc_documents',
    userId: 'user-789',
    format: 'json',
    includeAttachments: true,
    encryption: {
      enabled: true,
      password: 'kyc-archive-password',
    },
  },
};
```

---

## Advanced Examples

### Chained Jobs

```typescript
// Create multiple related jobs
const createChainedJobs = async () => {
  // Step 1: Export data
  const exportJob = await createBatchJob({
    type: 'data_export',
    name: 'Export for Migration',
    payload: {
      exportType: 'user_data',
      userIds: ['user-001', 'user-002'],
      format: 'json',
    },
  });

  // Step 2: Wait for export to complete, then send notification
  setTimeout(async () => {
    const notificationJob = await createBatchJob({
      type: 'mass_notification',
      name: 'Migration Complete Notification',
      payload: {
        userIds: ['user-001', 'user-002'],
        notification: {
          title: 'Data Export Complete',
          message: 'Your data export is ready for download',
          type: 'email',
        },
      },
    });
  }, 60000); // Check after 1 minute
};
```

### Monitoring Job Progress

```typescript
const monitorJobProgress = async (jobId: string) => {
  const interval = setInterval(async () => {
    const response = await fetch(`http://localhost:3000/batch-jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const { data: job } = await response.json();

    console.log(`Progress: ${job.metrics.progress}%`);
    console.log(`Processed: ${job.metrics.processedItems}/${job.metrics.totalItems}`);
    console.log(`Status: ${job.status}`);

    if (job.status === 'completed' || job.status === 'failed') {
      clearInterval(interval);
      console.log('Job finished:', job.status);

      if (job.resultFileUrl) {
        console.log('Download results:', job.resultFileUrl);
      }
    }
  }, 5000); // Check every 5 seconds
};
```

### Cancelling a Job

```typescript
const cancelJob = async (jobId: string) => {
  const response = await fetch(
    `http://localhost:3000/batch-jobs/${jobId}/cancel`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  const result = await response.json();
  console.log(result.message); // "Batch job cancelled successfully"
};
```

### Getting Metrics

```typescript
const getMetrics = async () => {
  const response = await fetch('http://localhost:3000/batch-jobs/metrics', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const { data } = await response.json();

  console.log('Job Metrics:', data.jobs);
  // {
  //   total: 150,
  //   pending: 10,
  //   processing: 5,
  //   completed: 130,
  //   failed: 5
  // }

  console.log('Queue Metrics:', data.queue);
  // {
  //   waiting: 10,
  //   active: 5,
  //   completed: 1250,
  //   failed: 15,
  //   delayed: 3
  // }
};
```

### Filtering Jobs

```typescript
const filterJobs = async () => {
  const params = new URLSearchParams({
    type: 'bulk_kyc',
    status: 'completed',
    createdAfter: '2024-11-01T00:00:00Z',
    createdBefore: '2024-11-30T23:59:59Z',
  });

  const response = await fetch(
    `http://localhost:3000/batch-jobs?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  const { data: jobs, count } = await response.json();
  console.log(`Found ${count} jobs`);
};
```

### Admin Queue Management

```typescript
// Pause queue during maintenance
const pauseQueue = async () => {
  await fetch('http://localhost:3000/admin/batch-jobs/queue/pause', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
};

// Resume queue after maintenance
const resumeQueue = async () => {
  await fetch('http://localhost:3000/admin/batch-jobs/queue/resume', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
};

// Clean old jobs
const cleanQueue = async () => {
  await fetch('http://localhost:3000/admin/batch-jobs/queue/clean', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
};
```

---

## Integration Examples

### React Hook

```typescript
import { useState, useEffect } from 'react';

const useBatchJob = (jobId: string) => {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJob = async () => {
      const response = await fetch(`/batch-jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const { data } = await response.json();
      setJob(data);
      setLoading(false);

      // Continue polling if job is in progress
      if (!['completed', 'failed', 'cancelled'].includes(data.status)) {
        setTimeout(fetchJob, 5000);
      }
    };

    fetchJob();
  }, [jobId]);

  return { job, loading };
};
```

### Service Class

```typescript
export class BatchJobApiService {
  constructor(private httpClient: HttpClient) {}

  async createBulkKycJob(userIds: string[]) {
    return this.httpClient.post('/batch-jobs', {
      type: 'bulk_kyc',
      name: `Bulk KYC - ${new Date().toISOString()}`,
      payload: {
        userIds,
        kycLevel: 'advanced',
        autoApprove: false,
        notifyUsers: true,
      },
      estimatedItemCount: userIds.length,
    });
  }

  async monitorJob(jobId: string): Promise<Observable<BatchJob>> {
    return interval(5000).pipe(
      switchMap(() => this.httpClient.get(`/batch-jobs/${jobId}`)),
      map(response => response.data),
      takeWhile(job => !job.isCompleted(), true)
    );
  }
}
```

---

## Best Practices

1. **Always provide meaningful job names** for easier tracking
2. **Set appropriate priorities** - reserve CRITICAL for urgent jobs only
3. **Use estimatedItemCount** for accurate progress tracking
4. **Schedule large jobs** during off-peak hours
5. **Monitor job status** for critical operations
6. **Handle failures** gracefully in your application
7. **Clean up old jobs** regularly to save storage
8. **Use encryption** for sensitive data exports

---

For more information, see [README.md](./README.md) and [SETUP.md](./SETUP.md).
