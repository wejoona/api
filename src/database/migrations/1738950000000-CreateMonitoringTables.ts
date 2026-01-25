import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateMonitoringTables1738950000000 implements MigrationInterface {
  name = 'CreateMonitoringTables1738950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create transaction_alerts table
    await queryRunner.createTable(
      new Table({
        name: 'transaction_alerts',
        columns: [
          {
            name: 'alert_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'transaction_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'alert_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'severity',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'is_read',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_action_required',
            type: 'boolean',
            default: false,
          },
          {
            name: 'action_taken',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'action_taken_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
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
      true
    );

    // Create indexes for transaction_alerts
    await queryRunner.createIndex(
      'transaction_alerts',
      new TableIndex({
        name: 'IDX_transaction_alerts_user_id',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'transaction_alerts',
      new TableIndex({
        name: 'IDX_transaction_alerts_transaction_id',
        columnNames: ['transaction_id'],
      })
    );

    await queryRunner.createIndex(
      'transaction_alerts',
      new TableIndex({
        name: 'IDX_transaction_alerts_alert_type',
        columnNames: ['alert_type'],
      })
    );

    await queryRunner.createIndex(
      'transaction_alerts',
      new TableIndex({
        name: 'IDX_transaction_alerts_user_created',
        columnNames: ['user_id', 'created_at'],
      })
    );

    await queryRunner.createIndex(
      'transaction_alerts',
      new TableIndex({
        name: 'IDX_transaction_alerts_user_read',
        columnNames: ['user_id', 'is_read'],
      })
    );

    await queryRunner.createIndex(
      'transaction_alerts',
      new TableIndex({
        name: 'IDX_transaction_alerts_severity_created',
        columnNames: ['severity', 'created_at'],
      })
    );

    // Create user_alert_preferences table
    await queryRunner.createTable(
      new Table({
        name: 'user_alert_preferences',
        columns: [
          {
            name: 'user_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'email_alerts',
            type: 'boolean',
            default: true,
          },
          {
            name: 'push_alerts',
            type: 'boolean',
            default: true,
          },
          {
            name: 'sms_alerts',
            type: 'boolean',
            default: false,
          },
          {
            name: 'large_transaction_threshold',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 1000,
          },
          {
            name: 'balance_low_threshold',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 10,
          },
          {
            name: 'balance_high_threshold',
            type: 'decimal',
            precision: 18,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'daily_limit_threshold',
            type: 'decimal',
            precision: 18,
            scale: 2,
            isNullable: true,
            default: 5000,
          },
          {
            name: 'alert_types',
            type: 'jsonb',
            default: "'[]'",
          },
          {
            name: 'quiet_hours_enabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'quiet_hours_start',
            type: 'varchar',
            length: '5',
            isNullable: true,
          },
          {
            name: 'quiet_hours_end',
            type: 'varchar',
            length: '5',
            isNullable: true,
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '50',
            default: "'UTC'",
          },
          {
            name: 'instant_critical_alerts',
            type: 'boolean',
            default: true,
          },
          {
            name: 'digest_frequency',
            type: 'varchar',
            length: '20',
            default: "'realtime'",
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
      true
    );

    // Create monitoring_rules table
    await queryRunner.createTable(
      new Table({
        name: 'monitoring_rules',
        columns: [
          {
            name: 'rule_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '30',
            isNullable: false,
          },
          {
            name: 'conditions',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'condition_logic',
            type: 'varchar',
            length: '10',
            default: "'AND'",
          },
          {
            name: 'action',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'priority',
            type: 'integer',
            default: 100,
          },
          {
            name: 'is_user_configurable',
            type: 'boolean',
            default: false,
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
      true
    );

    // Create indexes for monitoring_rules
    await queryRunner.createIndex(
      'monitoring_rules',
      new TableIndex({
        name: 'IDX_monitoring_rules_category',
        columnNames: ['category'],
      })
    );

    await queryRunner.createIndex(
      'monitoring_rules',
      new TableIndex({
        name: 'IDX_monitoring_rules_active_priority',
        columnNames: ['is_active', 'priority'],
      })
    );

    // Add foreign key constraints
    await queryRunner.createForeignKey(
      'transaction_alerts',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'user_alert_preferences',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const alertsTable = await queryRunner.getTable('transaction_alerts');
    const alertsForeignKey = alertsTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1
    );
    if (alertsForeignKey) {
      await queryRunner.dropForeignKey('transaction_alerts', alertsForeignKey);
    }

    const prefsTable = await queryRunner.getTable('user_alert_preferences');
    const prefsForeignKey = prefsTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1
    );
    if (prefsForeignKey) {
      await queryRunner.dropForeignKey('user_alert_preferences', prefsForeignKey);
    }

    // Drop tables
    await queryRunner.dropTable('monitoring_rules');
    await queryRunner.dropTable('user_alert_preferences');
    await queryRunner.dropTable('transaction_alerts');
  }
}
