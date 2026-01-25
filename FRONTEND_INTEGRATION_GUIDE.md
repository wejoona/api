# Frontend Integration Guide - Admin Dashboard

## Quick Start

The admin dashboard now provides real transaction data with time-series analytics. All endpoints are cached for 1 minute and return comprehensive statistics in a single API call.

## Base Endpoints

```
BASE_URL: http://localhost:3000 (development)
BASE_URL: https://api.joonapay.com (production)
```

All endpoints require admin authentication:
```
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

## 1. Basic Dashboard Stats

### Endpoint
```
GET /admin/dashboard
```

### Response
```typescript
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
```

### Example Response
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

### React Example
```typescript
import { useEffect, useState } from 'react';

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

function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/admin/dashboard', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="dashboard-grid">
      <StatCard
        title="Total Users"
        value={stats.totalUsers}
        change={`${stats.activeUsers} active`}
      />
      <StatCard
        title="Total Transactions"
        value={stats.totalTransactions.toLocaleString()}
        change={`${stats.pendingTransactions} pending`}
      />
      <StatCard
        title="Total Volume"
        value={`$${stats.totalVolume.toFixed(2)}`}
        change={`$${stats.todayVolume.toFixed(2)} today`}
      />
    </div>
  );
}
```

## 2. Enhanced Dashboard with Charts

### Endpoint
```
GET /admin/dashboard/enhanced?days=30
```

### Query Parameters
- `days` (optional): Number of days for time-series data (1-365, default: 30)

### Response
```typescript
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

### Example Response
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
  "todayVolume": 2340.25,
  "transactionTimeSeries": [
    {
      "date": "2026-01-20",
      "count": 125,
      "volume": 5420.75
    },
    {
      "date": "2026-01-21",
      "count": 132,
      "volume": 5890.50
    }
  ],
  "userGrowthTimeSeries": [
    {
      "date": "2026-01-20",
      "newUsers": 15,
      "totalUsers": 1200
    },
    {
      "date": "2026-01-21",
      "newUsers": 18,
      "totalUsers": 1218
    }
  ],
  "transactionsByType": {
    "deposit": 1250,
    "withdrawal": 850,
    "internal_transfer": 2340,
    "external_transfer": 980
  },
  "transactionsByStatus": {
    "pending": 23,
    "completed": 5320,
    "failed": 77
  }
}
```

### React + Chart.js Example
```typescript
import { Line, Doughnut } from 'react-chartjs-2';
import { useEffect, useState } from 'react';

function EnhancedDashboard() {
  const [data, setData] = useState(null);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    fetch(`/admin/dashboard/enhanced?days=${timeRange}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    })
      .then(res => res.json())
      .then(setData);
  }, [timeRange]);

  if (!data) return <div>Loading...</div>;

  // Prepare transaction volume chart data
  const volumeChartData = {
    labels: data.transactionTimeSeries.map(item => item.date),
    datasets: [
      {
        label: 'Transaction Volume',
        data: data.transactionTimeSeries.map(item => item.volume),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      },
      {
        label: 'Transaction Count',
        data: data.transactionTimeSeries.map(item => item.count),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        yAxisID: 'y1',
      }
    ]
  };

  // Prepare user growth chart data
  const userGrowthChartData = {
    labels: data.userGrowthTimeSeries.map(item => item.date),
    datasets: [
      {
        label: 'Total Users',
        data: data.userGrowthTimeSeries.map(item => item.totalUsers),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
      }
    ]
  };

  // Prepare transaction type distribution
  const typeDistributionData = {
    labels: Object.keys(data.transactionsByType),
    datasets: [{
      data: Object.values(data.transactionsByType),
      backgroundColor: [
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
      ]
    }]
  };

  return (
    <div className="enhanced-dashboard">
      <div className="time-range-selector">
        <button onClick={() => setTimeRange(7)}>7 days</button>
        <button onClick={() => setTimeRange(30)}>30 days</button>
        <button onClick={() => setTimeRange(90)}>90 days</button>
      </div>

      <div className="chart-grid">
        <div className="chart-container">
          <h3>Transaction Volume & Count</h3>
          <Line
            data={volumeChartData}
            options={{
              scales: {
                y: { type: 'linear', position: 'left' },
                y1: { type: 'linear', position: 'right' }
              }
            }}
          />
        </div>

        <div className="chart-container">
          <h3>User Growth</h3>
          <Line data={userGrowthChartData} />
        </div>

        <div className="chart-container">
          <h3>Transaction Types</h3>
          <Doughnut data={typeDistributionData} />
        </div>
      </div>
    </div>
  );
}
```

### Vue 3 + ApexCharts Example
```vue
<template>
  <div class="dashboard">
    <div class="controls">
      <select v-model="timeRange" @change="loadData">
        <option :value="7">Last 7 days</option>
        <option :value="30">Last 30 days</option>
        <option :value="90">Last 90 days</option>
      </select>
    </div>

    <div class="charts" v-if="dashboardData">
      <apexchart
        type="line"
        :options="volumeChartOptions"
        :series="volumeChartSeries"
      />

      <apexchart
        type="area"
        :options="userGrowthOptions"
        :series="userGrowthSeries"
      />

      <apexchart
        type="donut"
        :options="typeDistributionOptions"
        :series="typeDistributionSeries"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import VueApexCharts from 'vue3-apexcharts';

const timeRange = ref(30);
const dashboardData = ref(null);

const loadData = async () => {
  const response = await fetch(
    `/admin/dashboard/enhanced?days=${timeRange.value}`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    }
  );
  dashboardData.value = await response.json();
};

const volumeChartSeries = computed(() => [
  {
    name: 'Volume',
    type: 'column',
    data: dashboardData.value?.transactionTimeSeries.map(item => item.volume) || []
  },
  {
    name: 'Count',
    type: 'line',
    data: dashboardData.value?.transactionTimeSeries.map(item => item.count) || []
  }
]);

const volumeChartOptions = computed(() => ({
  chart: { type: 'line' },
  xaxis: {
    categories: dashboardData.value?.transactionTimeSeries.map(item => item.date) || []
  }
}));

onMounted(loadData);
</script>
```

## 3. Cache Management

### Invalidate Cache
Use this when you want to force a refresh of dashboard data (e.g., after bulk operations).

### Endpoint
```
POST /admin/dashboard/cache/invalidate
```

### Example
```typescript
async function refreshDashboard() {
  await fetch('/admin/dashboard/cache/invalidate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
    }
  });

  // Reload dashboard data
  const freshData = await fetch('/admin/dashboard/enhanced?days=30', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
    }
  });

  return freshData.json();
}
```

## UI Component Examples

### Stat Card Component
```typescript
interface StatCardProps {
  title: string;
  value: number | string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

function StatCard({ title, value, change, trend, icon }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <div className="stat-value">{value}</div>
      {change && (
        <div className={`stat-change ${trend}`}>
          {change}
        </div>
      )}
    </div>
  );
}

// Usage
<StatCard
  title="Total Volume"
  value={`$${stats.totalVolume.toLocaleString()}`}
  change={`$${stats.todayVolume.toLocaleString()} today`}
  trend="up"
  icon={<DollarIcon />}
/>
```

### Transaction Status Badge
```typescript
function TransactionStatusBadge({ stats }) {
  const total = stats.totalTransactions;
  const completed = stats.completedTransactions;
  const pending = stats.pendingTransactions;
  const failed = stats.failedTransactions;

  const completionRate = ((completed / total) * 100).toFixed(1);

  return (
    <div className="status-breakdown">
      <div className="completion-rate">
        <h4>Completion Rate</h4>
        <span className="big-number">{completionRate}%</span>
      </div>
      <div className="status-bars">
        <div className="status-bar">
          <span>Completed</span>
          <div className="bar">
            <div
              className="fill completed"
              style={{ width: `${(completed/total)*100}%` }}
            />
          </div>
          <span>{completed.toLocaleString()}</span>
        </div>
        <div className="status-bar">
          <span>Pending</span>
          <div className="bar">
            <div
              className="fill pending"
              style={{ width: `${(pending/total)*100}%` }}
            />
          </div>
          <span>{pending.toLocaleString()}</span>
        </div>
        <div className="status-bar">
          <span>Failed</span>
          <div className="bar">
            <div
              className="fill failed"
              style={{ width: `${(failed/total)*100}%` }}
            />
          </div>
          <span>{failed.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
```

## Best Practices

### 1. Polling Strategy
Don't poll too aggressively - the cache is 1 minute, so polling every 60 seconds is optimal.

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    loadDashboardData();
  }, 60000); // 60 seconds

  return () => clearInterval(interval);
}, []);
```

### 2. Loading States
Show skeleton loaders while data is being fetched.

```typescript
if (loading) {
  return <DashboardSkeleton />;
}
```

### 3. Error Handling
```typescript
try {
  const response = await fetch('/admin/dashboard/enhanced?days=30', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Handle unauthorized
      redirectToLogin();
    } else if (response.status === 403) {
      // Handle forbidden
      showError('Admin access required');
    } else {
      showError('Failed to load dashboard data');
    }
    return;
  }

  const data = await response.json();
  setDashboardData(data);
} catch (error) {
  showError('Network error - please try again');
}
```

### 4. Date Formatting
Use consistent date formatting across your app.

```typescript
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date);
}

// Usage in chart labels
const labels = data.transactionTimeSeries.map(item => formatDate(item.date));
```

### 5. Number Formatting
```typescript
// Currency
const formatted = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
}).format(stats.totalVolume);

// Abbreviated large numbers
function abbreviateNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
```

## Performance Tips

1. **Use the enhanced endpoint** when you need multiple data points - it's more efficient than multiple API calls
2. **Respect the cache** - don't invalidate unnecessarily
3. **Lazy load charts** - load chart libraries only when needed
4. **Debounce time range changes** - wait for user to stop clicking before fetching
5. **Use React.memo or Vue computed** to prevent unnecessary re-renders

## Common Issues

### Issue: 401 Unauthorized
**Solution**: Ensure your JWT token is valid and includes admin role

### Issue: Slow initial load
**Solution**: Use the basic endpoint first for quick stats, then load enhanced data

### Issue: Stale data
**Solution**: Call the cache invalidation endpoint after bulk operations

### Issue: Charts not rendering
**Solution**: Ensure data is loaded before rendering charts

```typescript
{data && data.transactionTimeSeries.length > 0 && (
  <Chart data={data.transactionTimeSeries} />
)}
```

## TypeScript Types

Create a types file for reusability:

```typescript
// types/admin-dashboard.ts
export interface DashboardStats {
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

export interface TransactionTimeSeriesItem {
  date: string;
  count: number;
  volume: number;
}

export interface UserGrowthTimeSeriesItem {
  date: string;
  newUsers: number;
  totalUsers: number;
}

export interface EnhancedDashboardStats extends DashboardStats {
  transactionTimeSeries: TransactionTimeSeriesItem[];
  userGrowthTimeSeries: UserGrowthTimeSeriesItem[];
  transactionsByType: Record<string, number>;
  transactionsByStatus: Record<string, number>;
}
```

## Support

For backend API issues, contact the backend team.
For frontend integration help, see the main frontend documentation.
