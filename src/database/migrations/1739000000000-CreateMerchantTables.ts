import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMerchantTables1739000000000 implements MigrationInterface {
  name = 'CreateMerchantTables1739000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "merchant_category_enum" AS ENUM (
        'retail', 'restaurant', 'grocery', 'transport',
        'services', 'healthcare', 'education', 'entertainment', 'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "merchant_status_enum" AS ENUM (
        'pending', 'active', 'suspended', 'closed'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "payment_request_status_enum" AS ENUM (
        'pending', 'paid', 'expired', 'cancelled'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "merchant_payment_status_enum" AS ENUM (
        'completed', 'refunded', 'failed'
      )
    `);

    // Create merchants table
    await queryRunner.createTable(
      new Table({
        name: 'merchants',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'business_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'display_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'owner_id',
            type: 'uuid',
          },
          {
            name: 'category',
            type: 'merchant_category_enum',
            default: "'other'",
          },
          {
            name: 'country',
            type: 'varchar',
            length: '2',
          },
          {
            name: 'wallet_id',
            type: 'uuid',
          },
          {
            name: 'qr_code',
            type: 'text',
          },
          {
            name: 'qr_code_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'is_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'fee_percent',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 1.5,
          },
          {
            name: 'daily_limit',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 10000,
          },
          {
            name: 'monthly_limit',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 100000,
          },
          {
            name: 'daily_volume',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'monthly_volume',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'total_transactions',
            type: 'int',
            default: 0,
          },
          {
            name: 'status',
            type: 'merchant_status_enum',
            default: "'pending'",
          },
          {
            name: 'business_address',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'business_phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'business_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'tax_id',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'logo_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'webhook_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
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
        foreignKeys: [
          {
            columnNames: ['owner_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['wallet_id'],
            referencedTableName: 'wallets',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create payment_requests table
    await queryRunner.createTable(
      new Table({
        name: 'payment_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'request_id',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          {
            name: 'merchant_id',
            type: 'uuid',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
            default: "'USDC'",
          },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'reference',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
          },
          {
            name: 'status',
            type: 'payment_request_status_enum',
            default: "'pending'",
          },
          {
            name: 'qr_data',
            type: 'text',
          },
          {
            name: 'paid_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'payment_id',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'customer_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
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
        foreignKeys: [
          {
            columnNames: ['merchant_id'],
            referencedTableName: 'merchants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['customer_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    // Create merchant_payments table
    await queryRunner.createTable(
      new Table({
        name: 'merchant_payments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'payment_id',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          {
            name: 'merchant_id',
            type: 'uuid',
          },
          {
            name: 'customer_id',
            type: 'uuid',
          },
          {
            name: 'customer_wallet_id',
            type: 'uuid',
          },
          {
            name: 'merchant_wallet_id',
            type: 'uuid',
          },
          {
            name: 'payment_request_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'fee',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
          },
          {
            name: 'net_amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
            default: "'USDC'",
          },
          {
            name: 'reference',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'merchant_payment_status_enum',
            default: "'completed'",
          },
          {
            name: 'tx_hash',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'ledger_transaction_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'refunded_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'refund_reason',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
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
        foreignKeys: [
          {
            columnNames: ['merchant_id'],
            referencedTableName: 'merchants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['customer_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['customer_wallet_id'],
            referencedTableName: 'wallets',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['merchant_wallet_id'],
            referencedTableName: 'wallets',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create indexes for merchants
    await queryRunner.createIndex(
      'merchants',
      new TableIndex({ columnNames: ['business_name'] }),
    );
    await queryRunner.createIndex(
      'merchants',
      new TableIndex({ columnNames: ['owner_id'] }),
    );
    await queryRunner.createIndex(
      'merchants',
      new TableIndex({ columnNames: ['wallet_id'] }),
    );
    await queryRunner.createIndex(
      'merchants',
      new TableIndex({ columnNames: ['country'] }),
    );
    await queryRunner.createIndex(
      'merchants',
      new TableIndex({ columnNames: ['status'] }),
    );
    await queryRunner.createIndex(
      'merchants',
      new TableIndex({ columnNames: ['is_verified'] }),
    );

    // Create indexes for payment_requests
    await queryRunner.createIndex(
      'payment_requests',
      new TableIndex({ columnNames: ['request_id'] }),
    );
    await queryRunner.createIndex(
      'payment_requests',
      new TableIndex({ columnNames: ['merchant_id'] }),
    );
    await queryRunner.createIndex(
      'payment_requests',
      new TableIndex({ columnNames: ['expires_at'] }),
    );
    await queryRunner.createIndex(
      'payment_requests',
      new TableIndex({ columnNames: ['status'] }),
    );
    await queryRunner.createIndex(
      'payment_requests',
      new TableIndex({ columnNames: ['customer_id'] }),
    );

    // Create indexes for merchant_payments
    await queryRunner.createIndex(
      'merchant_payments',
      new TableIndex({ columnNames: ['payment_id'] }),
    );
    await queryRunner.createIndex(
      'merchant_payments',
      new TableIndex({ columnNames: ['merchant_id'] }),
    );
    await queryRunner.createIndex(
      'merchant_payments',
      new TableIndex({ columnNames: ['customer_id'] }),
    );
    await queryRunner.createIndex(
      'merchant_payments',
      new TableIndex({ columnNames: ['payment_request_id'] }),
    );
    await queryRunner.createIndex(
      'merchant_payments',
      new TableIndex({ columnNames: ['reference'] }),
    );
    await queryRunner.createIndex(
      'merchant_payments',
      new TableIndex({ columnNames: ['status'] }),
    );
    await queryRunner.createIndex(
      'merchant_payments',
      new TableIndex({ columnNames: ['created_at'] }),
    );

    // Create composite indexes for common queries
    await queryRunner.createIndex(
      'merchant_payments',
      new TableIndex({
        name: 'idx_merchant_payments_merchant_date',
        columnNames: ['merchant_id', 'created_at'],
      }),
    );
    await queryRunner.createIndex(
      'merchant_payments',
      new TableIndex({
        name: 'idx_merchant_payments_customer_date',
        columnNames: ['customer_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'merchant_payments',
      'idx_merchant_payments_customer_date',
    );
    await queryRunner.dropIndex(
      'merchant_payments',
      'idx_merchant_payments_merchant_date',
    );

    // Drop tables
    await queryRunner.dropTable('merchant_payments');
    await queryRunner.dropTable('payment_requests');
    await queryRunner.dropTable('merchants');

    // Drop enum types
    await queryRunner.query('DROP TYPE "merchant_payment_status_enum"');
    await queryRunner.query('DROP TYPE "payment_request_status_enum"');
    await queryRunner.query('DROP TYPE "merchant_status_enum"');
    await queryRunner.query('DROP TYPE "merchant_category_enum"');
  }
}
