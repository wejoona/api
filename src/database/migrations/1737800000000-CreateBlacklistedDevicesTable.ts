import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateBlacklistedDevicesTable1737800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'blacklisted_devices',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'device_fingerprint',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'identifier_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'reason',
            type: 'text',
          },
          {
            name: 'blacklisted_by',
            type: 'uuid',
          },
          {
            name: 'associated_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'blocked_attempts',
            type: 'integer',
            default: 0,
          },
          {
            name: 'last_blocked_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'blacklisted_devices',
      new TableIndex({
        name: 'IDX_blacklisted_devices_fingerprint',
        columnNames: ['device_fingerprint'],
      }),
    );

    await queryRunner.createIndex(
      'blacklisted_devices',
      new TableIndex({
        name: 'IDX_blacklisted_devices_type',
        columnNames: ['identifier_type'],
      }),
    );

    await queryRunner.createIndex(
      'blacklisted_devices',
      new TableIndex({
        name: 'IDX_blacklisted_devices_active',
        columnNames: ['is_active'],
      }),
    );

    await queryRunner.createIndex(
      'blacklisted_devices',
      new TableIndex({
        name: 'IDX_blacklisted_devices_user',
        columnNames: ['associated_user_id'],
      }),
    );

    // Composite index for efficient lookups
    await queryRunner.createIndex(
      'blacklisted_devices',
      new TableIndex({
        name: 'IDX_blacklisted_devices_lookup',
        columnNames: ['device_fingerprint', 'identifier_type', 'is_active'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('blacklisted_devices');
  }
}
