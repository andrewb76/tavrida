import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialPeriodsSchema1784246400000 implements MigrationInterface {
  name = 'InitialPeriodsSchema1784246400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = (await queryRunner.query(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> $2",
      ['periods', 'periods_migrations'],
    )) as Array<{ count: number }>;

    if (Number(count) > 0) {
      const rows = (await queryRunner.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = \'BASE TABLE\'',
        ['periods'],
      )) as Array<{ table_name: string }>;
      const existing = new Set(rows.map((row) => row.table_name));
      const expected = ["period","period_category"] as const;
      const missing = expected.filter((table) => !existing.has(table));
      if (missing.length > 0) {
        throw new Error(
          'Cannot baseline periods schema; missing tables: ' + missing.join(', '),
        );
      }
      return;
    }

    await queryRunner.query("CREATE TABLE \"periods\".\"period\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"categoryId\" uuid NOT NULL, \"parentId\" uuid, \"rootId\" uuid NOT NULL, \"depth\" integer NOT NULL DEFAULT '0', \"sortIndex\" integer NOT NULL DEFAULT '0', \"startsOn\" date NOT NULL, \"endsOn\" date NOT NULL, \"title\" character varying(512) NOT NULL, \"summary\" text NOT NULL DEFAULT '', \"body\" text NOT NULL DEFAULT '', \"metadata\" jsonb NOT NULL DEFAULT '{}', \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_cabecec858892ab647cd28673b8\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE INDEX \"idx_period_root\" ON \"periods\".\"period\" (\"rootId\") ");
    await queryRunner.query("CREATE INDEX \"idx_period_parent_sort\" ON \"periods\".\"period\" (\"parentId\", \"sortIndex\") ");
    await queryRunner.query("CREATE INDEX \"idx_period_category_range\" ON \"periods\".\"period\" (\"categoryId\", \"startsOn\", \"endsOn\") ");
    await queryRunner.query("CREATE TABLE \"periods\".\"period_category\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"slug\" character varying(64) NOT NULL, \"title\" character varying(256) NOT NULL, \"description\" text NOT NULL DEFAULT '', \"sortOrder\" integer NOT NULL DEFAULT '0', \"metadataSchema\" jsonb NOT NULL DEFAULT '{\"fields\":[]}', \"isActive\" boolean NOT NULL DEFAULT true, \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"UQ_72d065e4df1a29512847e1920db\" UNIQUE (\"slug\"), CONSTRAINT \"PK_44ee5993848020418f27efc6989\" PRIMARY KEY (\"id\"))");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE \"periods\".\"period_category\"");
    await queryRunner.query("DROP INDEX \"periods\".\"idx_period_category_range\"");
    await queryRunner.query("DROP INDEX \"periods\".\"idx_period_parent_sort\"");
    await queryRunner.query("DROP INDEX \"periods\".\"idx_period_root\"");
    await queryRunner.query("DROP TABLE \"periods\".\"period\"");
  }
}
