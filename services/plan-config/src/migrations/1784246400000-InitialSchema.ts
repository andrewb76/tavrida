import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialPlanConfigSchema1784246400000 implements MigrationInterface {
  name = 'InitialPlanConfigSchema1784246400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = (await queryRunner.query(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> $2",
      ['plan_config', 'plan_config_migrations'],
    )) as Array<{ count: number }>;

    if (Number(count) > 0) {
      const rows = (await queryRunner.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = \'BASE TABLE\'',
        ['plan_config'],
      )) as Array<{ table_name: string }>;
      const existing = new Set(rows.map((row) => row.table_name));
      const expected = ["user_subscription","plan","plan_variable","plan_variable_tier"] as const;
      const missing = expected.filter((table) => !existing.has(table));
      if (missing.length > 0) {
        throw new Error(
          'Cannot baseline plan_config schema; missing tables: ' + missing.join(', '),
        );
      }
      return;
    }

    await queryRunner.query("CREATE TABLE \"plan_config\".\"user_subscription\" (\"user_id\" character varying(128) NOT NULL, \"plan_id\" character varying(32) NOT NULL DEFAULT 'free', \"starts_at\" TIMESTAMP WITH TIME ZONE NOT NULL, \"expires_at\" TIMESTAMP WITH TIME ZONE, \"auto_renew\" boolean NOT NULL DEFAULT false, \"billing_period\" character varying(16), \"status\" character varying(16) NOT NULL DEFAULT 'ACTIVE', \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_3c6b79d14e6539ddb486aab80f5\" PRIMARY KEY (\"user_id\"))");
    await queryRunner.query("CREATE TABLE \"plan_config\".\"plan\" (\"id\" character varying(32) NOT NULL, \"title\" text NOT NULL, \"description\" text NOT NULL DEFAULT '', \"monthly_price\" numeric(12,2) NOT NULL DEFAULT '0', \"yearly_price\" numeric(12,2) NOT NULL DEFAULT '0', \"is_active\" boolean NOT NULL DEFAULT true, CONSTRAINT \"PK_54a2b686aed3b637654bf7ddbb3\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE TABLE \"plan_config\".\"plan_variable\" (\"key\" character varying(128) NOT NULL, \"service\" character varying(64) NOT NULL, \"name\" text NOT NULL, \"description\" text NOT NULL DEFAULT '', \"value_type\" character varying(16) NOT NULL, \"min_value\" integer, \"default_value\" integer, \"max_value\" integer, \"sync_status\" character varying(16) NOT NULL DEFAULT 'active', CONSTRAINT \"PK_04852d28616f6185a497873976f\" PRIMARY KEY (\"key\"))");
    await queryRunner.query("CREATE TABLE \"plan_config\".\"plan_variable_tier\" (\"plan_id\" character varying(32) NOT NULL, \"variable_key\" character varying(128) NOT NULL, \"limit_value\" integer, \"is_feature_enabled\" boolean NOT NULL DEFAULT false, \"enum_values\" jsonb, \"price_amount\" numeric(12,2), \"is_enabled\" boolean NOT NULL DEFAULT true, CONSTRAINT \"PK_635e327ce8d5bb3b4bb96ce7251\" PRIMARY KEY (\"plan_id\", \"variable_key\"))");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE \"plan_config\".\"plan_variable_tier\"");
    await queryRunner.query("DROP TABLE \"plan_config\".\"plan_variable\"");
    await queryRunner.query("DROP TABLE \"plan_config\".\"plan\"");
    await queryRunner.query("DROP TABLE \"plan_config\".\"user_subscription\"");
  }
}
