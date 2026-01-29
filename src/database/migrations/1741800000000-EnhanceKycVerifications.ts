import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceKycVerifications1741800000000 implements MigrationInterface {
  name = 'EnhanceKycVerifications1741800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add document storage URLs
    await queryRunner.query(`
      ALTER TABLE "kyc_verifications"
      ADD COLUMN "document_front_url" varchar(500),
      ADD COLUMN "document_back_url" varchar(500),
      ADD COLUMN "selfie_url" varchar(500),
      ADD COLUMN "video_url" varchar(500),
      ADD COLUMN "address_proof_url" varchar(500),
      ADD COLUMN "additional_docs" jsonb
    `);

    // Add OCR and verification scores
    await queryRunner.query(`
      ALTER TABLE "kyc_verifications"
      ADD COLUMN "ocr_data" jsonb,
      ADD COLUMN "face_match_score" decimal(5,2),
      ADD COLUMN "liveness_score" decimal(5,2)
    `);

    // Add review fields (renamed from manual_ prefix for consistency)
    await queryRunner.query(`
      ALTER TABLE "kyc_verifications"
      ADD COLUMN "reviewed_by" uuid,
      ADD COLUMN "reviewed_at" TIMESTAMP,
      ADD COLUMN "review_notes" text
    `);

    // Add foreign key for reviewed_by referencing users table
    await queryRunner.query(`
      ALTER TABLE "kyc_verifications"
      ADD CONSTRAINT "FK_kyc_verifications_reviewed_by"
      FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    // Add index for reviewed_by for efficient admin queries
    await queryRunner.query(`
      CREATE INDEX "IDX_kyc_verifications_reviewed_by" ON "kyc_verifications" ("reviewed_by")
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON COLUMN "kyc_verifications"."ocr_data" IS 'Extracted data from documents via OCR: {firstName, lastName, dateOfBirth, documentNumber, expiryDate, address, etc}'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "kyc_verifications"."additional_docs" IS 'Array of additional document objects: [{type, url, uploadedAt, status}]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.query(`
      ALTER TABLE "kyc_verifications"
      DROP CONSTRAINT IF EXISTS "FK_kyc_verifications_reviewed_by"
    `);

    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_kyc_verifications_reviewed_by"
    `);

    // Drop all new columns
    await queryRunner.query(`
      ALTER TABLE "kyc_verifications"
      DROP COLUMN IF EXISTS "document_front_url",
      DROP COLUMN IF EXISTS "document_back_url",
      DROP COLUMN IF EXISTS "selfie_url",
      DROP COLUMN IF EXISTS "video_url",
      DROP COLUMN IF EXISTS "address_proof_url",
      DROP COLUMN IF EXISTS "additional_docs",
      DROP COLUMN IF EXISTS "ocr_data",
      DROP COLUMN IF EXISTS "face_match_score",
      DROP COLUMN IF EXISTS "liveness_score",
      DROP COLUMN IF EXISTS "reviewed_by",
      DROP COLUMN IF EXISTS "reviewed_at",
      DROP COLUMN IF EXISTS "review_notes"
    `);
  }
}
