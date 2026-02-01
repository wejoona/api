# GraphQL Module

Enterprise-grade GraphQL API layer for JoonaPay USDC Wallet with DataLoader support for N+1 query prevention.

## Overview

This module provides a GraphQL API using the code-first approach with `@nestjs/graphql` and Apollo Server. It includes optimized data fetching with DataLoader to prevent N+1 queries.

## Features

- **Code-First Schema**: Type-safe schema generation from TypeScript classes
- **DataLoader Integration**: Automatic batching and caching for efficient queries
- **JWT Authentication**: Secured queries and mutations with JWT guards
- **Type Safety**: Full TypeScript support with domain entities
- **Relations**: Efficient resolution of nested relations
- **Error Handling**: Production-safe error formatting

## Architecture

```
graphql/
├── models/              # GraphQL object types
│   ├── user.model.ts
│   ├── wallet.model.ts
│   ├── transaction.model.ts
│   └── beneficiary.model.ts
├── resolvers/           # Query/Mutation resolvers
│   ├── user.resolver.ts
│   ├── wallet.resolver.ts
│   ├── transaction.resolver.ts
│   └── beneficiary.resolver.ts
├── loaders/             # DataLoader implementations
│   ├── user.loader.ts
│   ├── wallet.loader.ts
│   ├── transaction.loader.ts
│   ├── beneficiary.loader.ts
│   └── loader.context.ts
├── guards/              # GraphQL-specific guards
│   └── gql-auth.guard.ts
└── graphql.module.ts    # Module configuration
```

## Usage

### Queries

```graphql
# Get current user
query Me {
  me {
    id
    phone
    username
    displayName
    wallet {
      id
      balance
      currency
    }
  }
}

# Get user's wallet with transactions
query MyWallet {
  myWallet {
    id
    balance
    currency
    transactions {
      id
      type
      amount
      status
      createdAt
    }
  }
}

# Get user's transactions
query MyTransactions {
  myTransactions(limit: 20, offset: 0) {
    id
    type
    amount
    currency
    status
    wallet {
      user {
        displayName
      }
    }
    recipientWallet {
      user {
        displayName
      }
    }
  }
}

# Get user's beneficiaries
query MyBeneficiaries {
  myBeneficiaries {
    id
    name
    accountType
    isFavorite
    transferCount
    totalTransferred
  }
}

# Get favorite beneficiaries only
query MyFavoriteBeneficiaries {
  myFavoriteBeneficiaries {
    id
    name
    phoneE164
    lastTransferAt
  }
}

# Search user by phone
query UserByPhone {
  userByPhone(phone: "+2250123456789") {
    id
    displayName
    username
  }
}

# Search user by username
query UserByUsername {
  userByUsername(username: "john_doe") {
    id
    displayName
    phone
  }
}
```

### Mutations

```graphql
# Update profile
mutation UpdateProfile {
  updateProfile(
    firstName: "John"
    lastName: "Doe"
    email: "john@example.com"
  ) {
    id
    fullName
    email
  }
}

# Set username
mutation SetUsername {
  setUsername(username: "john_doe") {
    id
    username
    displayName
  }
}

# Toggle beneficiary favorite
mutation ToggleFavorite {
  toggleBeneficiaryFavorite(beneficiaryId: "uuid") {
    id
    isFavorite
  }
}
```

## DataLoader Benefits

DataLoaders automatically batch and cache requests within a single GraphQL query:

### Without DataLoader (N+1 Problem)
```
Query: Get 10 transactions with user details
- 1 query to fetch transactions
- 10 queries to fetch wallets (one per transaction)
- 10 queries to fetch users (one per wallet)
Total: 21 database queries
```

### With DataLoader
```
Query: Get 10 transactions with user details
- 1 query to fetch transactions
- 1 batched query to fetch all wallets
- 1 batched query to fetch all users
Total: 3 database queries
```

## Authentication

All queries and mutations (except introspection) require JWT authentication:

```typescript
// HTTP Headers
{
  "Authorization": "Bearer <jwt_token>"
}
```

The `@CurrentUser()` decorator is available in resolvers to get the authenticated user.

## Repository Extensions Required

The loaders require these batch methods in repositories:

### UserRepository
```typescript
abstract findByIds(ids: string[]): Promise<User[]>;
abstract findByPhones(phones: string[]): Promise<User[]>;
abstract findByUsernames(usernames: string[]): Promise<User[]>;
```

### WalletRepository
```typescript
abstract findByIds(ids: string[]): Promise<WalletEntity[]>;
abstract findByUserIds(userIds: string[]): Promise<WalletEntity[]>;
abstract findByCircleWalletIds(circleWalletIds: string[]): Promise<WalletEntity[]>;
```

### TransactionRepository
```typescript
abstract findByIds(ids: string[]): Promise<TransactionEntity[]>;
abstract findByWalletIds(walletIds: string[]): Promise<TransactionEntity[]>;
abstract findByRecipientWalletIds(recipientWalletIds: string[]): Promise<TransactionEntity[]>;
```

### BeneficiaryRepository
```typescript
abstract findByIds(ids: string[]): Promise<Beneficiary[]>;
abstract findByWalletIds(walletIds: string[]): Promise<Beneficiary[]>;
abstract findByBeneficiaryUserIds(beneficiaryUserIds: string[]): Promise<Beneficiary[]>;
abstract findFavoritesByWalletId(walletId: string): Promise<Beneficiary[]>;
```

## Configuration

The GraphQL endpoint is available at:
```
http://localhost:3000/graphql
```

GraphQL Playground (development only):
```
http://localhost:3000/graphql
```

## Environment Variables

```env
NODE_ENV=development|production
```

- `development`: Enables playground and introspection
- `production`: Disables playground, hides error details

## Performance Tips

1. **Use DataLoaders**: Always access related data through loaders in field resolvers
2. **Limit Depth**: Implement query depth limiting for complex nested queries
3. **Paginate Lists**: Always use pagination for list queries
4. **Select Fields**: Only request needed fields in queries
5. **Batch Operations**: Group related operations in single GraphQL requests

## Future Enhancements

- [ ] Query complexity analysis
- [ ] Query depth limiting
- [ ] Persisted queries
- [ ] Subscriptions for real-time updates
- [ ] Field-level caching
- [ ] Custom scalars (Phone, Currency, etc.)
- [ ] Input type validation decorators
- [ ] Cursor-based pagination
- [ ] Connection pattern for lists
- [ ] Relay specification support

## Testing

```typescript
// Example resolver test
describe('UserResolver', () => {
  let resolver: UserResolver;
  let loaders: LoaderContext;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserResolver,
        {
          provide: LoaderContext,
          useValue: mockLoaderContext,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    resolver = module.get<UserResolver>(UserResolver);
    loaders = module.get<LoaderContext>(LoaderContext);
  });

  it('should return current user', async () => {
    const user = createMockUser();
    const result = await resolver.getCurrentUser(user);
    expect(result.id).toBe(user.id);
  });
});
```

## Migration from REST

Mobile apps can gradually migrate from REST to GraphQL:

1. Add GraphQL queries alongside existing REST calls
2. Test GraphQL queries in development
3. Migrate feature-by-feature
4. Deprecate REST endpoints once GraphQL is stable

## Resources

- [NestJS GraphQL Documentation](https://docs.nestjs.com/graphql/quick-start)
- [DataLoader Documentation](https://github.com/graphql/dataloader)
- [Apollo Server Documentation](https://www.apollographql.com/docs/apollo-server/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
