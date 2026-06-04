import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogEventType1745800000000 implements MigrationInterface {
  name = 'AddAuditLogEventType1745800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "audit_logs"
      ADD COLUMN IF NOT EXISTS "event_type" VARCHAR(100)
    `);

    await queryRunner.query(`
      UPDATE "audit_logs"
      SET "event_type" = "action"
      WHERE "event_type" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "audit_logs"
      ALTER COLUMN "event_type" SET DEFAULT 'unknown'
    `);

    await queryRunner.query(`
      ALTER TABLE IF EXISTS "audit_logs"
      ALTER COLUMN "event_type" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE IF EXISTS "audit_logs"
      DROP COLUMN IF EXISTS "event_type"
    `);
  }
}
