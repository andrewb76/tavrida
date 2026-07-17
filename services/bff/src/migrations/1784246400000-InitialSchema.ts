import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialBffSchema1784246400000 implements MigrationInterface {
  name = 'InitialBffSchema1784246400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = (await queryRunner.query(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> $2",
      ['bff', 'bff_migrations'],
    )) as Array<{ count: number }>;

    if (Number(count) > 0) {
      const rows = (await queryRunner.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = \'BASE TABLE\'',
        ['bff'],
      )) as Array<{ table_name: string }>;
      const existing = new Set(rows.map((row) => row.table_name));
      const expected = ["media_upload_intent"] as const;
      const missing = expected.filter((table) => !existing.has(table));
      if (missing.length > 0) {
        throw new Error(
          'Cannot baseline bff schema; missing tables: ' + missing.join(', '),
        );
      }
      return;
    }

    await queryRunner.query("CREATE TABLE \"bff\".\"media_upload_intent\" (\"id\" uuid NOT NULL, \"user_id\" character varying(128) NOT NULL, \"domain\" character varying(16) NOT NULL, \"object_key\" character varying(512) NOT NULL, \"content_type\" character varying(128) NOT NULL, \"size_bytes\" integer NOT NULL, \"filename\" character varying(256) NOT NULL, \"status\" character varying(16) NOT NULL, \"public_url\" character varying(1024) NOT NULL, \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"expires_at\" TIMESTAMP WITH TIME ZONE NOT NULL, \"confirmed_at\" TIMESTAMP WITH TIME ZONE, CONSTRAINT \"PK_0388c7b88863f01a1a0d768266f\" PRIMARY KEY (\"id\"))");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE \"bff\".\"media_upload_intent\"");
  }
}
