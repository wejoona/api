# JoonaPay USDC Wallet - Database Migrations

This document lists all database migrations in execution order, detailing what each migration creates or modifies and its dependencies.

## Migration Execution Order

Migrations are executed in timestamp order (ascending). The timestamp prefix determines execution order.

---

## Main Migrations (`src/database/migrations/`)

### 1. 1700000000000-CreateBatchJobsTable.ts

**Creates:** `batch_jobs` table

**Purpose:** Batch job processing for bulk operations (KYC, notifications, reports, exports)

**Tables/Columns:**
- `batch_jobs` - Stores batch job metadata
  - id, type, name, description, status, priority
  - user_id, organization_id, payload, config, metrics
  - scheduled_at, started_at, completed_at
  - error_message, error_details, retry_count, max_retries
  - results, result_file_url, created_at, updated_at, created_by

**Indexes:**
- IDX_batch_jobs_type, IDX_batch_jobs_status, IDX_batch_jobs_user_id
- IDX_batch_jobs_organization_id, IDX_batch_jobs_user_status
- IDX_batch_jobs_org_status, IDX_batch_jobs_type_status
- IDX_batch_jobs_scheduled_at, IDX_batch_jobs_created_at

**Dependencies:** None

---

### 2. 1737215000000-InitialSchema.ts

**Creates:** Core tables - `users`, `wallets`, `transactions`

**Purpose:** Foundation tables for user management and wallet functionality

**Tables:**
- `users` - User accounts with phone verification, KYC status
- `wallets` - User wallets with YellowCard integration
- `transactions` - Transaction records

**Indexes:**
- IDX_users_phone
- IDX_wallets_user_id, IDX_wallets_yellow_card_wallet_id
- IDX_transactions_wallet_id, IDX_transactions_yellow_card_ref
- IDX_transactions_status, IDX_transactions_type, IDX_transactions_created_at

**Dependencies:** None (uuid-ossp extension)

---

### 3. 1737300000000-AddCircleFieldsAndNewTables.ts

**Creates/Modifies:** Circle integration fields, ledger system, transfers, notifications

**Purpose:** Add Circle Programmable Wallets integration and double-entry ledger

**Tables Created:**
- `ledger_accounts` - Account-based ledger for USDC tracking
- `ledger_transactions` - Ledger transaction records
- `ledger_entries` - Individual debit/credit entries
- `transfers` - Transfer records between wallets
- `device_tokens` - Push notification device tokens
- `notifications` - User notifications

**Columns Added:**
- `users.circle_user_id`, `users.circle_user_token`
- `wallets.circle_wallet_id`, `wallets.circle_wallet_address`

**Enum Types:**
- ledger_account_type_enum, ledger_account_category_enum
- ledger_transaction_type_enum, ledger_transaction_status_enum
- ledger_entry_type_enum, transfer_type_enum, transfer_status_enum
- device_platform_enum, notification_type_enum, notification_status_enum

**Dependencies:** 1737215000000-InitialSchema

---

### 4. 1737400000000-AddLowBalanceNotificationType.ts

**Modifies:** `notification_type_enum`

**Purpose:** Add low_balance notification type for balance alerts

**Changes:** Adds 'low_balance' to notification_type_enum

**Dependencies:** 1737300000000-AddCircleFieldsAndNewTables

---

### 5. 1737500000000-CreateReferralTables.ts

**Creates:** Referral system tables

**Purpose:** User referral program with rewards

**Tables:**
- `referrals` - Individual referral records
- `referral_stats` - User referral statistics and codes

**Enum Types:** referral_status_enum

**Dependencies:** 1737215000000-InitialSchema (users)

---

### 6. 1737600000000-AddAdminFieldsAndAuditLog.ts

**Creates/Modifies:** Admin functionality and audit logging

**Purpose:** User roles, status management, and audit trail

**Columns Added to `users`:**
- role, status, suspended_at, suspended_reason

**Tables Created:**
- `audit_logs` - Audit trail for sensitive operations
- `system_metrics` - Dashboard statistics
- `scheduled_jobs` - Job run tracking

**Dependencies:** 1737215000000-InitialSchema

---

### 7. 1737700000000-AddUserPinHash.ts

**Modifies:** `users` table

**Purpose:** PIN authentication support

**Columns Added:**
- pin_hash, pin_set_at, pin_attempts, pin_locked_until

**Dependencies:** 1737215000000-InitialSchema

---

### 8. 1737800000000-CreateBlacklistedDevicesTable.ts

**Creates:** `blacklisted_devices` table

**Purpose:** Device security - block fraudulent devices

**Columns:**
- id, device_fingerprint, identifier_type, reason
- blacklisted_by, associated_user_id, is_active
- expires_at, blocked_attempts, last_blocked_at, metadata

**Dependencies:** 1737215000000-InitialSchema

---

### 9. 1737900000000-AddWalletVersionColumn.ts

**Modifies:** `wallets` table

**Purpose:** Optimistic locking for concurrent updates

**Columns Added:** version (integer, default 1)

**Dependencies:** 1737215000000-InitialSchema

---

### 10. 1738000000000-AddUserUsername.ts

**Modifies:** `users` table

**Purpose:** Username-based transfers

**Columns Added:** username (unique, max 30 chars)

**Dependencies:** 1737215000000-InitialSchema

---

### 11. 1738000000001-CreateBillPaymentsTables.ts

**Creates:** Bill payment system

**Purpose:** Utility bill payments (electricity, water, airtime)

**Tables:**
- `bill_providers` - Bill payment providers (CIE, SODECI, Orange, MTN, etc.)
- `bill_payments` - Individual bill payment records

**Seed Data:** West African providers (Ivory Coast, Senegal, Mali, Burkina Faso)

**Dependencies:** 1737215000000-InitialSchema (wallets)

---

### 12. 1738100000000-CreateContactsTable.ts

**Creates:** `contacts` table

**Purpose:** User contact management for quick transfers

**Columns:**
- id, user_id, contact_user_id, name, phone
- wallet_address, username, is_favorite
- transaction_count, last_transaction_at

**Dependencies:** 1737215000000-InitialSchema (users)

---

### 13. 1738200000000-CreateWhitelistedAddressesTable.ts

**Creates:** `whitelisted_addresses` table

**Purpose:** Security - whitelist external wallet addresses

**Columns:**
- id, user_id, address, label, address_type
- network, status, verified_at, last_used_at, usage_count

**Dependencies:** 1737215000000-InitialSchema (users)

---

### 14. 1738300000000-AddSecurityNotificationTypes.ts

**Modifies:** `notification_type_enum`

**Purpose:** Security alert notifications

**Values Added:**
- withdrawal_pending, new_device_login, large_transaction
- address_whitelisted, security_alert, price_alert, weekly_summary

**Dependencies:** 1737300000000-AddCircleFieldsAndNewTables

---

### 15. 1738400000000-CreateWebhookDeadlettersTable.ts

**Creates:** `webhook_deadletters` table

**Purpose:** Failed webhook storage for retry/analysis

**Columns:**
- id, provider, event_type, webhook_id, payload
- error_message, error_stack, status, retry_count
- last_retry_at, resolved_at, resolved_by, resolution_notes

**Dependencies:** None

---

### 16. 1738500000000-AddCompositeIndexesForPerformance.ts

**Modifies:** Transaction/transfer/notification indexes

**Purpose:** Performance optimization for common queries

**Changes:**
- Replaces single-column indexes with composite indexes
- idx_transactions_wallet_date, idx_transfers_sender_date
- idx_notifications_user_status

**Dependencies:** 1737215000000-InitialSchema, 1737300000000-AddCircleFieldsAndNewTables

---

### 17. 1738600000000-CreateNotificationPreferencesTable.ts

**Creates:** `notification_preferences` table

**Purpose:** User notification settings

**Columns:**
- Push settings: push_enabled, push_transactions, push_security, push_marketing
- Email settings: email_enabled, email_transactions, email_monthly_statement, email_marketing
- SMS settings: sms_enabled, sms_transactions, sms_security
- Thresholds: large_transaction_threshold, low_balance_threshold

**Dependencies:** 1737215000000-InitialSchema (users)

---

### 18. 1738700000000-CreateFcmTokensTable.ts

**Creates:** `fcm_tokens` table

**Purpose:** Firebase Cloud Messaging token management

**Columns:**
- id, user_id, token, device_id, device_name, platform
- is_active, app_version, os_version, last_used_at
- failure_count, last_failure_reason

**Enum Types:** fcm_platform_enum

**Dependencies:** 1737215000000-InitialSchema (users)

---

### 19. 1738800000000-AddNotificationTypes.ts

**Modifies:** `notification_type_enum`

**Purpose:** Additional notification types

**Values Added:** transfer_complete, deposit_complete, withdrawal_complete, kyc_update

**Dependencies:** 1737300000000-AddCircleFieldsAndNewTables

---

### 20. 1738900000000-CreateKycVerificationsTable.ts

**Creates:** KYC verification and sub-accounts tables

**Purpose:** KYC document storage and verification tracking

**Tables:**
- `kyc_verifications` - KYC verification records
- `sub_accounts` - User sub-accounts (future use)

**Dependencies:** 1737215000000-InitialSchema (users, wallets)

---

### 21. 1738950000000-CreateMonitoringTables.ts

**Creates:** Transaction monitoring system

**Purpose:** Real-time alerts and monitoring rules

**Tables:**
- `transaction_alerts` - Alert records for users
- `user_alert_preferences` - User alert settings
- `monitoring_rules` - System monitoring rules

**Dependencies:** 1737215000000-InitialSchema (users)

---

### 22. 1738960000000-CreateLinkedBankAccountsTable.ts

**Creates:** Bank linking tables (wallet schema)

**Purpose:** Link external bank accounts for deposits/withdrawals

**Tables:**
- `wallet.linked_bank_accounts` - User's linked bank accounts
- `wallet.banks` - Supported banks reference table

**Seed Data:** West African banks (NSIA, Ecobank, Societe Generale, BOA)

**Dependencies:** 1737215000000-InitialSchema (wallets)

---

### 23. 1739000000000-CreateMerchantTables.ts

**Creates:** Merchant payment system

**Purpose:** QR code payments for merchants

**Tables:**
- `merchants` - Merchant profiles
- `payment_requests` - Merchant payment requests
- `merchant_payments` - Completed merchant payments

**Enum Types:**
- merchant_category_enum, merchant_status_enum
- payment_request_status_enum, merchant_payment_status_enum

**Dependencies:** 1737215000000-InitialSchema (users, wallets)

---

### 24. 1740000000000-SeparateSchemas.ts

**Modifies:** Database schema organization

**Purpose:** Organize tables into PostgreSQL schemas by domain

**Schemas Created:**
- `auth` - Users, KYC, blacklisted devices
- `wallet` - Wallets, transactions, transfers, whitelisted addresses
- `merchant` - Merchants, payment requests, merchant payments
- `payments` - Bill providers, bill payments
- `compliance` - Monitoring rules, alerts, reports
- `notifications` - Notifications, device tokens, FCM tokens, preferences
- `referral` - Referrals, referral stats
- `social` - Contacts
- `system` - Audit logs, metrics, jobs, webhooks, sub-accounts

**Dependencies:** All previous migrations

---

### 25. 1741000000000-CreateVerificationsTable.ts

**Creates:** `auth.verifications` table

**Purpose:** OTP/verification code management

**Columns:**
- id, user_id, identifier, identifier_type, type
- code_hash, attempts, max_attempts, status
- ip_address, user_agent, device_fingerprint
- metadata, expires_at, verified_at

**Enum Types:** verification_identifier_type, verification_type, verification_status

**Dependencies:** 1740000000000-SeparateSchemas (auth.users)

---

### 26. 1741100000000-CreateDevicesTable.ts

**Creates:** `auth.devices` table

**Purpose:** Device tracking and trust management

**Columns:**
- id, user_id, device_identifier, brand, model
- os, os_version, app_version, platform, fcm_token
- is_trusted, trusted_at, is_active, last_login_at
- last_ip_address, login_count, metadata

**Enum Types:** device_platform

**Dependencies:** 1740000000000-SeparateSchemas (auth.users)

---

### 27. 1741200000000-CreateBeneficiariesTable.ts

**Creates:** `wallet.beneficiaries` table

**Purpose:** Saved payment recipients

**Columns:**
- id, wallet_id, name, phone_e164, account_type
- beneficiary_user_id, beneficiary_wallet_address
- bank_code, bank_account_number, mobile_money_provider
- is_favorite, is_verified, transfer_count, total_transferred

**Enum Types:** beneficiary_account_type

**Dependencies:** 1740000000000-SeparateSchemas (wallet.wallets, auth.users)

---

### 28. 1741300000000-CreateSessionsTable.ts

**Creates:** `auth.sessions` table

**Purpose:** Session management with refresh tokens

**Columns:**
- id, user_id, device_id, refresh_token_hash
- ip_address, user_agent, location, is_active
- last_activity_at, expires_at, revoked_at, revoked_reason

**Dependencies:** 1741100000000-CreateDevicesTable (auth.devices)

---

### 29. 1741400000000-CreateFeatureFlagsTable.ts

**Creates:** `system.feature_flags` table

**Purpose:** Feature flag management for gradual rollouts

**Columns:**
- id, key, name, description, is_enabled
- rollout_percentage, enabled_user_ids, disabled_user_ids
- enabled_countries, min_app_version, platforms
- starts_at, ends_at, metadata

**Seed Data:** Initial feature flags (two_factor_auth, external_transfers, bill_payments, etc.)

**Dependencies:** 1740000000000-SeparateSchemas

---

### 30. 1741500000000-CreateVelocityRulesTable.ts

**Creates:** `compliance.velocity_rules` table

**Purpose:** Transaction velocity limits and fraud detection

**Columns:**
- id, name, description, rule_type
- threshold_amount, threshold_count, time_window_hours
- action, applies_to_tier, is_active

**Enum Types:** velocity_rule_type_enum, velocity_rule_action_enum

**Seed Data:** West African compliance rules (daily/weekly/monthly limits by KYC tier)

**Dependencies:** 1740000000000-SeparateSchemas

---

### 31. 1741600000000-CreateSupportTicketsTable.ts

**Creates:** `system.support_tickets` table

**Purpose:** Customer support ticket system

**Columns:**
- id, user_id, subject, category, priority
- status, assigned_to, created_at, updated_at, resolved_at

**Enum Types:** ticket_category, ticket_priority, ticket_status

**Dependencies:** 1740000000000-SeparateSchemas (auth.users)

---

### 32. 1741600000001-CreateTicketMessagesTable.ts

**Creates:** `system.ticket_messages` table

**Purpose:** Support ticket conversation threads

**Columns:**
- id, ticket_id, sender_type, sender_id
- message, attachments, created_at

**Enum Types:** message_sender_type

**Dependencies:** 1741600000000-CreateSupportTicketsTable

---

### 33. 1741700000000-CreateSavingsPotsTable.ts

**Creates:** `wallet.savings_pots` table

**Purpose:** Goal-based savings feature

**Columns:**
- id, wallet_id, name, target_amount, current_amount
- currency, target_date, is_locked, lock_until
- auto_deposit_amount, auto_deposit_frequency, status

**Enum Types:** savings_pot_status, auto_deposit_frequency

**Dependencies:** 1740000000000-SeparateSchemas (wallet.wallets)

---

### 34. 1741800000000-EnhanceKycVerifications.ts

**Modifies:** `kyc_verifications` table

**Purpose:** Enhanced KYC document management

**Columns Added:**
- document_front_url, document_back_url, selfie_url
- video_url, address_proof_url, additional_docs
- ocr_data, face_match_score, liveness_score
- reviewed_by, reviewed_at, review_notes

**Dependencies:** 1738900000000-CreateKycVerificationsTable

---

### 35. 1741900000000-CreateWatchlistTables.ts

**Creates:** Sanctions/PEP screening tables

**Purpose:** AML compliance - watchlist screening

**Tables:**
- `compliance.watchlist_entries` - Sanctions/PEP entries
- `compliance.watchlist_matches` - User matches against watchlist

**Enum Types:** watchlist_list_type_enum, watchlist_match_status_enum, watchlist_match_type_enum

**Seed Data:** Sample entries for testing (inactive)

**Dependencies:** 1740000000000-SeparateSchemas

---

### 36. 1742000000000-CreateApiKeysTable.ts

**Creates:** `system.api_keys` table

**Purpose:** API key management for integrations

**Columns:**
- id, name, key_hash, key_prefix, permissions
- rate_limit, user_id, is_active, expires_at
- last_used_at, usage_count, ip_whitelist

**Dependencies:** 1740000000000-SeparateSchemas (auth.users)

---

### 37. 1742100000000-CreateFraudRingDetectionsTable.ts

**Creates:** `compliance.fraud_ring_detections` table

**Purpose:** Fraud ring detection and investigation

**Columns:**
- id, detection_type, linked_user_ids, linked_wallet_ids
- detection_score, indicators, status, assigned_to
- notes, evidence, resolved_at

**Enum Types:** fraud_ring_detection_type_enum, fraud_ring_detection_status_enum

**Dependencies:** 1740000000000-SeparateSchemas

---

### 38. 1742200000000-CreateComplianceCasesTables.ts

**Creates:** Compliance case management system

**Purpose:** Fraud/AML case tracking and investigation

**Tables:**
- `compliance.cases` - Main case records
- `compliance.case_notes` - Case notes/comments
- `compliance.case_evidence` - Evidence attachments

**Enum Types:** case_type, case_status, case_priority, evidence_type

**Functions:** generate_case_number() - Auto-generate case numbers

**Dependencies:** 1740000000000-SeparateSchemas (auth.users)

---

### 39. 1742300000000-CreateDataRetentionTables.ts

**Creates:** Data retention and GDPR compliance

**Purpose:** Data lifecycle management and right to erasure

**Tables:**
- `system.retention_policies` - Data retention rules
- `system.data_deletion_requests` - GDPR deletion requests
- `system.data_retention_logs` - Retention job logs

**Columns Added:**
- `auth.sessions.deleted_at` - Soft delete support
- `auth.verifications.deleted_at` - Soft delete support
- `webhook_deadletters.deleted_at` - Soft delete support

**Seed Data:** Default retention policies (sessions, verification codes, audit logs, KYC documents)

**Dependencies:** 1740000000000-SeparateSchemas, 1741000000000, 1741300000000

---

### 40. 1743000000000-CreateSlaConfigurationsTable.ts

**Creates:** `system.sla_configurations` table

**Purpose:** SLA management for support and operations

**Columns:**
- id, name, category, priority
- response_time_minutes, resolution_time_minutes
- escalation_after_minutes, is_active, business_hours_only

**Seed Data:** SLA configurations for support, KYC, transactions, withdrawals, deposits, security, etc.

**Dependencies:** 1740000000000-SeparateSchemas

---

### 41. 1744000000000-CreateRecurringTransfersTable.ts

**Creates:** Recurring transfers system (wallet schema)

**Purpose:** Scheduled recurring payments

**Tables:**
- `wallet.recurring_transfers` - Recurring transfer definitions
- `wallet.recurring_transfer_history` - Execution history

**Columns (recurring_transfers):**
- id, wallet_id, recipient_phone, recipient_name, amount
- currency, frequency, start_date, end_date
- next_execution_date, occurrences_total, occurrences_remaining
- status, note, day_of_week, day_of_month, executed_count

**Dependencies:** 1740000000000-SeparateSchemas (wallet.wallets)

---

### 42. 1744100000000-AddSavingsPotsFields.ts

**Modifies:** `wallet.savings_pots` table

**Purpose:** Visual customization for savings pots

**Columns Added:**
- emoji - Emoji icon for pot display
- color - Color value (32-bit integer, Flutter Color.value format)

**Dependencies:** 1741700000000-CreateSavingsPotsTable

---

## Module-Specific Migrations

### Cards Module (`src/modules/cards/infrastructure/migrations/`)

#### CreateCardsTable1706900000000

**Creates:** `cards` table

**Purpose:** Virtual/physical card management

**Columns:**
- id, user_id, wallet_id, card_number, cvv
- expiry_month, expiry_year, cardholder_name
- card_type, status, spending_limit, spent_amount
- currency, frozen_at, created_at, updated_at

**Dependencies:** users, wallets tables (InitialSchema)

---

### Bulk Payments Module (`src/modules/bulk-payments/infrastructure/migrations/`)

#### CreateBulkPaymentsTables1738200000000

**Creates:** Bulk payment processing tables

**Purpose:** CSV upload bulk payments

**Tables:**
- `bulk_payments` - Batch records
- `bulk_payment_items` - Individual payment items

**Triggers:** Automatic updated_at triggers

**Dependencies:** wallets table (InitialSchema)

---

### Business Module (`src/modules/business/infrastructure/migrations/`)

#### CreateBusinessesTable1706700000000

**Creates:** `businesses` table

**Purpose:** Business account management

**Columns:**
- id, user_id, name, registration_number, industry
- address, city, country, phone, email
- status, verified_at, created_at, updated_at

**Triggers:** Automatic updated_at trigger

**Dependencies:** users table (InitialSchema)

---

### Sub-Business Module (`src/modules/sub-business/infrastructure/migrations/`)

#### CreateSubBusinessesTable1706700100000

**Creates:** `sub_businesses` table

**Purpose:** Departments/branches within businesses

**Columns:**
- id, business_id, wallet_id, name, description
- type, permissions (JSONB), spending_limit, status

**Triggers:** Automatic updated_at trigger

**Dependencies:** businesses table, wallets table

---

## Migration Dependency Graph

```
InitialSchema (1737215000000)
    |
    +-- AddCircleFieldsAndNewTables (1737300000000)
    |       |
    |       +-- AddLowBalanceNotificationType (1737400000000)
    |       +-- AddSecurityNotificationTypes (1738300000000)
    |       +-- AddNotificationTypes (1738800000000)
    |       +-- AddCompositeIndexesForPerformance (1738500000000)
    |
    +-- CreateReferralTables (1737500000000)
    +-- AddAdminFieldsAndAuditLog (1737600000000)
    +-- AddUserPinHash (1737700000000)
    +-- CreateBlacklistedDevicesTable (1737800000000)
    +-- AddWalletVersionColumn (1737900000000)
    +-- AddUserUsername (1738000000000)
    +-- CreateBillPaymentsTables (1738000000001)
    +-- CreateContactsTable (1738100000000)
    +-- CreateWhitelistedAddressesTable (1738200000000)
    +-- CreateNotificationPreferencesTable (1738600000000)
    +-- CreateFcmTokensTable (1738700000000)
    +-- CreateKycVerificationsTable (1738900000000)
    |       |
    |       +-- EnhanceKycVerifications (1741800000000)
    |
    +-- CreateMonitoringTables (1738950000000)
    +-- CreateLinkedBankAccountsTable (1738960000000)
    +-- CreateMerchantTables (1739000000000)
    |
    +-- SeparateSchemas (1740000000000)
            |
            +-- CreateVerificationsTable (1741000000000)
            +-- CreateDevicesTable (1741100000000)
            |       |
            |       +-- CreateSessionsTable (1741300000000)
            |
            +-- CreateBeneficiariesTable (1741200000000)
            +-- CreateFeatureFlagsTable (1741400000000)
            +-- CreateVelocityRulesTable (1741500000000)
            +-- CreateSupportTicketsTable (1741600000000)
            |       |
            |       +-- CreateTicketMessagesTable (1741600000001)
            |
            +-- CreateSavingsPotsTable (1741700000000)
            |       |
            |       +-- AddSavingsPotsFields (1744100000000)
            |
            +-- CreateWatchlistTables (1741900000000)
            +-- CreateApiKeysTable (1742000000000)
            +-- CreateFraudRingDetectionsTable (1742100000000)
            +-- CreateComplianceCasesTables (1742200000000)
            +-- CreateDataRetentionTables (1742300000000)
            +-- CreateSlaConfigurationsTable (1743000000000)
            +-- CreateRecurringTransfersTable (1744000000000)
```

---

## Schema Overview After All Migrations

### auth schema
- users
- kyc_verifications
- blacklisted_devices
- verifications
- devices
- sessions

### wallet schema
- wallets
- transactions
- transfers
- whitelisted_addresses
- beneficiaries
- savings_pots
- recurring_transfers
- recurring_transfer_history
- linked_bank_accounts
- banks

### merchant schema
- merchants
- payment_requests
- merchant_payments

### payments schema
- bill_providers
- bill_payments

### compliance schema
- monitoring_rules
- transaction_alerts
- user_alert_preferences
- velocity_rules
- watchlist_entries
- watchlist_matches
- fraud_ring_detections
- cases
- case_notes
- case_evidence

### notifications schema
- notifications
- device_tokens
- fcm_tokens
- notification_preferences

### referral schema
- referrals
- referral_stats

### social schema
- contacts

### system schema
- audit_logs
- system_metrics
- scheduled_jobs
- webhook_deadletters
- sub_accounts
- feature_flags
- support_tickets
- ticket_messages
- api_keys
- retention_policies
- data_deletion_requests
- data_retention_logs
- sla_configurations
- batch_jobs

### public schema (module-specific, not moved)
- cards
- bulk_payments
- bulk_payment_items
- businesses
- sub_businesses
- ledger_accounts
- ledger_transactions
- ledger_entries

---

## Running Migrations

```bash
# Run all pending migrations
cd usdc-wallet && npm run migration:run

# Generate a new migration
cd usdc-wallet && npm run migration:generate -- -n MigrationName

# Revert the last migration
cd usdc-wallet && npm run migration:revert

# Show migration status
cd usdc-wallet && npm run migration:show
```

---

## Notes

1. **Timestamp Ordering**: Migrations run in timestamp order. Ensure new migrations have timestamps greater than existing ones.

2. **Schema Dependencies**: After migration 1740000000000, tables are organized into schemas. New migrations must use schema-qualified table names (e.g., `auth.users`).

3. **Rollback Safety**: Most migrations include proper `down()` methods for rollback. Enum value additions cannot be rolled back without recreating the type.

4. **Module Migrations**: Module-specific migrations should be registered in the TypeORM configuration to run alongside main migrations.

5. **Seed Data**: Several migrations include seed data (bill providers, banks, SLA configs, feature flags, velocity rules). These are idempotent but review before production deployment.
