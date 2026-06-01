import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationFields1745000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS auth.users
      ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(6),
      ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS public.users
      ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(6),
      ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS auth.users
      DROP COLUMN IF EXISTS email_verification_code,
      DROP COLUMN IF EXISTS email_verification_token,
      DROP COLUMN IF EXISTS email_verification_expires_at,
      DROP COLUMN IF EXISTS email_verified
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS public.users
      DROP COLUMN IF EXISTS email_verification_code,
      DROP COLUMN IF EXISTS email_verification_token,
      DROP COLUMN IF EXISTS email_verification_expires_at,
      DROP COLUMN IF EXISTS email_verified
    `);
  }
}
