import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics
const walletBalanceSuccessRate = new Rate('wallet_balance_success');
const walletBalanceDuration = new Trend('wallet_balance_duration');
const transactionHistorySuccessRate = new Rate('transaction_history_success');
const transactionHistoryDuration = new Trend('transaction_history_duration');
const transactionDetailSuccessRate = new Rate('transaction_detail_success');
const walletErrors = new Counter('wallet_errors');
const concurrentUsers = new Gauge('concurrent_users');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://api-dev.joonapay.com';
const TARGET_RPS = parseInt(__ENV.TARGET_RPS) || 1000;

export const options = {
  stages: [
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 500 }, // Maintain 500 users
    { duration: '3m', target: 1000 }, // Push to 1000 users
    { duration: '5m', target: 1000 }, // Maintain 1000 users
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    // HTTP metrics
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    http_reqs: [`rate>${TARGET_RPS}`], // Target requests per second

    // Wallet-specific metrics
    wallet_balance_success: ['rate>0.99'],
    wallet_balance_duration: ['p(95)<400', 'p(99)<800'],
    transaction_history_success: ['rate>0.99'],
    transaction_history_duration: ['p(95)<600', 'p(99)<1200'],
    transaction_detail_success: ['rate>0.99'],
  },
};

// Setup: Authenticate users
export function setup() {
  const users = [];
  const numUsers = 100; // Pre-authenticate 100 users

  console.log(`Setting up ${numUsers} authenticated users...`);

  for (let i = 0; i < numUsers; i++) {
    const phone = `+225${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;

    // Register
    const registerPayload = JSON.stringify({
      phone: phone,
      countryCode: 'CI',
    });

    const registerResponse = http.post(
      `${BASE_URL}/auth/register`,
      registerPayload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (registerResponse.status !== 200 && registerResponse.status !== 201) {
      console.error(`Setup failed for user ${i}: ${registerResponse.status}`);
      continue;
    }

    // Verify OTP
    const verifyPayload = JSON.stringify({
      phone: phone,
      otp: '123456',
    });

    const verifyResponse = http.post(
      `${BASE_URL}/auth/verify-otp`,
      verifyPayload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (verifyResponse.status === 200) {
      try {
        const body = JSON.parse(verifyResponse.body);
        users.push({
          phone: phone,
          accessToken: body.accessToken,
          refreshToken: body.refreshToken,
        });
      } catch (e) {
        console.error(`Failed to parse verify response for user ${i}`);
      }
    }

    sleep(0.1); // Rate limit setup requests
  }

  console.log(`Setup complete: ${users.length} users authenticated`);
  return { users };
}

export default function (data) {
  if (!data.users || data.users.length === 0) {
    console.error('No authenticated users available');
    return;
  }

  const user = data.users[__VU % data.users.length];
  concurrentUsers.add(__VU);

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.accessToken}`,
    },
  };

  // Weight different operations
  const operation = Math.random();

  if (operation < 0.5) {
    // 50% - Get wallet balance (most common operation)
    group('Get Wallet Balance', () => {
      const startTime = new Date().getTime();
      const response = http.get(`${BASE_URL}/wallet`, {
        ...params,
        tags: { name: 'GetWalletBalance' },
      });
      const duration = new Date().getTime() - startTime;

      walletBalanceDuration.add(duration);

      const success = check(response, {
        'balance status is 200': (r) => r.status === 200,
        'balance has required fields': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.id !== undefined &&
                   body.balance !== undefined &&
                   body.currency !== undefined;
          } catch (e) {
            return false;
          }
        },
        'balance response time < 400ms': () => duration < 400,
      });

      walletBalanceSuccessRate.add(success);

      if (!success) {
        walletErrors.add(1);
        console.error(`Wallet balance failed: ${response.status} - ${response.body}`);
      }
    });

    sleep(0.5);

  } else if (operation < 0.85) {
    // 35% - Get transaction history
    group('Get Transaction History', () => {
      const limit = [10, 20, 50][Math.floor(Math.random() * 3)];
      const offset = Math.floor(Math.random() * 5) * limit;

      const startTime = new Date().getTime();
      const response = http.get(
        `${BASE_URL}/wallet/transactions?limit=${limit}&offset=${offset}&type=all`,
        {
          ...params,
          tags: { name: 'GetTransactionHistory' },
        }
      );
      const duration = new Date().getTime() - startTime;

      transactionHistoryDuration.add(duration);

      const success = check(response, {
        'history status is 200': (r) => r.status === 200,
        'history has transactions array': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body.transactions) &&
                   body.total !== undefined;
          } catch (e) {
            return false;
          }
        },
        'history response time < 600ms': () => duration < 600,
      });

      transactionHistorySuccessRate.add(success);

      if (!success) {
        walletErrors.add(1);
        console.error(`Transaction history failed: ${response.status}`);
      }
    });

    sleep(1);

  } else {
    // 15% - Get transaction detail
    group('Get Transaction Detail', () => {
      // First, get transaction list
      const listResponse = http.get(
        `${BASE_URL}/wallet/transactions?limit=10`,
        params
      );

      if (listResponse.status === 200) {
        try {
          const body = JSON.parse(listResponse.body);
          if (body.transactions && body.transactions.length > 0) {
            const txId = body.transactions[0].id;

            const response = http.get(
              `${BASE_URL}/wallet/transaction/${txId}`,
              {
                ...params,
                tags: { name: 'GetTransactionDetail' },
              }
            );

            const success = check(response, {
              'detail status is 200': (r) => r.status === 200,
              'detail has transaction data': (r) => {
                try {
                  const txBody = JSON.parse(r.body);
                  return txBody.id !== undefined &&
                         txBody.type !== undefined;
                } catch (e) {
                  return false;
                }
              },
            });

            transactionDetailSuccessRate.add(success);

            if (!success) {
              walletErrors.add(1);
            }
          }
        } catch (e) {
          walletErrors.add(1);
        }
      }
    });

    sleep(2);
  }

  // Occasionally check multiple endpoints in quick succession
  if (Math.random() < 0.1) {
    group('Rapid Multi-Endpoint Check', () => {
      const batch = http.batch([
        ['GET', `${BASE_URL}/wallet`, null, params],
        ['GET', `${BASE_URL}/users/me`, null, params],
        ['GET', `${BASE_URL}/wallet/transactions?limit=5`, null, params],
      ]);

      check(batch, {
        'all batch requests successful': (responses) =>
          responses.every(r => r.status === 200),
      });
    });

    sleep(0.5);
  }

  // Random think time
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5s
}

export function handleSummary(data) {
  const summary = {
    'load-tests/reports/wallet-load-test.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'load-tests/reports/wallet-load-test.json': JSON.stringify(data),
  };

  // Calculate custom summary stats
  const metrics = data.metrics;
  console.log('\n=== Custom Wallet Metrics ===');
  console.log(`Average Balance Request Duration: ${metrics.wallet_balance_duration?.values.avg.toFixed(2)}ms`);
  console.log(`P95 Balance Request Duration: ${metrics.wallet_balance_duration?.values['p(95)'].toFixed(2)}ms`);
  console.log(`Balance Success Rate: ${(metrics.wallet_balance_success?.values.rate * 100).toFixed(2)}%`);
  console.log(`Average History Request Duration: ${metrics.transaction_history_duration?.values.avg.toFixed(2)}ms`);
  console.log(`Total Wallet Errors: ${metrics.wallet_errors?.values.count}`);
  console.log(`Peak Concurrent Users: ${metrics.concurrent_users?.values.max}`);

  return summary;
}
