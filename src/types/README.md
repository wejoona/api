# JoonaPay Type System

Comprehensive TypeScript type definitions for the JoonaPay USDC Wallet backend.

## Overview

This directory contains strict type definitions that eliminate the use of `any` types and provide compile-time safety across the entire codebase.

## Structure

```
types/
├── strict-types.ts     # Core utility types, branded types, base entities
├── api-types.ts        # HTTP, REST API, webhooks, rate limiting
├── domain-types.ts     # Business domain entities (User, Wallet, Transaction, etc.)
└── index.ts            # Central export point
```

## Usage

### Importing Types

```typescript
// Import from central index
import { UUID, UserId, SuccessResponse, User } from '@types';

// Or import from specific files
import { Brand, Result, ok, err } from '@/types/strict-types';
import { HttpMethod, ApiRequestOptions } from '@/types/api-types';
import { Transaction, KycStatus } from '@/types/domain-types';
```

### Branded Types

Branded types prevent mixing IDs of different entity types:

```typescript
import { UserId, WalletId } from '@types';

const userId: UserId = 'user-123' as UserId;
const walletId: WalletId = 'wallet-456' as WalletId;

// ✅ Type-safe
function getUser(id: UserId): Promise<User> { ... }
getUser(userId);

// ❌ Compile error - prevents mixing types
getUser(walletId); // Type 'WalletId' is not assignable to 'UserId'
```

### Result Type (Railway-Oriented Programming)

Replace throwing exceptions with explicit error handling:

```typescript
import { Result, ok, err, isOk } from '@types';

async function createUser(data: CreateUserDto): Promise<Result<User, Error>> {
  try {
    const user = await userRepository.create(data);
    return ok(user);
  } catch (error) {
    return err(new Error('Failed to create user'));
  }
}

// Usage
const result = await createUser(data);
if (isOk(result)) {
  console.log('User created:', result.value);
} else {
  console.error('Error:', result.error);
}
```

### API Response Types

Consistent response structure:

```typescript
import { SuccessResponse, ErrorResponse, PaginatedResponse } from '@types';

// Success response
const response: SuccessResponse<User> = {
  success: true,
  data: user,
  timestamp: new Date().toISOString() as ISODateString,
  requestId: 'req-123' as UUID,
};

// Paginated response
const paginatedUsers: PaginatedResponse<User> = {
  data: users,
  meta: {
    total: 100,
    page: 1,
    pageSize: 10,
    totalPages: 10,
    hasNext: true,
    hasPrevious: false,
  },
};
```

### Type-Safe JSON

Replace `Record<string, any>` with `JsonValue`:

```typescript
import { JsonValue, JsonObject } from '@types';

// ✅ Type-safe
const metadata: JsonObject = {
  userId: 'user-123',
  amount: 100,
  tags: ['verified', 'premium'],
  config: { enabled: true },
};

// ❌ Won't compile - functions not allowed in JSON
const invalid: JsonValue = () => {}; // Error
```

### Repository Pattern

Strict repository interfaces:

```typescript
import { Repository, RepositoryFilter, UUID } from '@types';

class UserRepository implements Repository<User> {
  async findById(id: UUID): Promise<User | null> { ... }

  async findMany(filter?: RepositoryFilter<User>): Promise<readonly User[]> { ... }

  async create(data: CreateDto<User>): Promise<User> { ... }

  async update(id: UUID, data: UpdateDto<User>): Promise<User> { ... }

  async delete(id: UUID): Promise<void> { ... }

  async exists(id: UUID): Promise<boolean> { ... }

  async count(filter?: RepositoryFilter<User>): Promise<PositiveInt> { ... }
}
```

### Domain Events

Type-safe event system:

```typescript
import { DomainEvent, EventHandler } from '@types';

interface UserCreatedEvent extends DomainEvent<{ email: string; name: string }> {
  eventType: 'user.created';
}

const handler: EventHandler<UserCreatedEvent> = async (event) => {
  console.log('User created:', event.payload);
};
```

## Utility Types

### DeepPartial / DeepRequired

```typescript
import { DeepPartial, DeepRequired } from '@types';

type Config = {
  database: {
    host: string;
    port: number;
  };
};

// All properties optional (nested)
type PartialConfig = DeepPartial<Config>;
// { database?: { host?: string; port?: number } }

// All properties required (nested)
type RequiredConfig = DeepRequired<Config>;
```

### KeysOfType

Extract keys matching a specific type:

```typescript
import { KeysOfType } from '@types';

type Example = {
  id: string;
  name: string;
  age: number;
  active: boolean;
};

type StringKeys = KeysOfType<Example, string>; // 'id' | 'name'
type NumberKeys = KeysOfType<Example, number>; // 'age'
```

### NonNullish

Remove null/undefined from types:

```typescript
import { NonNullish } from '@types';

type MaybeString = string | null | undefined;
type DefiniteString = NonNullish<MaybeString>; // string
```

## Migration Guide

### Replacing `any` Types

#### Before
```typescript
function processData(data: any): any {
  return data;
}

const metadata: Record<string, any> = {};
```

#### After
```typescript
import { JsonValue, JsonObject } from '@types';

function processData(data: JsonValue): JsonValue {
  return data;
}

const metadata: JsonObject = {};
```

### Replacing Loose Function Types

#### Before
```typescript
type Callback = (...args: any[]) => any;
```

#### After
```typescript
import { Callback, AsyncFunction } from '@types';

type SyncCallback = Callback<[string, number], boolean>;
type AsyncCallback = AsyncFunction<[UserId], User>;
```

### Replacing Database Query Parameters

#### Before
```typescript
function executeQuery(query: string, params?: any[]): Promise<any> { ... }
```

#### After
```typescript
import { QueryParameters, JsonValue } from '@types';

function executeQuery(
  query: string,
  params?: QueryParameters
): Promise<JsonValue[]> { ... }
```

### Type Guards

Use provided type guards for runtime checks:

```typescript
import { isDefined, isString, isNumber, isJsonValue } from '@types';

function processValue(value: unknown) {
  if (isDefined(value)) {
    // value is not null or undefined
  }

  if (isString(value)) {
    // value is string
  }

  if (isJsonValue(value)) {
    // value is valid JSON
  }
}
```

## Best Practices

### 1. Use Branded Types for IDs

```typescript
// ❌ Don't use plain strings
function getUser(id: string): Promise<User> { ... }

// ✅ Use branded types
function getUser(id: UserId): Promise<User> { ... }
```

### 2. Use Result Type for Error Handling

```typescript
// ❌ Don't throw exceptions in business logic
async function createWallet(userId: string): Promise<Wallet> {
  if (!userId) throw new Error('Invalid user');
  // ...
}

// ✅ Return Result type
async function createWallet(userId: UserId): Promise<Result<Wallet, Error>> {
  if (!userId) return err(new Error('Invalid user'));
  // ...
  return ok(wallet);
}
```

### 3. Use Readonly for Immutability

```typescript
// ❌ Mutable data
interface User {
  id: string;
  email: string;
}

// ✅ Immutable data
interface User {
  readonly id: UserId;
  readonly email: Email;
}
```

### 4. Prefer Type Inference

```typescript
// ❌ Redundant type annotation
const user: User = await userRepository.findById(id) as User;

// ✅ Type inference
const user = await userRepository.findById(id); // TypeScript infers User | null
```

### 5. Use Const Assertions for Literal Types

```typescript
// ❌ Widened type
const status = 'active'; // type: string

// ✅ Literal type
const status = 'active' as const; // type: 'active'
```

## Type Coverage

To check type coverage in your code:

```bash
# Install type coverage tool
npm install --save-dev type-coverage

# Check coverage
npx type-coverage --detail

# Aim for 95%+ coverage
```

## ESLint Rules

Add these rules to `.eslintrc.js`:

```javascript
{
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
  }
}
```

## Resources

- [TypeScript Handbook - Advanced Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [Branded Types in TypeScript](https://egghead.io/blog/using-branded-types-in-typescript)
- [Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/)
