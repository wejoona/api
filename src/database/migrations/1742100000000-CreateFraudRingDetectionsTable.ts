import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFraudRingDetectionsTable1742100000000 implements MigrationInterface {
  name = 'CreateFraudRingDetectionsTable1742100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create detection_type enum
    await queryRunner.query(`
      CREATE TYPE "compliance"."fraud_ring_detection_type_enum" AS ENUM (
        'network',
        'velocity',
        'pattern'
      )
    `);

    // Create detection_status enum
    await queryRunner.query(`
      CREATE TYPE "compliance"."fraud_ring_detection_status_enum" AS ENUM (
        'pending',
        'investigating',
        'confirmed',
        'false_positive'
      )
    `);

    // Create fraud_ring_detections table
    await queryRunner.query(`
      CREATE TABLE "compliance"."fraud_ring_detections" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "detection_type" "compliance"."fraud_ring_detection_type_enum" NOT NULL,
        "linked_user_ids" uuid[] NOT NULL DEFAULT '{}',
        "linked_wallet_ids" uuid[] NOT NULL DEFAULT '{}',
        "detection_score" decimal(5,2) NOT NULL CHECK ("detection_score" >= 0 AND "detection_score" <= 100),
        "indicators" jsonb NOT NULL DEFAULT '{}',
        "status" "compliance"."fraud_ring_detection_status_enum" NOT NULL DEFAULT 'pending',
        "assigned_to" uuid,
        "notes" text,
        "evidence" jsonb DEFAULT '{}',
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        "resolved_at" timestamp
      )
    `);

    // Add comments for JSONB fields
    await queryRunner.query(`
      COMMENT ON COLUMN "compliance"."fraud_ring_detections"."indicators" IS
      'JSON object containing detection indicators: device_fingerprints, ip_addresses, phone_numbers, transaction_patterns, etc.'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "compliance"."fraud_ring_detections"."evidence" IS
      'JSON object containing supporting evidence: transactions, device_links, communication_patterns, etc.'
    `);

    // Index for detection_type filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_fraud_ring_detections_type"
      ON "compliance"."fraud_ring_detections" ("detection_type")
    `);

    // Index for status filtering (pending/investigating need quick access)
    await queryRunner.query(`
      CREATE INDEX "IDX_fraud_ring_detections_status"
      ON "compliance"."fraud_ring_detections" ("status")
    `);

    // Index for pending investigations (compliance team workflow)
    await queryRunner.query(`
      CREATE INDEX "IDX_fraud_ring_detections_pending"
      ON "compliance"."fraud_ring_detections" ("status", "detection_score" DESC)
      WHERE "status" IN ('pending', 'investigating')
    `);

    // Index for assigned_to (compliance officer workload)
    await queryRunner.query(`
      CREATE INDEX "IDX_fraud_ring_detections_assigned"
      ON "compliance"."fraud_ring_detections" ("assigned_to")
      WHERE "assigned_to" IS NOT NULL
    `);

    // Index for high-score detections (prioritization)
    await queryRunner.query(`
      CREATE INDEX "IDX_fraud_ring_detections_high_score"
      ON "compliance"."fraud_ring_detections" ("detection_score" DESC)
      WHERE "status" = 'pending'
    `);

    // GIN index for linked_user_ids array search
    await queryRunner.query(`
      CREATE INDEX "IDX_fraud_ring_detections_user_ids"
      ON "compliance"."fraud_ring_detections" USING GIN ("linked_user_ids")
    `);

    // GIN index for linked_wallet_ids array search
    await queryRunner.query(`
      CREATE INDEX "IDX_fraud_ring_detections_wallet_ids"
      ON "compliance"."fraud_ring_detections" USING GIN ("linked_wallet_ids")
    `);

    // GIN index for indicators JSONB search
    await queryRunner.query(`
      CREATE INDEX "IDX_fraud_ring_detections_indicators"
      ON "compliance"."fraud_ring_detections" USING GIN ("indicators")
    `);

    // Index for created_at (timeline analysis)
    await queryRunner.query(`
      CREATE INDEX "IDX_fraud_ring_detections_created_at"
      ON "compliance"."fraud_ring_detections" ("created_at" DESC)
    `);

    // Composite index for status + type (common filter combination)
    await queryRunner.query(`
      CREATE INDEX "IDX_fraud_ring_detections_status_type"
      ON "compliance"."fraud_ring_detections" ("status", "detection_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "compliance"."fraud_ring_detections"`);
    await queryRunner.query(
      `DROP TYPE "compliance"."fraud_ring_detection_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "compliance"."fraud_ring_detection_type_enum"`,
    );
  }
}
