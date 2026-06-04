#!/usr/bin/env node

const baseUrl = (process.env.API_URL || 'http://127.0.0.1:3401/api/v1').replace(/\/$/, '');
const countryCode = process.env.COUNTRY_CODE || 'CI';
const otp = process.env.OTP || '123456';
const phone =
  process.env.PHONE ||
  `+2250700${new Date().toISOString().replace(/\D/g, '').slice(8, 14)}`;

async function request(method, path, { token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data };
}

function summarize(data) {
  if (Array.isArray(data)) return `array(${data.length})`;
  if (!data || typeof data !== 'object') return String(data ?? '');
  const keys = Object.keys(data).slice(0, 8).join(',');
  const error = data.error?.code || data.message;
  return error ? `${keys} :: ${error}` : keys;
}

async function expectStatus(method, path, expected, options) {
  const result = await request(method, path, options);
  const ok = expected.includes(result.status);
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${method.padEnd(6)} ${path.padEnd(42)} -> ${
      result.status
    } ${summarize(result.data)}`,
  );
  if (!ok) {
    throw new Error(`${method} ${path} expected ${expected.join('/')} got ${result.status}`);
  }
  return result;
}

async function main() {
  console.log(`Mobile API smoke target: ${baseUrl}`);
  console.log(`Dogfood phone: ${phone}`);

  await expectStatus('GET', '/health', [200]);
  await expectStatus('GET', '/config/countries', [200]);

  await expectStatus('POST', '/auth/register', [200, 201], {
    body: { phone, countryCode },
  });
  const verified = await expectStatus('POST', '/auth/verify-otp', [200], {
    body: { phone, otp },
  });
  const token = verified.data?.accessToken;
  if (!token) throw new Error('OTP verification did not return accessToken');

  await expectStatus('GET', '/user/profile', [200], { token });
  await expectStatus('GET', '/wallet', [200, 404], { token });
  await expectStatus('POST', '/wallet/create', [200, 201, 409], { token });
  await expectStatus('GET', '/wallet', [200], { token });
  await expectStatus('GET', '/wallet/transactions?limit=5', [200], { token });
  await expectStatus('GET', '/wallet/transactions/stats', [200], { token });
  await expectStatus('GET', '/notifications', [200], { token });
  await expectStatus('GET', '/notifications/unread-count', [200], { token });
  await expectStatus('GET', '/contacts', [200], { token });
  await expectStatus('GET', '/contacts/lookup?query=0700', [200], { token });
  await expectStatus('POST', '/contacts/check', [200], {
    token,
    body: { phoneNumbers: ['+2250700000001', '+2250700000002'] },
  });
  await expectStatus('GET', '/sessions', [200], { token });
  await expectStatus('GET', '/devices', [200], { token });
  await expectStatus('GET', '/user/limits', [200], { token });
  await expectStatus('GET', '/user/limits/usage', [200], { token });
  await expectStatus('GET', '/user/data-export?format=json', [200], { token });
  await expectStatus('GET', '/feature-flags/me', [200], { token });
  await expectStatus('GET', '/feature-subscriptions', [200], { token });

  console.log('Mobile API smoke passed.');
}

main().catch((error) => {
  console.error(`Mobile API smoke failed: ${error.message}`);
  process.exit(1);
});
