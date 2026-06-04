import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateLinkedBankAccountsTable1738960000000 implements MigrationInterface {
  name = 'CreateLinkedBankAccountsTable1738960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "wallet"`);

    await queryRunner.createTable(
      new Table({
        name: 'linked_bank_accounts',
        schema: 'wallet',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'wallet_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'bank_code',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'bank_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'bank_logo_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'account_number_encrypted',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'account_number_masked',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'account_holder_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'is_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_primary',
            type: 'boolean',
            default: false,
          },
          {
            name: 'country_code',
            type: 'varchar',
            length: '2',
            default: "'CI'",
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'XOF'",
          },
          {
            name: 'available_balance',
            type: 'decimal',
            precision: 18,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'last_balance_check_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_verified_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'verification_method',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'supports_balance_check',
            type: 'boolean',
            default: false,
          },
          {
            name: 'supports_direct_debit',
            type: 'boolean',
            default: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes using raw SQL (TypeORM createIndex doesn't handle schemas well)
    await queryRunner.query(`
      CREATE INDEX "IDX_linked_bank_accounts_wallet_id" ON "wallet"."linked_bank_accounts" ("wallet_id");
      CREATE INDEX "IDX_linked_bank_accounts_bank_code" ON "wallet"."linked_bank_accounts" ("bank_code");
      CREATE INDEX "IDX_linked_bank_accounts_status" ON "wallet"."linked_bank_accounts" ("status");
      CREATE INDEX "IDX_linked_bank_accounts_wallet_primary" ON "wallet"."linked_bank_accounts" ("wallet_id", "is_primary");
      CREATE INDEX "IDX_linked_bank_accounts_wallet_status" ON "wallet"."linked_bank_accounts" ("wallet_id", "status");
    `);

    // Create banks reference table
    await queryRunner.createTable(
      new Table({
        name: 'banks',
        schema: 'wallet',
        columns: [
          {
            name: 'code',
            type: 'varchar',
            length: '20',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'logo_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '2',
            default: "'CI'",
          },
          {
            name: 'verification_methods',
            type: 'jsonb',
            default: '\'["otp"]\'',
          },
          {
            name: 'supports_balance_check',
            type: 'boolean',
            default: false,
          },
          {
            name: 'supports_direct_debit',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes using raw SQL
    await queryRunner.query(`
      CREATE INDEX "IDX_banks_country" ON "wallet"."banks" ("country");
      CREATE INDEX "IDX_banks_active" ON "wallet"."banks" ("is_active");
    `);

    // Insert default banks
    await queryRunner.query(`
      INSERT INTO wallet.banks (code, name, logo_url, country, verification_methods, supports_balance_check, supports_direct_debit)
      VALUES
        ('NSIA', 'NSIA Banque', 'https://via.placeholder.com/100x100?text=NSIA', 'CI', '["otp"]', true, true),
        ('ECOBANK', 'Ecobank', 'https://via.placeholder.com/100x100?text=ECO', 'CI', '["otp"]', false, true),
        ('SGCI', 'Société Générale', 'https://via.placeholder.com/100x100?text=SG', 'CI', '["otp"]', false, true),
        ('BOA', 'Bank of Africa', 'https://via.placeholder.com/100x100?text=BOA', 'CI', '["otp"]', false, true);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "wallet"."linked_bank_accounts" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet"."banks" CASCADE`);
  }
}
