import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSecurityNotificationTypes1738300000000 implements MigrationInterface {
  name = 'AddSecurityNotificationTypes1738300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new notification types to the enum
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'withdrawal_pending';
    `);
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'new_device_login';
    `);
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'large_transaction';
    `);
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'address_whitelisted';
    `);
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'security_alert';
    `);
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'price_alert';
    `);
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'weekly_summary';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL doesn't support removing enum values directly
    // Would need to recreate the type which is complex and risky
    // So we just leave the values in place
    console.warn(
      'Cannot remove enum values in PostgreSQL without recreating the type',
    );
  }
}
