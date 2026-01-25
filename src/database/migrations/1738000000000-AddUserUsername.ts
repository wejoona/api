import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddUserUsername1738000000000 implements MigrationInterface {
  name = 'AddUserUsername1738000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add username column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'username',
        type: 'varchar',
        length: '30',
        isNullable: true,
        isUnique: true,
      }),
    );

    // Add index for username searches
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_username',
        columnNames: ['username'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'IDX_users_username');
    await queryRunner.dropColumn('users', 'username');
  }
}
