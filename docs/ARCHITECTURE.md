# JoonaPay Backend Architecture

## Overview

The JoonaPay USDC Wallet backend is built using **Clean Architecture** principles with Domain-Driven Design (DDD) patterns. This architecture ensures separation of concerns, testability, and maintainability.

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | NestJS | Application framework |
| **Language** | TypeScript | Type-safe development |
| **Database** | PostgreSQL | Primary data store |
| **Cache** | Redis | Session & cache management |
| **ORM** | TypeORM | Database abstraction |
| **Queue** | Bull (Redis) | Background job processing |
| **Documentation** | Swagger/OpenAPI | API documentation |
| **Validation** | class-validator | DTO validation |
| **Authentication** | JWT | Token-based auth |

## Clean Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│              (Controllers, DTOs, Guards)                 │
├─────────────────────────────────────────────────────────┤
│                   Application Layer                      │
│             (Use Cases, Services, Events)                │
├─────────────────────────────────────────────────────────┤
│                     Domain Layer                         │
│        (Entities, Value Objects, Repositories)           │
├─────────────────────────────────────────────────────────┤
│                 Infrastructure Layer                     │
│    (ORM Entities, Repository Impl, External Adapters)   │
└─────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### 1. Presentation Layer (Application/Controllers)
- HTTP request/response handling
- Request validation (DTOs)
- Authentication & authorization (Guards)
- API documentation (Swagger decorators)
- Response formatting

**Example:**
```typescript
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly getBalanceUseCase: GetBalanceUseCase) {}

  @Get()
  async getBalance(@Request() req: AuthenticatedRequest) {
    return this.getBalanceUseCase.execute({ userId: req.user.id });
  }
}
```

#### 2. Application Layer (Application/UseCases & Services)
- Business workflow orchestration
- Transaction management
- External service coordination
- Event emission
- Cross-cutting concerns

**Example:**
```typescript
@Injectable()
export class InternalTransferUseCase {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly ledgerAdapter: BlnkLedgerAdapter,
    private readonly eventBus: EventBus,
  ) {}

  async execute(dto: InternalTransferDto): Promise<Transfer> {
    // 1. Validate
    // 2. Execute business logic
    // 3. Persist changes
    // 4. Emit events
  }
}
```

#### 3. Domain Layer (Domain/Entities & Repositories)
- Core business logic
- Business rules validation
- Domain entities
- Repository interfaces (not implementations)
- Value objects
- Domain events

**Example:**
```typescript
// Domain Entity
export class Wallet {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    private _balance: number,
  ) {}

  debit(amount: number): void {
    if (amount > this._balance) {
      throw new InsufficientBalanceException();
    }
    this._balance -= amount;
  }

  get balance(): number {
    return this._balance;
  }
}

// Repository Interface
export abstract class WalletRepository {
  abstract findByUserId(userId: string): Promise<Wallet | null>;
  abstract save(wallet: Wallet): Promise<Wallet>;
}
```

#### 4. Infrastructure Layer (Infrastructure)
- Database implementation (TypeORM entities)
- Repository implementations
- External service adapters
- Third-party integrations
- File storage
- Email/SMS providers

**Example:**
```typescript
// ORM Entity
@Entity('wallets')
export class WalletOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column('decimal', { precision: 20, scale: 8 })
  balance: number;
}

// Repository Implementation
@Injectable()
export class TypeOrmWalletRepository extends WalletRepository {
  constructor(
    @InjectRepository(WalletOrmEntity)
    private readonly repo: Repository<WalletOrmEntity>,
  ) {
    super();
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    const entity = await this.repo.findOne({ where: { userId } });
    return entity ? this.toDomain(entity) : null;
  }

  private toDomain(entity: WalletOrmEntity): Wallet {
    return new Wallet(entity.id, entity.userId, entity.balance);
  }
}
```

## Module Structure

Every module follows a consistent directory structure:

```
module/
├── module-name.module.ts           # NestJS module definition
├── application/
│   ├── controllers/                # REST API controllers
│   │   └── module.controller.ts
│   ├── usecases/                   # Business use cases
│   │   ├── create-entity.use-case.ts
│   │   └── update-entity.use-case.ts
│   ├── services/                   # Application services
│   │   └── module.service.ts
│   └── dto/                        # Data Transfer Objects
│       ├── requests/
│       │   └── create-entity.dto.ts
│       └── responses/
│           └── entity.response.ts
├── domain/
│   ├── entities/                   # Domain entities
│   │   └── entity.ts
│   ├── repositories/               # Repository interfaces
│   │   └── entity.repository.ts
│   ├── value-objects/              # Value objects
│   │   └── amount.vo.ts
│   └── events/                     # Domain events
│       └── entity-created.event.ts
└── infrastructure/
    ├── orm-entities/               # TypeORM entities
    │   └── entity.orm-entity.ts
    ├── repositories/               # Repository implementations
    │   └── typeorm-entity.repository.ts
    ├── adapters/                   # External service adapters
    │   └── payment-provider.adapter.ts
    └── mappers/                    # Domain <-> ORM mappers
        └── entity.mapper.ts
```

## Domain-Driven Design Patterns

### 1. Entities
Objects with unique identity that persist over time.

```typescript
export class User {
  constructor(
    public readonly id: string,
    public readonly phone: string,
    private _username: string,
    private _kycStatus: KycStatus,
  ) {}

  updateUsername(username: string): void {
    if (!this.isValidUsername(username)) {
      throw new InvalidUsernameException();
    }
    this._username = username;
  }

  private isValidUsername(username: string): boolean {
    return /^[a-zA-Z0-9_]{3,20}$/.test(username);
  }
}
```

### 2. Value Objects
Immutable objects defined by their attributes.

```typescript
export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string,
  ) {
    if (amount < 0) {
      throw new InvalidMoneyException('Amount cannot be negative');
    }
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchException();
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
```

### 3. Aggregates
Cluster of domain objects treated as a single unit.

```typescript
export class Transfer {
  private _status: TransferStatus;
  private _transactions: Transaction[] = [];

  constructor(
    public readonly id: string,
    public readonly senderId: string,
    public readonly recipientId: string,
    public readonly amount: Money,
  ) {
    this._status = TransferStatus.PENDING;
  }

  complete(): void {
    if (this._status !== TransferStatus.PENDING) {
      throw new InvalidTransferStateException();
    }
    this._status = TransferStatus.COMPLETED;
  }

  get status(): TransferStatus {
    return this._status;
  }
}
```

### 4. Repositories
Abstraction for data persistence.

```typescript
// Interface in domain layer
export abstract class TransferRepository {
  abstract findById(id: string): Promise<Transfer | null>;
  abstract save(transfer: Transfer): Promise<Transfer>;
  abstract findByUserId(userId: string, limit: number): Promise<Transfer[]>;
}

// Implementation in infrastructure layer
@Injectable()
export class TypeOrmTransferRepository extends TransferRepository {
  // Implementation details
}
```

### 5. Services (Domain Services)
Business logic that doesn't naturally fit in an entity.

```typescript
@Injectable()
export class TransferFeeCalculator {
  calculateFee(amount: Money, transferType: TransferType): Money {
    if (transferType === TransferType.INTERNAL) {
      return new Money(0, amount.currency);
    }

    // External transfers have 1% fee (min $0.25, max $5)
    const feeAmount = Math.max(0.25, Math.min(5, amount.amount * 0.01));
    return new Money(feeAmount, 'USD');
  }
}
```

### 6. Domain Events
Capture significant business events.

```typescript
export class TransferCompletedEvent {
  constructor(
    public readonly transferId: string,
    public readonly senderId: string,
    public readonly recipientId: string,
    public readonly amount: Money,
    public readonly timestamp: Date,
  ) {}
}

// Emit in use case
@Injectable()
export class CompleteTransferUseCase {
  constructor(private readonly eventBus: EventEmitter2) {}

  async execute(transferId: string): Promise<void> {
    // ... complete transfer logic

    this.eventBus.emit(
      'transfer.completed',
      new TransferCompletedEvent(/*...*/),
    );
  }
}

// Handle in listener
@Injectable()
export class NotificationListener {
  @OnEvent('transfer.completed')
  async handleTransferCompleted(event: TransferCompletedEvent): Promise<void> {
    // Send notification
  }
}
```

## Data Flow

### Request Flow
```
1. HTTP Request
   ↓
2. Controller (validates request, extracts user)
   ↓
3. Use Case (orchestrates business logic)
   ↓
4. Domain Entity (executes business rules)
   ↓
5. Repository (persists changes)
   ↓
6. Event Bus (emits domain events)
   ↓
7. Response (formatted and returned)
```

### Example: Internal Transfer Flow

```typescript
// 1. Controller receives request
@Post('transfer/internal')
async internalTransfer(@Request() req, @Body() dto: InternalTransferDto) {
  return this.internalTransferUseCase.execute({
    fromUserId: req.user.id,
    toPhone: dto.toPhone,
    amount: dto.amount,
  });
}

// 2. Use Case orchestrates
@Injectable()
export class InternalTransferUseCase {
  async execute(dto: TransferDto): Promise<TransferResponse> {
    // Validate
    const sender = await this.walletRepository.findByUserId(dto.fromUserId);
    const recipient = await this.userRepository.findByPhone(dto.toPhone);

    // Execute business logic
    sender.debit(dto.amount);
    recipient.credit(dto.amount);

    // Create transfer record
    const transfer = new Transfer(/*...*/);

    // Persist
    await this.walletRepository.save(sender);
    await this.walletRepository.save(recipient);
    await this.transferRepository.save(transfer);

    // Emit event
    this.eventBus.emit('transfer.completed', new TransferCompletedEvent(/*...*/));

    return TransferResponse.fromDomain(transfer);
  }
}
```

## Database Design

### Schema Principles

1. **Normalization:** 3NF for transactional data
2. **Denormalization:** Where read performance is critical
3. **Auditing:** Created/updated timestamps on all tables
4. **Soft Deletes:** Critical data is never hard-deleted
5. **Indexing:** Strategic indexes on foreign keys and query fields

### Key Tables

```sql
-- Users and Authentication
users (id, phone, username, kyc_status, created_at, updated_at)
sessions (id, user_id, refresh_token_hash, device_info, expires_at)

-- Wallets and Balances
wallets (id, user_id, circle_wallet_id, balance, currency, status)
transactions (id, wallet_id, type, amount, balance_after, created_at)

-- Transfers
transfers (id, sender_id, recipient_id, amount, fee, status, type)
transfer_transactions (transfer_id, transaction_id)

-- Compliance
kyc_submissions (id, user_id, status, tier, verified_at)
velocity_rules (id, rule_type, time_window, max_amount, max_count)
compliance_cases (id, user_id, case_type, status, risk_score)
watchlist_entries (id, name, list_type, risk_level)

-- Notifications
notifications (id, user_id, type, title, body, read_at, sent_at)
fcm_tokens (id, user_id, token, platform, last_used_at)

-- Webhooks
webhook_events (id, provider, event_type, payload, status, processed_at)
webhook_retries (id, webhook_event_id, attempt, next_retry_at)
```

### Migrations

```bash
# Generate migration
npm run migration:generate -- -n AddUserKycStatus

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

## External Service Integrations

### Adapter Pattern

All external services use the Adapter pattern to isolate integration logic.

```typescript
// Interface
export interface PaymentProvider {
  initiateDeposit(dto: DepositDto): Promise<DepositResponse>;
  getTransactionStatus(txId: string): Promise<TransactionStatus>;
}

// Implementation
@Injectable()
export class YellowCardAdapter implements PaymentProvider {
  constructor(private readonly httpClient: HttpService) {}

  async initiateDeposit(dto: DepositDto): Promise<DepositResponse> {
    const response = await this.httpClient.post('/deposits', {
      amount: dto.amount,
      currency: dto.currency,
    });

    return this.mapResponse(response.data);
  }
}
```

### Providers

| Provider | Purpose | Adapter Location |
|----------|---------|-----------------|
| **Blnk** | Ledger service | `/modules/providers/blnk/` |
| **Circle** | USDC/Blockchain | `/modules/providers/circle/` |
| **Yellow Card** | Mobile money | `/modules/providers/yellow-card/` |
| **Twilio** | SMS/OTP | `/modules/twilio/` |
| **FCM** | Push notifications | `/modules/notifications/` |

## Security Architecture

### Authentication Flow

```
1. User registers with phone
   ↓
2. OTP sent via Twilio
   ↓
3. User verifies OTP
   ↓
4. Server generates JWT + Refresh Token
   ↓
5. Client stores tokens securely
   ↓
6. Subsequent requests use JWT
   ↓
7. JWT expires → Use refresh token
   ↓
8. Refresh token rotated
```

### Authorization

```typescript
// Guards protect routes
@UseGuards(JwtAuthGuard, PinVerificationGuard)
@Post('transfer')
async transfer(@Request() req, @Body() dto) {
  // Only authenticated users with valid PIN token
}

// Custom decorators extract user
@Get('profile')
async getProfile(@CurrentUser() user: JwtUser) {
  return user;
}
```

### PIN Verification Flow

```
1. User enters PIN
   ↓
2. POST /wallet/pin/verify
   ↓
3. Server validates PIN (bcrypt)
   ↓
4. Returns short-lived PIN token (5 min)
   ↓
5. Client includes in X-Pin-Token header
   ↓
6. PinVerificationGuard validates token
```

## Performance Optimization

### Caching Strategy

```typescript
// Redis cache for frequent reads
@Injectable()
export class WalletBalanceCache {
  constructor(private readonly redis: Redis) {}

  async getBalance(walletId: string): Promise<number | null> {
    const cached = await this.redis.get(`balance:${walletId}`);
    return cached ? parseFloat(cached) : null;
  }

  async setBalance(walletId: string, balance: number): Promise<void> {
    await this.redis.set(`balance:${walletId}`, balance, 'EX', 300); // 5 min
  }
}
```

### Database Optimization

1. **Indexes:** On foreign keys and frequently queried fields
2. **Connection Pooling:** Configured in TypeORM
3. **Query Optimization:** Use query builders for complex queries
4. **Pagination:** Limit + offset for list endpoints
5. **Eager Loading:** Strategic use of `relations` option

### Background Jobs

```typescript
@Processor('notifications')
export class NotificationProcessor {
  @Process('send-push')
  async handleSendPush(job: Job<SendPushData>) {
    // Process asynchronously
  }
}

// Enqueue job
await this.notificationQueue.add('send-push', {
  userId: user.id,
  title: 'Transfer Complete',
});
```

## Error Handling

### Exception Hierarchy

```typescript
// Base exception
export class DomainException extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

// Specific exceptions
export class InsufficientBalanceException extends DomainException {
  constructor() {
    super('Insufficient balance', 'INSUFFICIENT_BALANCE');
  }
}

// Global exception filter
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof DomainException) {
      return response.status(400).json({
        statusCode: 400,
        message: exception.message,
        code: exception.code,
      });
    }

    // Handle other exceptions
  }
}
```

## Testing Strategy

### Unit Tests
Test individual classes in isolation.

```typescript
describe('Wallet', () => {
  it('should debit balance when sufficient funds', () => {
    const wallet = new Wallet('1', 'user-1', 100);
    wallet.debit(50);
    expect(wallet.balance).toBe(50);
  });

  it('should throw when insufficient funds', () => {
    const wallet = new Wallet('1', 'user-1', 100);
    expect(() => wallet.debit(150)).toThrow(InsufficientBalanceException);
  });
});
```

### Integration Tests
Test module interactions with real dependencies.

```typescript
describe('InternalTransferUseCase (Integration)', () => {
  let module: TestingModule;
  let useCase: InternalTransferUseCase;
  let database: DataSource;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [TypeOrmModule.forRoot(testDbConfig)],
      providers: [InternalTransferUseCase, /* dependencies */],
    }).compile();

    database = module.get(DataSource);
  });

  it('should transfer funds between wallets', async () => {
    // Test with real database
  });
});
```

### E2E Tests
Test full API workflows.

```typescript
describe('Transfers (E2E)', () => {
  it('POST /transfers/internal should transfer funds', () => {
    return request(app.getHttpServer())
      .post('/transfers/internal')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Pin-Token', pinToken)
      .send({ recipientPhone: '+225...', amount: 5000 })
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('completed');
      });
  });
});
```

## Deployment Architecture

```
                    ┌─────────────┐
                    │   Client    │
                    │  (Mobile)   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  API Gateway │
                    │   (nginx)    │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌──────▼──────┐   ┌──────▼──────┐
   │ NestJS  │      │   NestJS    │   │   NestJS    │
   │Instance1│      │  Instance2  │   │  Instance3  │
   └────┬────┘      └──────┬──────┘   └──────┬──────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌──────▼──────┐   ┌──────▼──────┐
   │PostgreSQL│      │    Redis    │   │    Bull     │
   │(Primary) │      │   (Cache)   │   │  (Queue)    │
   └─────────┘      └─────────────┘   └─────────────┘
```

## Configuration Management

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/joonapay
DATABASE_POOL_SIZE=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_TTL=300

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# External Services
BLNK_API_KEY=...
CIRCLE_API_KEY=...
YELLOW_CARD_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# Security
PIN_HASH_ROUNDS=12
PIN_MAX_ATTEMPTS=5
PIN_LOCKOUT_DURATION=1800

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=10
```

### Configuration Service

```typescript
@Injectable()
export class ConfigService {
  get<T>(key: string): T {
    return this.config.get<T>(key);
  }

  get jwtSecret(): string {
    return this.get<string>('JWT_SECRET');
  }

  get jwtExpiresIn(): string {
    return this.get<string>('JWT_EXPIRES_IN');
  }
}
```

## Monitoring & Observability

### Health Checks

```typescript
@Controller('health')
export class HealthController {
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
    ]);
  }
}
```

### Metrics

- Prometheus metrics exposed at `/metrics`
- Custom business metrics (transactions, transfers, etc.)
- Performance metrics (response times, error rates)

### Logging

```typescript
@Injectable()
export class LoggerService {
  log(message: string, context?: string) {
    // Structured logging
    console.log(JSON.stringify({
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString(),
    }));
  }
}
```

## Best Practices

1. **Dependency Injection:** Use NestJS DI container
2. **Interface Segregation:** Small, focused interfaces
3. **Single Responsibility:** One reason to change
4. **Immutability:** Prefer immutable data structures
5. **Error Handling:** Always handle errors gracefully
6. **Validation:** Validate at boundaries (DTOs)
7. **Testing:** Write tests before or alongside code
8. **Documentation:** Keep Swagger docs up to date
9. **Type Safety:** Leverage TypeScript fully
10. **Security:** Never trust user input

## Further Reading

- [Module Documentation](./MODULES.md)
- [API Documentation](http://localhost:3000/api)
- Individual module docs in `/docs/modules/`
