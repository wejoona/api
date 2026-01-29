import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class CreateContactsTable1738100000000 implements MigrationInterface {
  name = 'CreateContactsTable1738100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'contacts',
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
            name: 'contact_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'wallet_address',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'username',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },
          {
            name: 'is_favorite',
            type: 'boolean',
            default: false,
          },
          {
            name: 'transaction_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'last_transaction_at',
            type: 'timestamp',
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
      'contacts',
      new TableIndex({
        name: 'IDX_contacts_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'contacts',
      new TableIndex({
        name: 'IDX_contacts_contact_user_id',
        columnNames: ['contact_user_id'],
      }),
    );

    await queryRunner.createIndex(
      'contacts',
      new TableIndex({
        name: 'IDX_contacts_phone',
        columnNames: ['phone'],
      }),
    );

    await queryRunner.createIndex(
      'contacts',
      new TableIndex({
        name: 'IDX_contacts_wallet_address',
        columnNames: ['wallet_address'],
      }),
    );

    await queryRunner.createIndex(
      'contacts',
      new TableIndex({
        name: 'IDX_contacts_is_favorite',
        columnNames: ['is_favorite'],
      }),
    );

    // Create unique constraints
    await queryRunner.createUniqueConstraint(
      'contacts',
      new TableUnique({
        name: 'UQ_contacts_user_phone',
        columnNames: ['user_id', 'phone'],
      }),
    );

    await queryRunner.createUniqueConstraint(
      'contacts',
      new TableUnique({
        name: 'UQ_contacts_user_wallet_address',
        columnNames: ['user_id', 'wallet_address'],
      }),
    );

    await queryRunner.createUniqueConstraint(
      'contacts',
      new TableUnique({
        name: 'UQ_contacts_user_contact_user',
        columnNames: ['user_id', 'contact_user_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropUniqueConstraint(
      'contacts',
      'UQ_contacts_user_phone',
    );
    await queryRunner.dropUniqueConstraint(
      'contacts',
      'UQ_contacts_user_wallet_address',
    );
    await queryRunner.dropUniqueConstraint(
      'contacts',
      'UQ_contacts_user_contact_user',
    );
    await queryRunner.dropIndex('contacts', 'IDX_contacts_user_id');
    await queryRunner.dropIndex('contacts', 'IDX_contacts_contact_user_id');
    await queryRunner.dropIndex('contacts', 'IDX_contacts_phone');
    await queryRunner.dropIndex('contacts', 'IDX_contacts_wallet_address');
    await queryRunner.dropIndex('contacts', 'IDX_contacts_is_favorite');
    await queryRunner.dropTable('contacts');
  }
}
