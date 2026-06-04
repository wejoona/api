#!/usr/bin/env node

const baseUrl = (process.env.API_URL || 'http://127.0.0.1:3401/api/v1').replace(
  /\/$/,
  '',
);
const countryCode = process.env.COUNTRY_CODE || 'CI';
const otp = process.env.OTP || '123456';
const countryProfiles = {
  CI: {
    dialCode: '+225',
    makePhone: (runDigits) => `+2250700${runDigits}`,
    makeKnownContactPhone: (runDigits) => `+2250701${runDigits}`,
    lookupQuery: '0700',
    contactPhones: ['+2250700000001', '+2250700000002'],
    depositCurrency: 'XOF',
    exchangeQuery:
      'sourceCurrency=XOF&targetCurrency=USD&amount=10000&direction=buy',
    ratePairQuery: 'from=USDC&to=XOF',
  },
  US: {
    dialCode: '+1',
    makePhone: (runDigits) => `+1415555${runDigits.slice(-4)}`,
    makeKnownContactPhone: (runDigits) => `+1415666${runDigits.slice(-4)}`,
    lookupQuery: '415',
    contactPhones: ['+14155550101', '+14155550102'],
    depositCurrency: 'USD',
    exchangeQuery:
      'sourceCurrency=USD&targetCurrency=USDC&amount=25&direction=buy',
    ratePairQuery: 'from=USDC&to=USD',
  },
};
const countryProfile = countryProfiles[countryCode];
if (!countryProfile) {
  throw new Error(
    `Unsupported smoke COUNTRY_CODE=${countryCode}. Supported: ${Object.keys(
      countryProfiles,
    ).join(', ')}`,
  );
}
const runDigits = new Date().toISOString().replace(/\D/g, '').slice(8, 14);
const phone = process.env.PHONE || countryProfile.makePhone(runDigits);
const knownContactPhone =
  process.env.KNOWN_CONTACT_PHONE ||
  countryProfile.makeKnownContactPhone(runDigits);

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
    throw new Error(
      `${method} ${path} expected ${expected.join('/')} got ${result.status}`,
    );
  }
  return result;
}

async function main() {
  const syntheticDeviceId = `smoke-device-${Date.now()}`;
  const syntheticPushToken = `smoke-push-${Date.now()}`;

  console.log(`Mobile API smoke target: ${baseUrl}`);
  console.log(`Dogfood country: ${countryCode}`);
  console.log(`Dogfood phone: ${phone}`);

  await expectStatus('GET', '/health', [200]);
  const countries = await expectStatus('GET', '/config/countries', [200]);
  await expectStatus('GET', '/sessions', [401]);
  await expectStatus('GET', '/devices', [401]);
  const selectedCountry = Array.isArray(countries.data)
    ? countries.data.find((country) => country?.code === countryCode)
    : null;
  if (!selectedCountry) {
    throw new Error(`/config/countries does not include ${countryCode}`);
  }
  if (selectedCountry.availability?.onboarding !== 'open') {
    throw new Error(
      `${countryCode} onboarding is not open: ${selectedCountry.availability?.onboarding}`,
    );
  }

  await expectStatus('POST', '/auth/register', [200, 201], {
    body: { phone, countryCode },
  });
  const verified = await expectStatus('POST', '/auth/verify-otp', [200], {
    body: { phone, otp },
  });
  const token = verified.data?.accessToken;
  if (!token) throw new Error('OTP verification did not return accessToken');

  await expectStatus('POST', '/auth/register', [200, 201], {
    body: { phone: knownContactPhone, countryCode },
  });
  await expectStatus('POST', '/auth/verify-otp', [200], {
    body: { phone: knownContactPhone, otp },
  });

  await expectStatus('GET', '/user/profile', [200], { token });
  await expectStatus('GET', '/wallet', [200, 404], { token });
  await expectStatus('POST', '/wallet/create', [200, 201, 409], { token });
  await expectStatus('GET', '/wallet', [200], { token });
  await expectStatus('GET', '/wallet/transactions?limit=5', [200], { token });
  await expectStatus('GET', '/wallet/transactions/stats', [200], { token });
  await expectStatus('GET', '/notifications', [200], { token });
  await expectStatus('GET', '/notifications/unread-count', [200], { token });
  await expectStatus('GET', '/contacts', [200], { token });
  await expectStatus(
    'GET',
    `/contacts/lookup?query=${encodeURIComponent(countryProfile.lookupQuery)}`,
    [200],
    { token },
  );
  await expectStatus('POST', '/contacts/check', [200], {
    token,
    body: {
      phoneNumbers: [...countryProfile.contactPhones, knownContactPhone],
    },
  });
  const knownContactCheck = await expectStatus(
    'POST',
    '/contacts/check',
    [200],
    {
      token,
      body: { phoneNumbers: [knownContactPhone] },
    },
  );
  const knownContactMatch = knownContactCheck.data?.registered?.[0];
  if (!knownContactMatch?.isKoridoUser || !knownContactMatch.userId) {
    throw new Error(
      '/contacts/check did not identify the verified Korido contact',
    );
  }
  const registeredDevice = await expectStatus(
    'POST',
    '/devices/register',
    [200, 201],
    {
      token,
      body: {
        deviceIdentifier: syntheticDeviceId,
        platform: 'ios',
        deviceName: 'Smoke iPhone',
        model: 'iPhone Simulator',
        os: 'iOS',
        osVersion: '26.0',
        appVersion: '1.0.0-smoke',
        metadata: { source: 'mobile-api-smoke' },
      },
    },
  );
  await expectStatus('GET', '/sessions', [200], { token });
  await expectStatus('GET', '/devices', [200], { token });
  await expectStatus('POST', '/notifications/device-token', [200, 201], {
    token,
    body: {
      token: syntheticPushToken,
      platform: 'ios',
      deviceId: syntheticDeviceId,
      deviceName: 'Smoke iPhone',
      appVersion: '1.0.0-smoke',
      osVersion: '26.0',
    },
  });
  await expectStatus(
    'DELETE',
    `/notifications/device-token/${syntheticPushToken}`,
    [200, 204],
    { token },
  );
  await expectStatus('GET', '/user/limits', [200], { token });
  await expectStatus('GET', '/user/limits/usage', [200], { token });
  await expectStatus('GET', '/user/data-export?format=json', [200], { token });
  await expectStatus('GET', '/feature-flags/me', [200], { token });
  await expectStatus('GET', '/feature-subscriptions', [200], { token });
  const featureSubscription = await expectStatus(
    'POST',
    '/feature-subscriptions',
    [200],
    {
      token,
      body: {
        featureKey: 'virtual_card',
        source: 'vcard_screen',
        phone,
        countryCode,
        locale: countryCode === 'CI' ? 'fr-CI' : 'en-US',
        platform: 'ios',
        appVersion: '1.0.0-smoke',
        metadata: {
          surface: 'vcard',
          scenario: 'mobile-api-smoke',
        },
      },
    },
  );
  if (
    featureSubscription.data?.featureKey !== 'virtual_card' ||
    featureSubscription.data?.source !== 'vcard_screen' ||
    featureSubscription.data?.status !== 'subscribed' ||
    featureSubscription.data?.isActive !== true ||
    featureSubscription.data?.metadata?.countryCode !== countryCode
  ) {
    throw new Error(
      '/feature-subscriptions did not persist feature-specific mobile context',
    );
  }
  const depositChannels = await expectStatus(
    'GET',
    `/wallet/deposit/channels?country=${countryCode}&currency=${countryProfile.depositCurrency}`,
    [200],
    { token },
  );
  await expectStatus(
    'GET',
    `/wallet/deposit/providers?country=${countryCode}&currency=${countryProfile.depositCurrency}`,
    [200],
    { token },
  );
  const firstDepositChannel = depositChannels.data?.channels?.[0];
  if (!firstDepositChannel?.id) {
    throw new Error(
      `${countryCode} ${countryProfile.depositCurrency} has no deposit channel`,
    );
  }
  const depositAmount = Math.max(firstDepositChannel.minAmount || 1, 1);
  const deposit = await expectStatus('POST', '/wallet/deposit', [201], {
    token,
    body: {
      amount: depositAmount,
      sourceCurrency: countryProfile.depositCurrency,
      channelId: firstDepositChannel.id,
    },
  });
  const transactionId = deposit.data?.transactionId;
  if (!transactionId) {
    throw new Error('Deposit initiation did not return transactionId');
  }
  await expectStatus(
    'GET',
    `/wallet/transactions/deposit/${transactionId}/status`,
    [200],
    { token },
  );
  await expectStatus('GET', `/wallet/transactions/${transactionId}`, [200], {
    token,
  });
  await expectStatus(
    'GET',
    `/wallet/exchange-rate?${countryProfile.exchangeQuery}`,
    [200],
    { token },
  );
  await expectStatus(
    'GET',
    `/rates/pair?${countryProfile.ratePairQuery}`,
    [200],
    {
      token,
    },
  );
  await expectStatus(
    'GET',
    '/wallet/transfer/external/estimate-fee?amount=25&currency=USDC&network=stellar',
    [200],
    { token },
  );
  await expectStatus('GET', '/cards', [200], { token });
  await expectStatus('GET', '/banks', [200], { token });
  await expectStatus('GET', '/bank-accounts', [200], { token });
  await expectStatus('GET', '/bill-payments/providers', [200], { token });
  await expectStatus('GET', '/bill-payments/categories', [200], { token });
  await expectStatus('GET', '/bill-payments/history?page=1&limit=20', [200], {
    token,
  });
  await expectStatus('GET', '/payment-links/capability', [200], { token });
  await expectStatus('GET', '/payment-links', [200], { token });
  await expectStatus('GET', '/savings-pots/capability', [200], { token });
  await expectStatus('GET', '/savings-pots', [200], { token });
  await expectStatus('GET', '/recurring-transfers/capability', [200], {
    token,
  });
  await expectStatus('GET', '/recurring-transfers', [200], { token });
  await expectStatus('GET', '/recurring-transfers/upcoming', [200], { token });
  await expectStatus('GET', '/referrals/capability', [200], { token });
  await expectStatus('GET', '/referrals', [200], { token });
  await expectStatus('GET', '/referrals/history', [200], { token });
  await expectStatus('POST', '/risk/session', [200], {
    token,
    body: {
      deviceFingerprint: `smoke-${Date.now()}`,
      appVersion: '1.0.0-smoke',
    },
  });
  await expectStatus('GET', '/risk/profile', [200], { token });
  await expectStatus('GET', '/security/addresses', [200], { token });
  if (registeredDevice.data?.id) {
    await expectStatus(
      'DELETE',
      `/devices/${registeredDevice.data.id}`,
      [200],
      {
        token,
      },
    );
  }

  console.log('Mobile API smoke passed.');
}

main().catch((error) => {
  console.error(`Mobile API smoke failed: ${error.message}`);
  process.exit(1);
});
