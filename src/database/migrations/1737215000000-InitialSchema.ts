import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1737215000000 implements MigrationInterface {
  name = 'InitialSchema1737215000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "phone" varchar(20) NOT NULL,
        "phone_verified" boolean NOT NULL DEFAULT false,
        "first_name" varchar(100),
        "last_name" varchar(100),
        "email" varchar(255),
        "country_code" varchar(5) NOT NULL DEFAULT 'CI',
        "kyc_status" varchar(20) NOT NULL DEFAULT 'pending',
        "kyc_provider_id" varchar(100),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_phone" UNIQUE ("phone"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    // Create index on phone
    await queryRunner.query(
      `CREATE INDEX "IDX_users_phone" ON "users" ("phone")`,
    );

    // Create wallets table
    await queryRunner.query(`
      CREATE TABLE "wallets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "yellow_card_wallet_id" varchar(100),
        "currency" varchar(10) NOT NULL DEFAULT 'USD',
        "balance" decimal(18,6) NOT NULL DEFAULT 0,
        "kyc_status" varchar(20) NOT NULL DEFAULT 'none',
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_wallets_yellow_card_wallet_id" UNIQUE ("yellow_card_wallet_id"),
        CONSTRAINT "FK_wallets_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes on wallets
    await queryRunner.query(
      `CREATE INDEX "IDX_wallets_user_id" ON "wallets" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_wallets_yellow_card_wallet_id" ON "wallets" ("yellow_card_wallet_id")`,
    );

    // Create transactions table
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "wallet_id" uuid NOT NULL,
        "type" varchar(30) NOT NULL,
        "amount" decimal(18,6) NOT NULL,
        "currency" varchar(10) NOT NULL DEFAULT 'USD',
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "yellow_card_ref" varchar(100),
        "recipient_address" varchar(255),
        "recipient_phone" varchar(20),
        "recipient_wallet_id" uuid,
        "metadata" jsonb,
        "failure_reason" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMP,
        CONSTRAINT "PK_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transactions_wallet" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes on transactions
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_wallet_id" ON "transactions" ("wallet_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_yellow_card_ref" ON "transactions" ("yellow_card_ref")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_status" ON "transactions" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_type" ON "transactions" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_created_at" ON "transactions" ("created_at" DESC)`,
    );

    // Enable uuid extension if not exists
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
