# SDK Integration Guide

Step-by-step guide for integrating generated SDKs into Dashboard and Mobile apps.

## Prerequisites

1. API server running: `cd usdc-wallet && npm run start:dev`
2. SDKs generated: `cd sdk-gen && ./scripts/generate-all.sh`

## Dashboard Integration (TypeScript SDK)

### Step 1: Install SDK

```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/dashboard

# Option A: Install from local path (development)
npm install ../usdc-wallet/sdk-gen/output/typescript

# Option B: Install from npm (production)
npm install @joonapay/sdk
```

### Step 2: Create API Client Service

Create `src/lib/api-client.ts`:

```typescript
import {
  Configuration,
  AuthApi,
  UserApi,
  WalletApi,
  TransfersApi,
  TransactionsApi,
  BeneficiariesApi,
} from '@joonapay/sdk';

class ApiClient {
  private config: Configuration;
  private _authApi?: AuthApi;
  private _userApi?: UserApi;
  private _walletApi?: WalletApi;
  private _transfersApi?: TransfersApi;
  private _transactionsApi?: TransactionsApi;
  private _beneficiariesApi?: BeneficiariesApi;

  constructor() {
    this.config = new Configuration({
      basePath: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
    });
  }

  setAccessToken(token: string) {
    this.config = new Configuration({
      ...this.config,
      accessToken: token,
    });

    // Reset API instances to use new token
    this._authApi = undefined;
    this._userApi = undefined;
    this._walletApi = undefined;
    this._transfersApi = undefined;
    this._transactionsApi = undefined;
    this._beneficiariesApi = undefined;
  }

  get auth(): AuthApi {
    if (!this._authApi) {
      this._authApi = new AuthApi(this.config);
    }
    return this._authApi;
  }

  get user(): UserApi {
    if (!this._userApi) {
      this._userApi = new UserApi(this.config);
    }
    return this._userApi;
  }

  get wallet(): WalletApi {
    if (!this._walletApi) {
      this._walletApi = new WalletApi(this.config);
    }
    return this._walletApi;
  }

  get transfers(): TransfersApi {
    if (!this._transfersApi) {
      this._transfersApi = new TransfersApi(this.config);
    }
    return this._transfersApi;
  }

  get transactions(): TransactionsApi {
    if (!this._transactionsApi) {
      this._transactionsApi = new TransactionsApi(this.config);
    }
    return this._transactionsApi;
  }

  get beneficiaries(): BeneficiariesApi {
    if (!this._beneficiariesApi) {
      this._beneficiariesApi = new BeneficiariesApi(this.config);
    }
    return this._beneficiariesApi;
  }
}

export const apiClient = new ApiClient();
```

### Step 3: Use in Components

```typescript
// app/wallet/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Wallet } from '@joonapay/sdk';

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      const response = await apiClient.wallet.getWalletBalance();
      setWallet(response.data);
    } catch (error) {
      console.error('Failed to load wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Wallet</h1>
      <p>Balance: ${wallet?.balance || 0}</p>
    </div>
  );
}
```

### Step 4: Authentication Flow

```typescript
// lib/auth.ts
import { apiClient } from './api-client';

export async function login(phoneNumber: string) {
  const response = await apiClient.auth.login({ phoneNumber });
  return response.data;
}

export async function verifyOtp(phoneNumber: string, otp: string) {
  const response = await apiClient.auth.verifyOtp({ phoneNumber, otp });
  const { accessToken, refreshToken } = response.data;

  // Store tokens
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);

  // Set token in API client
  apiClient.setAccessToken(accessToken);

  return response.data;
}

export async function logout() {
  await apiClient.auth.logout();
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function getStoredToken(): string | null {
  return localStorage.getItem('accessToken');
}

export function initializeAuth() {
  const token = getStoredToken();
  if (token) {
    apiClient.setAccessToken(token);
  }
}
```

## Mobile Integration (Dart SDK)

### Step 1: Install SDK

```yaml
# mobile/pubspec.yaml
dependencies:
  joonapay_sdk:
    path: ../usdc-wallet/sdk-gen/output/dart

  # Or from pub.dev
  # joonapay_sdk: ^1.0.0

  dio: ^5.0.0
```

Run: `flutter pub get`

### Step 2: Create API Client Service

Create `lib/core/api/api_client.dart`:

```dart
import 'package:dio/dio.dart';
import 'package:joonapay_sdk/joonapay_sdk.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  late Dio _dio;
  late JoonapaySdk _sdk;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';

  ApiClient({String? baseUrl}) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl ?? 'http://localhost:3000/api/v1',
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
    ));

    // Add request interceptor for auth token
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: _accessTokenKey);
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          // Handle 401 - try to refresh token
          if (error.response?.statusCode == 401) {
            final refreshed = await _refreshToken();
            if (refreshed) {
              // Retry original request
              return handler.resolve(await _dio.fetch(error.requestOptions));
            }
          }
          return handler.next(error);
        },
      ),
    );

    _sdk = JoonapaySdk(dio: _dio);
  }

  // Auth API
  AuthApi get auth => _sdk.getAuthApi();

  // User API
  UserApi get user => _sdk.getUserApi();

  // Wallet API
  WalletApi get wallet => _sdk.getWalletApi();

  // Transfers API
  TransfersApi get transfers => _sdk.getTransfersApi();

  // Transactions API
  TransactionsApi get transactions => _sdk.getTransactionsApi();

  // Beneficiaries API
  BeneficiariesApi get beneficiaries => _sdk.getBeneficiariesApi();

  // Save tokens
  Future<void> saveTokens(String accessToken, String refreshToken) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }

  // Clear tokens
  Future<void> clearTokens() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }

  // Refresh token
  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await _storage.read(key: _refreshTokenKey);
      if (refreshToken == null) return false;

      final response = await auth.refreshToken(
        RefreshTokenRequest(refreshToken: refreshToken),
      );

      await saveTokens(
        response.accessToken,
        response.refreshToken ?? refreshToken,
      );

      return true;
    } catch (e) {
      await clearTokens();
      return false;
    }
  }
}

// Global instance
final apiClient = ApiClient();
```

### Step 3: Use in Widgets

```dart
// lib/features/wallet/wallet_screen.dart
import 'package:flutter/material.dart';
import 'package:joonapay_sdk/joonapay_sdk.dart';
import '../../core/api/api_client.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({Key? key}) : super(key: key);

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  Wallet? _wallet;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadWallet();
  }

  Future<void> _loadWallet() async {
    try {
      final wallet = await apiClient.wallet.getWalletBalance();
      setState(() {
        _wallet = wallet;
        _loading = false;
      });
    } on DioException catch (e) {
      setState(() {
        _error = e.response?.data['message'] ?? 'Failed to load wallet';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(child: Text('Error: $_error'));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Wallet')),
      body: Center(
        child: Text('Balance: \$${_wallet?.balance ?? 0}'),
      ),
    );
  }
}
```

### Step 4: Authentication Flow

```dart
// lib/core/auth/auth_service.dart
import 'package:joonapay_sdk/joonapay_sdk.dart';
import '../api/api_client.dart';

class AuthService {
  Future<LoginResponse> login(String phoneNumber) async {
    return await apiClient.auth.login(
      LoginRequest(phoneNumber: phoneNumber),
    );
  }

  Future<VerifyOtpResponse> verifyOtp(String phoneNumber, String otp) async {
    final response = await apiClient.auth.verifyOtp(
      VerifyOtpRequest(phoneNumber: phoneNumber, otp: otp),
    );

    // Save tokens
    await apiClient.saveTokens(
      response.accessToken,
      response.refreshToken,
    );

    return response;
  }

  Future<void> logout() async {
    try {
      await apiClient.auth.logout();
    } finally {
      await apiClient.clearTokens();
    }
  }
}

final authService = AuthService();
```

## Testing the Integration

### Dashboard (TypeScript)

```typescript
// __tests__/api-client.test.ts
import { apiClient } from '@/lib/api-client';

describe('API Client', () => {
  it('should login user', async () => {
    const response = await apiClient.auth.login({
      phoneNumber: '+2250701234567',
    });

    expect(response.data).toHaveProperty('phoneNumber');
  });

  it('should get wallet balance', async () => {
    apiClient.setAccessToken('test-token');

    const response = await apiClient.wallet.getWalletBalance();

    expect(response.data).toHaveProperty('balance');
  });
});
```

### Mobile (Dart)

```dart
// test/api_client_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:joonapay_sdk/joonapay_sdk.dart';

void main() {
  test('should login user', () async {
    final response = await apiClient.auth.login(
      LoginRequest(phoneNumber: '+2250701234567'),
    );

    expect(response.phoneNumber, isNotNull);
  });

  test('should get wallet balance', () async {
    final wallet = await apiClient.wallet.getWalletBalance();

    expect(wallet.balance, isNotNull);
  });
}
```

## Environment Configuration

### Dashboard (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### Mobile (lib/config/env.dart)

```dart
class Env {
  static const String apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:3000/api/v1',
  );
}
```

## Best Practices

1. **Error Handling**: Always wrap API calls in try-catch blocks
2. **Loading States**: Show loading indicators during API calls
3. **Token Management**: Store tokens securely (localStorage for web, secure storage for mobile)
4. **Token Refresh**: Implement automatic token refresh on 401 errors
5. **Request IDs**: Add unique request IDs for tracking
6. **Retry Logic**: Implement retry for network failures
7. **Caching**: Cache API responses where appropriate
8. **Type Safety**: Use generated TypeScript/Dart types

## Troubleshooting

### CORS Errors (Dashboard)

Add to `next.config.js`:

```javascript
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/v1/:path*',
      },
    ];
  },
};
```

### Certificate Errors (Mobile)

For development only:

```dart
(_dio.httpClientAdapter as DefaultHttpClientAdapter).onHttpClientCreate =
    (client) {
  client.badCertificateCallback =
      (X509Certificate cert, String host, int port) => true;
  return client;
};
```

---

**Last Updated**: 2026-01-30
