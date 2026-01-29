import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDevicesTable1741100000000 implements MigrationInterface {
  name = 'CreateDevicesTable1741100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create platform enum
    await queryRunner.query(`
      CREATE TYPE "auth"."device_platform" AS ENUM ('ios', 'android', 'web')
    `);

    // Create devices table
    await queryRunner.query(`
      CREATE TABLE "auth"."devices" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "device_identifier" varchar(255) NOT NULL,
        "brand" varchar(100),
        "model" varchar(100),
        "os" varchar(50),
        "os_version" varchar(50),
        "app_version" varchar(50),
        "platform" "auth"."device_platform" DEFAULT 'android',
        "fcm_token" varchar(500),
        "is_trusted" boolean DEFAULT false,
        "trusted_at" timestamp,
        "is_active" boolean DEFAULT true,
        "last_login_at" timestamp,
        "last_ip_address" varchar(45),
        "login_count" integer DEFAULT 0,
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "UQ_devices_user_device" UNIQUE ("user_id", "device_identifier"),
        CONSTRAINT "FK_devices_user" FOREIGN KEY ("user_id")
          REFERENCES "auth"."users"("id") ON DELETE CASCADE
      )
    `);

    // Index for FCM token lookups (for push notifications)
    await queryRunner.query(`
      CREATE INDEX "IDX_devices_fcm_token"
      ON "auth"."devices" ("fcm_token")
      WHERE "fcm_token" IS NOT NULL
    `);

    // Index for user's active devices
    await queryRunner.query(`
      CREATE INDEX "IDX_devices_user_active"
      ON "auth"."devices" ("user_id", "is_active")
      WHERE "is_active" = true
    `);

    // Index for user lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_devices_user_id"
      ON "auth"."devices" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth"."devices"`);
    await queryRunner.query(`DROP TYPE "auth"."device_platform"`);
  }
}
