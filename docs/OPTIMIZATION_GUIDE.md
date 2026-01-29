# Performance Optimization Guide

Quick reference for optimizing the USDC Wallet backend.

## Table of Contents

- [Database Optimization](#database-optimization)
- [Query Optimization](#query-optimization)
- [Caching Strategies](#caching-strategies)
- [N+1 Query Prevention](#n1-query-prevention)
- [API Performance](#api-performance)
- [Memory Optimization](#memory-optimization)

## Database Optimization

### Essential Indexes

```sql
-- Users table
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Wallets table
CREATE INDEX idx_wallets_user_id ON wallets(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_wallets_circle_wallet_id ON wallets(circle_wallet_id);

-- Transactions table
CREATE INDEX idx_transactions_user_id_created ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type_status ON transactions(type, status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- Transfers table
CREATE INDEX idx_transfers_sender_id ON transfers(sender_id);
CREATE INDEX idx_transfers_recipient_id ON transfers(recipient_id);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_transfers_created_at ON transfers(created_at DESC);

-- Beneficiaries table
CREATE INDEX idx_beneficiaries_user_id ON beneficiaries(user_id) WHERE deleted_at IS NULL;

-- KYC submissions
CREATE INDEX idx_kyc_user_id_status ON kyc_submissions(user_id, status);
CREATE INDEX idx_kyc_status_created ON kyc_submissions(status, created_at DESC);

-- Sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id) WHERE is_active = true;
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### Composite Indexes

```sql
-- For queries with multiple WHERE conditions
CREATE INDEX idx_transactions_user_status_created
  ON transactions(user_id, status, created_at DESC);

-- For pagination with filters
CREATE INDEX idx_transfers_user_type_created
  ON transfers(sender_id, type, created_at DESC);

-- For statistics queries
CREATE INDEX idx_transactions_user_type_amount
  ON transactions(user_id, type, amount);
```

### Partial Indexes

```sql
-- Index only active records
CREATE INDEX idx_active_sessions
  ON sessions(user_id, expires_at)
  WHERE is_active = true;

-- Index only pending transactions
CREATE INDEX idx_pending_transactions
  ON transactions(user_id, created_at)
  WHERE status = 'pending';

-- Index only verified users
CREATE INDEX idx_verified_users
  ON users(email)
  WHERE kyc_status = 'verified';
```

## Query Optimization

### Before: Inefficient Query

```typescript
// ❌ Bad: SELECT * loads unnecessary columns
const users = await this.userRepository.find({
  where: { status: 'active' }
});

// ❌ Bad: No pagination
const transactions = await this.transactionRepository.find({
  where: { userId }
});

// ❌ Bad: N+1 problem
const transfers = await this.transferRepository.find();
for (const transfer of transfers) {
  transfer.sender = await this.userRepository.findOne(transfer.senderId);
  transfer.recipient = await this.userRepository.findOne(transfer.recipientId);
}
```

### After: Optimized Query

```typescript
// ✅ Good: Select only needed columns
const users = await this.userRepository
  .createQueryBuilder('user')
  .select(['user.id', 'user.email', 'user.firstName', 'user.lastName'])
  .where('user.status = :status', { status: 'active' })
  .getMany();

// ✅ Good: Use pagination
const transactions = await this.transactionRepository.find({
  where: { userId },
  order: { createdAt: 'DESC' },
  take: 20,
  skip: 0
});

// ✅ Good: Use relations (single query with JOIN)
const transfers = await this.transferRepository.find({
  relations: ['sender', 'recipient'],
  order: { createdAt: 'DESC' }
});
```

### Query Builder Tips

```typescript
// Use query builder for complex queries
const result = await this.transactionRepository
  .createQueryBuilder('tx')
  .select([
    'tx.id',
    'tx.amount',
    'tx.status',
    'tx.createdAt',
    'user.firstName',
    'user.lastName'
  ])
  .leftJoin('tx.user', 'user')
  .where('tx.userId = :userId', { userId })
  .andWhere('tx.status IN (:...statuses)', {
    statuses: ['completed', 'pending']
  })
  .orderBy('tx.createdAt', 'DESC')
  .limit(20)
  .getMany();

// Use raw SQL for complex aggregations
const stats = await this.dataSource.query(`
  SELECT
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount
  FROM transactions
  WHERE user_id = $1
    AND created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE_TRUNC('day', created_at)
  ORDER BY date DESC
`, [userId]);
```

## Caching Strategies

### Cache User Data

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findById(id: string): Promise<User> {
    const cacheKey = `user:${id}`;

    // Try cache first
    const cached = await this.cacheManager.get<User>(cacheKey);
    if (cached) return cached;

    // Fallback to database
    const user = await this.userRepository.findOne(id);

    // Cache for 1 hour
    await this.cacheManager.set(cacheKey, user, 3600000);

    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.update(id, dto);

    // Invalidate cache
    await this.cacheManager.del(`user:${id}`);

    return user;
  }
}
```

### Cache Wallet Balance

```typescript
@Injectable()
export class WalletService {
  async getBalance(userId: string): Promise<number> {
    const cacheKey = `wallet:balance:${userId}`;

    const cached = await this.cacheManager.get<number>(cacheKey);
    if (cached !== null) return cached;

    const balance = await this.blnkAdapter.getBalance(userId);

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, balance, 300000);

    return balance;
  }

  async transfer(dto: TransferDto): Promise<Transfer> {
    const transfer = await this.createTransfer(dto);

    // Invalidate both sender and recipient balance cache
    await Promise.all([
      this.cacheManager.del(`wallet:balance:${dto.senderId}`),
      this.cacheManager.del(`wallet:balance:${dto.recipientId}`)
    ]);

    return transfer;
  }
}
```

### Cache List Data with TTL

```typescript
@Injectable()
export class BeneficiaryService {
  async findByUserId(userId: string): Promise<Beneficiary[]> {
    const cacheKey = `beneficiaries:user:${userId}`;

    const cached = await this.cacheManager.get<Beneficiary[]>(cacheKey);
    if (cached) return cached;

    const beneficiaries = await this.beneficiaryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });

    // Cache for 30 minutes (beneficiaries don't change often)
    await this.cacheManager.set(cacheKey, beneficiaries, 1800000);

    return beneficiaries;
  }
}
```

### Pre-warm Cache

```typescript
@Injectable()
export class CacheWarmupService {
  @Cron('0 */6 * * *') // Every 6 hours
  async warmupPopularData() {
    // Get most active users
    const activeUsers = await this.getActiveUsers();

    // Pre-load their data
    await Promise.all(
      activeUsers.map(async (user) => {
        await this.userService.findById(user.id);
        await this.walletService.getBalance(user.id);
        await this.beneficiaryService.findByUserId(user.id);
      })
    );
  }
}
```

## N+1 Query Prevention

### TypeORM Relations

```typescript
// ❌ Bad: N+1 problem
const transfers = await this.transferRepository.find();
for (const transfer of transfers) {
  transfer.sender = await this.userRepository.findOne(transfer.senderId);
}

// ✅ Good: Eager loading
const transfers = await this.transferRepository.find({
  relations: ['sender', 'recipient', 'wallet']
});

// ✅ Good: Query builder with leftJoinAndSelect
const transfers = await this.transferRepository
  .createQueryBuilder('transfer')
  .leftJoinAndSelect('transfer.sender', 'sender')
  .leftJoinAndSelect('transfer.recipient', 'recipient')
  .getMany();
```

### Batch Loading

```typescript
// ❌ Bad: Multiple queries in loop
for (const transaction of transactions) {
  transaction.user = await this.userRepository.findOne(transaction.userId);
}

// ✅ Good: Batch load
const userIds = [...new Set(transactions.map(t => t.userId))];
const users = await this.userRepository.findByIds(userIds);
const userMap = new Map(users.map(u => [u.id, u]));

transactions.forEach(transaction => {
  transaction.user = userMap.get(transaction.userId);
});
```

### DataLoader Pattern

```typescript
import DataLoader from 'dataloader';

@Injectable()
export class UserLoader {
  private loader: DataLoader<string, User>;

  constructor(private readonly userRepository: UserRepository) {
    this.loader = new DataLoader(async (userIds: string[]) => {
      const users = await this.userRepository.findByIds(userIds as string[]);
      const userMap = new Map(users.map(u => [u.id, u]));
      return userIds.map(id => userMap.get(id));
    });
  }

  async load(userId: string): Promise<User> {
    return this.loader.load(userId);
  }
}
```

## API Performance

### Use Pagination

```typescript
@Controller('transactions')
export class TransactionController {
  @Get()
  async list(
    @CurrentUser() user: User,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 20
  ) {
    // Limit max page size
    const maxLimit = Math.min(limit, 100);

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip: (page - 1) * maxLimit
    });

    return {
      data: transactions,
      meta: {
        page,
        limit: maxLimit,
        total,
        totalPages: Math.ceil(total / maxLimit)
      }
    };
  }
}
```

### Implement Rate Limiting

```typescript
// Already configured globally in app.module.ts
// Custom rate limit for specific endpoints:

@Controller('transfers')
export class TransferController {
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  async create(@Body() dto: CreateTransferDto) {
    return this.transferService.create(dto);
  }
}
```

### Response Compression

```typescript
// In main.ts
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable compression
  app.use(compression({
    level: 6, // Compression level (0-9)
    threshold: 1024, // Minimum size to compress (1KB)
  }));
}
```

## Memory Optimization

### Stream Large Files

```typescript
// ❌ Bad: Load entire file into memory
@Get('export')
async exportData() {
  const data = await this.getAllTransactions();
  return this.convertToCsv(data);
}

// ✅ Good: Stream data
@Get('export')
async exportData(@Res() res: Response) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=export.csv');

  const stream = this.transactionRepository
    .createQueryBuilder('tx')
    .stream();

  stream.on('data', (row) => {
    res.write(this.formatCsvRow(row));
  });

  stream.on('end', () => {
    res.end();
  });
}
```

### Use Cursors for Large Datasets

```typescript
async processAllTransactions() {
  const batchSize = 1000;
  let page = 0;

  while (true) {
    const transactions = await this.transactionRepository.find({
      order: { createdAt: 'ASC' },
      take: batchSize,
      skip: page * batchSize
    });

    if (transactions.length === 0) break;

    await this.processBatch(transactions);

    page++;
  }
}
```

### Clear References

```typescript
async processLargeDataset() {
  let data = await this.loadLargeData();

  // Process data
  await this.process(data);

  // Clear reference to help GC
  data = null;

  // Force GC if in development
  if (global.gc && process.env.NODE_ENV === 'development') {
    global.gc();
  }
}
```

## Performance Checklist

### Before Deployment

- [ ] Run slow query analysis
- [ ] Check N+1 patterns
- [ ] Verify cache hit rates >70%
- [ ] Review missing indexes
- [ ] Test with production-like data volume
- [ ] Enable APM in staging
- [ ] Set up Grafana dashboards
- [ ] Configure alerts

### Regular Maintenance

Weekly:
- [ ] Review slow query report
- [ ] Check cache efficiency
- [ ] Monitor error rates

Monthly:
- [ ] Add missing indexes
- [ ] Optimize high-traffic endpoints
- [ ] Review and update cache TTLs
- [ ] Analyze query patterns

Quarterly:
- [ ] Database vacuum and analyze
- [ ] Review and optimize schemas
- [ ] Capacity planning
- [ ] Performance load testing

## Resources

- [TypeORM Performance Tips](https://typeorm.io/performance)
- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
