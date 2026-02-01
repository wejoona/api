import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration to create the businesses table
 *
 * This table stores business account information including:
 * - Business registration details
 * - Contact information
 * - Verification status
 */
export class CreateBusinessesTable1706700000000 implements MigrationInterface {
  name = 'CreateBusinessesTable1706700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the businesses table
    await queryRunner.createTable(
      new Table({
        name: 'businesses',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isUnique: true,
            comment: 'Reference to user who owns this business',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            comment: 'Business name',
          },
          {
            name: 'registration_number',
            type: 'varchar',
            length: '100',
            isUnique: true,
            comment: 'Business registration number',
          },
          {
            name: 'industry',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'Business industry/sector',
          },
          {
            name: 'address',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Business physical address',
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'Business city',
          },
          {
            name: 'country',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'Business country',
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
            comment: 'Business phone number',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Business email address',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
            comment: 'Status: pending, approved, rejected',
          },
          {
            name: 'verified_at',
            type: 'timestamp with time zone',
            isNullable: true,
            comment: 'When business was verified/approved',
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
      'businesses',
      new TableIndex({
        name: 'IDX_businesses_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'businesses',
      new TableIndex({
        name: 'IDX_businesses_registration_number',
        columnNames: ['registration_number'],
      }),
    );

    await queryRunner.createIndex(
      'businesses',
      new TableIndex({
        name: 'IDX_businesses_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'businesses',
      new TableIndex({
        name: 'IDX_businesses_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Create function for automatic updated_at trigger
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_businesses_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger for automatic updated_at
    await queryRunner.query(`
      CREATE TRIGGER trg_businesses_updated_at
        BEFORE UPDATE ON businesses
        FOR EACH ROW
        EXECUTE FUNCTION update_businesses_updated_at();
    `);

    // Add comments to table
    await queryRunner.query(`
      COMMENT ON TABLE businesses IS 'Stores business account information for business users';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_businesses_updated_at ON businesses;
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_businesses_updated_at();
    `);

    // Drop table (indexes will be dropped automatically)
    await queryRunner.dropTable('businesses');
  }
}
