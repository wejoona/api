# Authentication API Migration Guide (v1 to v2)

This guide covers all changes to authentication endpoints between API v1 and v2.

## Summary of Changes

| Aspect              | v1                    | v2                          |
|---------------------|-----------------------|-----------------------------|
| Token format        | `accessToken`         | `tokens.access`             |
| Token expiry        | Implicit              | Explicit `expiresIn`        |
| Session tracking    | None                  | `session` object            |
| KYC info            | `kycStatus` (string)  | `kyc` object with limits    |
| PIN token validity  | 5 minutes             | 2 minutes                   |
| Device binding      | Optional              | Required for sensitive ops  |

## Endpoints

### POST /auth/register

No changes to request format.

#### Response Changes

```typescript
// v1 Response
interface RegisterResponseV1 {
  success: boolean;
  message: string;
  expiresIn: number;
}

// v2 Response
interface RegisterResponseV2 {
  success: boolean;
  message: string;
  otp: {
    expiresIn: number;      // Seconds until OTP expires
    retryAfter: number;     // Seconds before resend allowed
    channel: 'sms' | 'whatsapp';
  };
  session: {
    registrationId: string; // Track registration flow
  };
}
```

#### Migration Example

```typescript
// Before (v1)
const response = await api.post('/auth/register', {
  phone: '+2250701234567',
  countryCode: 'CI',
});
console.log(`OTP expires in ${response.data.expiresIn} seconds`);

// After (v2)
const response = await api.post('/auth/register', {
  phone: '+2250701234567',
  countryCode: 'CI',
});
const { otp, session } = response.data;
console.log(`OTP expires in ${otp.expiresIn} seconds`);
console.log(`Registration ID: ${session.registrationId}`);
```

### POST /auth/verify-otp

#### Response Changes

```typescript
// v1 Response
interface VerifyOtpResponseV1 {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    phone: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    createdAt: string;
  };
  kycStatus: string;
}

// v2 Response
interface VerifyOtpResponseV2 {
  tokens: {
    access: string;
    refresh: string;
    type: 'Bearer';
    expiresIn: number;        // Seconds until access token expires
  };
  user: {
    id: string;
    phone: string;
    username?: string;
    profile: {
      firstName?: string;
      lastName?: string;
      email?: string;
      avatar?: string;
    };
    createdAt: string;
    updatedAt: string;
  };
  session: {
    id: string;
    deviceId: string;
    deviceName?: string;
    ipAddress: string;
    location?: {
      city?: string;
      country?: string;
    };
    createdAt: string;
  };
  kyc: {
    status: 'not_started' | 'pending' | 'approved' | 'rejected';
    tier: 1 | 2 | 3;
    limits: {
      daily: number;          // In cents
      monthly: number;
      perTransaction: number;
    };
    requiredFor?: string[];   // Actions that require KYC upgrade
  };
}
```

#### Migration Example

```typescript
// Before (v1)
async function verifyOtpV1(phone: string, otp: string) {
  const response = await api.post('/auth/verify-otp', { phone, otp });

  // Store tokens
  localStorage.setItem('accessToken', response.data.accessToken);
  localStorage.setItem('refreshToken', response.data.refreshToken);

  // Check KYC
  if (response.data.kycStatus !== 'approved') {
    navigateToKyc();
  }

  return response.data.user;
}

// After (v2)
async function verifyOtpV2(phone: string, otp: string) {
  const response = await api.post('/auth/verify-otp', { phone, otp });
  const { tokens, user, session, kyc } = response.data;

  // Store tokens with expiry
  localStorage.setItem('accessToken', tokens.access);
  localStorage.setItem('refreshToken', tokens.refresh);
  localStorage.setItem('tokenExpiresAt', Date.now() + tokens.expiresIn * 1000);

  // Store session for device management
  localStorage.setItem('sessionId', session.id);

  // Schedule proactive token refresh
  scheduleTokenRefresh(tokens.expiresIn - 60); // Refresh 1 min before expiry

  // Enhanced KYC handling
  if (kyc.status !== 'approved') {
    // Show what actions are blocked
    showKycPrompt(kyc.requiredFor);
  }

  // Show limits to user
  showUserLimits(kyc.limits);

  return { user, kyc };
}
```

### POST /auth/login

No changes to request format.

#### Response Changes

Same as `/auth/register` - now includes OTP channel and retry information.

### POST /auth/refresh

#### Response Changes

```typescript
// v1 Response
interface RefreshResponseV1 {
  accessToken: string;
  refreshToken: string;
}

// v2 Response
interface RefreshResponseV2 {
  tokens: {
    access: string;
    refresh: string;
    type: 'Bearer';
    expiresIn: number;
  };
  session: {
    id: string;
    lastActivity: string;
  };
}
```

#### Migration Example

```typescript
// Before (v1)
async function refreshTokenV1() {
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await api.post('/auth/refresh', { refreshToken });

  localStorage.setItem('accessToken', response.data.accessToken);
  localStorage.setItem('refreshToken', response.data.refreshToken);
}

// After (v2)
async function refreshTokenV2() {
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await api.post('/auth/refresh', { refreshToken });
  const { tokens, session } = response.data;

  localStorage.setItem('accessToken', tokens.access);
  localStorage.setItem('refreshToken', tokens.refresh);
  localStorage.setItem('tokenExpiresAt', Date.now() + tokens.expiresIn * 1000);

  // Reschedule next refresh
  scheduleTokenRefresh(tokens.expiresIn - 60);

  return session;
}
```

### POST /auth/logout

#### Response Changes

```typescript
// v1 Response
interface LogoutResponseV1 {
  success: boolean;
  message: string;
}

// v2 Response
interface LogoutResponseV2 {
  success: boolean;
  message: string;
  session: {
    id: string;
    terminatedAt: string;
  };
}
```

### POST /auth/logout-all

#### Response Changes

```typescript
// v1 Response
interface LogoutAllResponseV1 {
  success: boolean;
  message: string;
  sessionsInvalidated: number;
}

// v2 Response
interface LogoutAllResponseV2 {
  success: boolean;
  message: string;
  sessions: {
    terminated: number;
    preserved: number;   // 1 if currentRefreshToken provided
    devices: Array<{
      id: string;
      name?: string;
      lastActive: string;
      terminated: boolean;
    }>;
  };
}
```

## PIN Verification Changes

### POST /wallet/pin/verify

#### Key Changes

1. **Shorter token validity**: PIN tokens now expire after 2 minutes (was 5 minutes)
2. **Device binding**: PIN verification is now bound to the device

#### Response Changes

```typescript
// v1 Response
interface PinVerifyResponseV1 {
  valid: boolean;
  message: string;
  pinToken: string;
  expiresIn: number;  // 300 (5 minutes)
}

// v2 Response
interface PinVerifyResponseV2 {
  valid: boolean;
  message: string;
  authorization: {
    token: string;
    expiresIn: number;  // 120 (2 minutes)
    expiresAt: string;
    scope: string[];    // ['transfer', 'withdraw']
    deviceBound: boolean;
  };
  security: {
    remainingAttempts: number;
    nextLockoutDuration?: number;
  };
}
```

#### Migration Example

```typescript
// Before (v1)
async function verifyPinAndTransfer(pin: string, transferData: any) {
  // Verify PIN
  const pinResponse = await api.post('/wallet/pin/verify', { pin });
  const pinToken = pinResponse.data.pinToken;

  // Use token for 5 minutes
  const transferResponse = await api.post('/wallet/transfer/internal', transferData, {
    headers: { 'X-Pin-Token': pinToken },
  });

  return transferResponse.data;
}

// After (v2)
async function verifyPinAndTransfer(pin: string, transferData: any) {
  // Verify PIN
  const pinResponse = await api.post('/wallet/pin/verify', { pin });
  const { authorization, security } = pinResponse.data;

  // Check if scope includes required action
  if (!authorization.scope.includes('transfer')) {
    throw new Error('PIN not authorized for transfers');
  }

  // Token only valid for 2 minutes now - execute immediately
  const transferResponse = await api.post('/wallet/transfer/internal', transferData, {
    headers: {
      'X-Pin-Token': authorization.token,
      'X-Device-ID': getDeviceId(), // Required if deviceBound is true
    },
  });

  return transferResponse.data.transfer;
}
```

## Device Management (New in v2)

### GET /user/devices

New endpoint to list registered devices.

```typescript
interface DevicesResponse {
  devices: Array<{
    id: string;
    name: string;
    type: 'ios' | 'android' | 'web';
    lastActive: string;
    location?: {
      city: string;
      country: string;
    };
    current: boolean;
    trusted: boolean;
  }>;
}
```

### DELETE /user/devices/:id

Remove a registered device and invalidate its sessions.

```typescript
interface RemoveDeviceResponse {
  success: boolean;
  sessionsTerminated: number;
}
```

## Security Enhancements in v2

### Device Binding

Sensitive operations now require the `X-Device-ID` header matching a registered device:

```typescript
// Operations requiring device binding
const sensitiveEndpoints = [
  'POST /wallet/transfer/external',
  'POST /wallet/withdraw',
  'PUT /wallet/pin',
  'DELETE /user/devices/:id',
];

// Include device ID in requests
api.interceptors.request.use((config) => {
  if (sensitiveEndpoints.some(e => config.url?.includes(e.split(' ')[1]))) {
    config.headers['X-Device-ID'] = getDeviceId();
  }
  return config;
});
```

### Request Signing for Large Amounts

Transfers over $1000 require request signing:

```typescript
// For amounts > $1000 (100000 cents)
if (amount > 100000) {
  const signature = signRequest({
    method: 'POST',
    path: '/wallet/transfer/internal',
    body: requestBody,
    timestamp: Date.now(),
  });

  config.headers['X-Request-Signature'] = signature;
  config.headers['X-Request-Timestamp'] = Date.now().toString();
}
```

## Error Handling

### New Authentication Error Codes

| Error Code                  | Description                            | HTTP Status |
|-----------------------------|----------------------------------------|-------------|
| `AUTH_TOKEN_EXPIRED`        | Access token has expired               | 401         |
| `AUTH_TOKEN_INVALID`        | Token is malformed or invalid          | 401         |
| `AUTH_REFRESH_TOKEN_EXPIRED`| Refresh token has expired              | 401         |
| `AUTH_REFRESH_TOKEN_REVOKED`| Refresh token was revoked              | 401         |
| `AUTH_SESSION_INVALID`      | Session not found or terminated        | 401         |
| `AUTH_DEVICE_NOT_TRUSTED`   | Device not registered for this account | 403         |
| `AUTH_OTP_EXPIRED`          | OTP has expired                        | 400         |
| `AUTH_OTP_INVALID`          | OTP is incorrect                       | 400         |
| `AUTH_OTP_MAX_ATTEMPTS`     | Too many OTP attempts                  | 429         |
| `PIN_INVALID`               | PIN is incorrect                       | 400         |
| `PIN_LOCKED`                | PIN locked due to failed attempts      | 403         |
| `PIN_NOT_SET`               | User has not set a PIN                 | 400         |

### Error Response Example

```json
{
  "error": {
    "code": "AUTH_TOKEN_EXPIRED",
    "message": "Your session has expired",
    "details": {
      "expiredAt": "2026-07-01T12:00:00Z"
    },
    "hint": "Please refresh your token or log in again"
  },
  "requestId": "req_abc123xyz",
  "timestamp": "2026-07-01T12:05:00Z"
}
```

## Axios Interceptor Migration

Complete example of migrating axios interceptors:

```typescript
// v1 Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post('/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', response.data.accessToken);
          localStorage.setItem('refreshToken', response.data.refreshToken);

          error.config.headers.Authorization = `Bearer ${response.data.accessToken}`;
          return axios(error.config);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// v2 Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const errorCode = error.response?.data?.error?.code;

    // Handle expired access token
    if (error.response?.status === 401 && errorCode === 'AUTH_TOKEN_EXPIRED') {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        try {
          const response = await axios.post('/auth/refresh', { refreshToken });
          const { tokens, session } = response.data;

          localStorage.setItem('accessToken', tokens.access);
          localStorage.setItem('refreshToken', tokens.refresh);
          localStorage.setItem('tokenExpiresAt', Date.now() + tokens.expiresIn * 1000);

          error.config.headers.Authorization = `Bearer ${tokens.access}`;
          return axios(error.config);
        } catch (refreshError) {
          const refreshErrorCode = refreshError.response?.data?.error?.code;

          if (refreshErrorCode === 'AUTH_REFRESH_TOKEN_REVOKED') {
            // Session was terminated (e.g., logout-all from another device)
            showSessionTerminatedModal();
          }

          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }

    // Handle device not trusted
    if (errorCode === 'AUTH_DEVICE_NOT_TRUSTED') {
      showDeviceVerificationFlow();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);
```

## Checklist

- [ ] Update token storage to use new structure
- [ ] Implement token expiry tracking
- [ ] Add session ID storage
- [ ] Update error handling for new error codes
- [ ] Implement device registration flow
- [ ] Reduce PIN verification timeout handling to 2 minutes
- [ ] Add X-Device-ID header to sensitive requests
- [ ] Implement request signing for large transfers
- [ ] Update axios interceptors
- [ ] Test session management across devices
