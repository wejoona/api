import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateBatchJobsTable1700000000000 implements MigrationInterface {
  name = 'CreateBatchJobsTable1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'batch_jobs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'bulk_kyc',
              'mass_notification',
              'scheduled_report',
              'data_export',
              'bulk_transaction',
              'user_migration',
            ],
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'pending',
              'queued',
              'processing',
              'completed',
              'failed',
              'cancelled',
              'partially_completed',
            ],
            default: "'pending'",
          },
          {
            name: 'priority',
            type: 'int',
            default: 5,
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'payload',
            type: 'jsonb',
          },
          {
            name: 'config',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metrics',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'scheduled_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'started_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'error_details',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'retry_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'max_retries',
            type: 'int',
            default: 3,
          },
          {
            name: 'results',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'result_file_url',
            type: 'text',
            isNullable: true,
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
          {
            name: 'created_by',
            type: 'uuid',
          },
        ],
      }),
      true,
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'batch_jobs',
      new TableIndex({
        name: 'IDX_batch_jobs_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'batch_jobs',
      new TableIndex({
        name: 'IDX_batch_jobs_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'batch_jobs',
      new TableIndex({
        name: 'IDX_batch_jobs_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'batch_jobs',
      new TableIndex({
        name: 'IDX_batch_jobs_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'batch_jobs',
      new TableIndex({
        name: 'IDX_batch_jobs_user_status',
        columnNames: ['user_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'batch_jobs',
      new TableIndex({
        name: 'IDX_batch_jobs_org_status',
        columnNames: ['organization_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'batch_jobs',
      new TableIndex({
        name: 'IDX_batch_jobs_type_status',
        columnNames: ['type', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'batch_jobs',
      new TableIndex({
        name: 'IDX_batch_jobs_scheduled_at',
        columnNames: ['scheduled_at'],
      }),
    );

    await queryRunner.createIndex(
      'batch_jobs',
      new TableIndex({
        name: 'IDX_batch_jobs_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('batch_jobs');
  }
}
