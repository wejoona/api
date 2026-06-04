import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceTokenRuntimeFields1745700000000 implements MigrationInterface {
  name = 'AddDeviceTokenRuntimeFields1745700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "device_tokens"
      ADD COLUMN IF NOT EXISTS "app_version" VARCHAR(50)
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "device_tokens"
      ADD COLUMN IF NOT EXISTS "os_version" VARCHAR(50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "device_tokens"
      DROP COLUMN IF EXISTS "os_version"
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "device_tokens"
      DROP COLUMN IF EXISTS "app_version"
    `);
  }
}
