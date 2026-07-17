import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialForumSchema1784246400000 implements MigrationInterface {
  name = 'InitialForumSchema1784246400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = (await queryRunner.query(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> $2",
      ['forum', 'forum_migrations'],
    )) as Array<{ count: number }>;

    if (Number(count) > 0) {
      const rows = (await queryRunner.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = \'BASE TABLE\'',
        ['forum'],
      )) as Array<{ table_name: string }>;
      const existing = new Set(rows.map((row) => row.table_name));
      const expected = ["topic","tag","reaction","content_vote","content_tag","comment","comment_closure","category"] as const;
      const missing = expected.filter((table) => !existing.has(table));
      if (missing.length > 0) {
        throw new Error(
          'Cannot baseline forum schema; missing tables: ' + missing.join(', '),
        );
      }
      return;
    }

    await queryRunner.query("CREATE TABLE \"forum\".\"topic\" (\"id\" uuid NOT NULL, \"category_id\" uuid NOT NULL, \"author_id\" character varying(128) NOT NULL, \"title\" character varying(256) NOT NULL, \"body\" text NOT NULL, \"attachments\" jsonb NOT NULL DEFAULT '[]', \"is_pinned\" boolean NOT NULL DEFAULT false, \"vote_plus_count\" integer NOT NULL DEFAULT '0', \"vote_minus_count\" integer NOT NULL DEFAULT '0', \"tags\" jsonb NOT NULL DEFAULT '[]', \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_33aa4ecb4e4f20aa0157ea7ef61\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE TABLE \"forum\".\"tag\" (\"id\" uuid NOT NULL, \"slug\" character varying(64) NOT NULL, \"display_name\" character varying(64) NOT NULL, \"description\" text, \"color\" character varying(32), \"is_official\" boolean NOT NULL DEFAULT false, \"is_hidden\" boolean NOT NULL DEFAULT false, \"usage_count\" integer NOT NULL DEFAULT '0', \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"UQ_3413aed3ecde54f832c4f44f045\" UNIQUE (\"slug\"), CONSTRAINT \"PK_8e4052373c579afc1471f526760\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE TABLE \"forum\".\"reaction\" (\"content_id\" uuid NOT NULL, \"content_type\" character varying(16) NOT NULL, \"user_id\" character varying(128) NOT NULL, \"emoji_key\" character varying(32) NOT NULL, \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_3613fc87c3d5403ba6ee2405450\" PRIMARY KEY (\"content_id\", \"user_id\"))");
    await queryRunner.query("CREATE TABLE \"forum\".\"content_vote\" (\"content_id\" uuid NOT NULL, \"content_type\" character varying(16) NOT NULL, \"user_id\" character varying(128) NOT NULL, \"value\" smallint NOT NULL, \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_6e256b87994eb34ee8143a2ed9d\" PRIMARY KEY (\"content_id\", \"user_id\"))");
    await queryRunner.query("CREATE TABLE \"forum\".\"content_tag\" (\"tag_id\" uuid NOT NULL, \"content_type\" character varying(32) NOT NULL, \"content_id\" uuid NOT NULL, \"priority\" integer, \"added_by\" character varying(128) NOT NULL, \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_4289c28fe74d8c22ed3a57725e1\" PRIMARY KEY (\"tag_id\", \"content_type\", \"content_id\"))");
    await queryRunner.query("CREATE TABLE \"forum\".\"comment\" (\"id\" uuid NOT NULL, \"topic_id\" uuid NOT NULL, \"author_id\" character varying(128) NOT NULL, \"parent_id\" uuid, \"body\" text NOT NULL, \"attachments\" jsonb NOT NULL DEFAULT '[]', \"promoted_topic_id\" uuid, \"vote_plus_count\" integer NOT NULL DEFAULT '0', \"vote_minus_count\" integer NOT NULL DEFAULT '0', \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_0b0e4bbc8415ec426f87f3a88e2\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE TABLE \"forum\".\"comment_closure\" (\"ancestor_id\" uuid NOT NULL, \"descendant_id\" uuid NOT NULL, \"depth\" integer NOT NULL, CONSTRAINT \"PK_7bf7c562720bce883645b860364\" PRIMARY KEY (\"ancestor_id\", \"descendant_id\"))");
    await queryRunner.query("CREATE TABLE \"forum\".\"category\" (\"id\" uuid NOT NULL, \"parent_id\" uuid, \"slug\" character varying(64) NOT NULL, \"title\" character varying(128) NOT NULL, \"description\" text NOT NULL DEFAULT '', \"policy\" jsonb NOT NULL DEFAULT '{}', \"sort_order\" integer NOT NULL DEFAULT '0', \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_9c4e4a89e3674fc9f382d733f03\" PRIMARY KEY (\"id\"))");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE \"forum\".\"category\"");
    await queryRunner.query("DROP TABLE \"forum\".\"comment_closure\"");
    await queryRunner.query("DROP TABLE \"forum\".\"comment\"");
    await queryRunner.query("DROP TABLE \"forum\".\"content_tag\"");
    await queryRunner.query("DROP TABLE \"forum\".\"content_vote\"");
    await queryRunner.query("DROP TABLE \"forum\".\"reaction\"");
    await queryRunner.query("DROP TABLE \"forum\".\"tag\"");
    await queryRunner.query("DROP TABLE \"forum\".\"topic\"");
  }
}
