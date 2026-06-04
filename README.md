# JoonaPay USDC Wallet - Backend API

A NestJS-based backend API for cross-border remittance using USDC stablecoin infrastructure. Enables money transfers from West Africa (Ivory Coast) to the USA.

## Overview

- **Framework**: NestJS + TypeScript
- **Database**: PostgreSQL + TypeORM
- **Cache**: Redis
- **Architecture**: Clean Architecture (DDD-inspired)
- **Authentication**: JWT with refresh tokens
- **API Version**: v1 (with versioning support)

## Features

- User registration with phone verification (OTP)
- USD wallet management
- Deposits via Mobile Money (Orange Money, Wave, MTN)
- Internal transfers (phone-to-phone)
- External transfers (to USDC wallet address)
- KYC verification for higher limits
- Real-time exchange rates
- Webhook handling for payment providers

## Project Setup

```bash
npm install
```

## Environment Variables

Create a `.env` file in the root directory:

```bash
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/usdc_wallet

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# External Providers
BLNK_API_KEY=your-blnk-api-key
YELLOW_CARD_API_KEY=your-yellowcard-api-key
CIRCLE_API_KEY=your-circle-api-key

# CORS
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:8080
```

## Run the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

## Database Migrations

```bash
# Generate migration from entity changes
npm run migration:generate -- -n MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## API Documentation

Swagger documentation is available in non-production environments:

```
http://localhost:3000/docs
```

## API Versioning

This API uses URI-based versioning for backward compatibility:

- **Current Version**: v1
- **Base URL**: `/api/v1/*`
- **Future Versions**: `/api/v2/*`, `/api/v3/*`, etc.

### Key Versioning Features

1. **URI Versioning**: Clear version in URL path (`/api/v1/wallet`)
2. **Default Version**: All endpoints default to v1 unless specified
3. **Version Headers**: All responses include `X-API-Version` header
4. **Deprecation Tracking**: Deprecated versions return `X-API-Deprecated: true`
5. **Multiple Version Support**: Endpoints can support multiple versions

### Version Headers

All API responses include versioning headers:

```http
X-API-Version: 1
X-API-Latest-Version: 1
```

Deprecated endpoints also include:

```http
X-API-Deprecated: true
X-API-Deprecation-Info: API version 1 is deprecated. Please migrate to v2.
```

### Documentation

- [API Versioning Strategy](./docs/API_VERSIONING.md) - Comprehensive versioning guide
- [Version Migration Examples](./src/modules/wallet/application/controllers/wallet.v2.controller.example.ts)

### Example Usage

```typescript
// v1 endpoint (default)
GET /api/v1/wallet

// v2 endpoint (future)
GET /api/v2/wallet

// Response headers
X-API-Version: 1
X-API-Latest-Version: 1
```

## Project Structure

```
src/
├── main.ts                    # Entry point with versioning config
├── app.module.ts              # Root module
│
├── modules/
│   ├── auth/                  # Authentication
│   ├── wallet/                # Wallet management
│   ├── transfers/             # Money transfers
│   ├── deposits/              # Deposits
│   ├── withdrawals/           # Withdrawals
│   ├── users/                 # User management
│   ├── kyc/                   # KYC verification
│   └── webhook/               # Payment webhooks
│
├── common/
│   ├── guards/                # Auth guards
│   ├── decorators/            # Custom decorators
│   ├── filters/               # Exception filters
│   ├── interceptors/          # Logging, metrics, versioning
│   └── utils/                 # Helpers
│
└── config/                    # Configuration
```

### Module Structure (Clean Architecture)

Each module follows a consistent structure:

```
module/
├── application/           # Use cases, controllers, DTOs
│   ├── controllers/       # REST endpoints
│   ├── usecases/          # Business logic
│   ├── services/          # Application services
│   └── dtos/              # Request/Response DTOs
│
├── domain/                # Business entities, interfaces
│   ├── entities/          # Domain entities
│   ├── repositories/      # Repository interfaces
│   └── value-objects/     # Value objects
│
└── infrastructure/        # Implementation details
    ├── orm-entities/      # TypeORM entities
    ├── repositories/      # Repository implementations
    └── adapters/          # External service adapters
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/verify-otp` - Verify OTP and get access token
- `POST /api/v1/auth/login` - Request login OTP
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout and invalidate token

### Wallet

- `GET /api/v1/wallet` - Get wallet balance
- `POST /api/v1/wallet/create` - Create wallet
- `GET /api/v1/wallet/deposit/channels` - Get deposit channels
- `POST /api/v1/wallet/deposit` - Initiate deposit
- `POST /api/v1/wallet/transfer/internal` - Internal transfer
- `POST /api/v1/wallet/transfer/external` - External transfer
- `GET /api/v1/wallet/rate` - Get exchange rate

### Transactions

- `GET /api/v1/wallet/transactions` - Get transaction history
- `GET /api/v1/wallet/transactions/:id` - Get transaction details
- `GET /api/v1/wallet/transactions/deposit/:id/status` - Get deposit status

### KYC

- `GET /api/v1/wallet/kyc/status` - Get KYC status
- `POST /api/v1/wallet/kyc/submit` - Submit KYC documents

### Webhooks

- `POST /api/v1/webhooks/payment` - Handle payment provider webhooks
- `POST /api/v1/webhooks/payment/yellow-card` - Yellow Card webhooks
- `POST /api/v1/webhooks/circle` - Circle webhooks

## Security Features

- Helmet.js for security headers
- CORS with configurable origins
- Rate limiting with @nestjs/throttler
- Request body size limits (10kb)
- JWT authentication
- PIN verification for sensitive operations
- Idempotency keys for transactions
- Webhook signature verification

## External Service Integrations

### Blnk (Ledger)

- Double-entry accounting ledger
- Transaction and balance management
- Located in: `src/modules/providers/blnk/`

### Yellow Card (Mobile Money)

- Deposits and withdrawals
- Orange Money, MTN, Wave integration
- Located in: `src/modules/providers/yellowcard/`
- Mock mode is development/test only; production-like environments must use live configuration or report the feature as unavailable.

### Circle (USDC)

- External crypto transfers
- USDC wallet infrastructure
- Located in: `src/modules/providers/circle/`
- Mock mode is development/test only; production-like environments must provide live credentials.

## Development Commands

```bash
# Start development server
npm run start:dev

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format

# Run migrations
npm run migration:run

# Generate migration
npm run migration:generate -- -n MigrationName

# Revert migration
npm run migration:revert
```

## Deployment

### Production Checklist

- Set `NODE_ENV=production`
- Configure secure `JWT_SECRET`
- Set up SSL/TLS certificates
- Configure CORS allowed origins
- Enable database connection pooling
- Set up Redis for caching
- Configure logging and monitoring
- Run database migrations
- Set up health check monitoring
- Confirm `/api/v1/health/mobile-readiness` reports live provider modes or explicit disabled/unavailable states; do not release with production-like mock provider modes.

### Docker Deployment

```bash
# Build Docker image
docker build -t usdc-wallet-api .

# Run container
docker run -p 3000:3000 --env-file .env usdc-wallet-api
```

## Monitoring

- Health check endpoint: `/api/health`
- Metrics endpoint: `/api/metrics` (authenticated)
- Logging with Winston
- Request/response interceptors
- Error tracking

## Contributing

1. Follow the Clean Architecture pattern
2. Write unit tests for use cases
3. Write E2E tests for endpoints
4. Use DTOs for validation
5. Follow TypeScript strict mode
6. Document API changes in Swagger
7. Update version documentation when making breaking changes

## Support

For questions or issues, contact the development team or create an issue in the repository.

## License

Proprietary - JoonaPay
