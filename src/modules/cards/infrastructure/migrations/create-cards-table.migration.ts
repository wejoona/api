import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateCardsTable1706900000000 implements MigrationInterface {
  name = 'CreateCardsTable1706900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'cards',
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
          },
          {
            name: 'wallet_id',
            type: 'uuid',
          },
          {
            name: 'card_number',
            type: 'varchar',
            length: '16',
          },
          {
            name: 'cvv',
            type: 'varchar',
            length: '3',
          },
          {
            name: 'expiry_month',
            type: 'varchar',
            length: '2',
          },
          {
            name: 'expiry_year',
            type: 'varchar',
            length: '2',
          },
          {
            name: 'cardholder_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'card_type',
            type: 'varchar',
            length: '20',
            default: "'virtual'",
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'active'",
          },
          {
            name: 'spending_limit',
            type: 'decimal',
            precision: 18,
            scale: 2,
          },
          {
            name: 'spent_amount',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
            default: "'USD'",
          },
          {
            name: 'frozen_at',
            type: 'timestamp',
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
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'cards',
      new TableIndex({
        name: 'IDX_cards_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'cards',
      new TableIndex({
        name: 'IDX_cards_wallet_id',
        columnNames: ['wallet_id'],
      }),
    );

    await queryRunner.createIndex(
      'cards',
      new TableIndex({
        name: 'IDX_cards_card_type',
        columnNames: ['card_type'],
      }),
    );

    await queryRunner.createIndex(
      'cards',
      new TableIndex({
        name: 'IDX_cards_status',
        columnNames: ['status'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'cards',
      new TableForeignKey({
        name: 'FK_cards_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'cards',
      new TableForeignKey({
        name: 'FK_cards_wallet',
        columnNames: ['wallet_id'],
        referencedTableName: 'wallets',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('cards', 'FK_cards_wallet');
    await queryRunner.dropForeignKey('cards', 'FK_cards_user');
    await queryRunner.dropTable('cards');
  }
}
