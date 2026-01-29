import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWatchlistTables1741900000000 implements MigrationInterface {
  name = 'CreateWatchlistTables1741900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create list_type enum
    await queryRunner.query(`
      CREATE TYPE "compliance"."watchlist_list_type_enum" AS ENUM (
        'sanctions',
        'pep',
        'adverse_media'
      )
    `);

    // Create match_status enum
    await queryRunner.query(`
      CREATE TYPE "compliance"."watchlist_match_status_enum" AS ENUM (
        'pending',
        'confirmed',
        'false_positive'
      )
    `);

    // Create match_type enum
    await queryRunner.query(`
      CREATE TYPE "compliance"."watchlist_match_type_enum" AS ENUM (
        'exact_name',
        'fuzzy_name',
        'alias',
        'identifier',
        'date_of_birth',
        'nationality'
      )
    `);

    // Create watchlist_entries table
    await queryRunner.query(`
      CREATE TABLE "compliance"."watchlist_entries" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "list_type" "compliance"."watchlist_list_type_enum" NOT NULL,
        "name" varchar(500) NOT NULL,
        "aliases" jsonb DEFAULT '[]',
        "nationality" varchar(100),
        "date_of_birth" date,
        "identifiers" jsonb DEFAULT '{}',
        "source" varchar(255) NOT NULL,
        "source_url" varchar(1000),
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `);

    // Add comment for identifiers field
    await queryRunner.query(`
      COMMENT ON COLUMN "compliance"."watchlist_entries"."identifiers" IS
      'JSON object with identifier types as keys (passport, national_id, tax_id) and values as arrays of IDs'
    `);

    // Add comment for aliases field
    await queryRunner.query(`
      COMMENT ON COLUMN "compliance"."watchlist_entries"."aliases" IS
      'JSON array of alternative names, nicknames, transliterations'
    `);

    // Index for name search (case-insensitive)
    await queryRunner.query(`
      CREATE INDEX "IDX_watchlist_entries_name_lower"
      ON "compliance"."watchlist_entries" (LOWER("name"))
    `);

    // Index for list_type filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_watchlist_entries_list_type"
      ON "compliance"."watchlist_entries" ("list_type")
      WHERE "is_active" = true
    `);

    // Index for active entries lookup
    await queryRunner.query(`
      CREATE INDEX "IDX_watchlist_entries_active"
      ON "compliance"."watchlist_entries" ("is_active")
      WHERE "is_active" = true
    `);

    // GIN index for aliases JSONB search
    await queryRunner.query(`
      CREATE INDEX "IDX_watchlist_entries_aliases"
      ON "compliance"."watchlist_entries" USING GIN ("aliases")
    `);

    // GIN index for identifiers JSONB search
    await queryRunner.query(`
      CREATE INDEX "IDX_watchlist_entries_identifiers"
      ON "compliance"."watchlist_entries" USING GIN ("identifiers")
    `);

    // Index for source filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_watchlist_entries_source"
      ON "compliance"."watchlist_entries" ("source")
    `);

    // Composite index for nationality + list_type
    await queryRunner.query(`
      CREATE INDEX "IDX_watchlist_entries_nationality_type"
      ON "compliance"."watchlist_entries" ("nationality", "list_type")
      WHERE "is_active" = true
    `);

    // Create watchlist_matches table
    await queryRunner.query(`
      CREATE TABLE "compliance"."watchlist_matches" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "watchlist_entry_id" uuid NOT NULL REFERENCES "compliance"."watchlist_entries"("id") ON DELETE CASCADE,
        "match_score" decimal(5,2) NOT NULL CHECK ("match_score" >= 0 AND "match_score" <= 100),
        "match_type" "compliance"."watchlist_match_type_enum" NOT NULL,
        "status" "compliance"."watchlist_match_status_enum" NOT NULL DEFAULT 'pending',
        "reviewed_by" uuid,
        "reviewed_at" timestamp,
        "notes" text,
        "created_at" timestamp DEFAULT now()
      )
    `);

    // Index for user lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_watchlist_matches_user_id"
      ON "compliance"."watchlist_matches" ("user_id")
    `);

    // Index for entry lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_watchlist_matches_entry_id"
      ON "compliance"."watchlist_matches" ("watchlist_entry_id")
    `);

    // Index for pending reviews
    await queryRunner.query(`
      CREATE INDEX "IDX_watchlist_matches_pending"
      ON "compliance"."watchlist_matches" ("status")
      WHERE "status" = 'pending'
    `);

    // Composite index for user + status
    await queryRunner.query(`
      CREATE INDEX "IDX_watchlist_matches_user_status"
      ON "compliance"."watchlist_matches" ("user_id", "status")
    `);

    // Index for high-score matches (prioritization)
    await queryRunner.query(`
      CREATE INDEX "IDX_watchlist_matches_high_score"
      ON "compliance"."watchlist_matches" ("match_score" DESC)
      WHERE "status" = 'pending'
    `);

    // Unique constraint to prevent duplicate matches
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_watchlist_matches_unique"
      ON "compliance"."watchlist_matches" ("user_id", "watchlist_entry_id", "match_type")
    `);

    // Seed sample sanctions entries (for testing/demo - West African context)
    await queryRunner.query(`
      INSERT INTO "compliance"."watchlist_entries"
        ("list_type", "name", "aliases", "nationality", "identifiers", "source", "is_active")
      VALUES
        (
          'sanctions',
          'OFAC Sanctions List Entry (Sample)',
          '["Test Alias 1", "Test Alias 2"]',
          NULL,
          '{"reference": ["OFAC-TEST-001"]}',
          'OFAC SDN List',
          false
        ),
        (
          'pep',
          'PEP Database Entry (Sample)',
          '[]',
          NULL,
          '{}',
          'World-Check',
          false
        ),
        (
          'adverse_media',
          'Adverse Media Entry (Sample)',
          '[]',
          NULL,
          '{}',
          'ComplyAdvantage',
          false
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "compliance"."watchlist_matches"`);
    await queryRunner.query(`DROP TABLE "compliance"."watchlist_entries"`);
    await queryRunner.query(
      `DROP TYPE "compliance"."watchlist_match_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "compliance"."watchlist_match_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "compliance"."watchlist_list_type_enum"`,
    );
  }
}
