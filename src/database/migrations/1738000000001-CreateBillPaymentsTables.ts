import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateBillPaymentsTables1738000000001 implements MigrationInterface {
  name = 'CreateBillPaymentsTables1738000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create bill_providers table
    await queryRunner.createTable(
      new Table({
        name: 'bill_providers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'short_name',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'category',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'country',
            type: 'varchar',
            length: '3',
          },
          {
            name: 'logo',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'requires_account_number',
            type: 'boolean',
            default: true,
          },
          {
            name: 'requires_meter_number',
            type: 'boolean',
            default: false,
          },
          {
            name: 'requires_customer_name',
            type: 'boolean',
            default: false,
          },
          {
            name: 'account_number_label',
            type: 'varchar',
            length: '50',
            default: "'Account Number'",
          },
          {
            name: 'account_number_pattern',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'account_number_length',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'minimum_amount',
            type: 'decimal',
            precision: 18,
            scale: 2,
          },
          {
            name: 'maximum_amount',
            type: 'decimal',
            precision: 18,
            scale: 2,
          },
          {
            name: 'processing_fee',
            type: 'decimal',
            precision: 18,
            scale: 4,
            default: 0,
          },
          {
            name: 'processing_fee_type',
            type: 'varchar',
            length: '20',
            default: "'fixed'",
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
            default: "'XOF'",
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'supports_validation',
            type: 'boolean',
            default: true,
          },
          {
            name: 'estimated_processing_time',
            type: 'varchar',
            length: '50',
            default: "'Instant'",
          },
          {
            name: 'operating_hours',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'adapter_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'adapter_config',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'priority',
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

    // Create indexes for bill_providers
    await queryRunner.createIndex(
      'bill_providers',
      new TableIndex({
        name: 'IDX_bill_providers_country_category_active',
        columnNames: ['country', 'category', 'is_active'],
      }),
    );

    await queryRunner.createIndex(
      'bill_providers',
      new TableIndex({
        name: 'IDX_bill_providers_name',
        columnNames: ['name'],
      }),
    );

    // Create bill_payments table
    await queryRunner.createTable(
      new Table({
        name: 'bill_payments',
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
          },
          {
            name: 'wallet_id',
            type: 'uuid',
          },
          {
            name: 'transaction_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'provider_id',
            type: 'uuid',
          },
          {
            name: 'category',
            type: 'varchar',
            length: '30',
          },
          {
            name: 'account_number',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'meter_number',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'customer_name',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 18,
            scale: 2,
          },
          {
            name: 'fee',
            type: 'decimal',
            precision: 18,
            scale: 4,
            default: 0,
          },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 18,
            scale: 2,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
            default: "'pending'",
          },
          {
            name: 'receipt_number',
            type: 'varchar',
            length: '100',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'provider_reference',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'token_number',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'units',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'idempotency_key',
            type: 'varchar',
            length: '100',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'failure_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'retry_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'metadata',
            type: 'jsonb',
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
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'refunded_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes for bill_payments
    await queryRunner.createIndex(
      'bill_payments',
      new TableIndex({
        name: 'IDX_bill_payments_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'bill_payments',
      new TableIndex({
        name: 'IDX_bill_payments_wallet_id',
        columnNames: ['wallet_id'],
      }),
    );

    await queryRunner.createIndex(
      'bill_payments',
      new TableIndex({
        name: 'IDX_bill_payments_transaction_id',
        columnNames: ['transaction_id'],
      }),
    );

    await queryRunner.createIndex(
      'bill_payments',
      new TableIndex({
        name: 'IDX_bill_payments_provider_id',
        columnNames: ['provider_id'],
      }),
    );

    await queryRunner.createIndex(
      'bill_payments',
      new TableIndex({
        name: 'IDX_bill_payments_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'bill_payments',
      new TableIndex({
        name: 'IDX_bill_payments_user_created',
        columnNames: ['user_id', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'bill_payments',
      new TableIndex({
        name: 'IDX_bill_payments_status_created',
        columnNames: ['status', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'bill_payments',
      new TableIndex({
        name: 'IDX_bill_payments_receipt_number',
        columnNames: ['receipt_number'],
      }),
    );

    await queryRunner.createIndex(
      'bill_payments',
      new TableIndex({
        name: 'IDX_bill_payments_idempotency_key',
        columnNames: ['idempotency_key'],
      }),
    );

    await queryRunner.createIndex(
      'bill_payments',
      new TableIndex({
        name: 'IDX_bill_payments_provider_reference',
        columnNames: ['provider_reference'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'bill_payments',
      new TableForeignKey({
        columnNames: ['provider_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'bill_providers',
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'bill_payments',
      new TableForeignKey({
        columnNames: ['wallet_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'wallets',
        onDelete: 'RESTRICT',
      }),
    );

    // Insert seed data for providers
    await queryRunner.query(`
      INSERT INTO bill_providers (
        name, short_name, category, country, logo, requires_account_number,
        requires_meter_number, account_number_label, minimum_amount, maximum_amount,
        processing_fee, processing_fee_type, currency, adapter_type, priority
      ) VALUES
      -- Ivory Coast Electricity
      ('CIE - Compagnie Ivoirienne d''Electricite', 'CIE', 'electricity', 'CI',
       'https://cdn.joonapay.com/providers/cie.png', true, true, 'Contract Number',
       500, 1000000, 100, 'fixed', 'XOF', 'cie', 100),

      -- Ivory Coast Water
      ('SODECI - Societe de Distribution d''Eau', 'SODECI', 'water', 'CI',
       'https://cdn.joonapay.com/providers/sodeci.png', true, true, 'Subscriber Number',
       500, 500000, 100, 'fixed', 'XOF', 'sodeci', 100),

      -- Phone Credits - Orange
      ('Orange Airtime', 'Orange', 'phone_credit', 'CI',
       'https://cdn.joonapay.com/providers/orange.png', true, false, 'Phone Number',
       100, 100000, 0, 'fixed', 'XOF', 'orange', 100),

      -- Phone Credits - MTN
      ('MTN Airtime', 'MTN', 'phone_credit', 'CI',
       'https://cdn.joonapay.com/providers/mtn.png', true, false, 'Phone Number',
       100, 100000, 0, 'fixed', 'XOF', 'mtn', 90),

      -- Phone Credits - Moov
      ('Moov Africa Airtime', 'Moov', 'phone_credit', 'CI',
       'https://cdn.joonapay.com/providers/moov.png', true, false, 'Phone Number',
       100, 100000, 0, 'fixed', 'XOF', 'moov', 80),

      -- Senegal Orange
      ('Orange Airtime Senegal', 'Orange SN', 'phone_credit', 'SN',
       'https://cdn.joonapay.com/providers/orange.png', true, false, 'Phone Number',
       100, 100000, 0, 'fixed', 'XOF', 'orange', 100),

      -- Mali Orange
      ('Orange Airtime Mali', 'Orange ML', 'phone_credit', 'ML',
       'https://cdn.joonapay.com/providers/orange.png', true, false, 'Phone Number',
       100, 100000, 0, 'fixed', 'XOF', 'orange', 100),

      -- Burkina Faso Orange
      ('Orange Airtime Burkina', 'Orange BF', 'phone_credit', 'BF',
       'https://cdn.joonapay.com/providers/orange.png', true, false, 'Phone Number',
       100, 100000, 0, 'fixed', 'XOF', 'orange', 100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const billPaymentsTable = await queryRunner.getTable('bill_payments');
    if (billPaymentsTable) {
      const foreignKeys = billPaymentsTable.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('bill_payments', fk);
      }
    }

    // Drop indexes and tables
    await queryRunner.dropTable('bill_payments', true);
    await queryRunner.dropTable('bill_providers', true);
  }
}
