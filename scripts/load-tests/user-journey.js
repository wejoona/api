import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const balanceDuration = new Trend('balance_duration');
const transactionsDuration = new Trend('transactions_duration');
const depositDuration = new Trend('deposit_duration');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 100 },  // Ramp to 100 users
    { duration: '3m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],     // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],       // Less than 1% error rate
    errors: ['rate<0.01'],                // Less than 1% custom error rate
    balance_duration: ['p(95)<200'],      // Balance endpoint under 200ms
    transactions_duration: ['p(95)<300'], // Transactions endpoint under 300ms
    deposit_duration: ['p(95)<500'],      // Deposit endpoint under 500ms
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000/api/v1';
const TEST_TOKEN = __ENV.TEST_TOKEN || 'test-token-replace-with-actual';

export default function () {
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TEST_TOKEN}`,
  };

  // GROUP 1: Balance Check
  group('Balance Check', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/wallet`, { headers: authHeaders });
    balanceDuration.add(Date.now() - start);

    const success = check(res, {
      'balance status 200': (r) => r.status === 200,
      'balance has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.walletId !== undefined;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!success);
  });

  sleep(1);

  // GROUP 2: Transaction List
  group('Transaction List', () => {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/wallet/transactions?limit=20&offset=0`,
      { headers: authHeaders }
    );
    transactionsDuration.add(Date.now() - start);

    const success = check(res, {
      'transactions status 200': (r) => r.status === 200,
      'transactions has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.transactions);
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!success);
  });

  sleep(2);

  // GROUP 3: Get Exchange Rate
  group('Exchange Rate', () => {
    const res = http.get(
      `${BASE_URL}/wallet/rate?sourceCurrency=XOF&targetCurrency=USD&amount=10000`,
      { headers: authHeaders }
    );

    const success = check(res, {
      'rate status 200': (r) => r.status === 200,
      'rate has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.rate !== undefined;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!success);
  });

  sleep(1);

  // GROUP 4: Get Deposit Channels
  group('Deposit Channels', () => {
    const res = http.get(
      `${BASE_URL}/wallet/deposit/channels?currency=XOF`,
      { headers: authHeaders }
    );

    const success = check(res, {
      'channels status 200': (r) => r.status === 200,
      'channels has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.channels);
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!success);
  });

  sleep(2);

  // GROUP 5: KYC Status Check (read-only)
  group('KYC Status', () => {
    const res = http.get(
      `${BASE_URL}/wallet/kyc/status`,
      { headers: authHeaders }
    );

    const success = check(res, {
      'kyc status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
    errorRate.add(!success);
  });

  sleep(1);
}

/**
 * Setup function - runs once per VU at the start
 */
export function setup() {
  console.log('Starting load test against:', BASE_URL);
  console.log('Test token configured:', TEST_TOKEN ? 'Yes' : 'No');
}

/**
 * Teardown function - runs once at the end
 */
export function teardown(data) {
  console.log('Load test completed');
}
