import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateRecurringTransfersTable1744000000000 implements MigrationInterface {
  name = 'CreateRecurringTransfersTable1744000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create recurring_transfers table
    await queryRunner.createTable(
      new Table({
        name: 'recurring_transfers',
        schema: 'wallet',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'wallet_id',
            type: 'uuid',
          },
          {
            name: 'recipient_phone',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'recipient_name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 18,
            scale: 6,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
            default: "'XOF'",
          },
          {
            name: 'frequency',
            type: 'enum',
            enum: ['daily', 'weekly', 'biweekly', 'monthly'],
          },
          {
            name: 'start_date',
            type: 'timestamp',
          },
          {
            name: 'end_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'next_execution_date',
            type: 'timestamp',
          },
          {
            name: 'occurrences_total',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'occurrences_remaining',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'paused', 'cancelled', 'completed'],
            default: "'active'",
          },
          {
            name: 'note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'day_of_week',
            type: 'int',
            isNullable: true,
            comment: 'Day of week (0=Sunday, 6=Saturday) for weekly/biweekly',
          },
          {
            name: 'day_of_month',
            type: 'int',
            isNullable: true,
            comment: 'Day of month (1-31) for monthly frequency',
          },
          {
            name: 'executed_count',
            type: 'int',
            default: 0,
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

    // Create indexes for recurring_transfers
    await queryRunner.createIndex(
      'wallet.recurring_transfers',
      new TableIndex({
        name: 'IDX_recurring_transfers_wallet_id',
        columnNames: ['wallet_id'],
      }),
    );

    await queryRunner.createIndex(
      'wallet.recurring_transfers',
      new TableIndex({
        name: 'IDX_recurring_transfers_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'wallet.recurring_transfers',
      new TableIndex({
        name: 'IDX_recurring_transfers_next_execution',
        columnNames: ['next_execution_date'],
      }),
    );

    await queryRunner.createIndex(
      'wallet.recurring_transfers',
      new TableIndex({
        name: 'IDX_recurring_transfers_wallet_status',
        columnNames: ['wallet_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'wallet.recurring_transfers',
      new TableIndex({
        name: 'IDX_recurring_transfers_status_next_execution',
        columnNames: ['status', 'next_execution_date'],
      }),
    );

    await queryRunner.createIndex(
      'wallet.recurring_transfers',
      new TableIndex({
        name: 'IDX_recurring_transfers_recipient_phone',
        columnNames: ['recipient_phone'],
      }),
    );

    // Create recurring_transfer_history table
    await queryRunner.createTable(
      new Table({
        name: 'recurring_transfer_history',
        schema: 'wallet',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'recurring_transfer_id',
            type: 'uuid',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 18,
            scale: 6,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'executed_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'success',
            type: 'boolean',
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'transaction_id',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for recurring_transfer_history
    await queryRunner.createIndex(
      'wallet.recurring_transfer_history',
      new TableIndex({
        name: 'IDX_recurring_transfer_history_recurring_transfer_id',
        columnNames: ['recurring_transfer_id'],
      }),
    );

    await queryRunner.createIndex(
      'wallet.recurring_transfer_history',
      new TableIndex({
        name: 'IDX_recurring_transfer_history_executed_at',
        columnNames: ['executed_at'],
      }),
    );

    await queryRunner.createIndex(
      'wallet.recurring_transfer_history',
      new TableIndex({
        name: 'IDX_recurring_transfer_history_transaction_id',
        columnNames: ['transaction_id'],
      }),
    );

    await queryRunner.createIndex(
      'wallet.recurring_transfer_history',
      new TableIndex({
        name: 'IDX_recurring_transfer_history_success',
        columnNames: ['success'],
      }),
    );

    // Create foreign key for recurring_transfer_history
    await queryRunner.createForeignKey(
      'wallet.recurring_transfer_history',
      new TableForeignKey({
        columnNames: ['recurring_transfer_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'recurring_transfers',
        referencedSchema: 'wallet',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign key for wallet_id
    await queryRunner.createForeignKey(
      'wallet.recurring_transfers',
      new TableForeignKey({
        columnNames: ['wallet_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'wallets',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const historyTable = await queryRunner.getTable(
      'wallet.recurring_transfer_history',
    );
    if (historyTable) {
      const foreignKeys = historyTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey(
          'wallet.recurring_transfer_history',
          fk,
        );
      }
    }

    const transfersTable = await queryRunner.getTable(
      'wallet.recurring_transfers',
    );
    if (transfersTable) {
      const foreignKeys = transfersTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('wallet.recurring_transfers', fk);
      }
    }

    // Drop tables
    await queryRunner.dropTable('wallet.recurring_transfer_history', true);
    await queryRunner.dropTable('wallet.recurring_transfers', true);
  }
}
