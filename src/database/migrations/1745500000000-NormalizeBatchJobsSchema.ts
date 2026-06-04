import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeBatchJobsSchema1745500000000 implements MigrationInterface {
  name = 'NormalizeBatchJobsSchema1745500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.batch_jobs') IS NOT NULL THEN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'userId'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'user_id'
          ) THEN
            ALTER TABLE "batch_jobs" RENAME COLUMN "userId" TO "user_id";
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'organizationId'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'organization_id'
          ) THEN
            ALTER TABLE "batch_jobs" RENAME COLUMN "organizationId" TO "organization_id";
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'scheduledAt'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'scheduled_at'
          ) THEN
            ALTER TABLE "batch_jobs" RENAME COLUMN "scheduledAt" TO "scheduled_at";
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'startedAt'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'started_at'
          ) THEN
            ALTER TABLE "batch_jobs" RENAME COLUMN "startedAt" TO "started_at";
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'completedAt'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'completed_at'
          ) THEN
            ALTER TABLE "batch_jobs" RENAME COLUMN "completedAt" TO "completed_at";
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'errorMessage'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'error_message'
          ) THEN
            ALTER TABLE "batch_jobs" RENAME COLUMN "errorMessage" TO "error_message";
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'errorDetails'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'error_details'
          ) THEN
            ALTER TABLE "batch_jobs" RENAME COLUMN "errorDetails" TO "error_details";
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'retryCount'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'retry_count'
          ) THEN
            ALTER TABLE "batch_jobs" RENAME COLUMN "retryCount" TO "retry_count";
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'maxRetries'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'max_retries'
          ) THEN
            ALTER TABLE "batch_jobs" RENAME COLUMN "maxRetries" TO "max_retries";
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'resultFileUrl'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'result_file_url'
          ) THEN
            ALTER TABLE "batch_jobs" RENAME COLUMN "resultFileUrl" TO "result_file_url";
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'createdAt'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'created_at'
          ) THEN
            ALTER TABLE "batch_jobs" RENAME COLUMN "createdAt" TO "created_at";
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'updatedAt'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'updated_at'
          ) THEN
            ALTER TABLE "batch_jobs" RENAME COLUMN "updatedAt" TO "updated_at";
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'createdBy'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'batch_jobs' AND column_name = 'created_by'
          ) THEN
            ALTER TABLE "batch_jobs" RENAME COLUMN "createdBy" TO "created_by";
          END IF;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_batch_jobs_user_id"
      ON "batch_jobs" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_batch_jobs_organization_id"
      ON "batch_jobs" ("organization_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_batch_jobs_user_status"
      ON "batch_jobs" ("user_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_batch_jobs_org_status"
      ON "batch_jobs" ("organization_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_batch_jobs_type_status"
      ON "batch_jobs" ("type", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_batch_jobs_scheduled_at"
      ON "batch_jobs" ("scheduled_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_batch_jobs_created_at"
      ON "batch_jobs" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_batch_jobs_created_at";
      DROP INDEX IF EXISTS "IDX_batch_jobs_scheduled_at";
      DROP INDEX IF EXISTS "IDX_batch_jobs_type_status";
      DROP INDEX IF EXISTS "IDX_batch_jobs_org_status";
      DROP INDEX IF EXISTS "IDX_batch_jobs_user_status";
      DROP INDEX IF EXISTS "IDX_batch_jobs_organization_id";
      DROP INDEX IF EXISTS "IDX_batch_jobs_user_id";
    `);
  }
}
