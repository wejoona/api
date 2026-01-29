# Database Indexes Migration Guide

Recommended indexes for optimal performance.

## Generate Migration

```bash
npm run migration:generate -- -n AddPerformanceIndexes
```

## Essential Indexes

Copy this SQL into your migration file:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1706543210000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users table
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email
        ON users(email)
        WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_phone
        ON users(phone)
        WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_created_at
        ON users(created_at DESC);
    `);

    // Wallets table
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_wallets_user_id
        ON wallets(user_id)
        WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_wallets_circle_wallet_id
        ON wallets(circle_wallet_id);
    `);

    // Transactions table
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id_created
        ON transactions(user_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id
        ON transactions(wallet_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_status
        ON transactions(status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_type_status
        ON transactions(type, status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_created_at
        ON transactions(created_at DESC);
    `);

    // Transfers table
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transfers_sender_id
        ON transfers(sender_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transfers_recipient_id
        ON transfers(recipient_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transfers_status
        ON transfers(status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transfers_created_at
        ON transfers(created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transfers_sender_created
        ON transfers(sender_id, created_at DESC);
    `);

    // Beneficiaries table
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id
        ON beneficiaries(user_id)
        WHERE deleted_at IS NULL;
    `);

    // KYC submissions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kyc_user_id_status
        ON kyc_submissions(user_id, status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kyc_status_created
        ON kyc_submissions(status, created_at DESC);
    `);

    // Sessions table
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id
        ON sessions(user_id)
        WHERE is_active = true;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token
        ON sessions(refresh_token_hash);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
        ON sessions(expires_at);
    `);

    // Notifications table
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read
        ON notifications(user_id, is_read, created_at DESC);
    `);

    // Webhooks table
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhooks_status
        ON webhooks(status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhooks_event_type
        ON webhooks(event_type, created_at DESC);
    `);

    // Devices table
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_devices_user_id
        ON devices(user_id)
        WHERE is_active = true;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_devices_device_id
        ON devices(device_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Users
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_email;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_phone;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_created_at;`);

    // Wallets
    await queryRunner.query(`DROP INDEX IF EXISTS idx_wallets_user_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_wallets_circle_wallet_id;`);

    // Transactions
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_user_id_created;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_wallet_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_type_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_created_at;`);

    // Transfers
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transfers_sender_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transfers_recipient_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transfers_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transfers_created_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transfers_sender_created;`);

    // Beneficiaries
    await queryRunner.query(`DROP INDEX IF EXISTS idx_beneficiaries_user_id;`);

    // KYC
    await queryRunner.query(`DROP INDEX IF EXISTS idx_kyc_user_id_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_kyc_status_created;`);

    // Sessions
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sessions_user_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sessions_refresh_token;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sessions_expires_at;`);

    // Notifications
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notifications_user_id_read;`);

    // Webhooks
    await queryRunner.query(`DROP INDEX IF EXISTS idx_webhooks_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_webhooks_event_type;`);

    // Devices
    await queryRunner.query(`DROP INDEX IF EXISTS idx_devices_user_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_devices_device_id;`);
  }
}
```

## Run Migration

```bash
npm run migration:run
```

## Verify Indexes

Check indexes were created:

```sql
-- List all indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Index Maintenance

### Analyze Tables
```sql
-- Update statistics after adding indexes
ANALYZE users;
ANALYZE wallets;
ANALYZE transactions;
ANALYZE transfers;
ANALYZE beneficiaries;
ANALYZE kyc_submissions;
ANALYZE sessions;
```

### Reindex if Needed
```sql
-- Rebuild all indexes for a table
REINDEX TABLE transactions;

-- Or specific index
REINDEX INDEX idx_transactions_user_id_created;
```

### Monitor Index Bloat
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size,
  ROUND(100.0 * pg_indexes_size(schemaname||'.'||tablename) /
    pg_total_relation_size(schemaname||'.'||tablename), 2) AS index_percentage
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Performance Impact

After adding indexes, you should see:

- **Query times reduced by 50-90%** for filtered queries
- **Page load times improved by 30-60%**
- **Cache hit rates increase** as queries are faster
- **Database CPU usage decrease** by 20-40%

## Troubleshooting

### Index not being used
```sql
-- Check query plan
EXPLAIN ANALYZE
SELECT * FROM transactions
WHERE user_id = 'xxx'
ORDER BY created_at DESC
LIMIT 20;
```

If you see "Seq Scan" instead of "Index Scan", the index might not be beneficial for that query size. This is normal for small tables.

### Index creation taking long
For large tables, create indexes with `CONCURRENTLY`:

```sql
CREATE INDEX CONCURRENTLY idx_transactions_user_id_created
  ON transactions(user_id, created_at DESC);
```

This allows reads/writes during index creation but takes longer.

## Next Steps

1. Run the migration
2. Verify indexes with profiling endpoints
3. Monitor query performance improvement
4. Remove unused indexes after monitoring
