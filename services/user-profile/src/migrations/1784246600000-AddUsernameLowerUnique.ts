import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsernameLowerUnique1784246600000 implements MigrationInterface {
  name = 'AddUsernameLowerUnique1784246600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_user_profile_username_lower"
      ON "user_profile"."user_profile" (lower("username"))
      WHERE "username" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "user_profile"."uq_user_profile_username_lower"`,
    );
  }
}
