import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ForumAccessGroups1784246800000 implements MigrationInterface {
  name = 'ForumAccessGroups1784246800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "forum"."category_allowed_user"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "forum"."access_group" (
        "id" uuid NOT NULL,
        "name" character varying(128) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_forum_access_group" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_forum_access_group_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "forum"."access_group_member" (
        "group_id" uuid NOT NULL,
        "user_id" character varying(128) NOT NULL,
        CONSTRAINT "PK_forum_access_group_member" PRIMARY KEY ("group_id", "user_id"),
        CONSTRAINT "FK_forum_access_group_member_group"
          FOREIGN KEY ("group_id") REFERENCES "forum"."access_group"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_forum_access_group_member_user"
        ON "forum"."access_group_member" ("user_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "forum"."category_access_group" (
        "category_id" uuid NOT NULL,
        "group_id" uuid NOT NULL,
        CONSTRAINT "PK_forum_category_access_group" PRIMARY KEY ("category_id", "group_id"),
        CONSTRAINT "FK_forum_category_access_group_category"
          FOREIGN KEY ("category_id") REFERENCES "forum"."category"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_forum_category_access_group_group"
          FOREIGN KEY ("group_id") REFERENCES "forum"."access_group"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_forum_category_access_group_group"
        ON "forum"."category_access_group" ("group_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "forum"."category_access_group"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "forum"."access_group_member"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "forum"."access_group"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "forum"."category_allowed_user" (
        "category_id" uuid NOT NULL,
        "user_id" character varying(128) NOT NULL,
        CONSTRAINT "PK_forum_category_allowed_user" PRIMARY KEY ("category_id", "user_id"),
        CONSTRAINT "FK_forum_category_allowed_user_category"
          FOREIGN KEY ("category_id") REFERENCES "forum"."category"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_forum_category_allowed_user_user"
        ON "forum"."category_allowed_user" ("user_id")
    `);
  }
}
