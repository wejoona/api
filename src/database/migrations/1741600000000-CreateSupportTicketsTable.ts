import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupportTicketsTable1741600000000 implements MigrationInterface {
  name = 'CreateSupportTicketsTable1741600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ticket category enum
    await queryRunner.query(`
      CREATE TYPE "system"."ticket_category" AS ENUM (
        'account',
        'transaction',
        'deposit',
        'withdrawal',
        'kyc',
        'security',
        'technical',
        'billing',
        'other'
      )
    `);

    // Create ticket priority enum
    await queryRunner.query(`
      CREATE TYPE "system"."ticket_priority" AS ENUM (
        'low',
        'medium',
        'high',
        'urgent'
      )
    `);

    // Create ticket status enum
    await queryRunner.query(`
      CREATE TYPE "system"."ticket_status" AS ENUM (
        'open',
        'in_progress',
        'waiting_customer',
        'resolved',
        'closed'
      )
    `);

    // Create support_tickets table
    await queryRunner.query(`
      CREATE TABLE "system"."support_tickets" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "subject" varchar(255) NOT NULL,
        "category" "system"."ticket_category" NOT NULL DEFAULT 'other',
        "priority" "system"."ticket_priority" NOT NULL DEFAULT 'medium',
        "status" "system"."ticket_status" NOT NULL DEFAULT 'open',
        "assigned_to" uuid,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        "resolved_at" timestamp,
        CONSTRAINT "FK_support_tickets_user" FOREIGN KEY ("user_id")
          REFERENCES "auth"."users"("id") ON DELETE CASCADE
      )
    `);

    // Index for user ticket lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_support_tickets_user_id"
      ON "system"."support_tickets" ("user_id")
    `);

    // Index for status filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_support_tickets_status"
      ON "system"."support_tickets" ("status")
    `);

    // Index for assigned agent lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_support_tickets_assigned_to"
      ON "system"."support_tickets" ("assigned_to")
      WHERE "assigned_to" IS NOT NULL
    `);

    // Index for open tickets by priority (for support queue)
    await queryRunner.query(`
      CREATE INDEX "IDX_support_tickets_open_priority"
      ON "system"."support_tickets" ("priority", "created_at")
      WHERE "status" = 'open'
    `);

    // Composite index for user's active tickets
    await queryRunner.query(`
      CREATE INDEX "IDX_support_tickets_user_active"
      ON "system"."support_tickets" ("user_id", "status")
      WHERE "status" NOT IN ('resolved', 'closed')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "system"."support_tickets"`);
    await queryRunner.query(`DROP TYPE "system"."ticket_status"`);
    await queryRunner.query(`DROP TYPE "system"."ticket_priority"`);
    await queryRunner.query(`DROP TYPE "system"."ticket_category"`);
  }
}
