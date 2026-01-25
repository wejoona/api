import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKycVerificationsTable1738900000000 implements MigrationInterface {
  name = 'CreateKycVerificationsTable1738900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create kyc_verifications table
    await queryRunner.query(`
      CREATE TABLE "kyc_verifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "status" varchar(30) NOT NULL DEFAULT 'documents_pending',

        "first_name" varchar(100),
        "last_name" varchar(100),
        "date_of_birth" varchar(10),
        "country" varchar(3),

        "id_type" varchar(20),
        "id_number" varchar(50),
        "id_expiry_date" varchar(10),

        "id_front_key" varchar(500),
        "id_back_key" varchar(500),
        "selfie_key" varchar(500),

        "auto_verification_provider" varchar(50),
        "auto_verification_id" varchar(100),
        "auto_verification_score" decimal(5,2),
        "auto_verification_result" jsonb,
        "auto_verified_at" TIMESTAMP,

        "manual_reviewed_by" uuid,
        "manual_review_notes" text,
        "manual_reviewed_at" TIMESTAMP,

        "approved_at" TIMESTAMP,
        "rejection_reason" text,
        "submitted_at" TIMESTAMP,

        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),

        CONSTRAINT "PK_kyc_verifications" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_kyc_verifications_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_kyc_verifications_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for kyc_verifications
    await queryRunner.query(
      `CREATE INDEX "IDX_kyc_verifications_status" ON "kyc_verifications" ("status")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_kyc_verifications_submitted_at" ON "kyc_verifications" ("submitted_at")`,
    );

    // Create sub_accounts table (prepared for future use)
    await queryRunner.query(`
      CREATE TABLE "sub_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "parent_user_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "type" varchar(20) NOT NULL DEFAULT 'other',
        "wallet_id" uuid,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),

        CONSTRAINT "PK_sub_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sub_accounts_wallet_id" UNIQUE ("wallet_id"),
        CONSTRAINT "FK_sub_accounts_parent_user" FOREIGN KEY ("parent_user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sub_accounts_wallet" FOREIGN KEY ("wallet_id")
          REFERENCES "wallets"("id") ON DELETE SET NULL
      )
    `);

    // Create indexes for sub_accounts
    await queryRunner.query(
      `CREATE INDEX "IDX_sub_accounts_parent_user" ON "sub_accounts" ("parent_user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sub_accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kyc_verifications"`);
  }
}
