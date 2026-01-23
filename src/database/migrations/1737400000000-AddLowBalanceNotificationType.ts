import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add 'low_balance' to notification_type_enum
 *
 * Adds a new notification type for low balance alerts triggered by balance monitors.
 */
export class AddLowBalanceNotificationType1737400000000
  implements MigrationInterface
{
  name = 'AddLowBalanceNotificationType1737400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'low_balance' to the notification_type_enum
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'low_balance'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values easily
    // This would require recreating the type and updating all references
    // For safety, we leave the enum value in place during rollback
    console.log(
      'Note: Rollback does not remove low_balance from notification_type_enum',
    );
  }
}
