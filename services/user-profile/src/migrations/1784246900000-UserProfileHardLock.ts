import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserProfileHardLock1784246900000 implements MigrationInterface {
  name = 'UserProfileHardLock1784246900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_profile"."user_profile"
        ADD COLUMN IF NOT EXISTS "is_hard_locked" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "user_profile"."user_profile"
        ADD COLUMN IF NOT EXISTS "hard_locked_at" TIMESTAMPTZ NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "user_profile"."user_profile"
        ADD COLUMN IF NOT EXISTS "hard_locked_by" character varying(128) NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_profile_hard_locked"
        ON "user_profile"."user_profile" ("is_hard_locked")
        WHERE "is_hard_locked" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "user_profile"."IDX_user_profile_hard_locked"`,
    );
    await queryRunner.query(`
      ALTER TABLE "user_profile"."user_profile"
        DROP COLUMN IF EXISTS "hard_locked_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_profile"."user_profile"
        DROP COLUMN IF EXISTS "hard_locked_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_profile"."user_profile"
        DROP COLUMN IF EXISTS "is_hard_locked"
    `);
  }
}
