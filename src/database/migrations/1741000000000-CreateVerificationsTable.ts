import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVerificationsTable1741000000000 implements MigrationInterface {
  name = 'CreateVerificationsTable1741000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "auth"."verification_identifier_type" AS ENUM ('phone', 'email')
    `);

    await queryRunner.query(`
      CREATE TYPE "auth"."verification_type" AS ENUM (
        'registration',
        'login',
        'pin_reset',
        'phone_change',
        'sensitive_action',
        'two_factor'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "auth"."verification_status" AS ENUM (
        'pending',
        'verified',
        'expired',
        'failed'
      )
    `);

    // Create verifications table
    await queryRunner.query(`
      CREATE TABLE "auth"."verifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "identifier" varchar(100) NOT NULL,
        "identifier_type" "auth"."verification_identifier_type" DEFAULT 'phone',
        "type" "auth"."verification_type" NOT NULL,
        "code_hash" varchar(255) NOT NULL,
        "attempts" integer DEFAULT 0,
        "max_attempts" integer DEFAULT 3,
        "status" "auth"."verification_status" DEFAULT 'pending',
        "ip_address" varchar(45),
        "user_agent" text,
        "device_fingerprint" varchar(255),
        "metadata" jsonb,
        "expires_at" timestamp NOT NULL,
        "verified_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "FK_verifications_user" FOREIGN KEY ("user_id")
          REFERENCES "auth"."users"("id") ON DELETE SET NULL
      )
    `);

    // Create partial index for active pending verifications
    await queryRunner.query(`
      CREATE INDEX "IDX_verifications_identifier_type"
      ON "auth"."verifications" ("identifier", "type")
      WHERE "status" = 'pending'
    `);

    // Create index for cleanup queries
    await queryRunner.query(`
      CREATE INDEX "IDX_verifications_status_expires"
      ON "auth"."verifications" ("status", "expires_at")
    `);

    // Create index for user lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_verifications_user_id"
      ON "auth"."verifications" ("user_id")
      WHERE "user_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth"."verifications"`);
    await queryRunner.query(`DROP TYPE "auth"."verification_status"`);
    await queryRunner.query(`DROP TYPE "auth"."verification_type"`);
    await queryRunner.query(`DROP TYPE "auth"."verification_identifier_type"`);
  }
}
