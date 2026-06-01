import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProfilePreferenceFields1745100000000 implements MigrationInterface {
  name = 'AddUserProfilePreferenceFields1745100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "auth"."users"
      ADD COLUMN IF NOT EXISTS "preferred_locale" VARCHAR(5) NOT NULL DEFAULT 'fr'
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "auth"."users"
      ADD COLUMN IF NOT EXISTS "avatar_thumb" TEXT
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "public"."users"
      ADD COLUMN IF NOT EXISTS "preferred_locale" VARCHAR(5) NOT NULL DEFAULT 'fr'
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "public"."users"
      ADD COLUMN IF NOT EXISTS "avatar_thumb" TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "auth"."users"
      DROP COLUMN IF EXISTS "avatar_thumb"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "auth"."users"
      DROP COLUMN IF EXISTS "preferred_locale"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "public"."users"
      DROP COLUMN IF EXISTS "avatar_thumb"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "public"."users"
      DROP COLUMN IF EXISTS "preferred_locale"
    `);
  }
}
