import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create bulk_payments and bulk_payment_items tables
 *
 * This migration creates tables for bulk payment processing:
 * - bulk_payments: Main batch/batch records
 * - bulk_payment_items: Individual payment items within a batch
 */
export class CreateBulkPaymentsTables1738200000000 implements MigrationInterface {
  name = 'CreateBulkPaymentsTables1738200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create bulk_payments table
    await queryRunner.createTable(
      new Table({
        name: 'bulk_payments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'wallet_id',
            type: 'uuid',
            comment: 'Wallet initiating the bulk payment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            comment: 'Batch name (e.g., CSV filename)',
          },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 18,
            scale: 2,
            comment: 'Total amount across all items',
          },
          {
            name: 'total_recipients',
            type: 'integer',
            comment: 'Total number of payment recipients',
          },
          {
            name: 'success_count',
            type: 'integer',
            default: 0,
            comment: 'Number of successfully completed payments',
          },
          {
            name: 'failed_count',
            type: 'integer',
            default: 0,
            comment: 'Number of failed payments',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'draft'",
            comment:
              'Status: draft, pending, processing, completed, partially_completed, failed',
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
            name: 'processed_at',
            type: 'timestamp with time zone',
            isNullable: true,
            comment: 'When processing completed',
          },
        ],
      }),
      true,
    );

    // Create bulk_payment_items table
    await queryRunner.createTable(
      new Table({
        name: 'bulk_payment_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'bulk_payment_id',
            type: 'uuid',
            comment: 'Reference to parent bulk payment',
          },
          {
            name: 'recipient_phone',
            type: 'varchar',
            length: '20',
            comment: 'Recipient phone number',
          },
          {
            name: 'recipient_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Optional recipient name',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 18,
            scale: 2,
            comment: 'Payment amount',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: 'Payment description/note',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
            comment: 'Status: pending, processing, completed, failed',
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
            comment: 'Error message if payment failed',
          },
          {
            name: 'transaction_id',
            type: 'uuid',
            isNullable: true,
            comment: 'Reference to created transaction',
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
            name: 'processed_at',
            type: 'timestamp with time zone',
            isNullable: true,
            comment: 'When item was processed',
          },
        ],
      }),
      true,
    );

    // Create indexes for bulk_payments
    await queryRunner.createIndex(
      'bulk_payments',
      new TableIndex({
        name: 'IDX_bulk_payments_wallet_id',
        columnNames: ['wallet_id'],
      }),
    );

    await queryRunner.createIndex(
      'bulk_payments',
      new TableIndex({
        name: 'IDX_bulk_payments_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'bulk_payments',
      new TableIndex({
        name: 'IDX_bulk_payments_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Create indexes for bulk_payment_items
    await queryRunner.createIndex(
      'bulk_payment_items',
      new TableIndex({
        name: 'IDX_bulk_payment_items_bulk_payment_id',
        columnNames: ['bulk_payment_id'],
      }),
    );

    await queryRunner.createIndex(
      'bulk_payment_items',
      new TableIndex({
        name: 'IDX_bulk_payment_items_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'bulk_payment_items',
      new TableIndex({
        name: 'IDX_bulk_payment_items_transaction_id',
        columnNames: ['transaction_id'],
      }),
    );

    // Create foreign key for bulk_payment_items -> bulk_payments
    await queryRunner.createForeignKey(
      'bulk_payment_items',
      new TableForeignKey({
        name: 'FK_bulk_payment_items_bulk_payment',
        columnNames: ['bulk_payment_id'],
        referencedTableName: 'bulk_payments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign key for bulk_payments -> wallets
    await queryRunner.createForeignKey(
      'bulk_payments',
      new TableForeignKey({
        name: 'FK_bulk_payments_wallet',
        columnNames: ['wallet_id'],
        referencedTableName: 'wallets',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create trigger functions for automatic updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_bulk_payments_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_bulk_payment_items_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create triggers
    await queryRunner.query(`
      CREATE TRIGGER trg_bulk_payments_updated_at
        BEFORE UPDATE ON bulk_payments
        FOR EACH ROW
        EXECUTE FUNCTION update_bulk_payments_updated_at();
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_bulk_payment_items_updated_at
        BEFORE UPDATE ON bulk_payment_items
        FOR EACH ROW
        EXECUTE FUNCTION update_bulk_payment_items_updated_at();
    `);

    // Add table comments
    await queryRunner.query(`
      COMMENT ON TABLE bulk_payments IS 'Stores bulk payment batches for processing multiple payments at once';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE bulk_payment_items IS 'Individual payment items within a bulk payment batch';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_bulk_payments_updated_at ON bulk_payments;
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_bulk_payment_items_updated_at ON bulk_payment_items;
    `);

    // Drop trigger functions
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_bulk_payments_updated_at();
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_bulk_payment_items_updated_at();
    `);

    // Drop foreign keys
    await queryRunner.dropForeignKey(
      'bulk_payment_items',
      'FK_bulk_payment_items_bulk_payment',
    );
    await queryRunner.dropForeignKey(
      'bulk_payments',
      'FK_bulk_payments_wallet',
    );

    // Drop tables (indexes will be dropped automatically)
    await queryRunner.dropTable('bulk_payment_items');
    await queryRunner.dropTable('bulk_payments');
  }
}
