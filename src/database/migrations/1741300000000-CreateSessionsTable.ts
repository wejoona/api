import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessionsTable1741300000000 implements MigrationInterface {
  name = 'CreateSessionsTable1741300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create sessions table
    await queryRunner.query(`
      CREATE TABLE "auth"."sessions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "device_id" uuid,
        "refresh_token_hash" varchar(255) NOT NULL,
        "ip_address" varchar(45),
        "user_agent" text,
        "location" varchar(100),
        "is_active" boolean DEFAULT true,
        "last_activity_at" timestamp DEFAULT now(),
        "expires_at" timestamp NOT NULL,
        "revoked_at" timestamp,
        "revoked_reason" varchar(100),
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "FK_sessions_user" FOREIGN KEY ("user_id")
          REFERENCES "auth"."users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sessions_device" FOREIGN KEY ("device_id")
          REFERENCES "auth"."devices"("id") ON DELETE SET NULL
      )
    `);

    // Index for refresh token lookups (used in token validation)
    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_refresh_token_hash"
      ON "auth"."sessions" ("refresh_token_hash")
    `);

    // Index for user's active sessions
    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_user_active"
      ON "auth"."sessions" ("user_id", "is_active")
      WHERE "is_active" = true
    `);

    // Index for user lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_user_id"
      ON "auth"."sessions" ("user_id")
    `);

    // Index for cleanup of expired sessions
    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_expires_at"
      ON "auth"."sessions" ("expires_at")
      WHERE "is_active" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth"."sessions"`);
  }
}
