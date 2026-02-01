# GraphQL Module Migration Checklist

Complete checklist for integrating the GraphQL module into the JoonaPay backend.

## Prerequisites

- [x] Install GraphQL dependencies
- [x] Create GraphQL module structure
- [x] Implement DataLoader classes
- [x] Create GraphQL object types (models)
- [x] Implement resolvers
- [x] Create authentication guard

## Backend Integration

### 1. Repository Extensions

Add batch query methods to repositories:

#### UserRepository
- [ ] Add `findByIds(ids: string[]): Promise<User[]>`
- [ ] Add `findByPhones(phones: string[]): Promise<User[]>`
- [ ] Add `findByUsernames(usernames: string[]): Promise<User[]>`
- [ ] Implement methods in TypeORM repository
- [ ] Add unit tests for batch methods

#### WalletRepository
- [ ] Add `findByIds(ids: string[]): Promise<WalletEntity[]>`
- [ ] Add `findByUserIds(userIds: string[]): Promise<WalletEntity[]>`
- [ ] Add `findByCircleWalletIds(circleWalletIds: string[]): Promise<WalletEntity[]>`
- [ ] Implement methods in TypeORM repository
- [ ] Add unit tests for batch methods

#### TransactionRepository
- [ ] Add `findByIds(ids: string[]): Promise<TransactionEntity[]>`
- [ ] Add `findByWalletIds(walletIds: string[]): Promise<TransactionEntity[]>`
- [ ] Add `findByRecipientWalletIds(recipientWalletIds: string[]): Promise<TransactionEntity[]>`
- [ ] Add `findByWalletId(walletId: string, options?: { limit?: number; offset?: number }): Promise<TransactionEntity[]>`
- [ ] Implement methods in TypeORM repository
- [ ] Add unit tests for batch methods

#### BeneficiaryRepository
- [ ] Add `findByIds(ids: string[]): Promise<Beneficiary[]>`
- [ ] Add `findByWalletIds(walletIds: string[]): Promise<Beneficiary[]>`
- [ ] Add `findByBeneficiaryUserIds(beneficiaryUserIds: string[]): Promise<Beneficiary[]>`
- [ ] Add `findFavoritesByWalletId(walletId: string): Promise<Beneficiary[]>`
- [ ] Implement methods in TypeORM repository
- [ ] Add unit tests for batch methods

### 2. Module Exports

Ensure repositories are exported:

- [ ] UserModule exports UserRepository
- [ ] WalletModule exports WalletRepository
- [ ] TransactionModule exports TransactionRepository
- [ ] BeneficiaryModule exports BeneficiaryRepository

### 3. App Module Integration

- [ ] Import GraphQLModule in app.module.ts
- [ ] Verify module loads without errors
- [ ] Check that schema.gql is generated

### 4. Database Indexes

Add indexes for batch query performance:

```sql
-- Users
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Wallets
CREATE INDEX IF NOT EXISTS idx_wallets_id ON wallets(id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_circle_wallet_id ON wallets(circle_wallet_id);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_id ON transactions(id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_recipient_wallet_id ON transactions(recipient_wallet_id);

-- Beneficiaries
CREATE INDEX IF NOT EXISTS idx_beneficiaries_id ON beneficiaries(id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_wallet_id ON beneficiaries(wallet_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_beneficiary_user_id ON beneficiaries(beneficiary_user_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_wallet_id_is_favorite ON beneficiaries(wallet_id, is_favorite);
```

- [ ] Create migration for indexes
- [ ] Run migration in development
- [ ] Run migration in staging
- [ ] Verify query performance

## Testing

### Unit Tests

- [x] UserResolver test file created
- [ ] Run user resolver tests: `npm test user.resolver.spec`
- [ ] Create WalletResolver tests
- [ ] Create TransactionResolver tests
- [ ] Create BeneficiaryResolver tests
- [ ] Create DataLoader tests
- [ ] Achieve >80% code coverage

### Integration Tests

- [ ] Create GraphQL e2e test file
- [ ] Test authentication flow
- [ ] Test user queries
- [ ] Test wallet queries
- [ ] Test transaction queries
- [ ] Test beneficiary queries
- [ ] Test nested relation queries
- [ ] Test mutations
- [ ] Test error handling
- [ ] Test unauthorized access

### Performance Tests

- [ ] Test DataLoader batching (verify single queries for batches)
- [ ] Test query complexity limits
- [ ] Test pagination
- [ ] Load test with 100+ concurrent users
- [ ] Verify N+1 prevention (compare query counts)

## Documentation

- [x] README.md created
- [x] INTEGRATION_GUIDE.md created
- [x] REPOSITORY_EXTENSIONS.md created
- [x] EXAMPLE_QUERIES.graphql created
- [ ] Update API documentation
- [ ] Add GraphQL section to main README
- [ ] Document mobile integration
- [ ] Create video tutorial (optional)

## Security

- [ ] Verify JWT authentication works
- [ ] Test authorization (users can only access their data)
- [ ] Implement query complexity limits
- [ ] Implement query depth limits
- [ ] Add rate limiting
- [ ] Test for GraphQL injection attacks
- [ ] Review error messages (no sensitive data leaks)
- [ ] Add request logging
- [ ] Configure CORS properly

## Monitoring

- [ ] Add GraphQL metrics to Prometheus
- [ ] Create Grafana dashboard for GraphQL
- [ ] Set up error tracking (Sentry/similar)
- [ ] Monitor query performance
- [ ] Track DataLoader cache hit rates
- [ ] Alert on slow queries
- [ ] Alert on high error rates

## Production Readiness

### Configuration

- [ ] Set `NODE_ENV=production` in production
- [ ] Disable playground in production
- [ ] Disable introspection in production
- [ ] Configure proper error handling
- [ ] Set up CDN for schema/persisted queries (optional)

### Performance

- [ ] Enable compression
- [ ] Configure connection pooling
- [ ] Set appropriate timeouts
- [ ] Configure cache headers
- [ ] Enable APQ (Automatic Persisted Queries) - optional

### Deployment

- [ ] Deploy to staging environment
- [ ] Run smoke tests in staging
- [ ] Verify schema is accessible
- [ ] Test with mobile app in staging
- [ ] Monitor staging for issues
- [ ] Deploy to production
- [ ] Verify production deployment
- [ ] Monitor production metrics

## Mobile Integration

### Flutter App

- [ ] Add graphql_flutter dependency
- [ ] Create GraphQL client wrapper
- [ ] Implement authentication interceptor
- [ ] Test queries in development
- [ ] Migrate user profile screen to GraphQL
- [ ] Migrate wallet screen to GraphQL
- [ ] Migrate transaction list to GraphQL
- [ ] Migrate beneficiary list to GraphQL
- [ ] Test offline behavior
- [ ] Deploy to TestFlight/Play Store Beta

### Documentation for Mobile Team

- [ ] Share EXAMPLE_QUERIES.graphql
- [ ] Share authentication flow
- [ ] Provide code samples
- [ ] Create troubleshooting guide
- [ ] Schedule knowledge transfer session

## Rollout Strategy

### Phase 1: Beta (Week 1-2)
- [ ] Enable GraphQL in staging
- [ ] Internal testing only
- [ ] Mobile team testing
- [ ] Collect feedback
- [ ] Fix critical bugs

### Phase 2: Limited Release (Week 3-4)
- [ ] Enable for 10% of users
- [ ] Monitor metrics closely
- [ ] Compare REST vs GraphQL performance
- [ ] Collect user feedback
- [ ] Optimize based on real usage

### Phase 3: Full Release (Week 5+)
- [ ] Enable for 50% of users
- [ ] Continue monitoring
- [ ] Enable for 100% of users
- [ ] Deprecate equivalent REST endpoints (gradual)
- [ ] Remove deprecated endpoints after 3 months

## Post-Launch

### Iteration 1 (Month 2)
- [ ] Add subscriptions for real-time updates
- [ ] Implement cursor-based pagination
- [ ] Add custom scalars (Phone, Currency, etc.)
- [ ] Improve error messages

### Iteration 2 (Month 3)
- [ ] Implement persisted queries
- [ ] Add field-level authorization
- [ ] Optimize DataLoader cache strategies
- [ ] Add more mutations (transfer, deposit, etc.)

### Iteration 3 (Month 4+)
- [ ] Implement Apollo Federation (if microservices)
- [ ] Add GraphQL subscriptions for notifications
- [ ] Implement batch mutations
- [ ] Add admin queries/mutations

## Support

### Training
- [ ] Train backend team on GraphQL
- [ ] Train mobile team on GraphQL clients
- [ ] Train QA team on GraphQL testing
- [ ] Create internal wiki/documentation

### Maintenance
- [ ] Assign GraphQL module owner
- [ ] Set up on-call rotation
- [ ] Create runbook for common issues
- [ ] Schedule quarterly performance reviews

## Success Metrics

Track these metrics to measure success:

- [ ] API response time (target: <200ms p95)
- [ ] Query count reduction (target: 50% fewer queries)
- [ ] Error rate (target: <0.1%)
- [ ] Mobile app load time (target: 20% improvement)
- [ ] Developer productivity (target: 30% faster feature development)
- [ ] User satisfaction (target: maintain or improve)

## Sign-off

- [ ] Backend Lead approval
- [ ] Mobile Lead approval
- [ ] DevOps approval
- [ ] Security approval
- [ ] Product approval
- [ ] CTO approval

---

## Notes

Use this checklist to track progress. Mark items as complete with `[x]`.

For issues or questions, contact:
- Backend: [backend-team@joonapay.com]
- Mobile: [mobile-team@joonapay.com]
- DevOps: [devops@joonapay.com]
