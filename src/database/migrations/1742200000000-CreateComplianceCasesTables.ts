import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateComplianceCasesTables1742200000000 implements MigrationInterface {
  name = 'CreateComplianceCasesTables1742200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create case type enum
    await queryRunner.query(`
      CREATE TYPE "compliance"."case_type" AS ENUM (
        'fraud',
        'aml',
        'kyc_review',
        'complaint'
      )
    `);

    // Create case status enum
    await queryRunner.query(`
      CREATE TYPE "compliance"."case_status" AS ENUM (
        'open',
        'investigating',
        'escalated',
        'closed'
      )
    `);

    // Create case priority enum
    await queryRunner.query(`
      CREATE TYPE "compliance"."case_priority" AS ENUM (
        'critical',
        'high',
        'medium',
        'low'
      )
    `);

    // Create evidence type enum
    await queryRunner.query(`
      CREATE TYPE "compliance"."evidence_type" AS ENUM (
        'document',
        'transaction',
        'screenshot'
      )
    `);

    // Create compliance.cases table
    await queryRunner.query(`
      CREATE TABLE "compliance"."cases" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "case_number" varchar(50) NOT NULL UNIQUE,
        "case_type" "compliance"."case_type" NOT NULL,
        "subject_user_id" uuid NOT NULL,
        "status" "compliance"."case_status" NOT NULL DEFAULT 'open',
        "priority" "compliance"."case_priority" NOT NULL DEFAULT 'medium',
        "assigned_to" uuid,
        "escalated_to" uuid,
        "created_by" uuid NOT NULL,
        "summary" text NOT NULL,
        "findings" text,
        "resolution" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        "closed_at" timestamp,
        CONSTRAINT "FK_compliance_cases_subject_user" FOREIGN KEY ("subject_user_id")
          REFERENCES "auth"."users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_compliance_cases_assigned_to" FOREIGN KEY ("assigned_to")
          REFERENCES "auth"."users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_compliance_cases_escalated_to" FOREIGN KEY ("escalated_to")
          REFERENCES "auth"."users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_compliance_cases_created_by" FOREIGN KEY ("created_by")
          REFERENCES "auth"."users"("id") ON DELETE SET NULL
      )
    `);

    // Index for case number lookups
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_compliance_cases_case_number"
      ON "compliance"."cases" ("case_number")
    `);

    // Index for subject user lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_compliance_cases_subject_user_id"
      ON "compliance"."cases" ("subject_user_id")
    `);

    // Index for status filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_compliance_cases_status"
      ON "compliance"."cases" ("status")
    `);

    // Index for priority filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_compliance_cases_priority"
      ON "compliance"."cases" ("priority")
    `);

    // Index for case type filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_compliance_cases_type"
      ON "compliance"."cases" ("case_type")
    `);

    // Index for assigned agent lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_compliance_cases_assigned_to"
      ON "compliance"."cases" ("assigned_to")
      WHERE "assigned_to" IS NOT NULL
    `);

    // Composite index for open cases by priority (for case queue)
    await queryRunner.query(`
      CREATE INDEX "IDX_compliance_cases_open_priority"
      ON "compliance"."cases" ("priority", "created_at")
      WHERE "status" IN ('open', 'investigating')
    `);

    // Create compliance.case_notes table
    await queryRunner.query(`
      CREATE TABLE "compliance"."case_notes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "case_id" uuid NOT NULL,
        "author_id" uuid NOT NULL,
        "note" text NOT NULL,
        "is_internal" boolean NOT NULL DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        CONSTRAINT "FK_compliance_case_notes_case" FOREIGN KEY ("case_id")
          REFERENCES "compliance"."cases"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_compliance_case_notes_author" FOREIGN KEY ("author_id")
          REFERENCES "auth"."users"("id") ON DELETE SET NULL
      )
    `);

    // Index for case notes lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_compliance_case_notes_case_id"
      ON "compliance"."case_notes" ("case_id")
    `);

    // Index for author lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_compliance_case_notes_author_id"
      ON "compliance"."case_notes" ("author_id")
    `);

    // Create compliance.case_evidence table
    await queryRunner.query(`
      CREATE TABLE "compliance"."case_evidence" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "case_id" uuid NOT NULL,
        "evidence_type" "compliance"."evidence_type" NOT NULL,
        "file_url" varchar(500) NOT NULL,
        "description" text,
        "uploaded_by" uuid NOT NULL,
        "created_at" timestamp DEFAULT now(),
        CONSTRAINT "FK_compliance_case_evidence_case" FOREIGN KEY ("case_id")
          REFERENCES "compliance"."cases"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_compliance_case_evidence_uploaded_by" FOREIGN KEY ("uploaded_by")
          REFERENCES "auth"."users"("id") ON DELETE SET NULL
      )
    `);

    // Index for case evidence lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_compliance_case_evidence_case_id"
      ON "compliance"."case_evidence" ("case_id")
    `);

    // Index for evidence type filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_compliance_case_evidence_type"
      ON "compliance"."case_evidence" ("evidence_type")
    `);

    // Create sequence for case numbers
    await queryRunner.query(`
      CREATE SEQUENCE "compliance"."case_number_seq" START 1000
    `);

    // Create function to generate case numbers
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "compliance"."generate_case_number"()
      RETURNS varchar AS $$
      BEGIN
        RETURN 'CASE-' || LPAD(nextval('compliance.case_number_seq')::text, 8, '0');
      END;
      $$ LANGUAGE plpgsql
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "compliance"."generate_case_number"`,
    );
    await queryRunner.query(
      `DROP SEQUENCE IF EXISTS "compliance"."case_number_seq"`,
    );
    await queryRunner.query(`DROP TABLE "compliance"."case_evidence"`);
    await queryRunner.query(`DROP TABLE "compliance"."case_notes"`);
    await queryRunner.query(`DROP TABLE "compliance"."cases"`);
    await queryRunner.query(`DROP TYPE "compliance"."evidence_type"`);
    await queryRunner.query(`DROP TYPE "compliance"."case_priority"`);
    await queryRunner.query(`DROP TYPE "compliance"."case_status"`);
    await queryRunner.query(`DROP TYPE "compliance"."case_type"`);
  }
}
