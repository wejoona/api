import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTicketMessagesTable1741600000001 implements MigrationInterface {
  name = 'CreateTicketMessagesTable1741600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create sender type enum
    await queryRunner.query(`
      CREATE TYPE "system"."message_sender_type" AS ENUM (
        'user',
        'agent',
        'system'
      )
    `);

    // Create ticket_messages table
    await queryRunner.query(`
      CREATE TABLE "system"."ticket_messages" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ticket_id" uuid NOT NULL,
        "sender_type" "system"."message_sender_type" NOT NULL,
        "sender_id" uuid,
        "message" text NOT NULL,
        "attachments" jsonb DEFAULT '[]',
        "created_at" timestamp DEFAULT now(),
        CONSTRAINT "FK_ticket_messages_ticket" FOREIGN KEY ("ticket_id")
          REFERENCES "system"."support_tickets"("id") ON DELETE CASCADE
      )
    `);

    // Index for ticket message lookups (most common query)
    await queryRunner.query(`
      CREATE INDEX "IDX_ticket_messages_ticket_id"
      ON "system"."ticket_messages" ("ticket_id")
    `);

    // Index for message chronological ordering
    await queryRunner.query(`
      CREATE INDEX "IDX_ticket_messages_created_at"
      ON "system"."ticket_messages" ("ticket_id", "created_at")
    `);

    // Index for sender lookups (e.g., find all messages by an agent)
    await queryRunner.query(`
      CREATE INDEX "IDX_ticket_messages_sender"
      ON "system"."ticket_messages" ("sender_type", "sender_id")
      WHERE "sender_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "system"."ticket_messages"`);
    await queryRunner.query(`DROP TYPE "system"."message_sender_type"`);
  }
}
