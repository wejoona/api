import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceKycVerifications1741800000000 implements MigrationInterface {
  name = 'EnhanceKycVerifications1741800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const kycTable = await this.resolveTable(queryRunner, 'kyc_verifications', [
      'auth',
      'public',
    ]);
    const usersTable = await this.resolveTable(queryRunner, 'users', [
      'auth',
      'public',
    ]);
    const kycIndex = `${kycTable.schemaPrefix}"kyc_verifications"`;
    const usersReference = `${usersTable.schemaPrefix}"users"`;

    // Add document storage URLs
    await queryRunner.query(`
      ALTER TABLE ${kycIndex}
      ADD COLUMN "document_front_url" varchar(500),
      ADD COLUMN "document_back_url" varchar(500),
      ADD COLUMN "selfie_url" varchar(500),
      ADD COLUMN "video_url" varchar(500),
      ADD COLUMN "address_proof_url" varchar(500),
      ADD COLUMN "additional_docs" jsonb
    `);

    // Add OCR and verification scores
    await queryRunner.query(`
      ALTER TABLE ${kycIndex}
      ADD COLUMN "ocr_data" jsonb,
      ADD COLUMN "face_match_score" decimal(5,2),
      ADD COLUMN "liveness_score" decimal(5,2)
    `);

    // Add review fields (renamed from manual_ prefix for consistency)
    await queryRunner.query(`
      ALTER TABLE ${kycIndex}
      ADD COLUMN "reviewed_by" uuid,
      ADD COLUMN "reviewed_at" TIMESTAMP,
      ADD COLUMN "review_notes" text
    `);

    // Add foreign key for reviewed_by referencing users table
    await queryRunner.query(`
      ALTER TABLE ${kycIndex}
      ADD CONSTRAINT "FK_kyc_verifications_reviewed_by"
      FOREIGN KEY ("reviewed_by") REFERENCES ${usersReference}("id") ON DELETE SET NULL
    `);

    // Add index for reviewed_by for efficient admin queries
    await queryRunner.query(`
      CREATE INDEX "IDX_kyc_verifications_reviewed_by" ON ${kycIndex} ("reviewed_by")
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON COLUMN ${kycIndex}."ocr_data" IS 'Extracted data from documents via OCR: {firstName, lastName, dateOfBirth, documentNumber, expiryDate, address, etc}'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN ${kycIndex}."additional_docs" IS 'Array of additional document objects: [{type, url, uploadedAt, status}]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const kycTable = await this.resolveTable(queryRunner, 'kyc_verifications', [
      'auth',
      'public',
    ]);
    const kycIndex = `${kycTable.schemaPrefix}"kyc_verifications"`;

    // Drop foreign key
    await queryRunner.query(`
      ALTER TABLE ${kycIndex}
      DROP CONSTRAINT IF EXISTS "FK_kyc_verifications_reviewed_by"
    `);

    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_kyc_verifications_reviewed_by"
    `);

    // Drop all new columns
    await queryRunner.query(`
      ALTER TABLE ${kycIndex}
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

  private async resolveTable(
    queryRunner: QueryRunner,
    tableName: string,
    schemas: string[],
  ): Promise<{ schema: string; schemaPrefix: string }> {
    const quotedSchemas = schemas.map((schema) => `'${schema}'`).join(', ');
    const result = await queryRunner.query(`
      SELECT table_schema
      FROM information_schema.tables
      WHERE table_name = '${tableName}'
        AND table_schema IN (${quotedSchemas})
      ORDER BY CASE table_schema
        ${schemas
          .map((schema, index) => `WHEN '${schema}' THEN ${index}`)
          .join(' ')}
        ELSE ${schemas.length}
      END
      LIMIT 1
    `);

    const schema = result[0]?.table_schema || schemas[0];
    return {
      schema,
      schemaPrefix: `"${schema}".`,
    };
  }
}
