"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCircleFieldsAndNewTables1737300000000 = void 0;
class AddCircleFieldsAndNewTables1737300000000 {
    constructor() {
        this.name = 'AddCircleFieldsAndNewTables1737300000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "circle_user_id" VARCHAR(100) UNIQUE,
      ADD COLUMN IF NOT EXISTS "circle_user_token" TEXT
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_circle_user_id" ON "users" ("circle_user_id")
    `);
        await queryRunner.query(`
      ALTER TABLE "wallets"
      ADD COLUMN IF NOT EXISTS "circle_wallet_id" VARCHAR(100) UNIQUE,
      ADD COLUMN IF NOT EXISTS "circle_wallet_address" VARCHAR(255)
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_wallets_circle_wallet_id" ON "wallets" ("circle_wallet_id")
    `);
        await queryRunner.query(`
      ALTER TABLE "wallets" ALTER COLUMN "currency" SET DEFAULT 'USDC'
    `);
        await queryRunner.query(`
      CREATE TYPE "ledger_account_type_enum" AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense')
    `);
        await queryRunner.query(`
      CREATE TYPE "ledger_account_category_enum" AS ENUM (
        'user_wallet', 'operating', 'fee_revenue', 'suspense',
        'circle_mirror', 'yellowcard_pending', 'system'
      )
    `);
        await queryRunner.query(`
      CREATE TABLE "ledger_accounts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "type" "ledger_account_type_enum" NOT NULL,
        "category" "ledger_account_category_enum" NOT NULL,
        "currency" VARCHAR(10) NOT NULL DEFAULT 'USDC',
        "balance" BIGINT NOT NULL DEFAULT 0,
        "user_id" UUID,
        "wallet_id" UUID,
        "is_system" BOOLEAN NOT NULL DEFAULT FALSE,
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_ledger_accounts_code" ON "ledger_accounts" ("code");
      CREATE INDEX "IDX_ledger_accounts_user_id" ON "ledger_accounts" ("user_id");
      CREATE INDEX "IDX_ledger_accounts_wallet_id" ON "ledger_accounts" ("wallet_id");
      CREATE INDEX "IDX_ledger_accounts_type_category" ON "ledger_accounts" ("type", "category");
    `);
        await queryRunner.query(`
      CREATE TYPE "ledger_transaction_type_enum" AS ENUM (
        'deposit', 'withdrawal', 'transfer', 'fee_collection',
        'adjustment', 'reversal', 'circle_sync', 'yellowcard_settle'
      )
    `);
        await queryRunner.query(`
      CREATE TYPE "ledger_transaction_status_enum" AS ENUM (
        'pending', 'processing', 'completed', 'failed', 'reversed'
      )
    `);
        await queryRunner.query(`
      CREATE TABLE "ledger_transactions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "type" "ledger_transaction_type_enum" NOT NULL,
        "status" "ledger_transaction_status_enum" NOT NULL,
        "reference" VARCHAR(50) NOT NULL UNIQUE,
        "description" VARCHAR(500) NOT NULL,
        "external_id" VARCHAR(255),
        "external_provider" VARCHAR(50),
        "initiator_user_id" UUID,
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMP
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_ledger_transactions_reference" ON "ledger_transactions" ("reference");
      CREATE INDEX "IDX_ledger_transactions_external" ON "ledger_transactions" ("external_id", "external_provider");
      CREATE INDEX "IDX_ledger_transactions_initiator" ON "ledger_transactions" ("initiator_user_id");
      CREATE INDEX "IDX_ledger_transactions_type_status" ON "ledger_transactions" ("type", "status");
      CREATE INDEX "IDX_ledger_transactions_created" ON "ledger_transactions" ("created_at");
    `);
        await queryRunner.query(`
      CREATE TYPE "ledger_entry_type_enum" AS ENUM ('debit', 'credit')
    `);
        await queryRunner.query(`
      CREATE TABLE "ledger_entries" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "transaction_id" UUID NOT NULL REFERENCES "ledger_transactions"("id") ON DELETE CASCADE,
        "account_id" UUID NOT NULL REFERENCES "ledger_accounts"("id"),
        "entry_type" "ledger_entry_type_enum" NOT NULL,
        "amount" BIGINT NOT NULL,
        "currency" VARCHAR(10) NOT NULL DEFAULT 'USDC',
        "balance_after" BIGINT NOT NULL,
        "description" VARCHAR(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_ledger_entries_transaction" ON "ledger_entries" ("transaction_id");
      CREATE INDEX "IDX_ledger_entries_account" ON "ledger_entries" ("account_id");
      CREATE INDEX "IDX_ledger_entries_type" ON "ledger_entries" ("entry_type");
    `);
        await queryRunner.query(`
      CREATE TYPE "transfer_type_enum" AS ENUM ('internal', 'external')
    `);
        await queryRunner.query(`
      CREATE TYPE "transfer_status_enum" AS ENUM (
        'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'
      )
    `);
        await queryRunner.query(`
      CREATE TABLE "transfers" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "reference" VARCHAR(50) NOT NULL UNIQUE,
        "type" "transfer_type_enum" NOT NULL,
        "status" "transfer_status_enum" NOT NULL DEFAULT 'pending',
        "sender_id" UUID NOT NULL,
        "sender_wallet_id" UUID NOT NULL,
        "sender_phone" VARCHAR(20),
        "recipient_id" UUID,
        "recipient_wallet_id" UUID,
        "recipient_phone" VARCHAR(20),
        "recipient_address" VARCHAR(255),
        "recipient_blockchain" VARCHAR(20),
        "amount" BIGINT NOT NULL,
        "fee" BIGINT NOT NULL DEFAULT 0,
        "currency" VARCHAR(10) NOT NULL DEFAULT 'USDC',
        "note" VARCHAR(500),
        "provider_transfer_id" VARCHAR(255),
        "provider_name" VARCHAR(50),
        "ledger_transaction_id" UUID,
        "tx_hash" VARCHAR(255),
        "error_message" VARCHAR(500),
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMP
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_transfers_reference" ON "transfers" ("reference");
      CREATE INDEX "IDX_transfers_sender" ON "transfers" ("sender_id");
      CREATE INDEX "IDX_transfers_recipient" ON "transfers" ("recipient_id");
      CREATE INDEX "IDX_transfers_recipient_phone" ON "transfers" ("recipient_phone");
      CREATE INDEX "IDX_transfers_type_status" ON "transfers" ("type", "status");
      CREATE INDEX "IDX_transfers_provider" ON "transfers" ("provider_transfer_id");
      CREATE INDEX "IDX_transfers_created" ON "transfers" ("created_at");
    `);
        await queryRunner.query(`
      CREATE TYPE "device_platform_enum" AS ENUM ('ios', 'android', 'web')
    `);
        await queryRunner.query(`
      CREATE TABLE "device_tokens" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL,
        "token" VARCHAR(500) NOT NULL,
        "platform" "device_platform_enum" NOT NULL,
        "device_id" VARCHAR(255),
        "device_name" VARCHAR(255),
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "last_used_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_device_tokens_user" ON "device_tokens" ("user_id");
      CREATE INDEX "IDX_device_tokens_token" ON "device_tokens" ("token");
      CREATE UNIQUE INDEX "IDX_device_tokens_user_token" ON "device_tokens" ("user_id", "token");
    `);
        await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM (
        'transfer_received', 'transfer_sent', 'transfer_failed',
        'deposit_completed', 'deposit_failed',
        'withdrawal_completed', 'withdrawal_failed',
        'kyc_approved', 'kyc_rejected',
        'system', 'promotional'
      )
    `);
        await queryRunner.query(`
      CREATE TYPE "notification_status_enum" AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed')
    `);
        await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL,
        "type" "notification_type_enum" NOT NULL,
        "status" "notification_status_enum" NOT NULL DEFAULT 'pending',
        "title" VARCHAR(255) NOT NULL,
        "body" TEXT NOT NULL,
        "data" JSONB DEFAULT '{}',
        "reference_type" VARCHAR(50),
        "reference_id" UUID,
        "sent_at" TIMESTAMP,
        "delivered_at" TIMESTAMP,
        "read_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user" ON "notifications" ("user_id");
      CREATE INDEX "IDX_notifications_user_status" ON "notifications" ("user_id", "status");
      CREATE INDEX "IDX_notifications_type" ON "notifications" ("type");
      CREATE INDEX "IDX_notifications_reference" ON "notifications" ("reference_type", "reference_id");
      CREATE INDEX "IDX_notifications_created" ON "notifications" ("created_at" DESC);
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "device_tokens"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "transfers"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ledger_entries"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ledger_transactions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ledger_accounts"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "notification_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "device_platform_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "transfer_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "transfer_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "ledger_entry_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "ledger_transaction_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "ledger_transaction_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "ledger_account_category_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "ledger_account_type_enum"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallets_circle_wallet_id"`);
        await queryRunner.query(`
      ALTER TABLE "wallets"
      DROP COLUMN IF EXISTS "circle_wallet_id",
      DROP COLUMN IF EXISTS "circle_wallet_address"
    `);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_circle_user_id"`);
        await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "circle_user_id",
      DROP COLUMN IF EXISTS "circle_user_token"
    `);
    }
}
exports.AddCircleFieldsAndNewTables1737300000000 = AddCircleFieldsAndNewTables1737300000000;
//# sourceMappingURL=1737300000000-AddCircleFieldsAndNewTables.js.map