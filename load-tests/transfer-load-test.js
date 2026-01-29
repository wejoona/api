import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics
const internalTransferSuccessRate = new Rate('internal_transfer_success');
const internalTransferDuration = new Trend('internal_transfer_duration');
const externalTransferSuccessRate = new Rate('external_transfer_success');
const externalTransferDuration = new Trend('external_transfer_duration');
const mobileMoneyTransferSuccessRate = new Rate('mobile_money_transfer_success');
const transferErrors = new Counter('transfer_errors');
const insufficientFundsErrors = new Counter('insufficient_funds_errors');
const validationErrors = new Counter('validation_errors');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://api-dev.joonapay.com';
const TEST_MODE = __ENV.TEST_MODE || 'stress'; // 'load' or 'stress'

const stages = {
  load: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  stress: [
    { duration: '2m', target: 100 },
    { duration: '3m', target: 300 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 800 },
    { duration: '1m', target: 1000 },
    { duration: '2m', target: 0 },
  ],
};

export const options = {
  stages: stages[TEST_MODE],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.02'], // < 2% errors (higher due to business logic failures)

    internal_transfer_success: ['rate>0.95'],
    internal_transfer_duration: ['p(95)<1000', 'p(99)<2000'],
    external_transfer_success: ['rate>0.95'],
    external_transfer_duration: ['p(95)<1500', 'p(99)<3000'],
    mobile_money_transfer_success: ['rate>0.95'],
  },
};

// Setup: Create authenticated users and recipients
export function setup() {
  const users = [];
  const numUsers = 50;

  console.log(`Setting up ${numUsers} users with wallets and recipients...`);

  for (let i = 0; i < numUsers; i++) {
    const senderPhone = `+225${String(10000000 + i).padStart(8, '0')}`;
    const recipientPhone = `+225${String(20000000 + i).padStart(8, '0')}`;

    // Register sender
    const senderTokens = authenticateUser(senderPhone);
    if (!senderTokens) continue;

    // Register recipient
    const recipientTokens = authenticateUser(recipientPhone);
    if (!recipientTokens) continue;

    // Add recipient to sender's contacts
    const params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${senderTokens.accessToken}`,
      },
    };

    const addRecipientPayload = JSON.stringify({
      phone: recipientPhone,
    });

    const recipientResponse = http.post(
      `${BASE_URL}/recipients`,
      addRecipientPayload,
      params
    );

    let recipientId = null;
    if (recipientResponse.status === 200 || recipientResponse.status === 201) {
      try {
        recipientId = JSON.parse(recipientResponse.body).id;
      } catch (e) {
        console.error('Failed to parse recipient response');
      }
    }

    users.push({
      senderPhone: senderPhone,
      recipientPhone: recipientPhone,
      recipientId: recipientId,
      accessToken: senderTokens.accessToken,
      refreshToken: senderTokens.refreshToken,
    });

    sleep(0.1);
  }

  console.log(`Setup complete: ${users.length} user pairs configured`);
  return { users };
}

function authenticateUser(phone) {
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
    return null;
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
      return {
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
      };
    } catch (e) {
      return null;
    }
  }

  return null;
}

export default function (data) {
  if (!data.users || data.users.length === 0) {
    console.error('No users available for testing');
    return;
  }

  const user = data.users[__VU % data.users.length];
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.accessToken}`,
    },
  };

  // Randomly choose transfer type
  const transferType = Math.random();

  if (transferType < 0.6) {
    // 60% - Internal transfer (most common)
    group('Internal Transfer', () => {
      // Generate mock PIN token (in real app, user verifies PIN first)
      const pinToken = generateMockPinToken(user.accessToken);

      const payload = JSON.stringify({
        recipientPhone: user.recipientPhone,
        amount: (Math.random() * 100 + 10).toFixed(2), // $10-$110
        note: `Load test transfer from VU ${__VU}`,
        pinToken: pinToken,
      });

      const startTime = new Date().getTime();
      const response = http.post(
        `${BASE_URL}/transfers/internal`,
        payload,
        {
          ...params,
          tags: { name: 'InternalTransfer' },
        }
      );
      const duration = new Date().getTime() - startTime;

      internalTransferDuration.add(duration);

      const success = check(response, {
        'internal transfer status is 200 or 201': (r) => [200, 201].includes(r.status),
        'internal transfer has transactionId': (r) => {
          try {
            return JSON.parse(r.body).transactionId !== undefined;
          } catch (e) {
            return false;
          }
        },
        'internal transfer response time < 1000ms': () => duration < 1000,
      });

      internalTransferSuccessRate.add(success);

      if (!success) {
        transferErrors.add(1);
        if (response.status === 400) {
          const body = response.body;
          if (body.includes('insufficient') || body.includes('balance')) {
            insufficientFundsErrors.add(1);
          } else {
            validationErrors.add(1);
          }
        }
      }
    });

    sleep(2);

  } else if (transferType < 0.85) {
    // 25% - External crypto transfer
    group('External Transfer', () => {
      const pinToken = generateMockPinToken(user.accessToken);

      const payload = JSON.stringify({
        address: `0x${Math.random().toString(16).substring(2, 42)}`,
        network: 'base',
        amount: (Math.random() * 50 + 5).toFixed(2), // $5-$55
        pinToken: pinToken,
      });

      const startTime = new Date().getTime();
      const response = http.post(
        `${BASE_URL}/transfers/external`,
        payload,
        {
          ...params,
          tags: { name: 'ExternalTransfer' },
        }
      );
      const duration = new Date().getTime() - startTime;

      externalTransferDuration.add(duration);

      const success = check(response, {
        'external transfer status is 200 or 201': (r) => [200, 201].includes(r.status),
        'external transfer has transactionId': (r) => {
          try {
            return JSON.parse(r.body).transactionId !== undefined;
          } catch (e) {
            return false;
          }
        },
        'external transfer response time < 1500ms': () => duration < 1500,
      });

      externalTransferSuccessRate.add(success);

      if (!success) {
        transferErrors.add(1);
        if (response.status === 400 && response.body.includes('insufficient')) {
          insufficientFundsErrors.add(1);
        }
      }
    });

    sleep(3);

  } else {
    // 15% - Mobile money transfer
    group('Mobile Money Transfer', () => {
      const pinToken = generateMockPinToken(user.accessToken);
      const providers = ['orange_money', 'mtn', 'wave'];

      const payload = JSON.stringify({
        provider: providers[Math.floor(Math.random() * providers.length)],
        phone: user.recipientPhone,
        amount: String(Math.floor(Math.random() * 50000) + 5000), // 5,000-55,000 XOF
        currency: 'XOF',
        pinToken: pinToken,
      });

      const startTime = new Date().getTime();
      const response = http.post(
        `${BASE_URL}/transfers/mobile-money`,
        payload,
        {
          ...params,
          tags: { name: 'MobileMoneyTransfer' },
        }
      );
      const duration = new Date().getTime() - startTime;

      const success = check(response, {
        'mobile money status is 200 or 201': (r) => [200, 201].includes(r.status),
        'mobile money has transactionId': (r) => {
          try {
            return JSON.parse(r.body).transactionId !== undefined;
          } catch (e) {
            return false;
          }
        },
      });

      mobileMoneyTransferSuccessRate.add(success);

      if (!success) {
        transferErrors.add(1);
      }
    });

    sleep(4);
  }

  // Random think time
  sleep(Math.random() * 5 + 2); // 2-7s
}

function generateMockPinToken(accessToken) {
  // In real scenario, this would be obtained from PIN verification endpoint
  // For load testing, we generate a mock token
  return `mock_pin_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

export function handleSummary(data) {
  const metrics = data.metrics;

  console.log('\n=== Transfer Load Test Summary ===');
  console.log(`Internal Transfer Success: ${(metrics.internal_transfer_success?.values.rate * 100).toFixed(2)}%`);
  console.log(`Internal Transfer P95: ${metrics.internal_transfer_duration?.values['p(95)'].toFixed(2)}ms`);
  console.log(`External Transfer Success: ${(metrics.external_transfer_success?.values.rate * 100).toFixed(2)}%`);
  console.log(`External Transfer P95: ${metrics.external_transfer_duration?.values['p(95)'].toFixed(2)}ms`);
  console.log(`Mobile Money Success: ${(metrics.mobile_money_transfer_success?.values.rate * 100).toFixed(2)}%`);
  console.log(`Total Transfer Errors: ${metrics.transfer_errors?.values.count}`);
  console.log(`Insufficient Funds Errors: ${metrics.insufficient_funds_errors?.values.count}`);
  console.log(`Validation Errors: ${metrics.validation_errors?.values.count}`);

  return {
    'load-tests/reports/transfer-load-test.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'load-tests/reports/transfer-load-test.json': JSON.stringify(data),
  };
}
