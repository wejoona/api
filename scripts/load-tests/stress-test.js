import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const totalRequests = new Counter('total_requests');
const failedRequests = new Counter('failed_requests');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp to 200 users
    { duration: '5m', target: 200 },   // Stay at 200 users
    { duration: '2m', target: 300 },   // Spike to 300 users
    { duration: '3m', target: 300 },   // Stay at 300 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<1000'],    // 99% of requests under 1s
    http_req_failed: ['rate<0.05'],       // Less than 5% error rate
    errors: ['rate<0.05'],
    request_duration: ['p(99)<1000'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000/api/v1';
const TEST_TOKEN = __ENV.TEST_TOKEN || 'test-token-replace-with-actual';

export default function () {
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TEST_TOKEN}`,
  };

  // Randomly select one of several endpoints to stress test
  const endpoints = [
    {
      name: 'Balance',
      url: `${BASE_URL}/wallet`,
      method: 'GET',
    },
    {
      name: 'Transactions',
      url: `${BASE_URL}/wallet/transactions?limit=50&offset=0`,
      method: 'GET',
    },
    {
      name: 'Rate',
      url: `${BASE_URL}/wallet/rate?sourceCurrency=XOF&targetCurrency=USD&amount=10000`,
      method: 'GET',
    },
    {
      name: 'Deposit Channels',
      url: `${BASE_URL}/wallet/deposit/channels`,
      method: 'GET',
    },
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  group(`Stress Test: ${endpoint.name}`, () => {
    totalRequests.add(1);
    const start = Date.now();

    let res;
    if (endpoint.method === 'GET') {
      res = http.get(endpoint.url, { headers: authHeaders });
    } else {
      res = http.post(endpoint.url, JSON.stringify(endpoint.body || {}), {
        headers: authHeaders,
      });
    }

    const duration = Date.now() - start;
    requestDuration.add(duration);

    const success = check(res, {
      'status is 2xx': (r) => r.status >= 200 && r.status < 300,
      'response time < 1s': () => duration < 1000,
    });

    if (!success) {
      failedRequests.add(1);
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  });

  // Minimal sleep to maximize load
  sleep(0.1);
}

export function setup() {
  console.log('Starting stress test against:', BASE_URL);
  console.log('Max concurrent users: 300');
}

export function teardown(data) {
  console.log('Stress test completed');
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'stress-test-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options?.indent || '';
  const enableColors = options?.enableColors || false;

  let summary = '\n';
  summary += `${indent}Stress Test Summary:\n`;
  summary += `${indent}====================\n\n`;

  if (data.metrics.iterations) {
    summary += `${indent}Iterations: ${data.metrics.iterations.values.count}\n`;
  }

  if (data.metrics.http_reqs) {
    summary += `${indent}HTTP Requests: ${data.metrics.http_reqs.values.count}\n`;
  }

  if (data.metrics.http_req_failed) {
    const failRate = (data.metrics.http_req_failed.values.rate * 100).toFixed(2);
    summary += `${indent}Failed Requests: ${failRate}%\n`;
  }

  if (data.metrics.http_req_duration) {
    summary += `${indent}\nRequest Duration:\n`;
    summary += `${indent}  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  Min: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms\n`;
    summary += `${indent}  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n`;
    summary += `${indent}  p(95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `${indent}  p(99): ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  }

  summary += '\n';
  return summary;
}
