# GraphQL Integration Guide

Step-by-step guide to integrate the GraphQL module into your NestJS application.

## Step 1: Install Dependencies

Already completed:
```bash
npm install @nestjs/graphql @nestjs/apollo @apollo/server graphql dataloader graphql-type-json
```

## Step 2: Import GraphQL Module

Add the GraphQL module to your root `app.module.ts`:

**File**: `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { GraphQLModule } from './modules/graphql/graphql.module';

@Module({
  imports: [
    // ... other modules
    GraphQLModule, // Add this
  ],
})
export class AppModule {}
```

## Step 3: Add Repository Batch Methods

Follow the instructions in `REPOSITORY_EXTENSIONS.md` to add batch query methods to all repositories.

### Quick Checklist:

- [ ] Add `findByIds`, `findByPhones`, `findByUsernames` to UserRepository
- [ ] Add `findByIds`, `findByUserIds`, `findByCircleWalletIds` to WalletRepository
- [ ] Add `findByIds`, `findByWalletIds`, `findByRecipientWalletIds`, `findByWalletId` to TransactionRepository
- [ ] Add `findByIds`, `findByWalletIds`, `findByBeneficiaryUserIds`, `findFavoritesByWalletId` to BeneficiaryRepository

## Step 4: Verify Module Exports

Ensure your feature modules export their repositories:

### UserModule
```typescript
@Module({
  // ...
  exports: [UserRepository],
})
export class UserModule {}
```

### WalletModule
```typescript
@Module({
  // ...
  exports: [WalletRepository],
})
export class WalletModule {}
```

### TransactionModule
```typescript
@Module({
  // ...
  exports: [TransactionRepository],
})
export class TransactionModule {}
```

### BeneficiaryModule
```typescript
@Module({
  // ...
  exports: [BeneficiaryRepository],
})
export class BeneficiaryModule {}
```

## Step 5: Test the GraphQL Endpoint

1. Start the development server:
```bash
npm run start:dev
```

2. Open GraphQL Playground:
```
http://localhost:3000/graphql
```

3. Set authentication header (get JWT from login endpoint):
```json
{
  "Authorization": "Bearer <your_jwt_token>"
}
```

4. Run a test query:
```graphql
query {
  me {
    id
    displayName
    phone
  }
}
```

## Step 6: Mobile Integration

### Flutter/Dart Integration

1. Add GraphQL dependencies:
```yaml
dependencies:
  graphql_flutter: ^5.1.0
```

2. Create GraphQL client:
```dart
import 'package:graphql_flutter/graphql_flutter.dart';

final HttpLink httpLink = HttpLink('https://api.joonapay.com/graphql');

final AuthLink authLink = AuthLink(
  getToken: () async => 'Bearer ${await getToken()}',
);

final Link link = authLink.concat(httpLink);

final GraphQLClient client = GraphQLClient(
  cache: GraphQLCache(store: InMemoryStore()),
  link: link,
);
```

3. Execute queries:
```dart
const String getCurrentUser = r'''
  query GetCurrentUser {
    me {
      id
      displayName
      wallet {
        balance
        currency
      }
    }
  }
''';

final QueryOptions options = QueryOptions(
  document: gql(getCurrentUser),
);

final QueryResult result = await client.query(options);

if (!result.hasException) {
  final user = result.data?['me'];
  print('User: ${user['displayName']}');
  print('Balance: ${user['wallet']['balance']}');
}
```

### React/TypeScript Integration

1. Add Apollo Client:
```bash
npm install @apollo/client graphql
```

2. Create Apollo Client:
```typescript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: 'https://api.joonapay.com/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

3. Use queries:
```typescript
import { gql, useQuery } from '@apollo/client';

const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      displayName
      wallet {
        balance
        currency
      }
    }
  }
`;

function UserProfile() {
  const { loading, error, data } = useQuery(GET_CURRENT_USER);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h1>{data.me.displayName}</h1>
      <p>Balance: {data.me.wallet.balance} {data.me.wallet.currency}</p>
    </div>
  );
}
```

## Step 7: Code Generation (Optional but Recommended)

### For TypeScript/React

1. Install GraphQL Code Generator:
```bash
npm install -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-react-apollo
```

2. Create `codegen.yml`:
```yaml
schema: http://localhost:3000/graphql
documents: 'src/**/*.graphql'
generates:
  src/generated/graphql.tsx:
    plugins:
      - typescript
      - typescript-operations
      - typescript-react-apollo
    config:
      withHooks: true
```

3. Generate types:
```bash
npx graphql-codegen
```

### For Flutter/Dart

Use `artemis` or `ferry` for code generation:

```yaml
dev_dependencies:
  artemis: ^7.0.0
  build_runner: ^2.0.0
```

## Step 8: Performance Monitoring

### Enable Apollo Studio (Production)

1. Sign up at https://studio.apollographql.com

2. Update GraphQL module configuration:
```typescript
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  // ... other config
  plugins: [
    ApolloServerPluginLandingPageLocalDefault(),
    ApolloServerPluginUsageReporting({
      sendVariableValues: { all: true },
    }),
  ],
}),
```

3. Set environment variable:
```env
APOLLO_KEY=your_apollo_key
```

### Custom Metrics

Add Prometheus metrics for GraphQL:

```typescript
import { Plugin } from '@nestjs/apollo';
import { GraphQLRequestListener } from '@apollo/server';

@Plugin()
export class GraphQLMetricsPlugin {
  async requestDidStart(): Promise<GraphQLRequestListener<any>> {
    return {
      async didResolveOperation(requestContext) {
        // Track operation
        metricsService.trackGraphQLOperation(
          requestContext.operationName,
          requestContext.operation.operation,
        );
      },
      async willSendResponse(requestContext) {
        // Track response time
        metricsService.trackGraphQLResponseTime(
          requestContext.operationName,
          Date.now() - requestContext.metrics.startHrTime,
        );
      },
    };
  }
}
```

## Step 9: Security Best Practices

### Query Complexity Limiting

Install and configure query complexity:

```bash
npm install graphql-query-complexity
```

```typescript
import { fieldExtensionsEstimator, simpleEstimator } from 'graphql-query-complexity';

GraphQLModule.forRoot<ApolloDriverConfig>({
  // ... other config
  validationRules: [
    createComplexityLimitRule(1000, {
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: 1 }),
      ],
    }),
  ],
}),
```

### Query Depth Limiting

```bash
npm install graphql-depth-limit
```

```typescript
import depthLimit from 'graphql-depth-limit';

GraphQLModule.forRoot<ApolloDriverConfig>({
  // ... other config
  validationRules: [depthLimit(7)],
}),
```

### Rate Limiting

Use existing ThrottlerGuard with GraphQL:

```typescript
import { ThrottlerGuard } from '@nestjs/throttler';

@Resolver()
@UseGuards(ThrottlerGuard)
export class UserResolver {
  // ...
}
```

## Step 10: Testing

### Unit Testing Resolvers

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserResolver } from './user.resolver';
import { LoaderContext } from '../loaders';
import { UserRepository } from '@/modules/user/application/domain/repositories/user.repository';

describe('UserResolver', () => {
  let resolver: UserResolver;
  let userRepository: jest.Mocked<UserRepository>;
  let loaders: jest.Mocked<LoaderContext>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserResolver,
        {
          provide: UserRepository,
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: LoaderContext,
          useValue: {
            user: {
              byId: {
                load: jest.fn(),
              },
            },
            wallet: {
              byUserId: {
                load: jest.fn(),
              },
            },
          },
        },
      ],
    }).compile();

    resolver = module.get<UserResolver>(UserResolver);
    userRepository = module.get(UserRepository);
    loaders = module.get(LoaderContext);
  });

  it('should return current user', async () => {
    const mockUser = User.create({ phone: '+1234567890' });
    const result = await resolver.getCurrentUser(mockUser);

    expect(result.id).toBe(mockUser.id);
    expect(result.phone).toBe(mockUser.phone);
  });
});
```

### Integration Testing

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('GraphQL Integration (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: '+1234567890', pin: '1234' });

    authToken = loginResponse.body.accessToken;
  });

  it('should query current user', async () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        query: '{ me { id displayName } }',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.me).toBeDefined();
        expect(res.body.data.me.displayName).toBeDefined();
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## Troubleshooting

### Schema Not Generating

- Ensure all models are imported in at least one resolver
- Check for circular dependency issues
- Restart the dev server

### DataLoader Not Batching

- Verify LoaderContext is REQUEST-scoped
- Ensure loaders are injected through LoaderContext
- Check that batch methods return arrays in correct order

### Authentication Not Working

- Verify JWT token is valid and not expired
- Check Authorization header format: `Bearer <token>`
- Ensure GqlAuthGuard is properly extracting request from context

### Performance Issues

- Add database indexes on frequently queried fields
- Implement query complexity limits
- Use pagination for large result sets
- Monitor DataLoader cache hit rates

## Next Steps

1. Implement subscription support for real-time updates
2. Add custom scalars for Phone, Currency, etc.
3. Implement persisted queries for better caching
4. Add field-level authorization
5. Set up Apollo Federation for microservices
6. Implement cursor-based pagination
7. Add GraphQL metrics to monitoring dashboards

## Resources

- [Example Queries](./EXAMPLE_QUERIES.graphql)
- [Repository Extensions](./REPOSITORY_EXTENSIONS.md)
- [NestJS GraphQL Docs](https://docs.nestjs.com/graphql/quick-start)
- [DataLoader Guide](https://github.com/graphql/dataloader)
- [Apollo Client Docs](https://www.apollographql.com/docs/react/)
