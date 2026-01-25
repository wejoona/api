import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class CreateWhitelistedAddressesTable1738200000000 implements MigrationInterface {
  name = 'CreateWhitelistedAddressesTable1738200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'whitelisted_addresses',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'address',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'label',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'address_type',
            type: 'varchar',
            length: '20',
            default: "'external'",
          },
          {
            name: 'network',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'verified_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_used_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'usage_count',
            type: 'integer',
            default: 0,
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
      'whitelisted_addresses',
      new TableIndex({
        name: 'IDX_whitelisted_addresses_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'whitelisted_addresses',
      new TableIndex({
        name: 'IDX_whitelisted_addresses_address',
        columnNames: ['address'],
      }),
    );

    await queryRunner.createIndex(
      'whitelisted_addresses',
      new TableIndex({
        name: 'IDX_whitelisted_addresses_status',
        columnNames: ['status'],
      }),
    );

    // Create unique constraint for user + address combination
    await queryRunner.createUniqueConstraint(
      'whitelisted_addresses',
      new TableUnique({
        name: 'UQ_whitelisted_addresses_user_address',
        columnNames: ['user_id', 'address'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropUniqueConstraint(
      'whitelisted_addresses',
      'UQ_whitelisted_addresses_user_address',
    );
    await queryRunner.dropIndex(
      'whitelisted_addresses',
      'IDX_whitelisted_addresses_user_id',
    );
    await queryRunner.dropIndex(
      'whitelisted_addresses',
      'IDX_whitelisted_addresses_address',
    );
    await queryRunner.dropIndex(
      'whitelisted_addresses',
      'IDX_whitelisted_addresses_status',
    );
    await queryRunner.dropTable('whitelisted_addresses');
  }
}
