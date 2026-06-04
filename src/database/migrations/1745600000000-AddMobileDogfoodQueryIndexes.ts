import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMobileDogfoodQueryIndexes1745600000000 implements MigrationInterface {
  name = 'AddMobileDogfoodQueryIndexes1745600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_transactions_created_at"
      ON "transactions" ("created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_transactions_wallet_created_at"
      ON "transactions" ("wallet_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_user_status_created_at"
      ON "notifications" ("user_id", "status", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_notifications_user_status_created_at";
      DROP INDEX IF EXISTS "IDX_transactions_wallet_created_at";
      DROP INDEX IF EXISTS "IDX_transactions_created_at";
    `);
  }
}
