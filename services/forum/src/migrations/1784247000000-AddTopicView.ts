import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTopicView1784247000000 implements MigrationInterface {
  name = 'AddTopicView1784247000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "forum"."topic_view" (
        "topic_id"  uuid NOT NULL,
        "user_id"   varchar(128) NOT NULL,
        "viewed_at" timestamptz  NOT NULL DEFAULT now(),
        "is_hidden" boolean      NOT NULL DEFAULT false,
        CONSTRAINT "PK_topic_view" PRIMARY KEY ("topic_id", "user_id")
      )`,
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_topic_view_topic" ON "forum"."topic_view" ("topic_id")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_topic_view_user" ON "forum"."topic_view" ("user_id")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "forum"."topic_view"');
  }
}
