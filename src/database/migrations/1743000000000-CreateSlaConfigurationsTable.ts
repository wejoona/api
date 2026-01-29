import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSlaConfigurationsTable1743000000000
  implements MigrationInterface
{
  name = 'CreateSlaConfigurationsTable1743000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create SLA configurations table
    await queryRunner.query(`
      CREATE TABLE "system"."sla_configurations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "category" varchar(50) NOT NULL,
        "priority" varchar(20) NOT NULL,
        "response_time_minutes" integer NOT NULL,
        "resolution_time_minutes" integer NOT NULL,
        "escalation_after_minutes" integer,
        "is_active" boolean NOT NULL DEFAULT true,
        "business_hours_only" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sla_configurations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sla_category_priority" UNIQUE ("category", "priority")
      )
    `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_sla_configurations_category" ON "system"."sla_configurations" ("category")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sla_configurations_priority" ON "system"."sla_configurations" ("priority")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sla_configurations_is_active" ON "system"."sla_configurations" ("is_active")`,
    );

    // Insert default SLA configurations
    await queryRunner.query(`
      INSERT INTO "system"."sla_configurations"
        ("name", "category", "priority", "response_time_minutes", "resolution_time_minutes", "escalation_after_minutes", "business_hours_only")
      VALUES
        -- Support ticket SLAs
        ('Critical Support - Immediate Response', 'support', 'urgent', 15, 120, 60, false),
        ('High Priority Support', 'support', 'high', 60, 240, 120, false),
        ('Medium Priority Support', 'support', 'medium', 240, 1440, 480, true),
        ('Low Priority Support', 'support', 'low', 1440, 4320, 2160, true),

        -- KYC verification SLAs
        ('Urgent KYC Review', 'kyc', 'urgent', 60, 240, 120, false),
        ('High Priority KYC', 'kyc', 'high', 240, 720, 360, false),
        ('Standard KYC Review', 'kyc', 'medium', 720, 1440, 720, true),
        ('Bulk KYC Review', 'kyc', 'low', 1440, 2880, 1440, true),

        -- Transaction dispute SLAs
        ('Critical Transaction Dispute', 'transaction', 'urgent', 30, 240, 120, false),
        ('High Priority Dispute', 'transaction', 'high', 120, 480, 240, false),
        ('Standard Dispute', 'transaction', 'medium', 480, 2880, 1440, true),

        -- Withdrawal issue SLAs
        ('Critical Withdrawal Issue', 'withdrawal', 'urgent', 15, 120, 60, false),
        ('High Priority Withdrawal', 'withdrawal', 'high', 60, 240, 120, false),
        ('Standard Withdrawal Issue', 'withdrawal', 'medium', 240, 1440, 480, true),

        -- Deposit issue SLAs
        ('Critical Deposit Issue', 'deposit', 'urgent', 15, 120, 60, false),
        ('High Priority Deposit', 'deposit', 'high', 60, 240, 120, false),
        ('Standard Deposit Issue', 'deposit', 'medium', 240, 1440, 480, true),

        -- Security incident SLAs
        ('Critical Security Incident', 'security', 'urgent', 5, 60, 30, false),
        ('High Security Risk', 'security', 'high', 30, 120, 60, false),
        ('Medium Security Issue', 'security', 'medium', 120, 480, 240, false),

        -- Account access SLAs
        ('Critical Account Access', 'account', 'urgent', 15, 120, 60, false),
        ('High Priority Account Issue', 'account', 'high', 60, 240, 120, false),
        ('Standard Account Support', 'account', 'medium', 240, 1440, 480, true),

        -- Billing/payment SLAs
        ('Critical Billing Issue', 'billing', 'urgent', 30, 240, 120, false),
        ('Standard Billing Support', 'billing', 'medium', 480, 2880, 1440, true),

        -- Complaint resolution SLAs
        ('Urgent Complaint', 'complaint', 'urgent', 60, 1440, 720, false),
        ('Standard Complaint', 'complaint', 'medium', 240, 2880, 1440, true),

        -- Technical support SLAs
        ('Critical Technical Issue', 'technical', 'urgent', 30, 240, 120, false),
        ('High Priority Technical', 'technical', 'high', 120, 480, 240, false),
        ('Standard Technical Support', 'technical', 'medium', 480, 2880, 1440, true),

        -- Other/general SLAs
        ('Urgent General Support', 'other', 'urgent', 60, 480, 240, false),
        ('Standard General Support', 'other', 'medium', 480, 2880, 1440, true),
        ('Low Priority General', 'other', 'low', 1440, 4320, 2160, true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "system"."sla_configurations"`);
  }
}
