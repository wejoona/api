import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarThumbToUsers1739400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS avatar_thumb TEXT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE auth.users DROP COLUMN IF EXISTS avatar_thumb;
    `);
  }
}
