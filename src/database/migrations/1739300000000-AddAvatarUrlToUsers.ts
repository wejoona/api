import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarUrlToUsers1739300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE auth.users
      ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512) DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE auth.users
      DROP COLUMN IF EXISTS avatar_url
    `);
  }
}
