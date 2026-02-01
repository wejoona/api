import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDataRetentionTables1742300000000 implements MigrationInterface {
  name = 'CreateDataRetentionTables1742300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create retention_policies table
    await queryRunner.query(`
      CREATE TABLE "system"."retention_policies" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "data_type" varchar(100) NOT NULL UNIQUE,
        "retention_days" integer NOT NULL,
        "action" varchar(20) NOT NULL CHECK (action IN ('delete', 'anonymize', 'archive')),
        "grace_period_days" integer NOT NULL DEFAULT 30,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "description" text,
        "compliance_requirement" varchar(255),
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),

        CONSTRAINT "CHK_retention_policies_retention_days" CHECK (retention_days >= 0),
        CONSTRAINT "CHK_retention_policies_grace_period" CHECK (grace_period_days >= 0)
      )
    `);

    // Create data_deletion_requests table (GDPR right to erasure)
    await queryRunner.query(`
      CREATE TABLE "system"."data_deletion_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "requested_by_user_id" uuid,
        "status" varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
        "deletion_type" varchar(20) NOT NULL CHECK (deletion_type IN ('gdpr', 'account_closure', 'admin')),
        "reason" text,
        "scheduled_for" timestamp NOT NULL,
        "started_at" timestamp,
        "completed_at" timestamp,
        "failed_at" timestamp,
        "error_message" text,
        "audit_trail" jsonb DEFAULT '[]',
        "metadata" jsonb,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),

        CONSTRAINT "FK_deletion_requests_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_deletion_requests_requested_by" FOREIGN KEY ("requested_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL
      )
    `);

    // Create data_retention_logs table
    await queryRunner.query(`
      CREATE TABLE "system"."data_retention_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "job_name" varchar(100) NOT NULL,
        "data_type" varchar(100) NOT NULL,
        "action" varchar(20) NOT NULL,
        "records_processed" integer NOT NULL DEFAULT 0,
        "records_deleted" integer NOT NULL DEFAULT 0,
        "records_anonymized" integer NOT NULL DEFAULT 0,
        "records_archived" integer NOT NULL DEFAULT 0,
        "status" varchar(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
        "started_at" timestamp NOT NULL DEFAULT now(),
        "completed_at" timestamp,
        "error_message" text,
        "metadata" jsonb,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Indexes for retention_policies
    await queryRunner.query(`
      CREATE INDEX "IDX_retention_policies_data_type"
      ON "system"."retention_policies" ("data_type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_retention_policies_enabled"
      ON "system"."retention_policies" ("is_enabled")
      WHERE "is_enabled" = true
    `);

    // Indexes for data_deletion_requests
    await queryRunner.query(`
      CREATE INDEX "IDX_deletion_requests_user_id"
      ON "system"."data_deletion_requests" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_deletion_requests_status"
      ON "system"."data_deletion_requests" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_deletion_requests_scheduled_for"
      ON "system"."data_deletion_requests" ("scheduled_for")
      WHERE status = 'pending'
    `);

    // Indexes for data_retention_logs
    await queryRunner.query(`
      CREATE INDEX "IDX_retention_logs_job_name"
      ON "system"."data_retention_logs" ("job_name")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_retention_logs_data_type"
      ON "system"."data_retention_logs" ("data_type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_retention_logs_created_at"
      ON "system"."data_retention_logs" ("created_at")
    `);

    // Add deleted_at columns to key tables for soft delete
    await queryRunner.query(`
      ALTER TABLE "auth"."sessions"
      ADD COLUMN "deleted_at" timestamp DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "auth"."verifications"
      ADD COLUMN "deleted_at" timestamp DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "webhook_deadletters"
      ADD COLUMN "deleted_at" timestamp DEFAULT NULL
    `);

    // Create indexes for soft deletes
    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_deleted_at"
      ON "auth"."sessions" ("deleted_at")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_verifications_deleted_at"
      ON "auth"."verifications" ("deleted_at")
      WHERE "deleted_at" IS NULL
    `);

    // Insert default retention policies
    await queryRunner.query(`
      INSERT INTO "system"."retention_policies" (data_type, retention_days, action, grace_period_days, description, compliance_requirement)
      VALUES
        ('sessions', 90, 'delete', 0, 'User sessions older than 90 days', 'Security best practice'),
        ('verification_codes', 1, 'delete', 0, 'Verification codes older than 24 hours', 'Security requirement'),
        ('webhook_logs', 30, 'archive', 7, 'Webhook logs older than 30 days', 'Operational requirement'),
        ('transaction_logs', 2555, 'archive', 30, 'Transaction records (7 years)', 'Financial regulation'),
        ('audit_logs', 2555, 'archive', 30, 'Audit trail for compliance (7 years)', 'Compliance requirement'),
        ('user_data', 30, 'anonymize', 30, 'User data after account deletion', 'GDPR Article 17'),
        ('kyc_documents', 2555, 'archive', 30, 'KYC documents (7 years)', 'AML/KYC regulation'),
        ('notifications', 90, 'delete', 0, 'Read notifications older than 90 days', 'Operational cleanup'),
        ('fcm_tokens', 30, 'delete', 0, 'Inactive FCM tokens older than 30 days', 'Operational cleanup'),
        ('device_metadata', 180, 'anonymize', 30, 'Device metadata for inactive devices', 'Privacy requirement')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove soft delete columns
    await queryRunner.query(
      `ALTER TABLE "auth"."sessions" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth"."verifications" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhook_deadletters" DROP COLUMN "deleted_at"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "system"."data_retention_logs"`);
    await queryRunner.query(`DROP TABLE "system"."data_deletion_requests"`);
    await queryRunner.query(`DROP TABLE "system"."retention_policies"`);
  }
}
