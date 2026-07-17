import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialAuctionSchema1784246400000 implements MigrationInterface {
  name = 'InitialAuctionSchema1784246400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = (await queryRunner.query(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> $2",
      ['auction', 'auction_migrations'],
    )) as Array<{ count: number }>;

    if (Number(count) > 0) {
      const rows = (await queryRunner.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = \'BASE TABLE\'',
        ['auction'],
      )) as Array<{ table_name: string }>;
      const existing = new Set(rows.map((row) => row.table_name));
      const expected = ["expert_appraisal","bid","auction"] as const;
      const missing = expected.filter((table) => !existing.has(table));
      if (missing.length > 0) {
        throw new Error(
          'Cannot baseline auction schema; missing tables: ' + missing.join(', '),
        );
      }
      return;
    }

    await queryRunner.query("CREATE TABLE \"auction\".\"expert_appraisal\" (\"id\" uuid NOT NULL, \"auction_id\" uuid NOT NULL, \"expert_id\" character varying(128) NOT NULL, \"summary\" text NOT NULL, \"estimated_value_min\" numeric(12,2), \"estimated_value_max\" numeric(12,2), \"currency\" character varying(3) NOT NULL DEFAULT 'RUB', \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_2fe87ce6b9050d56e93a7ef80ec\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE TABLE \"auction\".\"bid\" (\"id\" uuid NOT NULL, \"auction_id\" uuid NOT NULL, \"bidder_id\" character varying(128) NOT NULL, \"amount\" numeric(12,2) NOT NULL, \"currency\" character varying(3) NOT NULL DEFAULT 'RUB', \"placed_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"is_winning\" boolean NOT NULL DEFAULT false, CONSTRAINT \"PK_ed405dda320051aca2dcb1a50bb\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE TABLE \"auction\".\"auction\" (\"id\" uuid NOT NULL, \"seller_id\" character varying(128) NOT NULL, \"category_id\" uuid, \"title\" character varying(256) NOT NULL, \"description\" text NOT NULL DEFAULT '', \"type\" character varying(16) NOT NULL DEFAULT 'ENGLISH', \"status\" character varying(16) NOT NULL DEFAULT 'DRAFT', \"starting_price\" numeric(12,2) NOT NULL DEFAULT '0', \"current_price\" numeric(12,2) NOT NULL DEFAULT '0', \"bid_increment\" numeric(12,2) NOT NULL DEFAULT '100', \"reserve_price\" numeric(12,2), \"currency\" character varying(3) NOT NULL DEFAULT 'RUB', \"starts_at\" TIMESTAMP WITH TIME ZONE, \"ends_at\" TIMESTAMP WITH TIME ZONE, \"winner_id\" character varying(128), \"promoted_until\" TIMESTAMP WITH TIME ZONE, \"has_expert_appraisal\" boolean NOT NULL DEFAULT false, \"bid_count\" integer NOT NULL DEFAULT '0', \"images\" jsonb NOT NULL DEFAULT '[]', \"created_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updated_at\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_9dc876c629273e71646cf6dfa67\" PRIMARY KEY (\"id\"))");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE \"auction\".\"auction\"");
    await queryRunner.query("DROP TABLE \"auction\".\"bid\"");
    await queryRunner.query("DROP TABLE \"auction\".\"expert_appraisal\"");
  }
}
