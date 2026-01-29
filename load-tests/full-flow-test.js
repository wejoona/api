import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics
const fullFlowSuccessRate = new Rate('full_flow_success');
const fullFlowDuration = new Trend('full_flow_duration');
const loginDuration = new Trend('login_duration');
const transferDuration = new Trend('transfer_duration');
const stepFailures = new Counter('step_failures');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://api-dev.joonapay.com';

export const options = {
  scenarios: {
    // User journey simulation
    user_journey: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '3m', target: 150 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],

    full_flow_success: ['rate>0.98'],
    full_flow_duration: ['p(95)<15000'], // Complete flow < 15s for 95% of users
    login_duration: ['p(95)<1000'],
    transfer_duration: ['p(95)<1500'],
  },
};

export default function () {
  const phone = `+225${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;
  const recipientPhone = `+225${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;

  let tokens = null;
  let walletData = null;
  let flowSuccess = true;

  const flowStartTime = new Date().getTime();

  // === STEP 1: Registration & Login ===
  group('01. User Registration & Login', () => {
    const loginStart = new Date().getTime();

    // Register
    const registerPayload = JSON.stringify({
      phone: phone,
      countryCode: 'CI',
    });

    const registerResponse = http.post(
      `${BASE_URL}/auth/register`,
      registerPayload,
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'Register' },
      }
    );

    const registerSuccess = check(registerResponse, {
      'register successful': (r) => [200, 201].includes(r.status),
    });

    if (!registerSuccess) {
      stepFailures.add(1);
      flowSuccess = false;
      return;
    }

    sleep(0.5);

    // Verify OTP
    const verifyPayload = JSON.stringify({
      phone: phone,
      otp: '123456',
    });

    const verifyResponse = http.post(
      `${BASE_URL}/auth/verify-otp`,
      verifyPayload,
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'VerifyOTP' },
      }
    );

    const verifySuccess = check(verifyResponse, {
      'login successful': (r) => r.status === 200,
      'tokens received': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.accessToken && body.refreshToken;
        } catch (e) {
          return false;
        }
      },
    });

    if (!verifySuccess) {
      stepFailures.add(1);
      flowSuccess = false;
      return;
    }

    try {
      const body = JSON.parse(verifyResponse.body);
      tokens = {
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
      };
    } catch (e) {
      stepFailures.add(1);
      flowSuccess = false;
      return;
    }

    const loginDur = new Date().getTime() - loginStart;
    loginDuration.add(loginDur);
  });

  if (!flowSuccess || !tokens) return;

  sleep(1); // User reads onboarding screen

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens.accessToken}`,
    },
  };

  // === STEP 2: View Wallet Balance ===
  group('02. Check Wallet Balance', () => {
    const response = http.get(`${BASE_URL}/wallet`, {
      ...params,
      tags: { name: 'GetBalance' },
    });

    const success = check(response, {
      'balance retrieved': (r) => r.status === 200,
    });

    if (!success) {
      stepFailures.add(1);
      flowSuccess = false;
      return;
    }

    try {
      walletData = JSON.parse(response.body);
    } catch (e) {
      stepFailures.add(1);
      flowSuccess = false;
    }
  });

  if (!flowSuccess) return;

  sleep(2); // User reviews balance

  // === STEP 3: View Transaction History ===
  group('03. View Transaction History', () => {
    const response = http.get(`${BASE_URL}/wallet/transactions?limit=20`, {
      ...params,
      tags: { name: 'GetTransactions' },
    });

    const success = check(response, {
      'transactions retrieved': (r) => r.status === 200,
    });

    if (!success) {
      stepFailures.add(1);
      flowSuccess = false;
    }
  });

  if (!flowSuccess) return;

  sleep(1.5); // User scrolls through history

  // === STEP 4: Get User Profile ===
  group('04. View Profile', () => {
    const response = http.get(`${BASE_URL}/users/me`, {
      ...params,
      tags: { name: 'GetProfile' },
    });

    const success = check(response, {
      'profile retrieved': (r) => r.status === 200,
    });

    if (!success) {
      stepFailures.add(1);
      flowSuccess = false;
    }
  });

  if (!flowSuccess) return;

  sleep(2); // User navigates to send screen

  // === STEP 5: Add Recipient ===
  group('05. Add Recipient', () => {
    const payload = JSON.stringify({
      phone: recipientPhone,
    });

    const response = http.post(`${BASE_URL}/recipients`, payload, {
      ...params,
      tags: { name: 'AddRecipient' },
    });

    check(response, {
      'recipient added': (r) => [200, 201].includes(r.status),
    });
  });

  sleep(1);

  // === STEP 6: Make Transfer ===
  group('06. Send Money', () => {
    const transferStart = new Date().getTime();

    // Mock PIN token
    const pinToken = `mock_pin_${Date.now()}`;

    const payload = JSON.stringify({
      recipientPhone: recipientPhone,
      amount: '25.00',
      note: 'Load test payment',
      pinToken: pinToken,
    });

    const response = http.post(`${BASE_URL}/transfers/internal`, payload, {
      ...params,
      tags: { name: 'SendMoney' },
    });

    const success = check(response, {
      'transfer successful': (r) => [200, 201].includes(r.status),
      'transaction id received': (r) => {
        try {
          return JSON.parse(r.body).transactionId !== undefined;
        } catch (e) {
          return false;
        }
      },
    });

    if (!success) {
      stepFailures.add(1);
      flowSuccess = false;
    }

    const transferDur = new Date().getTime() - transferStart;
    transferDuration.add(transferDur);
  });

  if (!flowSuccess) return;

  sleep(1.5); // User sees success screen

  // === STEP 7: View Updated Balance ===
  group('07. Check Updated Balance', () => {
    const response = http.get(`${BASE_URL}/wallet`, {
      ...params,
      tags: { name: 'GetUpdatedBalance' },
    });

    const success = check(response, {
      'updated balance retrieved': (r) => r.status === 200,
    });

    if (!success) {
      stepFailures.add(1);
      flowSuccess = false;
    }
  });

  if (!flowSuccess) return;

  sleep(1);

  // === STEP 8: Check KYC Status ===
  group('08. Check KYC Status', () => {
    const response = http.get(`${BASE_URL}/kyc/status`, {
      ...params,
      tags: { name: 'CheckKYC' },
    });

    check(response, {
      'kyc status retrieved': (r) => r.status === 200,
    });
  });

  sleep(1);

  // === STEP 9: Logout ===
  group('09. Logout', () => {
    const response = http.post(`${BASE_URL}/auth/logout`, '{}', {
      ...params,
      tags: { name: 'Logout' },
    });

    const success = check(response, {
      'logout successful': (r) => [200, 204].includes(r.status),
    });

    if (!success) {
      stepFailures.add(1);
      flowSuccess = false;
    }
  });

  // Record full flow metrics
  const flowDuration = new Date().getTime() - flowStartTime;
  fullFlowDuration.add(flowDuration);
  fullFlowSuccessRate.add(flowSuccess);

  if (flowSuccess) {
    console.log(`✓ User journey completed in ${flowDuration}ms`);
  } else {
    console.log(`✗ User journey failed after ${flowDuration}ms`);
  }

  sleep(Math.random() * 5 + 3); // 3-8s before next user
}

export function handleSummary(data) {
  const metrics = data.metrics;

  console.log('\n=== Full Flow Test Summary ===');
  console.log(`Full Flow Success Rate: ${(metrics.full_flow_success?.values.rate * 100).toFixed(2)}%`);
  console.log(`Average Full Flow Duration: ${(metrics.full_flow_duration?.values.avg / 1000).toFixed(2)}s`);
  console.log(`P95 Full Flow Duration: ${(metrics.full_flow_duration?.values['p(95)'] / 1000).toFixed(2)}s`);
  console.log(`Average Login Duration: ${metrics.login_duration?.values.avg.toFixed(2)}ms`);
  console.log(`Average Transfer Duration: ${metrics.transfer_duration?.values.avg.toFixed(2)}ms`);
  console.log(`Total Step Failures: ${metrics.step_failures?.values.count}`);
  console.log(`Total HTTP Requests: ${metrics.http_reqs?.values.count}`);
  console.log(`Average Request Rate: ${metrics.http_reqs?.values.rate.toFixed(2)} req/s`);

  return {
    'load-tests/reports/full-flow-test.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'load-tests/reports/full-flow-test.json': JSON.stringify(data),
  };
}
