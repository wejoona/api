# SDK Generation Configuration

Automated SDK generation for TypeScript and Dart clients from OpenAPI/Swagger specification.

## Overview

This directory contains configuration and scripts to automatically generate type-safe SDKs for consuming the JoonaPay USDC Wallet API.

### Generated SDKs

- **TypeScript SDK** - For web dashboard and Node.js applications
- **Dart SDK** - For Flutter mobile application

## Prerequisites

```bash
# Install OpenAPI Generator CLI
npm install -g @openapitools/openapi-generator-cli

# Or use npx (recommended)
npx @openapitools/openapi-generator-cli version
```

## Directory Structure

```
sdk-gen/
├── configs/
│   ├── typescript.yaml       # TypeScript SDK config
│   └── dart.yaml             # Dart SDK config
├── scripts/
│   ├── generate-all.sh       # Generate all SDKs
│   ├── generate-ts.sh        # Generate TypeScript SDK
│   ├── generate-dart.sh      # Generate Dart SDK
│   └── watch.sh              # Watch mode for development
├── templates/
│   ├── typescript/           # Custom TypeScript templates
│   └── dart/                 # Custom Dart templates
├── output/
│   ├── typescript/           # Generated TypeScript SDK
│   └── dart/                 # Generated Dart SDK
└── README.md                 # This file
```

## Quick Start

### 1. Generate All SDKs

```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/sdk-gen
./scripts/generate-all.sh
```

### 2. Generate Individual SDKs

```bash
# TypeScript only
./scripts/generate-ts.sh

# Dart only
./scripts/generate-dart.sh
```

### 3. Watch Mode (Development)

```bash
# Auto-regenerate on API changes
./scripts/watch.sh
```

## Configuration Files

### TypeScript SDK (`configs/typescript.yaml`)

- **Generator**: `typescript-axios`
- **Target**: Dashboard and Node.js applications
- **Features**:
  - Axios HTTP client
  - TypeScript interfaces
  - Promise-based API
  - Automatic serialization/deserialization
  - Request/response interceptors

### Dart SDK (`configs/dart.yaml`)

- **Generator**: `dart-dio`
- **Target**: Flutter mobile application
- **Features**:
  - Dio HTTP client
  - Null-safety support
  - JSON serialization
  - Built-in error handling
  - Retry logic support

## Integration

### TypeScript SDK

#### Install in Dashboard

```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/dashboard
npm install ../usdc-wallet/sdk-gen/output/typescript
```

#### Usage Example

```typescript
import { Configuration, AuthApi, WalletApi } from 'joonapay-sdk';

// Configure client
const config = new Configuration({
  basePath: 'http://localhost:3000/api/v1',
  accessToken: 'your-jwt-token'
});

// Initialize APIs
const authApi = new AuthApi(config);
const walletApi = new WalletApi(config);

// Use the SDK
const loginResponse = await authApi.login({
  phoneNumber: '+2250701234567'
});

const balance = await walletApi.getWalletBalance();
```

### Dart SDK

#### Install in Mobile App

```yaml
# pubspec.yaml
dependencies:
  joonapay_sdk:
    path: ../usdc-wallet/sdk-gen/output/dart
```

#### Usage Example

```dart
import 'package:joonapay_sdk/api.dart';

// Configure client
final apiClient = ApiClient(basePath: 'http://localhost:3000/api/v1');
final authApi = AuthApi(apiClient);
final walletApi = WalletApi(apiClient);

// Use the SDK
final loginResponse = await authApi.login(
  LoginRequest(phoneNumber: '+2250701234567'),
);

final balance = await walletApi.getWalletBalance();
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/generate-sdks.yml
name: Generate SDKs

on:
  push:
    paths:
      - 'usdc-wallet/src/**/*.controller.ts'
      - 'usdc-wallet/src/**/*.dto.ts'
      - 'usdc-wallet/src/main.ts'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: cd usdc-wallet && npm install

      - name: Start API server
        run: cd usdc-wallet && npm run start:dev &

      - name: Wait for API
        run: sleep 30

      - name: Generate SDKs
        run: cd usdc-wallet/sdk-gen && ./scripts/generate-all.sh

      - name: Commit SDKs
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add sdk-gen/output
          git commit -m "chore: regenerate SDKs" || echo "No changes"
          git push
```

## NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "sdk:generate": "cd sdk-gen && ./scripts/generate-all.sh",
    "sdk:generate:ts": "cd sdk-gen && ./scripts/generate-ts.sh",
    "sdk:generate:dart": "cd sdk-gen && ./scripts/generate-dart.sh",
    "sdk:watch": "cd sdk-gen && ./scripts/watch.sh"
  }
}
```

## Customization

### Custom Templates

Place custom templates in `templates/` directory to override default generator templates.

**TypeScript Example:**
```
templates/typescript/
├── api.mustache
├── apiInner.mustache
└── modelGeneric.mustache
```

**Dart Example:**
```
templates/dart/
├── api.mustache
├── serialization/
│   └── json.mustache
└── model.mustache
```

### Generator Options

Edit `configs/typescript.yaml` or `configs/dart.yaml` to customize:

- Package name and version
- Naming conventions
- Import mappings
- Type mappings
- Additional properties

## Versioning

SDKs follow semantic versioning based on API changes:

- **Major**: Breaking API changes
- **Minor**: New endpoints or features
- **Patch**: Bug fixes or documentation updates

## Publishing

### TypeScript SDK to NPM

```bash
cd output/typescript
npm publish --access public
```

### Dart SDK to pub.dev

```bash
cd output/dart
flutter pub publish
```

## Troubleshooting

### API Server Not Running

```bash
# Ensure API is running
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet
npm run start:dev

# Verify Swagger JSON is accessible
curl http://localhost:3000/docs-json
```

### OpenAPI Generator Issues

```bash
# Clear cache
rm -rf ~/.openapi-generator

# Reinstall
npm install -g @openapitools/openapi-generator-cli
```

### Invalid Spec

```bash
# Validate OpenAPI spec
npx @redocly/cli lint http://localhost:3000/docs-json
```

## Best Practices

1. **Version Control**: Commit generated SDKs to track API changes
2. **Semantic Versioning**: Bump versions on breaking changes
3. **Documentation**: Update SDK docs when API changes
4. **Testing**: Write integration tests for SDKs
5. **CI/CD**: Automate SDK generation on API changes

## Support

For issues or questions:
- Backend API: See `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/README.md`
- OpenAPI Generator: https://openapi-generator.tech/docs/generators
- Issues: Contact JoonaPay Engineering Team

---

**Last Updated**: 2026-01-30
**Maintainer**: JoonaPay Engineering Team
