import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMarketplaceSchema1784246400000 implements MigrationInterface {
  name = 'InitialMarketplaceSchema1784246400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = (await queryRunner.query(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> $2",
      ['marketplace', 'marketplace_migrations'],
    )) as Array<{ count: number }>;

    if (Number(count) > 0) {
      const rows = (await queryRunner.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = \'BASE TABLE\'',
        ['marketplace'],
      )) as Array<{ table_name: string }>;
      const existing = new Set(rows.map((row) => row.table_name));
      const expected = ["service_order","service_listing","portfolio_item"] as const;
      const missing = expected.filter((table) => !existing.has(table));
      if (missing.length > 0) {
        throw new Error(
          'Cannot baseline marketplace schema; missing tables: ' + missing.join(', '),
        );
      }
      return;
    }

    await queryRunner.query("CREATE TABLE \"marketplace\".\"service_order\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"listingId\" uuid NOT NULL, \"providerId\" character varying(128) NOT NULL, \"customerId\" character varying(128) NOT NULL, \"agreedPrice\" numeric(12,2) NOT NULL, \"currency\" character varying(3) NOT NULL DEFAULT 'RUB', \"status\" character varying(16) NOT NULL DEFAULT 'PENDING', \"note\" text, \"completedAt\" TIMESTAMP WITH TIME ZONE, \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_b01a59b48a0dfbd84dd8221364a\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE INDEX \"idx_order_listing\" ON \"marketplace\".\"service_order\" (\"listingId\") ");
    await queryRunner.query("CREATE INDEX \"idx_order_customer\" ON \"marketplace\".\"service_order\" (\"customerId\", \"status\") ");
    await queryRunner.query("CREATE INDEX \"idx_order_provider\" ON \"marketplace\".\"service_order\" (\"providerId\", \"status\") ");
    await queryRunner.query("CREATE TABLE \"marketplace\".\"service_listing\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"providerId\" character varying(128) NOT NULL, \"title\" character varying(256) NOT NULL, \"description\" text NOT NULL DEFAULT '', \"price\" numeric(12,2) NOT NULL, \"currency\" character varying(3) NOT NULL DEFAULT 'RUB', \"category\" character varying(64), \"status\" character varying(16) NOT NULL DEFAULT 'DRAFT', \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_805ed16d39d4552e349dc494c55\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE INDEX \"idx_listing_status_category\" ON \"marketplace\".\"service_listing\" (\"status\", \"category\") ");
    await queryRunner.query("CREATE INDEX \"idx_listing_provider\" ON \"marketplace\".\"service_listing\" (\"providerId\") ");
    await queryRunner.query("CREATE TABLE \"marketplace\".\"portfolio_item\" (\"id\" uuid NOT NULL DEFAULT uuid_generate_v4(), \"listingId\" uuid NOT NULL, \"title\" character varying(256) NOT NULL, \"description\" text, \"imageUrl\" character varying(1024) NOT NULL, \"sortOrder\" integer NOT NULL DEFAULT '0', \"createdAt\" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT \"PK_b880e6da04bde98e3f87796b102\" PRIMARY KEY (\"id\"))");
    await queryRunner.query("CREATE INDEX \"idx_portfolio_listing\" ON \"marketplace\".\"portfolio_item\" (\"listingId\", \"sortOrder\") ");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX \"marketplace\".\"idx_portfolio_listing\"");
    await queryRunner.query("DROP TABLE \"marketplace\".\"portfolio_item\"");
    await queryRunner.query("DROP INDEX \"marketplace\".\"idx_listing_provider\"");
    await queryRunner.query("DROP INDEX \"marketplace\".\"idx_listing_status_category\"");
    await queryRunner.query("DROP TABLE \"marketplace\".\"service_listing\"");
    await queryRunner.query("DROP INDEX \"marketplace\".\"idx_order_provider\"");
    await queryRunner.query("DROP INDEX \"marketplace\".\"idx_order_customer\"");
    await queryRunner.query("DROP INDEX \"marketplace\".\"idx_order_listing\"");
    await queryRunner.query("DROP TABLE \"marketplace\".\"service_order\"");
  }
}
