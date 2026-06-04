# JoonaPay Database Seeding Guide

This guide explains how to use the database seeding system to initialize and populate the JoonaPay backend database.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Seed Files](#seed-files)
4. [Running Seeds](#running-seeds)
5. [Environment Modes](#environment-modes)
6. [Test Accounts](#test-accounts)
7. [Customization](#customization)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The seeding system provides:

- **Idempotent execution**: Seeds check for existing data before inserting
- **Environment-aware**: Different seeds for production vs staging
- **Ordered execution**: Seeds run in numbered order to handle dependencies
- **Transaction safety**: Each seed runs in a transaction with rollback on failure

### Architecture

```
src/database/seeds/
├── 01-feature-flags.seed.ts      # Feature flags for rollouts
├── 02-sla-configurations.seed.ts # Support/KYC SLA settings
├── 03-velocity-rules.seed.ts     # Transaction limits by tier
├── 04-admin-users.seed.ts        # Initial admin accounts
├── 05-system-settings.seed.ts    # App configuration
├── 06-demo-data.seed.ts          # Test users (staging only)
├── seed-runner.ts                # Main runner script
└── index.ts                      # Module exports
```

---

## Quick Start

### Prerequisites

1. PostgreSQL database running
2. Environment variables configured (see `.env.example`)
3. Migrations applied: `npm run migration:run`

### Commands

```bash
# Production deployment (no test data)
export SEED_ADMIN_PIN_SUPERADMIN='replace-with-6-digits'
export SEED_ADMIN_PIN_COMPLIANCE='replace-with-6-digits'
export SEED_ADMIN_PIN_SUPPORT='replace-with-6-digits'
export SEED_ADMIN_PIN_FINANCE='replace-with-6-digits'
npm run seed:prod

# Staging/Development (includes test data)
npm run seed:staging

# Add demo data only (to existing database)
npm run seed:demo
```

---

## Seed Files

### 01 - Feature Flags

Seeds all feature flags with production-ready defaults.

**Categories:**

- Core features (deposits, withdrawals, transfers)
- KYC features (verification, auto-approval)
- Security features (biometric, device binding, PIN)
- User experience (dark mode, notifications, QR codes)
- Business features (recurring transfers, savings, referrals)
- Compliance features (velocity limits, AML, fraud detection)
- Maintenance flags (maintenance mode, disable deposits/withdrawals)
- Beta features (experimental features with limited rollout)

**Key Flags:**
| Flag Key | Default | Description |
|----------|---------|-------------|
| `mobile_money_deposits` | ON | Deposits via Orange Money, MTN, Wave |
| `p2p_transfers` | ON | User-to-user USDC transfers |
| `biometric_auth` | ON | Face ID/fingerprint auth |
| `sanctions_screening` | ON | Real-time sanctions checks |
| `maintenance_mode` | OFF | Emergency maintenance mode |

---

### 02 - SLA Configurations

Seeds Service Level Agreement settings for support operations.

**Categories:**

- Support Tickets (critical/high/medium/low)
- KYC Review (blocked users, manual review, resubmission)
- Compliance Cases (sanctions hits, fraud alerts)
- Transaction Disputes
- Account Recovery
- Withdrawal Issues

**Example SLA:**
| Category | Priority | Response | Resolution | Escalation |
|----------|----------|----------|------------|------------|
| Support | Critical | 15 min | 60 min | 30 min |
| Support | High | 60 min | 4 hours | 2 hours |
| Support | Medium | 4 hours | 24 hours | 8 hours |
| Support | Low | 8 hours | 48 hours | 24 hours |

---

### 03 - Velocity Rules

Seeds transaction limits based on KYC tier. Amounts are in USDC with XOF context (1 USD ~ 600 XOF).

**Tier Limits:**

| Tier       | Daily  | Weekly | Monthly | Tx/Day |
| ---------- | ------ | ------ | ------- | ------ |
| Unverified | 50     | 100    | 200     | 3      |
| Basic      | 500    | 1,500  | 3,000   | 10     |
| Verified   | 2,000  | 7,000  | 20,000  | 50     |
| Premium    | 10,000 | 50,000 | 150,000 | 200    |

**Fraud Detection Rules:**

- Rapid transactions (>5 in 1 hour): FLAG
- Large single transaction: REQUIRE_REVIEW
- New account high activity: FLAG
- Roundtripping patterns: FLAG
- Night hours high volume: FLAG

---

### 04 - Admin Users

Seeds initial administrator accounts with roles and permissions.

**Roles:**
| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `super_admin` | Full system access | All permissions |
| `admin` | Standard admin | Most ops, no system config |
| `compliance_officer` | KYC/AML review | KYC, compliance, reports |
| `support_agent` | Customer support | Users (read), support tickets |
| `finance_admin` | Financial ops | Transactions, reports |
| `auditor` | Read-only audit | All read permissions |

**Default Admin Accounts:**
| Phone | Username | Role |
|-------|----------|------|
| +22500000001 | superadmin | super_admin |
| +22500000002 | compliance | compliance_officer |
| +22500000003 | support | support_agent |
| +22500000004 | finance | finance_admin |

> **Production safety**: `seed:prod` requires explicit 6-digit PINs in
> `SEED_ADMIN_PIN_SUPERADMIN`, `SEED_ADMIN_PIN_COMPLIANCE`,
> `SEED_ADMIN_PIN_SUPPORT`, and `SEED_ADMIN_PIN_FINANCE`. Non-production
> staging/demo seeds may use default test PINs; production never creates known
> default privileged credentials.

---

### 05 - System Settings

Seeds application configuration organized by category.

**Categories:**

- `app`: General app settings (version, maintenance, support)
- `provider`: Payment provider configurations (Yellow Card, Circle)
- `security`: PIN, session, OTP settings
- `notification`: Push, SMS, email settings
- `compliance`: Sanctions, AML settings
- `localization`: Language, currency, timezone
- `business`: Business hours, holidays
- `referral`: Referral program configuration

**Key Settings:**

```
app.maintenance_mode = false
security.pin.max_attempts = 5
security.pin.lockout_duration_minutes = 30
localization.default_language = fr
localization.default_currency = XOF
```

---

### 06 - Demo Data (Staging Only)

Seeds realistic test data with West African context.

**Test Users:**

- 20 randomly generated users with various KYC statuses
- 5 known test accounts (see below)
- Realistic West African names (Diallo, Touré, Konaté, etc.)
- Country distribution: Cote d'Ivoire, Senegal, Mali, Burkina Faso

**Generated per user:**

- Wallet with random balance (10-1000 USDC)
- 5-15 sample transactions (deposits, withdrawals, transfers)
- 2-7 beneficiaries (for verified users)

---

## Running Seeds

### Using npm scripts

```bash
# Production - Feature flags, SLAs, velocity rules, admin users, settings
npm run seed:prod

# Staging - Everything including demo data
npm run seed:staging

# Demo only - Just test users/transactions (for existing DB)
npm run seed:demo
```

### Using environment variable

```bash
SEED_MODE=production npm run seed:prod
SEED_MODE=staging npm run seed:staging
```

### Direct execution

```bash
ts-node -r tsconfig-paths/register src/database/seeds/seed-runner.ts --mode=production
```

---

## Environment Modes

| Mode         | Feature Flags | SLAs | Velocity | Admins | Settings | Demo Data |
| ------------ | ------------- | ---- | -------- | ------ | -------- | --------- |
| `production` | Yes           | Yes  | Yes      | Yes    | Yes      | No        |
| `staging`    | Yes           | Yes  | Yes      | Yes    | Yes      | Yes       |
| `demo`       | No            | No   | No       | No     | No       | Yes       |

### Safety Checks

- Demo data seed checks `NODE_ENV !== 'production'` before running
- Running `seed:demo` in production will be blocked
- Seeds are idempotent - running twice won't create duplicates

---

## Test Accounts

All test accounts use PIN: `000000`

| Phone        | Username        | KYC Status | Balance     | Use Case               |
| ------------ | --------------- | ---------- | ----------- | ---------------------- |
| +22507000001 | test_unverified | pending    | 50 USDC     | Test unverified limits |
| +22507000002 | test_basic      | approved   | 500 USDC    | Test basic tier        |
| +22507000003 | test_verified   | approved   | 2,000 USDC  | Test verified tier     |
| +22507000004 | test_premium    | approved   | 10,000 USDC | Test premium tier      |
| +22507000005 | test_rejected   | rejected   | 0 USDC      | Test rejected flow     |

---

## Customization

### Adding a New Seed

1. Create file with pattern `NN-name.seed.ts`:

```typescript
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export async function seedMyData(dataSource: DataSource): Promise<void> {
  console.log('Seeding my data...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Check if exists (idempotent)
    const existing = await queryRunner.query(
      `SELECT id FROM my_table WHERE key = $1`,
      ['my_key'],
    );

    if (existing.length === 0) {
      await queryRunner.query(
        `INSERT INTO my_table (id, key, value) VALUES ($1, $2, $3)`,
        [uuidv4(), 'my_key', 'my_value'],
      );
    }

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

export default seedMyData;
```

2. Register in `seed-runner.ts`:

```typescript
import { seedMyData } from './07-my-data.seed';

const seeds: SeedConfig[] = [
  // ... existing seeds
  {
    name: 'My Data',
    fn: seedMyData,
    environments: ['production', 'staging'],
  },
];
```

3. Export from `index.ts`:

```typescript
export { seedMyData } from './07-my-data.seed';
```

### Modifying Existing Seeds

Edit the data arrays in each seed file. The seed runner will:

- Skip records that already exist (by unique key)
- Create only new records
- Not update existing records

To update existing records, either:

1. Delete the record manually, then re-run seed
2. Create a migration instead of modifying the seed

---

## Troubleshooting

### Common Issues

**"relation does not exist"**

- Run migrations first: `npm run migration:run`

**"duplicate key value violates unique constraint"**

- Seeds are already applied; this is normal on re-run

**"permission denied for schema"**

- Ensure database user has CREATE SCHEMA permission

**"Cannot run demo seed in production"**

- This is a safety feature; demo data should never run in production

### Logs

Seeds output detailed logs:

```
============================================================
JoonaPay Database Seeder
Mode: STAGING
Environment: development
============================================================

Connecting to database...
Database connected.

Seeds to run: 6
------------------------------------------------------------

[1/6] Running: Feature Flags
----------------------------------------
Seeding feature flags...
  Created feature flag: mobile_money_deposits
  Created feature flag: p2p_transfers
  ...
Completed in 45ms

[2/6] Running: SLA Configurations
...
```

### Verification

After seeding, verify data:

```sql
-- Feature flags
SELECT key, is_enabled FROM system.feature_flags ORDER BY key;

-- SLA configurations
SELECT category, priority, response_time_minutes FROM system.sla_configurations;

-- Velocity rules
SELECT name, threshold_amount, applies_to_tier FROM compliance.velocity_rules;

-- Admin users
SELECT username, role FROM auth.users WHERE role != 'user';

-- Demo users (staging only)
SELECT username, kyc_status, phone FROM auth.users WHERE phone LIKE '+2250700%';
```

---

## Database Schemas

Seeds create data in these schemas:

| Schema       | Tables                                             | Purpose              |
| ------------ | -------------------------------------------------- | -------------------- |
| `system`     | feature_flags, sla_configurations, system_settings | System configuration |
| `compliance` | velocity_rules                                     | Compliance rules     |
| `auth`       | users, roles                                       | Authentication       |
| `wallet`     | beneficiaries                                      | Wallet data          |
| (public)     | wallets, transactions                              | Core data            |

---

## Maintenance

### Adding New Feature Flags

1. Add to `01-feature-flags.seed.ts`:

```typescript
{
  key: 'my_new_feature',
  name: 'My New Feature',
  description: 'Description of the feature',
  isEnabled: false,
  rolloutPercentage: 0,
  enabledCountries: [],
  platforms: ['ios', 'android'],
},
```

2. Run `npm run seed:staging` (skips existing, creates new)

### Updating Velocity Limits

1. Edit `03-velocity-rules.seed.ts`
2. Delete the rule from DB: `DELETE FROM compliance.velocity_rules WHERE name = 'Rule Name'`
3. Re-run seed: `npm run seed:prod`

Or create a migration for production updates.

---

## Related Documentation

- [Migrations Guide](../migrations/README.md)
- [Feature Flags Module](../../modules/feature-flag/README.md)
- [Compliance Module](../../modules/compliance/README.md)
- [API Documentation](../../../docs/API.md)
