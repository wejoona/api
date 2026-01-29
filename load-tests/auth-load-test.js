import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics
const otpVerifySuccessRate = new Rate('otp_verify_success');
const otpVerifyDuration = new Trend('otp_verify_duration');
const tokenRefreshSuccessRate = new Rate('token_refresh_success');
const tokenRefreshDuration = new Trend('token_refresh_duration');
const authErrors = new Counter('auth_errors');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://api-dev.joonapay.com';
const STAGES = __ENV.STAGES || 'ramp';

// Load test profiles
const profiles = {
  smoke: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 5 },
    { duration: '30s', target: 0 },
  ],
  load: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  stress: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 500 },
    { duration: '3m', target: 1000 },
    { duration: '2m', target: 0 },
  ],
  ramp: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
};

export const options = {
  stages: profiles[STAGES],
  thresholds: {
    // Overall HTTP metrics
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'], // < 1% errors

    // Authentication-specific metrics
    otp_verify_success: ['rate>0.99'], // > 99% success
    otp_verify_duration: ['p(95)<600'],
    token_refresh_success: ['rate>0.99'],
    token_refresh_duration: ['p(95)<300'],

    // Request rates
    http_reqs: ['rate>100'], // > 100 req/s
  },
  ext: {
    loadimpact: {
      projectID: 3638764,
      name: 'JoonaPay - Auth Load Test',
    },
  },
};

// Test data
const testUsers = generateTestUsers(1000);

function generateTestUsers(count) {
  const users = [];
  const countryCodes = ['CI', 'SN', 'ML'];

  for (let i = 0; i < count; i++) {
    const countryCode = countryCodes[i % countryCodes.length];
    const phoneNumber = `+225${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;

    users.push({
      phone: phoneNumber,
      countryCode: countryCode,
      otp: '123456', // Dev OTP
    });
  }

  return users;
}

export default function () {
  const user = testUsers[__VU % testUsers.length];

  group('Authentication Flow', () => {
    // Step 1: Register/Request OTP
    let registerResponse = group('01. Request OTP', () => {
      const payload = JSON.stringify({
        phone: user.phone,
        countryCode: user.countryCode,
      });

      const params = {
        headers: {
          'Content-Type': 'application/json',
        },
        tags: { name: 'RegisterUser' },
      };

      const response = http.post(`${BASE_URL}/auth/register`, payload, params);

      const success = check(response, {
        'register status is 200 or 201': (r) => [200, 201].includes(r.status),
        'register response has userId': (r) => {
          try {
            return JSON.parse(r.body).userId !== undefined;
          } catch (e) {
            return false;
          }
        },
        'register response has otpSent': (r) => {
          try {
            return JSON.parse(r.body).otpSent === true;
          } catch (e) {
            return false;
          }
        },
      });

      if (!success) {
        authErrors.add(1);
        console.error(`Register failed: ${response.status} - ${response.body}`);
      }

      return response;
    });

    sleep(0.5); // Simulate user delay

    // Step 2: Verify OTP
    let tokens = group('02. Verify OTP', () => {
      const payload = JSON.stringify({
        phone: user.phone,
        otp: user.otp,
      });

      const params = {
        headers: {
          'Content-Type': 'application/json',
        },
        tags: { name: 'VerifyOTP' },
      };

      const startTime = new Date().getTime();
      const response = http.post(`${BASE_URL}/auth/verify-otp`, payload, params);
      const duration = new Date().getTime() - startTime;

      otpVerifyDuration.add(duration);

      const success = check(response, {
        'verify status is 200': (r) => r.status === 200,
        'verify has accessToken': (r) => {
          try {
            return JSON.parse(r.body).accessToken !== undefined;
          } catch (e) {
            return false;
          }
        },
        'verify has refreshToken': (r) => {
          try {
            return JSON.parse(r.body).refreshToken !== undefined;
          } catch (e) {
            return false;
          }
        },
        'verify response time < 600ms': () => duration < 600,
      });

      otpVerifySuccessRate.add(success);

      if (!success) {
        authErrors.add(1);
        console.error(`OTP verify failed: ${response.status} - ${response.body}`);
        return null;
      }

      try {
        const body = JSON.parse(response.body);
        return {
          accessToken: body.accessToken,
          refreshToken: body.refreshToken,
        };
      } catch (e) {
        authErrors.add(1);
        return null;
      }
    });

    if (!tokens) {
      return; // Skip remaining tests if authentication failed
    }

    sleep(1);

    // Step 3: Test authenticated endpoint
    group('03. Get User Profile', () => {
      const params = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
        tags: { name: 'GetUserProfile' },
      };

      const response = http.get(`${BASE_URL}/users/me`, params);

      check(response, {
        'profile status is 200': (r) => r.status === 200,
        'profile has user data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.id !== undefined && body.phone !== undefined;
          } catch (e) {
            return false;
          }
        },
      });
    });

    sleep(2);

    // Step 4: Refresh token
    group('04. Refresh Token', () => {
      const payload = JSON.stringify({
        refreshToken: tokens.refreshToken,
      });

      const params = {
        headers: {
          'Content-Type': 'application/json',
        },
        tags: { name: 'RefreshToken' },
      };

      const startTime = new Date().getTime();
      const response = http.post(`${BASE_URL}/auth/refresh`, payload, params);
      const duration = new Date().getTime() - startTime;

      tokenRefreshDuration.add(duration);

      const success = check(response, {
        'refresh status is 200': (r) => r.status === 200,
        'refresh has new accessToken': (r) => {
          try {
            return JSON.parse(r.body).accessToken !== undefined;
          } catch (e) {
            return false;
          }
        },
        'refresh response time < 300ms': () => duration < 300,
      });

      tokenRefreshSuccessRate.add(success);

      if (!success) {
        authErrors.add(1);
      }
    });

    sleep(1);

    // Step 5: Logout
    group('05. Logout', () => {
      const params = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
        tags: { name: 'Logout' },
      };

      const response = http.post(`${BASE_URL}/auth/logout`, '{}', params);

      check(response, {
        'logout status is 200 or 204': (r) => [200, 204].includes(r.status),
      });
    });
  });

  sleep(Math.random() * 3 + 2); // Random delay 2-5s between iterations
}

export function handleSummary(data) {
  return {
    'load-tests/reports/auth-load-test.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'load-tests/reports/auth-load-test.json': JSON.stringify(data),
  };
}
