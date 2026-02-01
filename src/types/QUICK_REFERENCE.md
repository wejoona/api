# TypeScript Types - Quick Reference

## Common Patterns

### Replace `any` Types

| Before | After | Import |
|--------|-------|--------|
| `any` | `unknown` | Built-in |
| `Record<string, any>` | `JsonObject` | `@types` |
| `any[]` | `JsonValue[]` or `unknown[]` | `@types` |
| `(...args: any[]) => any` | `Callback<Args, Return>` | `@types` |
| `string` (for IDs) | `UserId`, `WalletId`, etc. | `@types` |

### Common Imports

```typescript
// Most common types
import {
  UUID, UserId, WalletId, TransactionId,
  ISODateString, Email, PhoneNumber,
  USDCAmount, XOFAmount,
  SuccessResponse, ErrorResponse, PaginatedResponse,
  Result, ok, err, isOk, isErr,
  JsonValue, JsonObject,
} from '@types';

// Domain entities
import {
  User, Wallet, Transaction, Transfer,
  KycStatus, TransactionStatus,
} from '@types';

// API types
import {
  HttpMethod, HttpStatusCode,
  ApiRequestOptions, WebhookEvent,
} from '@types';
```

### Controller Response Types

```typescript
// Success response
@Get(':id')
async getUser(@Param('id') id: string): Promise<SuccessResponse<User>> {
  const user = await this.userService.findById(id as UserId);
  return {
    success: true,
    data: user,
    timestamp: new Date().toISOString() as ISODateString,
  };
}

// Paginated response
@Get()
async listUsers(@Query() query: QueryDto): Promise<PaginatedResponse<User>> {
  const { data, total } = await this.userService.findAll(query);
  return {
    data,
    meta: {
      total,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      totalPages: Math.ceil(total / (query.pageSize || 20)),
      hasNext: /* ... */,
      hasPrevious: /* ... */,
    },
  };
}
```

### Service Methods with Result Type

```typescript
// Use Result for error handling
async createWallet(userId: UserId): Promise<Result<Wallet, Error>> {
  try {
    // Validation
    if (!userId) {
      return err(new Error('User ID is required'));
    }

    // Business logic
    const wallet = await this.walletRepository.create({ userId });
    return ok(wallet);
  } catch (error) {
    return err(new Error(`Failed to create wallet: ${error.message}`));
  }
}

// Usage in controller
const result = await this.walletService.createWallet(userId);
if (isOk(result)) {
  return { success: true, data: result.value };
} else {
  throw new BadRequestException(result.error.message);
}
```

### Repository Interfaces

```typescript
import { Repository, RepositoryFilter, UUID } from '@types';

@Injectable()
export class UserRepository implements Repository<User> {
  public async findById(id: UUID): Promise<User | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  public async findMany(filter?: RepositoryFilter<User>): Promise<readonly User[]> {
    const entities = await this.repo.find({
      where: filter?.where,
      order: filter?.orderBy ? {
        [filter.orderBy.field]: filter.orderBy.direction,
      } : undefined,
      skip: filter?.offset,
      take: filter?.limit,
    });
    return entities.map(e => this.toDomain(e));
  }

  public async create(data: CreateDto<User>): Promise<User> {
    const entity = this.repo.create(data);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  public async update(id: UUID, data: UpdateDto<User>): Promise<User> {
    await this.repo.update(id, data);
    const updated = await this.findById(id);
    if (!updated) throw new Error('User not found');
    return updated;
  }

  public async delete(id: UUID): Promise<void> {
    await this.repo.delete(id);
  }

  public async exists(id: UUID): Promise<boolean> {
    const count = await this.repo.count({ where: { id } });
    return count > 0;
  }

  public async count(filter?: RepositoryFilter<User>): Promise<PositiveInt> {
    return await this.repo.count({ where: filter?.where }) as PositiveInt;
  }
}
```

### DTOs

```typescript
// Create DTO - auto-generates from entity
type CreateUserDto = CreateDto<User>;
// Removes: id, createdAt, updatedAt, deletedAt, version

// Update DTO - all fields optional
type UpdateUserDto = UpdateDto<User>;
// Makes all fields optional except id

// Response DTO - readonly
type UserResponseDto = ResponseDto<User>;
// Makes all fields readonly recursively

// Manual DTO with validation
export class CreateTransferDto {
  @IsString()
  @IsNotEmpty()
  readonly recipientId: string;

  @IsNumber()
  @Min(0.01)
  readonly amount: number;

  @IsOptional()
  @IsString()
  readonly note?: string;
}
```

### Type-Safe Metadata

```typescript
// Before
const metadata: Record<string, any> = {
  userId: 'user-123',
  amount: 100,
  callback: () => {}, // ❌ Functions not allowed in JSON
};

// After
import { JsonObject } from '@types';

const metadata: JsonObject = {
  userId: 'user-123',
  amount: 100,
  tags: ['verified', 'premium'],
  config: { enabled: true },
  // callback: () => {}, // ✅ Compile error - functions not allowed
};
```

### External API Calls

```typescript
import { ExternalApiResponse, JsonValue } from '@types';

async function callExternalApi(
  url: string,
  data: JsonValue
): Promise<ExternalApiResponse<JsonValue>> {
  const startTime = Date.now();

  const response = await axios.post(url, data);

  return {
    status: response.status,
    data: response.data,
    headers: response.headers,
    duration: Date.now() - startTime,
  };
}
```

### Event Handlers

```typescript
import { DomainEvent, EventHandler, UserId } from '@types';

interface UserCreatedEvent extends DomainEvent<{
  userId: UserId;
  email: string;
  name: string;
}> {
  eventType: 'user.created';
}

const handleUserCreated: EventHandler<UserCreatedEvent> = async (event) => {
  const { userId, email, name } = event.payload;

  // Send welcome email
  await this.emailService.sendWelcome(email, name);

  // Create wallet
  await this.walletService.createForUser(userId);
};
```

### Type Guards

```typescript
import { isDefined, isString, isNumber, isJsonValue } from '@types';

function processValue(value: unknown): void {
  if (isDefined(value)) {
    // value is not null or undefined
    console.log('Value exists:', value);
  }

  if (isString(value)) {
    // value is string
    console.log('String length:', value.length);
  }

  if (isNumber(value)) {
    // value is number
    console.log('Number:', value.toFixed(2));
  }

  if (isJsonValue(value)) {
    // value is valid JSON
    const json = JSON.stringify(value);
  }
}
```

### Branded Types

```typescript
import { UserId, WalletId } from '@types';

// Type-safe IDs prevent mixing
function getUserById(id: UserId): Promise<User> { ... }
function getWalletById(id: WalletId): Promise<Wallet> { ... }

const userId: UserId = 'user-123' as UserId;
const walletId: WalletId = 'wallet-456' as WalletId;

getUserById(userId);     // ✅ OK
getWalletById(walletId); // ✅ OK

getUserById(walletId);   // ❌ Compile error
getWalletById(userId);   // ❌ Compile error
```

### Utility Types

```typescript
import {
  RequireKeys, OptionalKeys,
  DeepPartial, DeepRequired, DeepReadonly,
  KeysOfType, NonNullish,
} from '@types';

// Make specific keys required
type User = { id?: string; name?: string; email?: string };
type UserWithId = RequireKeys<User, 'id'>;
// { id: string; name?: string; email?: string }

// Make specific keys optional
type RequiredUser = { id: string; name: string; email: string };
type PartialUser = OptionalKeys<RequiredUser, 'email'>;
// { id: string; name: string; email?: string }

// Deep partial (all nested properties optional)
type Config = { db: { host: string; port: number } };
type PartialConfig = DeepPartial<Config>;
// { db?: { host?: string; port?: number } }

// Extract keys by value type
type Example = { a: string; b: number; c: string };
type StringKeys = KeysOfType<Example, string>; // 'a' | 'c'

// Remove null/undefined
type MaybeString = string | null | undefined;
type DefiniteString = NonNullish<MaybeString>; // string
```

### Query Parameters

```typescript
import { StandardQuery, QueryDto } from '@types';

@Get()
async listTransactions(
  @Query() query: StandardQuery
): Promise<PaginatedResponse<Transaction>> {
  const {
    page = 1,
    pageSize = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search,
    startDate,
    endDate,
  } = query;

  // Use query parameters...
}
```

### Webhooks

```typescript
import { WebhookEvent, WebhookDeliveryStatus } from '@types';

interface PaymentWebhookPayload {
  transactionId: string;
  amount: number;
  status: 'completed' | 'failed';
}

async function processWebhook(
  event: WebhookEvent<PaymentWebhookPayload>
): Promise<void> {
  const { type, data, signature } = event;

  // Verify signature
  if (!this.verifySignature(signature, data)) {
    throw new Error('Invalid signature');
  }

  // Process webhook
  await this.handlePaymentUpdate(data);
}
```

### Time Series Data

```typescript
import { TimeSeries, TimeSeriesPoint } from '@types';

const transactionVolume: TimeSeries<number> = {
  points: [
    {
      timestamp: '2026-01-30T00:00:00Z' as ISODateString,
      value: 15000,
    },
    {
      timestamp: '2026-01-30T01:00:00Z' as ISODateString,
      value: 18500,
    },
  ],
  aggregation: 'sum',
  interval: 'hour',
};
```

## Cheat Sheet

### When to use what

| Scenario | Type to Use |
|----------|-------------|
| Entity ID | Branded type (`UserId`, `WalletId`, etc.) |
| Date/Time | `ISODateString` |
| Email | `Email` |
| Phone | `PhoneNumber` |
| USDC amount | `USDCAmount` (bigint) |
| XOF amount | `XOFAmount` (bigint) |
| Random JSON data | `JsonValue` or `JsonObject` |
| API response | `SuccessResponse<T>` |
| Error response | `ErrorResponse` |
| Paginated list | `PaginatedResponse<T>` |
| Service method | `Result<T, E>` |
| Unknown data | `unknown` (not `any`) |
| Callback function | `Callback<Args, Return>` |
| Async function | `AsyncFunction<Args, Return>` |
| Query params | `QueryParameters` |

### Quick Fixes

```typescript
// ❌ Don't
function getData(): any { ... }
const data: any = await fetch();
const metadata: Record<string, any> = {};

// ✅ Do
function getData(): JsonValue { ... }
const data: unknown = await fetch();
const metadata: JsonObject = {};
```

## Further Reading

- Full documentation: `/src/types/README.md`
- Type definitions: `/src/types/strict-types.ts`
- API types: `/src/types/api-types.ts`
- Domain types: `/src/types/domain-types.ts`
