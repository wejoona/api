import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBlnkAndStellarToWallets1739100000000
  implements MigrationInterface
{
  name = 'AddBlnkAndStellarToWallets1739100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "blnk_balance_id" varchar(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "stellar_address" varchar(255)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallets_blnk_balance_id" ON "wallets" ("blnk_balance_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_wallets_blnk_balance_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP COLUMN IF EXISTS "stellar_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP COLUMN IF EXISTS "blnk_balance_id"`,
    );
  }
}
