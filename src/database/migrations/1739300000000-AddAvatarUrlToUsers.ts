import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarUrlToUsers1739300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const userTable = await this.resolveUsersTable(queryRunner);
    await queryRunner.query(`
      ALTER TABLE ${userTable}
      ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512) DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const userTable = await this.resolveUsersTable(queryRunner);
    await queryRunner.query(`
      ALTER TABLE ${userTable}
      DROP COLUMN IF EXISTS avatar_url
    `);
  }

  private async resolveUsersTable(queryRunner: QueryRunner): Promise<string> {
    const result = await queryRunner.query(`
      SELECT table_schema
      FROM information_schema.tables
      WHERE table_name = 'users'
        AND table_schema IN ('auth', 'public')
      ORDER BY CASE table_schema WHEN 'auth' THEN 0 ELSE 1 END
      LIMIT 1
    `);

    const schema = result[0]?.table_schema || 'public';
    return `"${schema}"."users"`;
  }
}
