import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ForumCategoryAcl1784246700000 implements MigrationInterface {
  name = 'ForumCategoryAcl1784246700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "forum"."category_allowed_user"`);
  }
}
