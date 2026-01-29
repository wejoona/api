import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add New Notification Types
 *
 * Adds additional notification types to support:
 * - transfer_complete (distinct from transfer_sent)
 * - deposit_complete (alias for completed)
 * - withdrawal_complete (alias for completed)
 * - kyc_update (generic KYC notification)
 */
export class AddNotificationTypes1738800000000 implements MigrationInterface {
  name = 'AddNotificationTypes1738800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new values to the notification type enum
    // PostgreSQL requires ALTER TYPE ... ADD VALUE
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'transfer_complete'
    `);

    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'deposit_complete'
    `);

    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'withdrawal_complete'
    `);

    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'kyc_update'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL does not support removing values from an enum
    // To properly downgrade, you would need to:
    // 1. Create a new enum without the values
    // 2. Update the column to use the new enum
    // 3. Drop the old enum
    //
    // Since this is a non-destructive addition, we leave the down migration empty
    // The values will simply not be used anymore
    console.log(
      'Note: Enum values cannot be removed in PostgreSQL. The added types will remain.',
    );
  }
}
