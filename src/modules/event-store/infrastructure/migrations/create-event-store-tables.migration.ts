import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateEventStoreTables1700000000000 implements MigrationInterface {
  name = 'CreateEventStoreTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create events table
    await queryRunner.createTable(
      new Table({
        name: 'events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'aggregate_id',
            type: 'uuid',
          },
          {
            name: 'aggregate_type',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'event_data',
            type: 'jsonb',
          },
          {
            name: 'metadata',
            type: 'jsonb',
          },
          {
            name: 'version',
            type: 'integer',
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'correlation_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'causation_id',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create unique index for aggregate version
    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'IDX_events_aggregate_version',
        columnNames: ['aggregate_id', 'aggregate_type', 'version'],
        isUnique: true,
      }),
    );

    // Create index for aggregate lookup
    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'IDX_events_aggregate',
        columnNames: ['aggregate_id', 'aggregate_type'],
      }),
    );

    // Create index for event type lookup
    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'IDX_events_event_type',
        columnNames: ['event_type'],
      }),
    );

    // Create index for correlation ID
    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'IDX_events_correlation_id',
        columnNames: ['correlation_id'],
      }),
    );

    // Create index for timestamp
    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'IDX_events_timestamp',
        columnNames: ['timestamp'],
      }),
    );

    // Create snapshots table
    await queryRunner.createTable(
      new Table({
        name: 'snapshots',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'aggregate_id',
            type: 'uuid',
          },
          {
            name: 'aggregate_type',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'version',
            type: 'integer',
          },
          {
            name: 'state',
            type: 'jsonb',
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create unique index for snapshot version
    await queryRunner.createIndex(
      'snapshots',
      new TableIndex({
        name: 'IDX_snapshots_aggregate_version',
        columnNames: ['aggregate_id', 'aggregate_type', 'version'],
        isUnique: true,
      }),
    );

    // Create index for aggregate lookup
    await queryRunner.createIndex(
      'snapshots',
      new TableIndex({
        name: 'IDX_snapshots_aggregate',
        columnNames: ['aggregate_id', 'aggregate_type'],
      }),
    );

    // Create projections table
    await queryRunner.createTable(
      new Table({
        name: 'projections',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'aggregate_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'aggregate_type',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'data',
            type: 'jsonb',
          },
          {
            name: 'last_event_id',
            type: 'uuid',
          },
          {
            name: 'last_event_version',
            type: 'integer',
          },
          {
            name: 'last_processed_at',
            type: 'timestamp',
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
      }),
      true,
    );

    // Create unique index for projection name and aggregate
    await queryRunner.createIndex(
      'projections',
      new TableIndex({
        name: 'IDX_projections_name_aggregate',
        columnNames: ['name', 'aggregate_id'],
        isUnique: true,
      }),
    );

    // Create index for projection name
    await queryRunner.createIndex(
      'projections',
      new TableIndex({
        name: 'IDX_projections_name',
        columnNames: ['name'],
      }),
    );

    // Create index for event version
    await queryRunner.createIndex(
      'projections',
      new TableIndex({
        name: 'IDX_projections_event_version',
        columnNames: ['last_event_version'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('projections');
    await queryRunner.dropTable('snapshots');
    await queryRunner.dropTable('events');
  }
}
