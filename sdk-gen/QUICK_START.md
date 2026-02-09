# SDK Generation - Quick Start Guide

Get started with SDK generation in 5 minutes.

## Prerequisites

```bash
# Ensure API is running
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet
npm run start:dev

# Verify Swagger is accessible
curl http://localhost:3000/docs-json | jq '.info.title'
# Should output: "USDC Wallet API"
```

## Step 1: Generate SDKs (2 minutes)

```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet

# Generate both TypeScript and Dart SDKs
npm run sdk:generate

# Or generate individually
npm run sdk:generate:ts    # TypeScript only
npm run sdk:generate:dart  # Dart only
```

Expected output:
```
========================================
JoonaPay SDK Generator - Generate All
========================================

✓ API is running
✓ OpenAPI spec is valid

[1/2] Generating TypeScript SDK...
✓ TypeScript SDK generated successfully

[2/2] Generating Dart SDK...
✓ Dart SDK generated successfully

========================================
Generation Summary
========================================
✓ TypeScript SDK → output/typescript/
✓ Dart SDK → output/dart/

All SDKs generated successfully!
```

## Step 2: Install in Dashboard (1 minute)

```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/dashboard

# Install SDK from local path
npm install ../usdc-wallet/sdk-gen/output/typescript
```

Create `lib/api-client.ts`:

```typescript
import { Configuration, WalletApi, AuthApi } from '@joonapay/sdk';

const config = new Configuration({
  basePath: 'http://localhost:3000/api/v1',
});

export const auth = new AuthApi(config);
export const wallet = new WalletApi(config);
```

Use in your components:

```typescript
import { wallet } from '@/lib/api-client';

const balance = await wallet.getWalletBalance();
console.log(balance.data);
```

## Step 3: Install in Mobile App (1 minute)

```yaml
# mobile/pubspec.yaml
dependencies:
  joonapay_sdk:
    path: ../usdc-wallet/sdk-gen/output/dart
  dio: ^5.0.0
```

```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/mobile
flutter pub get
```

Create `lib/core/api/api_client.dart`:

```dart
import 'package:dio/dio.dart';
import 'package:joonapay_sdk/joonapay_sdk.dart';

final dio = Dio(BaseOptions(
  baseUrl: 'http://localhost:3000/api/v1',
));

final sdk = JoonapaySdk(dio: dio);
final wallet = sdk.getWalletApi();
final auth = sdk.getAuthApi();
```

Use in your widgets:

```dart
final balance = await wallet.getWalletBalance();
print('Balance: \$${balance.balance}');
```

## Step 4: Test Integration (1 minute)

### Dashboard Test

```typescript
// app/test/page.tsx
'use client';

import { useEffect } from 'react';
import { wallet } from '@/lib/api-client';

export default function TestPage() {
  useEffect(() => {
    wallet.getWalletBalance()
      .then(res => console.log('Balance:', res.data))
      .catch(err => console.error('Error:', err));
  }, []);

  return <div>Check console for API response</div>;
}
```

### Mobile Test

```dart
// lib/test_screen.dart
import 'package:flutter/material.dart';
import 'core/api/api_client.dart';

class TestScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ElevatedButton(
          onPressed: () async {
            final balance = await wallet.getWalletBalance();
            print('Balance: ${balance.balance}');
          },
          child: Text('Test API'),
        ),
      ),
    );
  }
}
```

## Common Commands

```bash
# Generate SDKs
npm run sdk:generate

# Watch for changes (auto-regenerate)
npm run sdk:watch

# Validate OpenAPI spec
npm run sdk:validate

# Publish to NPM
npm run sdk:publish:ts

# Publish to pub.dev
npm run sdk:publish:dart
```

## Troubleshooting

### Issue: API not running

```bash
✗ API is not running
Please start the API server first:
  cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet
  npm run start:dev
```

**Solution**: Start the API server in a separate terminal.

### Issue: Invalid spec

```bash
✗ Invalid JSON in OpenAPI spec
```

**Solution**: Check API logs for errors, ensure all controllers are properly documented.

### Issue: Generation fails

```bash
✗ TypeScript SDK generation failed
```

**Solution**:
1. Clear OpenAPI Generator cache: `rm -rf ~/.openapi-generator`
2. Retry: `npm run sdk:generate`

### Issue: Module not found (Dashboard)

```bash
Error: Cannot find module '@joonapay/sdk'
```

**Solution**:
```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/dashboard
npm install ../usdc-wallet/sdk-gen/output/typescript
```

### Issue: Package not found (Mobile)

```bash
Error: Pub get failed
```

**Solution**:
```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/mobile
flutter pub get
flutter pub upgrade
```

## Next Steps

1. **Read Full Docs**: See `README.md` for comprehensive documentation
2. **Integration Guide**: See `INTEGRATION_GUIDE.md` for detailed examples
3. **CI/CD Setup**: Configure GitHub Actions for auto-generation
4. **Version Management**: Update versions in config files before publishing

## Complete Example: Login Flow

### TypeScript (Dashboard)

```typescript
import { auth } from '@/lib/api-client';

// 1. Request OTP
await auth.login({ phoneNumber: '+2250701234567' });

// 2. Verify OTP
const response = await auth.verifyOtp({
  phoneNumber: '+2250701234567',
  otp: '123456'
});

// 3. Store tokens
localStorage.setItem('accessToken', response.data.accessToken);
localStorage.setItem('refreshToken', response.data.refreshToken);

// 4. Use token
import { Configuration, WalletApi } from '@joonapay/sdk';

const config = new Configuration({
  basePath: 'http://localhost:3000/api/v1',
  accessToken: response.data.accessToken
});

const wallet = new WalletApi(config);
const balance = await wallet.getWalletBalance();
```

### Dart (Mobile)

```dart
import 'package:joonapay_sdk/joonapay_sdk.dart';
import 'core/api/api_client.dart';

// 1. Request OTP
await auth.login(LoginRequest(phoneNumber: '+2250701234567'));

// 2. Verify OTP
final response = await auth.verifyOtp(
  VerifyOtpRequest(
    phoneNumber: '+2250701234567',
    otp: '123456',
  ),
);

// 3. Store tokens (using flutter_secure_storage)
await storage.write(key: 'access_token', value: response.accessToken);
await storage.write(key: 'refresh_token', value: response.refreshToken);

// 4. Add to Dio interceptor
dio.interceptors.add(
  InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await storage.read(key: 'access_token');
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      return handler.next(options);
    },
  ),
);

// 5. Use authenticated API
final balance = await wallet.getWalletBalance();
```

## File Locations

```
/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/
├── sdk-gen/
│   ├── README.md                    ← Main documentation
│   ├── QUICK_START.md              ← This file
│   ├── INTEGRATION_GUIDE.md        ← Detailed integration
│   ├── SDK_GENERATION_SUMMARY.md   ← Implementation details
│   ├── configs/
│   │   ├── typescript.yaml         ← TypeScript config
│   │   └── dart.yaml               ← Dart config
│   ├── scripts/
│   │   ├── generate-all.sh         ← Generate both
│   │   ├── generate-ts.sh          ← TypeScript only
│   │   └── generate-dart.sh        ← Dart only
│   └── output/
│       ├── typescript/             ← Generated TS SDK
│       └── dart/                   ← Generated Dart SDK
```

## Support

- **Documentation**: See `README.md`
- **Issues**: Check `TROUBLESHOOTING` section in README
- **API Docs**: http://localhost:3000/docs
- **OpenAPI Spec**: http://localhost:3000/docs-json

---

**You're all set!** Generate your SDKs and start integrating with:

```bash
npm run sdk:generate
```
