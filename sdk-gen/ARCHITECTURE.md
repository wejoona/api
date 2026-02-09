# SDK Generation Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         JoonaPay API Server                         │
│                      (NestJS + Swagger/OpenAPI)                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTP GET /docs-json
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      OpenAPI Specification                          │
│                         (JSON Format)                               │
│                                                                     │
│  {                                                                  │
│    "openapi": "3.0.0",                                             │
│    "info": { "title": "USDC Wallet API", ... },                   │
│    "paths": { "/wallet": {...}, "/transfers": {...} },            │
│    "components": { "schemas": {...} }                              │
│  }                                                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
         ┌──────────────────┐  ┌──────────────────┐
         │  TypeScript Gen  │  │    Dart Gen      │
         │  (typescript-    │  │   (dart-dio)     │
         │    axios)        │  │                  │
         └────────┬─────────┘  └────────┬─────────┘
                  │                     │
                  ▼                     ▼
         ┌──────────────────┐  ┌──────────────────┐
         │ TypeScript SDK   │  │    Dart SDK      │
         │  @joonapay/sdk   │  │  joonapay_sdk    │
         │                  │  │                  │
         │ • Axios client   │  │ • Dio client     │
         │ • TS types       │  │ • Null-safe      │
         │ • Promises       │  │ • JSON serial.   │
         └────────┬─────────┘  └────────┬─────────┘
                  │                     │
                  ▼                     ▼
         ┌──────────────────┐  ┌──────────────────┐
         │  Web Dashboard   │  │  Mobile App      │
         │   (Next.js)      │  │   (Flutter)      │
         └──────────────────┘  └──────────────────┘
```

## Generation Flow

```
┌──────────────┐
│ Developer    │
│ Makes API    │
│ Change       │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│ Update Controllers/DTOs  │
│ Add @ApiTags, etc.       │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ npm run start:dev        │
│ (Start API Server)       │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ npm run sdk:validate     │
│ (Validate Spec)          │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ npm run sdk:generate     │
│ (Generate SDKs)          │
└──────┬───────────────────┘
       │
       ├─────────────────────┐
       │                     │
       ▼                     ▼
┌──────────────┐      ┌──────────────┐
│ Generate TS  │      │ Generate Dart│
│    SDK       │      │     SDK      │
└──────┬───────┘      └──────┬───────┘
       │                     │
       ▼                     ▼
┌──────────────┐      ┌──────────────┐
│ Build TS     │      │ Analyze Dart │
│ npm run build│      │flutter analyze│
└──────┬───────┘      └──────┬───────┘
       │                     │
       └──────────┬──────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Test Integration│
         └────────┬────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Commit SDKs    │
         │ with API changes│
         └────────┬────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Git Push       │
         └────────┬────────┘
                  │
                  ▼
         ┌────────────────┐
         │ GitHub Actions │
         │ Auto-Publish   │
         └────────────────┘
```

## Directory Structure

```
usdc-wallet/
├── src/                              # API Source Code
│   ├── main.ts                       # Swagger setup
│   └── modules/
│       ├── wallet/
│       │   └── application/
│       │       └── controllers/
│       │           └── wallet.controller.ts  # @ApiTags, @ApiOperation
│       └── auth/
│           └── application/
│               └── controllers/
│                   └── auth.controller.ts    # API documentation
│
└── sdk-gen/                          # SDK Generation
    ├── configs/
    │   ├── typescript.yaml           # TS generator config
    │   └── dart.yaml                 # Dart generator config
    │
    ├── scripts/
    │   ├── generate-all.sh           # Main generation script
    │   ├── generate-ts.sh            # TypeScript only
    │   ├── generate-dart.sh          # Dart only
    │   ├── watch.sh                  # Auto-regenerate
    │   ├── validate-spec.sh          # Spec validation
    │   ├── publish-ts.sh             # Publish to NPM
    │   └── publish-dart.sh           # Publish to pub.dev
    │
    ├── templates/                    # Custom templates
    │   ├── typescript/
    │   │   └── .openapi-generator-ignore
    │   └── dart/
    │       └── .openapi-generator-ignore
    │
    ├── output/                       # Generated SDKs
    │   ├── typescript/
    │   │   ├── api/                  # API classes
    │   │   │   ├── auth-api.ts
    │   │   │   ├── wallet-api.ts
    │   │   │   └── ...
    │   │   ├── models/               # Type definitions
    │   │   │   ├── user.ts
    │   │   │   ├── wallet.ts
    │   │   │   └── ...
    │   │   ├── configuration.ts      # Config class
    │   │   ├── index.ts              # Exports
    │   │   ├── package.json          # NPM package
    │   │   └── tsconfig.json         # TS config
    │   │
    │   └── dart/
    │       ├── lib/
    │       │   ├── api/              # API classes
    │       │   │   ├── auth_api.dart
    │       │   │   ├── wallet_api.dart
    │       │   │   └── ...
    │       │   ├── model/            # Models
    │       │   │   ├── user.dart
    │       │   │   ├── wallet.dart
    │       │   │   └── ...
    │       │   └── joonapay_sdk.dart # Main SDK class
    │       └── pubspec.yaml          # Dart package
    │
    └── .github/
        └── workflows/
            └── generate-sdks.yml     # CI/CD automation
```

## Component Interactions

### TypeScript SDK Usage

```typescript
┌──────────────────────────────────────────────────────────┐
│                   Dashboard App (Next.js)                │
└──────────────────────────────────────────────────────────┘
                           │
                           │ import
                           ▼
┌──────────────────────────────────────────────────────────┐
│                   @joonapay/sdk                          │
│                                                          │
│  ┌────────────────┐  ┌────────────────┐                │
│  │ Configuration  │  │   API Classes  │                │
│  │ - basePath     │  │ - AuthApi      │                │
│  │ - accessToken  │  │ - WalletApi    │                │
│  └────────────────┘  │ - TransfersApi │                │
│                      └────────┬───────┘                 │
│                               │                         │
│  ┌────────────────┐          │                         │
│  │     Models     │◄─────────┘                         │
│  │ - User         │                                     │
│  │ - Wallet       │                                     │
│  │ - Transaction  │                                     │
│  └────────────────┘                                     │
└──────────────────────────────────────────────────────────┘
                           │
                           │ HTTP (Axios)
                           ▼
┌──────────────────────────────────────────────────────────┐
│              JoonaPay API (localhost:3000)               │
└──────────────────────────────────────────────────────────┘
```

### Dart SDK Usage

```dart
┌──────────────────────────────────────────────────────────┐
│                Mobile App (Flutter)                      │
└──────────────────────────────────────────────────────────┘
                           │
                           │ import
                           ▼
┌──────────────────────────────────────────────────────────┐
│                   joonapay_sdk                           │
│                                                          │
│  ┌────────────────┐  ┌────────────────┐                │
│  │ JoonapaySdk    │  │   API Classes  │                │
│  │ - Dio client   │  │ - AuthApi      │                │
│  │ - BaseOptions  │  │ - WalletApi    │                │
│  └────────────────┘  │ - TransfersApi │                │
│                      └────────┬───────┘                 │
│                               │                         │
│  ┌────────────────┐          │                         │
│  │     Models     │◄─────────┘                         │
│  │ - User         │                                     │
│  │ - Wallet       │                                     │
│  │ - Transaction  │                                     │
│  └────────────────┘                                     │
└──────────────────────────────────────────────────────────┘
                           │
                           │ HTTP (Dio)
                           ▼
┌──────────────────────────────────────────────────────────┐
│              JoonaPay API (Production)                   │
└──────────────────────────────────────────────────────────┘
```

## CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Push to main/develop
                      │ or change *.controller.ts
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   GitHub Actions Workflow                    │
│                  (.github/workflows/generate-sdks.yml)       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Checkout Code                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 2. Setup Node.js + Flutter                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 3. Install Dependencies                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 4. Start API Server                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 5. Validate OpenAPI Spec                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 6. Generate TypeScript SDK                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 7. Generate Dart SDK                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 8. Build & Validate SDKs                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 9. Commit Generated SDKs                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 10. Create Release Tag (main only)                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 11. Publish to NPM (main only)                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 12. Publish to pub.dev (main only)                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌──────────────┐
│   Client     │
│  (Dashboard  │
│  or Mobile)  │
└──────┬───────┘
       │
       │ 1. auth.login({ phoneNumber })
       │
       ▼
┌──────────────┐
│  Auth API    │
│  (SDK)       │
└──────┬───────┘
       │
       │ HTTP POST /api/v1/auth/login
       │
       ▼
┌──────────────┐
│  API Server  │
│  (NestJS)    │
└──────┬───────┘
       │
       │ 2. Send OTP via SMS
       │
       ▼
┌──────────────┐
│   Client     │
│ (Enter OTP)  │
└──────┬───────┘
       │
       │ 3. auth.verifyOtp({ phoneNumber, otp })
       │
       ▼
┌──────────────┐
│  Auth API    │
│  (SDK)       │
└──────┬───────┘
       │
       │ HTTP POST /api/v1/auth/verify-otp
       │
       ▼
┌──────────────┐
│  API Server  │
│  (Verify)    │
└──────┬───────┘
       │
       │ 4. Return { accessToken, refreshToken }
       │
       ▼
┌──────────────┐
│   Client     │
│ (Store tokens│
│  in storage) │
└──────┬───────┘
       │
       │ 5. Use accessToken in Authorization header
       │
       ▼
┌──────────────┐
│  All API     │
│  Calls       │
└──────────────┘
```

## Technology Stack

### Generator
- **OpenAPI Generator**: v7.x
- **Generator CLI**: `@openapitools/openapi-generator-cli`

### TypeScript SDK
- **Language**: TypeScript 5.0+
- **HTTP Client**: Axios 1.6+
- **Build Tool**: TypeScript Compiler (tsc)
- **Package Manager**: NPM
- **Target**: ES2020

### Dart SDK
- **Language**: Dart 2.12+ (null-safe)
- **HTTP Client**: Dio 5.0+
- **Framework**: Flutter 3.0+
- **Package Manager**: pub

### API Server
- **Framework**: NestJS 11
- **Documentation**: @nestjs/swagger
- **OpenAPI**: 3.0.0

## Performance Considerations

1. **Generation Speed**: 10-30 seconds for both SDKs
2. **Bundle Size**:
   - TypeScript: ~200KB (minified)
   - Dart: ~300KB (compiled)
3. **Tree Shaking**: Both SDKs support tree-shaking
4. **Caching**: OpenAPI Generator caches templates

## Security

1. **Authentication**: JWT Bearer tokens
2. **HTTPS Only**: Production uses HTTPS
3. **Token Storage**:
   - Web: localStorage (secure context only)
   - Mobile: flutter_secure_storage
4. **API Key**: Optional API key support
5. **Rate Limiting**: Documented in SDK

## Maintenance

### When to Regenerate
- New endpoints added
- DTOs modified
- Authentication changes
- Breaking API changes

### Version Bumping
- Update `configs/typescript.yaml`: `npmVersion`
- Update `configs/dart.yaml`: `pubVersion`
- Update `CHANGELOG.md`
- Create git tag: `sdk-vX.Y.Z`

### Monitoring
- Check CI/CD logs for generation errors
- Monitor package download stats
- Track SDK usage in applications

---

**Last Updated**: 2026-01-30
**Maintainer**: JoonaPay Engineering Team
