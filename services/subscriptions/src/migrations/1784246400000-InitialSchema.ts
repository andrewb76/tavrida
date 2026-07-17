import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSubscriptionsSchema1784246400000 implements MigrationInterface {
  name = 'InitialSubscriptionsSchema1784246400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = (await queryRunner.query(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> $2",
      ['subscriptions', 'subscriptions_migrations'],
    )) as Array<{ count: number }>;

    if (Number(count) > 0) {
      const rows = (await queryRunner.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = \'BASE TABLE\'',
        ['subscriptions'],
      )) as Array<{ table_name: string }>;
      const existing = new Set(rows.map((row) => row.table_name));
      const expected = ["subscription","delivery_preference"] as const;
      const missing = expected.filter((table) => !existing.has(table));
      if (missing.length > 0) {
        throw new Error(
          'Cannot baseline subscriptions schema; missing tables: ' + missing.join(', '),
        );
      }
      return;
    }

    await queryRunner.query("CREATE TABLE \"subscriptions\".\"subscription\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"userId\" character varying(128) NOT NULL, \"sourceDomain\" character varying(32) NOT NULL, \"targetType\" character varying(64) NOT NULL, \"targetId\" uuid, \"options\" jsonb NOT NULL DEFAULT '{}', \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_8c3e00ebd02103caa1174cd5d9d\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE UNIQUE INDEX \"uq_subscription_user_target\" ON \"subscriptions\".\"subscription\" (\"userId\", \"sourceDomain\", \"targetType\", \"targetId\") ");
    await queryRunner.query("CREATE TABLE \"subscriptions\".\"delivery_preference\" (\"userId\" character varying(128) NOT NULL, \"emailDigestEnabled\" boolean NOT NULL DEFAULT false, \"pushEnabled\" boolean NOT NULL DEFAULT true, \"digestFrequency\" character varying(16) NOT NULL DEFAULT 'DAILY', \"quietHours\" jsonb, \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_3afead3452ef2d1b7c1cb2e5cc3\" PRIMARY KEY (\"userId\"))");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE \"subscriptions\".\"delivery_preference\"");
    await queryRunner.query("DROP INDEX \"subscriptions\".\"uq_subscription_user_target\"");
    await queryRunner.query("DROP TABLE \"subscriptions\".\"subscription\"");
  }
}
