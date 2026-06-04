import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeatureSubscriptionsTable1745300000000 implements MigrationInterface {
  name = 'CreateFeatureSubscriptionsTable1745300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "system"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system"."feature_subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "feature_key" varchar(100) NOT NULL,
        "source" varchar(100) NOT NULL,
        "status" varchar(30) NOT NULL DEFAULT 'subscribed',
        "phone" varchar(32),
        "email" varchar(254),
        "metadata" jsonb,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_feature_subscriptions_user_feature_source"
          UNIQUE ("user_id", "feature_key", "source")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_feature_subscriptions_user_id"
      ON "system"."feature_subscriptions" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_feature_subscriptions_feature_key"
      ON "system"."feature_subscriptions" ("feature_key")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_feature_subscriptions_source"
      ON "system"."feature_subscriptions" ("source")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "system"."feature_subscriptions"
    `);
  }
}
