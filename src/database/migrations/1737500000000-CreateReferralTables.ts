import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create referral system tables
 *
 * Creates:
 * 1. referrals - Individual referral records
 * 2. referral_stats - User referral statistics and codes
 */
export class CreateReferralTables1737500000000 implements MigrationInterface {
  name = 'CreateReferralTables1737500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create referral_status enum
    await queryRunner.query(`
      CREATE TYPE "referral_status_enum" AS ENUM ('pending', 'completed', 'expired', 'rewarded')
    `);

    // Create referrals table
    await queryRunner.query(`
      CREATE TABLE "referrals" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "referrer_id" UUID NOT NULL,
        "referred_id" UUID,
        "referral_code" VARCHAR(20) NOT NULL,
        "status" "referral_status_enum" NOT NULL DEFAULT 'pending',
        "referrer_reward" BIGINT NOT NULL DEFAULT 0,
        "referred_reward" BIGINT NOT NULL DEFAULT 0,
        "reward_currency" VARCHAR(10) NOT NULL DEFAULT 'USDC',
        "rewarded_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        "expires_at" TIMESTAMP,
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_referrals_referrer_id" ON "referrals" ("referrer_id");
      CREATE INDEX "IDX_referrals_referred_id" ON "referrals" ("referred_id");
      CREATE INDEX "IDX_referrals_code" ON "referrals" ("referral_code");
      CREATE INDEX "IDX_referrals_status" ON "referrals" ("status");
    `);

    // Create referral_stats table
    await queryRunner.query(`
      CREATE TABLE "referral_stats" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL UNIQUE,
        "referral_code" VARCHAR(20) NOT NULL UNIQUE,
        "total_referrals" INT NOT NULL DEFAULT 0,
        "completed_referrals" INT NOT NULL DEFAULT 0,
        "pending_referrals" INT NOT NULL DEFAULT 0,
        "total_earnings" BIGINT NOT NULL DEFAULT 0,
        "pending_earnings" BIGINT NOT NULL DEFAULT 0,
        "earnings_currency" VARCHAR(10) NOT NULL DEFAULT 'USDC',
        "tier" VARCHAR(20) NOT NULL DEFAULT 'bronze',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_referral_stats_user_id" ON "referral_stats" ("user_id");
      CREATE INDEX "IDX_referral_stats_code" ON "referral_stats" ("referral_code");
      CREATE INDEX "IDX_referral_stats_tier" ON "referral_stats" ("tier");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_stats"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "referrals"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "referral_status_enum"`);
  }
}
