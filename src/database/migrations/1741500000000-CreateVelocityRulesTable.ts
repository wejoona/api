import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVelocityRulesTable1741500000000 implements MigrationInterface {
  name = 'CreateVelocityRulesTable1741500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create rule_type enum
    await queryRunner.query(`
      CREATE TYPE "compliance"."velocity_rule_type_enum" AS ENUM (
        'daily_limit',
        'weekly_limit',
        'monthly_limit',
        'transaction_count',
        'velocity'
      )
    `);

    // Create action enum
    await queryRunner.query(`
      CREATE TYPE "compliance"."velocity_rule_action_enum" AS ENUM (
        'block',
        'flag',
        'require_review'
      )
    `);

    // Create velocity_rules table
    await queryRunner.query(`
      CREATE TABLE "compliance"."velocity_rules" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(200) NOT NULL,
        "description" text,
        "rule_type" "compliance"."velocity_rule_type_enum" NOT NULL,
        "threshold_amount" decimal(18,2),
        "threshold_count" integer,
        "time_window_hours" integer NOT NULL DEFAULT 24,
        "action" "compliance"."velocity_rule_action_enum" NOT NULL DEFAULT 'flag',
        "applies_to_tier" varchar(50)[] DEFAULT '{}',
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `);

    // Index for active rules lookup
    await queryRunner.query(`
      CREATE INDEX "IDX_velocity_rules_active"
      ON "compliance"."velocity_rules" ("is_active")
      WHERE "is_active" = true
    `);

    // Index for rule_type
    await queryRunner.query(`
      CREATE INDEX "IDX_velocity_rules_rule_type"
      ON "compliance"."velocity_rules" ("rule_type")
    `);

    // Composite index for tier and active rules
    await queryRunner.query(`
      CREATE INDEX "IDX_velocity_rules_tier_active"
      ON "compliance"."velocity_rules" USING GIN ("applies_to_tier")
      WHERE "is_active" = true
    `);

    // Seed initial velocity rules for West African compliance
    await queryRunner.query(`
      INSERT INTO "compliance"."velocity_rules"
        ("name", "description", "rule_type", "threshold_amount", "threshold_count", "time_window_hours", "action", "applies_to_tier", "is_active")
      VALUES
        (
          'Daily Transaction Limit - Unverified',
          'Maximum daily transaction amount for unverified users (100,000 XOF equivalent)',
          'daily_limit',
          150.00,
          NULL,
          24,
          'block',
          ARRAY['unverified'],
          true
        ),
        (
          'Daily Transaction Limit - Basic KYC',
          'Maximum daily transaction amount for basic KYC users (500,000 XOF equivalent)',
          'daily_limit',
          750.00,
          NULL,
          24,
          'block',
          ARRAY['basic'],
          true
        ),
        (
          'Daily Transaction Limit - Full KYC',
          'Maximum daily transaction amount for fully verified users (2,000,000 XOF equivalent)',
          'daily_limit',
          3000.00,
          NULL,
          24,
          'block',
          ARRAY['verified', 'premium'],
          true
        ),
        (
          'Weekly Transaction Limit - Unverified',
          'Maximum weekly transaction amount for unverified users (300,000 XOF equivalent)',
          'weekly_limit',
          450.00,
          NULL,
          168,
          'block',
          ARRAY['unverified'],
          true
        ),
        (
          'Weekly Transaction Limit - Basic KYC',
          'Maximum weekly transaction amount for basic KYC users (2,000,000 XOF equivalent)',
          'weekly_limit',
          3000.00,
          NULL,
          168,
          'block',
          ARRAY['basic'],
          true
        ),
        (
          'Monthly Transaction Limit - Unverified',
          'Maximum monthly transaction amount for unverified users (500,000 XOF equivalent)',
          'monthly_limit',
          750.00,
          NULL,
          720,
          'block',
          ARRAY['unverified'],
          true
        ),
        (
          'High Frequency Transaction Alert',
          'Flag accounts with more than 10 transactions in 1 hour (smurfing detection)',
          'transaction_count',
          NULL,
          10,
          1,
          'flag',
          ARRAY['unverified', 'basic', 'verified', 'premium'],
          true
        ),
        (
          'Velocity Spike Detection',
          'Flag accounts with rapid transaction velocity exceeding 1000 USDC in 30 minutes',
          'velocity',
          1000.00,
          5,
          0.5,
          'require_review',
          ARRAY['unverified', 'basic', 'verified', 'premium'],
          true
        ),
        (
          'Large Transaction Reporting Threshold',
          'Flag transactions approaching BCEAO reporting threshold (1M XOF equivalent)',
          'velocity',
          1500.00,
          NULL,
          24,
          'flag',
          ARRAY['unverified', 'basic', 'verified', 'premium'],
          true
        ),
        (
          'Daily Transaction Count - Unverified',
          'Maximum number of transactions per day for unverified users',
          'transaction_count',
          NULL,
          5,
          24,
          'block',
          ARRAY['unverified'],
          true
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "compliance"."velocity_rules"`);
    await queryRunner.query(
      `DROP TYPE "compliance"."velocity_rule_action_enum"`,
    );
    await queryRunner.query(`DROP TYPE "compliance"."velocity_rule_type_enum"`);
  }
}
