import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBeneficiariesTable1741200000000
  implements MigrationInterface
{
  name = 'CreateBeneficiariesTable1741200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create account type enum
    await queryRunner.query(`
      CREATE TYPE "wallet"."beneficiary_account_type" AS ENUM (
        'joonapay_user',
        'external_wallet',
        'bank_account',
        'mobile_money'
      )
    `);

    // Create beneficiaries table
    await queryRunner.query(`
      CREATE TABLE "wallet"."beneficiaries" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "wallet_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "phone_e164" varchar(20),
        "account_type" "wallet"."beneficiary_account_type" DEFAULT 'joonapay_user',
        "beneficiary_user_id" uuid,
        "beneficiary_wallet_address" varchar(100),
        "bank_code" varchar(20),
        "bank_account_number" varchar(50),
        "mobile_money_provider" varchar(50),
        "is_favorite" boolean DEFAULT false,
        "is_verified" boolean DEFAULT false,
        "transfer_count" integer DEFAULT 0,
        "total_transferred" decimal(18,6) DEFAULT 0,
        "last_transfer_at" timestamp,
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "UQ_beneficiaries_wallet_phone" UNIQUE ("wallet_id", "phone_e164"),
        CONSTRAINT "FK_beneficiaries_wallet" FOREIGN KEY ("wallet_id")
          REFERENCES "wallet"."wallets"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_beneficiaries_user" FOREIGN KEY ("beneficiary_user_id")
          REFERENCES "auth"."users"("id") ON DELETE SET NULL
      )
    `);

    // Index for wallet lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_beneficiaries_wallet_id"
      ON "wallet"."beneficiaries" ("wallet_id")
    `);

    // Index for favorites (commonly queried)
    await queryRunner.query(`
      CREATE INDEX "IDX_beneficiaries_wallet_favorite"
      ON "wallet"."beneficiaries" ("wallet_id", "is_favorite")
      WHERE "is_favorite" = true
    `);

    // Index for beneficiary user lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_beneficiaries_beneficiary_user"
      ON "wallet"."beneficiaries" ("beneficiary_user_id")
      WHERE "beneficiary_user_id" IS NOT NULL
    `);

    // Index for phone lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_beneficiaries_phone"
      ON "wallet"."beneficiaries" ("phone_e164")
      WHERE "phone_e164" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "wallet"."beneficiaries"`);
    await queryRunner.query(`DROP TYPE "wallet"."beneficiary_account_type"`);
  }
}
