import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPhoneHash1745200000000 implements MigrationInterface {
  name = 'AddUserPhoneHash1745200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "auth"."users"
      ADD COLUMN IF NOT EXISTS "phone_hash" VARCHAR(64)
    `);

    await queryRunner.query(`
      UPDATE "auth"."users"
      SET "phone_hash" = encode(digest("phone", 'sha256'), 'hex')
      WHERE "phone_hash" IS NULL AND "phone" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_phone_hash"
      ON "auth"."users" ("phone_hash")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "auth"."IDX_users_phone_hash"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "auth"."users"
      DROP COLUMN IF EXISTS "phone_hash"
    `);
  }
}
