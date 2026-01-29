/**
 * Basic k6 Load Test Example
 *
 * This is a simple example to help you understand k6 basics
 * and test your setup.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metric
const successRate = new Rate('success_rate');

// Test configuration
export const options = {
  // Virtual Users (VUs) and duration
  vus: 10,
  duration: '30s',

  // Or use stages for ramping
  // stages: [
  //   { duration: '10s', target: 10 },
  //   { duration: '20s', target: 10 },
  //   { duration: '10s', target: 0 },
  // ],

  // Performance thresholds
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% errors
    success_rate: ['rate>0.99'],      // Over 99% success
  },
};

export default function () {
  // Make HTTP request
  const response = http.get('https://api-dev.joonapay.com/health');

  // Check response
  const passed = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Record custom metric
  successRate.add(passed);

  // Simulate user "think time"
  sleep(1);
}

// Optional: Setup runs once before all VUs
export function setup() {
  console.log('Setting up test...');
  return { timestamp: new Date().toISOString() };
}

// Optional: Teardown runs once after all VUs
export function teardown(data) {
  console.log('Test completed at:', data.timestamp);
}
