import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialChatSchema1784246700000 implements MigrationInterface {
  name = 'InitialChatSchema1784246700000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = (await queryRunner.query(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> $2",
      ['chat', 'chat_migrations'],
    )) as Array<{ count: number }>;

    if (Number(count) > 0) {
      const rows = (await queryRunner.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE'",
        ['chat'],
      )) as Array<{ table_name: string }>;
      const existing = new Set(rows.map((row) => row.table_name));
      const expected = [
        'chat',
        'chat_member',
        'message',
        'message_attachment',
        'outbox_message',
      ] as const;
      const missing = expected.filter((table) => !existing.has(table));
      if (missing.length > 0) {
        throw new Error(
          'Cannot baseline chat schema; missing tables: ' + missing.join(', '),
        );
      }
      return;
    }

    await queryRunner.query(`
      CREATE TABLE "chat"."chat" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "kind" character varying(16) NOT NULL,
        "self" boolean NOT NULL DEFAULT false,
        "direct_key" character varying(280),
        "context_type" character varying(32),
        "context_id" uuid,
        "title" character varying(120),
        "spawned_from_chat_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_chat_direct_key" ON "chat"."chat" ("direct_key") WHERE "direct_key" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_chat_topic_context" ON "chat"."chat" ("context_type", "context_id") WHERE "context_type" = 'FORUM_TOPIC' AND "context_id" IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "chat"."chat_member" (
        "chat_id" uuid NOT NULL,
        "user_id" character varying(128) NOT NULL,
        "role" character varying(16) NOT NULL DEFAULT 'MEMBER',
        "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "hidden_at" TIMESTAMP WITH TIME ZONE,
        "left_at" TIMESTAMP WITH TIME ZONE,
        "last_read_message_id" uuid,
        "last_read_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_chat_member" PRIMARY KEY ("chat_id", "user_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_chat_member_user" ON "chat"."chat_member" ("user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "chat"."message" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "chat_id" uuid NOT NULL,
        "author_id" character varying(128) NOT NULL,
        "body" text NOT NULL,
        "mentions" jsonb NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "edited_at" TIMESTAMP WITH TIME ZONE,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_message" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_message_chat_created" ON "chat"."message" ("chat_id", "created_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "chat"."message_attachment" (
        "message_id" uuid NOT NULL,
        "media_object_id" uuid NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_message_attachment" PRIMARY KEY ("message_id", "media_object_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "chat"."outbox_message" (
        "event_id" uuid NOT NULL,
        "event_type" character varying(128) NOT NULL,
        "envelope" jsonb NOT NULL,
        "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "available_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "attempt_count" integer NOT NULL DEFAULT 0,
        "published_at" TIMESTAMP WITH TIME ZONE,
        "last_error" text,
        "locked_until" TIMESTAMP WITH TIME ZONE,
        "locked_by" character varying(128),
        CONSTRAINT "PK_chat_outbox_message" PRIMARY KEY ("event_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_outbox_pending" ON "chat"."outbox_message" ("available_at") WHERE "published_at" IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat"."outbox_message"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat"."message_attachment"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat"."message"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat"."chat_member"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat"."chat"`);
  }
}
