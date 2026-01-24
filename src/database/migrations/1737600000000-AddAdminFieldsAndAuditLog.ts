import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminFieldsAndAuditLog1737600000000 implements MigrationInterface {
  name = 'AddAdminFieldsAndAuditLog1737600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add role and status columns to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "role" varchar(20) NOT NULL DEFAULT 'user',
      ADD COLUMN "status" varchar(20) NOT NULL DEFAULT 'active',
      ADD COLUMN "suspended_at" TIMESTAMP,
      ADD COLUMN "suspended_reason" text
    `);

    // Create index on role and status
    await queryRunner.query(
      `CREATE INDEX "IDX_users_role" ON "users" ("role")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_status" ON "users" ("status")`,
    );

    // Create audit_logs table for tracking all sensitive operations
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actor_id" uuid,
        "actor_type" varchar(20) NOT NULL DEFAULT 'user',
        "action" varchar(100) NOT NULL,
        "resource_type" varchar(50) NOT NULL,
        "resource_id" varchar(100),
        "details" jsonb,
        "ip_address" varchar(45),
        "user_agent" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    // Create indexes on audit_logs
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_actor_id" ON "audit_logs" ("actor_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_resource_type" ON "audit_logs" ("resource_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_resource_id" ON "audit_logs" ("resource_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at" DESC)`,
    );

    // Create system_metrics table for dashboard stats
    await queryRunner.query(`
      CREATE TABLE "system_metrics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "metric_name" varchar(100) NOT NULL,
        "metric_value" decimal(18,6) NOT NULL,
        "metric_type" varchar(20) NOT NULL DEFAULT 'counter',
        "dimensions" jsonb,
        "recorded_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_system_metrics" PRIMARY KEY ("id")
      )
    `);

    // Create indexes on system_metrics
    await queryRunner.query(
      `CREATE INDEX "IDX_system_metrics_name" ON "system_metrics" ("metric_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_system_metrics_recorded_at" ON "system_metrics" ("recorded_at" DESC)`,
    );

    // Create scheduled_jobs table for tracking job runs
    await queryRunner.query(`
      CREATE TABLE "scheduled_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "job_name" varchar(100) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "started_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        "records_processed" integer DEFAULT 0,
        "error_message" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scheduled_jobs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_scheduled_jobs_name" ON "scheduled_jobs" ("job_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_scheduled_jobs_status" ON "scheduled_jobs" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "scheduled_jobs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "system_metrics"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_role"`);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "role",
      DROP COLUMN IF EXISTS "status",
      DROP COLUMN IF EXISTS "suspended_at",
      DROP COLUMN IF EXISTS "suspended_reason"
    `);
  }
}
