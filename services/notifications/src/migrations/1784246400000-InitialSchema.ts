import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialNotificationsSchema1784246400000 implements MigrationInterface {
  name = 'InitialNotificationsSchema1784246400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = (await queryRunner.query(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> $2",
      ['notifications', 'notifications_migrations'],
    )) as Array<{ count: number }>;

    if (Number(count) > 0) {
      const rows = (await queryRunner.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = \'BASE TABLE\'',
        ['notifications'],
      )) as Array<{ table_name: string }>;
      const existing = new Set(rows.map((row) => row.table_name));
      const expected = ["subscriber","notification_log"] as const;
      const missing = expected.filter((table) => !existing.has(table));
      if (missing.length > 0) {
        throw new Error(
          'Cannot baseline notifications schema; missing tables: ' + missing.join(', '),
        );
      }
      return;
    }

    await queryRunner.query("CREATE TABLE \"notifications\".\"subscriber\" (\"user_id\" character varying(128) NOT NULL, \"email\" character varying(320), \"fcm_token\" character varying(512), \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_3c8c200034cbb441b5784b66da5\" PRIMARY KEY (\"user_id\"))");
    await queryRunner.query("CREATE TABLE \"notifications\".\"notification_log\" (\"id\" uuid NOT NULL, \"user_id\" character varying(128) NOT NULL, \"workflow_id\" character varying(128) NOT NULL, \"transaction_id\" character varying(128) NOT NULL, \"idempotency_key\" character varying(256), \"channel\" character varying(32) NOT NULL DEFAULT 'unknown', \"status\" character varying(32) NOT NULL DEFAULT 'pending', \"payload\" jsonb, \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_6f761cfbbd064e0f326960877d6\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE UNIQUE INDEX \"uq_notification_log_user_idempotency\" ON \"notifications\".\"notification_log\" (\"user_id\", \"idempotency_key\") WHERE \"idempotency_key\" IS NOT NULL");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX \"notifications\".\"uq_notification_log_user_idempotency\"");
    await queryRunner.query("DROP TABLE \"notifications\".\"notification_log\"");
    await queryRunner.query("DROP TABLE \"notifications\".\"subscriber\"");
  }
}
