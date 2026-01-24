import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddWalletVersionColumn1737900000000 implements MigrationInterface {
  name = 'AddWalletVersionColumn1737900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add version column for optimistic locking
    await queryRunner.addColumn(
      'wallets',
      new TableColumn({
        name: 'version',
        type: 'integer',
        default: 1,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('wallets', 'version');
  }
}
