import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureDeviceTokenUserTokenIndex1745900000000 implements MigrationInterface {
  name = 'EnsureDeviceTokenUserTokenIndex1745900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_device_tokens_user_token"
      ON "device_tokens" ("user_id", "token")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_device_tokens_user_token"
    `);
  }
}
