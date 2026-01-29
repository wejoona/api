import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeatureFlagsTable1741400000000 implements MigrationInterface {
  name = 'CreateFeatureFlagsTable1741400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create feature_flags table
    await queryRunner.query(`
      CREATE TABLE "system"."feature_flags" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "key" varchar(100) NOT NULL UNIQUE,
        "name" varchar(200) NOT NULL,
        "description" text,
        "is_enabled" boolean DEFAULT false,
        "rollout_percentage" integer DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
        "enabled_user_ids" uuid[] DEFAULT '{}',
        "disabled_user_ids" uuid[] DEFAULT '{}',
        "enabled_countries" varchar(3)[] DEFAULT '{}',
        "min_app_version" varchar(20),
        "platforms" varchar(20)[] DEFAULT '{}',
        "starts_at" timestamp,
        "ends_at" timestamp,
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `);

    // Index for key lookups
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_feature_flags_key"
      ON "system"."feature_flags" ("key")
    `);

    // Index for enabled flags
    await queryRunner.query(`
      CREATE INDEX "IDX_feature_flags_enabled"
      ON "system"."feature_flags" ("is_enabled")
      WHERE "is_enabled" = true
    `);

    // Seed initial feature flags
    await queryRunner.query(`
      INSERT INTO "system"."feature_flags" ("key", "name", "description", "is_enabled", "rollout_percentage")
      VALUES
        ('two_factor_auth', 'Two-Factor Authentication', 'Enable two-factor authentication for sensitive actions', false, 0),
        ('external_transfers', 'External Wallet Transfers', 'Allow transfers to external crypto wallets', true, 100),
        ('bill_payments', 'Bill Payments', 'Enable bill payment functionality', true, 100),
        ('savings_pots', 'Savings Pots', 'Enable savings pots feature for goal-based saving', false, 0),
        ('biometric_auth', 'Biometric Authentication', 'Enable fingerprint/face authentication', true, 100),
        ('mobile_money_withdrawals', 'Mobile Money Withdrawals', 'Enable withdrawals to mobile money', true, 100),
        ('referral_program', 'Referral Program', 'Enable user referral system', true, 100),
        ('merchant_payments', 'Merchant Payments', 'Enable merchant QR code payments', true, 100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "system"."feature_flags"`);
  }
}
