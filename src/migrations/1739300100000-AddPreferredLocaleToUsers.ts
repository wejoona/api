import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPreferredLocaleToUsers1739300100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_locale" VARCHAR(5) NOT NULL DEFAULT 'fr'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "preferred_locale"
    `);
  }
}
