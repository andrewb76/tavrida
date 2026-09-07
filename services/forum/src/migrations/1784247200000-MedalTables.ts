import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MedalTables1784247200000 implements MigrationInterface {
  name = 'MedalTables1784247200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "forum"."medal" (
        "id"           uuid NOT NULL,
        "name"         varchar(200) NOT NULL,
        "description"  text NOT NULL DEFAULT '',
        "icon_url"     varchar(512),
        "disp_position" int NOT NULL DEFAULT 0,
        "created_at"   timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_medal" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "forum"."user_medal" (
        "user_id"    varchar(128) NOT NULL,
        "medal_id"   uuid NOT NULL,
        "awarded_at" timestamptz NOT NULL DEFAULT now(),
        "awarded_by" varchar(128),
        "reason"     varchar(512),
        "revoked_at" timestamptz,
        CONSTRAINT "PK_user_medal" PRIMARY KEY ("user_id", "medal_id")
      )
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_user_medal_user" ON "forum"."user_medal" ("user_id")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "idx_user_medal_medal" ON "forum"."user_medal" ("medal_id")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "forum"."user_medal"');
    await queryRunner.query('DROP TABLE "forum"."medal"');
  }
}
