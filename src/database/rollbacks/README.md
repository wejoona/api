# Database Migration Rollback Scripts

This directory contains safe rollback SQL scripts for all database migrations in the JoonaPay USDC Wallet backend.

## Directory Structure

```
rollbacks/
├── README.md                                          # This file
├── execute-rollback.sh                               # Script to execute rollbacks
├── 1737215000000-InitialSchema.rollback.sql          # Initial tables (users, wallets, transactions)
├── 1737300000000-AddCircleFieldsAndNewTables.rollback.sql
├── 1737400000000-AddLowBalanceNotificationType.rollback.sql
├── 1737500000000-CreateReferralTables.rollback.sql
├── 1737600000000-AddAdminFieldsAndAuditLog.rollback.sql
├── 1737700000000-AddUserPinHash.rollback.sql
├── 1737800000000-CreateBlacklistedDevicesTable.rollback.sql
├── 1737900000000-AddWalletVersionColumn.rollback.sql
├── 1738000000000-AddUserUsername.rollback.sql
├── 1738000000001-CreateBillPaymentsTables.rollback.sql
├── 1738100000000-CreateContactsTable.rollback.sql
├── 1738200000000-CreateWhitelistedAddressesTable.rollback.sql
├── 1738300000000-AddSecurityNotificationTypes.rollback.sql
├── 1738400000000-CreateWebhookDeadlettersTable.rollback.sql
├── 1738500000000-AddCompositeIndexesForPerformance.rollback.sql
├── 1738600000000-CreateNotificationPreferencesTable.rollback.sql
├── 1738700000000-CreateFcmTokensTable.rollback.sql
├── 1738800000000-AddNotificationTypes.rollback.sql
├── 1738900000000-CreateKycVerificationsTable.rollback.sql
├── 1738950000000-CreateMonitoringTables.rollback.sql
├── 1739000000000-CreateMerchantTables.rollback.sql
├── 1740000000000-SeparateSchemas.rollback.sql        # Complex schema separation
├── 1741000000000-CreateVerificationsTable.rollback.sql
├── 1741100000000-CreateDevicesTable.rollback.sql
├── 1741200000000-CreateBeneficiariesTable.rollback.sql
├── 1741300000000-CreateSessionsTable.rollback.sql
├── 1741400000000-CreateFeatureFlagsTable.rollback.sql
├── 1741500000000-CreateVelocityRulesTable.rollback.sql
├── 1741600000000-CreateSupportTicketsTable.rollback.sql
├── 1741600000001-CreateTicketMessagesTable.rollback.sql
├── 1741700000000-CreateSavingsPotsTable.rollback.sql
├── 1741800000000-EnhanceKycVerifications.rollback.sql
├── 1741900000000-CreateWatchlistTables.rollback.sql
├── 1742000000000-CreateApiKeysTable.rollback.sql
├── 1742100000000-CreateFraudRingDetectionsTable.rollback.sql
├── 1742200000000-CreateComplianceCasesTables.rollback.sql
├── 1742300000000-CreateDataRetentionTables.rollback.sql
└── 1743000000000-CreateSlaConfigurationsTable.rollback.sql
```

## Usage

### Preferred Method: TypeORM Migration Revert

The safest way to rollback migrations is using TypeORM's built-in revert command:

```bash
# Revert the most recent migration
cd usdc-wallet && npm run migration:revert

# Revert multiple migrations (run multiple times)
cd usdc-wallet && npm run migration:revert && npm run migration:revert
```

### Manual Rollback with SQL Scripts

For manual rollbacks or emergency recovery, use the SQL scripts directly:

```bash
# Using the rollback script
./src/database/rollbacks/execute-rollback.sh 1743000000000-CreateSlaConfigurationsTable

# Or directly with psql
psql -U postgres -d joonapay -f src/database/rollbacks/1743000000000-CreateSlaConfigurationsTable.rollback.sql
```

## Important Notes

### Rollback Order

Migrations must be rolled back in **reverse chronological order** to avoid dependency issues. Always start with the most recent migration and work backwards.

### Enum Values

PostgreSQL does not support removing values from enum types without recreating them. Rollbacks for migrations that add enum values are marked as **NO-OP** - the values remain but are unused. This is safe and does not affect functionality.

### Data Loss Warnings

Most rollback scripts include warnings about data loss. Review the comments at the top of each script before executing.

### Schema Separation (Migration 1740000000000)

The schema separation migration is complex and moves tables between PostgreSQL schemas. Its rollback requires careful execution. Use TypeORM's revert command when possible.

### Testing

Always test rollbacks in a staging environment before executing in production:

1. Create a database backup
2. Execute the rollback in staging
3. Verify application functionality
4. Execute in production only after validation

## Rollback Categories

| Category | Migrations | Risk Level |
|----------|------------|------------|
| Core Tables | 1737215000000, 1737300000000 | HIGH - Data loss |
| User Features | 1737700000000, 1738000000000 | MEDIUM |
| Compliance | 1741500000000, 1741900000000, 1742100000000, 1742200000000 | HIGH |
| Notifications | 1738600000000, 1738700000000, 1738800000000 | LOW |
| Enum Additions | 1737400000000, 1738300000000, 1738800000000 | NONE (NO-OP) |

## Emergency Recovery

In case of critical issues:

1. Stop application servers
2. Create full database backup: `pg_dump -Fc joonapay > backup.dump`
3. Execute required rollbacks in reverse order
4. Verify database integrity
5. Restart application with matching code version

## Contact

For assistance with complex rollbacks, contact the database team or refer to the architecture documentation.
