# Admin Dashboard - Quick Reference Card

## API Endpoints

```bash
# Basic Dashboard Stats (cached 1min)
GET /admin/dashboard
Authorization: Bearer {token}

# Enhanced Dashboard (cached 1min)
GET /admin/dashboard/enhanced?days=30
Authorization: Bearer {token}

# Invalidate Cache
POST /admin/dashboard/cache/invalidate
Authorization: Bearer {token}

# User Growth Time-Series
GET /admin/reports/user-growth-timeseries?days=30
Authorization: Bearer {token}
```

## Key Files

```
Modified:
├── src/modules/transaction/infrastructure/repositories/transaction.repository.ts
├── src/modules/admin/application/services/admin.service.ts
├── src/modules/admin/application/controllers/admin.controller.ts
└── src/modules/admin/admin.module.ts

Created:
├── src/modules/admin/application/dto/dashboard-stats.dto.ts
├── src/modules/admin/application/services/admin.service.spec.ts
├── ADMIN_DASHBOARD_IMPLEMENTATION.md
├── IMPLEMENTATION_SUMMARY.md
├── FRONTEND_INTEGRATION_GUIDE.md
├── DASHBOARD_ARCHITECTURE.md
├── CHANGES_SUMMARY.txt
└── QUICK_REFERENCE.md (this file)
```

## New Methods - TransactionRepository

```typescript
// Get all transaction stats
await transactionRepository.getTransactionStats()
// Returns: { total, pending, completed, failed, totalVolume, todayVolume }

// Get time-series for charts
await transactionRepository.getTransactionTimeSeries(30)
// Returns: [{ date, count, volume }, ...]

// Get volume for date range
await transactionRepository.getVolumeByDateRange(startDate, endDate)
// Returns: number

// Get status/type distributions
await transactionRepository.getTransactionCountByStatus()
await transactionRepository.getTransactionCountByType()
// Returns: { status/type: count, ... }
```

## New Methods - AdminService

```typescript
// Basic dashboard stats (cached)
await adminService.getDashboardStats()

// Enhanced dashboard with charts (cached)
await adminService.getEnhancedDashboardStats(30)

// User growth time-series
await adminService.getUserGrowthTimeSeries(30)

// Clear cache
await adminService.invalidateDashboardCache()
```

## Response Examples

### Basic Dashboard
```json
{
  "totalUsers": 1250,
  "activeUsers": 1100,
  "suspendedUsers": 15,
  "kycPendingUsers": 45,
  "kycApprovedUsers": 890,
  "totalTransactions": 5420,
  "pendingTransactions": 23,
  "completedTransactions": 5320,
  "failedTransactions": 77,
  "totalVolume": 125000.50,
  "todayVolume": 2340.25
}
```

### Enhanced Dashboard
```json
{
  ...basicStats,
  "transactionTimeSeries": [
    { "date": "2026-01-20", "count": 125, "volume": 5420.75 }
  ],
  "userGrowthTimeSeries": [
    { "date": "2026-01-20", "newUsers": 15, "totalUsers": 1200 }
  ],
  "transactionsByType": {
    "deposit": 1250,
    "withdrawal": 850
  },
  "transactionsByStatus": {
    "pending": 23,
    "completed": 5320
  }
}
```

## React Hook Example

```typescript
import { useState, useEffect } from 'react';

function useDashboard(days = 30) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/admin/dashboard/enhanced?days=${days}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [days]);

  return { data, loading, error };
}

// Usage
function Dashboard() {
  const { data, loading } = useDashboard(30);

  if (loading) return <Spinner />;

  return (
    <div>
      <StatCard value={data.totalUsers} label="Total Users" />
      <Chart data={data.transactionTimeSeries} />
    </div>
  );
}
```

## Testing

```bash
# Build check
npm run build

# Run unit tests
npm test -- admin.service.spec.ts

# Manual API test
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/admin/dashboard/enhanced?days=7
```

## Cache Keys

```
admin:dashboard:stats              # Basic stats
admin:dashboard:enhanced:7         # 7-day enhanced
admin:dashboard:enhanced:30        # 30-day enhanced
admin:dashboard:enhanced:90        # 90-day enhanced
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Cache Hit Response | < 5ms |
| Cache Miss Response | < 200ms |
| Cache Hit Rate | > 90% |
| Database Query Time | < 100ms |

## Common Commands

```bash
# Invalidate cache via curl
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/admin/dashboard/cache/invalidate

# Check Redis cache
redis-cli GET admin:dashboard:stats

# Monitor Redis
redis-cli MONITOR

# Check slow queries
psql -c "SELECT query, mean_exec_time FROM pg_stat_statements
         ORDER BY mean_exec_time DESC LIMIT 10;"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check JWT token validity |
| 403 Forbidden | Ensure user has admin role |
| Slow response | Check cache hit rate, DB query performance |
| Stale data | POST to /cache/invalidate |
| Empty time-series | Check date range, verify transactions exist |

## TypeScript Types

```typescript
// Add to your types file
interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  kycPendingUsers: number;
  kycApprovedUsers: number;
  totalTransactions: number;
  pendingTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
  totalVolume: number;
  todayVolume: number;
}

interface EnhancedDashboardStats extends DashboardStats {
  transactionTimeSeries: Array<{
    date: string;
    count: number;
    volume: number;
  }>;
  userGrowthTimeSeries: Array<{
    date: string;
    newUsers: number;
    totalUsers: number;
  }>;
  transactionsByType: Record<string, number>;
  transactionsByStatus: Record<string, number>;
}
```

## Documentation

- Full Guide: `ADMIN_DASHBOARD_IMPLEMENTATION.md`
- Architecture: `DASHBOARD_ARCHITECTURE.md`
- Frontend: `FRONTEND_INTEGRATION_GUIDE.md`
- Summary: `IMPLEMENTATION_SUMMARY.md`
- Changes: `CHANGES_SUMMARY.txt`

## Support

- Backend Issues: Backend team
- Frontend Integration: See `FRONTEND_INTEGRATION_GUIDE.md`
- Deployment: DevOps team
