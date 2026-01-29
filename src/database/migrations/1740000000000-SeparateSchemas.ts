import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to separate database tables into PostgreSQL schemas by concern.
 *
 * Schema structure:
 * - auth: User authentication and identity
 * - wallet: Core wallet functionality
 * - merchant: Merchant payment processing
 * - payments: Bill payments
 * - compliance: Regulatory compliance and monitoring
 * - notifications: Push notifications and preferences
 * - referral: Referral program
 * - social: Social features (contacts)
 * - system: System administration and audit
 *
 * Important: Tables are moved in dependency order to handle foreign key constraints.
 * Parent tables (referenced by FKs) are moved before child tables.
 */
export class SeparateSchemas1740000000000 implements MigrationInterface {
  name = 'SeparateSchemas1740000000000';

  // Schema definitions with their tables in dependency order
  private readonly schemas = {
    auth: ['users', 'kyc_verifications', 'blacklisted_devices'],
    wallet: ['wallets', 'transactions', 'transfers', 'whitelisted_addresses'],
    merchant: ['merchants', 'payment_requests', 'merchant_payments'],
    payments: ['bill_providers', 'bill_payments'],
    compliance: [
      'monitoring_rules',
      'compliance_reports',
      'compliance_alerts',
      'suspicious_activity_reports',
      'transaction_alerts',
      'user_alert_preferences',
    ],
    notifications: [
      'notifications',
      'device_tokens',
      'fcm_tokens',
      'notification_preferences',
    ],
    referral: ['referrals', 'referral_stats'],
    social: ['contacts'],
    system: [
      'audit_logs',
      'system_metrics',
      'scheduled_jobs',
      'webhook_deadletters',
      'sub_accounts',
    ],
  };

  // Tables in the order they should be moved (respecting FK dependencies)
  // Parent tables first, then child tables
  private readonly migrationOrder = [
    // auth schema - users first (referenced by many tables)
    { table: 'users', schema: 'auth' },
    { table: 'kyc_verifications', schema: 'auth' },
    { table: 'blacklisted_devices', schema: 'auth' },

    // wallet schema - wallets before transactions
    { table: 'wallets', schema: 'wallet' },
    { table: 'transactions', schema: 'wallet' },
    { table: 'transfers', schema: 'wallet' },
    { table: 'whitelisted_addresses', schema: 'wallet' },

    // merchant schema - merchants before payments
    { table: 'merchants', schema: 'merchant' },
    { table: 'payment_requests', schema: 'merchant' },
    { table: 'merchant_payments', schema: 'merchant' },

    // payments schema - providers before payments
    { table: 'bill_providers', schema: 'payments' },
    { table: 'bill_payments', schema: 'payments' },

    // compliance schema - rules before alerts
    { table: 'monitoring_rules', schema: 'compliance' },
    { table: 'compliance_reports', schema: 'compliance' },
    { table: 'compliance_alerts', schema: 'compliance' },
    { table: 'suspicious_activity_reports', schema: 'compliance' },
    { table: 'transaction_alerts', schema: 'compliance' },
    { table: 'user_alert_preferences', schema: 'compliance' },

    // notifications schema
    { table: 'notifications', schema: 'notifications' },
    { table: 'device_tokens', schema: 'notifications' },
    { table: 'fcm_tokens', schema: 'notifications' },
    { table: 'notification_preferences', schema: 'notifications' },

    // referral schema
    { table: 'referrals', schema: 'referral' },
    { table: 'referral_stats', schema: 'referral' },

    // social schema
    { table: 'contacts', schema: 'social' },

    // system schema
    { table: 'audit_logs', schema: 'system' },
    { table: 'system_metrics', schema: 'system' },
    { table: 'scheduled_jobs', schema: 'system' },
    { table: 'webhook_deadletters', schema: 'system' },
    { table: 'sub_accounts', schema: 'system' },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create all schemas
    console.log('Creating schemas...');
    for (const schemaName of Object.keys(this.schemas)) {
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      console.log(`  Created schema: ${schemaName}`);
    }

    // Step 2: Drop all foreign key constraints temporarily
    // This allows us to move tables freely without constraint violations
    console.log('Dropping foreign key constraints...');
    const foreignKeys = await this.getAllForeignKeys(queryRunner);
    for (const fk of foreignKeys) {
      await queryRunner.query(
        `ALTER TABLE "public"."${fk.table_name}" DROP CONSTRAINT "${fk.constraint_name}"`,
      );
      console.log(`  Dropped FK: ${fk.constraint_name} on ${fk.table_name}`);
    }

    // Step 3: Move tables to their respective schemas
    console.log('Moving tables to schemas...');
    for (const { table, schema } of this.migrationOrder) {
      // Check if table exists before moving
      const tableExists = await this.tableExists(queryRunner, 'public', table);
      if (tableExists) {
        await queryRunner.query(
          `ALTER TABLE "public"."${table}" SET SCHEMA "${schema}"`,
        );
        console.log(`  Moved ${table} -> ${schema}`);
      } else {
        console.log(`  Skipping ${table} (does not exist)`);
      }
    }

    // Step 4: Recreate foreign key constraints with cross-schema references
    console.log('Recreating foreign key constraints...');
    for (const fk of foreignKeys) {
      const sourceSchema = this.getSchemaForTable(fk.table_name);
      const targetSchema = this.getSchemaForTable(fk.referenced_table);

      // Only recreate if both tables exist in their schemas
      const sourceExists = await this.tableExists(
        queryRunner,
        sourceSchema,
        fk.table_name,
      );
      const targetExists = await this.tableExists(
        queryRunner,
        targetSchema,
        fk.referenced_table,
      );

      if (sourceExists && targetExists) {
        await queryRunner.query(`
          ALTER TABLE "${sourceSchema}"."${fk.table_name}"
          ADD CONSTRAINT "${fk.constraint_name}"
          FOREIGN KEY ("${fk.column_name}")
          REFERENCES "${targetSchema}"."${fk.referenced_table}"("${fk.referenced_column}")
          ON DELETE ${fk.on_delete} ON UPDATE ${fk.on_update}
        `);
        console.log(
          `  Recreated FK: ${fk.constraint_name} (${sourceSchema}.${fk.table_name} -> ${targetSchema}.${fk.referenced_table})`,
        );
      }
    }

    // Step 5: Update search_path to include all schemas for easier querying
    console.log('Setting default search_path...');
    const schemaList = ['public', ...Object.keys(this.schemas)].join(', ');
    // Get current database name first
    const dbNameResult = await queryRunner.query(`SELECT current_database()`);
    const dbName = dbNameResult[0].current_database;
    await queryRunner.query(
      `ALTER DATABASE "${dbName}" SET search_path TO ${schemaList}`,
    );

    console.log('Schema separation complete!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop all foreign key constraints
    console.log('Dropping foreign key constraints for rollback...');
    const foreignKeys = await this.getAllForeignKeysAllSchemas(queryRunner);
    for (const fk of foreignKeys) {
      await queryRunner.query(
        `ALTER TABLE "${fk.schema_name}"."${fk.table_name}" DROP CONSTRAINT "${fk.constraint_name}"`,
      );
      console.log(`  Dropped FK: ${fk.constraint_name}`);
    }

    // Step 2: Move all tables back to public schema (reverse order)
    console.log('Moving tables back to public schema...');
    const reversedOrder = [...this.migrationOrder].reverse();
    for (const { table, schema } of reversedOrder) {
      const tableExists = await this.tableExists(queryRunner, schema, table);
      if (tableExists) {
        await queryRunner.query(
          `ALTER TABLE "${schema}"."${table}" SET SCHEMA "public"`,
        );
        console.log(`  Moved ${schema}.${table} -> public`);
      }
    }

    // Step 3: Recreate foreign key constraints in public schema
    console.log('Recreating foreign key constraints in public schema...');
    for (const fk of foreignKeys) {
      const sourceExists = await this.tableExists(
        queryRunner,
        'public',
        fk.table_name,
      );
      const targetExists = await this.tableExists(
        queryRunner,
        'public',
        fk.referenced_table,
      );

      if (sourceExists && targetExists) {
        await queryRunner.query(`
          ALTER TABLE "public"."${fk.table_name}"
          ADD CONSTRAINT "${fk.constraint_name}"
          FOREIGN KEY ("${fk.column_name}")
          REFERENCES "public"."${fk.referenced_table}"("${fk.referenced_column}")
          ON DELETE ${fk.on_delete} ON UPDATE ${fk.on_update}
        `);
        console.log(`  Recreated FK: ${fk.constraint_name}`);
      }
    }

    // Step 4: Drop the schemas (they should be empty now)
    console.log('Dropping schemas...');
    for (const schemaName of Object.keys(this.schemas).reverse()) {
      await queryRunner.query(`DROP SCHEMA IF EXISTS "${schemaName}"`);
      console.log(`  Dropped schema: ${schemaName}`);
    }

    // Step 5: Reset search_path to default
    const dbNameResult = await queryRunner.query(`SELECT current_database()`);
    const dbName = dbNameResult[0].current_database;
    await queryRunner.query(
      `ALTER DATABASE "${dbName}" SET search_path TO public`,
    );

    console.log('Rollback complete - all tables restored to public schema.');
  }

  /**
   * Get all foreign key constraints from public schema
   */
  private async getAllForeignKeys(queryRunner: QueryRunner): Promise<
    Array<{
      constraint_name: string;
      table_name: string;
      column_name: string;
      referenced_table: string;
      referenced_column: string;
      on_delete: string;
      on_update: string;
    }>
  > {
    const result = await queryRunner.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column,
        rc.delete_rule AS on_delete,
        rc.update_rule AS on_update
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `);
    return result;
  }

  /**
   * Get all foreign key constraints from all custom schemas
   */
  private async getAllForeignKeysAllSchemas(queryRunner: QueryRunner): Promise<
    Array<{
      constraint_name: string;
      schema_name: string;
      table_name: string;
      column_name: string;
      referenced_table: string;
      referenced_column: string;
      on_delete: string;
      on_update: string;
    }>
  > {
    const schemaList = Object.keys(this.schemas)
      .map((s) => `'${s}'`)
      .join(', ');

    const result = await queryRunner.query(`
      SELECT
        tc.constraint_name,
        tc.table_schema AS schema_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column,
        rc.delete_rule AS on_delete,
        rc.update_rule AS on_update
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema IN (${schemaList})
      ORDER BY tc.table_name, tc.constraint_name
    `);
    return result;
  }

  /**
   * Check if a table exists in a given schema
   */
  private async tableExists(
    queryRunner: QueryRunner,
    schema: string,
    table: string,
  ): Promise<boolean> {
    const result = await queryRunner.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_name = $2
      ) AS exists
    `,
      [schema, table],
    );
    return result[0]?.exists === true;
  }

  /**
   * Get the target schema for a given table name
   */
  private getSchemaForTable(tableName: string): string {
    for (const [schema, tables] of Object.entries(this.schemas)) {
      if (tables.includes(tableName)) {
        return schema;
      }
    }
    return 'public'; // Default to public if not found
  }
}
