import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSavingsPotsTable1741700000000 implements MigrationInterface {
  name = 'CreateSavingsPotsTable1741700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "wallet"."savings_pot_status" AS ENUM ('active', 'completed', 'cancelled')
    `);

    await queryRunner.query(`
      CREATE TYPE "wallet"."auto_deposit_frequency" AS ENUM ('daily', 'weekly', 'monthly')
    `);

    // Create savings_pots table
    await queryRunner.query(`
      CREATE TABLE "wallet"."savings_pots" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "wallet_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "target_amount" decimal(18,6) NOT NULL CHECK (target_amount > 0),
        "current_amount" decimal(18,6) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
        "currency" varchar(10) NOT NULL DEFAULT 'USDC',
        "target_date" timestamp,
        "is_locked" boolean NOT NULL DEFAULT false,
        "lock_until" timestamp,
        "auto_deposit_amount" decimal(18,6) CHECK (auto_deposit_amount IS NULL OR auto_deposit_amount > 0),
        "auto_deposit_frequency" "wallet"."auto_deposit_frequency",
        "status" "wallet"."savings_pot_status" NOT NULL DEFAULT 'active',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "completed_at" timestamp,
        CONSTRAINT "FK_savings_pots_wallet" FOREIGN KEY ("wallet_id")
          REFERENCES "wallet"."wallets"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_savings_pots_wallet_id"
      ON "wallet"."savings_pots" ("wallet_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_savings_pots_status"
      ON "wallet"."savings_pots" ("status")
      WHERE "status" = 'active'
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_savings_pots_auto_deposit"
      ON "wallet"."savings_pots" ("auto_deposit_frequency")
      WHERE "auto_deposit_frequency" IS NOT NULL AND "status" = 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "wallet"."savings_pots"`);
    await queryRunner.query(`DROP TYPE "wallet"."auto_deposit_frequency"`);
    await queryRunner.query(`DROP TYPE "wallet"."savings_pot_status"`);
  }
}
