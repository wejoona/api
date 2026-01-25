import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

export class CreateWebhookDeadlettersTable1738400000000 implements MigrationInterface {
  name = 'CreateWebhookDeadlettersTable1738400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'webhook_deadletters',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'webhook_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'error_stack',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'retry_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'last_retry_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'resolved_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'resolved_by',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'resolution_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for common query patterns
    await queryRunner.createIndex(
      'webhook_deadletters',
      new TableIndex({
        name: 'IDX_webhook_deadletters_provider',
        columnNames: ['provider'],
      }),
    );

    await queryRunner.createIndex(
      'webhook_deadletters',
      new TableIndex({
        name: 'IDX_webhook_deadletters_event_type',
        columnNames: ['event_type'],
      }),
    );

    await queryRunner.createIndex(
      'webhook_deadletters',
      new TableIndex({
        name: 'IDX_webhook_deadletters_webhook_id',
        columnNames: ['webhook_id'],
      }),
    );

    await queryRunner.createIndex(
      'webhook_deadletters',
      new TableIndex({
        name: 'IDX_webhook_deadletters_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'webhook_deadletters',
      'IDX_webhook_deadletters_provider',
    );
    await queryRunner.dropIndex(
      'webhook_deadletters',
      'IDX_webhook_deadletters_event_type',
    );
    await queryRunner.dropIndex(
      'webhook_deadletters',
      'IDX_webhook_deadletters_webhook_id',
    );
    await queryRunner.dropIndex(
      'webhook_deadletters',
      'IDX_webhook_deadletters_status',
    );
    await queryRunner.dropTable('webhook_deadletters');
  }
}
