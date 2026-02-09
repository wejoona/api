# SDK Generation - Complete Index

Quick reference to all documentation and resources.

## Documentation Files

### Quick References
- **[QUICK_START.md](QUICK_START.md)** - 5-minute setup guide
- **[README.md](README.md)** - Main documentation and overview
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and diagrams

### Detailed Guides
- **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** - Step-by-step integration for Dashboard and Mobile
- **[SDK_GENERATION_SUMMARY.md](SDK_GENERATION_SUMMARY.md)** - Complete implementation details

### Project Management
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes
- **[.gitignore](.gitignore)** - Git ignore rules

## Configuration Files

### Generator Configs
- **[configs/typescript.yaml](configs/typescript.yaml)** - TypeScript SDK generator configuration
- **[configs/dart.yaml](configs/dart.yaml)** - Dart SDK generator configuration

### CI/CD
- **[.github/workflows/generate-sdks.yml](.github/workflows/generate-sdks.yml)** - GitHub Actions workflow

## Scripts

All scripts are executable (`chmod +x`):

| Script | Purpose | Usage |
|--------|---------|-------|
| **generate-all.sh** | Generate both SDKs | `npm run sdk:generate` |
| **generate-ts.sh** | Generate TypeScript only | `npm run sdk:generate:ts` |
| **generate-dart.sh** | Generate Dart only | `npm run sdk:generate:dart` |
| **watch.sh** | Auto-regenerate on changes | `npm run sdk:watch` |
| **validate-spec.sh** | Validate OpenAPI spec | `npm run sdk:validate` |
| **publish-ts.sh** | Publish to NPM | `npm run sdk:publish:ts` |
| **publish-dart.sh** | Publish to pub.dev | `npm run sdk:publish:dart` |

## Generated Outputs

### TypeScript SDK
**Location**: `output/typescript/`

```
output/typescript/
├── api/                  # API classes
│   ├── auth-api.ts
│   ├── wallet-api.ts
│   ├── transfers-api.ts
│   └── ...
├── models/               # Type definitions
│   ├── user.ts
│   ├── wallet.ts
│   ├── transaction.ts
│   └── ...
├── configuration.ts      # Config class
├── index.ts              # Main exports
├── package.json          # NPM package config
├── tsconfig.json         # TypeScript config
└── README.md             # SDK documentation
```

**Package**: `@joonapay/sdk`
**Version**: 1.0.0

### Dart SDK
**Location**: `output/dart/`

```
output/dart/
├── lib/
│   ├── api/              # API classes
│   │   ├── auth_api.dart
│   │   ├── wallet_api.dart
│   │   ├── transfers_api.dart
│   │   └── ...
│   ├── model/            # Models
│   │   ├── user.dart
│   │   ├── wallet.dart
│   │   ├── transaction.dart
│   │   └── ...
│   └── joonapay_sdk.dart # Main SDK class
├── pubspec.yaml          # Dart package config
└── README.md             # SDK documentation
```

**Package**: `joonapay_sdk`
**Version**: 1.0.0

## Templates

Custom templates for overriding generator defaults:

- **[templates/typescript/.openapi-generator-ignore](templates/typescript/.openapi-generator-ignore)** - TypeScript ignore rules
- **[templates/dart/.openapi-generator-ignore](templates/dart/.openapi-generator-ignore)** - Dart ignore rules

## NPM Scripts

Added to `package.json`:

```bash
# Generation
npm run sdk:generate         # Generate both SDKs
npm run sdk:generate:ts      # TypeScript only
npm run sdk:generate:dart    # Dart only

# Development
npm run sdk:watch           # Watch for changes
npm run sdk:validate        # Validate spec

# Publishing
npm run sdk:publish:ts      # Publish to NPM
npm run sdk:publish:dart    # Publish to pub.dev
```

## Quick Command Reference

### Initial Setup
```bash
# 1. Start API
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet
npm run start:dev

# 2. Generate SDKs
npm run sdk:generate
```

### Development Workflow
```bash
# Watch for API changes
npm run sdk:watch

# Validate spec
npm run sdk:validate

# Generate specific SDK
npm run sdk:generate:ts    # or :dart
```

### Publishing
```bash
# Publish TypeScript to NPM
npm run sdk:publish:ts

# Publish Dart to pub.dev
npm run sdk:publish:dart
```

## Integration Paths

### Dashboard (TypeScript)
```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/dashboard
npm install ../usdc-wallet/sdk-gen/output/typescript
```

```typescript
import { Configuration, WalletApi } from '@joonapay/sdk';

const config = new Configuration({
  basePath: 'http://localhost:3000/api/v1',
  accessToken: 'your-token'
});

const wallet = new WalletApi(config);
```

### Mobile (Dart)
```yaml
# pubspec.yaml
dependencies:
  joonapay_sdk:
    path: ../usdc-wallet/sdk-gen/output/dart
```

```dart
import 'package:joonapay_sdk/joonapay_sdk.dart';

final sdk = JoonapaySdk(dio: dio);
final wallet = sdk.getWalletApi();
```

## File Locations

### Absolute Paths

**SDK Generation Root**:
```
/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/sdk-gen/
```

**TypeScript Output**:
```
/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/sdk-gen/output/typescript/
```

**Dart Output**:
```
/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/sdk-gen/output/dart/
```

**API Server**:
```
/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/
```

**Dashboard**:
```
/Users/macbook/JoonaPay/USDC-Wallet/dashboard/
```

**Mobile App**:
```
/Users/macbook/JoonaPay/USDC-Wallet/mobile/
```

## API Endpoints

### OpenAPI Spec
- **JSON**: `http://localhost:3000/docs-json`
- **YAML**: `http://localhost:3000/docs-yaml`
- **Swagger UI**: `http://localhost:3000/docs`

### API Base
- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://api.joonapay.com/api/v1`

## Dependencies

### For Generation
- Node.js 18+
- NPM 9+
- OpenAPI Generator CLI (via npx)

### For TypeScript SDK
- TypeScript 5.0+
- Axios 1.6+

### For Dart SDK
- Flutter 3.0+
- Dart 2.12+ (null-safe)
- Dio 5.0+

## Supported API Endpoints

Both SDKs support all API endpoints:

### Authentication & Users
- POST `/auth/register`
- POST `/auth/login`
- POST `/auth/verify-otp`
- POST `/auth/refresh`
- POST `/auth/logout`
- GET `/user/profile`
- PUT `/user/profile`

### Wallet
- GET `/wallet`
- POST `/wallet/create`
- POST `/wallet/deposit`
- POST `/wallet/withdraw`
- GET `/wallet/rate`

### Transfers
- POST `/transfers/internal`
- POST `/transfers/external`
- GET `/transfers`
- GET `/transfers/:id`

### Transactions
- GET `/wallet/transactions`
- GET `/wallet/transactions/:id`

### Beneficiaries
- GET `/beneficiaries`
- POST `/beneficiaries`
- PUT `/beneficiaries/:id`
- DELETE `/beneficiaries/:id`

### KYC
- GET `/kyc/status`
- POST `/kyc/submit`

### Sessions & Devices
- GET `/sessions`
- DELETE `/sessions/:id`
- POST `/devices/register`
- GET `/devices`

### Feature Flags
- GET `/feature-flags/check/:key`
- GET `/feature-flags/me`

### Bill Payments
- GET `/bill-payments/providers`
- POST `/bill-payments/pay`
- GET `/bill-payments/history`

### Merchants
- POST `/merchants/register`
- GET `/merchants/me`
- POST `/merchants/pay`

### Payment Links
- POST `/payment-links`
- GET `/payment-links/:id`
- POST `/payment-links/:code/pay`

### Health
- GET `/health`
- GET `/health/ready`
- GET `/health/live`

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| API not running | `npm run start:dev` |
| Invalid spec | `npm run sdk:validate` |
| Generation fails | Clear cache: `rm -rf ~/.openapi-generator` |
| Module not found (Dashboard) | Reinstall: `npm install ../usdc-wallet/sdk-gen/output/typescript` |
| Package not found (Mobile) | Run: `flutter pub get` |

## Support Resources

### Internal Documentation
- Main README: [README.md](README.md)
- Quick Start: [QUICK_START.md](QUICK_START.md)
- Integration: [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)

### External Resources
- OpenAPI Generator: https://openapi-generator.tech
- TypeScript Generator: https://openapi-generator.tech/docs/generators/typescript-axios
- Dart Generator: https://openapi-generator.tech/docs/generators/dart-dio
- Swagger Docs: http://localhost:3000/docs

## Versioning

Both SDKs follow **Semantic Versioning** (semver.org):

- **MAJOR**: Breaking API changes
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes, backwards compatible

Current Version: **1.0.0**

## CI/CD Secrets

Required GitHub secrets for automated publishing:

| Secret | Purpose |
|--------|---------|
| `NPM_TOKEN` | NPM registry authentication |
| `PUB_CREDENTIALS` | pub.dev authentication |

## Next Steps

1. **First Time**: Read [QUICK_START.md](QUICK_START.md)
2. **Integration**: Follow [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
3. **Development**: Use `npm run sdk:watch`
4. **Production**: Set up CI/CD with GitHub Actions

---

**Created**: 2026-01-30
**Version**: 1.0.0
**Maintainer**: JoonaPay Engineering Team
