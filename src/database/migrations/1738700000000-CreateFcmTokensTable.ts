import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create FCM Tokens Table
 *
 * Creates the fcm_tokens table for storing Firebase Cloud Messaging device tokens.
 * Used for push notification delivery.
 *
 * Features:
 * - Unique token constraint (each FCM token is unique)
 * - Composite index on (user_id, is_active) for efficient active token lookup
 * - Failure tracking for token health management
 * - Platform and device metadata for analytics
 */
export class CreateFcmTokensTable1738700000000 implements MigrationInterface {
  name = 'CreateFcmTokensTable1738700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create platform enum type
    await queryRunner.query(`
      CREATE TYPE "fcm_platform_enum" AS ENUM('ios', 'android', 'web')
    `);

    // Create fcm_tokens table
    await queryRunner.query(`
      CREATE TABLE "fcm_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token" varchar(500) NOT NULL,
        "device_id" varchar(255),
        "device_name" varchar(255),
        "platform" "fcm_platform_enum" NOT NULL DEFAULT 'android',
        "is_active" boolean NOT NULL DEFAULT true,
        "app_version" varchar(50),
        "os_version" varchar(50),
        "last_used_at" timestamp,
        "failure_count" integer NOT NULL DEFAULT 0,
        "last_failure_reason" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fcm_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_fcm_tokens_token" UNIQUE ("token")
      )
    `);

    // Create indexes
    // Index for user lookup
    await queryRunner.query(`
      CREATE INDEX "IDX_fcm_tokens_user_id" ON "fcm_tokens" ("user_id")
    `);

    // Composite index for active tokens by user (most common query)
    await queryRunner.query(`
      CREATE INDEX "IDX_fcm_tokens_user_active" ON "fcm_tokens" ("user_id", "is_active")
      WHERE "is_active" = true
    `);

    // Index for token lookup
    await queryRunner.query(`
      CREATE INDEX "IDX_fcm_tokens_token" ON "fcm_tokens" ("token")
    `);

    // Index for cleanup job (inactive tokens older than X days)
    await queryRunner.query(`
      CREATE INDEX "IDX_fcm_tokens_cleanup" ON "fcm_tokens" ("is_active", "updated_at")
      WHERE "is_active" = false
    `);

    // Add foreign key constraint to users table
    await queryRunner.query(`
      ALTER TABLE "fcm_tokens"
      ADD CONSTRAINT "FK_fcm_tokens_user"
      FOREIGN KEY ("user_id")
      REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    // Add comment for documentation
    await queryRunner.query(`
      COMMENT ON TABLE "fcm_tokens" IS 'Stores FCM device tokens for push notifications'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.query(`
      ALTER TABLE "fcm_tokens" DROP CONSTRAINT "FK_fcm_tokens_user"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_fcm_tokens_cleanup"`);
    await queryRunner.query(`DROP INDEX "IDX_fcm_tokens_token"`);
    await queryRunner.query(`DROP INDEX "IDX_fcm_tokens_user_active"`);
    await queryRunner.query(`DROP INDEX "IDX_fcm_tokens_user_id"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "fcm_tokens"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE "fcm_platform_enum"`);
  }
}
