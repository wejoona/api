import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSavingsPotsFields1744100000000 implements MigrationInterface {
  name = 'AddSavingsPotsFields1744100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add emoji column for pot customization (supports emoji characters)
    await queryRunner.query(`
      ALTER TABLE "wallet"."savings_pots"
      ADD COLUMN "emoji" varchar(10) NULL
    `);

    // Add color column for storing hex color value (Flutter Color.value)
    await queryRunner.query(`
      ALTER TABLE "wallet"."savings_pots"
      ADD COLUMN "color" integer NULL
    `);

    // Add comment for documentation
    await queryRunner.query(`
      COMMENT ON COLUMN "wallet"."savings_pots"."emoji" IS 'Emoji icon for pot display (e.g., airplane, phone, hospital)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "wallet"."savings_pots"."color" IS 'Color value as 32-bit integer (Flutter Color.value format, e.g., 0xFF4A90E2)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wallet"."savings_pots"
      DROP COLUMN "color"
    `);

    await queryRunner.query(`
      ALTER TABLE "wallet"."savings_pots"
      DROP COLUMN "emoji"
    `);
  }
}
