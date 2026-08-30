import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastSeenAt1784247300000 implements MigrationInterface {
  name = 'AddLastSeenAt1784247300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profile"."user_profile"
        ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMPTZ NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profile"."user_profile"
        DROP COLUMN IF EXISTS "last_seen_at"
    `);
  }
}
