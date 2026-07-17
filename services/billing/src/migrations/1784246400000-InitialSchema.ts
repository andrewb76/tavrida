import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialBillingSchema1784246400000 implements MigrationInterface {
  name = 'InitialBillingSchema1784246400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = (await queryRunner.query(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> $2",
      ['billing', 'billing_migrations'],
    )) as Array<{ count: number }>;

    if (Number(count) > 0) {
      const rows = (await queryRunner.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = \'BASE TABLE\'',
        ['billing'],
      )) as Array<{ table_name: string }>;
      const existing = new Set(rows.map((row) => row.table_name));
      const expected = ["user_wallet","transaction"] as const;
      const missing = expected.filter((table) => !existing.has(table));
      if (missing.length > 0) {
        throw new Error(
          'Cannot baseline billing schema; missing tables: ' + missing.join(', '),
        );
      }
      return;
    }

    await queryRunner.query("CREATE TABLE \"billing\".\"user_wallet\" (\"user_id\" character varying(128) NOT NULL, \"balance\" numeric(12,2) NOT NULL DEFAULT '0', \"currency\" character varying(3) NOT NULL DEFAULT 'RUB', \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_7b752f8f6f9b2e1f85c120894dd\" PRIMARY KEY (\"user_id\"))");
    await queryRunner.query("CREATE TABLE \"billing\".\"transaction\" (\"id\" uuid NOT NULL, \"user_id\" character varying(128) NOT NULL, \"type\" character varying(16) NOT NULL, \"amount\" numeric(12,2) NOT NULL, \"description\" text NOT NULL DEFAULT '', \"target\" character varying, \"status\" character varying(16) NOT NULL DEFAULT 'COMPLETED', \"idempotency_key\" character varying(64), \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_89eadb93a89810556e1cbcd6ab9\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE UNIQUE INDEX \"uq_billing_transaction_idempotency\" ON \"billing\".\"transaction\" (\"user_id\", \"idempotency_key\") WHERE \"idempotency_key\" IS NOT NULL");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX \"billing\".\"uq_billing_transaction_idempotency\"");
    await queryRunner.query("DROP TABLE \"billing\".\"transaction\"");
    await queryRunner.query("DROP TABLE \"billing\".\"user_wallet\"");
  }
}
