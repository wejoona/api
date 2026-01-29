import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApiKeysTable1742000000000 implements MigrationInterface {
  name = 'CreateApiKeysTable1742000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create api_keys table in system schema
    await queryRunner.query(`
      CREATE TABLE "system"."api_keys" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "key_hash" varchar(255) NOT NULL,
        "key_prefix" varchar(8) NOT NULL,
        "permissions" jsonb NOT NULL DEFAULT '[]',
        "rate_limit" integer NOT NULL DEFAULT 60,
        "user_id" uuid,
        "is_active" boolean NOT NULL DEFAULT true,
        "expires_at" timestamp,
        "last_used_at" timestamp,
        "usage_count" integer NOT NULL DEFAULT 0,
        "ip_whitelist" varchar(45)[] DEFAULT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),

        CONSTRAINT "CHK_api_keys_rate_limit" CHECK (rate_limit > 0 AND rate_limit <= 10000),
        CONSTRAINT "FK_api_keys_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL
      )
    `);

    // Index for key_hash lookups (primary authentication)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_api_keys_key_hash"
      ON "system"."api_keys" ("key_hash")
    `);

    // Index for key_prefix lookups (for key identification without full hash)
    await queryRunner.query(`
      CREATE INDEX "IDX_api_keys_key_prefix"
      ON "system"."api_keys" ("key_prefix")
    `);

    // Index for user_id lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_api_keys_user_id"
      ON "system"."api_keys" ("user_id")
      WHERE "user_id" IS NOT NULL
    `);

    // Index for active keys lookup
    await queryRunner.query(`
      CREATE INDEX "IDX_api_keys_active"
      ON "system"."api_keys" ("is_active")
      WHERE "is_active" = true
    `);

    // Composite index for active, non-expired keys validation
    await queryRunner.query(`
      CREATE INDEX "IDX_api_keys_validation"
      ON "system"."api_keys" ("key_hash", "is_active", "expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "system"."api_keys"`);
  }
}
