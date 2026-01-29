import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics
const spikeRecoveryTime = new Trend('spike_recovery_time');
const errorsDuringSpike = new Counter('errors_during_spike');
const errorsAfterSpike = new Counter('errors_after_spike');
const responseTimeDuringSpike = new Trend('response_time_during_spike');
const responseTimeAfterSpike = new Trend('response_time_after_spike');
const activeUsers = new Gauge('active_users');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://api-dev.joonapay.com';
const SPIKE_MULTIPLIER = parseInt(__ENV.SPIKE_MULTIPLIER) || 10;

export const options = {
  stages: [
    // Normal load
    { duration: '2m', target: 100 }, // Establish baseline
    { duration: '2m', target: 100 }, // Maintain baseline

    // Sudden spike
    { duration: '10s', target: 100 * SPIKE_MULTIPLIER }, // Spike to 1000 users in 10s
    { duration: '1m', target: 100 * SPIKE_MULTIPLIER }, // Maintain spike

    // Recovery
    { duration: '10s', target: 100 }, // Drop back to normal
    { duration: '3m', target: 100 }, // Monitor recovery

    // Second spike (smaller)
    { duration: '15s', target: 500 }, // Gradual spike
    { duration: '1m', target: 500 }, // Maintain

    // Final recovery
    { duration: '30s', target: 100 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    // Relaxed thresholds for spike testing
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.05'], // Allow 5% errors during spike

    // Monitor recovery
    response_time_after_spike: ['p(95)<600'], // Should return to normal
    errors_after_spike: ['count<10'], // Very few errors after recovery
  },
};

// Track test phases
let testPhase = 'baseline';
let spikeStartTime = null;
let recoveryStartTime = null;

export function setup() {
  console.log('Spike Test Configuration:');
  console.log(`- Baseline: 100 users`);
  console.log(`- Spike: ${100 * SPIKE_MULTIPLIER} users`);
  console.log(`- Spike duration: 1 minute`);
  console.log(`- Recovery monitoring: 3 minutes`);

  // Pre-authenticate some users
  const users = [];
  const numUsers = 50;

  for (let i = 0; i < numUsers; i++) {
    const phone = `+225${String(40000000 + i).padStart(8, '0')}`;
    const tokens = authenticateUser(phone);

    if (tokens) {
      users.push({
        phone: phone,
        accessToken: tokens.accessToken,
      });
    }

    sleep(0.1);
  }

  return { users };
}

function authenticateUser(phone) {
  const registerResponse = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ phone: phone, countryCode: 'CI' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (![200, 201].includes(registerResponse.status)) {
    return null;
  }

  const verifyResponse = http.post(
    `${BASE_URL}/auth/verify-otp`,
    JSON.stringify({ phone: phone, otp: '123456' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (verifyResponse.status === 200) {
    try {
      return JSON.parse(verifyResponse.body);
    } catch (e) {
      return null;
    }
  }

  return null;
}

export default function (data) {
  activeUsers.add(__VU);

  // Determine test phase based on time and VU count
  if (__VU > 500 && testPhase === 'baseline') {
    testPhase = 'spike';
    spikeStartTime = Date.now();
    console.log(`🚀 SPIKE STARTED: ${__VU} concurrent users`);
  } else if (__VU <= 150 && testPhase === 'spike') {
    testPhase = 'recovery';
    recoveryStartTime = Date.now();
    if (spikeStartTime) {
      const recoveryTime = Date.now() - spikeStartTime;
      spikeRecoveryTime.add(recoveryTime);
      console.log(`✓ RECOVERY INITIATED: ${recoveryTime}ms from spike start`);
    }
  } else if (__VU > 400 && testPhase === 'recovery') {
    testPhase = 'spike2';
    console.log(`🚀 SECOND SPIKE: ${__VU} concurrent users`);
  } else if (__VU <= 150 && testPhase === 'spike2') {
    testPhase = 'final_recovery';
    console.log(`✓ FINAL RECOVERY`);
  }

  const user = data.users && data.users.length > 0
    ? data.users[__VU % data.users.length]
    : null;

  if (!user) {
    // If no pre-authenticated user, do quick auth
    const phone = `+225${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;
    user = { phone: phone, accessToken: null };
  }

  // Perform various operations based on test phase
  group(`${testPhase.toUpperCase()} - Mixed Operations`, () => {
    const operation = Math.random();
    const startTime = Date.now();

    if (operation < 0.4) {
      // 40% - Lightweight: Get balance
      const response = user.accessToken
        ? http.get(`${BASE_URL}/wallet`, {
            headers: {
              'Authorization': `Bearer ${user.accessToken}`,
              'Content-Type': 'application/json',
            },
            tags: { name: 'GetBalance', phase: testPhase },
          })
        : http.get(`${BASE_URL}/health`, { tags: { name: 'Health', phase: testPhase } });

      const duration = Date.now() - startTime;

      const success = check(response, {
        'status ok': (r) => r.status === 200,
      });

      if (!success) {
        if (testPhase.includes('spike')) {
          errorsDuringSpike.add(1);
        } else if (testPhase.includes('recovery')) {
          errorsAfterSpike.add(1);
        }
      }

      if (testPhase.includes('spike')) {
        responseTimeDuringSpike.add(duration);
      } else if (testPhase.includes('recovery')) {
        responseTimeAfterSpike.add(duration);
      }

    } else if (operation < 0.7) {
      // 30% - Medium: Transaction history
      if (user.accessToken) {
        const response = http.get(`${BASE_URL}/wallet/transactions?limit=10`, {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`,
            'Content-Type': 'application/json',
          },
          tags: { name: 'GetTransactions', phase: testPhase },
        });

        const duration = Date.now() - startTime;

        const success = check(response, {
          'status ok': (r) => r.status === 200,
        });

        if (!success && testPhase.includes('spike')) {
          errorsDuringSpike.add(1);
        }

        if (testPhase.includes('spike')) {
          responseTimeDuringSpike.add(duration);
        }
      }

    } else if (operation < 0.85) {
      // 15% - Heavy: User profile
      if (user.accessToken) {
        const response = http.get(`${BASE_URL}/users/me`, {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`,
            'Content-Type': 'application/json',
          },
          tags: { name: 'GetProfile', phase: testPhase },
        });

        check(response, {
          'status ok': (r) => r.status === 200,
        });
      }

    } else {
      // 15% - Very heavy: Authentication
      const newPhone = `+225${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;

      const registerResponse = http.post(
        `${BASE_URL}/auth/register`,
        JSON.stringify({ phone: newPhone, countryCode: 'CI' }),
        {
          headers: { 'Content-Type': 'application/json' },
          tags: { name: 'Register', phase: testPhase },
        }
      );

      const success = check(registerResponse, {
        'register ok': (r) => [200, 201].includes(r.status),
      });

      if (!success && testPhase.includes('spike')) {
        errorsDuringSpike.add(1);
      }
    }
  });

  // Vary sleep based on phase
  if (testPhase.includes('spike')) {
    sleep(Math.random() * 0.5); // Rapid requests during spike
  } else if (testPhase.includes('recovery')) {
    sleep(Math.random() * 1 + 0.5); // Normal pace during recovery
  } else {
    sleep(Math.random() * 2 + 1); // Relaxed baseline
  }
}

export function handleSummary(data) {
  const metrics = data.metrics;

  console.log('\n=== Spike Test Summary ===');
  console.log(`Peak Active Users: ${metrics.active_users?.values.max}`);
  console.log(`Errors During Spike: ${metrics.errors_during_spike?.values.count || 0}`);
  console.log(`Errors After Spike: ${metrics.errors_after_spike?.values.count || 0}`);

  if (metrics.response_time_during_spike) {
    console.log(`\nResponse Times During Spike:`);
    console.log(`  - Average: ${metrics.response_time_during_spike.values.avg.toFixed(2)}ms`);
    console.log(`  - P95: ${metrics.response_time_during_spike.values['p(95)'].toFixed(2)}ms`);
    console.log(`  - P99: ${metrics.response_time_during_spike.values['p(99)'].toFixed(2)}ms`);
  }

  if (metrics.response_time_after_spike) {
    console.log(`\nResponse Times After Spike (Recovery):`);
    console.log(`  - Average: ${metrics.response_time_after_spike.values.avg.toFixed(2)}ms`);
    console.log(`  - P95: ${metrics.response_time_after_spike.values['p(95)'].toFixed(2)}ms`);
  }

  if (metrics.spike_recovery_time?.values.count > 0) {
    console.log(`\nRecovery Time: ${(metrics.spike_recovery_time.values.avg / 1000).toFixed(2)}s`);
  }

  console.log(`\nOverall HTTP Metrics:`);
  console.log(`  - Total Requests: ${metrics.http_reqs?.values.count}`);
  console.log(`  - Request Rate: ${metrics.http_reqs?.values.rate.toFixed(2)} req/s`);
  console.log(`  - Failed Requests: ${(metrics.http_req_failed?.values.rate * 100).toFixed(2)}%`);

  // Analyze recovery success
  const spikeErrors = metrics.errors_during_spike?.values.count || 0;
  const recoveryErrors = metrics.errors_after_spike?.values.count || 0;
  const recoverySuccess = recoveryErrors < spikeErrors * 0.1; // Less than 10% of spike errors

  console.log(`\n${recoverySuccess ? '✓' : '✗'} Recovery Assessment: ${recoverySuccess ? 'PASSED' : 'FAILED'}`);
  if (recoverySuccess) {
    console.log(`  System successfully recovered from traffic spike`);
  } else {
    console.log(`  System struggled to recover (${recoveryErrors} errors after spike)`);
  }

  return {
    'load-tests/reports/spike-test.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'load-tests/reports/spike-test.json': JSON.stringify(data),
  };
}
