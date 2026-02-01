import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSanctionsScreeningTables1706800000000 implements MigrationInterface {
  name = 'CreateSanctionsScreeningTables1706800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create compliance schema if not exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS compliance`);

    // Create screening_records table
    await queryRunner.createTable(
      new Table({
        name: 'screening_records',
        schema: 'compliance',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'entity_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'screening_type',
            type: 'enum',
            enum: ['individual', 'entity'],
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'request_id',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'screened_name',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'match_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'highest_score',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'risk_level',
            type: 'enum',
            enum: ['high', 'medium', 'low', 'none'],
            default: "'none'",
          },
          {
            name: 'requires_review',
            type: 'boolean',
            default: false,
          },
          {
            name: 'auto_blocked',
            type: 'boolean',
            default: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes for screening_records
    await queryRunner.createIndex(
      'compliance.screening_records',
      new TableIndex({
        name: 'IDX_screening_records_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'compliance.screening_records',
      new TableIndex({
        name: 'IDX_screening_records_entity_id',
        columnNames: ['entity_id'],
      }),
    );

    await queryRunner.createIndex(
      'compliance.screening_records',
      new TableIndex({
        name: 'IDX_screening_records_provider',
        columnNames: ['provider'],
      }),
    );

    await queryRunner.createIndex(
      'compliance.screening_records',
      new TableIndex({
        name: 'IDX_screening_records_request_id',
        columnNames: ['request_id'],
      }),
    );

    await queryRunner.createIndex(
      'compliance.screening_records',
      new TableIndex({
        name: 'IDX_screening_records_risk_level',
        columnNames: ['risk_level'],
      }),
    );

    await queryRunner.createIndex(
      'compliance.screening_records',
      new TableIndex({
        name: 'IDX_screening_records_requires_review',
        columnNames: ['requires_review'],
      }),
    );

    await queryRunner.createIndex(
      'compliance.screening_records',
      new TableIndex({
        name: 'IDX_screening_records_auto_blocked',
        columnNames: ['auto_blocked'],
      }),
    );

    // Create screening_matches table
    await queryRunner.createTable(
      new Table({
        name: 'screening_matches',
        schema: 'compliance',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'screening_record_id',
            type: 'uuid',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'match_id',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'matched_name',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'list_type',
            type: 'enum',
            enum: ['sanctions', 'pep', 'adverse_media', 'enforcement'],
          },
          {
            name: 'source',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'match_score',
            type: 'decimal',
            precision: 5,
            scale: 2,
          },
          {
            name: 'match_type',
            type: 'enum',
            enum: ['exact', 'fuzzy', 'alias', 'partial'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'confirmed', 'false_positive'],
            default: "'pending'",
          },
          {
            name: 'reviewed_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reviewed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'resolution_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_screening_matches_screening_record',
            columnNames: ['screening_record_id'],
            referencedTableName: 'screening_records',
            referencedSchema: 'compliance',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create indexes for screening_matches
    await queryRunner.createIndex(
      'compliance.screening_matches',
      new TableIndex({
        name: 'IDX_screening_matches_screening_record_id',
        columnNames: ['screening_record_id'],
      }),
    );

    await queryRunner.createIndex(
      'compliance.screening_matches',
      new TableIndex({
        name: 'IDX_screening_matches_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'compliance.screening_matches',
      new TableIndex({
        name: 'IDX_screening_matches_list_type',
        columnNames: ['list_type'],
      }),
    );

    await queryRunner.createIndex(
      'compliance.screening_matches',
      new TableIndex({
        name: 'IDX_screening_matches_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('compliance.screening_matches');
    await queryRunner.dropTable('compliance.screening_records');
  }
}
