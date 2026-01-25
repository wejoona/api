import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateNotificationPreferencesTable1738600000000 implements MigrationInterface {
  name = 'CreateNotificationPreferencesTable1738600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notification_preferences table
    await queryRunner.createTable(
      new Table({
        name: 'notification_preferences',
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
            isUnique: true,
          },
          // Push notification settings
          {
            name: 'push_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'push_transactions',
            type: 'boolean',
            default: true,
          },
          {
            name: 'push_security',
            type: 'boolean',
            default: true,
          },
          {
            name: 'push_marketing',
            type: 'boolean',
            default: false,
          },
          // Email notification settings
          {
            name: 'email_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'email_transactions',
            type: 'boolean',
            default: true,
          },
          {
            name: 'email_monthly_statement',
            type: 'boolean',
            default: true,
          },
          {
            name: 'email_marketing',
            type: 'boolean',
            default: false,
          },
          // SMS notification settings
          {
            name: 'sms_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'sms_transactions',
            type: 'boolean',
            default: true,
          },
          {
            name: 'sms_security',
            type: 'boolean',
            default: true,
          },
          // Thresholds
          {
            name: 'large_transaction_threshold',
            type: 'decimal',
            precision: 18,
            scale: 6,
            default: 1000,
          },
          {
            name: 'low_balance_threshold',
            type: 'decimal',
            precision: 18,
            scale: 6,
            default: 100,
          },
          // Timestamps
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

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'notification_preferences',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Add index for user_id lookups
    await queryRunner.createIndex(
      'notification_preferences',
      new TableIndex({
        name: 'IDX_notification_preferences_user_id',
        columnNames: ['user_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable('notification_preferences');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('notification_preferences', foreignKey);
      }
    }

    // Drop index
    await queryRunner.dropIndex(
      'notification_preferences',
      'IDX_notification_preferences_user_id',
    );

    // Drop table
    await queryRunner.dropTable('notification_preferences');
  }
}
