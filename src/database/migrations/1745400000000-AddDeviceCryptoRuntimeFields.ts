import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceCryptoRuntimeFields1745400000000
  implements MigrationInterface
{
  name = 'AddDeviceCryptoRuntimeFields1745400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "auth"."devices"
      ADD COLUMN IF NOT EXISTS "public_key_jwk" jsonb,
      ADD COLUMN IF NOT EXISTS "device_name" varchar(255),
      ADD COLUMN IF NOT EXISTS "metadata" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "auth"."devices"
      DROP COLUMN IF EXISTS "metadata",
      DROP COLUMN IF EXISTS "device_name",
      DROP COLUMN IF EXISTS "public_key_jwk"
    `);
  }
}
