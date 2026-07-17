import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialScalarConfigSchema1784246400000 implements MigrationInterface {
  name = 'InitialScalarConfigSchema1784246400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = (await queryRunner.query(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> $2",
      ['scalar_config', 'scalar_config_migrations'],
    )) as Array<{ count: number }>;

    if (Number(count) > 0) {
      const rows = (await queryRunner.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = \'BASE TABLE\'',
        ['scalar_config'],
      )) as Array<{ table_name: string }>;
      const existing = new Set(rows.map((row) => row.table_name));
      const expected = ["scalar_variable","scalar_value"] as const;
      const missing = expected.filter((table) => !existing.has(table));
      if (missing.length > 0) {
        throw new Error(
          'Cannot baseline scalar_config schema; missing tables: ' + missing.join(', '),
        );
      }
      return;
    }

    await queryRunner.query("CREATE TABLE \"scalar_config\".\"scalar_variable\" (\"key\" character varying(128) NOT NULL, \"type\" character varying(32) NOT NULL, \"default_value\" jsonb NOT NULL, \"service\" character varying(64) NOT NULL, \"description\" text, \"sync_status\" character varying(16) NOT NULL DEFAULT 'active', CONSTRAINT \"PK_2d300e44ea2814f02408b8d1721\" PRIMARY KEY (\"key\"))");
    await queryRunner.query("CREATE TABLE \"scalar_config\".\"scalar_value\" (\"key\" character varying(128) NOT NULL, \"value\" jsonb NOT NULL, \"scope\" character varying(32) NOT NULL DEFAULT 'global', \"updatedBy\" character varying(128), \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_16efae061cc339e48005ba7739c\" PRIMARY KEY (\"key\"))");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE \"scalar_config\".\"scalar_value\"");
    await queryRunner.query("DROP TABLE \"scalar_config\".\"scalar_variable\"");
  }
}
