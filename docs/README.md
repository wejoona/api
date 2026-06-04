# JoonaPay Backend Documentation

Welcome to the JoonaPay USDC Wallet backend documentation. This documentation provides comprehensive information about the system architecture, modules, APIs, and development guidelines.

## Documentation Structure

```
docs/
├── README.md                    # This file
├── ARCHITECTURE.md              # System architecture & patterns
├── MODULES.md                   # Module overview
└── modules/                     # Individual module docs
    ├── AUTH.md                  # Authentication & User Management
    ├── WALLET.md                # Wallet Management
    ├── TRANSFER.md              # Transfer Operations
    ├── COMPLIANCE.md            # Compliance & AML/CFT
    ├── NOTIFICATION.md          # Notification System
    ├── WEBHOOK.md               # Webhook Management
    └── SANCTIONS.md             # Sanctions Screening
```

## Quick Start

### For New Developers

1. **Start here:** [ARCHITECTURE.md](./ARCHITECTURE.md)
   - Understand the system design
   - Learn Clean Architecture principles
   - Review technology stack

2. **Explore modules:** [MODULES.md](./MODULES.md)
   - Overview of all modules
   - Module dependencies
   - Feature matrix

3. **Deep dive:** `/modules/`
   - Detailed module documentation
   - API endpoints
   - Code examples

### For Backend Engineers

If you're working on a specific feature, go directly to the relevant module:

- **User authentication:** [AUTH.md](./modules/AUTH.md)
- **Wallet operations:** [WALLET.md](./modules/WALLET.md)
- **Money transfers:** [TRANSFER.md](./modules/TRANSFER.md)
- **Compliance features:** [COMPLIANCE.md](./modules/COMPLIANCE.md)
- **Notifications:** [NOTIFICATION.md](./modules/NOTIFICATION.md)
- **Webhooks:** [WEBHOOK.md](./modules/WEBHOOK.md)
- **Sanctions screening:** [SANCTIONS.md](./modules/SANCTIONS.md)

### For Product Managers

- **Feature capabilities:** [MODULES.md](./MODULES.md)
- **API endpoints:** Individual module docs
- **Limitations & constraints:** See "Limits" sections in module docs

### For QA/Testing

- **Test scenarios:** See "Testing" sections in each module
- **Error codes:** See "Error Codes" sections
- **Edge cases:** See "Security Considerations" sections

## Core Concepts

### Clean Architecture

JoonaPay follows Clean Architecture principles with four distinct layers:

```
Application Layer  ← Controllers, DTOs
       ↓
  Use Case Layer   ← Business logic orchestration
       ↓
  Domain Layer     ← Business entities and rules
       ↓
Infrastructure     ← Database, external services
```

**Learn more:** [ARCHITECTURE.md#clean-architecture-layers](./ARCHITECTURE.md#clean-architecture-layers)

### Module Structure

Every module follows a consistent structure:

```
module/
├── application/
│   ├── controllers/      # REST API
│   ├── usecases/         # Business workflows
│   ├── services/         # Application services
│   └── dto/              # Request/Response DTOs
├── domain/
│   ├── entities/         # Business entities
│   ├── repositories/     # Repository interfaces
│   └── events/           # Domain events
└── infrastructure/
    ├── orm-entities/     # TypeORM entities
    ├── repositories/     # Repository implementations
    └── adapters/         # External service adapters
```

**Learn more:** [ARCHITECTURE.md#module-structure](./ARCHITECTURE.md#module-structure)

### Domain-Driven Design

Key DDD patterns used:

- **Entities:** Objects with unique identity
- **Value Objects:** Immutable objects defined by attributes
- **Aggregates:** Cluster of related entities
- **Repositories:** Data persistence abstraction
- **Domain Events:** Capture significant business events

**Learn more:** [ARCHITECTURE.md#domain-driven-design-patterns](./ARCHITECTURE.md#domain-driven-design-patterns)

## API Documentation

### Interactive API Docs

The backend provides interactive Swagger documentation:

```bash
# Start the server
npm run start:dev

# Visit
http://localhost:3000/api
```

### Postman Collection

Import the Postman collection for easy API testing:

```
/postman/JoonaPay.postman_collection.json
```

### Authentication

Most endpoints require JWT authentication:

```http
Authorization: Bearer {accessToken}
```

**Learn more:** [AUTH.md#api-endpoints](./modules/AUTH.md#api-endpoints)

## Development Workflow

### Running the Server

```bash
# Install dependencies
npm install

# Run migrations
npm run migration:run

# Start development server
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Database Migrations

```bash
# Generate migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

**Learn more:** [ARCHITECTURE.md#database-design](./ARCHITECTURE.md#database-design)

## Key Features

### Financial Operations

- **Wallet Management:** Create and manage USDC wallets
- **Deposits:** Convert XOF to USDC via mobile money
- **Withdrawals:** Convert USDC to XOF or send to blockchain
- **P2P Transfers:** Instant transfers between users
- **External Transfers:** Send USDC to blockchain addresses

**Docs:** [WALLET.md](./modules/WALLET.md), [TRANSFER.md](./modules/TRANSFER.md)

### Compliance & Security

- **KYC Verification:** 3-tier KYC system
- **Transaction Limits:** Based on KYC tier
- **Velocity Rules:** Prevent suspicious activity
- **Watchlist Screening:** OFAC, UN, EU sanctions
- **PEP Screening:** Politically Exposed Persons
- **AML/CFT:** Anti-money laundering compliance

**Docs:** [COMPLIANCE.md](./modules/COMPLIANCE.md), [SANCTIONS.md](./modules/SANCTIONS.md)

### Integrations

- **Circle:** Blockchain wallet and USDC operations
- **Yellow Card:** Mobile money on-ramp/off-ramp
- **Blnk:** Double-entry ledger
- **Twilio:** SMS and OTP delivery
- **Firebase (FCM):** Push notifications

**Docs:** [ARCHITECTURE.md#external-service-integrations](./ARCHITECTURE.md#external-service-integrations)

### Notification System

- **Push Notifications:** Via Firebase Cloud Messaging
- **In-App Notifications:** Stored in database
- **Email Notifications:** Via SendGrid
- **SMS Notifications:** Via Twilio
- **Template System:** Handlebars templates with localization

**Docs:** [NOTIFICATION.md](./modules/NOTIFICATION.md)

### Webhook Processing

- **Signature Verification:** Secure webhook authentication
- **Idempotency:** Prevent duplicate processing
- **Retry Strategy:** Exponential backoff
- **Dead Letter Queue:** Handle unprocessable events

**Docs:** [WEBHOOK.md](./modules/WEBHOOK.md)

## Technology Stack

| Component      | Technology      | Version |
| -------------- | --------------- | ------- |
| **Framework**  | NestJS          | ^10.0.0 |
| **Language**   | TypeScript      | ^5.1.0  |
| **Runtime**    | Node.js         | ^20.0.0 |
| **Database**   | PostgreSQL      | ^15.0   |
| **Cache**      | Redis           | ^7.0    |
| **ORM**        | TypeORM         | ^0.3.0  |
| **Queue**      | Bull            | ^4.10.0 |
| **Validation** | class-validator | ^0.14.0 |
| **Testing**    | Jest            | ^29.5.0 |
| **API Docs**   | Swagger/OpenAPI | ^3.0.0  |

**Learn more:** [ARCHITECTURE.md#technology-stack](./ARCHITECTURE.md#technology-stack)

## Environment Setup

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/joonapay

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Circle
CIRCLE_API_KEY=...
CIRCLE_ENTITY_SECRET=...

# Yellow Card
YELLOW_CARD_API_KEY=...
YELLOW_CARD_SECRET_KEY=...

# Twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# Firebase
FCM_PROJECT_ID=...
FCM_PRIVATE_KEY=...
```

**Full list:** See `.env.example` in project root

Production-like environments reject mock provider modes at startup. For
release checks, use `/api/v1/health/mobile-readiness` to confirm provider
modes are live, disabled, unavailable, or misconfigured; do not infer
production readiness from local mock behavior.

## Security Best Practices

1. **Never commit secrets:** Use environment variables
2. **Validate all input:** Use DTOs with class-validator
3. **Authenticate requests:** Use JWT guards
4. **Rate limit endpoints:** Prevent abuse
5. **Encrypt sensitive data:** PII, credentials, etc.
6. **Audit important actions:** Log who did what when
7. **Verify webhooks:** Always verify signatures
8. **Use HTTPS:** In production

**Learn more:** [ARCHITECTURE.md#security-architecture](./ARCHITECTURE.md#security-architecture)

## Performance Optimization

### Caching Strategy

```typescript
// Cache frequently accessed data
await redis.set('key', value, 'EX', 300); // 5 min TTL
```

### Database Indexes

```sql
-- Add indexes for common queries
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
```

### Pagination

```typescript
// Always paginate list endpoints
GET /transfers?limit=20&offset=0
```

**Learn more:** [ARCHITECTURE.md#performance-optimization](./ARCHITECTURE.md#performance-optimization)

## Testing Strategy

### Unit Tests

Test individual classes in isolation:

```typescript
describe('Wallet', () => {
  it('should debit balance when sufficient funds', () => {
    const wallet = new Wallet('1', 'user-1', 100);
    wallet.debit(50);
    expect(wallet.balance).toBe(50);
  });
});
```

### Integration Tests

Test module interactions:

```typescript
describe('InternalTransferUseCase', () => {
  it('should transfer funds between wallets', async () => {
    const result = await useCase.execute({
      fromUserId: 'user-1',
      toPhone: '+2250701234567',
      amount: 50,
    });
    expect(result.status).toBe('completed');
  });
});
```

### E2E Tests

Test full API workflows:

```typescript
describe('Transfers (E2E)', () => {
  it('POST /transfers/internal should transfer funds', async () => {
    return request(app.getHttpServer())
      .post('/transfers/internal')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientPhone: '+225...', amount: 5000 })
      .expect(200);
  });
});
```

**Learn more:** [ARCHITECTURE.md#testing-strategy](./ARCHITECTURE.md#testing-strategy)

## Deployment

### Docker

```bash
# Build image
docker build -t joonapay-backend .

# Run container
docker run -p 3000:3000 joonapay-backend
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Monitoring configured
- [ ] Logs aggregation setup
- [ ] Backups automated
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Health checks working

**Learn more:** [ARCHITECTURE.md#deployment-architecture](./ARCHITECTURE.md#deployment-architecture)

## Monitoring & Observability

### Health Checks

```http
GET /health
```

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### Metrics

Prometheus metrics exposed at:

```
GET /metrics
```

### Logging

Structured JSON logs:

```json
{
  "level": "info",
  "message": "Transfer completed",
  "context": "TransferService",
  "transferId": "123",
  "timestamp": "2026-01-29T12:00:00.000Z"
}
```

**Learn more:** [ARCHITECTURE.md#monitoring--observability](./ARCHITECTURE.md#monitoring--observability)

## Troubleshooting

### Common Issues

#### Database Connection Errors

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:** Ensure PostgreSQL is running and DATABASE_URL is correct

#### Redis Connection Errors

```
Error: Redis connection to localhost:6379 failed
```

**Solution:** Ensure Redis is running and REDIS_URL is correct

#### Migration Errors

```
Error: relation "users" already exists
```

**Solution:** Check migration history with `npm run migration:show`

#### JWT Errors

```
Error: jwt malformed
```

**Solution:** Verify JWT_SECRET is set and token format is correct

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run start:dev

# Or specific namespaces
DEBUG=typeorm:* npm run start:dev
```

## Contributing

### Code Style

- Use TypeScript strict mode
- Follow NestJS conventions
- Write self-documenting code
- Add JSDoc comments for public APIs
- Use meaningful variable names

### Pull Request Process

1. Create feature branch from `develop`
2. Write tests for new features
3. Update documentation
4. Run tests and linter
5. Submit PR with description
6. Address review comments

### Commit Messages

```
feat: Add external transfer support
fix: Resolve balance inconsistency
docs: Update wallet API documentation
refactor: Extract fee calculation logic
test: Add transfer limit tests
```

## Support

### Internal Resources

- **Architecture Questions:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Module Documentation:** [/modules/](./modules/)
- **API Reference:** http://localhost:3000/api
- **Code Examples:** See individual module docs

### External Resources

- **NestJS Docs:** https://docs.nestjs.com
- **TypeORM Docs:** https://typeorm.io
- **Circle API:** https://developers.circle.com
- **Yellow Card API:** https://docs.yellowcard.io

## Roadmap

### Current Version (v1.0)

- [x] User authentication
- [x] Wallet management
- [x] Internal transfers
- [x] External transfers
- [x] KYC verification
- [x] Compliance monitoring
- [x] Push notifications
- [x] Webhook processing

### Upcoming (v1.1)

- [ ] Recurring payments
- [ ] Bill payments
- [ ] Merchant API
- [ ] Payment links
- [ ] Savings pots
- [ ] Transaction analytics

### Future (v2.0)

- [ ] Multi-currency support
- [ ] Debit card integration
- [ ] Yield on deposits
- [ ] Cross-border transfers
- [ ] Advanced analytics
- [ ] White-label solution

## License

Proprietary - JoonaPay © 2026

---

**Last Updated:** 2026-01-29

**Maintained By:** JoonaPay Engineering Team

**Questions?** Contact: engineering@joonapay.com
