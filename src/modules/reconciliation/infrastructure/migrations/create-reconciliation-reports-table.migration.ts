import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration to create the reconciliation_reports table
 *
 * This table stores comprehensive financial reconciliation reports including:
 * - Daily transaction reconciliation results
 * - Provider balance matching data
 * - Fee verification results
 * - Settlement report summaries
 */
export class CreateReconciliationReportsTable1706600000000 implements MigrationInterface {
  name = 'CreateReconciliationReportsTable1706600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the reconciliation_reports table
    await queryRunner.createTable(
      new Table({
        name: 'reconciliation_reports',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            comment:
              'Type: daily_transaction, provider_balance, fee_verification, settlement',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
            comment:
              'Status: pending, in_progress, completed, failed, requires_review',
          },
          {
            name: 'period_start',
            type: 'timestamp with time zone',
            comment: 'Start of reconciliation period',
          },
          {
            name: 'period_end',
            type: 'timestamp with time zone',
            comment: 'End of reconciliation period',
          },
          {
            name: 'summary',
            type: 'jsonb',
            comment: 'Reconciliation summary statistics',
          },
          {
            name: 'transaction_discrepancies',
            type: 'jsonb',
            default: "'[]'",
            comment: 'List of transaction discrepancies found',
          },
          {
            name: 'fee_discrepancies',
            type: 'jsonb',
            default: "'[]'",
            comment: 'List of fee discrepancies found',
          },
          {
            name: 'settlement_entries',
            type: 'jsonb',
            default: "'[]'",
            comment: 'Settlement entries by provider',
          },
          {
            name: 'provider_balances',
            type: 'jsonb',
            default: "'[]'",
            comment: 'Provider balance reconciliation entries',
          },
          {
            name: 'executed_by',
            type: 'uuid',
            isNullable: true,
            comment: 'User who executed the reconciliation',
          },
          {
            name: 'reviewed_by',
            type: 'uuid',
            isNullable: true,
            comment: 'User who reviewed the report',
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
            comment: 'Additional notes or comments',
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            comment: 'Additional metadata',
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
          {
            name: 'completed_at',
            type: 'timestamp with time zone',
            isNullable: true,
            comment: 'When reconciliation completed',
          },
        ],
      }),
      true,
    );

    // Create indexes for efficient querying
    await queryRunner.createIndex(
      'reconciliation_reports',
      new TableIndex({
        name: 'IDX_reconciliation_reports_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'reconciliation_reports',
      new TableIndex({
        name: 'IDX_reconciliation_reports_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'reconciliation_reports',
      new TableIndex({
        name: 'IDX_reconciliation_reports_type_period',
        columnNames: ['type', 'period_start', 'period_end'],
      }),
    );

    await queryRunner.createIndex(
      'reconciliation_reports',
      new TableIndex({
        name: 'IDX_reconciliation_reports_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Create function for automatic updated_at trigger
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_reconciliation_reports_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger for automatic updated_at
    await queryRunner.query(`
      CREATE TRIGGER trg_reconciliation_reports_updated_at
        BEFORE UPDATE ON reconciliation_reports
        FOR EACH ROW
        EXECUTE FUNCTION update_reconciliation_reports_updated_at();
    `);

    // Add comments to table
    await queryRunner.query(`
      COMMENT ON TABLE reconciliation_reports IS 'Stores comprehensive financial reconciliation reports for auditing and compliance';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_reconciliation_reports_updated_at ON reconciliation_reports;
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_reconciliation_reports_updated_at();
    `);

    // Drop table (indexes will be dropped automatically)
    await queryRunner.dropTable('reconciliation_reports');
  }
}
