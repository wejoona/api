import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration to create the sub_businesses table
 *
 * This table stores sub-business units within a business including:
 * - Departments, branches, and teams
 * - Wallet assignments
 * - Permissions and spending limits
 */
export class CreateSubBusinessesTable1706700100000 implements MigrationInterface {
  name = 'CreateSubBusinessesTable1706700100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the sub_businesses table
    await queryRunner.createTable(
      new Table({
        name: 'sub_businesses',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'business_id',
            type: 'uuid',
            comment: 'Reference to parent business',
          },
          {
            name: 'wallet_id',
            type: 'uuid',
            isUnique: true,
            comment: 'Wallet assigned to this sub-business',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            comment: 'Sub-business name (e.g., Sales Department)',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: 'Sub-business description',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            default: "'department'",
            comment: 'Type: department, branch, team',
          },
          {
            name: 'permissions',
            type: 'jsonb',
            default: "'{}'",
            comment: 'Permissions for this sub-business',
          },
          {
            name: 'spending_limit',
            type: 'decimal',
            precision: 18,
            scale: 6,
            isNullable: true,
            comment: 'Maximum spending limit for this sub-business',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'active'",
            comment: 'Status: active, inactive, suspended',
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes for efficient querying
    await queryRunner.createIndex(
      'sub_businesses',
      new TableIndex({
        name: 'IDX_sub_businesses_business_id',
        columnNames: ['business_id'],
      }),
    );

    await queryRunner.createIndex(
      'sub_businesses',
      new TableIndex({
        name: 'IDX_sub_businesses_wallet_id',
        columnNames: ['wallet_id'],
      }),
    );

    await queryRunner.createIndex(
      'sub_businesses',
      new TableIndex({
        name: 'IDX_sub_businesses_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'sub_businesses',
      new TableIndex({
        name: 'IDX_sub_businesses_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Create function for automatic updated_at trigger
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_sub_businesses_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger for automatic updated_at
    await queryRunner.query(`
      CREATE TRIGGER trg_sub_businesses_updated_at
        BEFORE UPDATE ON sub_businesses
        FOR EACH ROW
        EXECUTE FUNCTION update_sub_businesses_updated_at();
    `);

    // Add comments to table
    await queryRunner.query(`
      COMMENT ON TABLE sub_businesses IS 'Stores sub-business units (departments, branches, teams) within a business';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_sub_businesses_updated_at ON sub_businesses;
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_sub_businesses_updated_at();
    `);

    // Drop table (indexes will be dropped automatically)
    await queryRunner.dropTable('sub_businesses');
  }
}
