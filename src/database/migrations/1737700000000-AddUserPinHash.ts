import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserPinHash1737700000000 implements MigrationInterface {
  name = 'AddUserPinHash1737700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add pin_hash column to users table
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'pin_hash',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    // Add pin_set_at column to track when PIN was set
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'pin_set_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Add pin_attempts column for rate limiting
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'pin_attempts',
        type: 'integer',
        default: 0,
      }),
    );

    // Add pin_locked_until column for lockout after failed attempts
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'pin_locked_until',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'pin_locked_until');
    await queryRunner.dropColumn('users', 'pin_attempts');
    await queryRunner.dropColumn('users', 'pin_set_at');
    await queryRunner.dropColumn('users', 'pin_hash');
  }
}
